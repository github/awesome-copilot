# MCP transport and authorization boundaries

Read for remote MCP, explicit transport, OAuth, headers, or a bare URL. Migrate reviewed client configuration, never runtime protocol or authorization state.

- Require a target-documented transport; a URL alone is ambiguous.
- Preserve `sse` only as a supported legacy label; never relabel it as HTTP or Streamable HTTP.
- Preserve explicit Streamable HTTP only when the target supports its field.
- Drop protocol headers, session/resumption IDs, handshakes, subscriptions, OAuth tokens, registration, and `autoApprove`/`enabledTools`/`disabledTools`.
- Re-authorize and approve tools in the target client.

Use [migration-safety.md](migration-safety.md) when conversion or redaction is unclear. Sources: [MCP changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog), [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), and [authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).
