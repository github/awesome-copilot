# claude-desktop (Claude Desktop app)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | Not mapped |
| MCP | darwin: `~/Library/Application Support/Claude/claude_desktop_config.json`<br>windows: `%APPDATA%\Claude\claude_desktop_config.json` |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- The mapper supports legacy local `claude_desktop_config.json` on macOS and native Windows with JSON `mcpServers`; it never guesses Linux or virtualized Windows paths. Legacy `sse` stays legacy, not Streamable HTTP.
- Modern local MCP uses **Settings → Extensions → Advanced settings → Install Extension** for `.mcpb`; do not unpack it into a guessed directory. [Local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) and [MCPB](https://claude.com/docs/connectors/building/mcpb) define that flow.
- Remote MCP uses **Customize → Connectors → Add custom connector**; re-authorize and use any server-owner replacement endpoint. See [remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- Chat/Desktop Skills and Plugins are installed through **Customize** and have no portable mapper path. The Code tab uses Claude Code's own skills, settings, and MCP paths; keep those separate from Chat MCP. Claude Code import is interactive: `claude mcp add-from-claude-desktop`.

Sources: [Skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude), [Customize directory](https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory), [Code tab](https://code.claude.com/docs/en/desktop), [MCP protocol](https://modelcontextprotocol.io/docs/develop/connect-local-servers).
