# India Supply Chain Watch — 2026-11-19 官方资料与发布质量迭代

**审计对象**：`1998x-stack/india-supply-chain-watch` / `xiemings-projects/india-supply-chain-watch-2po3`。

## 变更与结果

| 环节 | 实际结果 |
|---|---|
| GitHub PR | [#2 已合并](https://github.com/1998x-stack/india-supply-chain-watch/pull/2) |
| main commit | `42672baa44b63138f5218afb57e9437406c16df7` |
| 主分支 GitHub Actions | [CI 全部 success](https://github.com/1998x-stack/india-supply-chain-watch/actions/runs/44457019632) |
| Vercel Production | `dpl_4k5R3MqmL8rduESvPCg2mDrjqPM3` — READY |
| 新增研究资料 | 3 条，库总量 **31** 条 |
| 新增获批项目样例 | 4 条，库总量 **20** 条（选择性，不是 118 项的完整清单） |
| 增量数据来源核验日期 | 2026-11-19 |
| 其余历史记录核验 | 保留 2026-09-24，未伪称全部复核 |
| 验收范围 | 数据测试、CSV 一致性、类型检查、Next 构建、12 路由本地 HTTP 冒烟 |
| 独立公网匿名访问 | **NOT VERIFIED** |
| 真实投稿数据库、验证码、管理员审核 | **NOT VERIFIED** |

## 一手资料核实

1. 印度 MeitY 2026-11-06 新增 ECMS 12 项申请，累计批准 118 项（预计投资 ₹77,051 crore）。资料：https://www.pib.gov.in/PressReleasePage.aspx?PRID=2333716&lang=2&reg=3
2. 印度 DGTR PCB Tools 案 06/46/2025-DGTR 官方列表公布 2026-09-25 Final Findings；**不等于**海关征税正式生效。资料：https://dgtr.gov.in/en/anti-dumping-cases/anti-dumping-investigation-concerning-imports-printed-circuit-board-tools
3. 印度工商部 2026-08-21 公布截至 8 月 20 日修订 FDI 框架下 29 项拟议投资数据，不能概括为所有投资自动获批。资料：https://www.pib.gov.in/PressReleasePage.aspx?PRID=2301992&lang=1&reg=48

## 工程问题与处理

- **P0 数据漂移**：原研究 JSON 与 CSV 需人工维护。本轮新增 `scripts/export-data.mjs`，使用 `npm run exports:write` 生成，`npm run exports:check` 在 CI 阻止漂移。
- **P1 信息新鲜度误读**：不能用整库最近的核验日期掩盖 28 条仍待复核的历史内容。首页新增单条 `checkedAt` 显示和超期计数。
- **P1 不真实测试假设**：旧测试要求最近一周必须有新闻条目，导致“无新事件”触发误报。移除该假设并保留结构/排序检查。
- **P1 政策事件状态**：研究专题更新 Final Findings、ECMS 获批数字、FDI 实施进度，避免将获批、预期和已投产混淆。
- **P1 回归证据**：新增 `tests/official-source-check.mjs`，CI 已确认通过。

## 残余风险与下一步

- **公开可达性**：现有 Vercel Deployment Protection 可影响预览/特定部署 URL，尚未完成生产主域名的匿名浏览器访问测试；不得为测试私自关闭防护。
- **投稿安全**：Vercel 存在对应环境变量的配置记录，值未读取、连通性未验证；不能以变量存在推断后台和数据库安全。投稿、审核和个人信息处理必须独立做 E2E。
- **数据缺口**：资料库 31 条并非所有产业项目实时索引；20 条项目记录不是全部 ECMS 获批清单。28 条早期资料需要独立重新核验。
- **依赖锁定**：仓库还没有经审查的 `package-lock.json`；未来在具备 npm registry 的工程环境生成锁文件并改用 `npm ci`。
- **正式征税**：PCB Tools Final Findings 已见官方页面，但具体 CBIC 征税通知及实施细节尚待查证。

**状态结论**：Production READY 与 CI success 已通过；公网端到端及投稿业务功能仍为 NOT VERIFIED。
