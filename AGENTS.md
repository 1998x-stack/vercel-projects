# AGENTS.md — Vercel Projects Atlas

## 工作目标

维护一个**可审计、可扩展、可安全公开**的 Vercel 项目资产清单和 GitHub Pages 前端。绝不将账户授权读取能力等同于所有数据的公开许可。

## 不可违反的规则

1. **以 Vercel Project 为主键**。51 个 Vercel 项目、49 条 GitHub 关联、48 个 GitHub 仓库是 2026-11-19 的历史观测值；未来应根据真实查询更新，而不是固定不变的断言。
2. **不要把最近一次部署 READY 当作生产健康**。它可能属于 Preview。Production 是否可用，需要独立检查目标、域名、HTTP 与业务功能。
3. **私有信息不进入 Public 仓库**。项目名称、GitHub 路径是当前用户明确要求公开整理的范围；私有源码、PDF、音频、API/SSH 密钥、环境变量、账号数据、构建日志与敏感标识严禁提交。新增私人项目必须重新审核公开范围。
4. **不要根据名称编造功能**。可确认的 README 和 Vercel 元数据使用证据级别 `readme`/`vercel-metadata`；缺失时写 `name-only` 并保留“待核验”。
5. **不擅自删除或合并 Vercel 项目**。一个 GitHub 仓库可能被多个 Vercel 项目使用，例如 `historicalRecords`。
6. **所有更改应可追踪**。数据快照带日期；重要结论对应源仓库、部署记录或明确的待核验限制。

## 目录契约

- `data/manifest.json` 唯一控制类别、展示顺序、覆盖目标。
- `data/groups/<category>.json` 每个项目对象包含 `name, github, category, summary, stack, risk, next, evidence, last_deployment, site_url, checked_at`。
- `docs/PROJECT_AUDIT_2026-11-19.md` 是源数据的可阅读分析快照；更新数据时也应生成相应日期报告。
- `site/` 是零框架静态浏览器界面；所有用户可控数据使用 `textContent`，不向 DOM 注入未经转义 HTML。
- `scripts/build.mjs` 将 `site/` 和 `data/` 复制到 `dist/`；禁止将仓库根目录整个发布到 Pages。

## 更新顺序

1. 确认源数据及账号授权和目标范围。
2. 核对新增/删除的 Vercel Project IDs、GitHub repo 关联、可见性与最近部署目标。
3. 为每个变化补充日期、证据级别、风险与建议；不得拷贝私有原始内容。
4. 更新 `data/manifest.json` 的 expected，确保数量核对。
5. 执行 `npm run check && npm test && npm run build`。
6. 检查 GitHub Actions 和 GitHub Pages，核对真实部署 URL；不能只凭 README 宣称上线。

## 质量优先级

P0: 数据准确性、隐私边界、Pages 可构建、重复映射不丢失。
P1: 项目分类及证据说明、具体缺陷与可执行建议。
P2: UI、筛选、响应式、键盘交互和性能。
P3: 经明确授权后再考虑自动刷新及健康检查。

如与 [docs/METHODOLOGY.md](docs/METHODOLOGY.md) 冲突，应优先遵守更严格的安全边界和证据规则。
