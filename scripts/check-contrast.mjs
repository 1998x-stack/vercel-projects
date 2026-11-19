#!/usr/bin/env node
/**
 * check-contrast.mjs — 对 Dashboard 的语义 token 做 WCAG 2.1 对比度断言。
 *
 * 依据：docs/DESIGN_DASHBOARD_2026-11-19.md §6
 *   - 文字类（正文/次要/状态 chip）≥ 4.5:1
 *   - 非文字类（焦点环、输入边框、图表主色）≥ 3:1
 *   - 浅色与深色两套主题都必须通过，且深色的「跟随系统」与「手动切换」两份 token 必须一致
 *
 * 与 ui-ux-pro-max 的 `color accessible pairs` 检索（返回 0 结果）不同，这里不采用通用默认值，
 * 而是按 WCAG 相对亮度公式对本仓库真实 token 计算，可复现、可回归。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CSS_PATH = join(ROOT, "site/assets/styles.css");

export function hexToRgb(value) {
  let hex = String(value).trim().replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function relativeLuminance(value) {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a, b) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  if (x === null || y === null) return null;
  const [hi, lo] = x >= y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

const block = (css, pattern) => {
  const match = css.replace(/\/\*[\s\S]*?\*\//g, "").match(pattern);
  return match ? match[1] : "";
};
const declarations = (body) => {
  const map = new Map();
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    map.set(match[1], match[2].trim());
  }
  return map;
};
function resolver(map) {
  const resolve = (name, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`circular token reference: --${name}`);
    seen.add(name);
    const raw = map.get(name);
    if (raw === undefined) throw new Error(`unknown token: --${name}`);
    const varRef = raw.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i);
    if (varRef) return resolve(varRef[1], seen);
    return raw;
  };
  return resolve;
}

/** 解析 styles.css 的浅色 / 深色（媒体查询） / 深色（手动）三组语义 token，并把 var() 链解析为字面色值。 */
export function parseThemeTokens(css = readFileSync(CSS_PATH, "utf8")) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // 浅色 token 分布在多个平级 :root{} 块中（原生值 + 语义值），媒体查询与 data-theme 块不会被此模式匹配。
  const lightBodies = [...clean.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const primitives = declarations(lightBodies.join(";"));
  const merge = (body) => {
    const merged = new Map(primitives);
    for (const [key, value] of declarations(body)) merged.set(key, value);
    return merged;
  };
  const lightMap = merge(lightBodies.join(";"));
  const darkAttrMap = merge(block(clean, /:root\[data-theme=["']dark["']\]\s*\{([^}]*)\}/));
  const darkMediaMap = merge(block(clean, /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?:root:not\(\[data-theme\]\)\s*\{([^}]*)\}/));
  const flatten = (map) => Object.fromEntries([...map.keys()].map((key) => [key, resolver(map)(key)]));
  const darkAttr = block(clean, /:root\[data-theme=["']dark["']\]\s*\{([^}]*)\}/);
  const darkMedia = block(clean, /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?:root:not\(\[data-theme\]\)\s*\{([^}]*)\}/);
  return {
    light: flatten(lightMap),
    dark: flatten(darkAttrMap),
    darkMedia: flatten(darkMediaMap),
    darkAttrRaw: Object.fromEntries(declarations(darkAttr)),
    darkMediaRaw: Object.fromEntries(declarations(darkMedia)),
  };
}

/* 文字类对照表：均要求 ≥ 4.5:1 */
export const TEXT_PAIRS = [
  ["text-primary", "surface-raised"], ["text-primary", "surface-canvas"],
  ["text-secondary", "surface-raised"], ["text-secondary", "surface-canvas"],
  ["text-muted", "surface-raised"], ["text-muted", "surface-canvas"], ["text-muted", "surface-sunken"],
  ["text-inverse", "surface-rail"], ["rail-muted", "surface-rail"],
  ["accent", "surface-raised"], ["accent", "surface-canvas"], ["accent", "accent-soft"],
  ["status-ready-fg", "status-ready-bg"], ["status-error-fg", "status-error-bg"],
  ["status-warn-fg", "status-warn-bg"], ["status-idle-fg", "status-idle-bg"], ["status-info-fg", "status-info-bg"],
  ["status-ready-fg", "surface-raised"], ["status-error-fg", "surface-raised"],
  ["status-warn-fg", "surface-raised"], ["status-idle-fg", "surface-raised"], ["status-info-fg", "surface-raised"],
];
/* 非文字类对照表：焦点环、输入边框、图表主色，要求 ≥ 3:1（装饰性 border-subtle/border-strong 不承载信息，不在此列） */
export const UI_PAIRS = [
  ["accent", "surface-raised"], ["accent", "surface-canvas"], ["accent", "surface-sunken"],
  ["focus-ring", "surface-raised"], ["focus-ring", "surface-canvas"], ["focus-rail", "surface-rail"],
  ["border-control", "surface-raised"], ["border-control", "surface-canvas"], ["border-control", "surface-sunken"],
];

export function audit(css = readFileSync(CSS_PATH, "utf8")) {
  const themes = parseThemeTokens(css);
  const failures = [];
  const checked = [];
  for (const [themeName, tokens] of [["light", themes.light], ["dark", themes.dark], ["dark (prefers-color-scheme)", themes.darkMedia]]) {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrastRatio(tokens[fg], tokens[bg]);
      const row = { theme: themeName, fg, bg, min: 4.5, ratio, kind: "text" };
      checked.push(row);
      if (ratio === null) failures.push(`${themeName}: 无法解析 ${fg} 或 ${bg}`);
      else if (ratio < 4.5) failures.push(`${themeName}: ${fg} on ${bg} = ${ratio.toFixed(2)} < 4.5`);
    }
    for (const [fg, bg] of UI_PAIRS) {
      const ratio = contrastRatio(tokens[fg], tokens[bg]);
      const row = { theme: themeName, fg, bg, min: 3, ratio, kind: "ui" };
      checked.push(row);
      if (ratio === null) failures.push(`${themeName}: 无法解析 ${fg} 或 ${bg}`);
      else if (ratio < 3) failures.push(`${themeName}: ${fg} on ${bg} = ${ratio.toFixed(2)} < 3`);
    }
  }
  const mediaKeys = Object.keys(themes.darkMediaRaw);
  if (!mediaKeys.length) failures.push("缺少 @media (prefers-color-scheme: dark) 的深色 token 块");
  const attrKeys = Object.keys(themes.darkAttrRaw);
  if (!attrKeys.length) failures.push("缺少 :root[data-theme=\"dark\"] 的深色 token 块");
  const drifted = [...new Set([...mediaKeys, ...attrKeys])].filter((key) => themes.darkMediaRaw[key] !== themes.darkAttrRaw[key]);
  for (const key of drifted) failures.push(`深色 token 不一致: --${key}（media=${themes.darkMediaRaw[key]} vs data-theme=${themes.darkAttrRaw[key]}）`);
  return { failures, checked, themes, drifted };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-contrast.mjs")) {
  const { failures, checked, drifted } = audit();
  const worst = checked.filter((row) => row.ratio !== null).sort((a, b) => a.ratio / a.min - b.ratio / b.min).slice(0, 6);
  console.log(`对比度检查：${checked.length} 组（文字 ≥4.5:1、非文字 ≥3:1），深色 token 漂移 ${drifted.length} 项`);
  for (const row of worst) console.log(`  最紧边距 ${row.ratio.toFixed(2)} (min ${row.min}) ${row.theme}: ${row.fg} on ${row.bg}`);
  if (failures.length) {
    console.error(`对比度检查 FAILED：\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log("对比度检查 PASS");
}
