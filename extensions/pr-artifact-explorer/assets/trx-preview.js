(() => {
  "use strict";

  const MAX_RENDERED_RESULTS = 2_000;
  const MAX_DETAIL_CHARS = 24_000;
  const MAX_HIGHLIGHTED_RAW_CHARS = 4 * 1024 * 1024;
  const rawSources = new WeakMap();

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

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }

  function elements(parent, localName) {
    if (!parent?.getElementsByTagName) return [];
    return [...parent.getElementsByTagName("*")].filter(
      (element) => element.localName === localName,
    );
  }

  function firstElement(parent, localName) {
    return elements(parent, localName)[0] ?? null;
  }

  function directChild(parent, localName) {
    return (
      [...(parent?.children ?? [])].find(
        (element) => element.localName === localName,
      ) ?? null
    );
  }

  function elementText(element) {
    return String(element?.textContent ?? "").trim();
  }

  function attribute(element, name) {
    return String(element?.getAttribute(name) ?? "").trim();
  }

  function outcomeCategory(outcome) {
    const normalized = String(outcome ?? "")
      .toLocaleLowerCase()
      .replace(/[^a-z]/g, "");
    if (normalized === "passed") return "passed";
    if (
      [
        "failed",
        "error",
        "timeout",
        "aborted",
        "passedbutrunaborted",
        "disconnected",
      ].includes(normalized)
    ) {
      return "failed";
    }
    if (
      ["notexecuted", "notrunnable", "inconclusive", "pending"].includes(
        normalized,
      )
    ) {
      return "skipped";
    }
    return "other";
  }

  function outcomeIcon(category) {
    if (category === "passed") return "check-circle";
    if (category === "failed") return "x-circle";
    if (category === "skipped") return "clock";
    return "workflow";
  }

  function summarizedRunOutcome(report) {
    if (report.summaryCounts.failed > 0) return "Failed";
    if (report.summaryCounts.passed > 0) return "Passed";
    if (report.summaryCounts.skipped > 0) return "Skipped";
    return report.outcome;
  }

  function parseDuration(value) {
    const duration = String(value ?? "").trim();
    if (!duration) return null;

    const clock = duration.match(
      /^(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/,
    );
    if (clock) {
      const [, days = "0", hours, minutes, seconds] = clock;
      return (
        Number(days) * 86_400_000 +
        Number(hours) * 3_600_000 +
        Number(minutes) * 60_000 +
        Number(seconds) * 1_000
      );
    }

    const iso = duration.match(
      /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
    );
    if (!iso) return null;
    const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = iso;
    return (
      Number(days) * 86_400_000 +
      Number(hours) * 3_600_000 +
      Number(minutes) * 60_000 +
      Number(seconds) * 1_000
    );
  }

  function formatDuration(durationMs) {
    if (!Number.isFinite(durationMs)) return "";
    if (durationMs < 1_000) {
      return `${Math.max(0, Math.round(durationMs))} ms`;
    }
    if (durationMs < 60_000) {
      const seconds = durationMs / 1_000;
      return `${seconds
        .toFixed(seconds < 10 ? 2 : 1)
        .replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")} s`;
    }
    if (durationMs < 3_600_000) {
      const minutes = Math.floor(durationMs / 60_000);
      const seconds = Math.floor((durationMs % 60_000) / 1_000);
      return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(durationMs / 3_600_000);
    const minutes = Math.floor((durationMs % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }

  function parseReport(value) {
    const source = String(value ?? "");
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
      throw new Error(
        "DTD and entity declarations are not supported in test result previews.",
      );
    }

    const documentNode = new DOMParser().parseFromString(
      source,
      "application/xml",
    );
    const parserError = [...documentNode.getElementsByTagName("*")].find(
      (element) => element.localName?.toLocaleLowerCase() === "parsererror",
    );
    if (parserError) {
      const detail = elementText(parserError).replace(/\s+/g, " ").slice(0, 240);
      throw new Error(detail || "The XML document is malformed.");
    }

    const root = documentNode.documentElement;
    if (root?.localName !== "TestRun") {
      throw new Error(
        "The XML document does not contain a TRX TestRun root element.",
      );
    }

    const definitions = new Map();
    for (const unitTest of elements(root, "UnitTest")) {
      const testId = attribute(unitTest, "id").toLocaleLowerCase();
      if (!testId) continue;
      const method = firstElement(unitTest, "TestMethod");
      definitions.set(testId, {
        name: attribute(unitTest, "name"),
        className: attribute(method, "className"),
        methodName: attribute(method, "name"),
        codeBase: attribute(method, "codeBase"),
        adapterTypeName: attribute(method, "adapterTypeName"),
      });
    }

    const testLists = new Map();
    for (const testList of elements(root, "TestList")) {
      const id = attribute(testList, "id").toLocaleLowerCase();
      if (id) testLists.set(id, attribute(testList, "name"));
    }

    const results = [];
    const resultsElement = directChild(root, "Results");
    const isResultElement = (element) =>
      element.localName?.endsWith("TestResult") ||
      element.localName === "TestResultAggregation";

    const readResult = (element, depth) => {
      const testId = attribute(element, "testId").toLocaleLowerCase();
      const definition = definitions.get(testId) ?? {};
      const output = directChild(element, "Output");
      const errorInfo = firstElement(output, "ErrorInfo");
      const outcome = attribute(element, "outcome") || "Unknown";
      const testListId = attribute(element, "testListId").toLocaleLowerCase();
      const durationValue = attribute(element, "duration");
      const resultFiles = elements(output, "ResultFile")
        .map((file) => attribute(file, "path"))
        .filter(Boolean);
      const properties = elements(output, "Property")
        .map((property) => {
          const key =
            elementText(directChild(property, "Key")) ||
            attribute(property, "name");
          const propertyValue =
            elementText(directChild(property, "Value")) ||
            attribute(property, "value");
          return key ? { key, value: propertyValue } : null;
        })
        .filter(Boolean);

      return {
        depth,
        outcome,
        category: outcomeCategory(outcome),
        testName:
          attribute(element, "testName") ||
          definition.name ||
          definition.methodName ||
          "Unnamed test",
        className: definition.className || attribute(element, "className"),
        methodName: definition.methodName,
        codeBase: definition.codeBase,
        adapterTypeName: definition.adapterTypeName,
        computerName: attribute(element, "computerName"),
        startTime: attribute(element, "startTime"),
        endTime: attribute(element, "endTime"),
        durationMs: parseDuration(durationValue),
        executionId: attribute(element, "executionId"),
        testId: attribute(element, "testId"),
        testListName: testLists.get(testListId) ?? "",
        dataRowInfo: attribute(element, "dataRowInfo"),
        message: elementText(firstElement(errorInfo, "Message")),
        stackTrace: elementText(firstElement(errorInfo, "StackTrace")),
        stdout: elementText(firstElement(output, "StdOut")),
        stderr: elementText(firstElement(output, "StdErr")),
        debugTrace: elementText(firstElement(output, "DebugTrace")),
        resultFiles,
        properties,
      };
    };

    const visitResults = (parent, depth = 0) => {
      for (const element of parent?.children ?? []) {
        if (!isResultElement(element)) continue;
        results.push(readResult(element, depth));
        const innerResults = directChild(element, "InnerResults");
        if (innerResults) visitResults(innerResults, depth + 1);
      }
    };
    visitResults(resultsElement);

    const countersElement = firstElement(root, "Counters");
    const counters = {};
    for (const counterAttribute of countersElement?.attributes ?? []) {
      const number = Number(counterAttribute.value);
      if (Number.isFinite(number) && number >= 0) {
        counters[counterAttribute.name] = number;
      }
    }

    const resultCounts = results.reduce(
      (counts, result) => {
        counts[result.category] += 1;
        return counts;
      },
      { passed: 0, failed: 0, skipped: 0, other: 0 },
    );
    const sumCounters = (names, fallback) => {
      const values = names
        .filter((name) => Number.isFinite(counters[name]))
        .map((name) => counters[name]);
      return values.length > 0
        ? values.reduce((total, number) => total + number, 0)
        : fallback;
    };

    const times = firstElement(root, "Times");
    const startTime = attribute(times, "start");
    const finishTime = attribute(times, "finish");
    const startTimestamp = new Date(startTime).getTime();
    const finishTimestamp = new Date(finishTime).getTime();
    const durationMs =
      Number.isFinite(startTimestamp) &&
      Number.isFinite(finishTimestamp) &&
      finishTimestamp >= startTimestamp
        ? finishTimestamp - startTimestamp
        : null;
    const summaryElement = firstElement(root, "ResultSummary");

    return {
      name: attribute(root, "name") || "Test run",
      runId: attribute(root, "id"),
      user: attribute(root, "runUser"),
      computerName: attribute(root, "computerName"),
      outcome: attribute(summaryElement, "outcome") || "Unknown",
      startTime,
      finishTime,
      durationMs,
      resultCounts,
      summaryCounts: {
        total: Number.isFinite(counters.total) ? counters.total : results.length,
        passed: sumCounters(["passed"], resultCounts.passed),
        failed: sumCounters(
          [
            "failed",
            "error",
            "timeout",
            "aborted",
            "passedButRunAborted",
            "disconnected",
          ],
          resultCounts.failed,
        ),
        skipped: sumCounters(
          ["notExecuted", "notRunnable", "inconclusive", "pending"],
          resultCounts.skipped,
        ),
      },
      results,
    };
  }

  function renderMetadataItem(label, value, { mono = false } = {}) {
    if (!value) return "";
    return `
      <div class="trx-meta-item">
        <dt>${escapeHtml(label)}</dt>
        <dd${mono ? ' class="mono"' : ""}>${escapeHtml(value)}</dd>
      </div>
    `;
  }

  function truncateDetail(value) {
    const text = String(value ?? "");
    if (text.length <= MAX_DETAIL_CHARS) {
      return { text, truncated: false };
    }
    return {
      text: text.slice(0, MAX_DETAIL_CHARS),
      truncated: true,
    };
  }

  function renderDetailBlock(label, value) {
    if (!value) return "";
    const detail = truncateDetail(value);
    return `
      <section class="trx-output-block">
        <h4>${escapeHtml(label)}</h4>
        <pre>${escapeHtml(detail.text)}</pre>
        ${
          detail.truncated
            ? `<p class="trx-truncation-note">Output truncated after ${MAX_DETAIL_CHARS.toLocaleString()} characters. View the raw XML for the full value.</p>`
            : ""
        }
      </section>
    `;
  }

  function renderResult(result, open = false) {
    const secondaryParts = [];
    if (result.className) secondaryParts.push(result.className);
    if (result.dataRowInfo) secondaryParts.push(`Data row ${result.dataRowInfo}`);
    if (result.category === "failed" && result.message) {
      secondaryParts.push(
        result.message.length > 180
          ? `${result.message.slice(0, 179)}...`
          : result.message,
      );
    }
    const searchValue = [
      result.testName,
      result.className,
      result.methodName,
      result.outcome,
      result.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .slice(0, 2_000);
    const resultDuration = formatDuration(result.durationMs);
    const metadata = [
      renderMetadataItem("Class", result.className, { mono: true }),
      renderMetadataItem("Method", result.methodName, { mono: true }),
      renderMetadataItem("Duration", resultDuration),
      renderMetadataItem("Computer", result.computerName),
      renderMetadataItem(
        "Started",
        result.startTime ? formatDate(result.startTime) : "",
      ),
      renderMetadataItem(
        "Finished",
        result.endTime ? formatDate(result.endTime) : "",
      ),
      renderMetadataItem("Test list", result.testListName),
      renderMetadataItem("Adapter", result.adapterTypeName, { mono: true }),
      renderMetadataItem("Code base", result.codeBase, { mono: true }),
      renderMetadataItem("Test ID", result.testId, { mono: true }),
      renderMetadataItem("Execution ID", result.executionId, { mono: true }),
    ].join("");
    const resultFiles =
      result.resultFiles.length > 0
        ? `
          <section class="trx-result-files">
            <h4>Result files</h4>
            <ul>${result.resultFiles
              .map((path) => `<li class="mono">${escapeHtml(path)}</li>`)
              .join("")}</ul>
          </section>
        `
        : "";
    const properties =
      result.properties.length > 0
        ? `
          <section class="trx-properties">
            <h4>Properties</h4>
            <dl>${result.properties
              .map(
                ({ key, value }) => `
                  <div>
                    <dt>${escapeHtml(key)}</dt>
                    <dd>${escapeHtml(value)}</dd>
                  </div>
                `,
              )
              .join("")}</dl>
          </section>
        `
        : "";
    const details = [
      metadata ? `<dl class="trx-result-metadata">${metadata}</dl>` : "",
      renderDetailBlock("Error message", result.message),
      renderDetailBlock("Stack trace", result.stackTrace),
      renderDetailBlock("Standard output", result.stdout),
      renderDetailBlock("Standard error", result.stderr),
      renderDetailBlock("Debug trace", result.debugTrace),
      resultFiles,
      properties,
    ].join("");

    return `
      <details
        class="trx-result trx-outcome-${result.category}"
        data-trx-result
        data-trx-category="${result.category}"
        data-trx-search="${escapeHtml(searchValue)}"
        style="--trx-depth: ${Math.min(result.depth, 4)}"
        ${open ? "open" : ""}
      >
        <summary>
          <span class="trx-result-chevron">${icon("chevron-right")}</span>
          <span class="trx-result-status">${icon(outcomeIcon(result.category))}</span>
          <span class="trx-result-copy">
            <span class="trx-result-name">${escapeHtml(result.testName)}</span>
            ${
              secondaryParts.length > 0
                ? `<span class="trx-result-secondary">${escapeHtml(secondaryParts.join(" | "))}</span>`
                : ""
            }
          </span>
          <span class="trx-result-duration">${escapeHtml(resultDuration)}</span>
          <span class="trx-outcome-badge trx-outcome-${result.category}">${escapeHtml(result.outcome)}</span>
        </summary>
        <div class="trx-result-details">
          ${details || '<p class="trx-detail-empty">No additional details were recorded for this result.</p>'}
        </div>
      </details>
    `;
  }

  function renderMetric(label, value, category, iconName) {
    return `
      <div class="trx-metric trx-metric-${category}">
        <span class="trx-metric-icon">${icon(iconName)}</span>
        <span class="trx-metric-value">${Number(value).toLocaleString()}</span>
        <span class="trx-metric-label">${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderFilter(label, category, count, pressed = false) {
    return `
      <button
        class="trx-filter"
        type="button"
        data-trx-filter="${category}"
        aria-pressed="${pressed}"
      >
        ${escapeHtml(label)}
        <span class="Counter Counter--secondary">${Number(count).toLocaleString()}</span>
      </button>
    `;
  }

  function renderParseError(source, message, highlightXml) {
    const highlighted =
      source.length <= MAX_HIGHLIGHTED_RAW_CHARS
        ? highlightXml(source)
        : escapeHtml(source);
    return `
      <div class="trx-preview">
        <section class="trx-error" role="alert">
          <span class="trx-error-icon">${icon("x-circle")}</span>
          <div>
            <h2>Unable to parse test results</h2>
            <p>${escapeHtml(message)}</p>
          </div>
        </section>
        <section class="trx-raw-panel">
          <div class="trx-section-heading">
            <div>
              <span class="trx-eyebrow">Fallback</span>
              <h3>Raw XML</h3>
            </div>
          </div>
          <pre class="text-preview syntax-code syntax-xml trx-raw-source"><code>${highlighted}</code></pre>
        </section>
      </div>
    `;
  }

  function render(value, preview, helpers = {}) {
    const source = String(value ?? "");
    const highlightXml =
      typeof helpers.highlightXml === "function"
        ? helpers.highlightXml
        : escapeHtml;
    let report;
    try {
      report = parseReport(source);
    } catch (error) {
      preview.innerHTML = renderParseError(
        source,
        error instanceof Error ? error.message : "The TRX document is invalid.",
        highlightXml,
      );
      return;
    }

    const categoryOrder = { failed: 0, other: 1, skipped: 2, passed: 3 };
    const renderedResults = [...report.results]
      .map((result, index) => ({ result, index }))
      .sort(
        (left, right) =>
          categoryOrder[left.result.category] -
            categoryOrder[right.result.category] || left.index - right.index,
      )
      .slice(0, MAX_RENDERED_RESULTS)
      .map(({ result }) => result);
    const runOutcome = summarizedRunOutcome(report);
    const outcome = outcomeCategory(runOutcome);
    const limited = renderedResults.length < report.results.length;
    const runDuration = formatDuration(report.durationMs);
    const runMetadata = [
      renderMetadataItem(
        "Started",
        report.startTime ? formatDate(report.startTime) : "",
      ),
      renderMetadataItem(
        "Finished",
        report.finishTime ? formatDate(report.finishTime) : "",
      ),
      renderMetadataItem("Duration", runDuration),
      renderMetadataItem("Run by", report.user),
      renderMetadataItem("Computer", report.computerName),
      renderMetadataItem("Run ID", report.runId, { mono: true }),
    ].join("");

    preview.innerHTML = `
      <div
        class="trx-preview"
        data-trx-total="${report.results.length}"
        data-trx-rendered="${renderedResults.length}"
      >
        <div data-trx-panel="structured">
          <section class="trx-overview">
            <div class="trx-run-heading">
              <div>
                <span class="trx-eyebrow">Test run</span>
                <h2>${escapeHtml(report.name)}</h2>
              </div>
              <span class="trx-run-outcome trx-outcome-${outcome}">
                ${icon(outcomeIcon(outcome))}
                ${escapeHtml(runOutcome)}
              </span>
            </div>
            <div class="trx-metrics">
              ${renderMetric("Total", report.summaryCounts.total, "all", "workflow")}
              ${renderMetric("Passed", report.summaryCounts.passed, "passed", "check-circle")}
              ${renderMetric("Failed", report.summaryCounts.failed, "failed", "x-circle")}
              ${renderMetric("Skipped", report.summaryCounts.skipped, "skipped", "clock")}
            </div>
            ${runMetadata ? `<dl class="trx-run-metadata">${runMetadata}</dl>` : ""}
          </section>

          <section class="trx-results-panel">
            <div class="trx-section-heading">
              <div>
                <span class="trx-eyebrow">Details</span>
                <h3>Test results</h3>
                <p data-trx-result-count aria-live="polite"></p>
              </div>
              <button class="app-button app-button-small" type="button" data-trx-view="raw">
                ${icon("code")}
                View raw XML
              </button>
            </div>
            <div class="trx-controls">
              <label class="trx-search">
                ${icon("search")}
                <span class="sr-only">Search test results</span>
                <input
                  class="form-control"
                  type="search"
                  placeholder="Search tests..."
                  autocomplete="off"
                  data-trx-search-input
                />
              </label>
              <div class="trx-filters" role="group" aria-label="Filter test outcomes">
                ${renderFilter("All", "all", report.results.length, true)}
                ${renderFilter("Passed", "passed", report.resultCounts.passed)}
                ${renderFilter("Failed", "failed", report.resultCounts.failed)}
                ${renderFilter("Skipped", "skipped", report.resultCounts.skipped)}
                ${renderFilter("Other", "other", report.resultCounts.other)}
              </div>
            </div>
            ${
              limited
                ? `
                  <div class="trx-limit-note">
                    ${icon("eye")}
                    Showing the first ${renderedResults.length.toLocaleString()} of ${report.results.length.toLocaleString()} result records to keep the preview responsive. Raw XML contains the complete report.
                  </div>
                `
                : ""
            }
            <div class="trx-result-list">
              ${renderedResults
                .map((result, index) =>
                  renderResult(
                    result,
                    index === 0 && result.category === "failed",
                  ),
                )
                .join("")}
            </div>
            <div class="trx-no-results" data-trx-no-results hidden>
              ${icon("search")}
              <h4>No matching tests</h4>
              <p>Try another search or outcome filter.</p>
            </div>
          </section>
        </div>

        <section class="trx-raw-panel" data-trx-panel="raw" hidden>
          <div class="trx-section-heading">
            <div>
              <span class="trx-eyebrow">Source</span>
              <h3>Raw XML</h3>
            </div>
            <button class="app-button app-button-small" type="button" data-trx-view="structured">
              ${icon("chevron-left")}
              Back to results
            </button>
          </div>
          <div class="trx-limit-note" data-trx-raw-note hidden>
            ${icon("eye")}
            Syntax highlighting is disabled for large reports to keep the source view responsive.
          </div>
          <pre class="text-preview syntax-code syntax-xml trx-raw-source"><code data-trx-raw-code></code></pre>
        </section>
      </div>
    `;
    const trxPreview = preview.querySelector(".trx-preview");
    rawSources.set(trxPreview, { source, highlightXml });
    applyFilters(trxPreview);
  }

  function showView(preview, viewName) {
    if (!preview) return;
    if (viewName === "raw") {
      const rawSource = rawSources.get(preview);
      const code = preview.querySelector("[data-trx-raw-code]");
      if (rawSource && code && code.dataset.trxLoaded !== "true") {
        if (rawSource.source.length > MAX_HIGHLIGHTED_RAW_CHARS) {
          code.textContent = rawSource.source;
          const note = preview.querySelector("[data-trx-raw-note]");
          if (note) note.hidden = false;
        } else {
          code.innerHTML = rawSource.highlightXml(rawSource.source);
        }
        code.dataset.trxLoaded = "true";
      }
    }
    for (const panel of preview.querySelectorAll("[data-trx-panel]")) {
      panel.hidden = panel.dataset.trxPanel !== viewName;
    }
  }

  function applyFilters(preview) {
    if (!preview) return;
    const query = String(
      preview.querySelector("[data-trx-search-input]")?.value ?? "",
    )
      .trim()
      .toLocaleLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const category =
      preview.querySelector('[data-trx-filter][aria-pressed="true"]')?.dataset
        .trxFilter ?? "all";
    const results = [...preview.querySelectorAll("[data-trx-result]")];
    let visible = 0;
    for (const result of results) {
      const matchesCategory =
        category === "all" || result.dataset.trxCategory === category;
      const searchValue = result.dataset.trxSearch ?? "";
      const matchesQuery = terms.every((term) => searchValue.includes(term));
      result.hidden = !(matchesCategory && matchesQuery);
      if (!result.hidden) visible += 1;
    }

    const total = Number(preview.dataset.trxTotal) || results.length;
    const rendered = Number(preview.dataset.trxRendered) || results.length;
    const count = preview.querySelector("[data-trx-result-count]");
    if (count) {
      count.textContent =
        total > rendered
          ? `${visible.toLocaleString()} matching in the first ${rendered.toLocaleString()} of ${total.toLocaleString()} results`
          : `${visible.toLocaleString()} of ${total.toLocaleString()} results`;
    }
    const noResults = preview.querySelector("[data-trx-no-results]");
    if (noResults) noResults.hidden = visible > 0;
  }

  globalThis.TrxPreview = Object.freeze({
    applyFilters,
    parse: parseReport,
    render,
    showView,
  });
})();
