/**
 * Shared filter/sort helpers for the catalog pages.
 *
 * The prototype hardcoded its catalog data with a precomputed `updatedDays`
 * field. Real catalog data carries an ISO `lastUpdated` timestamp instead, so
 * these helpers derive the same buckets the prototype filtered on.
 */

export const updatedBuckets: { label: string; max: number }[] = [
  { label: "Past week", max: 7 },
  { label: "Past month", max: 30 },
  { label: "Past 3 months", max: 90 },
  { label: "Past 6 months", max: 180 },
  { label: "Older", max: Number.POSITIVE_INFINITY },
];

/** Whole days between `lastUpdated` and now. Unparseable dates sort as oldest. */
export function daysSince(lastUpdated: string | undefined): number {
  if (!lastUpdated) return Number.POSITIVE_INFINITY;
  const then = Date.parse(lastUpdated);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function updatedBucketOf(days: number): string {
  return updatedBuckets.find((bucket) => days <= bucket.max)?.label ?? "Older";
}

export const fileBuckets: { label: string; min: number; max: number }[] = [
  { label: "1–2 files", min: 0, max: 2 },
  { label: "3–5 files", min: 3, max: 5 },
  { label: "6–10 files", min: 6, max: 10 },
  { label: "11+ files", min: 11, max: Number.POSITIVE_INFINITY },
];

export function fileBucketOf(files: number): string {
  return (
    fileBuckets.find((bucket) => files >= bucket.min && files <= bucket.max)
      ?.label ?? "1–2 files"
  );
}

/**
 * Toggle a value in a filter list, returning a new array. Extracted because
 * every catalog page repeats the same checkbox toggle behaviour.
 */
export function toggleValue(current: string[], option: string): string[] {
  return current.includes(option)
    ? current.filter((value) => value !== option)
    : [...current, option];
}
