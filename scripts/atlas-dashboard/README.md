# atlas-dashboard · repos/ 全量 Dashboard 改造编排

每 30 分钟一轮、每轮 3 个（并行），无人值守地把 `repos/` 里**最近 24 小时没有代码改动**
的仓库，用 `pi` + `ui-ux-pro-max` 技能改造成专业 Dashboard：先出设计规范，再实施，再验证，
然后提交并推送。

设计依据：`docs/superpowers/specs/2026-11-19-atlas-dashboard-automation-design.md`

## 文件

| 文件 | 作用 |
|------|------|
| `prompt.md` | 交给 pi 的任务书：侦察 → 设计规范 → 实施 → 验证 → 提交，含硬约束 |
| `tick.sh` | 一批 2 个项目：选项目 → 跑 pi → 过验证闸门 → push |
| `install-scheduler.sh` | LaunchAgent 安装/卸载/TCC 自检/兜底循环 |
| `status.sh` | 进度、队列、账本、调度状态一览 |
| `done.seed.tsv` | 自动化上线前已完成的 8 个仓库（防止跨天后被重复改造） |
| `../../logs/atlas-dashboard/` | 运行日志、账本、心跳、锁（已被 .gitignore 忽略） |

## 常用命令

```bash
scripts/atlas-dashboard/status.sh                                  # 看进度
scripts/atlas-dashboard/install-scheduler.sh install               # 装调度（自动选 LaunchAgent 或兜底循环，装完立即开一轮）
scripts/atlas-dashboard/install-scheduler.sh kickstart             # 立刻手动开一轮
scripts/atlas-dashboard/install-scheduler.sh probe                 # 探一次 launchd 的 TCC 权限
scripts/atlas-dashboard/install-scheduler.sh uninstall             # 卸载
scripts/atlas-dashboard/install-scheduler.sh fallback-nohup        # 常驻循环（launchd 被 TCC 拦截时用）
scripts/atlas-dashboard/install-scheduler.sh stop-fallback

ATLAS_DRY_RUN=1 scripts/atlas-dashboard/tick.sh                    # 只看选哪些项目，不执行
ATLAS_ONLY=webGuide scripts/atlas-dashboard/tick.sh                # 只跑指定项目
ATLAS_BATCH=1 ATLAS_PARALLEL=1 scripts/atlas-dashboard/tick.sh     # 退回串行单项目
scripts/atlas-dashboard/tick.sh                                    # 立刻跑一轮（默认 3 个，并行 3 路）
```

`npm run atlas:tick` / `npm run atlas:status` 是同样的入口。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `ATLAS_BATCH` | `3` | 每轮项目数 |
| `ATLAS_PARALLEL` | `3` | 轮内并行度（各项目在自己的仓库里跑，互不共享文件） |
| `ATLAS_MODEL` | `iagent/standard` | 使用的模型 |
| `ATLAS_TIMEOUT_SECONDS` | `1800` | 单项目超时（30 分钟） |
| `ATLAS_LOCK_WAIT_SECONDS` | `1800` | 上一轮没结束时最多等多久才放弃本轮（不白跳轮） |
| `ATLAS_CHANGED_WINDOW` | `24 hours ago` | "今天"的落地口径：滚动最近 24 小时 |
| `ATLAS_MAX_ATTEMPTS` | `2` | 同一项目失败几次后不再自动重试 |
| `ATLAS_SKIP` | `logicTraining` | 永久跳过的项目（有其他会话在飞） |
| `ATLAS_FORCE` | 空 | 逗号分隔：强制重做（可覆盖种子名单与设计规范判重） |
| `ATLAS_IGNORE_SEED` | `0` | 设为 1 则忽略 `done.seed.tsv` |
| `ATLAS_ONLY` | 空 | 逗号分隔：只跑这些项目 |
| `ATLAS_DRY_RUN` | `0` | 1 = 只选项目不执行 |
| `ATLAS_INTERVAL_SECONDS` | `1800` | 调度间隔（30 分钟） |

## 每个项目的流水线

1. **选资格**（每次 tick 现查真实 git 状态）：有 `.git`、有提交、有 HTML、
   工作区干净、最近 24 小时无提交、不在种子名单/账本/跳过名单里。
2. **跑 pi**（`--no-extensions --no-mcp`，避免注入需要人工批准的流程门）：
   强制加载技能（`--skill` 绝对路径 **并**把 `SKILL.md` 正文注入 prompt，
   因为在 `repos/<项目>` 里技能不会被自动发现）。
3. **验证闸门**（全过才 push）：
   - `docs/DESIGN_SPEC.md` 存在
   - 至少 1 个新提交，且工作区干净
   - 未新增外部网络资源（`src`/`href` 里的 `http(s)://`，`<a>` 除外）
   - 仓库自带 `npm test` 且依赖就绪时必须通过
   - 推送前不落后于 `origin/<分支>`
4. **push**：只推当前分支到自己的 `origin`，从不 `--force`。

任一闸门失败：**保留本地提交、不推送**，账本记 `FAIL_*`，等人看。

## 安全边界

- 单项目失败不影响其他项目；同一时刻只允许一轮（目录锁，3 小时视为陈旧可回收）。
- 轮内 3 个项目分别在不同仓库里跑，没有共享文件；同一仓库绝不会被两轮同时改。
- 非默认分支的仓库一律不自动改（如 `TextCompare` 曾在 feature 分支上）。
- `IAUTO_API_KEY` 存在 `~/.config/atlas-dashboard/env`（600，仓库外），
  脚本从 `~/.zshrc` 解析写入；仓库与提示词里不出现任何密钥。
- 脚本只操作 `repos/<项目>` 自己，不跨仓库改动；不改 `data/`、`site/`、`dist/`。

## 为什么不用 crontab

macOS 上 `cron` 访问 `~/Desktop` 受 TCC 限制，且不加载 `~/.zshrc`
（`IAUTO_API_KEY` 会缺失）。LaunchAgent 同样会被 TCC 拦（实测
`ls repos` 返回 `Operation not permitted`），所以 `install` 会先探一次：
能过就用 LaunchAgent（`StartInterval=1800`，可跨重启），过不去就自动改用
`nohup` 常驻循环（继承当前终端的权限，不改系统设置就能跑）。

想让调度跨重启存活：把 `/bin/bash` 加入 系统设置 → 隐私与安全性 → 完全磁盘访问权限，
然后 `ATLAS_FORCE_LAUNCHD=1 install-scheduler.sh install` 并 `stop-fallback`。

## 故障处理

```bash
tail -f logs/atlas-dashboard/latest.log     # 当前批的完整 pi 会话输出
column -t -s $'\t' logs/atlas-dashboard/ledger.tsv | tail -20
```

看到 `FAIL_GATE` / `FAIL_AGENT_RC_*` / `FAIL_PUSH`：进对应仓库
`git log -1`、`git status` 看现场，人工修好后
`ATLAS_FORCE=<项目> scripts/atlas-dashboard/tick.sh` 重跑（或手工推送后
用 `ATLAS_ONLY` 复核其他项目）。
