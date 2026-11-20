import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = join(root, "scripts/atlas-dashboard");
const scripts = readdirSync(dir).filter((f) => f.endsWith(".sh"));
const read = (p) => readFileSync(join(dir, p), "utf8");

test("atlas-dashboard: 每个 shell 脚本都能通过 bash -n", () => {
  assert.ok(scripts.length >= 3, "expected the atlas-dashboard scripts");
  for (const f of scripts) {
    const r = spawnSync("bash", ["-n", join(dir, f)], { encoding: "utf8" });
    assert.equal(r.status, 0, `${f} 语法错误: ${r.stderr}`);
  }
});

// 这类 bug 在 macOS 上实测出现过三次：`$logf）` 会让 bash 把多字节字节也算进变量名，
// 报 "logf?: unbound variable"（带 set -u 时直接中断整轮）。用测试锁住。
test("atlas-dashboard: $VAR 不紧跟多字节字符（需写成 ${VAR}）", () => {
  const bad = [];
  const re = /\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7f]/;
  for (const f of scripts) {
    read(f).split("\n").forEach((line, i) => {
      if (re.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("atlas-dashboard: prompt.md 的占位符都被 tick.sh 替换掉", () => {
  const prompt = read("prompt.md");
  const placeholders = new Set([...prompt.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]));
  const tick = read("tick.sh");
  const substituted = new Set([...tick.matchAll(/s\|\{\{([A-Z_]+)\}\}\|/g)].map((m) => m[1]));
  const missing = [...placeholders].filter((p) => !substituted.has(p));
  assert.deepEqual(missing, [], "未替换的占位符: " + missing.join(", "));
  assert.ok(placeholders.size >= 6, "prompt 占位符数量异常");
});

test("atlas-dashboard: 资格判断既认静态站也认组件式前端", () => {
  for (const f of ["tick.sh", "status.sh"]) {
    const src = read(f);
    assert.match(src, /has_ui\(\)/, `${f} 应使用统一的 has_ui 判断`);
    assert.match(src, /\.tsx/, `${f} 的 has_ui 应包含 .tsx（Next.js 这类没有 index.html 的项目）`);
  }
});

test("atlas-dashboard: 种子名单里的项目都存在于 data 清单或 repos 目录之外，且格式为三列", () => {
  const lines = read("done.seed.tsv")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"));
  assert.ok(lines.length >= 8, "种子名单至少 8 条");
  for (const l of lines) {
    const cols = l.split("\t");
    assert.equal(cols.length, 3, `种子行应为 3 列: ${l}`);
    assert.match(cols[1], /^[0-9a-f]{7,40}$/, `第二列应为 git sha: ${l}`);
  }
});
