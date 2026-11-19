# Dashboard 设计规范 — Vercel Projects Atlas

- 规范版本：1.0（2026-11-19）
- 适用文件：`site/index.html`、`site/assets/styles.css`、`site/assets/app.js`
- 上游依据：`AGENTS.md` 目录契约与四条不可违反规则、`docs/METHODOLOGY.md`、`data/manifest.json` 快照（2026-11-19）

---

## 1. 目标与硬约束

把当前"营销长页 + 目录列表"改造成**审计运营控制台（audit console）**：一眼看到资产规模、分布、数据完备度、需要处理的项目，然后进入可筛选、可排序、可下钻的网格。

设计必须服从以下既有约束，任何视觉决策不得违反：

| 约束 | 来源 | 对设计的直接限制 |
| --- | --- | --- |
| 零框架、零构建 | `AGENTS.md` 目录契约 | 只用原生 HTML/CSS/JS；图表用 CSS/SVG 手绘，不引入图表库 |
| 站点资产仅本地引用 | `tests/catalog.test.mjs` | 不加载任何第三方脚本/样式/字体 CDN |
| 用户可控数据只用 `textContent` | `AGENTS.md` | 所有渲染走 DOM API，禁止 `innerHTML` 拼接 |
| 不把 READY 当作生产健康 | `AGENTS.md` 规则 2 | 部署状态必须与"生产可用性"在视觉与文案上分离，图例文字显式说明 |
| 不据名称编造功能 | `AGENTS.md` 规则 4 | 仪表全部来自真实字段；`name-only` 项目以"待核验"呈现，不得被算作已知信息 |
| 不把私有信息带进 Public | `AGENTS.md` 规则 3 | 页面只呈现已授权公开的项目名/仓库名/分类；无源码、无密钥、无日志 |

**数据事实（用于校准仪表，已由数据快照核对）**：51 个项目 / 49 条 GitHub 关联 / 48 个唯一仓库；部署状态 READY 48、BLOCKED 1、无部署 2；部署目标 production 45、preview/unspecified 4；GitHub 关联**引用** private 41 / public 8（合计 49 条），**唯一**仓库 private 40 / public 8（合计 48 个，`historicalRecords` 属 private 且被 2 个 Vercel 项目共用）；未关联 GitHub 的**项目** 2 个。证据级别 name-only 31、readme 15、source-inspection 3、vercel-only 2；全部项目 `checked_at` = 2026-11-19；最近一次部署年份 2025 年 35 个、2026 年 14 个。

---

## 2. 信息架构

左侧固定导航栏（rail）+ 右侧工作区（workspace）。rail 承载"我在哪 / 数据是什么版本 / 边界是什么"，工作区承载全部仪表。

| # | 区块 | 内容 | 回答的问题 |
| --- | --- | --- | --- |
| 01 | 资产概览 `#overview` | 6 张 KPI 卡：Vercel 项目、GitHub 关联、唯一仓库、Private/Public、最近一次 READY、需处理项；右侧部署状态环 + 数值图例 | 规模有多大？ |
| 02 | 分布 `#distribution` | 分类分布（8 条横向条形，精确比较）＋ 证据级别构成（分段条） | 资产集中在哪？数据可信度如何？ |
| 03 | 新鲜度 `#freshness` | 部署陈旧度三段条（<90 天 / 90–365 天 / >365 天 / 无部署）＋ 快照日期与目标环境构成 | 多少资产可能已经过时？ |
| 04 | 待办队列 `#queue` | 由字段规则推导的处理清单（见 §7），每条给出触发原因 chip 与建议动作来源 | 先动哪一件？ |
| 05 | 项目网格 `#projects` | 筛选栏 + 可排序数据表（名称/分类/仓库/证据/状态/时间），行下钻抽屉 | 具体到某个项目？ |
| 06 | 方法与边界 `#method` | 四条核验标准 + 方法论文档链接 | 凭什么相信这些数字？ |

导航高亮当前区块（scroll-spy），URL 支持 `#projects` 与 `?project=<name>` 深链。

---

## 3. ui-ux-pro-max 检索结论与取舍

检索命令与结果（skill 版本数据：79 styles / 192 palettes / 119 UX guidelines / 25 chart types）：

| 检索 | 命中 | 处理 |
| --- | --- | --- |
| `--design-system "audit operations console developer portfolio dashboard" --density 8 --motion 3 --variance 4` | Pattern `Enterprise Gateway`、Style `Dark Mode (OLED)`、Typography `Dashboard Data` | **部分采纳**：采纳 density 8 的密集节奏、mono+sans 分工；**否决** `Enterprise Gateway` 模式（其结构是 Hero 视频 → 按行业解决方案 → 客户 Logo 轮播 → Contact Sales，属营销漏斗，与审计控制台无关） |
| `--domain typography "technical dashboard tabular numbers data"` | `Dashboard Data`：Fira Code + Fira Sans，mood = dashboard/analytics/precise | **采纳意图，改实现**：使用系统 mono/sans 栈替代 Google Fonts CDN（见 §5） |
| `--domain color "dashboard data categorical palette"` | `Analytics Dashboard`：#1E40AF 主色 / #D97706 强调 / #F8FAFC 背景 | **部分采纳**：采纳浅色表面阶梯与琥珀色"注意"语义；**否决**蓝色主色，保留既有品牌靛蓝（该站已公开发布，换主色属无授权改版） |
| `--domain color "color dark mode theme tokens"` | `Ticketing / Box Office` 深色阶梯：#020617 / #0E1223 / #1A1E2F / #334155 / #94A3B8 | **采纳结构，调整色相**：作为深色主题的表面/边框/次要文字阶梯，向靛蓝偏移 |
| `--domain color "color accessible pairs"` | **0 结果（无数据库匹配）** | 不采用"通用默认"；改为自建 `scripts/check-contrast.mjs` 按 WCAG 2.1 公式实际计算对比度（见 §6 与 §10） |
| `--domain chart "categorical distribution breakdown"` | 分类变量推荐 grouped/horizontal bar；环形/嵌套图列为 Secondary 且 a11y risk 较高 | **采纳**：分类用条形图（长度比较）；环形仅用于状态占比且**必须**带数值图例，不依赖颜色区分 |
| `--domain ux "dense data table sticky header"` / `"empty state no filter results"` / `"loading skeleton placeholder"` / `"focus not obscured"` / `"sidebar active navigation state"` | 表格横向溢出需 scroll 包裹或卡片化；空状态要给建议动作；加载用稳定骨架并标 `aria-busy`；粘性 UI 需 `scroll-padding` 补偿，焦点不得被遮挡；导航需显式 active 态 | **全部采纳**，逐条落到 §8/§9 |
| `--stack html-tailwind "dense table zebra sticky header"` | **0 结果（无数据库匹配）** | 无可用建议，按原生 CSS 表格实践实现 |

**被否决项汇总**：营销型 Hero 模式、纯黑 OLED 单主题、外部字体 CDN、蓝色替换品牌主色、引入图表库、滚动揭示动画（会把首屏下内容默认设为不可见，违反可访问性与无 JS 降级）。

---

## 4. 视觉方向

"**档案室里的控制台**"：纸感浅色工作区承载长文本（中文风险/建议需要高可读性），深靛蓝 rail 与深色主题承载数据密度。视觉语言由三件事建立，不靠装饰：

1. **数据优先的排版** —— 数字用 tabular-nums 对齐，标识符用 mono，标签用小型大写字距；
2. **克制的表面阶梯** —— 画布 / 卡片 / 下沉三层，只有 1px 边框与极浅阴影，无渐变滥用；
3. **语义色只用于语义** —— 状态色仅出现在状态 chip 与图表中，品牌靛蓝仅用于交互与强调。

---

## 5. 字体

| 角色 | 栈 | 理由 |
| --- | --- | --- |
| 正文/中文 | `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif` | 中文回退到系统字体，避免 200KB+ 网络字体与 FOUT |
| 数字/指标 | 同上 + `font-variant-numeric: tabular-nums` | 数字等宽对齐，列内可比较 |
| 标识符/时间/SHA | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace` | 项目名、仓库名、部署时间、`deployed_at` 类字段 |

字体排印节奏：rail 标签 10px/0.14em 大写，区块标题 22–26px（`clamp`），面板标题 14px，表格正文 13px，辅助文字 11–12px；行高 1.5（表格 1.4），中文长文本 1.85。

**不使用外链字体**：公开页面记录私有项目，加载第三方 CDN 会把访客 IP 暴露给第三方，破坏离线可审计性，并与"仅本地资产"测试冲突。

---

## 6. 配色（三层 token）

`site/assets/styles.css` 中按「原生值 → 语义 → 组件」三层组织；深色主题用 `[data-theme="dark"]` 覆盖语义层，并支持 `prefers-color-scheme` 自动切换与手动 toggle（localStorage 记忆）。

语义 token（浅色）：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--surface-canvas` | `#f6f7fa` | 页面画布 |
| `--surface-raised` | `#ffffff` | 卡片/表格/抽屉 |
| `--surface-sunken` | `#eceef4` | 轨道、chip、骨架 |
| `--surface-rail` | `#131a2d` | 左侧导航（深靛蓝） |
| `--text-primary` | `#131a2d` | 主文字 |
| `--text-secondary` | `#58617a` | 次要文字 |
| `--text-muted` | `#767e92` | 辅助文字 |
| `--border-subtle` / `--border-strong` | `#e3e7ef` / `#ccd3e0` | 分隔与描边 |
| `--accent` / `--accent-soft` | `#4a3ec0` / `#eceafb` | 交互、选中、条形图填充 |
| `--status-ready-fg/bg` | `#146b52` / `#e6f5ef` | 部署 READY |
| `--status-error-fg/bg` | `#a8382f` / `#fdeceb` | 部署 ERROR |
| `--status-warn-fg/bg` | `#8a5b12` / `#fdf1e0` | BLOCKED / 需注意（采纳 skill 琥珀语义） |
| `--status-idle-fg/bg` | `#666e80` / `#eef0f4` | 无部署 / 未知 |
| `--status-info-fg/bg` | `#4a3fb0` / `#eceafb` | QUEUED / BUILDING / 证据提示 |

深色主题沿用 §3 检索到的表面阶梯色相（向靛蓝偏移）：画布 `#070b14`、卡片 `#111726`、下沉 `#1a2131`、rail `#05080f`、边框 `#232c40`、次要文字 `#a7b0c3`、强调 `#9d95f5`。

对比度要求（由 `scripts/check-contrast.mjs` 强制校验，WCAG 2.1 相对亮度公式）：

- 正文/次要文字 vs 其所在表面 ≥ **4.5:1**；
- 大号指标数字与状态 chip 文字 vs 其底色 ≥ **4.5:1**；
- 焦点环、图标、图表主色 vs 相邻表面 ≥ **3:1**；
- 明暗两套主题都必须通过，不得只验证一套。

---

## 7. 组件与推导规则

| 组件 | 规格 |
| --- | --- |
| KPI 卡 | 标签 11px + 数值 34–40px tabular + 一行脚注（说明口径，如"关联数 ≠ 不同仓库数"）；6 列 → 3 列 → 2 列 |
| 面板 Panel | `--surface-raised` + 1px 边框 + 18px 圆角 + 24px 内边距；标题行含右侧小型大写口径标签 |
| 横向条形图（分类） | 8 行 `label 132px / track 1fr / value`；条宽按最大值归一；数值以文本呈现，不依赖颜色 |
| 状态环 + 图例 | conic-gradient 环 + 数值图例（状态名 + 计数）；中心显示 READY 计数并标注"最近一次部署" |
| 三段陈旧度条 | 单条分段（新鲜/陈旧/过期/无部署），每段带计数与百分比；阈值以快照日 2026-11-19 为基准 |
| 待办行 | 触发原因 chip（状态 / 分支未合并 / 授权未核验 / 非 production 目标）+ 项目名 + 数据自带的 `next` 建议 |
| 数据表 | 7 列；`<th>` 内按钮排序，`aria-sort` 同步；行内名称按钮打开抽屉；窄屏横向滚动，<900px 卡片化 |
| 抽屉 Inspector | 保留现有详情字段（技术、风险、建议、元数据、外链），增加"部署状态口径"说明块 |
| 提示 Notice | 底部 `role="status"` 瞬时提示（导出、主题切换、加载失败） |

**待办队列推导规则（全部来自真实字段，不新增判断）**：

| 层级 | 规则 | 当前命中 |
| --- | --- | --- |
| P0 | `last_deployment.state === "BLOCKED"` 或 `review.release_status === "NOT_MERGED"` | theory-of-evolution、gu-heng-speaksof-good-books、energy-frontiers-report |
| P1 | 无 `last_deployment`（无部署记录） | v0-ai-chat-interface、v0-analytics-dashboard |
| P1 | `review.rights_verified === false`（传播授权未核验） | gu-heng-speaksof-good-books |
| P2 | `last_deployment.target !== "production"` | emotional-expert、mbti、gao-kao-web、shanghai-school |
| 质量指标 | `evidence === "name-only"` 计为"待核验"，只出现在质量面板与筛选器，不刷屏队列 | 31 个项目 |

---

## 8. 交互

- **键盘**：`/` 聚焦搜索；表头按钮切换排序；行内名称按钮打开抽屉；`Esc` 关闭；抽屉内 `Tab` 循环（焦点陷阱）；rail 导航可 Tab 到达并高亮当前区块。
- **筛选**：分类 chip（含计数）、部署状态、仓库可见性、证据级别、搜索词、排序（名称/最近部署/风险优先/证据）；筛选结果计数随 `aria-live="polite"` 播报。
- **空状态**：显示"没有匹配的项目" + 已生效条件摘要 + "清除全部筛选"按钮，不留死路。
- **加载**：数据读取期间显示稳定骨架（`aria-busy="true"`），读取失败时在网格内给出可读错误与重试按钮。
- **深链**：`?project=<name>` 直接打开抽屉，`#section` 定位区块；关闭抽屉时恢复原先焦点。
- **导出**：CSV 保留（含分类、可见性、状态、目标、证据）。
- **主题**：手动切换并写入 `localStorage`；未设置时遵循 `prefers-color-scheme`。
- **动效**：150–250ms 过渡，只用于 hover/抽屉/主题；`prefers-reduced-motion: reduce` 下全部关闭；不使用滚动揭示（首屏以下内容必须默认可读）。

---

## 9. 响应式与无障碍契约

| 断点 | 布局 |
| --- | --- |
| ≥1280px | rail 264px 固定 + 工作区最大 1180px；KPI 6 列；表格 7 列 |
| 1024–1279px | rail 232px；KPI 3 列；分布/新鲜度并排 |
| 768–1023px | rail 变顶部横向导航；KPI 2 列；表格列精简为 4 列 |
| <768px | 单列；表格卡片化（每个项目一张卡）；抽屉全屏宽度 |

无障碍契约（交付前逐条核对）：

1. 所有可聚焦控件有 ≥3:1 的可见焦点环，且不被粘性元素遮挡（`scroll-padding-top` 补偿顶部导航高度）；
2. 正文与状态 chip 文字对比度 ≥4.5:1，明暗主题分别校验；
3. 图表信息不依赖颜色：条形带数值文本、图例带计数、环形中心带计数；
4. 表格语义正确（`caption`/`th scope`/`aria-sort`），窄屏横向滚动时键盘仍可操作；
5. 状态变化（筛选结果数、导出成功、加载失败）通过 `aria-live` 播报；
6. `prefers-reduced-motion` 下无过渡动画；
7. 图标一律为内联 SVG 或文本字符，不使用 emoji 充当结构性图标；
8. 375px 宽度无横向溢出（表格滚动容器除外）。

---

## 10. 验证记录

设计规范完成后执行并记录了以下命令（均为本次交付实际运行结果）：

```bash
npm run check          # Catalog validation PASS {projects:51,githubLinks:49,uniqueGithubRepos:48,publicRepos:8,privateRepos:40,ready:48}
                       # 对比度检查：93 组（文字 ≥4.5:1、非文字 ≥3:1），深色 token 漂移 0 项 → PASS
npm test               # 15 项全部通过（5 项原有数据契约 + 3 项对比度 + 7 项 Dashboard UI 契约）
npm run build          # dist/ 产物：index.html + assets/app.js + assets/styles.css + data/
npm run ui:check ...    # 无头 Chrome 渲染后验证（探针独立重算期望值）
```

渲染后界面验证结果（页内探针共 40 项：计数一致、图表几何、布局溢出、焦点遮挡、实测对比度、排序/筛选/搜索/抽屉、主题 token、文案与数据同源）：

| 视口 | 主题 | 结果 |
| --- | --- | ---: |
| 1440×1200 | 浅色（跟随系统） | 40/40 通过 |
| 1024×1100 | 深色（手动） | 40/40 通过 |
| 500×844 | 浅色 | 39/39 通过（表格列在 ≤883px 卡片化，表格内部滚动项不适用） |
| 500×844 | 深色 | 39/39 通过 |

关键结论（均有可复现证据，而非目测）：

1. **对比度**：93 组 token 对照在浅色 / 深色（媒体查询）/ 深色（手动）三种语境下全部达标；最紧边距为浅色 `border-control` on `surface-sunken` = 3.08（要求 ≥3），浅色 `text-muted` on `surface-sunken` = 4.79，深色 `text-muted` on `surface-sunken` = 4.76（要求 ≥4.5）。
2. **深色双源一致**：`prefers-color-scheme` 块与 `[data-theme="dark"]` 块的 token 逐项相等（漂移 0 项），避免“跟随系统正常、手动切换变色”的常见缺陷。
3. **渲染后实测**：在真实 DOM 上按 `getComputedStyle` 取色重算对比度，抽样 20 类元素（含 chip、表格单元、图例、抽屉字段）全部 ≥4.5:1。
4. **焦点不被遮挡**：对项目网格与队列中的 12 个控件执行 `scrollIntoView({block:start})` + `focus()` 后，与粘性栏重叠高度均为 0；`scroll-padding-top` 补偿与实际粘性堆叠高度（宽屏 64px、窄屏 52+64px）一致。
5. **数据一致性**：KPI、表格行数、卡片数、队列条数均由探针独立从 `data/*.json` 重算后比对，不依赖实现自身的计算逻辑。
7. **文案不脱节**：面板脚注中的数量与日期不再硬编码，均由快照现场生成（探针会断言其与 `data/` 一致）。
6. **提示**：验证过程发现并修复了两个真实缺陷——注入探针时 `String.replace` 会把 `$$` 当作特殊替换模式（改用函数式 replacer，见 `scripts/ui-check.mjs` 注释）；窄屏下命令栏 sticky 位置需按 rail 横条高度补偿。

### 10.1 复验与修正（同快照 2026-11-19，追加记录）

对同一份数据快照重跑全部验证，并修正了两项真实缺陷（只改文档与一条 CSS 声明，不动数据）：

| 缺陷 | 性质 | 证据 | 处理 |
| --- | --- | --- | --- |
| 本文 §1 写“仓库 private 41、public 8”，与同句“48 个唯一仓库”矛盾（41+8=49） | P0 数据准确性：把**关联引用数**当成了**唯一仓库数** | 49 条引用中 private 41 / public 8；48 个唯一仓库中 private 40 / public 8。差额来自 private 的 `historicalRecords` 被 2 个 Vercel 项目共用（正是 `AGENTS.md` 规则 5 的情形） | 改写为“关联引用 private 41 / public 8（49 条）；唯一仓库 private 40 / public 8（48 个）” |
| `.commandbar` 只用 `color-mix()` 设背景，无回退 | P1 兼容性：不支持 `color-mix` 的浏览器会丢掉背景，粘性栏透出后方内容 | 该声明前新增不透明 `background:var(--surface-canvas)` 回退；不支持的浏览器在解析阶段丢弃 `color-mix` 声明而沿用回退 | 见 `site/assets/styles.css` 第 5 节 |

复验命令与结果（均为本轮实际输出）：

```bash
npm run check   # PASS：{projects:51,githubLinks:49,uniqueGithubRepos:48,publicRepos:8,privateRepos:40,ready:48}；对比度 93 组 PASS
npm test        # 15/15 通过
npm run build   # dist/ 产物完整
npm run ui:check -- --width 1440 --height 1200 --theme both   # PASS
npm run ui:check -- --width 1024 --height 1100 --theme both   # PASS
npm run ui:check -- --width 375  --height 812  --theme both   # PASS（补上契约 §9.8 要求的 375px 窄屏）
```

回退有效性的实测证据（Chrome 无头，读 `getComputedStyle`）：

```json
{"bg":"color(srgb 0.960784 0.964706 0.980392 / 0.88)","backdrop":"blur(8px)","supportsColorMix":true}
```

即：支持 `color-mix` 的浏览器仍取 88% 半透明画布色 + 毛玻璃（回退声明未覆盖它）；不支持的浏览器则得到实色画布，绝不透出。

仍未覆盖（已知限制，未变）：Safari/Firefox 实测、像素级视觉回归、打印样式、>1440px 超宽屏。

已验证限制：

- 未做像素级视觉回归（本项目暂无截图基线）；也未在本机以外浏览器（Safari/Firefox）实测，仅使用了标准 CSS（`conic-gradient`、`color-mix`、`backdrop-filter`）并在 Chrome 上验证。
- `color-mix(in srgb, var(--surface-canvas) 88%, transparent)` 用于命令栏背景。原实现无回退，不支持该函数的浏览器会丢失背景导致粘性栏后方内容透出；现已在该声明前加一条不透明 `background:var(--surface-canvas)` 回退（不支持的浏览器在解析阶段丢弃 `color-mix` 声明，回退为实色画布，绝不透出）。
- 未验证打印样式与超宽屏（>1440px）的视觉表现。
