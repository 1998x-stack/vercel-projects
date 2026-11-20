#!/usr/bin/env bash
#
# atlas-dashboard · 调度器安装/卸载/自检
# ---------------------------------------------------------------------------
# 用法：
#   scripts/atlas-dashboard/install-scheduler.sh install         # 装 LaunchAgent，装载后约 1 小时首次触发
#   scripts/atlas-dashboard/install-scheduler.sh probe           # 用 launchd 探一次 TCC 权限（不跑任务）
#   scripts/atlas-dashboard/install-scheduler.sh test            # 立刻真实跑一批（会改代码，谨慎）
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
INTERVAL="${ATLAS_INTERVAL_SECONDS:-3600}"
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
  <!-- RunAtLoad=false + StartInterval=3600 → 装载后约 1 小时首次触发 -->
  <key>RunAtLoad</key>
  <false/>
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
    say "  2) scripts/atlas-dashboard/install-scheduler.sh fallback-nohup（推荐，继承当前终端权限）"
    return 1
  fi
  say "结论：launchd 可以读取仓库目录，调度可用。"
  return 0
}

install_all() {
  write_env_file || exit 1
  write_plist || exit 1
  load_agent || exit 1
  say "下一次触发大约在 $(date -v+${INTERVAL}S '+%F %T')（每 ${INTERVAL}s 一批，每批 2 个项目）"
  say "查看进度：scripts/atlas-dashboard/status.sh"
  say "看日志：   tail -f $STATE_DIR/latest.log"
}

fallback_loop() {
  mkdir -p "$STATE_DIR"
  local pidfile="$STATE_DIR/fallback.pid" logf="$STATE_DIR/fallback.log"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    say "兜底循环已在运行（pid=$(cat "$pidfile")）"
    return 0
  fi
  say "启动兜底循环：先睡 ${INTERVAL}s，再每小时跑一批（继承当前终端的权限，绕过 TCC）"
  nohup bash -c "
    sleep $INTERVAL
    while true; do
      echo \"[\$(date '+%F %T')] fallback tick\" >> '$logf'
      ATLAS_ROOT='$ROOT' bash '$TICK' >> '$logf' 2>&1
      sleep $INTERVAL
    done
  " >>"$logf" 2>&1 &
  echo $! >"$pidfile"
  say "fallback_pid=$(cat "$pidfile")  log=$logf"
  say "首次运行：$(date -v+${INTERVAL}S '+%F %T')"
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
  probe) probe_tcc ;;
  test) say "立刻真实跑一批（会修改代码并推送）"; ATLAS_ROOT="$ROOT" bash "$TICK" ;;
  fallback-nohup) fallback_loop ;;
  stop-fallback) stop_fallback ;;
  uninstall) uninstall_all ;;
  *) sed -n '2,20p' "$0" ;;
esac
