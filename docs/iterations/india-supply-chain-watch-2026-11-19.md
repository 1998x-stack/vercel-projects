# India Supply Chain Watch｜首轮深度工程迭代与部署审计

**日期：2026-11-19** · 分类：研究情报与地图 · 审计结论：**生产构建 READY，核心公开功能 CI 冒烟通过；公网 HTTP 与真实数据库验收未完成。**

## 1. 资产与交付入口

| 项 | 证据 |
|---|---|
| GitHub 仓库 | https://github.com/1998x-stack/india-supply-chain-watch |
| PR | https://github.com/1998x-stack/india-supply-chain-watch/pull/1 （MERGED） |
| 主分支提交 | `a57a3f5cc0030e49f6658a7e48bd66f62f0d48c5` |
| GitHub 主分支 CI | https://github.com/1998x-stack/india-supply-chain-watch/actions/runs/44455427438 （success） |
| Vercel 项目 | https://vercel.com/xiemings-projects/india-supply-chain-watch-2po3 |
| Production Deployment | `dpl_CSRTrMDTpsqZrAbpF9WjbUVmQgcf`，`READY` |
| 已验证域名绑定 | `india-supply-chain-watch-2po3.vercel.app`（Vercel Domain verified） |
| 研究资料最后核验 | `2026-09-24`，**不是**本次代码部署日期 |

**证据界限：** Vercel 的 Production READY 和域名 verified 不等同于匿名用户可访问。当前运行环境对该域名的外部 HTTP 请求受限，未能独立证明公网响应与实际交互；更未证明管理员登录、PostgreSQL、Turnstile 与投稿审核已上线。

## 2. 修复与工程增强

### P0｜公开内容与隐私边界

- 公开 `/submissions` 原先读取并渲染审核台的 `editorNote`。现在已从公开查询选取及页面渲染中去除，避免内部工作备注意外泄漏。公开展示仅使用审核后的 `publicTitle`、`publicBody` 等字段。
- 新增静态测试，阻止未来代码重新在公开页面读取 `editorNote`。
- 投稿入口保持**未满足完整配置即关闭**，不会因部署成功就自动开放数据库写入。

### P0｜部署可验证性

- 新增 `GET /api/health`：只返回公开内容站运行探针、研究快照日期和条目计数，响应 `no-store`，明确 `dependenciesChecked=false`。不读取或泄露数据库连接串、管理密码与敏感日志。
- CI 在生产 `next build` 之后启动真实 Next.js Server，通过 12 条 GET HTTP 检查覆盖首页、情报、项目、专题、来源、投稿只读页面、sitemap、robots、健康接口及未授权管理员 API 401。
- Pin GitHub Actions checkout/setup-node 的已知 revision，限制 CI `contents: read`，支持主分支、PR 和手动触发。
- GitHub PR 与主分支 Actions 均成功；Vercel Preview 与 Production 都出现相应的 READY 部署。

### P1｜研究内容与 SEO

- 页面超过 30 天没有新的研究来源核验时展示醒目的**资料陈旧提醒**，避免将 2026-09-24 静态资料误认为 2026-11-19 的实时情报。
- 调整内容日期校验：改用当前 UTC 日期，而不是冻结在 2026-09-24；核对事件/发布/核验的时间顺序。
- 修正情报 sitemap 的 `lastModified`：依据最后来源核验日期 `checkedAt`，而非原始事件日期。
- 生产站点 canonical URL 优先采用配置的 `NEXT_PUBLIC_SITE_URL` 或 Vercel 稳定 Production Domain，不优先使用每次变化的 Preview URL。
- 重写过时的 `DEPLOY.md`，并增加 `docs/PRODUCTION_RUNBOOK.md`，区分已发布、已构建与未验证的运营能力。

## 3. 本轮实际验收

| 层级 | 验收 | 结果 |
|---|---|---|
| GitHub 合并 | PR #1 merged into main | PASS |
| 代码质量 | 数据测试、类型检查与安全边界静态检查 | PASS |
| 本地端到端 | Next Server + 12 路由 GET 冒烟 | PASS（GitHub CI） |
| Vercel Preview | 最终 PR SHA 的 Preview READY | PASS |
| Vercel Production | `a57a3f5...` 对应部署 READY | PASS |
| 域名绑定 | Vercel 项目 verified | PASS |
| Vercel runtime | 近 24 小时 Runtime Errors 查询未报告错误 | 观察到 0 项，**不等于**可用性证明 |
| 生产匿名访问 | 外部 HTTP、重定向、TLS、真实界面操作 | NOT VERIFIED |
| 业务依赖 | 数据库、投稿、验证码、后台登录/审核 | NOT VERIFIED |

## 4. 剩余风险与下一轮建议

1. **生产 HTTP 验活：** 在网络可达的客户端对 `/`、`/insights`、`/projects`、`/sources`、`/api/health` 和无登录权限边界进行 GET 只读检测，特别确认 Vercel Deployment Protection 对匿名用户的实际影响；不得为迎合测试而关闭访问保护。
2. **内容新鲜度：** 批量回访 28 条原始研究记录和 16 个获批项目；核查 2026-09-24 之后的变更并记录最新来源，不要用构建日期代替资料核验日期。
3. **依赖可复现：** 当前仓库没有正式锁定的 npm lockfile，CI 使用 `npm install`，下一轮应审查锁定依赖后改成 `npm ci`。
4. **投稿上线：** 仍需确认数据库 Schema Migration、备份、WAF/分布式限流、审核员安全、个人信息处理和更正/撤稿流程；保留当前 fail-closed 模式直到业务验收。
5. **自动监测：** 经明确授权后可在资产目录添加定期只读 HTTP 健康检查和资料更新时间审计，避免静态 READY 快照长期不更新。

## 5. 未做的事项

本轮没有改动另外两个研究情报与地图项目（`shanghai_map`、`energyFrontiersReport`），没有迁移或开启生产数据库、没有提交任何秘密、没有自动发布新研究事实、没有修改 Vercel SSO 或域名权限。
