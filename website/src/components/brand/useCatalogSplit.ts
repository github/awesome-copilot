import { useSyncExternalStore } from "react";

/** The catalog stylesheets stack the filter sidebar above the cards here. */
const STACKED_QUERY = "screen and (max-width: 63.25rem)";

/** Seven rows of two cards stay beside the filter sidebar. */
const CARDS_BESIDE = 14;

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
 * a wider grid below it. Fourteen cards (seven rows) stay beside the filters
 * and the rest move to the wide grid, so a page of 14 or fewer cards, such as
 * the default 6, never splits. When the sidebar stacks above the cards (narrow
 * screens, and the server render), every card stays in the side grid.
 */
export function useCatalogSplit<T>(items: readonly T[]) {
  const stacked = useSyncExternalStore(subscribe, isStacked, () => true);
  const beside = stacked ? items.length : cardsBeside(items.length);
  return { beside: items.slice(0, beside), below: items.slice(beside) };
}

/**
 * Fourteen cards, or the nearest even count to it that leaves whole rows of
 * six below, so the wide grid's last row is not left short: 14 for 20 or 50
 * cards, 16 for 100. An odd count cannot fill both grids, so it keeps 14 and
 * lets the wide grid end short, the way an odd count ends any grid.
 */
function cardsBeside(total: number) {
  if (total <= CARDS_BESIDE) return total;
  let best: number | null = null;
  for (let count = 2; count < total; count += 2) {
    if ((total - count) % WIDE_ROW_CARDS !== 0) continue;
    const closer =
      best === null ||
      Math.abs(count - CARDS_BESIDE) < Math.abs(best - CARDS_BESIDE);
    if (closer) best = count;
  }
  if (best !== null) return best;
  return total - CARDS_BESIDE >= WIDE_ROW_CARDS ? CARDS_BESIDE : total;
}
