#!/usr/bin/env bash
# 后台镜像数据快照中引用的 GitHub 仓库到 repos/。
# 用法: scripts/clone-repos.sh [clone-repos.mjs 的参数]，例如
#   scripts/clone-repos.sh --jobs 4
#   scripts/clone-repos.sh --only TextCompare,shanghai_map
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p repos logs

# 私有仓库依赖 gh 凭证（osxkeychain / gh 凭证助手）
if command -v gh >/dev/null 2>&1; then
  gh auth setup-git >/dev/null 2>&1 || echo "warn: gh auth setup-git 失败，私有仓库可能无法克隆" >&2
fi

LOG="logs/clone-repos-$(date +%Y%m%d-%H%M%S).log"
nohup node scripts/clone-repos.mjs "$@" >"$LOG" 2>&1 &
PID=$!

echo "pid=$PID"
echo "log=$LOG"
echo "tail -f $LOG"
