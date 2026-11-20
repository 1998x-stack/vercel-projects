#!/usr/bin/env bash
#
# atlas-dashboard · 调度器安装/卸载/自检
# ---------------------------------------------------------------------------
# 节奏：每 30 分钟一轮，每轮 3 个项目（并行 3 路），安装后立即开始。
#
# 用法：
#   scripts/atlas-dashboard/install-scheduler.sh install         # 装 LaunchAgent（RunAtLoad：立即开跑一轮）
#   scripts/atlas-dashboard/install-scheduler.sh kickstart       # 立刻手动开一轮
#   scripts/atlas-dashboard/install-scheduler.sh probe           # 用 launchd 探一次 TCC 权限（不跑任务）
#   scripts/atlas-dashboard/install-scheduler.sh test            # 前台真实跑一轮（会改代码）
#   scripts/atlas-dashboard/install-scheduler.sh fallback-nohup  # 若 launchd 被 TCC 拦截：常驻循环兜底
#   scripts/atlas-dashboard/install-scheduler.sh stop-fallback   # 停止兜底循环
#   scripts/atlas-dashboard/install-scheduler.sh uninstall       # 卸载 LaunchAgent
#
# 为什么用 LaunchAgent 而不是 crontab：macOS 上 cron 访问 ~/Desktop 受 TCC 限制，
# 且 cron 不加载 ~/.zshrc（IAUTO_API_KEY 会缺失）。LaunchAgent 是原生等价物。
#
set -uo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ATLAS_ROOT:-$(cd "$SELF_DIR/../.." && pwd)}"
STATE_DIR="${ATLAS_STATE_DIR:-$ROOT/logs/atlas-dashboard}"
LABEL="com.1998xstack.atlas-dashboard"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ENV_DIR="$HOME/.config/atlas-dashboard"
ENV_FILE="$ENV_DIR/env"
INTERVAL="${ATLAS_INTERVAL_SECONDS:-1800}"
TICK="$SELF_DIR/tick.sh"
UID_NUM="$(id -u)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

say() { printf '[atlas] %s\n' "$*"; }

write_env_file() {
  mkdir -p "$ENV_DIR"
  if [ -f "$ENV_FILE" ] && grep -q '^export IAUTO_API_KEY=' "$ENV_FILE" 2>/dev/null; then
    say "凭证文件已存在，保留不动：$ENV_FILE"
    return 0
  fi
  local key=""
  if [ -n "${IAUTO_API_KEY:-}" ]; then
    key="$IAUTO_API_KEY"
  elif [ -f "$HOME/.zshrc" ]; then
    key="$(sed -n 's/^[[:space:]]*export[[:space:]]\{1,\}IAUTO_API_KEY=[[:space:]]*//p' "$HOME/.zshrc" | tail -1)"
    key="${key%\"}"; key="${key#\"}"; key="${key%\'}"; key="${key#\'}"
  fi
  if [ -z "$key" ]; then
    say "ERROR: 无法从环境或 ~/.zshrc 解析 IAUTO_API_KEY"
    return 1
  fi
  umask 077
  printf 'export IAUTO_API_KEY=%s\n' "$key" >"$ENV_FILE"
  chmod 600 "$ENV_FILE"
  say "已写入凭证文件（600）：$ENV_FILE （不在仓库内，不会被提交）"
}

write_plist() {
  mkdir -p "$(dirname "$PLIST")" "$STATE_DIR"
  cat >"$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$TICK</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>$HOME</string>
    <key>LANG</key>
    <string>en_US.UTF-8</string>
  </dict>
  <!-- RunAtLoad=true + StartInterval=1800 → 装载后立即开一轮，之后每 30 分钟一轮 -->
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>$INTERVAL</integer>
  <key>StandardOutPath</key>
  <string>$STATE_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$STATE_DIR/launchd.err.log</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
PLISTEOF
  say "已写入 $PLIST"
}

load_agent() {
  launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
  if launchctl bootstrap "gui/$UID_NUM" "$PLIST" 2>/dev/null; then
    say "已 bootstrap（gui/${UID_NUM}）"
  elif launchctl load -w "$PLIST" 2>/dev/null; then
    say "已 load -w（旧接口）"
  else
    say "ERROR: launchctl 装载失败，请手动：launchctl bootstrap gui/$UID_NUM $PLIST"
    return 1
  fi
  launchctl enable "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || true
  return 0
}

probe_tcc() {
  local out="$STATE_DIR/tcc-probe.txt"
  mkdir -p "$STATE_DIR"
  rm -f "$out"
  launchctl remove com.1998xstack.atlas-tcc-probe >/dev/null 2>&1 || true
  say "用 launchd 探一次对 $ROOT/repos 的读取权限…"
  launchctl submit -l com.1998xstack.atlas-tcc-probe -- /bin/bash -c \
    "{ ls '$ROOT/repos' | head -3; echo rc=\$?; ls '$HOME/.config/atlas-dashboard' 2>&1 | head -2; } > '$out' 2>&1" \
    >/dev/null 2>&1
  sleep 6
  launchctl remove com.1998xstack.atlas-tcc-probe >/dev/null 2>&1 || true
  if [ ! -f "$out" ]; then
    say "探针没有产出文件 —— launchd 起进程都失败了（不常见），建议直接用 fallback-nohup"
    return 1
  fi
  cat "$out"
  if grep -qiE 'operation not permitted|permission denied' "$out"; then
    say "结论：launchd 被 TCC 拦截。两条路任选："
    say "  1) 系统设置 → 隐私与安全性 → 完全磁盘访问权限 → 加入 /bin/bash（然后重跑 install）"
    say "  2) 直接跑 install（已会自动改成 fallback-nohup），或显式 fallback-nohup"
    return 1
  fi
  say "结论：launchd 可以读取仓库目录，调度可用。"
  return 0
}

install_all() {
  write_env_file || exit 1
  say "先探一下 launchd 能不能读 ~/Desktop（TCC）…"
  if probe_tcc; then
    write_plist || exit 1
    load_agent || exit 1
    say "已装载：立即开第一轮，之后每 ${INTERVAL}s 一轮（每轮 3 个项目，并行 3 路）"
    say "若第一轮遇到锁（已有轮次在跑）会等待，不会白白跳过一轮。"
  elif [ "${ATLAS_FORCE_LAUNCHD:-0}" = "1" ]; then
    write_plist || exit 1
    load_agent || exit 1
    say "已按 ATLAS_FORCE_LAUNCHD=1 强制装载 LaunchAgent；在授予完全磁盘访问权限前它跑不起来"
  else
    say "→ launchd 被 TCC 拦截，自动改用兜底循环（继承当前终端权限，不改系统设置就能跑）"
    fallback_loop
  fi
  say "查看进度：scripts/atlas-dashboard/status.sh"
  say "看日志：   tail -f $STATE_DIR/latest.log"
}

kickstart() {
  if launchctl kickstart -k "gui/$UID_NUM/$LABEL" 2>/dev/null; then
    say "已 kickstart 一轮；若已有轮次在跑会被锁拦住（属正常）"
  else
    say "kickstart 失败，直接前台跑一轮："
    ATLAS_ROOT="$ROOT" bash "$TICK"
  fi
}

fallback_loop() {
  mkdir -p "$STATE_DIR"
  local pidfile="$STATE_DIR/fallback.pid" logf="$STATE_DIR/fallback.log"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    say "兜底循环已在运行（pid=$(cat "$pidfile")）"
    return 0
  fi
  say "启动兜底循环：立即开一轮，之后每 ${INTERVAL}s 一轮（继承当前终端的权限，绕过 TCC）"
  say "每轮开跑前快照一份 tick.sh 再执行，避免进行中的一轮被编辑弄坏"
  nohup bash -c "
    snapshot='$STATE_DIR/tick.snapshot.sh'
    while true; do
      cp '$TICK' \"\$snapshot\"
      echo \"[\$(date '+%F %T')] fallback tick\" >> '$logf'
      ATLAS_ROOT='$ROOT' \
      ATLAS_PROMPT_FILE='$SELF_DIR/prompt.md' \
      ATLAS_SEED_FILE='$SELF_DIR/done.seed.tsv' \
        bash \"\$snapshot\" >> '$logf' 2>&1
      sleep $INTERVAL
    done
  " >>"$logf" 2>&1 &
  echo $! >"$pidfile"
  say "fallback_pid=$(cat "$pidfile")  log=$logf"
  say "首轮已开始（日志见 ${logf}）"
}

stop_fallback() {
  local pidfile="$STATE_DIR/fallback.pid"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    pkill -P "$(cat "$pidfile")" 2>/dev/null || true
    kill "$(cat "$pidfile")" 2>/dev/null || true
    say "已停止兜底循环（pid=$(cat "$pidfile")）"
  else
    say "兜底循环未在运行"
  fi
  rm -f "$pidfile"
}

uninstall_all() {
  launchctl bootout "gui/$UID_NUM/$LABEL" >/dev/null 2>&1 || launchctl unload -w "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  say "已卸载 $LABEL 并删除 plist"
}

case "${1:-}" in
  install) install_all ;;
  kickstart) kickstart ;;
  probe) probe_tcc ;;
  test) say "前台真实跑一轮（会修改代码并推送）"; ATLAS_ROOT="$ROOT" bash "$TICK" ;;
  fallback-nohup) fallback_loop ;;
  stop-fallback) stop_fallback ;;
  uninstall) uninstall_all ;;
  *) sed -n '2,22p' "$0" ;;
esac
