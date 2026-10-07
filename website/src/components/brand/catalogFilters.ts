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

/** Whole days between `lastUpdated` and now. Unparsable dates sort as oldest. */
const daysSinceCache = new Map<string, number>();

export function daysSince(lastUpdated: string | undefined): number {
  if (!lastUpdated) return Number.POSITIVE_INFINITY;

  const dayStamp = Math.floor(Date.now() / 86_400_000);
  const cacheKey = `${lastUpdated}:${dayStamp}`;
  const cached = daysSinceCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const then = Date.parse(lastUpdated);
  const days = Number.isNaN(then)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.floor((Date.now() - then) / 86_400_000));

  daysSinceCache.set(cacheKey, days);
  return days;
}

const updatedBucketCache = new Map<number, string>();

export function updatedBucketOf(days: number): string {
  const cached = updatedBucketCache.get(days);
  if (cached) return cached;

  const bucket = updatedBuckets.find((option) => days <= option.max)?.label ?? "Older";
  updatedBucketCache.set(days, bucket);
  return bucket;
}

export const fileBuckets: { label: string; min: number; max: number }[] = [
  { label: "1–2 files", min: 0, max: 2 },
  { label: "3–5 files", min: 3, max: 5 },
  { label: "6–10 files", min: 6, max: 10 },
  { label: "11+ files", min: 11, max: Number.POSITIVE_INFINITY },
];

const fileBucketCache = new Map<number, string>();

export function fileBucketOf(files: number): string {
  const cached = fileBucketCache.get(files);
  if (cached) return cached;

  const bucket =
    fileBuckets.find((option) => files >= option.min && files <= option.max)?.label ??
    "1–2 files";

  fileBucketCache.set(files, bucket);
  return bucket;
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
