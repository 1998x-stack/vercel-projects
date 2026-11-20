#!/usr/bin/env bash
#
# atlas-dashboard · 每批把一个仓库的界面改造成专业 Dashboard
# ---------------------------------------------------------------------------
# 用法：
#   scripts/atlas-dashboard/tick.sh              # 跑一轮（默认 3 个项目，并行 3 路）
#   ATLAS_BATCH=1 ATLAS_PARALLEL=1 scripts/atlas-dashboard/tick.sh   # 退回串行单项目
#   ATLAS_DRY_RUN=1 scripts/atlas-dashboard/tick.sh   # 只选项目、不执行
#
# 设计规范见 docs/superpowers/specs/2026-11-19-atlas-dashboard-automation-design.md
#
# 关键约定：
#   - "今天有代码改动"是**运行时刻的实时判断**（含未提交改动），不是固定断言。
#   - pi 只负责 commit，本脚本负责 push；验证闸门不通过就不 push（失败即不公开）。
#   - 同一时刻只允许一轮（目录锁，超过 ATLAS_LOCK_STALE_SECONDS 视为陈旧可回收）；
#     轮内各个项目分别在自己的仓库里跑，互不共享文件，所以可以并行。
#
set -uo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ATLAS_ROOT:-$(cd "$SELF_DIR/../.." && pwd)}"
REPOS_DIR="$ROOT/repos"
PROMPT_FILE="${ATLAS_PROMPT_FILE:-$SELF_DIR/prompt.md}"
STATE_DIR="${ATLAS_STATE_DIR:-$ROOT/logs/atlas-dashboard}"
LEDGER="$STATE_DIR/ledger.tsv"

MODEL="${ATLAS_MODEL:-iagent/standard}"
BATCH="${ATLAS_BATCH:-3}"
PARALLEL="${ATLAS_PARALLEL:-3}"
TIMEOUT_SECONDS="${ATLAS_TIMEOUT_SECONDS:-1800}"
MAX_ATTEMPTS="${ATLAS_MAX_ATTEMPTS:-2}"
SKILL_DIR="${ATLAS_SKILL_DIR:-$HOME/.agents/skills/ui-ux-pro-max}"
LOCK_STALE_SECONDS="${ATLAS_LOCK_STALE_SECONDS:-10800}"
LOCK_WAIT_SECONDS="${ATLAS_LOCK_WAIT_SECONDS:-1800}"
SKIP_PROJECTS="${ATLAS_SKIP:-logicTraining}"
ENV_FILE="${ATLAS_ENV_FILE:-$HOME/.config/atlas-dashboard/env}"
DRY_RUN="${ATLAS_DRY_RUN:-0}"
ALLOW_NON_MAIN="${ATLAS_ALLOW_NON_MAIN:-0}"
SEED_FILE="${ATLAS_SEED_FILE:-$SELF_DIR/done.seed.tsv}"
IGNORE_SEED="${ATLAS_IGNORE_SEED:-0}"
# “今天没有代码改动”落地为 24 小时滚动窗口：跨零点时不会把昨晚刚做完的仓库重新算成有资格。
CHANGED_WINDOW="${ATLAS_CHANGED_WINDOW:-24 hours ago}"
FORCE_PROJECTS="${ATLAS_FORCE:-}"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

RUN_LOG=""
LOCK_DIR=""
TODAY="$(date +%Y-%m-%d)"

log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$RUN_LOG"; }

# --- 凭证 ------------------------------------------------------------------
load_credentials() {
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
  fi
  if [ -z "${IAUTO_API_KEY:-}" ] && [ -f "$HOME/.zshrc" ]; then
    local v
    v="$(sed -n 's/^[[:space:]]*export[[:space:]]\{1,\}IAUTO_API_KEY=[[:space:]]*//p' "$HOME/.zshrc" | tail -1)"
    v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    [ -n "$v" ] && export IAUTO_API_KEY="$v"
  fi
  if [ -z "${IAUTO_API_KEY:-}" ]; then
    log "ERROR: 未能解析 IAUTO_API_KEY（$ENV_FILE 与 ~/.zshrc 都没有）——本批中止"
    return 1
  fi
  return 0
}

# --- 锁 --------------------------------------------------------------------
release_lock() {
  [ -n "$LOCK_DIR" ] && rm -rf "$LOCK_DIR"
  LOCK_DIR=""
}

acquire_lock() {
  mkdir -p "$STATE_DIR"
  local lock="$STATE_DIR/lock" now ts age waited=0
  while :; do
    if mkdir "$lock" 2>/dev/null; then
      printf '%s %s\n' "$$" "$(date +%s)" >"$lock/owner"
      LOCK_DIR="$lock"
      trap release_lock EXIT INT TERM
      return 0
    fi
    now="$(date +%s)"
    ts="$(awk '{print $2}' "$lock/owner" 2>/dev/null || echo 0)"
    age=$(( now - ${ts:-0} ))
    if [ "$age" -gt "$LOCK_STALE_SECONDS" ]; then
      log "warn: 回收陈旧锁（age=${age}s > ${LOCK_STALE_SECONDS}s）"
      rm -rf "$lock"
      continue
    fi
    if [ "$waited" -ge "$LOCK_WAIT_SECONDS" ]; then
      log "skip: 上一轮仍在运行（age=${age}s，已等 ${waited}s）——本次不启动"
      return 1
    fi
    if [ "$waited" = "0" ]; then
      log "warn: 上一轮仍在运行（age=${age}s），最多等 ${LOCK_WAIT_SECONDS}s，避免整轮被跳过"
    fi
    sleep 15
    waited=$(( waited + 15 ))
  done
}

# --- 账本 ------------------------------------------------------------------
ledger_last_status() {
  [ -f "$LEDGER" ] || return 0
  awk -F'\t' -v p="$1" '$2==p{last=$3} END{if(last!="")print last}' "$LEDGER"
}

ledger_fail_count() {
  [ -f "$LEDGER" ] || { echo 0; return; }
  awk -F'\t' -v p="$1" '$2==p && $3 ~ /^FAIL/{n++} END{print n+0}' "$LEDGER"
}

ledger_add() {
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$1" "$2" "$3" >>"$LEDGER"
}

# 种子名单：自动化上线前已完成的仓库
seed_has() {
  [ -f "$SEED_FILE" ] || return 1
  awk -F'\t' -v p="$1" '!/^#/ && $1==p{found=1} END{exit !found}' "$SEED_FILE"
}

# --- 资格判断 --------------------------------------------------------------
# 认定"有界面"：静态站（.html）或组件式前端（jsx/tsx/vue/svelte/astro）。
# 只认 .html 会漏掉 Next.js 这类没有 index.html 的项目。
has_ui() {
  [ -n "$(find "$1" \( -name '*.html' -o -name '*.jsx' -o -name '*.tsx' \
        -o -name '*.vue' -o -name '*.svelte' -o -name '*.astro' \) \
        -not -path '*/.git/*' -not -path '*/node_modules/*' -print -quit 2>/dev/null)" ]
}

# 输出：OK，或跳过原因。全部基于此刻的真实 git 状态。
repo_state() {
  local d="$REPOS_DIR/$1"
  [ -d "$d/.git" ] || { echo "no-git"; return; }
  git -C "$d" rev-parse --verify HEAD >/dev/null 2>&1 || { echo "no-commits"; return; }
  has_ui "$d" || { echo "no-ui"; return; }
  local dirty
  dirty="$(git -C "$d" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  [ "$dirty" = "0" ] || { echo "dirty-working-tree"; return; }
  local recent
  recent="$(git -C "$d" log --since="$CHANGED_WINDOW" --oneline 2>/dev/null | wc -l | tr -d ' ')"
  [ "$recent" = "0" ] || { echo "changed-recently"; return; }
  # 已经有设计规范的仓库视为已处理（防跨天重复改造）；用 ATLAS_FORCE=名字 可覆盖。
  case " $FORCE_PROJECTS " in
    *" $1 "*) ;;
    *) [ -f "$d/docs/DESIGN_SPEC.md" ] && { echo "has-design-spec"; return; };;
  esac
  [ -z "$(git -C "$d" remote get-url origin 2>/dev/null)" ] && { echo "no-remote"; return; }
  echo OK
}

select_projects() {
  local path d st fails reason
  for path in "$REPOS_DIR"/*/; do
    d="$(basename "$path")"
    [ "${#PICKED[@]}" -ge "$BATCH" ] && return 0
    case " $SKIP_PROJECTS " in *" $d "*) log "  skip $d (ATLAS_SKIP)"; continue;; esac
    if [ "$IGNORE_SEED" != "1" ] && seed_has "$d"; then
      case " $FORCE_PROJECTS " in *" $d "*) ;; *) log "  skip $d (种子名单：自动化前已完成)"; continue;; esac
    fi
    [ "$(ledger_last_status "$d")" = "DONE" ] && continue
    fails="$(ledger_fail_count "$d")"
    if [ "$fails" -ge "$MAX_ATTEMPTS" ]; then
      log "  skip $d (已失败 $fails 次，需人工介入)"
      continue
    fi
    reason="$(repo_state "$d")"
    if [ "$reason" != "OK" ]; then
      log "  skip $d ($reason)"
      continue
    fi
    PICKED+=("$d")
    log "  pick $d"
  done
}

# --- 执行 ------------------------------------------------------------------
# 单项目超时。注意：非交互 shell 中 `cmd &` 会把后台命令的 stdin 重定向为 /dev/null，
# 会吞掉喂给 pi 的提示词；所以优先用 coreutils timeout，或显式写 `<&0`。
run_with_timeout() {
  local secs="$1"; shift
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" -k 20 "$secs" "$@"
    return $?
  fi
  "$@" <&0 &
  local pid=$!
  ( sleep "$secs"; kill -TERM "$pid" 2>/dev/null; sleep 20; kill -KILL "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid"
  local rc=$?
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  return $rc
}

render_prompt() {
  local proj="$1" cwd="$2" remote="$3" branch="$4" out="$5"
  sed -e "s|{{PROJECT}}|$proj|g" \
      -e "s|{{CWD}}|$cwd|g" \
      -e "s|{{REMOTE}}|$remote|g" \
      -e "s|{{BRANCH}}|$branch|g" \
      -e "s|{{SPEC_PATH}}|docs/DESIGN_SPEC.md|g" \
      -e "s|{{NOW}}|$(date '+%Y-%m-%d %H:%M %Z')|g" \
      -e "s|{{SKILL_DIR}}|$SKILL_DIR|g" \
      "$PROMPT_FILE" >"$out"
  # 技能正文前置注入：在 repos/<项目> 内 pi 不会自动发现该技能
  cat "$SKILL_DIR/SKILL.md" "$out" >"$TMP_DIR/$proj.full"
}

run_agent() {
  local proj="$1" cwd="$2"
  log "-> pi ($MODEL) 开始：${proj}（超时 ${TIMEOUT_SECONDS}s）"
  local start_ts end_ts rc
  start_ts="$(date +%s)"
  (
    cd "$cwd" || exit 1
    run_with_timeout "$TIMEOUT_SECONDS" \
      "$PI_BIN" -p --model "$MODEL" --no-approve --no-extensions --no-mcp \
        --skill "$SKILL_DIR" --name "atlas-dashboard-$proj" \
        <"$TMP_DIR/$proj.full"
  ) >>"$RUN_LOG" 2>&1
  rc=$?
  end_ts="$(date +%s)"
  log "<- pi 结束：$proj rc=$rc 耗时 $(( end_ts - start_ts ))s"
  return $rc
}

# --- 验证闸门 --------------------------------------------------------------
GATE_FAILURES=""

gate_check() {
  local d="$1" start_head="$2" branch="$3" out
  GATE_FAILURES=""

  [ -f "$d/docs/DESIGN_SPEC.md" ] || GATE_FAILURES="$GATE_FAILURES NO_SPEC"

  local commits
  commits="$(git -C "$d" rev-list --count "$start_head..HEAD" 2>/dev/null || echo 0)"
  [ "${commits:-0}" -ge 1 ] || GATE_FAILURES="$GATE_FAILURES NO_COMMIT"

  local dirty in_submodule
  dirty="$(git -C "$d" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  [ "$dirty" = "0" ] || GATE_FAILURES="$GATE_FAILURES DIRTY_TREE"

  in_submodule="$(git -C "$d" submodule status 2>/dev/null | wc -l | tr -d ' ')"
  [ "$in_submodule" = "0" ] || GATE_FAILURES="$GATE_FAILURES HAS_SUBMODULE"

  out="$(git -C "$d" diff "$start_head..HEAD" -- '*.html' '*.css' '*.js' 2>/dev/null \
    | grep '^+' | grep -E '(src|href)="https?://' | grep -vE '^\+[[:space:]]*<a[[:space:]]' | head -5)"
  if [ -n "$out" ]; then
    GATE_FAILURES="$GATE_FAILURES EXTERNAL_ASSET"
    printf '%s\n' "$out" >>"$RUN_LOG"
  fi

  if [ -f "$d/package.json" ] && [ -d "$d/node_modules" ]; then
    if node -e "const s=(require('$d/package.json').scripts)||{};process.exit(s.test?0:1)" 2>/dev/null; then
      if (cd "$d" && npm test --silent) >>"$RUN_LOG" 2>&1; then
        log "   gate: npm test 通过"
      else
        GATE_FAILURES="$GATE_FAILURES TEST_FAILED"
      fi
    else
      log "   gate: 无 test 脚本，跳过 npm test"
    fi
  else
    log "   gate: 无 package.json 或依赖未安装，跳过 npm test"
  fi

  # 推送前再确认没落后于 origin
  git -C "$d" fetch --quiet origin "$branch" 2>/dev/null || true
  local behind
  behind="$(git -C "$d" rev-list --count "HEAD..origin/$branch" 2>/dev/null || echo 0)"
  [ "${behind:-0}" = "0" ] || GATE_FAILURES="$GATE_FAILURES BEHIND_ORIGIN"

  GATE_FAILURES="$(printf '%s' "$GATE_FAILURES" | xargs)"
}

process_project() {
  local proj="$1"
  local d="$REPOS_DIR/$proj"
  local branch remote start_head rc

  branch="$(git -C "$d" symbolic-ref --quiet --short HEAD 2>/dev/null)"
  remote="$(git -C "$d" remote get-url origin 2>/dev/null)"
  start_head="$(git -C "$d" rev-parse HEAD 2>/dev/null)"

  local default_branch
  default_branch="$(git -C "$d" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)"
  default_branch="${default_branch#origin/}"
  [ -n "$default_branch" ] || default_branch="main"

  if [ "$branch" != "$default_branch" ] && [ "$ALLOW_NON_MAIN" != "1" ]; then
    log "   SKIP_BRANCH: $proj 在分支 ${branch}（默认分支 ${default_branch}），不自动改动"
    ledger_add "$proj" "SKIP_BRANCH" "branch=$branch"
    return 1
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "   DRY_RUN: 将运行 ${proj}（branch=$branch, head=${start_head}）"
    ledger_add "$proj" "DRY_RUN" "branch=$branch"
    return 0
  fi

  render_prompt "$proj" "$d" "$remote" "$branch" "$TMP_DIR/prompt-$proj.md"
  run_agent "$proj" "$d"
  rc=$?

  if [ $rc -ne 0 ]; then
    log "   pi 非零退出（rc=${rc}）——不推送，保留现场待人工查看"
    ledger_add "$proj" "FAIL_AGENT_RC_$rc" "log=$(basename "$RUN_LOG")"
    return 1
  fi

  gate_check "$d" "$start_head" "$branch"
  if [ -n "$GATE_FAILURES" ]; then
    log "   FAIL_GATE: $proj -> ${GATE_FAILURES}（已保留本地提交，未推送）"
    ledger_add "$proj" "FAIL_GATE" "$GATE_FAILURES"
    return 1
  fi

  log "   闸门通过，推送 $proj -> origin/$branch"
  if git -C "$d" push origin "HEAD:$branch" >>"$RUN_LOG" 2>&1; then
    local sha subject
    sha="$(git -C "$d" rev-parse --short HEAD)"
    subject="$(git -C "$d" log -1 --format=%s)"
    log "   DONE: $proj $sha $subject"
    ledger_add "$proj" "DONE" "$sha $subject"
    return 0
  fi
  log "   FAIL_PUSH: $proj 推送失败（提交保留在本地）"
  ledger_add "$proj" "FAIL_PUSH" "branch=$branch"
  return 1
}

# --- main ------------------------------------------------------------------
main() {
  mkdir -p "$STATE_DIR/runs"
  RUN_LOG="$STATE_DIR/runs/$(date +%Y%m%d-%H%M%S).log"
  : >>"$RUN_LOG"

  touch "$STATE_DIR/heartbeat"
  log "=== atlas-dashboard tick start $(date '+%F %T') (pid=$$, batch=$BATCH, parallel=$PARALLEL) ==="

  [ -f "$PROMPT_FILE" ] || { log "ERROR: 缺少 $PROMPT_FILE"; exit 1; }
  [ -f "$SKILL_DIR/SKILL.md" ] || { log "ERROR: 找不到技能 $SKILL_DIR/SKILL.md"; exit 1; }
  [ -d "$REPOS_DIR" ] || { log "ERROR: 找不到 $REPOS_DIR"; exit 1; }
  PI_BIN="${ATLAS_PI_BIN:-$(command -v pi || true)}"
  [ -n "$PI_BIN" ] || PI_BIN="/opt/homebrew/bin/pi"
  if [ ! -x "$PI_BIN" ]; then
    log "ERROR: 找不到可执行的 pi（试过 PATH 与 ${PI_BIN}）"
    exit 1
  fi
  TIMEOUT_BIN=""
  if command -v timeout >/dev/null 2>&1; then
    TIMEOUT_BIN="$(command -v timeout)"
  elif command -v gtimeout >/dev/null 2>&1; then
    TIMEOUT_BIN="$(command -v gtimeout)"
  fi
  log "pi=$PI_BIN model=$MODEL skill=$SKILL_DIR timeout=${TIMEOUT_BIN:-（内置看门狗）}"

  acquire_lock || exit 0
  # 只有真正拿到锁、开始干活的那一轮才更新 latest.log，
  # 否则一个在等锁的 tick 会把正在跑的那一轮日志指针顶掉。
  ln -sf "$RUN_LOG" "$STATE_DIR/latest.log" 2>/dev/null
  load_credentials || { ledger_add "-" "FAIL_ENV" "no-api-key"; exit 1; }

    if [ "$DRY_RUN" != "1" ] && command -v gh >/dev/null 2>&1; then
    gh auth setup-git >/dev/null 2>&1 || log "warn: gh auth setup-git 失败，push 可能失败"
  fi

  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/atlas-dashboard.XXXXXX")"
  trap 'rm -rf "$TMP_DIR"; release_lock' EXIT INT TERM

  PICKED=()
  if [ -n "${ATLAS_ONLY:-}" ]; then
    # 运维通道：显式指定要跑的项目，绕过选择器（仍保留全部验证闸门）
    IFS=',' read -r -a PICKED <<<"$ATLAS_ONLY"
    log "-- ATLAS_ONLY 显式指定：${PICKED[*]}"
  else
    log "-- 选择项目（窗口=${CHANGED_WINDOW}，无提交、工作区干净、不在种子名单里才有资格）"
    select_projects
  fi

  if [ "${#PICKED[@]}" -eq 0 ]; then
    log "-- 没有符合条件的项目。若全部处理完则任务结束；否则检查 skip 原因。"
    ledger_add "-" "IDLE" "no-eligible-project"
    log "=== tick end ==="
    return 0
  fi

  local ok=0 fail=0 p rc stamp child_log
  stamp="$(date +%Y%m%d-%H%M%S)"

  if [ "$PARALLEL" -le 1 ] || [ "${#PICKED[@]}" -eq 1 ]; then
    log "-- 本批（串行）：${PICKED[*]}"
    for p in "${PICKED[@]}"; do
      [ -d "$REPOS_DIR/$p" ] || { log "-- [$p] 目录不存在，跳过"; continue; }
      log "-- [$p] 开始 $(date '+%T')"
      if process_project "$p"; then ok=$(( ok + 1 )); else fail=$(( fail + 1 )); fi
      log "-- [$p] 结束 $(date '+%T')"
    done
  else
    log "-- 本轮（并行 ${PARALLEL} 路）：${PICKED[*]}"
    local pids=() names=()
    for p in "${PICKED[@]}"; do
      [ -d "$REPOS_DIR/$p" ] || { log "-- [$p] 目录不存在，跳过"; continue; }
      while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$PARALLEL" ]; do sleep 2; done
      child_log="$STATE_DIR/runs/${stamp}-${p}.log"
      : >"$child_log"
      ln -sf "$child_log" "$STATE_DIR/latest-$p.log" 2>/dev/null
      (
        # 子进程不得触发父进程的 EXIT trap（那会提前删掉共享临时目录并释放锁）
        trap - EXIT INT TERM
        RUN_LOG="$child_log"
        process_project "$p"
      ) &
      pids+=("$!")
      names+=("$p")
      log "-- [$p] 已派发 $(date '+%T')  →  tail -f $child_log"
    done
    local i
    for i in "${!pids[@]}"; do
      wait "${pids[$i]}"
      rc=$?
      p="${names[$i]}"
      if [ "$rc" = "0" ]; then ok=$(( ok + 1 )); else fail=$(( fail + 1 )); fi
      log "-- [$p] 结束 rc=$rc $(date '+%T')"
    done
  fi
  log "=== tick end: ok=$ok fail=${fail}（每项目日志见 runs/${stamp}-*.log） 剩余待处理见 status.sh ==="
}

main "$@"
