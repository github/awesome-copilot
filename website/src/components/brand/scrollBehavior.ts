export function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * Scrolls a catalog's `#catalog` section into view and focuses it after the
 * reader picks a new page. Call it from the Pagination handler, not from an
 * effect on the current page: filter, sort, size, and search changes also
 * reset the page, and they must leave focus on the control being used.
 */
export function scrollToCatalogStart() {
  window.requestAnimationFrame(() => {
    const catalog = document.getElementById("catalog");
    if (!catalog) return;
    catalog.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
    catalog.focus({ preventScroll: true });
  });
}
