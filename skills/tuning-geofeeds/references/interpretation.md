# Output interpretation

Use these boundaries when explaining a validated Analysis IR or its renderers:

- **Authored values** are retained source values. Normalized values do not
  silently replace them.
- **RFC 8805 violations** cite protocol requirements. **Fastah quality
  recommendations** are public-feed policy, not RFC violations.
- **Operational warnings** identify workflow or relationship risk without
  changing the feed.
- **RDAP observations** compare an optional publisher profile with allowlisted
  registrant evidence. `consistent` does not prove ownership; missing evidence
  is `unverified`, not `conflicting`.
- **MCP observations** are advisory host-captured place-search results. Best
  first is ordering, not authority or confidence. Radius describes approximate
  extent and population weight is an ordering input.
- **Correction proposals** preserve old/new values and evidence. Only a
  separate, bound approval artifact records a decision. A corrected CSV
  contains only explicitly approved changes and is reanalyzed before writing.

The HTML dashboard and Markdown summary are review surfaces, never approval
authorities. GeoJSON is a user-chosen artifact that may disclose canonical
prefixes; it omits source comments, publisher/RDAP identifiers, raw MCP
messages, and unapproved correction data.

Inputs with at most 400,000 data rows can produce Analysis IR. An oversized
input fails closed before IR generation; it is not truncated, split, or
represented by a partial result.

Public-prefix classification uses the standard-library `ipaddress` properties,
including an explicit `is_reserved` rejection, together with Fastah's explicit
IANA special-purpose deny policy. Both are intentional: Python's IPv4
`is_reserved` currently covers only `240.0.0.0/4` and is not the IANA
Reserved-by-Protocol column, while the stdlib classifications remain owned by
the selected Python runtime. The explicit policy also preserves whole-prefix
checks for special-purpose address space.
