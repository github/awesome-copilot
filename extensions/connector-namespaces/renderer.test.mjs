// Regression guards for the connector-catalog renderer.
//
// Run: node --test extensions/connector-namespaces/renderer.test.mjs
//
// These tests exist because two UX bugs kept coming back:
//   1. A `@media (prefers-reduced-motion: reduce)` rule that froze loading
//      spinners. It shipped twice: first as animation-iteration-count: 1
//      !important on the universal selector, then as
//      `.brand-loading, .skeleton { animation: none !important }`. Both froze
//      functional loaders — the latter made the "Change namespace" overlay
//      logo look stuck. Every animation in this canvas IS a functional loader
//      (brand-loading nav overlay, .si-spin sign-in spinner, .skeleton cards),
//      so the reduced-motion block must never disable an animation at all. The
//      guards below fail if any animation-killer reappears in that block.
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
import { CATEGORY } from "./categories.mjs";

// Pull the balanced body of the prefers-reduced-motion media block out of a
// stylesheet string (non-greedy regex can't handle the nested rule braces).
// CSS comments are stripped so the "must not contain animation:none" guards
// test actual declarations, not explanatory prose inside the block.
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

// Concatenate the contents of every <style> block in an HTML string, so CSS
// assertions never accidentally match braces inside inline <script> JS.
function styleCss(html) {
    let out = "";
    const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let m;
    while ((m = re.exec(html)) !== null) out += `${m[1]}\n`;
    return out;
}

// Return the bodies of every CSS rule whose selector text mentions `selector`.
// Matches innermost `selector { body }` rules (bodies contain no nested braces),
// which is all the .si-spin rules in this stylesheet are.
function rulesTargeting(css, selector) {
    const bodies = [];
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(css)) !== null) {
        if (m[1].includes(selector)) bodies.push(m[2]);
    }
    return bodies;
}

function catalogHtml() {
    return renderCatalogHtml("test-instance", [], {
        filter: "",
        category: "all",
        source: "",
        config: { subscriptionId: "sub", gatewayName: "ns", resourceGroup: "rg" },
    });
}

test("baseStyles defines the spin keyframes", () => {
    assert.match(baseStyles(), /@keyframes spin\b/, "spinner keyframes must be defined");
});

test("reduced-motion block does not blanket-freeze animations", () => {
    const block = reducedMotionBlock(baseStyles());
    assert.ok(block, "a prefers-reduced-motion media block must exist");

    // The universal selector rule must not touch `animation` — that is exactly
    // the blanket killer that froze spinners three times.
    const universal = block.match(/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{([^}]*)\}/);
    assert.ok(universal, "reduced-motion block should still tame transitions on the universal selector");
    assert.doesNotMatch(
        universal[1],
        /animation/,
        "do NOT apply animation properties to the universal selector under reduced motion — it freezes loading spinners",
    );

    // Belt and suspenders: the specific properties that caused the freeze must
    // not appear anywhere in the block. Every animation in this canvas is a
    // functional loader, so the block must never disable, pause, or clamp ANY
    // animation — not just on the universal selector. `animation: none` on
    // `.brand-loading, .skeleton` is what froze the "Change namespace" overlay.
    assert.doesNotMatch(block, /animation-iteration-count/, "animation-iteration-count freezes infinite spinners");
    assert.doesNotMatch(block, /animation-duration/, "near-zero animation-duration freezes spinners");
    assert.doesNotMatch(block, /animation\s*:\s*none/, "animation:none freezes functional loaders (this froze the Change-namespace overlay)");
    assert.doesNotMatch(block, /animation-play-state\s*:\s*paused/, "pausing animations freezes loaders");
    assert.doesNotMatch(block, /\.brand-loading\b/, "reduced-motion must not target the brand-loading nav overlay loader");
});

test("catalog keeps functional loading spinners animated", () => {
    const html = catalogHtml();
    assert.match(html, /\.si-spin\b[^}]*animation:\s*spin/, "install overlay spinner must use the spin animation");
    assert.match(html, /currentColor[^"]*animation:\s*spin/, "the Connect button spinner must use the spin animation");
    assert.match(html, /Connecting/, "the Connect button should show progress text alongside its spinner");
});

test("the functional sign-in spinner is never frozen anywhere", () => {
    const css = baseStyles();

    // The reduced-motion block may only tame transitions. It must never name
    // the functional .si-spin sign-in spinner — freezing that is one of the
    // bugs that has shipped before.
    const block = reducedMotionBlock(css);
    assert.ok(block, "a prefers-reduced-motion media block must exist");
    assert.doesNotMatch(block, /\.si-spin\b/, "reduced-motion must not target the functional .si-spin spinner");

    // No rule anywhere may stop .si-spin from animating. Walk every CSS rule
    // whose selector mentions .si-spin and assert its body never disables the
    // loop. Scan only <style> CSS so inline-script braces can't interfere.
    const spinRules = rulesTargeting(styleCss(css + catalogHtml()), ".si-spin");
    assert.ok(spinRules.length > 0, "a .si-spin rule must exist");
    for (const body of spinRules) {
        assert.doesNotMatch(body, /animation\s*:\s*none/, ".si-spin must never get animation:none");
        assert.doesNotMatch(body, /animation-play-state\s*:\s*paused/, ".si-spin must never be paused");
        assert.doesNotMatch(body, /animation-iteration-count\s*:\s*[01]\b/, ".si-spin must keep iterating");
    }
    // At least one .si-spin rule must actually drive the spin animation.
    assert.ok(
        spinRules.some((b) => /animation:\s*spin\b/.test(b)),
        "the .si-spin rule must run the spin keyframes",
    );
});

test("the brand-loading overlay loader is never frozen anywhere", () => {
    const css = baseStyles();

    // The "Change namespace" overlay shows .brand-loading running brandPulse.
    // It froze in production because the reduced-motion block set
    // `animation: none` on it. Mirror the .si-spin guard: the loader must keep
    // animating and the reduced-motion block must never name it.
    const block = reducedMotionBlock(css);
    assert.ok(block, "a prefers-reduced-motion media block must exist");
    assert.doesNotMatch(block, /\.brand-loading\b/, "reduced-motion must not target the .brand-loading overlay loader");

    const brandRules = rulesTargeting(styleCss(css), ".brand-loading");
    assert.ok(brandRules.length > 0, "a .brand-loading rule must exist");
    for (const body of brandRules) {
        assert.doesNotMatch(body, /animation\s*:\s*none/, ".brand-loading must never get animation:none");
        assert.doesNotMatch(body, /animation-play-state\s*:\s*paused/, ".brand-loading must never be paused");
        assert.doesNotMatch(body, /animation-iteration-count\s*:\s*[01]\b/, ".brand-loading must keep iterating");
    }
    assert.ok(
        brandRules.some((b) => /animation:\s*brandPulse\b/.test(b)),
        "the .brand-loading rule must run the brandPulse keyframes",
    );
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
    ], {
        filter: "",
        category: "all",
        source: "",
        config: { subscriptionId: "sub", gatewayName: "ns", resourceGroup: "rg" },
    });

    assert.match(html, /style="background:#5059c922"/, "valid hex colors should render as the icon background");
    assert.doesNotMatch(html, /background-image/, "non-hex color payloads must not reach inline CSS");
    assert.doesNotMatch(html, /attacker\.example/, "attacker-controlled CSS URLs must not render");
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

test("connect is more compact and local remove uses a clear accessible icon", () => {
    const html = catalogHtmlFull();
    const css = baseStyles();
    assert.match(css, /\.item-add\.primary\s*\{[^}]*min-width:\s*62px;[^}]*font-size:\s*\.72rem;/, "Connect should use the compact primary-button sizing");
    assert.match(html, /connectIcon \+ "<span>Connect<\/span>"/, "Connect should include the plug mark before its label");
    assert.match(html, /remove\.className = "item-add split-main item-icon-action"/, "local remove should be compact");
    assert.match(html, /remove\.setAttribute\("aria-label", "Remove " \+ displayName \+ " from Copilot"\)/, "the icon needs a connector-specific label");
    assert.match(html, /const removeIcon = '[^']*M2\.5 4h11/, "the visible control should use a recognizable trash mark");
    assert.match(html, /remove\.innerHTML = removeIcon/, "the visible control should use the remove mark");
    assert.doesNotMatch(html, /remove\.textContent = "Remove"/, "the local action should not render a text label");
    assert.match(html, /\.split-remove \.split-main \{[^}]*color:var\(--danger\)/, "the trash action should be red");
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
