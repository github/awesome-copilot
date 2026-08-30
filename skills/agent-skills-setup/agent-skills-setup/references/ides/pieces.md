# pieces (Pieces for Developers)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

All automatic paths are unsupported.

<!-- END GENERATED: ide-paths.json summary -->
PiecesOS/Desktop/CLI is an MCP server/provider, not a file-backed MCP client or Skill host. Every automatic object is unsupported: do not infer `~/.pieces`, `.pieces`, Skills, rules, or config.

Configure the consuming client from **Settings → MCP** or `pieces mcp setup`; endpoints and transport are server-provided and may vary. Never rewrite its date/SSE path or migrate Pieces databases, logs, or extension state.

Sources: [MCP](https://docs.pieces.app/products/mcp), [Cursor setup](https://docs.pieces.app/products/mcp/cursor), [CLI](https://docs.pieces.app/products/cli/get-started).
