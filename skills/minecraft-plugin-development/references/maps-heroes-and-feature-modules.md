# Maps, Heroes, And Feature Modules

Use this reference when building map systems, rotating arenas, class systems, kits, or modular gameplay features.

## Map patterns from real plugins

### NightMare-style map usage

Observed traits:

- per-game map instances
- allowed map filtering through configuration
- gameplay objects tied to the active map instance
- match mode can constrain which maps are used

This works well for isolated match instances where each game owns its world and objectives.

### War-style map rotation

Observed traits:

- one active combat world at a time
- source maps copied into temporary active worlds
- old worlds unloaded and deleted after rotation
- rotation warnings broadcast before swap
- spawn leaderboards refreshed after rotation

This works well for a persistent shared mode where the world rotates on a timer.

## Guidance for map architecture

- Per-instance minigame:
  - use a `GameMap` owned by a game object
- Shared rotating battlefield:
  - use a `MapManager` with one active world plus a rotation timer
- Temporary copied worlds:
  - always teleport players out before unload
  - clean folders after unload
  - reapply gamerules after world creation

## Class and hero system patterns

Observed `War` traits:

- `HeroRegistry`
- `HeroService`
- definitions grouped by theme
- hero tier progression
- hero skill config and handler
- selector GUI separated from assignment logic

Observed `NightMare` parallels:

- brands and special items function like modular player powers
- selection limits and categories are explicit
- match rules can constrain available choices

Guidance:

- keep definitions separate from runtime assignment
- use registries for discoverable content
- store unlock rules and tiers in data, not hardcoded listener branches
- separate:
  - what a class is
  - how it is selected
  - how it is applied
  - how its active skills are triggered

## Feature module pattern

Good candidate modules for separate packages:

- map rotation
- hero or class system
- item powers
- boss systems
- match rules
- shops and GUIs
- scoreboards
- progression

Do not merge all these into one listener or one “game utils” class.

## Practical heuristic

If a feature has all three of these, it deserves its own module:

- custom data model
- config or definitions
- one or more listeners, commands, or scheduled tasks
