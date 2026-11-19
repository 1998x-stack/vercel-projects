#!/usr/bin/env bash
# 等待既有克隆作业结束后，自动补跑缺失仓库（已有的目录会被跳过，只克隆失败/未处理的）。
# 用法: scripts/clone-repos-resume.sh <等待的PID> [clone-repos.mjs 参数...]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WAIT_PID="${1:?需要传入要等待的 PID}"; shift || true
mkdir -p repos logs
LOG="logs/clone-repos-resume-$(date +%Y%m%d-%H%M%S).log"
nohup bash -c "
  while kill -0 ${WAIT_PID} 2>/dev/null; do sleep 20; done
  cd '$ROOT'
  printf '%s 前序作业 ${WAIT_PID} 已结束，开始补跑\n' \"\$(date -u +%FT%TZ)\" >> '$LOG'
  exec node scripts/clone-repos.mjs \"\$@\"
" -- "$@" >"$LOG" 2>&1 &
echo "resume_pid=$!"
echo "waiting_for=$WAIT_PID"
echo "log=$LOG"
