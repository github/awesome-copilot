# Maps, Heroes, And Feature Modules

Use this reference when building map systems, rotating arenas, class systems, kits, or modular gameplay features.

## Map patterns from real plugins

### Per-game map-instance usage

Observed traits:

- per-game map instances
- allowed map filtering through configuration
- gameplay objects tied to the active map instance
- match mode can constrain which maps are used

This works well for isolated match instances where each game owns its world and objectives.

### Persistent battlefield map rotation

Observed traits:

- one active combat world at a time
- source maps copied into temporary active worlds
- old worlds unloaded and deleted after rotation
- rotation warnings broadcast before swap
- spawn leaderboards refreshed after rotation

This works well for a persistent shared mode where the world rotates on a timer.

### Sky-island arena map usage

Observed traits:

- one game owns one copied map instance
- teams are assigned to configured island spawn locations
- chests are grouped by island, middle, or center role
- countdowns control cage removal, game start, refill timing, and game end
- visibility and chat are scoped to players in the same game instance

This works well for SkyWars-style modes where every match needs isolated islands, loot, spectators, and cleanup.

### Dungeon-node map usage

Observed traits:

- one game owns a lobby map plus temporary combat or event node maps
- route choices are generated from stage metadata
- players vote or confirm before advancing
- each combat node owns its wave queue and active mob set
- old node maps are unloaded only after players move to the new map or lobby

This works well for PvE roguelike, dungeon, wave, or boss progression plugins.

## Guidance for map architecture

- Per-instance minigame:
  - use a `GameMap` owned by a game object
- Shared rotating battlefield:
  - use a `MapManager` with one active world plus a rotation timer
- Temporary copied worlds:
  - always teleport players out before unload
  - clean folders after unload
  - reapply gamerules after world creation
- Sky-island match:
  - group spawn and chest locations by team or island role
  - reset cages, inventories, scoreboards, and spectators per match
- Dungeon or route-node mode:
  - treat every node as a temporary stage with explicit load, enter, clear, and unload steps
  - keep mob ownership tied to the game, not just the world

## Class and hero system patterns

Observed class-system traits:

- `HeroRegistry`
- `HeroService`
- definitions grouped by theme
- hero tier progression
- hero skill config and handler
- selector GUI separated from assignment logic

Observed minigame power-selection parallels:

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
