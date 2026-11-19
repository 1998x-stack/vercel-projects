import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, "site/assets/styles.css"), "utf8");
const app = readFileSync(join(root, "site/assets/app.js"), "utf8");
const html = readFileSync(join(root, "site/index.html"), "utf8");

test("dashboard renders user data through DOM APIs only", () => {
  assert.doesNotMatch(app, /\.innerHTML\s*=/, "app.js 不得写入 innerHTML");
  assert.doesNotMatch(app, /insertAdjacentHTML|outerHTML\s*=|document\.write/);
  assert.match(app, /textContent/, "应通过 textContent 写入文本");
});

test("keyboard focus is visible and never hidden behind sticky UI", () => {
  const focusRule = css.match(/:focus-visible\s*\{([^}]*)\}/);
  assert.ok(focusRule, "缺少 :focus-visible 规则");
  const width = Number((focusRule[1].match(/outline:\s*(\d+)px/) || [])[1]);
  assert.ok(width >= 2, `焦点环宽度应 ≥2px，实际 ${width}`);
  assert.match(focusRule[1], /var\(--focus-ring\)/);
  assert.match(css, /scroll-padding-top:\s*calc\(var\(--cmd-h\)/, "滚动定位需为粘性命令栏留出空间");
  assert.match(css, /scroll-margin-top:\s*calc\(var\(--cmd-h\)/, "区块锚点需避开粘性命令栏");
  assert.match(css, /\.rail[^{]*:focus-visible[^{]*\{[^}]*--focus-rail/, "深色 rail 上的焦点环需使用浅色 token");
});

test("motion respects prefers-reduced-motion", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*transition:\s*none/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*animation:\s*none/);
});

test("theme supports system preference, manual override and first-paint boot", () => {
  assert.match(css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(html, /localStorage\.getItem\("atlas-theme"\)/, "首屏应在渲染前应用已保存的主题");
  assert.match(html, /<meta name="color-scheme" content="light dark">/);
  assert.match(app, /prefers-color-scheme: dark/);
});

test("data grid keeps table semantics and an accessible empty state", () => {
  assert.match(html, /<table class="data" id="project-table">/);
  assert.match(html, /<caption class="visually-hidden">/);
  assert.equal((html.match(/<th scope="col" data-sort=/g) || []).length, 6, "六个可排序列");
  assert.match(app, /setAttribute\("aria-sort"/);
  assert.match(html, /id="empty-results"[\s\S]*id="clear-filters"/, "空状态需提供清除筛选手动作");
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<noscript>/, "无 JavaScript 时需给出可读降级提示");
});

test("dashboard ships no third-party assets and no emoji-presentation icons", () => {
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//);
  assert.doesNotMatch(html, /fonts\.googleapis|cdn\.|unpkg|jsdelivr/);
  // Emoji_Presentation：默认以彩色 emoji 字形渲染的字符（如 🎓）。排版用箭头 ↗ / ▲ 不属此类，可保留。
  assert.doesNotMatch(html, /\p{Emoji_Presentation}/u, "结构性图标不得使用 emoji，应使用内联 SVG");
  assert.equal((html.match(/<svg /g) || []).length >= 4, true, "搜索、主题切换等结构性图标需为内联 SVG");
});

test("private source mirrors can never be committed", () => {
  const ignore = readFileSync(join(root, ".gitignore"), "utf8");
  for (const entry of ["repos/", "logs/", "dist/"]) {
    assert.ok(ignore.includes(entry), `.gitignore 必须忽略 ${entry}`);
  }
  const tracking = execSync("git ls-files repos logs", { cwd: root, encoding: "utf8" }).trim();
  assert.equal(tracking, "", `repos/ 与 logs/ 不得被 git 跟踪：${tracking}`);
});
