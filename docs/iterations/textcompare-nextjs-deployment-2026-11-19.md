# TextCompare · 真实 Next.js 部署与安全基线专项审计

**2026-11-19 | 类别：工具与效率 | 源仓：1998x-stack/TextCompare（Private）**

> **结论：** 已修正 Vercel 项目 Next.js 构建配置并取得真实的 Next.js Preview `READY` 证据；尚未合并 V1.0 RC 源码到 main，Production 仍为历史静态原型。2026-11-03 官方 Next.js 安全更新和私有仓库 GitHub Actions runner 阻断，都是必须先解决的门禁。

## 1. 实际架构与历史问题

GitHub 默认分支 `main@0eeccc6764ebb1ec6df56ea8f3043f814852e46b`。仓库根目录的 `index.html`、`script.js`、`style.css`、`index2.html` 均是保留的历史原型。**正式应用位于 `text-compare-tool/`**，是基于 Next.js、React 和 TypeScript 的本地优先文本对比工作台。

Next.js 应用包含 Myers diff、行内 grapheme 对齐、Worker 计算、虚拟滚动、Unified Patch；未合并的集成 PR #6 进一步添加 JSON/Markdown 结构化比较、严格 UTF-8 文件导入与独立评估。源码没有用于上传用户输入文本的业务 API，但此事实不表示应用完全离线。

| 证据 | 结果 |
|---|---|
| 既有 Production | `dpl_AWvCibxXsfGebW4r5JhhmwQ6zNa9`，`READY`，提交 `0eeccc67`，2026-11-03 |
| 原 PR Preview | `dpl_CBTx9WFgpVAWAZx44UQr4fcKsjXw`，`READY`，提交 `2bba6523` |
| **原 Preview 实际构建方式** | 日志显示从 Git 仓库根目录运行 `vercel build`，约 64 ms 直接输出静态结果；没有安装依赖，也没有 `next build`。它不是新的 Next.js 应用验收证据 |
| Vercel 配置调整 | 使用受权 Vercel 项目 API 将 `rootDirectory` 指向 `text-compare-tool`，`framework` 设为 `nextjs`，Node.js 22；既有 Production 未被覆盖 |
| **新 Next.js Preview** | `dpl_DcF3T91zNTwd4ELo2Votz6a1GCDW`，`READY`，`2bba6523`。构建日志验证：`pnpm install`、`next 15.5.28`、`next build`、`○ / (Static)` 与 `Build Completed ... [47s]` |
| Vercel Preview 外部网页访问/操作 | **NOT RUN**；Vercel SSO 可能阻挡匿名访问，本轮未创建任何临时可共享的认证绕过链接 |

**重要区分：** Vercel `READY` 证实完成构建和部署，不证明文件导入、浏览器 Worker、交互、匿名访问与安全响应头已经在实际公网逐项验证。

## 2. 集成 PR #6 的已有可信证据

- [PR #6](https://github.com/1998x-stack/TextCompare/pull/6)：V0.6–V1.0 RC，24 个变更文件。最后原始验收提交 `2bba65237b63df65396dcbaf411a52eae8c6288b`。
- [GitHub Actions 41590300148](https://github.com/1998x-stack/TextCompare/actions/runs/41590300148)：2026-11-03 当时 **core / web / browser-e2e / release-gate 四个 job SUCCESS**；包含 frozen pnpm install、Node tests、独立结构评估、差异 Oracle、TypeScript、ESLint、Next build、Chromium 桌面/移动 E2E 和当时的生产依赖 audit。
- 该 PR 明确定位为 `1.0.0-rc.1`，**不是正式的 v1.0.0 发布**。

## 3. 2026-11-19 复核发现的新门禁

### P0：Next.js 最新安全维护版本

2026-11-03，Next.js 官方 [v15.5.29](https://github.com/vercel/next.js/releases/tag/v15.5.29) 修复了 15.x 分支的若干安全问题，包括特殊代理转发场景的跨客户端数据混淆、图片优化 SVG 过滤，以及 Edge 路由 cookie 头部暴露。它们是否在本项目的具体路由/部署中可利用，需要独立判断；但上线前应优先采用维护版本补丁，而不是仅依据旧的 2026-11-03 audit。

PR #6 当前锁定 `next@15.5.28` 和 `eslint-config-next@15.5.28`。本轮短暂尝试将版本提高到 `15.5.29` 并通过临时只读 GitHub Workflow 生成匹配锁文件，但该 Workflow 在 **runner 分配前**失败，无法真实安装 pnpm 或生成新锁。为避免 `package.json` 与 `pnpm-lock.yaml` 错配，已通过单独回滚提交恢复完全一致的原始 Git Tree，临时 Workflow 已撤销。

**最新源仓 PR Head：** `4fbc887d3b308c87d6885804420650e32010a940`。该提交的 Git Tree 与此前四 Job 成功的 `2bba6523` **完全相同**；但 HEAD 自身新触发的 GitHub Actions 未能运行，不能冒称其新 CI 为 SUCCESS。

### P0：私有仓库 Actions runner 无法启动

| 运行 | 证据 |
|---|---|
| 历史成功 | [41590300148](https://github.com/1998x-stack/TextCompare/actions/runs/41590300148) · 四 Job 成功 |
| 本轮最新 HEAD | [44470392059](https://github.com/1998x-stack/TextCompare/actions/runs/44470392059) · Runner 未分配，`steps=[]` |
| 依赖更新尝试 | [44470302080](https://github.com/1998x-stack/TextCompare/actions/runs/44470302080) · 临时锁文件生成任务未分配 Runner |

这与本项目内其他私有仓库 `GuHengSpeaksofGoodBooks`、`energyFrontiersReport` 的 Actions 现象相似，但**没有平台官方失败注释时，不得断言一定是计费、配额或组织策略中的哪一项**。公开资产库 Actions 能正常分配 Runner，更值得检查私有仓库 Actions 额度和组织级策略。

### P1：部署一致性与浏览器验收

- Vercel 项目框架/root 修正后，**必须在后续分支构建中复查是否仍按 `text-compare-tool/` 构建**；不能仅凭先前 Preview `READY` 认定未来所有构建配置都正确。
- 新预览构建中存在 React hook `react-hooks/exhaustive-deps` 警告（effect cleanup 读取 `generation.current`），是独立 P1 质量项，未在本轮未经测试的补丁中强行修改。
- 需要真实操作 JSON/Markdown 模式、UTF-8 本地文件导入、Worker 取消/过期结果、Unified Patch、移动端横向溢出与滚动、键盘操作以及资源不上传的网络检查。
- Vercel 项目域名 `text-compare-seven.vercel.app` 已显示 verified；**没有证据证明新 Preview 已绑定到这个生产域名**。既有 Production 没有覆盖。
- Vercel Preview 的 `READY` 不会反推 Next.js 的浏览器实际表现，也不代表 v1.0.0 正式发布。

## 4. 最小后续执行与验收流程

```bash
git clone https://github.com/1998x-stack/TextCompare.git
cd TextCompare
git fetch origin
git switch feat/v0.6-v1.0-core-completion
cd text-compare-tool
corepack enable
corepack prepare pnpm@9.15.9 --activate

# 有网络的受授权环境，先补齐 2026-11-03 安全维护更新
pnpm add -E next@15.5.29
pnpm add -D -E eslint-config-next@15.5.29
# 保留并提交 pnpm-lock.yaml；必须用 frozen-lockfile 测试
pnpm install --frozen-lockfile
pnpm test:all
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
pnpm audit --prod --audit-level high
```

注意：`pnpm audit --prod` 的报告时间应与重新执行的 CI 时间对应；旧 audit 不能证明今天没有新披露的漏洞。不要通过修改测试或删除冻结锁文件标志来绕开错误。

质量门禁：Node/第三方差异评估/结构化黄金案例/Chromium E2E/依赖安全校验均通过，Vercel Preview 构建和真实浏览器操作验证通过，再 squash merge PR #6，并核对 `main` 的新 Production Deployment SHA、实际站点版本和部署安全响应头。之后更新项目资产为 `production_ready`。

## 5. 本轮实际做了什么、没做什么

**完成：** Vercel 项目 Next.js 框架与应用根目录调整、对历史 PR 的四个 CI Job 做独立核验、成功生成真正 Next.js 构建的 Preview、验证构建日志与 Git SHA、记录新的安全补丁要求和私有 GitHub runner 阻断；临时无法验证的 package 改动已恢复。

**未执行：** 源仓 PR 合并、生产发布、正式版本 Tag、外部浏览器操作、新 Next.js 补丁及冻结锁文件验证。没有解除 SSO 或生成可共享的生产访问绕过链接。
