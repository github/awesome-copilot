# Exact-file handoff and reconciliation

## The packet

Use a private local record, not an invented provider API schema. Keep these categories
separate so later agents can tell requirements from evidence:

| Category | Preserve |
| --- | --- |
| Artifact | Export path, format, byte size, SHA-256, source revision and export settings. |
| Geometry evidence | Tool/version, input hash, declared units, measurement method, actual observations and explicit limits. |
| Assembly | Stable component identifiers, copies per assembly, assembly count and expected total physical quantities. |
| Requirements | Process; exact material/grade; color/object mapping; finish; critical dimensions and allowed deviations; settings or approved defaults; intended use. |
| Logistics | Required arrival with time zone or no deadline, destination needed for this stage, and allowed shipping choices. |
| Sharing | Selected provider, approved files/use, reviewed retention terms and remaining permission questions. |
| Provider record | Authenticated account identity without secrets, request/specification/order IDs, returned hashes/revisions and status evidence. |
| Attempt | Exact request body, stable operation/idempotency key where supported, timestamp, response and reconciliation result. |

If a local packet fingerprint is useful, record its serialization/schema version and hash
algorithm. Store provider-issued fingerprints exactly as returned; providers can canonicalize
fields differently. An unchanged CAD hash does not imply unchanged units, quantity or material.

## Geometry and assembly checks that change the handoff

- Compare measured bounds with the user's expected size. A factor-of-25.4 discrepancy is
  a reason to clarify units, not permission to rescale the export.
- Mesh bounds, manifold-edge checks and enclosed-volume estimates answer different
  questions. None alone proves minimum wall thickness, clearance, support requirements,
  strength or printability. Record unsupported checks as unmeasured, not zero or passed.
- For a mating body/lid, ask about fastening method, nominal mating dimensions, intended
  clearance, allowed variation and mating hardware. General design guidance is not a
  measurement of those features; record its source and process/material applicability.
- Read actual components/build items before equating one file with one part. Multiple
  objects can be assembly components, repeated instances, supports or alternatives.
  Preserve transforms and the selected printable configuration; do not flatten or merge
  them silently to fit a provider's upload form.
- Ask how quantity is interpreted. Three complete body/lid sets require six physical
  components. If a provider requires separate requests, preserve the relationship and do
  not imply combined shipping, shared payment or all-or-nothing acceptance.
- For multicolor, bind assignments to the exact file and stable object/region selectors.
  Do not invent selectors, infer intent from a render or assume STL carries a color map.
  A provider accepting a format does not prove it interprets every feature of that format.

## Map readiness to the requested action

An unavailable payment or production channel may still permit a nonbinding review request;
check the provider's actual contract. Conversely, an accessible upload endpoint does not
establish stock, a feasible process, machine capacity, quotation accuracy or delivery timing.

Do not fill missing values simply to pass validation. A review can use an explicitly approved
provisional baseline; a manufacturing offer must bind the actual approved specification.
Material substitutions, rescaling, regenerated CAD and revised deadlines require a new readback.

## Reconcile without duplicates

| Observation | Next action |
| --- | --- |
| Write returned a record ID | Read that record and compare artifact, specification, quantity and request type. |
| Timeout or disconnected response | Preserve the original bytes/body/key; inspect known records before retrying. |
| Documented idempotent retry exists | Replay identical content with the same key. A replay may return an old or cancelled record; inspect its state. |
| No idempotency/reconciliation support | Reconcile through the provider's read UI or support process within the user's authorization. Keep the outcome unknown until evidence resolves it; do not blindly resubmit. |
| Duplicate/conflict response | Read the referenced existing record; distinguish an already-created request from changed content or an obsolete revision. |
| CAD hash or specification readback differs | Stop downstream actions. Explain the mismatch and resolve the intended artifact/version. |
| User changes the design or requirements | Preserve the prior record; obtain the required new intent and create the provider-supported revision or new request. Reconcile any accepted/paid obligation separately. |

Do not reuse one key for different operations or content. Do not generate another key to
bypass an uncertain result, limit or conflict. Respect documented backoff/polling guidance.
If the exact original write cannot be recovered, stop and report the missing reconciliation
information rather than claiming failure or success.

## Evidence for each stage

| Stage | Evidence needed |
| --- | --- |
| Prepared | Local packet with exact artifact identity and unresolved fields. |
| Uploaded | Provider record bound to that artifact; an upload is not a quote. |
| Queued for review | Saved review/request ID and actual pending state. |
| Reviewed | Report tied to the same CAD/specification; limitations remain explicit. |
| Offered | Actual material/settings/quantity/destination, complete currency total, shipping/tax scope, expiry and timing terms. |
| Accepted | Customer approval of that exact offer and provider-recorded acceptance. |
| Authorized / captured | Provider evidence for each financial state separately. A checkout return page is not payment proof. |
| Manufactured / shipped / delivered | Distinct production, physical carrier-handoff and delivery evidence, not an inferred progression. |

The last three rows explain state interpretation; they do not authorize this skill to accept
offers, pay or operate a printer. State names differ between providers. Read their authoritative
fulfillment record rather than treating a generic backlog label as the whole order lifecycle.
