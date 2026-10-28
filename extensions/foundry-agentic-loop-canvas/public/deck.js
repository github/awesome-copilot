const deck = document.getElementById("deck");
const scroller = deck.querySelector(".slides");
const slides = [...deck.querySelectorAll(".slide")];
const prev = document.getElementById("prev");
const next = document.getElementById("next");
const bar = document.getElementById("bar");
const counter = document.getElementById("counter");
const announce = document.getElementById("announce");
const framed = window.parent !== window;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let current = -1;

function applyTheme(theme) {
    if (theme === "light" || theme === "dark") document.documentElement.style.colorScheme = theme;
}

function titleOf(slide) {
    const heading = slide.querySelector("h1, h2")?.cloneNode(true);
    if (!heading) return "";
    heading.querySelectorAll("[aria-hidden='true']").forEach(node => node.remove());
    return heading.textContent.replace(/\s+/g, " ").trim();
}

function fromHash() {
    const n = Number.parseInt(location.hash.slice(1), 10);
    return Number.isFinite(n) ? n - 1 : 0;
}

function go(index, { speak = true } = {}) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    if (index === current) return;
    deck.dataset.dir = index < current ? "prev" : "next";
    const leaving = slides[current];
    const hadFocus = leaving?.contains(document.activeElement);
    leaving?.classList.remove("is-current");
    slides[index].classList.add("is-current");
    current = index;
    scroller.scrollTop = 0;
    if (hadFocus) scroller.focus({ preventScroll: true });
    counter.textContent = `${index + 1} / ${slides.length}`;
    bar.style.scale = `${(index + 1) / slides.length} 1`;
    // A nav button that becomes disabled under focus hands focus to the other one, so keyboard users keep their place.
    const first = index === 0, last = index === slides.length - 1;
    const focused = document.activeElement;
    prev.disabled = first;
    next.disabled = last;
    prev.setAttribute("aria-disabled", String(first));
    next.setAttribute("aria-disabled", String(last));
    if (focused === prev && first) next.focus({ preventScroll: true });
    if (focused === next && last) prev.focus({ preventScroll: true });
    if (speak) announce.textContent = slides[index].getAttribute("aria-label");
    history.replaceState(null, "", `${location.pathname}${location.search}#${index + 1}`);
}

// Space and Page keys scroll a tall slide before they move to the next one.
function scrollStep(direction) {
    const room = direction > 0 ? scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop : scroller.scrollTop;
    if (room <= 2) return false;
    scroller.scrollBy({ top: direction * scroller.clientHeight * 0.85, behavior: reducedMotion.matches ? "auto" : "smooth" });
    return true;
}

document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const interactive = event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [contenteditable]");
    const step = event.shiftKey ? -1 : 1;
    let handled = true;
    switch (event.key) {
        case "ArrowRight": go(current + 1); break;
        case "ArrowLeft": go(current - 1); break;
        case "Home": go(0); break;
        case "End": go(slides.length - 1); break;
        case "PageDown": if (!scrollStep(1)) go(current + 1); break;
        case "PageUp": if (!scrollStep(-1)) go(current - 1); break;
        case " ":
            if (interactive) handled = false;
            else if (!scrollStep(step)) go(current + step);
            break;
        case "Escape":
            if (framed) window.parent.postMessage({ type: "deck-close" }, location.origin);
            else handled = false;
            break;
        default: handled = false;
    }
    if (handled) event.preventDefault();
});

prev.addEventListener("click", () => go(current - 1));
next.addEventListener("click", () => go(current + 1));
addEventListener("hashchange", () => go(fromHash()));
addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "deck-theme") applyTheme(event.data.theme);
});
// The GitHub Copilot App opens canvas links in the system browser, but its handler may not run in this iframe.
// This mirrors its rule; whichever handler runs first prevents the default and the other yields.
if (framed) document.addEventListener("click", event => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor || anchor.hasAttribute("download") || anchor.target !== "_blank") return;
    let url;
    try { url = new URL(anchor.href, document.baseURI); } catch { return; }
    const host = url.hostname;
    if (!["http:", "https:"].includes(url.protocol) || url.origin === location.origin
        || ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) || host.endsWith(".localhost")) return;
    event.preventDefault();
    window.open(url.href, "_blank", "noopener,noreferrer");
});

let swipe = null;
scroller.addEventListener("pointerdown", event => {
    swipe = event.pointerType !== "mouse" && event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
});
scroller.addEventListener("pointerup", event => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
});
scroller.addEventListener("pointercancel", () => { swipe = null; });

applyTheme(new URLSearchParams(location.search).get("theme"));
slides.forEach((slide, i) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} of ${slides.length}: ${titleOf(slide)}`);
});
deck.classList.add("is-ready");
go(fromHash(), { speak: false });
