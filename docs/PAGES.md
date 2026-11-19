# GitHub Pages 发布与故障排除

## 部署体系

Pages 是此仓库的**静态只读资产浏览器**，无数据库、用户登录或后台 API。

```text
data/manifest.json + data/groups/*.json + site/
                   │
        npm run check / npm test
                   │
           node scripts/build.mjs
                   │
           dist/（静态发布文件）
                   │
      actions/upload-pages-artifact
                   │
         actions/deploy-pages
```

## 首次启用

1. 进入 [仓库设置](https://github.com/1998x-stack/vercel-projects/settings/pages)。
2. 选择 **Build and deployment → Source → GitHub Actions**。
3. 将本仓库更改合并到 `main` 后，在 [Actions](https://github.com/1998x-stack/vercel-projects/actions/workflows/pages.yml) 查看 `Validate and Publish Atlas`。
4. 确认 `validate`、`deploy` 全部成功；以 GitHub 在部署记录中返回的 URL 为正式地址。默认预期路径为 `https://1998x-stack.github.io/vercel-projects/`，**不能在验证前宣称已上线**。

若失败，请先查看具体 workflow job 日志。项目是否有 Pages 使用权限、环境保护设置及 Actions 配额由 GitHub 账户策略决定；`README` 中的 URL 仅是预期值。

## 本地预览

需要 Node.js 20+，无第三方依赖：

```bash
npm run check
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

在 `http://localhost:8000/` 打开，检查分类搜索、详情面板、状态筛选、CSV 导出和移动布局。不要仅打开 `site/index.html`，因为发布依赖在构建期将根目录 `data/` 复制进 `dist/data/`。

## 状态说明

数据不会每次打开页面都访问 Vercel API。页面只读取仓库内带日期的 JSON。显示的是**历史观测快照**；如需新状态，请经有权限的连接重新采样、核查并更新仓库。

## 排障

- 页面显示“加载项目数据失败”：检查 workflow 是否上传了 `dist/data/manifest.json` 和八个 `groups/*.json` 文件。
- 页面能打开但 CSS 不显示：确保部署的是 `dist/` 根目录，所有资源地址以 `./assets/` 开头。
- GitHub Pages 返回 404：核查 Settings → Pages Source 是否为 GitHub Actions、Actions 是否成功、访问的路径是否包含 `/vercel-projects/`。
- GitHub 私有仓库链接显示 404：访问者无权读取 Private 仓库，不是本站错误。
- 网站状态显示 READY 但源网站不可访问：READY 不是端到端健康测试；前往 Vercel 检查访问保护、域名与日志。
