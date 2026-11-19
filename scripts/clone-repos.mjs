#!/usr/bin/env node
/**
 * clone-repos.mjs — 把 Atlas 数据快照中引用的 GitHub 仓库镜像到本地 repos/。
 *
 * 数据来源：data/manifest.json 的 groups 顺序 + data/groups/<category>.json 的 projects[].github
 * 关键约束（见 AGENTS.md）：
 *   - 一个 GitHub 仓库可能被多个 Vercel 项目使用（如 historicalRecords），因此按 full_name 去重，
 *     而不是按项目去重，并保留 project_names 映射。
 *   - repos/ 只存在于本地，绝不提交：私有源码、媒体与账号数据不得进入 Public 仓库（见 .gitignore）。
 *   - 默认跳过 GuHengSpeaksofGoodBooks（约 3.5 GiB 私有课程档案，用户明确要求先 pass）。
 *
 * 用法：
 *   node scripts/clone-repos.mjs [--jobs 3] [--depth 1] [--only a,b] [--skip x] [--dry-run]
 *                               [--force] [--update] [--target repos] [--report repos/clone-report.json]
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const START = Date.now();

/* 大仓库在并发克隆、链路抖动时容易触发 curl 18/28（unexpected disconnect / Operation too slow）而中止。
   git 默认 1 KiB/s×30s 就会放弃，这里放宽到 100 B/s×5min：仍能拦住真正死掉的连接，但不会因瞬时限速丢掉已传数据。 */
const NET_TOLERANCE = ["-c", "http.lowSpeedLimit=100", "-c", "http.lowSpeedTime=300"];

/** 用户明确要求本轮先跳过的仓库（大小/授权原因）。 */
const DEFAULT_SKIP = ["GuHengSpeaksofGoodBooks"];

const DEFAULTS = {
  jobs: 3,
  depth: 0, // 0 = 完整历史
  filter: "", // 例如 blob:none，可显著减小镜像体积
  retries: 1,
  timeoutSec: 3600,
  target: "repos",
  report: "repos/clone-report.json",
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS, skip: [...DEFAULT_SKIP], only: [], force: false, update: false, dryRun: false };
  const TAKES_VALUE = new Set(["jobs", "depth", "filter", "retries", "timeout", "target", "report", "skip", "only"]);
  const queue = argv.slice();
  while (queue.length) {
    const arg = queue.shift();
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    let value = rest.join("=");
    if (!value && TAKES_VALUE.has(key)) {
      const next = queue[0];
      if (next === undefined || next.startsWith("--")) throw new Error(`参数 --${key} 需要一个值`);
      value = queue.shift();
    }
    switch (key) {
      case "jobs": opts.jobs = Math.max(1, Number(value) || DEFAULTS.jobs); break;
      case "depth": opts.depth = Math.max(0, Number(value) || 0); break;
      case "filter": opts.filter = value; break;
      case "retries": opts.retries = Math.max(0, Number(value) || 0); break;
      case "timeout": opts.timeoutSec = Math.max(30, Number(value) || DEFAULTS.timeoutSec); break;
      case "target": opts.target = value; break;
      case "report": opts.report = value; break;
      case "skip": opts.skip.push(...value.split(",").map((s) => s.trim()).filter(Boolean)); break;
      case "only": opts.only.push(...value.split(",").map((s) => s.trim()).filter(Boolean)); break;
      case "force": opts.force = true; break;
      case "update": opts.update = true; break;
      case "dry-run": opts.dryRun = true; break;
      case "help": opts.help = true; break;
      default: throw new Error(`未知参数: ${arg}（用 --help 查看可用参数）`);
    }
  }
  return opts;
}

const opts = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
})();

if (opts.help) {
  console.log(`用法: node scripts/clone-repos.mjs [选项]
  --jobs=N        并发克隆数（默认 ${DEFAULTS.jobs}）
  --depth=N       浅克隆深度，0 为完整历史（默认 ${DEFAULTS.depth}）
  --filter=SPEC   git 部分克隆过滤，如 blob:none
  --only=a,b      只克隆指定仓库名
  --skip=a,b      额外的跳过仓库名（默认已跳过 ${DEFAULT_SKIP.join(",")}）
  --force         目标目录冲突时删除后重新克隆（仅限 repos/ 内）
  --update        已存在的仓库执行 git fetch + 快进合并
  --retries=N     失败重试次数（默认 ${DEFAULTS.retries}）
  --timeout=SEC   单仓库超时秒数（默认 ${DEFAULTS.timeoutSec}）
  --target=DIR    目标目录（默认 ${DEFAULTS.target}/）
  --report=FILE   报告输出（默认 ${DEFAULTS.report}）
  --dry-run       只打印计划，不执行`);
  process.exit(0);
}

const LOG_START = Date.now();
const stamp = () => new Date().toISOString();
const log = (tag, message) => {
  const elapsed = ((Date.now() - LOG_START) / 1000).toFixed(1).padStart(7);
  process.stdout.write(`${stamp()} +${elapsed}s ${tag ? `[${tag}] ` : ""}${message}\n`);
};

/* ---------- 1. 从数据快照收集仓库（按 manifest 顺序，full_name 去重） ---------- */
function collectRepositories() {
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/manifest.json"), "utf8"));
  const byKey = new Map();
  for (const group of manifest.groups || []) {
    const file = join(ROOT, "data/groups", `${group.id}.json`);
    if (!existsSync(file)) {
      log("warn", `缺少分组文件 ${group.id}.json，跳过`);
      continue;
    }
    const data = JSON.parse(readFileSync(file, "utf8"));
    for (const project of data.projects || []) {
      const ref = project.github?.full_name;
      if (!ref) continue;
      const key = ref.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, {
          full_name: ref,
          repo: ref.split("/")[1],
          owner: ref.split("/")[0],
          visibility: project.github.visibility || "unknown",
          url: `https://github.com/${ref}.git`,
          categories: [],
          project_names: [],
        });
      }
      const entry = byKey.get(key);
      if (!entry.categories.includes(group.id)) entry.categories.push(group.id);
      if (!entry.project_names.includes(project.name)) entry.project_names.push(project.name);
    }
  }
  return [...byKey.values()];
}

const skipSet = new Set(opts.skip.map((s) => s.toLowerCase()));
const onlySet = new Set(opts.only.map((s) => s.toLowerCase()));
const discovered = collectRepositories();

const plan = [];
for (const repo of discovered) {
  const key = repo.repo.toLowerCase();
  const fullKey = repo.full_name.toLowerCase();
  let reason = null;
  if (skipSet.has(key) || skipSet.has(fullKey)) reason = `在跳过清单中（--skip / 默认跳过）`;
  else if (onlySet.size && !onlySet.has(key) && !onlySet.has(fullKey)) reason = "不在 --only 列表中";
  plan.push({ ...repo, skipReason: reason });
}

const reposRoot = resolve(ROOT, opts.target);
mkdirSync(reposRoot, { recursive: true });

/* ---------- 2. 预检 ---------- */
async function preflight() {
  try {
    const { stdout } = await run("git", ["--version"]);
    log("pre", stdout.trim());
  } catch {
    log("fatal", "未找到 git，无法克隆");
    process.exit(2);
  }
  const privates = plan.filter((p) => !p.skipReason && p.visibility === "private");
  if (privates.length) {
    try {
      const { stdout, stderr } = await run("gh", ["auth", "status"], { env: { ...process.env, GH_PAGER: "cat" } });
      const text = `${stdout}${stderr}`;
      const account = /account (\S+)/.exec(text)?.[1] || "unknown";
      log("pre", `gh 已登录为 ${account}，可克隆 ${privates.length} 个私有仓库`);
    } catch {
      log("warn", `gh 未登录或不可用：${privates.length} 个私有仓库可能因认证失败而跳过（git 已配置的凭证仍可用）`);
    }
  }
}

/* ---------- 3. 工具函数 ---------- */
const assertInsideRoot = (target) => {
  const resolved = resolve(target);
  if (resolved === reposRoot || !resolved.startsWith(reposRoot + sep)) {
    throw new Error(`拒绝操作 ${resolved}：必须在 ${reposRoot}/ 内部`);
  }
  return resolved;
};

async function git(args, options = {}) {
  return run("git", args, {
    cwd: options.cwd || ROOT,
    timeout: opts.timeoutSec * 1000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: process.env.GIT_ASKPASS || "echo" },
  });
}

async function directoryBytes(dir) {
  try {
    const { stdout } = await run("du", ["-sk", dir], { maxBuffer: 1024 * 1024 });
    return Number(stdout.trim().split(/\s+/)[0] || 0) * 1024;
  } catch {
    return 0;
  }
}

const human = (bytes) =>
  bytes >= 1 << 30 ? `${(bytes / (1 << 30)).toFixed(2)} GiB` : bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MiB` : `${(bytes / 1024).toFixed(0)} KiB`;

const errorTail = (error) => {
  const raw = [error?.stderr, error?.stdout, error?.message].filter(Boolean).join("\n").trim();
  const lines = raw.split("\n").filter((line) => !/^\s*$/.test(line)).slice(-6).join(" | ");
  return lines.slice(0, 900) || "unknown error";
};

/* ---------- 4. 单仓库处理 ---------- */
async function cloneRepo(repo, index, total) {
  const tag = `${index}/${total}`;
  const dir = assertInsideRoot(join(reposRoot, repo.repo));
  const started = Date.now();
  const record = {
    full_name: repo.full_name,
    project_names: repo.project_names,
    categories: repo.categories,
    visibility: repo.visibility,
    path: join(opts.target, repo.repo),
    status: "pending",
    bytes: 0,
    duration_ms: 0,
    head: null,
    error: null,
  };

  if (repo.skipReason) {
    record.status = "skipped";
    record.error = repo.skipReason;
    log(tag, `skip  ${repo.full_name} — ${repo.skipReason}`);
    record.duration_ms = Date.now() - started;
    return record;
  }

  if (opts.dryRun) {
    record.status = "planned";
    log(tag, `plan  ${repo.full_name} -> ${record.path}`);
    record.duration_ms = Date.now() - started;
    return record;
  }

  const exists = existsSync(dir);
  const isRepo = exists && existsSync(join(dir, ".git"));

  if (isRepo && !opts.force && !opts.update) {
    record.status = "exists";
    record.bytes = await directoryBytes(dir);
    try {
      record.head = (await git(["rev-parse", "HEAD"], { cwd: dir })).stdout.trim();
    } catch { /* 保留为 null */ }
    log(tag, `have  ${repo.full_name} (${human(record.bytes)}) — 已存在，未变更`);
    record.duration_ms = Date.now() - started;
    return record;
  }

  if (exists && !isRepo && !opts.force) {
    record.status = "conflict";
    record.error = `${record.path} 已存在且不是 git 仓库；用 --force 删除后重克隆`;
    log(tag, `conf  ${repo.full_name} — ${record.error}`);
    record.duration_ms = Date.now() - started;
    return record;
  }

  if (isRepo && opts.update) {
    try {
      await git([...NET_TOLERANCE, "fetch", "--all", "--prune"], { cwd: dir });
      await git(["merge", "--ff-only", "@{u}"], { cwd: dir });
      record.status = "updated";
      record.head = (await git(["rev-parse", "HEAD"], { cwd: dir })).stdout.trim();
      record.bytes = await directoryBytes(dir);
      log(tag, `pull  ${repo.full_name} -> ${record.head.slice(0, 8)}`);
    } catch (error) {
      record.status = "update-failed";
      record.error = errorTail(error);
      log(tag, `fail  ${repo.full_name} — 更新失败: ${record.error}`);
    }
    record.duration_ms = Date.now() - started;
    return record;
  }

  if (exists && opts.force) {
    try {
      assertInsideRoot(dir);
      rmSync(dir, { recursive: true, force: true });
      log(tag, `rm    ${record.path}（--force）`);
    } catch (error) {
      record.status = "failed";
      record.error = `无法清空目标目录: ${error.message}`;
      log(tag, `fail  ${repo.full_name} — ${record.error}`);
      record.duration_ms = Date.now() - started;
      return record;
    }
  }

  const args = [...NET_TOLERANCE, "clone"];
  if (opts.depth > 0) args.push("--depth", String(opts.depth));
  if (opts.filter) args.push("--filter", opts.filter);
  args.push("--", repo.url, dir);

  for (let attempt = 0; attempt <= opts.retries; attempt += 1) {
    try {
      log(tag, `clone ${repo.full_name}${attempt ? `（第 ${attempt + 1} 次尝试）` : ""} -> ${record.path}`);
      await git(args);
      record.status = "cloned";
      record.error = null;
      record.head = (await git(["rev-parse", "HEAD"], { cwd: dir })).stdout.trim();
      record.bytes = await directoryBytes(dir);
      record.duration_ms = Date.now() - started;
      log(tag, `ok    ${repo.full_name} ${record.head.slice(0, 8)} ${human(record.bytes)} ${(record.duration_ms / 1000).toFixed(1)}s`);
      return record;
    } catch (error) {
      record.error = errorTail(error);
      if (attempt < opts.retries) {
        log(tag, `retry ${repo.full_name} — ${record.error}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  record.status = "failed";
  record.duration_ms = Date.now() - started;
  if (/could not read Username|Authentication failed|Repository not found/i.test(record.error || "")) {
    record.error += " ｜ 提示：私有仓库需要 gh 凭证（gh auth login / gh auth setup-git）";
  }
  log(tag, `fail  ${repo.full_name} — ${record.error}`);
  return record;
}

/* ---------- 5. 并发池 + 报告 ---------- */
async function pool(items, size, worker) {
  const queue = items.map((item, index) => ({ item, index: index + 1 }));
  const results = [];
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      results.push(await worker(next.item, next.index, items.length));
    }
  });
  await Promise.all(workers);
  return results;
}

const writeReport = (records, finished) => {
  const counts = {};
  for (const record of records) counts[record.status] = (counts[record.status] || 0) + 1;
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    finished,
    data_snapshot: JSON.parse(readFileSync(join(ROOT, "data/manifest.json"), "utf8")).generated_at,
    repos_root: opts.target,
    options: { jobs: opts.jobs, depth: opts.depth, filter: opts.filter || null, skip: opts.skip, only: opts.only, force: opts.force, update: opts.update },
    counts: { discovered: discovered.length, ...counts },
    total_bytes: records.reduce((sum, record) => sum + (record.bytes || 0), 0),
    entries: [...records].sort((a, b) => a.full_name.localeCompare(b.full_name)),
  };
  const reportPath = resolve(ROOT, opts.report);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
};

const records = [];
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    log("stop", `收到 ${signal}，写出部分报告后退出`);
    const { report, reportPath } = writeReport(records, false);
    log("stop", `部分报告 ${reportPath}：${JSON.stringify(report.counts)}`);
    process.exit(130);
  });
}

await preflight();
const runnable = plan.filter((repo) => !repo.skipReason);
log("start", `${discovered.length} 个仓库被数据引用；本轮处理 ${runnable.length} 个（跳过 ${plan.length - runnable.length}），并发 ${opts.jobs}${opts.dryRun ? "（dry-run）" : ""}；网络容差 lowSpeed=100B/s×300s`);

const cloned = await pool(runnable, opts.jobs, cloneRepo);
records.push(...cloned, ...plan.filter((repo) => repo.skipReason).map((repo) => ({
  full_name: repo.full_name,
  project_names: repo.project_names,
  categories: repo.categories,
  visibility: repo.visibility,
  path: join(opts.target, repo.repo),
  status: "skipped",
  bytes: 0,
  duration_ms: 0,
  head: null,
  error: repo.skipReason,
})));

const { report, reportPath } = writeReport(records, !interrupted);
log("done", `${((Date.now() - START) / 1000).toFixed(1)}s 完成 ${JSON.stringify(report.counts)}；合计 ${human(report.total_bytes)}`);
log("done", `报告：${reportPath}（repos/ 已被 .gitignore 忽略，不要提交）`);

const failed = report.counts.failed || 0;
const conflicted = report.counts.conflict || 0;
const updateFailed = report.counts["update-failed"] || 0;
process.exit(failed + conflicted + updateFailed > 0 ? 1 : 0);
