(() => {
  "use strict";

  const MAX_RENDERED_RESULTS = 2_000;
  const MAX_DETAIL_CHARS = 24_000;
  const MAX_HIGHLIGHTED_RAW_CHARS = 4 * 1024 * 1024;
  const CATEGORY_ORDER = { error: 0, failed: 1, skipped: 2, passed: 3 };
  const LABELS = { error: "Error", failed: "Failed", skipped: "Skipped", passed: "Passed" };
  const ICONS = { error: "x-circle", failed: "x-circle", skipped: "clock", passed: "check-circle" };
  const ROOT_PATTERN = /^<(?:[A-Za-z_][\w.-]*:)?(testsuites|testsuite)(?=[\s/>])/;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function icon(name) {
    const safeName = /^[a-z-]+$/.test(name) ? name : "file";
    return `<span class="octicon icon-${safeName}" aria-hidden="true"></span>`;
  }

  function formatSeconds(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    if (seconds === 0) return "0 s";
    if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
    if (seconds < 60) return `${Number(seconds.toFixed(2))} s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} m ${Number((seconds - minutes * 60).toFixed(1))} s`;
  }

  /**
   * Returns the root element name ("testsuites" | "testsuite") when the text is a
   * JUnit-shaped document, or "" otherwise. Only the root element is inspected, so
   * arbitrary XML (or a file merely named results.xml) is never recognized.
   */
  function detect(value) {
    let text = String(value ?? "").replace(/^\uFEFF/, "");
    for (;;) {
      const before = text;
      text = text
        .replace(/^\s+/, "")
        .replace(/^<\?[\s\S]*?\?>/, "")
        .replace(/^<!--[\s\S]*?-->/, "")
        .replace(/^<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>/i, "");
      if (text === before) break;
    }
    return ROOT_PATTERN.exec(text)?.[1] ?? "";
  }

  function children(element, localName) {
    return [...element.children].filter((child) => child.localName === localName);
  }

  function text(element) {
    return element?.textContent ?? "";
  }

  function seconds(element) {
    const raw = element.getAttribute("time");
    if (raw === null || raw.trim() === "") return null;
    const trimmed = raw.trim();
    if (!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }

  function sentence(...parts) {
    return parts.filter((part) => part && String(part).trim()).join(": ");
  }

  function outcomeOf(testcase) {
    const error = children(testcase, "error")[0];
    const failure = children(testcase, "failure")[0];
    const skipped = children(testcase, "skipped")[0];
    if (error) return { category: "error", node: error };
    if (failure) return { category: "failed", node: failure };
    if (skipped) return { category: "skipped", node: skipped };
    return { category: "passed", node: null };
  }

  function parseReport(value) {
    const source = String(value ?? "").replace(/^\uFEFF/, "");
    const rootName = detect(source);
    if (!rootName) throw new Error("The document is not a JUnit testsuites or testsuite report.");
    if (/<!ENTITY/i.test(source) || /<!DOCTYPE[^>]*\[/i.test(source)) {
      throw new Error("Reports with DTD declarations are not rendered. View the XML source instead.");
    }
    const document = new DOMParser().parseFromString(source, "application/xml");
    const parserError = document.getElementsByTagName("parsererror")[0];
    if (parserError || !document.documentElement) {
      const detail = String(parserError?.textContent ?? "").trim().split("\n")[0];
      throw new Error(detail || "The JUnit XML is not well formed.");
    }
    const root = document.documentElement;
    if (root.localName !== "testsuites" && root.localName !== "testsuite") {
      throw new Error("The root element is not a JUnit testsuites or testsuite element.");
    }

    const results = [];
    const suites = [];
    const topSuites = root.localName === "testsuite" ? [root] : children(root, "testsuite");

    function visit(element, path) {
      if (element.localName === "testsuite") {
        const name = element.getAttribute("name") || "";
        const next = name ? [...path, name] : path;
        const stdout = children(element, "system-out").map(text).join("\n").trim();
        const stderr = children(element, "system-err").map(text).join("\n").trim();
        if (stdout || stderr) suites.push({ name: next.join(" / ") || "Test suite", stdout, stderr });
        for (const child of element.children) visit(child, next);
        return;
      }
      if (element.localName === "testcase") {
        const { category, node } = outcomeOf(element);
        const stdout = children(element, "system-out").map(text).join("\n").trim();
        const stderr = children(element, "system-err").map(text).join("\n").trim();
        results.push({
          name: element.getAttribute("name") || "(unnamed test)",
          className: element.getAttribute("classname") || "",
          suite: path.join(" / "),
          category,
          seconds: seconds(element),
          type: node?.getAttribute("type") || "",
          message: node?.getAttribute("message") || "",
          body: node ? text(node).trim() : "",
          stdout,
          stderr,
        });
        return;
      }
      if (element.localName === "testsuites") {
        for (const child of element.children) visit(child, path);
      }
    }
    for (const suite of topSuites) visit(suite, []);

    const counts = { passed: 0, failed: 0, error: 0, skipped: 0 };
    let caseSeconds = 0;
    let allTimed = results.length > 0;
    for (const result of results) {
      counts[result.category] += 1;
      if (result.seconds === null) allTimed = false;
      else caseSeconds += result.seconds;
    }
    if (!allTimed) caseSeconds = null;
    const declaredTotal = Number(root.getAttribute("tests"));
    let elapsed = seconds(root);
    if (elapsed === null) {
      const top = topSuites.map(seconds);
      elapsed = top.length > 0 && top.every((item) => item !== null)
        ? top.reduce((sum, item) => sum + item, 0)
        : caseSeconds;
    }
    return {
      name: root.getAttribute("name") || (topSuites[0]?.getAttribute("name") ?? "") || "JUnit report",
      results,
      suites,
      counts,
      total: results.length,
      declaredTotal: Number.isFinite(declaredTotal) && root.hasAttribute("tests") ? declaredTotal : null,
      elapsed,
      caseSeconds,
    };
  }

  function block(label, value) {
    if (!value) return "";
    const truncated = value.length > MAX_DETAIL_CHARS;
    return `
      <section class="trx-output-block">
        <h4>${escapeHtml(label)}</h4>
        <pre>${escapeHtml(truncated ? value.slice(0, MAX_DETAIL_CHARS) : value)}</pre>
        ${truncated ? `<p class="trx-truncation-note">Output truncated after ${MAX_DETAIL_CHARS.toLocaleString()} characters. View the XML source for the full value.</p>` : ""}
      </section>`;
  }

  function renderResult(result, open) {
    const secondary = [result.suite, result.className].filter(Boolean).join(" | ");
    const summary = sentence(result.type, result.message);
    const details = [
      result.category === "skipped"
        ? block("Skipped", result.message || result.body)
        : block(result.category === "error" ? "Error" : "Failure", sentence(summary, result.body && result.body !== result.message ? `\n${result.body}` : "")),
      block("Standard output", result.stdout),
      block("Standard error", result.stderr),
    ].join("");
    const searchValue = [result.name, result.className, result.suite, result.category, result.type, result.message]
      .join(" ")
      .toLocaleLowerCase();
    return `
      <details class="trx-result trx-outcome-${result.category}" data-trx-result
        data-trx-category="${result.category}" data-trx-search="${escapeHtml(searchValue)}" ${open ? "open" : ""}>
        <summary>
          <span class="trx-result-chevron">${icon("chevron-right")}</span>
          <span class="trx-result-status">${icon(ICONS[result.category])}</span>
          <span class="trx-result-copy">
            <span class="trx-result-name">${escapeHtml(result.name)}</span>
            ${secondary ? `<span class="trx-result-secondary">${escapeHtml(secondary)}</span>` : ""}
          </span>
          <span class="trx-result-duration">${escapeHtml(result.seconds === null ? "" : formatSeconds(result.seconds))}</span>
          <span class="trx-outcome-badge trx-outcome-${result.category === "error" ? "failed" : result.category}">${LABELS[result.category]}</span>
        </summary>
        <div class="trx-result-details">
          ${details || '<p class="trx-detail-empty">No additional details were recorded for this result.</p>'}
        </div>
      </details>`;
  }

  function metric(label, value, category, iconName) {
    return `
      <div class="trx-metric trx-metric-${category}">
        <span class="trx-metric-icon">${icon(iconName)}</span>
        <span class="trx-metric-value">${Number(value).toLocaleString()}</span>
        <span class="trx-metric-label">${escapeHtml(label)}</span>
      </div>`;
  }

  function filter(label, category, count, pressed = false) {
    return `
      <button class="trx-filter" type="button" data-trx-filter="${category}" aria-pressed="${pressed}">
        ${escapeHtml(label)}
        <span class="Counter Counter--secondary">${Number(count).toLocaleString()}</span>
      </button>`;
  }

  function sourcePanel(source, highlightXml, attrs, back) {
    const highlighted = source.length <= MAX_HIGHLIGHTED_RAW_CHARS ? highlightXml(source) : escapeHtml(source);
    return `
      <section class="trx-raw-panel" ${attrs}>
        <div class="trx-section-heading">
          <div><span class="trx-eyebrow">Source</span><h3>XML source</h3></div>
          ${back ? `<button class="app-button app-button-small" type="button" data-trx-view="structured">${icon("chevron-left")} Back to results</button>` : ""}
        </div>
        <pre class="text-preview syntax-code syntax-xml trx-raw-source"><code>${highlighted}</code></pre>
      </section>`;
  }

  function renderError(source, message, highlightXml) {
    return `
      <div class="trx-preview" data-junit="error">
        <section class="trx-error" role="alert">
          <span class="trx-error-icon">${icon("x-circle")}</span>
          <div>
            <h2>Unable to read this JUnit report</h2>
            <p>${escapeHtml(message)}</p>
          </div>
        </section>
        ${sourcePanel(source, highlightXml, "", false)}
      </div>`;
  }

  function render(value, preview, helpers = {}) {
    const source = String(value ?? "");
    const highlightXml = typeof helpers.highlightXml === "function" ? helpers.highlightXml : escapeHtml;
    let report;
    try {
      report = parseReport(source);
    } catch (error) {
      preview.innerHTML = renderError(source, error instanceof Error ? error.message : "The JUnit XML is invalid.", highlightXml);
      return;
    }
    const sorted = report.results
      .map((result, index) => ({ result, index }))
      .sort((a, b) => CATEGORY_ORDER[a.result.category] - CATEGORY_ORDER[b.result.category] || a.index - b.index)
      .slice(0, MAX_RENDERED_RESULTS)
      .map(({ result }) => result);
    const bad = report.counts.error + report.counts.failed;
    const allSkipped = report.total > 0 && report.counts.skipped === report.total;
    const outcome = bad > 0 ? "failed" : report.total === 0 || allSkipped ? "skipped" : "passed";
    const outcomeLabel = bad > 0 ? "Failed" : report.total === 0 ? "No tests" : allSkipped ? "Skipped" : "Passed";
    const mismatch = report.declaredTotal !== null && report.declaredTotal !== report.total
      ? `<div class="trx-limit-note">${icon("eye")} The report declares ${report.declaredTotal.toLocaleString()} tests but contains ${report.total.toLocaleString()} test cases. Totals below are counted from the test cases.</div>`
      : "";
    const limited = sorted.length < report.results.length;
    const suiteOutput = report.suites.map((suite) => `
      <details class="trx-result" data-junit-suite>
        <summary>
          <span class="trx-result-chevron">${icon("chevron-right")}</span>
          <span class="trx-result-status">${icon("terminal")}</span>
          <span class="trx-result-copy"><span class="trx-result-name">${escapeHtml(suite.name)}</span></span>
        </summary>
        <div class="trx-result-details">${block("Standard output", suite.stdout)}${block("Standard error", suite.stderr)}</div>
      </details>`).join("");

    preview.innerHTML = `
      <div class="trx-preview" data-junit="report" data-trx-total="${report.total}" data-trx-rendered="${sorted.length}">
        <div data-trx-panel="structured">
          <section class="trx-overview">
            <div class="trx-run-heading">
              <div><span class="trx-eyebrow">JUnit report</span><h2>${escapeHtml(report.name)}</h2></div>
              <span class="trx-run-outcome trx-outcome-${outcome}">${icon(ICONS[outcome === "failed" ? "failed" : outcome])} ${outcomeLabel}</span>
            </div>
            <div class="trx-metrics">
              ${metric("Total", report.total, "all", "workflow")}
              ${metric("Passed", report.counts.passed, "passed", "check-circle")}
              ${metric("Failed", report.counts.failed, "failed", "x-circle")}
              ${metric("Errors", report.counts.error, "failed", "x-circle")}
              ${metric("Skipped", report.counts.skipped, "skipped", "clock")}
            </div>
            <dl class="trx-run-metadata">
              <div class="trx-meta-item"><dt>Elapsed</dt>              <dd data-junit-elapsed>${escapeHtml(formatSeconds(report.elapsed) || "Not recorded")}</dd></div>
                            <div class="trx-meta-item"><dt>Test time</dt><dd data-junit-test-time>${escapeHtml(formatSeconds(report.caseSeconds) || "Not recorded")}</dd></div>
            </dl>
            ${mismatch}
          </section>
          <section class="trx-results-panel">
            <div class="trx-section-heading">
              <div><span class="trx-eyebrow">Details</span><h3>Test results</h3><p data-trx-result-count aria-live="polite"></p></div>
              <button class="app-button app-button-small" type="button" data-trx-view="raw">${icon("code")} View XML source</button>
            </div>
            <div class="trx-controls">
              <label class="trx-search">
                ${icon("search")}
                <span class="sr-only">Search test results</span>
                <input class="form-control" type="search" placeholder="Search tests..." autocomplete="off" data-trx-search-input />
              </label>
              <div class="trx-filters" role="group" aria-label="Filter test outcomes">
                ${filter("All", "all", report.total, true)}
                ${filter("Passed", "passed", report.counts.passed)}
                ${filter("Failed", "failed", report.counts.failed)}
                ${filter("Errors", "error", report.counts.error)}
                ${filter("Skipped", "skipped", report.counts.skipped)}
              </div>
            </div>
            ${limited ? `<div class="trx-limit-note">${icon("eye")} Showing the first ${sorted.length.toLocaleString()} of ${report.total.toLocaleString()} test cases. The XML source contains the complete report.</div>` : ""}
            <div class="trx-result-list">${sorted.map((result, index) => renderResult(result, index === 0 && CATEGORY_ORDER[result.category] < 2)).join("")}</div>
            <div class="trx-no-results" data-trx-no-results hidden>
              ${icon("search")}<h4>No matching tests</h4><p>Try another search or outcome filter.</p>
            </div>
            ${suiteOutput ? `<div class="trx-section-heading"><div><span class="trx-eyebrow">Suites</span><h3>Suite output</h3></div></div><div class="trx-result-list">${suiteOutput}</div>` : ""}
          </section>
        </div>
        ${sourcePanel(source, highlightXml, 'data-trx-panel="raw" hidden', true)}
      </div>`;
    applyFilters(preview.querySelector(".trx-preview"));
  }

  function showView(preview, viewName) {
    if (!preview) return;
    for (const panel of preview.querySelectorAll("[data-trx-panel]")) {
      panel.hidden = panel.dataset.trxPanel !== viewName;
    }
  }

  function applyFilters(preview) {
    if (!preview) return;
    const phrase = String(preview.querySelector("[data-trx-search-input]")?.value ?? "")
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, " ");
    const category = preview.querySelector('[data-trx-filter][aria-pressed="true"]')?.dataset.trxFilter ?? "all";
    const results = [...preview.querySelectorAll("[data-trx-result]")];
    let visible = 0;
    for (const result of results) {
      const matches = (category === "all" || result.dataset.trxCategory === category) &&
        (result.dataset.trxSearch ?? "").replace(/\s+/g, " ").includes(phrase);
      result.hidden = !matches;
      if (matches) visible += 1;
    }
    const total = Number(preview.dataset.trxTotal) || results.length;
    const count = preview.querySelector("[data-trx-result-count]");
    if (count) count.textContent = `${visible.toLocaleString()} of ${total.toLocaleString()} results`;
    const none = preview.querySelector("[data-trx-no-results]");
    if (none) none.hidden = visible > 0;
  }

  globalThis.JunitPreview = Object.freeze({ applyFilters, detect, parse: parseReport, render, showView });
})();
