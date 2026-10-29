---
name: zambo-receipts
description: Verify Zambo execution receipts. Every Zambo tool response includes a verifiable AER-1 receipt with an id, timestamp, and SHA-256 output digest. Use when you need to check that a Zambo tool call ran and that the saved result was not changed since it was saved.
license: MIT
compatibility: Requires network access to zambo.dev. Python 3 or curl.
---

# Verify Zambo receipts

Every Zambo tool call returns a `_receipt` object alongside the result. It is the record of the call: which tool ran, when, and the SHA-256 digest of the exact saved output. Receipts follow AER-1, IETF draft-zambo-aer1-26.

## What a receipt looks like

```json
"_receipt": {
  "id": "f6ca2bd7-4e92-481e-be5c-ec20f3b69bac",
  "tool": "live_price",
  "timestamp": "2026-09-15T18:20:21.795Z",
  "output_hash": "sha256:a6b360b683a91377fc16c452c4c064a7a68262d32adfb525c60d776d633e3ecf",
  "status": "success"
}
```

Each receipt also has a shareable human page at `https://zambo.dev/run/<id>`.

## Handover receipts

A Zambo handover (wrapping a session up so another AI can pick it up) produces receipts of its own: one for the wrap-up and one for the pickup (acceptance). Both verify exactly like any other receipt, with the same endpoint and the same digest check. A verified pickup receipt proves the receiving session accepted the recorded handover; together the pair proves the work crossed over with its record intact.

## How to verify

1. **Ask the verify endpoint.** Send a GET request to `https://zambo.dev/api/v2/receipt/{id}/verify`, replacing {id} with the receipt id. A genuine, unchanged record returns the outcome "verified". Or open https://zambo.dev/verify/ and enter the receipt id.
2. **Fetch the stored record** from `GET https://zambo.dev/api/receipt/{id}` and read its `output_hash`.
3. **Recompute the digest** of the exact output text you received and compare it to `output_hash`. A match means the saved result was not changed since it was saved.
4. **Check the timestamp** is sane for when the call ran.

```python
import hashlib, json, urllib.request

def verify_receipt(receipt_id, output_text):
    url = f"https://zambo.dev/api/v2/receipt/{receipt_id}/verify"
    with urllib.request.urlopen(url, timeout=15) as r:
        verdict = json.load(r.read())
    with urllib.request.urlopen(f"https://zambo.dev/api/receipt/{receipt_id}", timeout=15) as r:
        stored = json.load(r.read())
    claimed = stored["output_hash"].replace("sha256:", "")
    actual = hashlib.sha256(output_text.encode()).hexdigest()
    return {
        "endpoint_outcome": verdict.get("verification_status") or verdict.get("outcome") or verdict.get("status"),
        "hash_match": claimed == actual,
        "timestamp": stored.get("timestamp"),
        "status": stored.get("status"),
    }
```

## What verification proves, and doesn't

- **Proves:** the saved result was not changed since it was saved. The digest binds the receipt to the exact saved bytes; changing the output breaks the match.
- **Does not prove:** the underlying data was right. A receipt shows the work was recorded as it happened; it does not certify, for example, that a price feed was accurate.
- **Does not prove:** who authorized the call. Receipts record execution, not identity or permission.

## Gotchas

- **Hash the exact output text.** The digest covers the raw output string. Normalize nothing (no trimming, no re-encoding) before hashing.
- **Receipts are public and shareable.** `https://zambo.dev/run/<id>` is designed to be linked in posts, reports, and PRs. Never put secrets in tool arguments; they may appear in shared receipts.
- **Use the right words.** Never call a receipt "signed". The correct phrase is **verifiable receipt**.
- **Missing receipt = incomplete response.** If a response has no `_receipt`, treat the result as unrecorded and say so.
