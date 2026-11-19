# Energy Frontiers Report · 2026-11-19 源码审计与阻断记录

> **结论：项目实际是历史能源课程 HTML/MP3 档案，不是实时能源行业情报。源仓代码优化 PR 已提交，Vercel Preview READY；GitHub Actions 私有仓库 runner 未启动，所以代码不能标为已通过完整测试或已发布生产。**

## 1. 仓库与部署证据

| 项目 | 已观察证据 |
|---|---|
| 源仓 | `1998x-stack/energyFrontiersReport`（Private） |
| 原主分支 | `10015c9cc7f85ac88fd5eb7926d8a74d315aeb1d` |
| 仓库目录 | 六系列、28 HTML 课件、22 MP3，6 条历史月报没有 MP3 |
| 媒体总量 | HTML 350,131,773 B + MP3 144,373,172 B = 494,504,945 B，约 472 MiB |
| Vercel 项目 | `xiemings-projects/energy-frontiers-report` |
| 旧 Production | `dpl_GDdab4V3ZmLgTD9AScvuWgfktevK`，`READY`，2025-06-12 |
| 源仓优化 PR | https://github.com/1998x-stack/energyFrontiersReport/pull/1 （**OPEN / NOT MERGED**） |
| 最终 PR SHA | `f4324f66feea74037d4f3d7c9adc9d9d6cb59c3a` |
| Vercel Preview | `dpl_8fpacUJ8Jqrgi4pd3ENSTBbZDash`，`READY`，属于 PR 分支 |
| Actions | https://github.com/1998x-stack/energyFrontiersReport/actions/runs/44467340125 （两次尝试均在 runner 分配前失败） |
| 生产内容公网/音频 | **NOT VERIFIED** |
| 课件复制与网络传播授权 | **NOT VERIFIED** |

## 2. 真实代码问题

| 级别 | 证据 | PR 中的修复 |
|---|---|---|
| P0 | 前端将课程标题/URL 拼成 `innerHTML` 和内联事件处理器 | 采用 `createElement` / `textContent` 与同源资源路径白名单 |
| P0 | Private GitHub 仓库不代表 Vercel 固定 Production 域名私有；课程可能属于第三方权利人 | 保持现有权限不擅自变更；在 README 与 Runbook 明确版权/访问门禁 |
| P1 | 原 UI 写死 53、249、168，但真实数据为 6、28、22 | 按目录计算统计，取消无证据的总时长数字 |
| P1 | 下一首按钮实际绑定到了上一首 | 为 22 条具备 MP3 的记录独立实现上/下一首与状态处理 |
| P1 | 6 条缺音频的课程仍可渲染错误的播放路径 | 无音频禁用按钮；拒绝 `javascript:` 和越权相对路径 |
| P1 | 音频播放忽略浏览器拒绝（Promise reject），媒体时长统一虚构 10:00 | 播放错误提示、媒体事件同步时长、进度、音量 |
| P1 | 移动端菜单与搜索未接通 | 修复移动端抽屉与课程标题/分类搜索 |
| P1 | `convert.py` 日期由生成时自动写入，时长固定、相对路径随 shell 工作目录变化 | 未核验日期/时长留空、稳定路径、确定性输出与 Python 测试 |
| P1 | 没有 CI，不存在自动化项目质量门禁 | 加入 GitHub Actions、Node DOM/Player tests、Python tests、6 路由静态冒烟 |
| P1 | 仓库大量媒体约 472 MiB，会增加 Git clone 和 CI 时间 | CI 使用 Blobless Sparse Checkout + Git Tree 核对资源，不下载内容 |

## 3. 当前阻断：GitHub Actions

GitHub Actions Run `44467340125` 首轮失败后已重试一次。两个 Job 都没有分配 runner（`runner_id=0`、空 `runner_name`、`steps=[]`），运行约 2 秒即失败。日志下载返回 GitHub/Azure 的 BlobNotFound，**没有代码层面的失败堆栈可供分析**。

这一现象可能由 GitHub 账户 Actions 配额/账单、私有仓库权限、Runner 分配或平台问题引起，**尚未取得 GitHub annotation 的明确原因**，不应确定地归咎于账单或 YAML。按 [GitHub 官方工作流排障文档](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)，应在仓库 Actions 与账号计费/额度中查看错误提示；必要时联系 GitHub 支持。因为 CI 未执行，本轮**不自动合并源仓 PR**，不把 Preview READY 当成生产部署验收。

远程桌面设备当前均离线，未能在用户授权本地机器执行 `npm run check`、Python 生成器测试或浏览器端到端验收。源仓 PR 包含本地运行步骤，可由 Pi/Codex 继续验证。

## 4. 版权及公开访问风险

源码是 Private，但旧 Vercel 配置的 `ssoProtection` 作用域是 `prod_deployment_urls_and_all_previews`，无法证明固定生产域名已经限制匿名访问。**保留代码与课程媒体不意味着取得了公开传播许可。**

本次 Public 资产库只发布项目名称、媒体数量、工具/部署证据和风险，**没有上传 HTML 原文、MP3、私有源代码或凭据**。在权利持有人确认可分发前，应考虑将正式站点保持身份保护或不公开资源直链；在未经用户批准的情况下不改变网站现有访问模式。

## 5. 工程依据与验收

- [OWASP DOM XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet)
- [MDN HTMLMediaElement.play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)
- [Vercel Limits](https://vercel.com/docs/limits)（CLI 文件上传限制不能直接套用 Git 集成，实际部署按日志核查）
- [Vercel Production Deployment Protection 更新](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)
- [GitHub Troubleshooting Workflows](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)

待执行命令：

```bash
npm run check
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 -m http.server 8777 --bind 127.0.0.1
# 第二终端
SMOKE_BASE_URL=http://127.0.0.1:8777 npm run smoke
```

**后续通过标准**：源 PR 上的 Node/Python/smoke 全绿（或等价且可复核的可信执行证据）、最终 SHA Preview READY、课程授权与生产访问边界确认；然后合并并核对新 Production 的最终 SHA 和状态，才能把资产库标注为已发布。
