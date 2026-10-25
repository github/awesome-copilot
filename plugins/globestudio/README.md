# Globestudio Plugin

Dotted world maps and animated 3D globes for your website, in one install: the `globestudio` skill, which writes the design as one config and embeds it, and the hosted [Globestudio](https://globestudio.app) MCP server for presets, share links and embed code.

## Installation

```bash
copilot plugin install globestudio@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `globestudio` | Creates, edits and embeds dotted world maps and animated 3D globes with Globestudio's 21 looks: a design as one JSON config, embedded with `@globestudio/react`, the `<globe-studio>` web component or an iframe, plus regions, data points and arcs, brand colors, and PNG, SVG, GLB, MP4, WebM or GIF exports. Includes reference files on the config keys, embedding and the looks. |

### MCP server

This plugin includes the `globestudio` MCP server configured in [`./mcp.json`](./mcp.json), hosted at https://globestudio.app/mcp. It needs no account or API key and stores nothing: every tool builds or reads links.

| Tool | What it does |
|------|--------------|
| `list_presets` | Every look: id, name, blurb, tags, thumbnail and embed URL |
| `find_presets` | Finds looks by a style word or a short phrase, such as `print` or `synthwave` |
| `build_share_url` | Builds a studio share link and an embed URL from a look, or changes a link the user pasted |
| `read_share_url` | Decodes a Globestudio link into its look and settings |
| `embed_snippet` | Embed code for a look: iframe, React or script tag |
| `preview_url` | A look's live embed URL and PNG thumbnail |

The skill knows how the design and the embeds work, and the server builds and reads the links, so a change to a link the user pastes keeps everything else in it.

## Example prompts

```text
Add a spinning dotted globe of our offices in Austin, Berlin and Singapore to the hero.
```

```text
Make a flat dotted map of Europe in our brand colors, with a Globe and Map switch, and give me the embed code.
```

```text
Here's a Globestudio link. Keep the design, but make the dots our brand blue.
```

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot). The skill and the MCP server are developed at [alevizio/globestudio](https://github.com/alevizio/globestudio).

## License

MIT
