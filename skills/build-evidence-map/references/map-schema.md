# Evidence map schema

The canonical artifact is UTF-8 JSON. Use a `.doubt.json` suffix when practical.

```json
{
  "title": "Short artifact title",
  "question": "One decision-changing question?",
  "updatedAt": "YYYY-MM-DD",
  "verdict": "A provisional, evidence-bounded answer.",
  "nodes": [
    {
      "id": "current-position",
      "type": "position",
      "label": "Current position",
      "text": "The proposition represented by this node."
    },
    {
      "id": "primary-observation",
      "type": "evidence",
      "label": "Observed result",
      "text": "A faithful statement of the source region.",
      "sourceId": "source-1"
    },
    {
      "id": "missing-baseline",
      "type": "unknown",
      "label": "Missing baseline",
      "text": "The exact absent fact and why it matters."
    }
  ],
  "edges": [
    {
      "from": "primary-observation",
      "to": "current-position",
      "relation": "supports",
      "note": "Why the observation increases reason to accept the position."
    },
    {
      "from": "missing-baseline",
      "to": "current-position",
      "relation": "missing",
      "note": "Why this missing baseline could reverse the position."
    }
  ],
  "sources": [
    {
      "id": "source-1",
      "title": "Source title",
      "url": "https://example.com/source",
      "publisher": "Publisher",
      "date": "YYYY-MM-DD",
      "retrievedAt": "YYYY-MM-DD",
      "locator": "Section: Results, p. 7, § 2.1, L12-L18, or 00:04:31",
      "excerpt": "A short, checkable excerpt or bounded source-region description."
    }
  ]
}
```

## Invariants

- Allowed node types: `position`, `claim`, `evidence`, `unknown`.
- Allowed relations: `supports`, `contradicts`, `qualifies`, `missing`.
- Exactly one `position` node is required.
- Evidence nodes require `sourceId`.
- Every evidence node must be the `from` side of at least one edge.
- Every non-position node must have a directed path to the position.
- Duplicate reasoning edges and directed cycles are rejected.
- Every source must be used by an evidence node.
- Every edge needs a plain-language `note`.
- Map and source dates are real ISO calendar dates; source dates cannot be later
  than `updatedAt`.
- Every source records `retrievedAt`. Receipts cover that value and the recorded
  excerpt, not the mutable bytes currently served by the URL.
- Locators identify a bounded section, page, line range, or timestamp.
- Excerpts contain 40–500 characters of varied, checkable content; repeated
  filler is invalid.
- `confidence` fields are invalid. Use an `unknown` node or a qualified claim.

## Optional verification record

Only a successful explicit source-verification command may add this object to a
source:

```json
{
  "verification": {
    "status": "verified",
    "method": "normalized-excerpt-match",
    "checkedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
    "contentSha256": "64 lowercase hexadecimal characters",
    "excerptSha256": "64 lowercase hexadecimal characters",
    "finalUrl": "The checked URL or absolute local path",
    "locatorStatus": "matched"
  }
}
```

`locatorStatus` may be `not-machine-checked` for page, section, and timestamp
locators. Do not treat it as proof that the region was manually confirmed.
