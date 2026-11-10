# Optional partsforagents adapter

Read this file only when the user has selected partsforagents. It is not the default provider.
Contributor affiliation: partsforagents; this reference was prepared with AI assistance.
Local handoff preparation needs no provider account. Paid manufacturing is separate from
free advice and nonbinding review/request submission.

## Discover the live contract

These are documentation and API references, not guarantees that a job can be manufactured:

- [Capabilities](https://partsforagents.com/api/capabilities) and
  [production capabilities](https://partsforagents.com/api/production-capabilities): current
  intake, material/stock, payment readiness and limits.
- [Tool schemas](https://partsforagents.com/tools.json) and
  [OpenAPI](https://partsforagents.com/openapi.json): exact required arguments and outputs.
- [Authentication documentation](https://partsforagents.com/docs#keys) and
  [retention policy](https://partsforagents.com/privacy): account and sharing requirements.

Public advice MCP is `https://partsforagents.com/api/advice/mcp`; general advice needs no
account or CAD. Authenticated Streamable HTTP MCP is `https://partsforagents.com/api/mcp`
with an account-scoped bearer key. Native Sites OAuth uses
`https://printrelay.kva1.chatgpt.site/mcp`; that key is not an OAuth credential. Follow the
selected host's supported authentication path and never manufacture identity headers.
If unavailable, finish the local packet and explain the account step; do not upload elsewhere.

The published contract accepts STL, STEP/STP, 3MF and OBJ, up to 2 MiB decoded CAD through
MCP or 10 MiB via multipart REST. It requires declared `mm` or `inch`, contact email,
material family, quantity and destination country/postal code even for DFM intake.
A DFM-only request does not require a full street address. Current geometric preflight
measures STL; acceptance of the other formats does not establish measured geometry.
Read the live limits before a write instead of treating this snapshot as permanent.

## Preserve and submit

All relative paths below use `https://partsforagents.com`.

| Step | MCP tool | REST equivalent |
| --- | --- | --- |
| Upload approved CAD | `upload_cad_request` | `POST /api/v1/requests` |
| Verify stored identity | `get_cad_request` | `GET /api/v1/requests/{id}` |
| Read preliminary geometry | `get_cad_preflight` | `GET /api/v1/requests/{id}/preflight` |
| Read exact specifications | `get_manufacturing_specifications` | `GET /api/v1/requests/{id}/specification` |
| Save approved choices | `set_manufacturing_specification` | `PUT /api/v1/requests/{id}/specification` |
| Submit a nonbinding request | `place_order` | `POST /api/v1/orders` |
| Read request or DFM report | `get_order` | `GET /api/v1/orders/{id}` |
| Read manufacturing/quotation progress | `get_order_fulfillment` | `GET /api/v1/orders/{id}/fulfillment` |

1. Check sharing consent against the retention policy. Operators/AI specialists may review
   authorized data. Cancellation and CAD deletion do not erase retained specification/review
   snapshots; do not promise automatic expiry or complete deletion. Keep addresses out of notes.
2. Upload the exact file with the current required schema, `consent:true` and a saved retry key.
   REST uses a multipart `file`; MCP uses `file_base64`. Compare `file_sha256` with the local
   SHA-256, require stored `status:"received"`, and retain the returned request `id`.
3. Read existing specifications, then supply approved process, exact material grade, finish,
   color, manufacturing options and arrival requirement (or an agreed `null` for no deadline).
   Keep the canonical `specification` and its `spec_fingerprint`. `provider_standard` settings
   need the user's agreement. Multicolor requires the live CAD-bound 3MF object-map schema.
4. Quantity means copies of the complete printable build in that file. Map it to the physical
   bill of parts before submission; different files or unequal component counts need separate
   requests. Combined shipping or project-wide acceptance is not implied.
5. Submit only the requested `order_type`: `dfm_review`, `quotation` or `manufacturing`, with
   the actual `request_id`, `spec_fingerprint`, `acknowledge_nonbinding:true`, concrete optional
   `review_notes` and a distinct saved retry key. New quotation/manufacturing requests require
   FDM. Broad material intake is not a promise of stock; firm offers currently require eligible
   verified PLA/PETG jobs. Do not fabricate a quote or estimate ID to make a request complete.

MCP uses `idempotency_key`; REST upload/order writes use the `Idempotency-Key` header, not a
JSON field. Identical specification PUTs reuse the normalized version without that header.
For MCP, check `isError` and `structuredContent.ok` before consuming `structuredContent.data`.
Store `order.id`, CAD/specification hashes, status, exact write body/key and replay indicator.

## Interpret the response

Submission is nonbinding: it does not reserve capacity or authorize payment or production.
The initial response has `payment_required_on_submission:false` and `payment_link:null`;
`after_review_if_accepted` is a condition, not a payment URL. A DFM review uses `not_required`.
Payment readiness being disabled need not block an otherwise valid nonbinding request.

Read DFM reports with `get_order` only; DFM-only orders do not support fulfillment reads.
For manufacturing/quotation, also read `get_order_fulfillment`: backlog can still say
`pending_review` after an offer or later progress. No review or payment-link turnaround is
promised. Poll pending specialist work no more often than every 30 minutes.

After uncertainty, read saved IDs and reuse the original write/key when the contract permits.
`409 active_order_exists` supplies an existing order to read. A cancelled replay is still
cancelled, not a newly pending request. Changing the key does not resolve uncertainty.
A later offer needs separate customer approval; payment and printer actions remain outside
this skill. Report only evidenced states, without claiming a purchased or delivered part.
