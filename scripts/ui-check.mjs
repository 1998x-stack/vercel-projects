#!/usr/bin/env node
/**
 * ui-check.mjs — 渲染后的界面验证（本地 Chrome 无头模式）。
 *
 * 做四件事：
 *   1. 用 Node 静态服务托管 dist/；
 *   2. 生成两份临时页面（浅色 / 深色），注入 scripts/ui-harness.js；
 *   3. 启动 Chrome 无头模式，按指定视口 dump 渲染后的 DOM；
 *   4. 解析探针报告，打印逐项结果，任何失败以非 0 退出码结束。
 *
 * 用法：node scripts/ui-check.mjs [--width 1440] [--height 1200] [--theme light|dark|both] [--chrome /path]
 * 需要先执行 npm run build（或让它自动构建）。
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist");
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const [key, ...rest] = process.argv[i].replace(/^--/, "").split("=");
  args.set(key, rest.length ? rest.join("=") : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : "true");
}
const width = Number(args.get("width") || 1440);
const height = Number(args.get("height") || 1200);
const themes = (args.get("theme") || "both") === "both" ? ["light", "dark"] : [args.get("theme")];
const chromePath = args.get("chrome") || CHROME_CANDIDATES.find((p) => existsSync(p));

if (!existsSync(join(DIST, "index.html"))) {
  console.error("缺少 dist/index.html，请先运行 npm run build");
  process.exit(2);
}
if (!chromePath) {
  console.error(`未找到 Chrome/Chromium。可用 --chrome <path> 指定。候选：\n  ${CHROME_CANDIDATES.join("\n  ")}`);
  process.exit(2);
}

/* ---------- 静态服务 ---------- */
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = join(DIST, normalize(url).replace(/^(\.\.[/\\])+/, ""));
  const target = url.endsWith("/") ? join(file, "index.html") : file;
  try {
    const body = readFileSync(target);
    res.writeHead(200, { "content-type": MIME[extname(target)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- 生成临时页面 ---------- */
const harness = readFileSync(join(ROOT, "scripts/ui-harness.js"), "utf8");
const base = readFileSync(join(DIST, "index.html"), "utf8");
const pages = [];
for (const theme of themes) {
  const name = `_verify-${theme}.html`;
  const themeBoot = theme === "dark" ? `<script>try{localStorage.setItem("atlas-theme","dark")}catch(e){}</script>` : `<script>try{localStorage.removeItem("atlas-theme")}catch(e){}</script>`;
  // 用函数式 replacer：替换字符串中的 $$ / $& / $` 等会被 String.replace 当作特殊模式处理，
  // 直接插入探针源码会破坏注入的脚本（探针里含有 $$ 选择器助手）。
  const html = base.replace("<head>", () => `<head>${themeBoot}`).replace("</body>", () => `<script type="module">${harness}</script>\n</body>`);
  writeFileSync(join(DIST, name), html);
  pages.push({ theme, name });
}

/* ---------- 运行 Chrome ---------- */
const run = (page) => new Promise((resolve, reject) => {
  const child = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${join("/tmp", `atlas-ui-check-${process.pid}-${page.theme}`)}`,
    "--virtual-time-budget=20000",
    `--window-size=${width},${height}`,
    "--dump-dom",
    `${origin}/${page.name}`,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  let err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  child.on("error", reject);
  child.on("close", (code) => { if(process.env.UI_CHECK_DEBUG) writeFileSync(`/tmp/ui-check-${page.theme}.dump.html`, out); resolve({ code, out, err }); });
});

const unescapeHtml = (s) => s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");
let failed = 0;
for (const page of pages) {
  const { out, err } = await run(page);
  const match = out.match(/<pre id="verify-report"[^>]*>([\s\S]*?)<\/pre>/);
  if (!match) {
    failed += 1;
    console.error(`\n[${page.theme} ${width}px] 未取得探针报告。Chrome 输出尾部：\n${(err || out).split("\n").slice(-12).join("\n")}`);
    continue;
  }
  const report = JSON.parse(unescapeHtml(match[1]));
  const head = `[${page.theme} ${report.viewport} theme=${report.theme}] ${report.passed}/${report.total} 通过`;
  console.log(`\n${head}`);
  for (const check of report.checks) console.log(`  ${check.pass ? "✔" : "✘"} ${check.name}${check.pass ? "" : `  → ${check.detail}`}`);
  if (report.failures.length) failed += report.failures.length;
}

for (const page of pages) {
  try { unlinkSync(join(DIST, page.name)); } catch { /* 忽略 */ }
}
server.close();
console.log(failed ? `\n界面验证 FAILED（${failed} 项）` : "\n界面验证 PASS（全部检查通过）");
process.exit(failed ? 1 : 0);
