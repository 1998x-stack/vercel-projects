#!/usr/bin/env bash
#
# atlas-dashboard · 进度与环境自检
# 用法：scripts/atlas-dashboard/status.sh
#
set -uo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ATLAS_ROOT:-$(cd "$SELF_DIR/../.." && pwd)}"
REPOS_DIR="$ROOT/repos"
STATE_DIR="${ATLAS_STATE_DIR:-$ROOT/logs/atlas-dashboard}"
LEDGER="$STATE_DIR/ledger.tsv"
TODAY="$(date +%Y-%m-%d)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

last_status() {
  [ -f "$LEDGER" ] || return 0
  awk -F'\t' -v p="$1" '$2==p{last=$3} END{if(last!="")print last}' "$LEDGER"
}

dirty_of() { git -C "$REPOS_DIR/$1" status --porcelain 2>/dev/null | wc -l | tr -d ' '; }
today_of() { git -C "$REPOS_DIR/$1" log --since="$TODAY 00:00:00" --oneline 2>/dev/null | wc -l | tr -d ' '; }

echo "atlas-dashboard status · $(date '+%F %T')"
echo "root=$ROOT"
echo

echo "== 调度与凭证 =="
plist="$HOME/Library/LaunchAgents/com.1998xstack.atlas-dashboard.plist"
if [ -f "$plist" ]; then
  echo "LaunchAgent: 已安装 ($plist)"
  launchctl list 2>/dev/null | grep -q atlas-dashboard && echo "  状态: loaded" || echo "  状态: 未加载（launchctl load 一下）"
else
  echo "LaunchAgent: 未安装"
fi
[ -f "$STATE_DIR/heartbeat" ] && echo "最后一次 tick 心跳: $(date -r "$STATE_DIR/heartbeat" '+%F %T')" || echo "尚无 tick 心跳"
[ -d "$STATE_DIR/lock" ] && echo "锁: 存在（可能正在运行）" || echo "锁: 无"
if [ -f "$HOME/.config/atlas-dashboard/env" ]; then
  echo "凭证文件: 存在 ($HOME/.config/atlas-dashboard/env)"
else
  echo "凭证文件: 不存在（将从 ~/.zshrc 解析）"
fi
echo

echo "== 账本 =="
if [ -f "$LEDGER" ]; then
  awk -F'\t' '{n[$3]++} END{for(k in n) printf "  %-22s %d\n", k, n[k]}' "$LEDGER" | sort
  echo "  最近 5 条："
  tail -5 "$LEDGER" | awk -F'\t' '{printf "    %s %-28s %s %s\n",$1,$2,$3,$4}'
else
  echo "  （还没有账本）"
fi
echo

echo "== 队列 =="
pending=0; done_n=0; changed=0; no_ui=0; dirty_n=0; failed=0
for path in "$REPOS_DIR"/*/; do
  d="$(basename "$path")"
  [ -d "$path/.git" ] || continue
  git -C "$path" rev-parse --verify HEAD >/dev/null 2>&1 || { no_ui=$(( no_ui + 1 )); continue; }
  [ -n "$(find "$path" -maxdepth 3 -name '*.html' -not -path '*/.git/*' -print -quit 2>/dev/null)" ] \
    || { no_ui=$(( no_ui + 1 )); continue; }
  st="$(last_status "$d")"
  if [ "$st" = "DONE" ]; then done_n=$(( done_n + 1 )); continue; fi
  case "$st" in FAIL*) failed=$(( failed + 1 )); echo "  FAIL  $d  ($(tail -200 "$LEDGER" | awk -F'\t' -v p="$d" '$2==p{print $3" "$4}' | tail -1))"; continue;; esac
  if [ "$(dirty_of "$d")" != "0" ]; then dirty_n=$(( dirty_n + 1 )); echo "  脏    $d"; continue; fi
  if [ "$(today_of "$d")" != "0" ]; then changed=$(( changed + 1 )); echo "  今日已改 $d"; continue; fi
  pending=$(( pending + 1 ))
  echo "  待处理 $d"
done
echo
echo "汇总: 待处理=$pending 已完成=$done_n 失败=$failed 工作区脏=$dirty_n 今日已改=$changed 无界面/无提交=$no_ui"
[ "$pending" -gt 0 ] && echo "预计剩余时间: 每批 2 个 → 约 $(( (pending + 1) / 2 )) 小时"
