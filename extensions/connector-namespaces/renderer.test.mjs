// Regression guards for the connector-catalog renderer.
//
// Run: node --test extensions/connector-namespaces/renderer.test.mjs
//
// These tests exist because two UX bugs kept coming back:
//   1. A `@media (prefers-reduced-motion: reduce)` rule froze functional
//      loaders without a visible fallback. Reduced motion now stops the
//      animation while forcing each loader into a visible static busy state;
//      nearby text continues to communicate progress.
//   2. The "Restart your Copilot session" banner ignoring Dismiss. The real
//      root cause was CSS specificity: `.restart-banner{display:flex}` is an
//      author rule with the same (0,1,0) specificity as the UA
//      `[hidden]{display:none}` rule, so it overrode the hidden attribute and
//      `restartBanner.hidden=true` did nothing. The fix is a global
//      `[hidden]{display:none !important}` reset. A client-side
//      `restartDismissed` flag also keeps a late hydrateState() from re-showing
//      it. The guards below fail if either the CSS reset or the JS gate
//      disappears.

import { test } from "node:test";
import assert from "node:assert/strict";

import { baseStyles, renderCatalogHtml, renderSetupHtml } from "./renderer.mjs";
import { renderCreateNamespaceHtml } from "./createPage.mjs";
import { CATEGORY } from "./categories.mjs";

// Pull the balanced body of the prefers-reduced-motion media block out of a
// stylesheet string (non-greedy regex can't handle the nested rule braces).
// CSS comments are stripped so the guards test declarations rather than prose.
function reducedMotionBlock(css) {
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    if (start === -1) return null;
    const open = css.indexOf("{", start);
    if (open === -1) return null;
    let depth = 0;
    for (let i = open; i < css.length; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}" && --depth === 0) {
            return css.slice(open + 1, i).replace(/\/\*[\s\S]*?\*\//g, "");
        }
    }
    return null;
}

function catalogHtml() {
    return renderCatalogHtml("test-instance", [], {
        filter: "",
        category: "all",
        source: "",
        config: { subscriptionId: "sub", gatewayName: "ns", resourceGroup: "rg" },
    });
}

test("setup subscription label names its select", () => {
    const html = renderSetupHtml([], "", "token");
    assert.match(html, /<label for="sub-select">Subscription<\/label>/);
});

test("load-all and installed-state failures stay visible and fail closed", () => {
    const setup = renderSetupHtml([], "", "token");
    const catalog = catalogHtml();
    assert.match(setup, /if \(data\.error\) throw new Error\(data\.error\)/, "Load all must enter its retryable failure path");
    assert.match(setup, /if \(!await loadAll\(\)\) return/, "filtering must preserve the retry UI after Load all fails");
    assert.match(
        catalog,
        /document\.querySelectorAll\("\.item-add"\)\.forEach\(button => \{ button\.disabled = true; \}\)/,
        "actions must remain disabled until installed state is known",
    );
    assert.match(catalog, /Couldn't load connector state:/, "state failures must be shown to the user");
});

test("OAuth failures roll back only fresh connections and reconcile ambiguous finishes", () => {
    const html = catalogHtml();
    assert.match(html, /freshConnection = data\.freshConnection === true/);
    assert.match(html, /if \(finishStarted && canReconcileFinish\)/, "only eligible finish failures may enter reconciliation");
    assert.match(html, /reconcileFinishedInstall\(apiName, connName\)/);
    assert.match(html, /!finishResponseReceived && complete/, "explicit finish errors must never be reclassified as success");
    assert.match(html, /state\.connectionName === connName/, "ambiguous finishes must match the exact connection");
    assert.match(html, /state\.connectionStatus === "Connected"/, "ambiguous finishes require a connected matching install");
    assert.match(html, /if \(freshConnection && connName\)/, "definite pre-finish failures must clean up owned connections");
    const reconciliation = html.slice(
        html.indexOf("async function reconcileFinishedInstall"),
        html.indexOf("async function recoverConnectorFailure"),
    );
    assert.doesNotMatch(reconciliation, /rollbackFreshConnection/, "ambiguous post-finish state must never delete a connection");
    const connect = html.slice(html.indexOf("async function onConnect"), html.indexOf("async function onReauth"));
    const reauth = html.slice(html.indexOf("async function onReauth"), html.indexOf("async function hydrateState"));
    assert.match(connect, /finishResponseReceived,\s*true\s*\)/, "fresh Connect may reconcile an ambiguous finish");
    assert.match(reauth, /finishResponseReceived,\s*freshConnection\s*\)/, "existing re-auth must not reuse its pre-existing state as proof of success");
});

test("failed install and re-auth requests always refresh fail-closed state", () => {
    const html = catalogHtml();
    const connectFailure = html.slice(html.indexOf("async function onConnect"), html.indexOf("async function onReauth"));
    const reauthFailure = html.slice(html.indexOf("async function onReauth"), html.indexOf("async function hydrateState"));
    assert.match(connectFailure, /await hydrateState\(\)/);
    assert.match(reauthFailure, /await hydrateState\(\)/);
    assert.doesNotMatch(html, /if \(cancelled \|\| finishStarted \|\| freshConnection\)/);
    assert.match(connectFailure, /postIdempotentMutation\("\/api\/install"/);
    assert.match(reauthFailure, /postIdempotentMutation\("\/api\/reauth"/);
    assert.match(html, /for \(let attempt = 0; attempt < 2; attempt\+\+\)/, "ambiguous initial responses must replay the same request");
    assert.match(html, /crypto\.getRandomValues\(bytes\)/, "every mutation needs a client-known replay id");
});

test("failed disconnect and namespace deletion refresh fail-closed state", () => {
    const html = catalogHtml();
    const disconnect = html.slice(html.indexOf("async function onRemoveLocal"), html.indexOf("function ensureDeleteDialog"));
    const namespaceDelete = html.slice(html.indexOf("async function performNamespaceDelete"), html.indexOf("function waitForOAuth"));
    assert.match(disconnect, /catch \(err\)[\s\S]*await hydrateState\(\)/);
    assert.match(namespaceDelete, /catch \(err\)[\s\S]*await hydrateState\(\)/);
    assert.doesNotMatch(disconnect, /mainBtn\.disabled = false/);
    assert.doesNotMatch(namespaceDelete, /b\.disabled = false/);
});

test("baseStyles defines the spin keyframes", () => {
    assert.match(baseStyles(), /@keyframes spin\b/, "spinner keyframes must be defined");
});

test("reduced-motion block replaces infinite loaders with static busy states", () => {
    const block = reducedMotionBlock(baseStyles());
    assert.ok(block, "a prefers-reduced-motion media block must exist");
    assert.match(block, /\.brand-loading, \.skeleton, \.si-spin, \.spin/);
    assert.match(block, /animation:\s*none\s*!important/);
    assert.match(block, /border-top-color:\s*currentColor\s*!important/);
    assert.match(block, /\.brand-loading, \.skeleton\s*\{\s*opacity:\s*1;\s*transform:\s*none/);
});

test("catalog keeps textual progress beside animated-default loaders", () => {
    const html = catalogHtml();
    assert.match(html, /\.si-spin\b[^}]*animation:\s*spin/, "install overlay spinner must use the spin animation");
    assert.match(html, /currentColor[^"]*animation:\s*spin/, "the Connect button spinner must use the spin animation");
    assert.match(html, /Connecting/, "the Connect button should show progress text alongside its spinner");
});

test("restart banner dismiss is sticky against a racing state refresh", () => {
    const html = catalogHtml();
    // The client-side dismissal flag and its gate in hydrateState must survive.
    assert.match(html, /restartDismissed\s*=\s*true/, "dismiss handler must set the sticky flag");
    assert.match(
        html,
        /restartBanner\.hidden\s*=\s*restartDismissed\s*\|\|\s*!d\.pendingRestart/,
        "hydrateState must respect the dismissed flag so a late refresh can't re-show the banner",
    );
});

test("a global [hidden] reset makes the hidden attribute authoritative", () => {
    // The actual dismiss bug: .restart-banner{display:flex} (an author rule)
    // ties the UA [hidden]{display:none} rule on specificity and wins, so the
    // hidden attribute is ignored. This reset must exist or Dismiss silently
    // breaks again, no matter how correct the JS is.
    assert.match(
        baseStyles() + catalogHtml(),
        /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/,
        "a [hidden]{display:none !important} reset must exist so el.hidden=true actually hides",
    );
});

test("the setup picker surfaces a fallback notice only when given one", () => {
    // When an open-time catalog fetch fails (saved namespace deleted, access
    // revoked, transient outage), the server falls back to the picker with a
    // "pick another" notice instead of a dead-end error page. The notice must
    // render when passed and stay absent otherwise.
    const subs = [{ id: "sub-1-abcdef", name: "Sub One" }];
    const withNotice = renderSetupHtml(subs, "couldn't open namespace ns .. pick another to continue.");
    assert.match(withNotice, /class="setup-notice"/, "the picker must render the notice banner when one is supplied");
    assert.match(withNotice, /pick another to continue/, "the notice copy must reach the page");

    const plain = renderSetupHtml(subs);
    assert.doesNotMatch(plain, /class="setup-notice"/, "no notice banner should render on a normal setup visit");
});

test("namespace choices are keyboard-accessible buttons", () => {
    const html = renderSetupHtml([{ id: "sub-1", name: "Sub One" }]);
    assert.match(html, /<button type="button" class="setup-card"/);
    assert.doesNotMatch(html, /<div class="setup-card"/);
    assert.match(html, /\.setup-card:focus-visible/);
});

test("setup and create loaders ignore stale subscription responses", () => {
    const setup = renderSetupHtml([{ id: "sub-1", name: "Sub One" }]);
    assert.match(setup, /requestSeq !== gatewayRequestSeq \|\| subId !== subSelect\.value/);

    const create = renderCreateNamespaceHtml([{ id: "sub-1", name: "Sub One" }]);
    assert.match(create, /seq !== resourceGroupsSeq \|\| sub !== subSelect\.value/);
    assert.match(create, /seq !== identitiesSeq \|\| sub !== subSelect\.value/);
});

test("create form invalidates pending checks immediately and uses unique identity ids", () => {
    const html = renderCreateNamespaceHtml([{ id: "sub-1", name: "Sub One" }]);
    assert.match(html, /clearTimeout\(nameTimer\);\s*checkSeq\+\+;/);
    assert.match(html, /ids\.map\(\(id, index\) =>/);
    assert.match(html, /id="uami-' \+ index/);
});

test("create form locks navigation and fields while provisioning", () => {
    const html = renderCreateNamespaceHtml([{ id: "sub-1", name: "Sub One" }]);
    assert.match(html, /for \(const control of document\.querySelectorAll\("button, input, select"\)\)/);
    assert.match(html, /setFormLocked\(true\)/);
    assert.match(html, /control\.disabled = true/);
    assert.match(html, /document\.body\.setAttribute\("aria-busy"/);
    assert.match(html, /finally \{\s*if \(creating\) setFormLocked\(true\)/);
    assert.match(html, /if \(!creating\) window\.location\.href = "\/setup"/);
    assert.match(html, /progress\.textContent = [^;]*request\.name/);
});

function catalogHtmlFull() {
    // Non-empty fixture: one Microsoft item and one partner item, so the section
    // partition, the move-model grids, and the collapsible heads can be asserted.
    const catalog = [
        { id: "p1", apiName: "acme", displayName: "Acme Widgets", description: "partner thing", iconUri: "", brandColor: "", category: CATEGORY.partner },
        { id: "m1", apiName: "azureblob", displayName: "Azure Blob", description: "ms thing", iconUri: "", brandColor: "", category: CATEGORY.microsoft },
    ];
    return renderCatalogHtml("test-instance", catalog, {
        filter: "",
        category: "all",
        source: "",
        config: { subscriptionId: "sub", gatewayName: "ns", resourceGroup: "rg" },
    });
}

test("the catalog renders three collapsible sections in order", () => {
    const html = catalogHtmlFull();
    const iMine = html.indexOf('id="sec-mine"');
    const iMs = html.indexOf('id="sec-microsoft"');
    const iPartner = html.indexOf('id="sec-partner"');
    assert.ok(iMine !== -1 && iMs !== -1 && iPartner !== -1, "all three sections must render");
    assert.ok(iMine < iMs && iMs < iPartner, "sections must render in order: mine, microsoft, partner");
    assert.match(html, /id="sec-mine"[\s\S]*?>My MCPs</, "mine section title");
    assert.match(html, /id="sec-microsoft"[\s\S]*?>Microsoft</, "microsoft section title");
    assert.match(html, /id="sec-partner"[\s\S]*?>Partners</, "partner section title");
});

test("Microsoft and partner items land in their home grids; My MCPs starts empty", () => {
    const html = catalogHtmlFull();
    // Server-rendered order is fixed (mine, microsoft, partner), so an item's
    // index relative to the grid ids tells us which grid it sits in.
    const iGridMs = html.indexOf('id="grid-microsoft"');
    const iGridPartner = html.indexOf('id="grid-partner"');
    const iMs = html.indexOf('data-api-item="azureblob"');
    const iPartner = html.indexOf('data-api-item="acme"');
    assert.ok(iMs > iGridMs && iMs < iGridPartner, "the Microsoft item must sit in #grid-microsoft");
    assert.ok(iPartner > iGridPartner, "the partner item must sit in #grid-partner");
    assert.match(html, /data-api-item="azureblob" data-home-grid="microsoft"/, "Microsoft item carries its home grid");
    assert.match(html, /data-api-item="acme" data-home-grid="partner"/, "partner item carries its home grid");
    assert.match(html, /id="grid-mine"[^>]*><\/div>/, "the My MCPs grid must be empty at render");
});

test("catalog only emits inline icon color for strict hex brand colors", () => {
    const html = renderCatalogHtml("test-instance", [
        {
            id: "safe",
            apiName: "safe",
            displayName: "Safe",
            description: "",
            iconUri: "https://example.com/safe.png",
            brandColor: "#5059c9",
            category: CATEGORY.partner,
        },
        {
            id: "bad",
            apiName: "bad",
            displayName: "Bad",
            description: "",
            iconUri: "https://example.com/bad.png",
            brandColor: "#5059c9;background-image:url(https://attacker.example/pixel);color:",
            category: CATEGORY.partner,
        },
        {
            id: "short",
            apiName: "short",
            displayName: "Short",
            description: "",
            iconUri: "https://example.com/short.png",
            brandColor: "#fff",
            category: CATEGORY.partner,
        },
        {
            id: "alpha",
            apiName: "alpha",
            displayName: "Alpha",
            description: "",
            iconUri: "https://example.com/alpha.png",
            brandColor: "#5059c980",
            category: CATEGORY.partner,
        },
    ], {
        filter: "",
        category: "all",
        source: "",
        config: { subscriptionId: "sub", gatewayName: "ns", resourceGroup: "rg" },
    });

    assert.match(html, /style="background:#5059c922"/, "valid hex colors should render as the icon background");
    assert.doesNotMatch(html, /background-image/, "non-hex color payloads must not reach inline CSS");
    assert.doesNotMatch(html, /attacker\.example/, "attacker-controlled CSS URLs must not render");
    assert.doesNotMatch(html, /background:#fff22/, "shorthand colors cannot be combined with an appended alpha");
    assert.doesNotMatch(html, /background:#5059c98022/, "colors that already contain alpha cannot append another alpha");
});

test("section heads are accessible toggle buttons", () => {
    const html = catalogHtmlFull();
    assert.match(
        html,
        /<button class="section-head" type="button" aria-expanded="(true|false)" aria-controls="grid-mine"/,
        "each section head must be a button wired with aria-expanded + aria-controls",
    );
    assert.match(html, /aria-controls="grid-microsoft"/, "microsoft head controls its grid");
    assert.match(html, /aria-controls="grid-partner"/, "partner head controls its grid");
});

test("the Added (N) filter pill is gone", () => {
    const html = catalogHtmlFull();
    assert.doesNotMatch(html, /id="filter-bar"/, "the old filter bar must be removed");
    assert.doesNotMatch(html, /Added \(/, "the old Added (N) pill copy must be gone");
});

test("the catalog header shows the active namespace and a switch-namespace button", () => {
    // The header surfaces the active connector namespace in the sub line, and a
    // "switch namespace" button in the gw-actions row is the switch affordance:
    // clicking it returns to the /setup picker. So the page must show the
    // namespace name and carry the nav to /setup.
    const html = catalogHtml(); // fixture config.gatewayName = "ns"
    assert.match(html, /class="cn-name">ns</, "the header must show the active namespace name");
    assert.match(html, /id="switch-ns"/, "the header must render the switch-namespace button");
    assert.match(
        html,
        /id="switch-ns"[^>]*onclick="[^"]*window\.location\.href='\/setup'/,
        "clicking switch namespace must navigate to the /setup picker",
    );
});

test("My MCP hydration adds a per-server Sandbox deep link", () => {
    const html = catalogHtmlFull();
    assert.match(
        html,
        /data-sandbox-url="https:\/\/connectors\.azure\.com\/sub\/rg\/ns\/mcp-playground\?server=azureblob"/,
        "each connector tile must carry its namespace Sandbox URL",
    );
    assert.match(html, /sandbox\.className = "item-add sandbox-btn item-icon-action"/, "installed My MCPs must get the Sandbox action");
    assert.match(html, /sandbox\.title = "Open this MCP in Connector Namespace playground"/, "the Sandbox icon should describe the Connector Namespace playground");
    assert.match(html, /sandbox\.setAttribute\("aria-label", "Open " \+ displayName \+ " in Connector Sandbox"\)/, "the icon-only action needs an accessible label");
    assert.doesNotMatch(html, /<span>Sandbox<\/span>/, "the compact action should show only the flask mark");
    assert.ok(
        html.indexOf('if (!st || !st.installed)') < html.indexOf('sandbox.className = "item-add sandbox-btn item-icon-action"'),
        "the Sandbox action must be created only after the non-installed tile returns",
    );
});

test("connect is compact and local disconnect appears only for local entries", () => {
    const html = catalogHtmlFull();
    const css = baseStyles();
    assert.match(css, /\.item-add\.primary\s*\{[^}]*min-width:\s*62px;[^}]*font-size:\s*\.72rem;/, "Connect should use the compact primary-button sizing");
    assert.match(html, /connectIcon \+ "<span>Connect<\/span>"/, "Connect should include the plug mark before its label");
    assert.match(html, /remove\.className = "item-add split-main item-icon-action"/, "local disconnect should be compact");
    assert.match(html, /remove\.setAttribute\("aria-label", "Disconnect " \+ displayName \+ " from Copilot"\)/, "the icon needs a connector-specific label");
    assert.match(html, /const disconnectIcon = '[^']*m2 2 12 12/, "the visible control should use a slashed plug mark");
    assert.match(html, /remove\.innerHTML = disconnectIcon/, "the visible control should use the disconnect mark");
    assert.match(html, /if \(st\.inCli\) \{\s*remove = document\.createElement\("button"\)/, "remote-only resources must not offer local disconnect");
    assert.match(html, /if \(remove\) splitWrap\.appendChild\(remove\)/, "namespace delete options must remain available without a disconnect button");
    assert.match(html, /\.split-remove \.split-main \{[^}]*color:var\(--danger\)/, "the disconnect icon should be red");
    assert.match(html, /\.split-remove \.split-caret\s*\{[^}]*padding:\.2rem \.3rem/, "the destructive-options caret should stay narrow");
    assert.match(html, /\.split-remove \.split-caret svg\s*\{[^}]*width:8px; height:8px;/, "the caret mark should match its smaller button");
});

test("My MCPs sorts fully connected entries before other installed resources", () => {
    const html = catalogHtmlFull();
    assert.match(
        html,
        /item\.dataset\.connectionReady = st\.connectionStatus === "Connected" && st\.inCli \? "1" : "0"/,
        "hydration should mark resources that are connected and available in Copilot",
    );
    assert.match(
        html,
        /if \(grid\.id === "grid-mine"\)[\s\S]*Number\(b\.dataset\.connectionReady === "1"\) - Number\(a\.dataset\.connectionReady === "1"\)/,
        "My MCPs should put fully connected entries first",
    );
});

test("narrow connector cards keep the name above wrapped actions", () => {
    const css = baseStyles();
    assert.match(css, /@media \(max-width: 520px\)/, "catalog cards need a narrow-panel layout");
    assert.match(
        css,
        /\.item\s*\{[^}]*grid-template-columns:\s*40px minmax\(0,\s*1fr\)/,
        "narrow cards must preserve a real text column beside the icon",
    );
    assert.match(
        css,
        /\.item > \.item-add,\s*\.item > \.item-actions\s*\{[^}]*grid-row:\s*2/,
        "actions must move below the connector name instead of squeezing it out",
    );
    assert.match(css, /\.item-actions\s*\{[^}]*flex-wrap:\s*wrap/, "narrow action rows must wrap");
});
