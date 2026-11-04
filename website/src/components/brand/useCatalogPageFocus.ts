import { useEffect, useRef } from "react";
import { getScrollBehavior } from "./scrollBehavior";

export function useCatalogPageFocus() {
  const frame = useRef<number | null>(null);
  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
  }, []);

  return () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const catalog = document.getElementById("catalog");
      if (!catalog) return;
      catalog.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
      catalog.focus({ preventScroll: true });
    });
  };
}
