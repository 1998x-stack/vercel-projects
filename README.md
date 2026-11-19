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
| 媒体与知识资源 | 8 | 书籍音频、TED、期刊、知识档案 |
| 研究情报与地图 | 3 | 印度供应链、能源研究、上海地图 |

全部项目均有一条机器可读记录，包含：GitHub 关联、公开/私有标识、分类、业务定位、技术证据、最近部署、风险和下一步建议。证据薄弱的项目一律标记为**名称级推断/待核验**。

### 重点发现

- **MBTI**：构建输出目录 `dist/` 与 Vercel 原配置 `public/` 不匹配；已修复配置，仍需确认生产发布。
- **Shanghai School**：HTML/JS 静态站点，旧生产构建失败；后续应复核 2024 年历史学校数据和在线访问。
- **Emotional Expert**：历史生产部署出现 BLOCKED，不能因新预览构建 READY 就判定生产恢复。
- **Theory of Evolution**：GitHub 当前只有占位 README；缺少实际站点内容，最近部署仍 BLOCKED。
- **India Supply Chain Watch（2026-11-19 已完成首轮工程迭代）**：GitHub PR 已合并，Next.js 生产构建及 12 条本地 HTTP 冒烟测试通过；Vercel Production 新部署 `READY`。已增加资料时效提示、健康接口、隐私保护和部署手册，公网 HTTP 与投稿数据库尚待独立验收。详见 [专项优化报告](docs/iterations/india-supply-chain-watch-2026-11-19.md)。
- **重复仓库：** `historical-records` 与 `historical-records-lu26` 同时关联 `historicalRecords`。
- **名称/源码定位差异：** `salary-calculator` 关联 `myMoney`，后者 README 描述为个人记账应用。

查看 [逐项目审计报告](docs/PROJECT_AUDIT_2026-11-19.md) 阅读 51 项详细记录。

## GitHub Pages

该项目提供可搜索、按分类/状态/可见性筛选的响应式管理界面；点击任意项目可展开“证据、风险、建议、GitHub 和 Vercel 链接”，还支持 CSV 下载。

网站由 `site/`、`data/` 构建，不包含服务器端功能或第三方依赖。合并到 `main` 且 GitHub Pages 配置成功后，**预期地址**为：

**https://1998x-stack.github.io/vercel-projects/**

该地址必须以 Actions 部署结果为准；仓库包含代码**不等于**页面已成功上线。首次发布设置请参考 [Pages 发布指南](docs/PAGES.md)。

## 本地启动

需要 Node.js 20+：

```bash
git clone https://github.com/1998x-stack/vercel-projects.git
cd vercel-projects
npm run check
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

然后打开 http://localhost:8000/ ，浏览完整站点。无需 npm install；没有运行时第三方依赖。

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
│       ├── app.js            # 搜索、筛选、详情、CSV
│       └── styles.css        # 响应式 UI
├── scripts/
│   ├── validate.mjs          # 数据与安全门禁
│   └── build.mjs             # dist 静态构建
├── tests/catalog.test.mjs
├── docs/
│   ├── PROJECT_AUDIT_2026-11-19.md
│   ├── METHODOLOGY.md
│   └── PAGES.md
└── .github/workflows/pages.yml
```

## 公开边界与后续维护

目标 GitHub 仓库是 Public。依据本次明确的公开整理请求，仓库包含**项目名称、GitHub 关联路径、可见性、高层分类、快照和风险建议**，但绝不提交私有代码、原文档、密钥、配置值、服务端日志或个人数据。Private 仓库链接在未登录或未授权时会显示 404。

建议未来逐步增强来源引用与页面健康检查，在正式启用任何定时同步前明确权限范围。所有新抓取数据都应先校验再合并，避免向 Public Pages 自动泄露新发现的私有项目。

详见 [方法论](docs/METHODOLOGY.md) 与 [AGENTS.md](AGENTS.md)。
