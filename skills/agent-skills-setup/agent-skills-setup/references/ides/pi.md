# pi

Pi reads Skills from `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/`, packages, settings, and explicit CLI paths. Use the canonical Pi paths as targets and report compatibility paths instead of merging them.

Pi deliberately tolerates some Skill-name/directory mismatches that the common Agent Skills specification rejects. Validate against the common specification before cross-client migration and report Pi-only metadata as loss.

User settings are `~/.pi/agent/settings.json`; project settings are `.pi/settings.json`. They are separate scopes rather than aliases, and only reviewed subobjects may be reconstructed.

Sources: [Skills](https://pi.dev/docs/latest/skills), [settings](https://pi.dev/docs/latest/settings).
