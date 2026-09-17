import { useEffect, useRef } from "react";
import { getScrollBehavior } from "./scrollBehavior";

export function useCatalogPageFocus(currentPage: number) {
  const previousPage = useRef(currentPage);
  useEffect(() => {
    if (previousPage.current === currentPage) return;
    previousPage.current = currentPage;
    const frame = window.requestAnimationFrame(() => {
      const catalog = document.getElementById("catalog");
      if (!catalog) return;
      catalog.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
      catalog.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentPage]);
}
