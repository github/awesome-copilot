# crush

Crush loads project config in precedence order from `.crush.json` and `crush.json`, then user `~/.config/crush/crush.json`, with environment overrides for global config/data. These project and user MCP subobjects are inventoried separately. It discovers Skills in canonical Crush, common Agent Skills, Claude, and Cursor locations.

Use `~/.config/crush/skills` and `.crush/skills` as canonical write targets. Treat the MCP subobject as manual: Crush requires its own typed server schema and performs shell expansion, so a generic JSON emitter cannot preserve its runtime semantics safely. `$HOME/.local/share/crush` and `CRUSH_GLOBAL_DATA` identify generated application state and are never migration sources.

Source: [Crush repository and configuration](https://github.com/charmbracelet/crush).
