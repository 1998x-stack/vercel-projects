# 顾衡说好书：音频知识管线与 Vercel 工程审计

**日期：2026-11-19** · **分类：媒体与知识资源** · **结论：源码安全优化已提交 PR，测试执行环境阻断，未合并，未更新 Production。**

## 1. 实际资产与应用结构

GitHub Private 仓库 `1998x-stack/GuHengSpeaksofGoodBooks`：53 个课程系列、273 个 MP3、274 个 HTML，约 3.545 GiB。仓库包含静态播放器，以及 Python 3.10+ / SQLite FTS5 / faster-whisper / OpenAI-compatible LLM API 的离线优先知识管线，支持目录配对、HTML 提取、本地转写、带证据 ID 的文章草稿和问答。**代码功能存在不等于已完成 273 条全量转写。**

| 项目 | 可验证证据 |
|---|---|
| GitHub 生产基线 | `main@34d910161a0aad1d70489be0dc350d39ebc10abb` |
| 既有 Vercel Production | `dpl_HA8DqQXMDbUbeYHSva5YoZuR7vFp`，`READY` |
| 本轮源码 PR | [#2（OPEN）](https://github.com/1998x-stack/GuHengSpeaksofGoodBooks/pull/2) |
| 本轮源分支 SHA | `309b6581350ef2a350da5ab2df887b4c03716fff` |
| GitHub Actions | [Run 44469197348](https://github.com/1998x-stack/GuHengSpeaksofGoodBooks/actions/runs/44469197348)：失败、无 runner、`steps=[]` |
| 最终提交 Vercel Preview | NOT CONFIRMED |
| 源码合并/新生产部署 | NOT DONE |
| 所有音频真实转写与知识产物 | NOT RUN / NOT VERIFIED |
| 课程复制及网上传播许可 | NOT VERIFIED |

## 2. 当前修复范围

1. **P0 文件读取边界：** 源码先前的 `load_html` 使用 `safe_media_path`，但 `run_asr` 直接使用数据库中的相对路径拼接本地文件；一旦 SQLite 清单被污染或有越界符号链接，可导致读取 `courses/` 外部文件。PR 对两条管线统一绝对路径、`..`、反斜线与 symlink 实际路径检查，异常按单项失败记录，加入恶意资产路径回归测试。
2. **P1 CI 带宽：** 老工作流 `checkout@v4` 默认可能拉取大体积课程。新流程使用 blobless + sparse-checkout，仅读源码、`catalog` 快照和测试，不下载 3.545 GiB 原始文件。只扫描已提交索引，不能替代音频解码实测。
3. **P1 前端学习体验：** 53 系列跨系列标题/系列名搜索；分类选择使用可聚焦按钮，手机抽屉支持 Escape、遮罩关闭和 ARIA 状态。
4. **P1 浏览器资源路径：** 课程媒体链接限定在同源 `courses/<series>/<filename>.html|mp3`，拒绝目录越界与其他协议，使用 URL 路径分段编码。

未修改原始课程文件、未提交新文章/转写、未读取或修改密钥、未触发付费模型处理。

## 3. 未解决发布门禁

GitHub Actions 在本次 PR 和此前 main 提交上均出现 Job 在分配 runner 前失败（runner 名为空，0 个执行步骤）。**无法从现有证据证明是 YAML 错误、账单故障或 runner 配额，原因未确证。** 即使后续 Vercel Preview 返回 READY，也不等于安全回归已经真实执行。

推荐在 GitHub Actions 页面检查 Job 的顶部注释，以及账号 Billing/Actions 限制和仓库 Actions 权限；同时在授权的本地 Python/Node 环境运行：

```bash
git switch fix/knowledge-paths-ci-mobile-20261119
python -m pip install -e ".[html,dev]"
python -m pytest -q
python -m knowledge.cli audit
python -m knowledge.cli --db workspace/test.sqlite import
node --check scripts.js
node --test tests/browser-static.test.mjs
```

确认安全回归测试均通过后再决定合并，生产构建应核对 Git commit SHA 与 Vercel Deployment ID 一致。

## 4. 私有素材与访问控制

Vercel 项目目前 `ssoProtection.enabled=true`，作用域 `prod_deployment_urls_and_all_previews`，这不代表固定 Production 域名一定需要身份验证。根据 [Vercel 2026-09-09 官方公告](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)，All Deployments 范围现可在各计划启用，且会改变访客访问方式。**未经授权不擅自改变其现有生产鉴权行为**。

私人学习持有副本不必然意味着可以向公众提供课程全文和 MP3 网络传播；应核对相关权利人与许可条款。当前 Public 项目资产库只发布项目结构、数量、风险和 PR/CI/部署链接，未复制私有课件正文、录音或私有源码。

## 5. 后续验收

P0：先补齐可运行 CI、路径越界回归及私有资料传播授权/生产访问保护决定；P1：执行本地真实 HTML 提取与少量 ASR，记录耗时、错误、证据追踪结果，并测试移动 Safari/桌面浏览器的搜索与播放。之后再考虑合并、生产部署和自动化知识写作批处理。
