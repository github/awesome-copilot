import { useSyncExternalStore } from "react";

import type { CatalogResourceSize } from "./CatalogResourceSizeControl";

/** The catalog stylesheets stack the filter sidebar above the cards here. */
const STACKED_QUERY = "screen and (max-width: 63.25rem)";

/** Rows of two cards that stay beside the filter sidebar, by page size. */
const ROWS_BESIDE: Record<CatalogResourceSize, number> = {
  6: 0,
  20: 4,
  50: 4,
  100: 5,
};

/**
 * The wide grid shows two or three columns, so a count of cards below that is
 * a multiple of six fills every wide row at either width.
 */
const WIDE_ROW_CARDS = 6;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(STACKED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isStacked = () => window.matchMedia(STACKED_QUERY).matches;

/**
 * Splits a catalog page's cards between the grid beside the filter sidebar and
 * a wider grid below it: four rows stay beside the filters at 20 and 50 per
 * page, five at 100, and the default 6 never splits. When the sidebar stacks
 * above the cards (narrow screens, and the server render), every card stays
 * in the side grid.
 */
export function useCatalogSplit<T>(
  items: readonly T[],
  pageSize: CatalogResourceSize,
) {
  const stacked = useSyncExternalStore(subscribe, isStacked, () => true);
  const beside = stacked
    ? items.length
    : cardsBeside(items.length, ROWS_BESIDE[pageSize] * 2);
  return { beside: items.slice(0, beside), below: items.slice(beside) };
}

/**
 * A full page leaves a multiple of six below the cut: 20 - 8, 50 - 8, and
 * 100 - 10. A shorter list (a last page or a filter) moves the cut by at most
 * one row to keep that, and a list within a row of the cut stays beside. An
 * odd count cannot fill rows of two and of three at once, so it keeps the cut
 * and lets the wide grid end short, the way an odd count ends any grid.
 */
function cardsBeside(total: number, cut: number) {
  if (cut === 0 || total <= cut) return total;
  for (const count of [cut, cut + 2, cut - 2]) {
    if (count >= total) return total;
    if ((total - count) % WIDE_ROW_CARDS === 0) return count;
  }
  return total - cut >= WIDE_ROW_CARDS ? cut : total;
}
