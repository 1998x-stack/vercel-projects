# Vercel Projects Atlas

**1998x-stack 关联 Vercel 项目的分类资产库、部署快照与 GitHub Pages 交互目录。**

[项目总表](docs/PROJECT_AUDIT_2026-11-19.md) · [证据与安全方法](docs/METHODOLOGY.md) · [Pages 部署指南](docs/PAGES.md) · [GitHub Actions](https://github.com/1998x-stack/vercel-projects/actions/workflows/pages.yml)

> **重要：这是一份 2026-11-19 的时间点审计快照，不是实时生产监控。** `READY` 表示最近一次 Vercel 部署成功完成（也可能是 Preview），不代表生产域名可访问或业务功能正常。

## 已核查资产

| 指标 | 数量 | 口径 |
|---|---:|---|
| Vercel Projects | **51** | 以独立 Vercel 项目计数 |
| GitHub 关联 | **49** | 项目与仓库的关联边数 |
| 不同 GitHub 仓库 | **48** | 去重后仓库数 |
| GitHub Public 仓库 | **8** | 真实 GitHub 可见性 |
| GitHub Private 仓库 | **40** | 只发表高层资产信息，不复制私有代码 |
| 没有 GitHub 关联的项目 | **2** | 未绑定源码仓库 |
| 最近部署 READY | **48** | 最近一次部署快照（含 Preview） |
| 最近部署 BLOCKED | **1** | 需要排查 |
| 最近部署无记录 | **2** | 需判断是否保留 |

**团队：** `xiemings-projects`（Vercel Hobby）。由已授权 Vercel/GitHub 连接读取项目、关联关系与相关 README。一个 GitHub 仓库可能关联两个 Vercel 项目，不能将它们错误去重。

## 八大分类

| 分类 | 项目数 | 重点 |
|---|---:|---|
| 应用与效率工具 | 8 | 任务矩阵、文本差异、导航、应用原型 |
| 教育与职业 | 7 | 高考知识地图、学校、课程、职业资格 |
| 商业与产业 | 6 | 商业参考、消费品、制造业、管理 |
| 金融与政策计算 | 5 | 个人记账、市场、退休政策、投资资料 |
| 社会、法律与传播 | 6 | 民法、劳动法、时政、情感与传播 |
| 历史与文化 | 8 | 世界史、地区史、历史资料 |
| 媒体与知识资源 | 9 | 书籍音频、历史能源课程、TED、期刊、知识档案 |
| 研究情报与地图 | 2 | 印度供应链与上海地图 |

全部项目均有一条机器可读记录，包含：GitHub 关联、公开/私有标识、分类、业务定位、技术证据、最近部署、风险和下一步建议。证据薄弱的项目一律标记为**名称级推断/待核验**。

### 重点发现

- **MBTI**：构建输出目录 `dist/` 与 Vercel 原配置 `public/` 不匹配；已修复配置，仍需确认生产发布。
- **Shanghai School**：HTML/JS 静态站点，旧生产构建失败；后续应复核 2024 年历史学校数据和在线访问。
- **Emotional Expert**：历史生产部署出现 BLOCKED，不能因新预览构建 READY 就判定生产恢复。
- **Theory of Evolution**：GitHub 当前只有占位 README；缺少实际站点内容，最近部署仍 BLOCKED。
- **India Supply Chain Watch（第 2 轮，2026-11-19）**：现有 31 条研究资料和 20 条选择性获批项目记录，官方 ECMS/DGTR/FDI 增量更新已纳入生产版；GitHub CI、CSV 漂移检查与 Vercel Production 均成功。公开域名匿名访问及真实投稿后台仍待验收。详见 [来源与部署专项报告](docs/iterations/india-watch-official-source-refresh-2026-11-19.md)。
- **TextCompare（2026-11-19 正式 Next.js Preview 已构建）**：已纠正 Vercel 构建根目录，确认运行真实 Next.js 构建而非历史静态原型；但源码 PR #6 尚未合并、最新私有 Actions runner 无法启动，且需应用 Next.js 15.5.29 的新安全补丁。详见 [专项审计报告](docs/iterations/textcompare-nextjs-deployment-2026-11-19.md)。
- **Shanghai Map（2026-11-19 完成工程与来源审计）**：移动端与键盘交互、Leaflet SRI、OSM 瓦片政策、来源/范围透明度、故障降级及 CI 已完成；GitHub main 检查通过且 Vercel Production READY。仍需实际公网/手机验活与正式地图服务合规审查，详见 [专项审计报告](docs/iterations/shanghai-map-2026-11-19.md)。
- **重复仓库：** `historical-records` 与 `historical-records-lu26` 同时关联 `historicalRecords`。
- **名称/源码定位差异：** `salary-calculator` 关联 `myMoney`，后者 README 描述为个人记账应用。

查看 [逐项目审计报告](docs/PROJECT_AUDIT_2026-11-19.md) 阅读 51 项详细记录。

## GitHub Pages

该项目提供一个**资产审计控制台**（不是营销页面）：左侧导航 + 六个区块——资产概览 KPI、分类与证据分布、部署新鲜度、待办队列、可排序项目网格、方法与边界；表格行可打开审计抽屉，支持 CSV 导出、深链（`#projects`、`?project=<name>`）与明/暗主题。设计规范见 [docs/DESIGN_DASHBOARD_2026-11-19.md](docs/DESIGN_DASHBOARD_2026-11-19.md)。

界面由 `site/`、`data/` 构建，零框架、零第三方依赖（无外部字体/CDN/图表库），所有数字均由 `data/` 现场推导，因此不会与快照脱节。合并到 `main` 且 GitHub Pages 配置成功后，**预期地址**为：

**https://1998x-stack.github.io/vercel-projects/**

该地址必须以 Actions 部署结果为准；仓库包含代码**不等于**页面已成功上线。首次发布设置请参考 [Pages 发布指南](docs/PAGES.md)。

## 本地启动

需要 Node.js 20+：

```bash
# 质量门禁：目录/隐私边界校验 + 对比度断言 + 单测 + Pages 产物
npm run check && npm test && npm run build
python3 -m http.server 8000 --directory dist

# 渲染后可访问性/交互验证（需要本机 Chrome，会启动临时静态服务）
npm run ui:check                       # 默认 1440px、明暗两套主题
npm run ui:check -- --width 500 --height 844 --theme dark

# 把数据快照引用的 GitHub 仓库镜像到本地 repos/（该目录已被 .gitignore 忽略）
npm run clone:repos:bg                # nohup 后台运行，日志写入 logs/
npm run clone:repos -- --dry-run      # 只打印计划
```

然后打开 http://localhost:8000/ ，浏览完整控制台。无需 npm install；没有运行时第三方依赖。

## 本地仓库镜像（repos/）

`npm run clone:repos` 会按 `data/manifest.json` 的分类顺序，把 48 个被引用的 GitHub 仓库克隆到 `repos/<repo>`，并按仓库（而非按项目）去重——`historicalRecords` 同时服务两个 Vercel 项目，只应克隆一次。默认跳过 `GuHengSpeaksofGoodBooks`（约 3.5 GiB 私有课程档案，须另行授权与确认）。

**`repos/` 与 `logs/` 只存在于本地，绝不提交**（见 `.gitignore`）：私有源码与媒体素材不得进入 Public 仓库。运行结束后会写出 `repos/clone-report.json`，记录每个仓库的状态、HEAD、体积与失败原因。

## 目录结构

```text
vercel-projects/
├── README.md
├── AGENTS.md
├── data/
│   ├── manifest.json         # 分类、覆盖目标、快照时间
│   └── groups/*.json         # 8 类、51 项逐项目数据
├── site/
│   ├── index.html
│   └── assets/
│       ├── app.js            # 控制台渲染：KPI、图表、待办队列、数据网格、抽屉
│       └── styles.css        # 三层 token（原生值/语义/组件）+ 明暗主题
├── scripts/
│   ├── validate.mjs          # 数据与安全门禁
│   ├── check-contrast.mjs    # WCAG 对比度断言（明暗两套）
│   ├── build.mjs             # dist 静态构建
│   ├── clone-repos.mjs/.sh   # 本地仓库镜像（含 nohup 启动器）
│   └── ui-check.mjs          # 渲染后界面验证（无头 Chrome + 页内探针）
├── tests/
│   ├── catalog.test.mjs
│   ├── contrast.test.mjs
│   └── dashboard-ui.test.mjs
├── docs/
│   ├── PROJECT_AUDIT_2026-11-19.md
│   ├── DESIGN_DASHBOARD_2026-11-19.md
│   ├── METHODOLOGY.md
│   └── PAGES.md
└── .github/workflows/pages.yml
```

## 公开边界与后续维护

目标 GitHub 仓库是 Public。依据本次明确的公开整理请求，仓库包含**项目名称、GitHub 关联路径、可见性、高层分类、快照和风险建议**，但绝不提交私有代码、原文档、密钥、配置值、服务端日志或个人数据。Private 仓库链接在未登录或未授权时会显示 404。

建议未来逐步增强来源引用与页面健康检查，在正式启用任何定时同步前明确权限范围。所有新抓取数据都应先校验再合并，避免向 Public Pages 自动泄露新发现的私有项目。

详见 [方法论](docs/METHODOLOGY.md) 与 [AGENTS.md](AGENTS.md)。
