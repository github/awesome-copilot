import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Splits a catalog page's cards between the grid beside the filter sidebar and
 * a wider grid below the catalog. A row stays beside the sidebar while it
 * starts above the end of the filter list, so the wide grid begins with the
 * first row the sidebar no longer reaches. When the sidebar stacks above the
 * cards (narrow screens), every card stays beside it.
 */
export function useCatalogSplit<T>(items: readonly T[]) {
  const filterNavRef = useRef<HTMLElement>(null);
  const sideGridRef = useRef<HTMLDivElement>(null);
  const [besideCount, setBesideCount] = useState(items.length);
  const shown = Math.min(besideCount, items.length);

  const measure = useEffectEvent(() => {
    const nav = filterNavRef.current;
    const grid = sideGridRef.current;
    if (!nav || !grid) return;
    const next = countBeside(nav, grid, shown, items.length);
    if (next !== shown) setBesideCount(next);
  });

  // Page, sort, filter, page size, and "Show more" changes all re-render, so
  // measure after every render, before the browser paints.
  useLayoutEffect(() => measure());

  // Viewport and font changes resize the side grid without a render.
  useEffect(() => {
    const grid = sideGridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return {
    filterNavRef,
    sideGridRef,
    beside: items.slice(0, shown),
    below: items.slice(shown),
  };
}

function countBeside(
  nav: HTMLElement,
  grid: HTMLElement,
  shown: number,
  total: number,
) {
  // Stacked layout: the sidebar sits above the cards, not beside them.
  const gridLeft = grid.getBoundingClientRect().left;
  if (nav.getBoundingClientRect().right > gridLeft + 1) return total;
  // The sidebar box stretches to the catalog's height, so the filter list
  // ends at its last group (or Clear all) plus the sidebar's bottom padding.
  const list = nav.lastElementChild?.lastElementChild ?? nav;
  const navEnd =
    list.getBoundingClientRect().bottom +
    parseFloat(getComputedStyle(nav).paddingBlockEnd);
  const cells = Array.from(grid.children);
  const lastBottom = cells.at(-1)?.getBoundingClientRect().bottom ?? -Infinity;
  // The side grid ends above the filters' end and cards are left over, so more
  // rows fit. Rows touch (no row gap), so the next row starts at lastBottom:
  // show every card for one layout pass, then cut at the first row below.
  if (shown < total && lastBottom < navEnd) return total;
  const startsBeside = (cell: Element) =>
    cell.getBoundingClientRect().top < navEnd;
  return cells.filter(startsBeside).length;
}
