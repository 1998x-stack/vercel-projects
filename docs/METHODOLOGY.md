# 项目目录方法论与安全边界

## 1. 范围

- 数据源：已连接的 **Vercel xiemings-projects** 团队项目与 GitHub 账号下的关联仓库。
- 观测日期：**2026-11-19**。这是时间点快照，并非实时监控或生产健康证明。
- 口径：以 Vercel Project ID 为独立项目；同一 GitHub Repository 可能服务多个 Vercel 项目。必须同时保留“部署项目数”“GitHub 关联数”“去重仓库数”。
- 资产统计：51 Vercel 项目、49 GitHub 关联、48 去重 GitHub 仓库（40 私有 / 8 公开）、2 个未关联仓库的 Vercel 项目。

## 2. 数据结构

- `data/manifest.json`：快照元信息、分类体系和核对目标。
- `data/groups/*.json`：8 个分类，每个项目仅包含名称、GitHub 链接与可见性、高层摘要、技术证据、问题和下一步、最近一次部署快照。
- `site/`：纯静态浏览器界面，由构建脚本组合数据生成 `dist/`。
- `docs/PROJECT_AUDIT_2026-11-19.md`：各项目逐项分析 Markdown。
- 同一个 GitHub 仓库重复关联多个 Vercel Project 时保持两个项目，不自动合并。例如 `historical-records` 与 `historical-records-lu26`。

## 3. 证据等级

| evidence | 定义 | 可以说明什么 |
|---|---|---|
| `readme` | 连接账号读取了仓库 README，并提取了公开可概括事实 | README 文档描述过这些功能；不等于经过完整代码或线上验证 |
| `vercel-metadata` | 连接账号读取了 Vercel Git 关联、分支或构建元数据 | 真实部署与来源存在；不等于应用核心功能完整 |
| `source-inspection` | 经授权连接直接读取源文件、Git Tree 与路径元数据 | 可以说明被核验时的代码/资产结构，但不证明版权授权、生产访问或 E2E 通过 |
| `name-only` | 缺少充分的仓库文档，只能以名称初步归类 | **只可做待核验的分类假设**，不承诺功能或技术栈 |
| `vercel-only` | 只有 Vercel Project，没有 GitHub 连接 | 项目存在，但代码来源、构建方式与用途都需要查证 |

## 4. 部署状态与验收等级

`last_deployment` 来源于 Vercel 项目的**最新一次部署**，可能是 Production、Preview 或目标未指定的部署记录：

- `READY`：构建与平台部署完成。**不代表**生产域名可达、页面无错误、登录可用。
- `ERROR`：构建或部署失败，必须读取构建日志定位原因。
- `BLOCKED`：平台拒绝或阻止该次部署；没有错误代码时不得推断为配额、权限或代码故障。
- `QUEUED` / `BUILDING` / `INITIALIZING`：尚未完成部署的过程态，不视为成功。
- `CANCELED`：取消，不等于构建失败。
- `NONE`：未观察到部署记录，不等于仓库不存在。
- `target=preview/unspecified`：表示项目详情没有返回明确目标；**不**证明一定是 Preview。

建议以三级验收评估生产项目：

1. **构建验收：** 目标 commit 与预期分支一致，Production `READY`。
2. **连通验收：** 已验证域名、HTTP/HTTPS 响应、证书与资源加载。
3. **业务验收：** 核心流程、权限控制、错误日志、关键交互与隐私检查均通过。

本站当前仅包含第一级的部分证据，未完成对所有项目的连通和业务验收。

## 5. 安全及公开范围

目标仓库是 **Public**。用户明确指定将这批已列出的 Vercel 项目及其 GitHub 关联关系整理成公开仓库，所以可以公布**项目名称、仓库路径、可见性、分类、粗粒度总结和部署状态**。Private 仓库源码与私有文档**不**作为本站发布输入，外部访客点击其 GitHub URL 可能得到 404。

严禁提交或展示：

- Vercel / GitHub API token、OAuth 凭据、密码、cookie、`.env` 内容、连接串和应用私钥；
- 私有仓库源代码、未授权全文、音视频原始文件或敏感 PDF；
- 未经确认的生产错误堆栈、请求 payload、用户资料、内部账户标识；
- 未经来源验证的“站点正常运行”“当前最新”等断言。

以后新增未被用户明确授权公开的私有项目，应先审查是否可以出现在 Public 目录；不应因为账号可读而自动公布。无需将敏感诊断数据同步到 Pages。

## 6. 分类依据

分类面向**网站主要用途**，不是技术框架：效率工具、教育职业、商业产业、金融政策、社会法律、历史文化、媒体知识、研究地图。一个项目只分配一个主类；版本差异、重复 GitHub 绑定、状态异常在风险字段说明，而不是强行去重。分类需允许根据新的源码证据重新评审。

## 7. 手工更新与质量门禁

本项目暂未使用长期 Vercel 凭据或无人值守账号同步；本次快照来自 ChatGPT 连接的 Vercel / GitHub 读取结果。需要重新审计时，更新各 JSON 的证据、日期和最新部署后运行：

```bash
npm run check
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

`scripts/validate.mjs` 检查必填字段、项目唯一性、分类、来源范围、去重仓库数、可见性及明显密钥风险。任何数量变化必须先更新 `data/manifest.json` 的预期统计；不得为使测试通过而无依据地删除项目。

## 8. 优先审查的问题

1. `MBTI` 曾构建到 `dist/`，但 Vercel 默认寻找 `public/`；修正构建配置后仍需验证 Production。
2. `shanghai-school` 和 `emotional-expert` 有历史生产故障或阻止记录；最新 Preview READY 不自动意味着生产恢复。
3. `theory-of-evolution` 的 README 明确只有占位，站点源码尚缺。
4. `india-supply-chain-watch-2po3` 的公开资讯功能与有数据库/验证码依赖的投稿功能需要分开验收。
5. `salary-calculator` 映射 `myMoney`，项目名与 README 中个人记账功能不一致。
6. `historical-records` 与 `historical-records-lu26` 关联同一 GitHub 仓库，需确认是否双域名或历史版本。

## 9. 对项目描述的修订规则

每项修订应说明证据来源（README 路径、代码文件、部署 ID 或生产 HTTP 测试的日期）、结论可信度与剩余不确定性。不得将产品愿景、README 宣传语或项目名转换为已验证部署功能。
