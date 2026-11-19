# Shanghai Map · 2026-11-19 GitHub/Vercel 工程迭代审计

> **类别**：研究情报与地图 · 项目：`1998x-stack/shanghai_map` · Vercel：`xiemings-projects/shanghai-map`

## 1. 实际交付与验证

| 项目 | 结果 |
|---|---|
| GitHub 主仓 | https://github.com/1998x-stack/shanghai_map |
| 工程 PR | [#1 MERGED](https://github.com/1998x-stack/shanghai_map/pull/1) |
| main commit | `0185bda4bfd76e0876972f1cdcd7cb5fa6ebd4a5` |
| GitHub PR CI | [PASS](https://github.com/1998x-stack/shanghai_map/actions/runs/44463214233) |
| GitHub main CI | [PASS](https://github.com/1998x-stack/shanghai_map/actions/runs/44463350046) |
| Vercel Production | `dpl_FBRW4wjX3PkQAdaaTvhwXKhUYa6F` · `READY` |
| Production domain | `shanghai-map.vercel.app`，Vercel 域名列表显示 verified |
| 静态冒烟 | Node 行为测试 + 本地 5 条静态 HTTP 路由 PASS（CI） |
| 生产匿名公网 HTTP | NOT VERIFIED；外部访问工具未能获取成功的响应 |
| 真实移动端浏览器/视觉 E2E | NOT RUN |
| OSM 图块跨地域可用性 | NOT VERIFIED；公共服务无 SLA |
| 中国境内公开/商用地图资质 | NOT VERIFIED；应单独履行地图管理相关审核 |

## 2. 审计基础事实

变更前的仓库只有四个文件，使用 Leaflet 1.9.4、旧 OSM 分片瓦片 URL、无来源人口数字及只响应自定义按钮的缩放读数。没有 GitHub CI、版本化 Vercel 安全头或单元测试。

本轮修改后：

- **数据来源**：移除无来源的 `Population: 26.32 million`；说明 `[31.2304,121.4737]` 仅为城市浏览参考中心；全市参考范围采自上海市政府公布的纬度 30°40′–31°53′、经度 120°51′–122°12′，通过 `fitBounds` 定位，不绘制伪造行政区界。
- **OSM 瓦片政策**：修改为 `https://tile.openstreetmap.org/{z}/{x}/{y}.png`；显示 © OpenStreetMap 署名；不加批量预取/离线导出；沿用正常浏览器缓存，Vercel 使用 `strict-origin-when-cross-origin` 保留第三方瓦片需要的来源域名。
- **前端稳定性**：使用官方 Leaflet SRI 校验；地图瓦片出错时显示 warning；Leaflet 库无法加载时提供天地图·上海服务链接。
- **交互与移动端**：采用侧栏+地图布局，移动端优先地图展示；统一监听 `moveend zoomend` 同步读数，支持键盘、滚轮、触屏及按钮交互；加上可访问性标识和减少动画选项。
- **工程与运维**：新增 `vercel.json` 安全响应头；`health.json` 只表示静态文件可读，不宣称瓦片已验活；新增 Node 模拟地图行为测试和 GitHub CI 的本地 HTTP 冒烟测试。
- **文档**：主仓提供 `docs/AUDIT_2026-11-19.md` 和 `docs/DEPLOYMENT.md`，说明数据许可、证据限制及回滚路径。

## 3. 原始证据与许可边界

- [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)：官方 URL、署名、浏览器 Referer、缓存、不得预取或批量下载地图瓦片。
- [Leaflet 1.9.4 Quick Start](https://leafletjs.com/examples-v1/quick-start/)：官方 JS/CSS 版本与 SRI。
- [上海市政府地理概况（2025-09-10 更新）](https://english.shanghai.gov.cn/en-Overview/20231209/705180b43f794c1ca43f4d1ddaa049a2.html)：范围是参考经纬度范围，而不是法定地图行政边界。
- [天地图·上海](https://shanghai.tianditu.gov.cn/)：上海市规划和自然资源局支持的官方地理信息服务门户；本项目只是链接其服务，没有假设免费授权 API 或冒用审图号。
- [上海市地图管理办法](https://www.shanghai.gov.cn/xxzfgzwj/20210713/0fbc6abe525e458eaa4cf8b921cc0767.html) 与 [上海市规划资源局地图使用指引](https://ghzyj.sh.gov.cn/hyxw/20200902/a64446b1893947efb244bf9ff01bb0e2.html)：正式境内发布服务需核对地图审核、地理信息安全、服务主体与相关资质。

## 4. 工程策略和剩余风险

1. **不能仅凭 Vercel READY 认定浏览器正常**：当前只证实代码构建与产物发布；需要公网浏览器检查主域名、第三方脚本与瓦片、手机小屏阅读和 Map attribution 的实际可见性。
2. **外部服务风险**：OSM 公共瓦片不保证 SLA；不得通过自动冒烟脚本批量请求 OSM。业务化需选择符合授权和服务条款的瓦片提供方。
3. **境内合规风险**：本项目保留“地图技术演示”的定位，不能把其对外链接及当前部署混为商用地图审核通过。使用中国境内生产数据/行政界线前须先做独立合规审查，不伪造审图号。
4. **真正交互验收缺口**：Node 模拟的 zoom/move 事件检查并不代替真实 Leaflet UI 的移动端端到端测试；建议下一轮使用受控测试底图而不是高频访问 OSM。
5. **生产发布门禁**：Vercel Git 集成会对 main 独立构建；当前 CI 通过不证明配置了 Vercel Deployment Checks 或 GitHub 分支保护，因此继续明确记录部署与 CI 是否对应最终 SHA。

## 5. 下一轮建议

只围绕业务价值补齐**外部匿名 HTTP + 真机触控验收**与**境内地图合规/底图服务评估**。在能独立验证地图服务数据授权之前，暂不扩展 POI 搜索、边界绘制或地理位置上传功能。
