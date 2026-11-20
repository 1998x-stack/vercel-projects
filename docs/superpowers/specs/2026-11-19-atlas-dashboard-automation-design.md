# 设计规范：repos/ 全量 Dashboard 改造自动化（atlas-dashboard）

日期：2026-11-19
状态：已批准（方案 A）
范围：`scripts/atlas-dashboard/`，仅为调度与提示词；不修改 `data/`、`site/`、`docs/PROJECT_AUDIT_*.md`

## 意图与为什么

`repos/` 下是 37 个已镜像的源仓库。其中 8 个在 2026-11-19 已经用
`ui-ux-pro-max` 完成过一轮 Dashboard 改造（CEQT、TextCompare、
india-supply-chain-watch、investmentReference、jobCategories、
retirementPolicy、shanghai_map、shanghai_school），产出的规范、验证与提交
质量一致且可复用。剩下 25 个有界面的仓库尚未处理。

目标是把同一套流程**无人值守地**跑完，并且：每小时只跑 2 个项目，从装载
调度器后约 1 小时开始，避免并发写同一份工作区、避免一瞬间打满机器与配额。

实际落地时 `repos/` 已从 37 个目录增长到 43 个（后台克隆作业仍在补仓库），
队列实测为 33 个，约 17 小时跑完。

## 目标

- 25 个符合条件的仓库，每个产出：`docs/DESIGN_SPEC.md`（先规范）+ 重构后的界面 + 真实验证证据 + 一次 conventional commit，并推送到各自的 origin。
- 运行状态可审计：账本、日志、每次 pi 会话都在本地留痕。
- 单点失败可隔离：一个项目失败不影响其他项目，也不产生半成品推送。

## 非目标

- 不改动各仓库的数据层（`data*.js`、`courses/`、PDF/音频等资产）。
- 不碰 `data/`、`site/`、`dist/`，不新增 Vercel 项目，不删除或合并仓库。
- 不做自动刷新/健康检查（AGENTS.md 质量优先级 P3）。
- 不代替人工审美评审：截图是给人工核验用的证据，不是"美观已通过"的断言。

## 反目标（出现即为失败）

- 未经核验就宣称"验证通过"或"已上线"。
- 半成品或验证失败的改动被 push 到公开仓库。
- 把私有源码、密钥、账号数据写进公开仓库（AGENTS.md 规则 3）。
- 覆盖其他会话正在进行的工作。

## 边界与事实

`repos/` 是**增长中的集合**：编写本规范期间后台克隆作业又补进了 8 个仓库
（`FounderNotes`、`catBrotherWorld`、`civilLaw`、`historyOfWorldCivilization`、
`luKeWen`、`scienceReference`、`seeWorld`、`theRoadToWealthFreedomRevolution`），
目录数由 37 变为 43。因此资格判断必须是**每次 tick 现查**，不能写死名单；
本次队列经实测为 **33 个**，每批 2 个约 17 小时跑完。

"今天没有代码改动" 落地为**最近 24 小时滚动窗口**：跨过零点后不会把昨晚刚做完的
仓库重新算成有资格（纯"自然日"口径会在 00:00 集体失效）。

- 自动化上线前已完成而**排除**的 8 个：CEQT、TextCompare、
  india-supply-chain-watch、investmentReference、jobCategories、
  retirementPolicy、shanghai_map、shanghai_school —— 记在 `done.seed.tsv`，
  以免跨天后被第二轮覆盖。
- 无界面而排除的：`theoryOfEvolution`（仅 README）、空仓库（无提交）。
- 工作区脏而排除的：`logicTraining`（`index.html`/`scripts.js`/`styles.css`
  已改动，另有未跟踪的 `docs/` 与 `tests/`，判断为其他会话在飞，不覆盖）。
- 其余按目录名排序依次处理；新增仓库会自动进入队列。

## 备选方案

1. **每项目一个独立 `pi -p` 进程，串行**（选中）：故障隔离、上下文不累积、
   每个仓库的会话可单独回看。
2. 一个长会话内循环 25 个项目：上下文爆炸、一次崩溃带走整批、失败定位困难。
3. 用 pi-subagents 双并发编排：可行，但引入扩展耦合，且本任务受模型配额而非
   墙钟时间限制，并发收益有限。

## 决策（方案 A）

- **调度**：macOS LaunchAgent（`StartInterval=3600`），等价且比 crontab 可靠 ——
  crontab 对 `~/Desktop` 受 TCC 限制。装载后约 1 小时首次触发。若实测被 TCC
  拦截，退回 `nohup` 常驻循环（该进程继承当前终端的权限）。
- **运行时机**：装载调度器后约 1 小时首次触发，之后每 3600s 一批，每批 2 个。
- **批大小**：每次 2 个项目；`flock` 风格的目录锁保证同一时刻只有一批（锁超
  3 小时视为陈旧可回收）。
- **凭证**：`IAUTO_API_KEY` 在安装时从 `~/.zshrc` 提取到
  `~/.config/atlas-dashboard/env`（`chmod 600`，仓库之外）。仓库与提示词中
  不出现任何密钥。push 前执行 `gh auth setup-git`。
- **技能加载**：在 `repos/<项目>` 内启动 pi 时 `ui-ux-pro-max` 不会被自动发现
  （skills 发现到 git 仓库根即停止）。因此 tick 显式传 `--skill <绝对路径>`
  **并**把 `SKILL.md` 正文注入 prompt，双重保证。
- **不使用扩展**：`--no-extensions --no-mcp`。默认搭载的 superpowers 会注入
  需要人工批准的流程门（brainstorming HARD-GATE），会让无人值守任务卡住。
- **提交与推送分离**：pi 只负责 commit，tick 负责 push，且推送前过验证闸门；
  这样"失败即不公开"。
- **产出约定**：`docs/DESIGN_SPEC.md` 为硬性产出（先规范后实施）；
  `design-system/<slug>/MASTER.md` 与 `docs/screenshots/` 为推荐产出（沿用
  已有先例的做法）。

## 验证闸门（全部通过才 push）

1. `docs/DESIGN_SPEC.md` 存在。
2. 至少新增 1 个提交，且工作区干净。
3. 未新增外部网络资源引用（`src=`/`href="http...`，`<a>` 除外）。
4. 仓库若自带 `npm test` 且 `node_modules` 就绪，则必须通过。
5. HEAD 分支是默认分支，且推送前本地不落后于 origin。

任一闸门失败：保留本地提交、记录 `FAIL_*`、不推送、写入日志待人工处理。

## 留给实施者的部分

- 各仓库的具体信息架构、风格方向、令牌取值 —— 由 `ui-ux-pro-max` 在运行时
  按项目真实内容决定，不在本规范中预先规定。
- 提示词文本见 `scripts/atlas-dashboard/prompt.md`；调度与闸门实现见
  `scripts/atlas-dashboard/tick.sh`。
