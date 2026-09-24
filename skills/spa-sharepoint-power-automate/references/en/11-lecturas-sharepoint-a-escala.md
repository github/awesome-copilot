<!-- spa-sharepoint-power-automate · references/11-lecturas-sharepoint-a-escala.md · section §23 · English translation of the Spanish original -->
<!-- New (2026-09-24). Verified against Microsoft Learn; the retry snippet was tested against a local server that returns 429 with Retry-After. Index: ../SKILL.md -->

# 23 · Reading and writing SharePoint at scale: thresholds, pagination and throttling

A list that has 300 rows today and 12,000 in a year **breaks flows and scripts that never changed**. This chapter is what you need to know before that happens.

## 23.1 · `Get items` in Power Automate: the three numbers

| Concept | Value | Detail |
|---|---|---|
| Default items | **100** | If you only specify site and list, it returns **100**. Microsoft Learn says items are "paginated by default", but that does not fetch more: to go past **Top Count** you must **turn on Pagination** in the action settings and set a threshold |
| **Top Count** (Advanced options) | up to **5,000** | This is the list view threshold. Exceeding it makes the action fail |
| **Pagination** + *Threshold* (Settings → Networking) | up to **100,000** (5,000 on the Low profile) | Fetches in batches until the configured threshold is reached |

- To "fetch everything that matches a filter" in a large list: **high Top Count + Pagination ON + Threshold greater than expected**. Note: the threshold is rounded up by page batch (with batches of 5,000, asking for 7,000 returns up to 10,000).
- **Get items** only works with **lists**; for **libraries** use `Get files`. By default it walks **all folders** recursively: limit it with *Limit Entries to Folder* / *Include Nested Items*.
- Spaces in the column name go as `_x0020_` in OData (`Start_x0020_Date desc`). And you filter by the **internal name**, not the display name (§10, "Hidden default columns conflict").

## 23.2 · The view threshold (5,000) and the filter that "finds nothing"

Known Microsoft limitation: in lists with **more than 5,000** items, a `Filter Query` can return **zero records if there are no matches among the first 5,000**, even though matches do exist further on.

How to avoid it, in this order:

1. **Index** the columns used to filter or sort (List settings → Indexed columns). This is what lets the query avoid depending on walking the whole list.
2. Turn on **Pagination** in the `Get items`.
3. Filter **on the server** (`Filter Query`, OData) and not with `Filter array` afterwards: `Filter array` operates on what was already fetched and does not avoid the threshold.
4. Compound filters: the first condition must be selective and on an indexed column.
5. If the list grows unchecked (inspection history): **archive by period** (list or library per year) instead of fighting the threshold.

Same behavior via REST: a query that needs to walk more than 5,000 items to resolve the filter fails with `SPQueryThrottledException` even if it returns 200 rows. It is fixed with indexes, not with `$top`.

## 23.3 · Iterating: filter BEFORE the `Apply to each`

- Item limit per loop: 5,000 (Low) / 100,000. Filter with the query or with `Filter array` **before** entering the loop, and use `Select` to keep only the columns you need.
- An `Apply to each` over thousands of items with a SharePoint action inside means thousands of calls: it hits the connector limit of ~600/min (§21.5). Alternatives: batches via Graph `$batch`, or a script (§18) outside the flow.
- In `Get items`, if the option is available, **limiting columns per view** reduces the weight of each response.

## 23.4 · Outside the designer (scripts §18/§20): 429, 503 and `Retry-After`

When SharePoint throttles, it responds **429** (too many requests) or **503** (server busy) with a `Retry-After` header in seconds. Microsoft's rules:

- **Respect `Retry-After`**. Throttled requests also count against the limit: retrying immediately **makes** the block **worse**.
- Lower concurrency, avoid spikes, and for bulk loads work **outside peak hours** and in small batches.
- If the abuse continues, SharePoint can **block** the application (sustained 503) and notifies the tenant.
- Do not rely on `RateLimit` headers: SharePoint Online does **not** support them; only `Retry-After`.
- **Microsoft Graph uses fewer resources than REST/CSOM** for the same work and is recommended when there is a choice.

Minimal helper (Node ≥ 18, no dependencies) that respects `Retry-After` and gives up explicitly:

```js
async function spFetch(url, opts = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    if (r.status !== 429 && r.status !== 503) return r;
    const wait = Number(r.headers.get('retry-after')) || 5 * (i + 1); // seg.
    await new Promise(res => setTimeout(res, wait * 1000));
  }
  throw new Error(`SharePoint throttled tras ${tries} intentos: ${url}`);
}
```

Tested: with two consecutive 429s with `Retry-After: 1` it returns 200 on the third attempt (~2 s), and with permanent throttling it throws the error after exhausting the attempts.

Combine it with the **retry on transient 401** from §18.4 (re-tokenize): they are different cases, a 401 calls for a new token and a 429 calls for **waiting**.

## 23.5 · Detecting changes without rereading everything

- Rereading the entire list every time is the pattern that ends in throttling. The efficient way is **delta**: in Microsoft Graph, the *delta with token* query costs **1 resource unit** even if it is multi-item; without a token it costs 2.
- The Power Automate SharePoint connector does not expose delta; for that you have to call Graph (`/drives/{id}/root/delta`) with an HTTP action or a script.
- To react to changes in a list **within** Power Automate, the `When an item is created or modified` trigger is enough (it uses SharePoint webhooks under the hood; you do not need to set up your own).
- **Your own SharePoint webhooks** only if you need to notify an external service: the subscription **lasts at most 6 months (180 days)** and must be **renewed** with `PATCH …/subscriptions('<id>')`; if there are no changes in 6 months and nobody renews it, it is deleted. The endpoint must return the `validationtoken` in **≤ 5 s**, there is no signature (only `clientState`) and the notification arrives without details of the change. Evaluation of the `microsoft-sharepoint-webhooks` skill: see §25.

## 23.6 · Bulk writes

- Small batches (tens, not hundreds): a large batch can exceed the maximum request size (on the order of 2 MB, according to Microsoft Q&A answers; it is not a value from the official documentation) or trigger throttling. They are **not transactional**: a batch can fail halfway, so record which IDs were applied.
- Upsert by **canonical key** (no thousands separators), as in §18.6.
- Write with `GetItemById(n)` when the list's `/items(n)` returns the "200 without persisting" quirk (§17, §18).
- When finished, **verify by reading back** (§20.7); do not trust the "updated" counter.

## Sources (Microsoft Learn)

- *In-depth analysis into Get items and Get files SharePoint actions* — `learn.microsoft.com/sharepoint/dev/business-apps/power-automate/guidance/working-with-get-items-and-get-files`
- *Limits of automated, scheduled, and instant flows* (paginated items, items per loop) — `learn.microsoft.com/power-automate/limits-and-config`
- *Avoid getting throttled or blocked in SharePoint Online* — `learn.microsoft.com/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online`
- *Overview of SharePoint webhooks* and *SharePoint webhooks sample reference implementation* (lifetime and renewal) — `learn.microsoft.com/sharepoint/dev/apis/webhooks/`
