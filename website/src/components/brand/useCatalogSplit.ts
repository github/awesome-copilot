import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_CATALOG_RESOURCE_SIZE,
  type CatalogResourceSize,
} from "./CatalogResourceSizeControl";

/** Everything a split decision depends on, apart from the page's scrollbar. */
type SplitInputs = {
  viewport: string;
  navEnd: number;
  length: number;
  first: unknown;
  last: unknown;
};

/**
 * Splits a catalog page's cards between the grid beside the filter sidebar and
 * a wider grid below it. A row stays beside the sidebar while it starts above
 * the end of the filter list, so the wide grid begins with the first row the
 * sidebar no longer reaches. The default page size never splits, and when the
 * sidebar stacks above the cards (narrow screens), every card stays in the
 * side grid.
 */
export function useCatalogSplit<T>(
  items: readonly T[],
  pageSize: CatalogResourceSize,
) {
  const filterNavRef = useRef<HTMLElement>(null);
  const sideGridRef = useRef<HTMLDivElement>(null);
  const splits = pageSize !== DEFAULT_CATALOG_RESOURCE_SIZE;
  // Infinity until a measurement cuts the list, so a stacked layout or a
  // longer list never mounts a wide grid only to tear it down again.
  const [besideCount, setBesideCount] = useState(Infinity);
  const shown = splits ? Math.min(besideCount, items.length) : items.length;
  const lastChange = useRef<{
    inputs: SplitInputs;
    from: number;
    to: number;
  } | null>(null);

  const measure = useEffectEvent(() => {
    const nav = filterNavRef.current;
    const grid = sideGridRef.current;
    if (!splits || !nav || !grid || items.length === 0) return;
    const navEnd = filterListEnd(nav);
    const next = countBeside(nav, grid, navEnd, shown, items.length);
    if (next === besideCount) return;
    // Keep a larger stored count when it already shows the right cards, but
    // store the first finite count, so a longer list later grows row by row.
    if (next === shown && besideCount !== Infinity) return;
    // Moving cards changes the page height, which can add or remove the
    // vertical scrollbar and so the grid's width. If a change would only undo
    // the previous one while nothing else moved, keep the current split.
    const inputs: SplitInputs = {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      navEnd: Math.round(navEnd - nav.getBoundingClientRect().top),
      length: items.length,
      first: items[0],
      last: items[items.length - 1],
    };
    const previous = lastChange.current;
    if (
      previous &&
      previous.from === next &&
      previous.to === besideCount &&
      sameInputs(previous.inputs, inputs)
    ) {
      return;
    }
    lastChange.current = { inputs, from: besideCount, to: next };
    setBesideCount(next);
  });

  // Page, sort, filter, page size, and "Show more" changes all re-render, so
  // measure after every render, before the browser paints.
  useLayoutEffect(() => measure());

  // Viewport changes resize the side grid, and font loads can reflow the
  // filter groups without a render, so watch both.
  useEffect(() => {
    const grid = sideGridRef.current;
    const nav = filterNavRef.current;
    if (!grid || !nav) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(grid);
    for (const group of nav.lastElementChild?.children ?? []) {
      observer.observe(group);
    }
    return () => observer.disconnect();
  }, []);

  return {
    filterNavRef,
    sideGridRef,
    beside: items.slice(0, shown),
    below: items.slice(shown),
  };
}

/**
 * The sidebar box stretches to the catalog's height, so the filter list ends
 * at its last group (or Clear all) plus the sidebar's bottom padding.
 */
function filterListEnd(nav: HTMLElement) {
  const list = nav.lastElementChild?.lastElementChild ?? nav;
  return (
    list.getBoundingClientRect().bottom +
    parseFloat(getComputedStyle(nav).paddingBlockEnd)
  );
}

function countBeside(
  nav: HTMLElement,
  grid: HTMLElement,
  navEnd: number,
  shown: number,
  total: number,
) {
  // Stacked layout: the sidebar sits above the cards, not beside them.
  const gridLeft = grid.getBoundingClientRect().left;
  if (nav.getBoundingClientRect().right > gridLeft + 1) return Infinity;
  const cells = Array.from(grid.children, (cell) =>
    cell.getBoundingClientRect(),
  );
  if (cells.length === 0) return Math.min(total, 1);
  const columns = cells.filter((cell) => cell.top === cells[0].top).length;
  const rows = Math.ceil(cells.length / columns);
  const rowsBeside = new Set(
    cells.filter((cell) => cell.top < navEnd).map((cell) => cell.top),
  ).size;
  // Cut whole rows that start at or below the end of the filter list.
  if (rowsBeside < rows) return rowsBeside * columns;
  if (shown >= total) return shown;
  // Every row shown so far starts beside the filters. Fill a short last row,
  // or add one more row while the grid still ends above the filters' end
  // (rows touch, so the next row would start where this one ends).
  if (cells.length % columns !== 0) return Math.min(total, rows * columns);
  if (cells[cells.length - 1].bottom < navEnd) {
    return Math.min(total, shown + columns);
  }
  return shown;
}

function sameInputs(a: SplitInputs, b: SplitInputs) {
  return (
    a.viewport === b.viewport &&
    a.navEnd === b.navEnd &&
    a.length === b.length &&
    a.first === b.first &&
    a.last === b.last
  );
}
