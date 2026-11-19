/* 浏览器内验证探针：由 scripts/ui-check.mjs 注入到 dist 的临时页面中执行。
   它独立重算期望值（直接读 data/*.json），再与渲染结果比对，避免"用实现验证实现"。 */
(async () => {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass: !!pass, detail: detail === undefined ? "" : String(detail) });
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, timeout) {
    const start = Date.now();
    for (;;) {
      let value;
      try { value = fn(); } catch { value = null; }
      if (value) return value;
      if (Date.now() - start > (timeout || 12000)) throw new Error("timeout");
      await wait(60);
    }
  }
  const parseColor = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return parts.length >= 3 ? { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 } : null;
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((m, n) => n - m); return (hi + 0.05) / (lo + 0.05); };
  const bgOf = (node) => {
    let cur = node;
    while (cur && cur !== document.documentElement) {
      const c = parseColor(getComputedStyle(cur).backgroundColor);
      if (c && c.a > 0.95) return c;
      cur = cur.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor);
  };
  const visible = (node) => { const r = node.getBoundingClientRect(); const s = getComputedStyle(node); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };

  /* ---------- 独立重算期望值 ---------- */
  const manifest = await (await fetch("./data/manifest.json", { cache: "no-store" })).json();
  const groups = await Promise.all(manifest.groups.map((g) => fetch(`./data/groups/${g.id}.json`, { cache: "no-store" }).then((r) => r.json())));
  const projects = groups.flatMap((g) => g.projects);
  const stateOf = (p) => (p.last_deployment && p.last_deployment.state) || "NONE";
  const uniqueRepos = new Set(projects.filter((p) => p.github).map((p) => p.github.full_name.toLowerCase())).size;
  const expected = {
    projects: projects.length,
    linked: projects.filter((p) => p.github).length,
    uniqueRepos,
    private: projects.filter((p) => p.github && p.github.visibility === "private").length,
    public: projects.filter((p) => p.github && p.github.visibility === "public").length,
    ready: projects.filter((p) => stateOf(p) === "READY").length,
    queue: projects.filter((p) => {
      const r = p.review || {};
      return stateOf(p) === "ERROR" || stateOf(p) === "BLOCKED" || r.release_status === "NOT_MERGED" || r.rights_verified === false || !p.last_deployment || (p.last_deployment && p.last_deployment.target !== "production");
    }).length,
    blocked: projects.filter((p) => stateOf(p) === "BLOCKED").map((p) => p.name),
  };

  try {
    await until(() => !$("#project-state") || $("#project-state").hidden, 15000);
    await until(() => $$("#project-body tr").length > 0, 15000);

    /* ---------- 渲染内容 ---------- */
    add("kpi.projects", $("#kpi-projects").textContent.trim() === String(expected.projects), $("#kpi-projects").textContent);
    add("kpi.links", $("#kpi-links").textContent.trim() === String(expected.linked), $("#kpi-links").textContent);
    add("kpi.uniqueRepos", $("#kpi-repos").textContent.trim() === String(expected.uniqueRepos), $("#kpi-repos").textContent);
    add("kpi.visibility", $("#kpi-visibility").textContent.trim() === `${expected.private} / ${expected.public}`, $("#kpi-visibility").textContent);
    add("kpi.ready", $("#kpi-ready").textContent.includes(String(expected.ready)), $("#kpi-ready").textContent);
    add("kpi.queue", $("#kpi-attention").textContent.trim() === String(expected.queue), `${$("#kpi-attention").textContent} vs ${expected.queue}`);
    add("grid.rows", $$("#project-body tr").length === expected.projects, $$("#project-body tr").length);
    add("grid.cards", $$("#project-cards .card").length === expected.projects, $$("#project-cards .card").length);
    add("grid.resultsCount", $("#results-count").textContent.trim() === String(expected.projects), $("#results-count").textContent);
    add("queue.rows", $$("#queue-list .queue-row").length === expected.queue, `${$$("#queue-list .queue-row").length} vs ${expected.queue}`);
    add("queue.blockedListed", expected.blocked.every((name) => $$("#queue-list .queue-name").some((n) => n.textContent === name)), expected.blocked.join(","));
    add("legend.counts", $$("#status-legend .legend-row").length > 0 && $$("#status-legend .legend-row").every((r) => /^\d+$/.test($("b", r).textContent.trim())), $$("#status-legend .legend-row").length);

    /* ---------- 图表几何 ---------- */
    const bars = $$("#category-chart .bar-row");
    add("chart.categoryRows", bars.length === manifest.groups.length, bars.length);
    const widths = bars.map((b) => $("#category-chart .bar-fill", b).style.width);
    add("chart.barsProportional", widths.every((w) => /%$/.test(w)) && widths.some((w) => parseFloat(w) === 100), widths.join("|"));
    const segSum = (id) => $$(`${id} .segment`).reduce((sum, s) => sum + s.getBoundingClientRect().width, 0);
    const segBar = $("#evidence-bar");
    add("chart.evidenceSegmentsFull", Math.abs(segSum("#evidence-bar") - segBar.getBoundingClientRect().width) < 2, `${segSum("#evidence-bar").toFixed(1)} / ${segBar.getBoundingClientRect().width.toFixed(1)}`);
    add("chart.stalenessSegmentsFull", Math.abs(segSum("#staleness-bar") - $("#staleness-bar").getBoundingClientRect().width) < 2, segSum("#staleness-bar").toFixed(1));
    add("chart.ringPainted", /conic-gradient/.test($("#status-ring").style.background) && $("#status-ring").style.background.split(",").length >= 2, $("#status-ring").style.background.slice(0, 70));
    const productionCount = projects.filter((p) => p.last_deployment && p.last_deployment.target === "production").length;
    add("copy.targetFootnoteFromData", $("#target-foot").textContent.includes(String(productionCount)), $("#target-foot").textContent);
    add("copy.snapshotFootnoteFromData", $("#snapshot-foot").textContent.includes(manifest.generated_at), $("#snapshot-foot").textContent);
    add("copy.noHardcodedSnapshotDate", !/\b2026-11-19\b/.test($("#snapshot-foot").textContent.replace(manifest.generated_at, "")), $("#snapshot-foot").textContent);

    /* ---------- 布局 ---------- */
    const doc = document.scrollingElement;
    add("layout.noHorizontalOverflow", doc.scrollWidth <= window.innerWidth + 1, `scrollWidth ${doc.scrollWidth} vs vw ${window.innerWidth}`);
    const wrap = $("#table-wrap");
    if (visible(wrap)) add("layout.tableScrollsInternally", wrap.scrollWidth >= wrap.clientWidth, `${wrap.scrollWidth}/${wrap.clientWidth}`);
    const cmd = $(".commandbar").getBoundingClientRect();
    const railRect = $(".rail").getBoundingClientRect();
    const railIsTopBar = railRect.height < window.innerHeight * 0.3 && railRect.top <= 1;
    const expectedTop = railIsTopBar ? railRect.height : 0;
    add("layout.commandbarStickyVisible", cmd.height > 0 && Math.abs(cmd.top - expectedTop) <= 2, `top ${cmd.top.toFixed(1)}，预期 ${expectedTop}（${railIsTopBar ? "窄屏 rail 为顶部横条" : "宽屏 rail 为左栏"}）`);

    /* ---------- 焦点不被遮挡（WCAG 2.2 Focus Not Obscured）---------- */
    const targets = $$("#projects .row-open, #queue-list .queue-name, #project-cards .row-open").slice(0, 12).filter(visible);
    const obscured = [];
    const stickyEdges = () => {
      const rects = [$(".commandbar").getBoundingClientRect()];
      const railRect = $(".rail").getBoundingClientRect();
      if (railRect.height < window.innerHeight * 0.3 && railRect.top <= 1) rects.push(railRect);
      return rects;
    };
    const label = (node) => `${node.className.split(" ")[0]}:${(node.textContent || node.tagName).trim().slice(0, 16)}`;
    for (const node of targets) {
      node.scrollIntoView({ block: "start" });
      node.focus();
      await wait(40);
      const r = node.getBoundingClientRect();
      const hidden = stickyEdges().reduce((acc, bar) => Math.max(acc, Math.min(r.bottom, bar.bottom) - Math.max(r.top, bar.top)), 0);
      if (hidden > 0.5) obscured.push(`${label(node)}@${r.top.toFixed(0)}`);
    }
    add("a11y.focusNotObscuredByStickyBar", obscured.length === 0, `${targets.length} 个控件${obscured.length ? " 被粘性元素遮挡: " + obscured.join(" | ") : " 聚焦后均在粘性栏之下"}`);
    add("a11y.scrollPaddingCompensates", (() => { const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop); const stack = expectedTop + cmd.height; return pad >= stack - 1; })(), `scroll-padding ${getComputedStyle(document.documentElement).scrollPaddingTop} vs 粘性堆叠高度`);

    /* ---------- 计算样式对比度（渲染后实测） ---------- */
    const samples = [".kpi-label", ".kpi-foot", ".kpi-value", ".legend-row span", ".legend-row em", ".panel-foot", ".bar-label", ".bar-value", ".cell-summary", ".cell-flag", ".cell-time", ".state", ".tag", ".queue-next", ".results-bar p", ".section-note", ".rail-nav a", ".rail-note", ".footer", ".method-grid p"];
    const low = [];
    let sampled = 0;
    for (const sel of samples) {
      for (const node of $$(sel).slice(0, 3)) {
        if (!visible(node) || !node.textContent.trim()) continue;
        const style = getComputedStyle(node);
        const fg = parseColor(style.color);
        const bg = bgOf(node);
        if (!fg || !bg) continue;
        const size = parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        const min = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        const r = ratio(fg, bg);
        sampled += 1;
        if (r < min - 0.02) low.push(`${sel} ${r.toFixed(2)}<${min}`);
      }
    }
    add("a11y.renderedContrast", low.length === 0, `${sampled} 个采样点${low.length ? " 不合格: " + low.join(" | ") : " 全部达标"}`);

    /* ---------- 语义与排序 ---------- */
    const sortHeader = $$("#project-table th[data-sort]").find((th) => th.dataset.sort === "name");
    add("a11y.sortableHeaderMarked", $$("#project-table th[aria-sort]").length === 1, $$("#project-table th[aria-sort]").length);
    add("a11y.categoryChipPressed", $$("#category-filters .chip[aria-pressed='true']").length === 1, $$("#category-filters .chip[aria-pressed='true']").length);
    const firstBefore = $(".row-open", $("#project-body tr")).textContent;
    $("button", sortHeader).click();
    await wait(60);
    const firstAfter = $(".row-open", $("#project-body tr")).textContent;
    const maxName = projects.map((p) => p.name).sort().at(-1);
    add("interaction.sortToggles", sortHeader.getAttribute("aria-sort") === "descending" && firstAfter === maxName && firstBefore !== firstAfter, `${firstBefore} → ${firstAfter} (want ${maxName})`);
    const search = $("#search-input");
    search.value = "energy";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(80);
    const energyExpected = projects.filter((p) => [p.name, p.github && p.github.full_name, p.summary, p.stack, p.risk, p.next].join(" ").toLowerCase().includes("energy")).length;
    add("interaction.searchFilters", $$("#project-body tr").length === energyExpected && energyExpected > 0, `${$$("#project-body tr").length} vs ${energyExpected}`);
    const statusSelect = $("#status-filter");
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    statusSelect.value = "BLOCKED";
    statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
    add("interaction.statusFilter", $$("#project-body tr").length === expected.blocked.length, $$("#project-body tr").length);
    $("#clear-filters").click();
    await wait(80);
    add("interaction.clearFilters", $$("#project-body tr").length === expected.projects && $("#results-active").textContent.trim() === "", $$("#project-body tr").length);

    /* ---------- 抽屉 ---------- */
    const opener = $$("#project-body tr .row-open")[0];
    const targetName = opener.textContent;
    const focusedBefore = document.activeElement;
    opener.focus();
    opener.click();
    await wait(120);
    const inspector = $("#inspector");
    add("drawer.opens", inspector.classList.contains("open") && inspector.getAttribute("aria-hidden") === "false" && $("h2", inspector).textContent === targetName, $("h2", inspector).textContent);
    add("drawer.deepLink", new URL(location.href).searchParams.get("project") === targetName, location.search);
    add("drawer.focusMovedInside", inspector.contains(document.activeElement), document.activeElement.tagName);
    const detailContrast = (() => {
      const bad = [];
      for (const node of $$("#inspector-content p, #inspector-content dd, #inspector-content dt").slice(0, 20)) {
        const style = getComputedStyle(node);
        const fg = parseColor(style.color), bg = bgOf(node);
        if (!fg || !bg) continue;
        const min = parseFloat(style.fontSize) >= 24 ? 3 : 4.5;
        if (ratio(fg, bg) < min - 0.02) bad.push(`${node.className || node.tagName} ${ratio(fg, bg).toFixed(2)}`);
      }
      return bad;
    })();
    add("drawer.contrast", detailContrast.length === 0, detailContrast.join(" | ") || "ok");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
    add("drawer.escapeCloses", !inspector.classList.contains("open") && inspector.getAttribute("aria-hidden") === "true" && !new URL(location.href).searchParams.get("project"), `focus=${document.activeElement === focusedBefore ? "restored" : document.activeElement.tagName}`);

    /* ---------- 主题 ---------- */
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const bodyFg = getComputedStyle(document.body).color;
    const theme = document.documentElement.dataset.theme || "auto";
    const dark = theme === "dark";
    add("theme.backgroundToken", dark ? bodyBg === "rgb(7, 11, 20)" : bodyBg === "rgb(245, 246, 250)", `${theme}: ${bodyBg}`);
    add("theme.textToken", dark ? bodyFg === "rgb(233, 237, 246)" : bodyFg === "rgb(20, 27, 46)", `${theme}: ${bodyFg}`);
    const alphaZero = $$("body *").filter((n) => visible(n) && getComputedStyle(n).backgroundColor === "rgba(0, 0, 0, 0)").length;
    add("theme.surfacesPainted", alphaZero < $$("body *").length, `${alphaZero} 个透明元素`);
  } catch (error) {
    add("harness.completed", false, error.message);
  }

  const passed = checks.filter((c) => c.pass).length;
  const report = { viewport: `${window.innerWidth}x${window.innerHeight}`, theme: document.documentElement.dataset.theme || "auto", passed, total: checks.length, failures: checks.filter((c) => !c.pass), checks };
  const pre = document.createElement("pre");
  pre.id = "verify-report";
  pre.textContent = JSON.stringify(report, null, 1);
  pre.style.cssText = "position:fixed;left:0;top:0;z-index:999;opacity:.01;pointer-events:none;max-width:10px;height:1px;overflow:hidden";
  document.body.append(pre);
  document.title = `${report.passed}/${report.total} ${report.failures.length ? "FAIL" : "PASS"} @${report.viewport}`;
})();
