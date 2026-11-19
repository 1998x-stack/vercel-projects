/* Vercel Projects Atlas — Dashboard 前端
   设计规范：docs/DESIGN_DASHBOARD_2026-11-19.md
   约束：零框架、仅本地资产、所有渲染使用 textContent / DOM API（绝不注入 HTML）。 */

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; };
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

const STATES = {
  READY: { label: "READY", tone: "ready" },
  ERROR: { label: "ERROR", tone: "error" },
  BLOCKED: { label: "BLOCKED", tone: "warn" },
  QUEUED: { label: "QUEUED", tone: "info" },
  BUILDING: { label: "BUILDING", tone: "info" },
  INITIALIZING: { label: "INITIALIZING", tone: "info" },
  CANCELED: { label: "CANCELED", tone: "idle" },
  NONE: { label: "无部署记录", tone: "idle" },
  UNKNOWN: { label: "未知", tone: "idle" },
};
const STATE_ORDER = ["READY", "BUILDING", "QUEUED", "INITIALIZING", "BLOCKED", "ERROR", "CANCELED", "NONE", "UNKNOWN"];
const RISK_RANK = { ERROR: 0, BLOCKED: 1, NONE: 2, CANCELED: 3, QUEUED: 4, BUILDING: 5, INITIALIZING: 6, UNKNOWN: 7, READY: 8 };
const EVIDENCE = {
  "source-inspection": { label: "源码已检查", rank: 4, tone: "ready", note: "已阅读连接仓库的源文件与资产目录" },
  readme: { label: "README 已核验", rank: 3, tone: "info", note: "依据仓库 README 描述功能" },
  "vercel-metadata": { label: "Vercel 元数据", rank: 2, tone: "info", note: "仅依据 Vercel 部署元信息" },
  "vercel-only": { label: "仅 Vercel 记录", rank: 1, tone: "idle", note: "只有 Vercel 项目记录，未核对仓库" },
  "name-only": { label: "待核验（仅名称）", rank: 0, tone: "warn", note: "只确认存在与关联，未阅读源码或 README" },
};
const TARGETS = { production: "production 目标", preview: "preview / 未指定目标", none: "无部署记录" };
const DAY = 86400000;

const store = { manifest: null, projects: [], category: "all", status: "all", privacy: "all", evidence: "all", query: "", sort: "name", dir: 1, lastFocus: null, ring: [] };

const stateOf = (p) => p.last_deployment?.state || "NONE";
const targetKey = (p) => (!p.last_deployment ? "none" : p.last_deployment.target === "production" ? "production" : "preview");
const privacyOf = (p) => p.github?.visibility || "unlinked";
const evidenceOf = (p) => (EVIDENCE[p.evidence] ? p.evidence : "name-only");
const categoryName = (id) => store.manifest?.groups.find((g) => g.id === id)?.name || id;
const countBy = (fn) => store.projects.reduce((acc, p) => { const k = fn(p); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
const uniqueRepoCount = () => new Set(store.projects.filter((p) => p.github).map((p) => p.github.full_name.toLowerCase())).size;
const localeDate = (value) => { if (!value) return "无记录"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "未核实" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d); };
const today = () => store.manifest?.generated_at ? new Date(store.manifest.generated_at) : new Date();

function chip(text, tone) { return el("span", `state ${tone}`, text); }
function tag(text, cls) { return el("span", `tag ${cls || ""}`.trim(), text); }
function msg(message) { const n = $("notice"); n.textContent = message; n.hidden = false; clearTimeout(msg.timeout); msg.timeout = setTimeout(() => { n.hidden = true; }, 3600); }

/* ---------- 01 KPI ---------- */
function setKpi(id, value, suffix) {
  const node = $(id);
  node.replaceChildren(document.createTextNode(String(value)));
  if (suffix) node.append(el("small", "", suffix));
}
function renderKpis(queueCount) {
  const linked = store.projects.filter((p) => p.github).length;
  const counts = countBy((p) => privacyOf(p));
  const ready = countBy(stateOf).READY || 0;
  setKpi("kpi-projects", store.projects.length);
  setKpi("kpi-links", linked);
  setKpi("kpi-repos", uniqueRepoCount());
  setKpi("kpi-visibility", `${counts.private || 0} / ${counts.public || 0}`);
  $("kpi-visibility-foot").textContent = `Private / Public；未关联 ${counts.unlinked || 0} 个项目`;
  setKpi("kpi-ready", ready, " 个项目");
  setKpi("kpi-attention", queueCount);
}

/* ---------- 图表：横向条形 ---------- */
function barRow(label, value, max, tone) {
  const row = el("div", "bar-row");
  row.append(el("span", "bar-label", label));
  const track = el("div", "bar-track");
  const fill = el("div", `bar-fill${tone && tone !== "accent" ? " bar-" + tone : ""}`);
  fill.style.width = `${max ? Math.round((value / max) * 100) : 0}%`;
  track.append(fill);
  row.append(track, el("span", "bar-value", `${value} · ${pct(value, store.projects.length)}%`));
  return row;
}
function renderCategoryChart() {
  const counts = countBy((p) => p.category);
  const max = Math.max(1, ...store.manifest.groups.map((g) => counts[g.id] || 0));
  const root = $("category-chart");
  root.replaceChildren(...store.manifest.groups.map((g) => barRow(g.name, counts[g.id] || 0, max)));
}
function renderTargetChart() {
  const counts = countBy(targetKey);
  const keys = ["production", "preview", "none"];
  const max = Math.max(1, ...keys.map((k) => counts[k] || 0));
  $("target-chart").replaceChildren(...keys.map((k) => barRow(TARGETS[k], counts[k] || 0, max, k === "production" ? "accent" : k === "none" ? "idle" : "warn")));
  $("target-foot").textContent = `仅 ${counts.production || 0} 个项目的最近一次部署指向 production 目标；其余为 preview 或未记录目标。`;
}

/* ---------- 图表：状态环 + 图例 ---------- */
function ringColor(token) { return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "#888"; }
function renderStatusRing() {
  const counts = countBy(stateOf);
  const total = store.projects.length || 1;
  const present = STATE_ORDER.filter((k) => counts[k]);
  let acc = 0;
  const stops = present.map((k) => {
    const from = (acc / total) * 100;
    acc += counts[k];
    return `${ringColor(`--status-${STATES[k].tone}-fg`)} ${from}% ${(acc / total) * 100}%`;
  });
  $("status-ring").style.background = `conic-gradient(${stops.join(",")})`;
  $("ring-count").textContent = String(counts.READY || 0);
  const legend = $("status-legend");
  legend.replaceChildren(...present.map((k) => {
    const row = el("div", "legend-row");
    row.append(el("span", `legend-dot ${STATES[k].tone}`), el("span", "", STATES[k].label), el("b", "num", String(counts[k])), el("em", "", `${pct(counts[k], total)}%`));
    return row;
  }));
}

/* ---------- 图表：分段条 + 图例 ---------- */
function renderSegments(barId, legendId, segments) {
  const total = store.projects.length || 1;
  $(barId).replaceChildren(...segments.filter((s) => s.value).map((s) => {
    const seg = el("div", `segment ${s.tone}`);
    seg.style.width = `${(s.value / total) * 100}%`;
    seg.setAttribute("title", `${s.label} ${s.value}`);
    return seg;
  }));
  $(legendId).replaceChildren(...segments.map((s) => {
    const row = el("div", "legend-row");
    row.append(el("span", `legend-dot ${s.tone}`), el("span", "", s.label), el("b", "num", String(s.value)), el("em", "", `${pct(s.value, total)}%`));
    return row;
  }));
}
function renderEvidenceChart() {
  const counts = countBy(evidenceOf);
  const keys = Object.keys(EVIDENCE).sort((a, b) => EVIDENCE[b].rank - EVIDENCE[a].rank);
  renderSegments("evidence-bar", "evidence-legend", keys.map((k) => ({ label: `${EVIDENCE[k].label}`, value: counts[k] || 0, tone: EVIDENCE[k].tone })));
}
function renderStaleness() {
  const basis = today().getTime();
  const buckets = { fresh: 0, aging: 0, stale: 0, none: 0 };
  for (const p of store.projects) {
    if (!p.last_deployment?.created_at) { buckets.none += 1; continue; }
    const days = (basis - new Date(p.last_deployment.created_at).getTime()) / DAY;
    if (days < 90) buckets.fresh += 1;
    else if (days <= 365) buckets.aging += 1;
    else buckets.stale += 1;
  }
  $("freshness-basis").textContent = `基准 ${store.manifest.generated_at}`;
  renderSegments("staleness-bar", "staleness-legend", [
    { label: "90 天内（新鲜）", value: buckets.fresh, tone: "ready" },
    { label: "90–365 天（陈旧）", value: buckets.aging, tone: "info" },
    { label: "超过 365 天（过期）", value: buckets.stale, tone: "warn" },
    { label: "无部署记录", value: buckets.none, tone: "idle" },
  ]);
}
function renderSnapshotFacts() {
  const counts = countBy(evidenceOf);
  const reviews = store.projects.filter((p) => p.review).length;
  const facts = [
    ["数据快照日期", store.manifest.generated_at, "ready"],
    ["账户范围", "xiemings-projects", "idle"],
    ["待核验项目（name-only）", String(counts["name-only"] || 0), "warn"],
    ["带发布/审查记录的项目", String(reviews), "info"],
    ["HTTP 可用性探测", "未执行", "idle"],
  ];
  $("snapshot-facts").replaceChildren(...facts.map(([label, value, tone]) => {
    const row = el("div", "legend-row");
    row.append(el("span", `legend-dot ${tone}`), el("span", "", label), el("b", "", value));
    return row;
  }));
  $("snapshot-foot").textContent = `所有状态都是 ${store.manifest.generated_at} 的读取结果，仓库可见性以 GitHub 读取为准。未做 HTTP 探测，因此这里没有“在线率”。`;
}

/* ---------- 04 待办队列 ---------- */
function queueEntry(p) {
  const reasons = [];
  const review = p.review || {};
  let sev = null;
  const bump = (level) => { if (!sev || level < sev) sev = level; };
  if (stateOf(p) === "ERROR") { reasons.push(["部署 ERROR", "error"]); bump(0); }
  if (stateOf(p) === "BLOCKED") { reasons.push(["部署 BLOCKED", "warn"]); bump(0); }
  if (review.release_status === "NOT_MERGED") { reasons.push(["源分支未合并", "warn"]); bump(0); }
  if (review.rights_verified === false) { reasons.push(["传播授权未核验", "warn"]); bump(0); }
  if (!p.last_deployment) { reasons.push(["无部署记录", "idle"]); bump(1); }
  if (p.last_deployment && targetKey(p) === "preview") { reasons.push(["最近部署非 production", "info"]); bump(2); }
  if (sev === null) return null;
  return { sev: `p${sev}`, reasons, project: p, label: sev === 0 ? "必须先处理" : sev === 1 ? "缺少部署证据" : "口径待补" };
}
function renderQueue() {
  const entries = store.projects.map(queueEntry).filter(Boolean)
    .sort((a, b) => a.sev.localeCompare(b.sev) || a.project.name.localeCompare(b.project.name));
  const root = $("queue-list");
  if (!entries.length) { root.replaceChildren(el("p", "queue-empty", "当前数据中没有触发待办规则的项目。")); return entries.length; }
  root.replaceChildren(...entries.map((entry) => {
    const p = entry.project;
    const row = el("article", "queue-row");
    row.dataset.sev = entry.sev;
    row.append(chip(entry.label, entry.sev === "p0" ? "error" : entry.sev === "p1" ? "warn" : "info"));
    const main = el("div", "queue-main");
    const name = el("button", "queue-name", p.name);
    name.type = "button";
    name.addEventListener("click", () => openDetail(p));
    main.append(name, el("span", "queue-cat", `${categoryName(p.category)} · ${p.github?.full_name || "未关联 GitHub"}`));
    const reasons = el("div", "queue-reasons");
    entry.reasons.forEach(([text, tone]) => reasons.append(chip(text, tone)));
    main.append(reasons);
    row.append(main, el("p", "queue-next", p.next || "未核验"));
    return row;
  }));
  return entries.length;
}

/* ---------- 05 工具栏 ---------- */
function renderToolbar() {
  const counts = countBy((p) => p.category);
  const chips = $("category-filters");
  const choices = [{ id: "all", name: "全部项目", count: store.projects.length }].concat(store.manifest.groups.map((g) => ({ id: g.id, name: g.name, count: counts[g.id] || 0 })));
  chips.replaceChildren(...choices.map((c) => {
    const b = el("button", "chip", `${c.name} · ${c.count}`);
    b.type = "button";
    b.setAttribute("aria-pressed", String(store.category === c.id));
    b.addEventListener("click", () => { store.category = c.id; renderToolbar(); renderProjects(); });
    return b;
  }));
  const stateSelect = $("status-filter");
  if (stateSelect.options.length === 1) {
    const present = STATE_ORDER.filter((k) => countBy(stateOf)[k]);
    present.forEach((k) => stateSelect.append(new Option(`${STATES[k].label}`, k)));
  }
  const evidenceSelect = $("evidence-filter");
  if (evidenceSelect.options.length === 1) {
    Object.keys(EVIDENCE).sort((a, b) => EVIDENCE[b].rank - EVIDENCE[a].rank).forEach((k) => evidenceSelect.append(new Option(EVIDENCE[k].label, k)));
  }
}

/* ---------- 05 项目网格 ---------- */
function currentProjects() {
  const query = store.query.trim().toLocaleLowerCase();
  let data = store.projects.filter((p) =>
    (store.category === "all" || p.category === store.category) &&
    (store.status === "all" || stateOf(p) === store.status) &&
    (store.privacy === "all" || privacyOf(p) === store.privacy) &&
    (store.evidence === "all" || evidenceOf(p) === store.evidence));
  if (query) {
    data = data.filter((p) => [p.name, p.github?.full_name, p.summary, p.stack, p.risk, p.next].join(" ").toLocaleLowerCase().includes(query));
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  const comparators = {
    name: byName,
    category: (a, b) => store.manifest.groups.findIndex((g) => g.id === a.category) - store.manifest.groups.findIndex((g) => g.id === b.category) || byName(a, b),
    repo: (a, b) => (a.github?.full_name || "~").localeCompare(b.github?.full_name || "~") || byName(a, b),
    evidence: (a, b) => EVIDENCE[evidenceOf(b)].rank - EVIDENCE[evidenceOf(a)].rank || byName(a, b),
    state: (a, b) => (RISK_RANK[stateOf(a)] ?? 9) - (RISK_RANK[stateOf(b)] ?? 9) || byName(a, b),
    time: (a, b) => (b.last_deployment?.created_at || "").localeCompare(a.last_deployment?.created_at || "") || byName(a, b),
  };
  return data.sort((a, b) => comparators[store.sort](a, b) * store.dir);
}
function statusCell(p) {
  const meta = STATES[stateOf(p)] || STATES.UNKNOWN;
  return chip(meta.label, meta.tone);
}
function renderProjects() {
  const projects = currentProjects();
  const count = $("results-count");
  count.textContent = String(projects.length);
  const table = $("table-wrap");
  const cards = $("project-cards");
  const empty = $("empty-results");
  const active = [];
  if (store.category !== "all") active.push(`分类：${categoryName(store.category)}`);
  if (store.status !== "all") active.push(`状态：${(STATES[store.status] || {}).label || store.status}`);
  if (store.privacy !== "all") active.push(`可见性：${store.privacy}`);
  if (store.evidence !== "all") active.push(`证据：${EVIDENCE[store.evidence].label}`);
  if (store.query.trim()) active.push(`搜索：${store.query.trim()}`);
  $("results-active").replaceChildren(...active.map((text) => tag(text, "plain")));

  const showEmpty = projects.length === 0;
  empty.hidden = !showEmpty;
  table.hidden = showEmpty;
  cards.hidden = showEmpty;
  if (showEmpty) {
    $("empty-detail").textContent = active.length ? `已生效的条件：${active.join(" · ")}。可放宽筛选或清除条件。` : "数据快照中没有项目。";
    return;
  }

  const body = $("project-body");
  body.replaceChildren(...projects.map((p) => {
    const tr = el("tr");
    const tdName = el("td");
    const cell = el("div", "cell-name");
    const open = el("button", "row-open", p.name);
    open.type = "button";
    open.addEventListener("click", () => openDetail(p));
    cell.append(open, el("span", "cell-summary", p.summary));
    tdName.append(cell);

    const tdCat = el("td", "", categoryName(p.category));

    const tdRepo = el("td");
    const repoWrap = el("div", "cell-name");
    repoWrap.append(el("span", "cell-repo", p.github?.full_name || "未关联 GitHub"));
    repoWrap.append(tag(privacyOf(p) === "private" ? "Private" : privacyOf(p) === "public" ? "Public" : "无仓库", privacyOf(p)));
    tdRepo.append(repoWrap);

    const tdEv = el("td");
    tdEv.append(chip(EVIDENCE[evidenceOf(p)].label, EVIDENCE[evidenceOf(p)].tone));

    const tdState = el("td");
    tdState.append(statusCell(p));

    const tdTime = el("td");
    const timeWrap = el("div", "cell-name");
    timeWrap.append(el("span", "cell-time", localeDate(p.last_deployment?.created_at)));
    timeWrap.append(el("span", "cell-flag", TARGETS[targetKey(p)]));
    tdTime.append(timeWrap);

    tr.append(tdName, tdCat, tdRepo, tdEv, tdState, tdTime);
    tr.addEventListener("click", (event) => { if (!event.target.closest("button, a")) openDetail(p); });
    return tr;
  }));

  cards.replaceChildren(...projects.map((p) => {
    const card = el("article", "card");
    const top = el("div", "card-top");
    const open = el("button", "row-open", p.name);
    open.type = "button";
    open.addEventListener("click", () => openDetail(p));
    top.append(open, statusCell(p));
    card.append(top, el("p", "cell-summary", p.summary));
    const meta = el("dl", "card-meta");
    const rows = [["分类", categoryName(p.category)], ["仓库", p.github?.full_name || "未关联 GitHub"], ["可见性", privacyOf(p)], ["证据", EVIDENCE[evidenceOf(p)].label], ["最近部署", `${localeDate(p.last_deployment?.created_at)} · ${TARGETS[targetKey(p)]}`]];
    rows.forEach(([k, v]) => meta.append(el("dt", "", k), el("dd", "", v)));
    card.append(meta);
    return card;
  }));
}
function syncSortIndicators() {
  document.querySelectorAll("#project-table th[data-sort]").forEach((th) => {
    const active = th.dataset.sort === store.sort;
    const button = th.querySelector("button");
    const label = button.dataset.label || button.textContent.trim();
    button.dataset.label = label;
    button.replaceChildren(document.createTextNode(label));
    if (active) {
      button.append(el("span", "sort-arrow", store.dir === 1 ? "▲" : "▼"));
      th.setAttribute("aria-sort", store.dir === 1 ? "ascending" : "descending");
    } else {
      th.removeAttribute("aria-sort");
    }
  });
}

/* ---------- 抽屉 ---------- */
function detailBlock(parent, title, body, className) {
  if (!body) return;
  const section = el("section", `detail-block${className ? " " + className : ""}`);
  section.append(el("h3", "", title), el("p", "", body));
  parent.append(section);
}
function externalLink(label, url, ghost) {
  if (!url) return null;
  const a = el("a", ghost ? "ghost" : "", label);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
function openDetail(p) {
  store.lastFocus = document.activeElement;
  const container = $("inspector-content");
  container.replaceChildren();
  const review = p.review || {};
  $("inspector-label").textContent = `PROJECT INSPECTION / ${categoryName(p.category)}`;

  container.append(el("h2", "", p.name));
  container.append(el("p", "detail-lede", p.summary));

  const tags = el("div", "detail-tags");
  tags.append(statusCell(p), tag(privacyOf(p) === "private" ? "GitHub Private" : privacyOf(p) === "public" ? "GitHub Public" : "未关联 GitHub", privacyOf(p)), chip(EVIDENCE[evidenceOf(p)].label, EVIDENCE[evidenceOf(p)].tone));
  container.append(tags);

  detailBlock(container, "技术与实现", p.stack);
  detailBlock(container, "风险与疑点", p.risk, "risk");
  detailBlock(container, "下一步建议", p.next, "next");
  if (review.release_status || review.ci_status || review.rights_verified !== undefined) {
    const parts = [];
    if (review.release_status) parts.push(`发布状态：${review.release_status}`);
    if (review.ci_status) parts.push(`CI：${review.ci_status}`);
    if (review.rights_verified !== undefined) parts.push(`传播授权已核验：${review.rights_verified ? "是" : "否"}`);
    if (review.production_updated !== undefined) parts.push(`生产已更新：${review.production_updated ? "是" : "否"}`);
    detailBlock(container, "发布与审查记录", parts.join("；"));
  }
  detailBlock(container, "部署状态口径", `最近一次部署：${(STATES[stateOf(p)] || STATES.UNKNOWN).label}；目标：${TARGETS[targetKey(p)]}。此状态来自 Vercel 部署记录，可能属于 Preview，不构成 HTTP 可访问性或业务功能结论。`);

  const meta = el("dl", "detail-meta");
  const fields = [
    ["Vercel 项目", p.name],
    ["关联 GitHub", p.github?.full_name || "无"],
    ["仓库可见性", privacyOf(p)],
    ["部署目标", TARGETS[targetKey(p)]],
    ["最近部署时间", localeDate(p.last_deployment?.created_at)],
    ["审计快照", `${p.checked_at}（账户 ${p.account || "xiemings-projects"}）`],
    ["证据级别", EVIDENCE[evidenceOf(p)].note],
  ];
  fields.forEach(([k, v]) => meta.append(el("dt", "", k), el("dd", "", v)));
  container.append(meta);

  const links = el("div", "detail-links");
  links.append(externalLink("Vercel 控制台 ↗", `https://vercel.com/xiemings-projects/${encodeURIComponent(p.name)}`));
  const github = externalLink("GitHub 仓库 ↗", p.github ? `https://github.com/${p.github.full_name}` : null, true);
  if (github) links.append(github);
  const site = externalLink("配置域名（未验活）↗", p.site_url, true);
  if (site) links.append(site);
  container.append(links);

  $("drawer-overlay").hidden = false;
  $("inspector").classList.add("open");
  $("inspector").setAttribute("aria-hidden", "false");
  $("inspector").focus();
  document.body.style.overflow = "hidden";
  const url = new URL(window.location.href);
  url.searchParams.set("project", p.name);
  history.replaceState(null, "", url);
}
function closeDetail() {
  $("inspector").classList.remove("open");
  $("inspector").setAttribute("aria-hidden", "true");
  $("drawer-overlay").hidden = true;
  document.body.style.overflow = "";
  const url = new URL(window.location.href);
  url.searchParams.delete("project");
  history.replaceState(null, "", url);
  if (store.lastFocus?.isConnected) store.lastFocus.focus();
}

/* ---------- 主题 ---------- */
const THEME_TEXT = { auto: "主题：跟随系统", light: "主题：浅色", dark: "主题：深色" };
function currentTheme() {
  try { const saved = localStorage.getItem("atlas-theme"); if (saved === "dark" || saved === "light") return saved; } catch { /* 忽略存储不可用 */ }
  return "auto";
}
function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "auto") delete root.dataset.theme; else root.dataset.theme = mode;
  const resolved = mode === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  $("theme-toggle").dataset.mode = mode;
  $("theme-label").textContent = THEME_TEXT[mode];
  $("theme-toggle").setAttribute("aria-label", `主题模式：${mode === "auto" ? "跟随系统" : mode === "dark" ? "深色" : "浅色"}，当前生效 ${resolved === "dark" ? "深色" : "浅色"}`);
  try { if (mode === "auto") localStorage.removeItem("atlas-theme"); else localStorage.setItem("atlas-theme", mode); } catch { /* 忽略 */ }
  if (store.projects.length) renderStatusRing();
}
function cycleTheme() {
  const order = ["auto", "light", "dark"];
  const next = order[(order.indexOf(currentTheme()) + 1) % order.length];
  applyTheme(next);
  msg(`主题已切换为${next === "auto" ? "跟随系统" : next === "dark" ? "深色" : "浅色"}`);
}

/* ---------- CSV ---------- */
function downloadCSV() {
  const headers = ["Vercel Project", "Category", "GitHub Repo", "Visibility", "Deployment State", "Target", "Deployed At", "Evidence", "Summary", "Risk", "Next Action"];
  const rows = store.projects.map((p) => [p.name, categoryName(p.category), p.github?.full_name || "", privacyOf(p), STATES[stateOf(p)]?.label || stateOf(p), targetKey(p), p.last_deployment?.created_at || "", EVIDENCE[evidenceOf(p)].label, p.summary, p.risk, p.next]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `vercel-projects-${store.manifest.generated_at}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  msg(`已导出 ${store.projects.length} 条快照记录`);
}

/* ---------- 滚动定位 ---------- */
function watchSections() {
  const links = Array.from(document.querySelectorAll("#rail-nav a"));
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((a) => {
      const active = a.getAttribute("href") === `#${visible.target.id}`;
      if (active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }, { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.25, 0.6] });
  sections.forEach((s) => observer.observe(s));
}

/* ---------- 启动 ---------- */
async function loadData() {
  const manifestRes = await fetch("./data/manifest.json", { cache: "no-store" });
  if (!manifestRes.ok) throw new Error(`manifest HTTP ${manifestRes.status}`);
  store.manifest = await manifestRes.json();
  const groups = await Promise.all(store.manifest.groups.map(async (g) => {
    const res = await fetch(`./data/groups/${g.id}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${g.id} HTTP ${res.status}`);
    const data = await res.json();
    if (data.category !== g.id || !Array.isArray(data.projects)) throw new Error(`Invalid group ${g.id}`);
    return data.projects;
  }));
  store.projects = groups.flat();
}
function renderAll() {
  const queueCount = renderQueue();
  renderKpis(queueCount);
  renderStatusRing();
  renderTargetChart();
  renderCategoryChart();
  renderEvidenceChart();
  renderStaleness();
  renderSnapshotFacts();
  renderToolbar();
  syncSortIndicators();
  renderProjects();
}
function showLoadError(error) {
  const root = $("project-state");
  const box = el("div", "state-msg");
  box.append(el("h3", "", "项目数据读取失败"), el("p", "", `${error.message}。请确认 data/ 快照已随站点发布（npm run build 产物包含 dist/data/）。`));
  const retry = el("button", "btn btn-primary", "重新加载");
  retry.type = "button";
  retry.addEventListener("click", () => window.location.reload());
  box.append(retry);
  root.replaceChildren(box);
  root.removeAttribute("aria-busy");
  $("kpi-grid").removeAttribute("aria-busy");
  msg("项目数据读取失败");
}
async function start() {
  try {
    await loadData();
  } catch (error) {
    showLoadError(error);
    return;
  }
  $("rail-snapshot").textContent = store.manifest.generated_at;
  $("cmd-snapshot").textContent = store.manifest.generated_at;
  $("rail-scope").textContent = `${store.projects.length} 个项目 / ${uniqueRepoCount()} 个仓库`;
  $("project-state").replaceChildren();
  $("project-state").hidden = true;
  $("kpi-grid").removeAttribute("aria-busy");
  renderAll();
  watchSections();
  const wanted = new URL(window.location.href).searchParams.get("project");
  const selected = store.projects.find((p) => p.name === wanted);
  if (selected) openDetail(selected);
}

$("search-input").addEventListener("input", (event) => { store.query = event.target.value; renderProjects(); });
$("status-filter").addEventListener("change", (event) => { store.status = event.target.value; renderProjects(); });
$("privacy-filter").addEventListener("change", (event) => { store.privacy = event.target.value; renderProjects(); });
$("evidence-filter").addEventListener("change", (event) => { store.evidence = event.target.value; renderProjects(); });
$("sort-select").addEventListener("change", (event) => { store.sort = event.target.value; store.dir = 1; syncSortIndicators(); renderProjects(); });
$("clear-filters").addEventListener("click", () => {
  store.category = "all"; store.status = "all"; store.privacy = "all"; store.evidence = "all"; store.query = "";
  $("search-input").value = ""; $("status-filter").value = "all"; $("privacy-filter").value = "all"; $("evidence-filter").value = "all";
  renderToolbar(); renderProjects(); msg("已清除全部筛选");
});
$("export-csv").addEventListener("click", downloadCSV);
$("drawer-close").addEventListener("click", closeDetail);
$("drawer-overlay").addEventListener("click", closeDetail);
$("theme-toggle").addEventListener("click", cycleTheme);
document.querySelectorAll("#project-table th[data-sort] button").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.closest("th").dataset.sort;
    store.dir = store.sort === key ? -store.dir : 1;
    store.sort = key;
    $("sort-select").value = key;
    syncSortIndicators();
    renderProjects();
  });
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (currentTheme() === "auto") applyTheme("auto"); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("inspector").classList.contains("open")) { closeDetail(); return; }
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) && !event.ctrlKey && !event.metaKey) {
    event.preventDefault(); $("search-input").focus(); return;
  }
  if (event.key === "Tab" && $("inspector").classList.contains("open")) {
    const focusables = Array.from($("inspector").querySelectorAll("a[href],button:not([disabled])"));
    if (!focusables.length) return;
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

applyTheme(currentTheme());
start();
