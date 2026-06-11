# Real Project Patterns

This reference captures architecture patterns observed in real Paper gameplay plugins:

- match-heavy, multi-phase minigames with maps, teams, power selections, boss waves, scoreboards, and match-mode overlays
- class-based persistent brawl modes with hero progression, map rotation, player data services, and async leaderboard refreshes

Use this file when the user asks for repo structure, feature placement, or how to organize a growing Minecraft plugin.

## Pattern 1: Central plugin bootstrap with explicit subsystems

Both styles keep one main plugin class responsible for constructing and wiring core subsystems.

Observed examples:

- A match-heavy minigame wires database, config managers, game manager, match manager, GUI objects, sidebar services, listeners, commands, and repeating tasks from `onEnable`.
- A persistent class-brawl plugin wires config, progression, database, repository, player data service, scoreboard manager, map manager, hero registry, hero service, game service, and hero skill handler from `onEnable`.

Guidance:

- Keep plugin startup readable and ordered.
- Construct core services before registering listeners or commands that depend on them.
- Treat the main plugin class as an orchestration root, not a dumping ground for gameplay logic.

## Pattern 2: Stateful gameplay belongs in dedicated session or manager objects

Both styles avoid storing all gameplay data directly on listeners.

Observed examples:

- Match-heavy minigames use `GameManager`, `MatchManager`, `Game`, `PlayerSession`, `GamePhase`, and `MatchSession` style objects.
- Persistent class-brawl modes use `GameService`, `PlayerSession`, `PlayerState`, `HeroService`, and `MapManager`.

Guidance:

- Put long-lived state into session, manager, or service classes.
- Keep listeners thin: validate the event, delegate to the relevant service, and exit.
- Prefer explicit gameplay state models over scattered flags.

## Pattern 3: Complex plugins grow by domain modules

As plugin scope grows, both styles split features into domain-oriented packages.

Observed match-heavy minigame domains:

- `Command`
- `Game`
- `Match`
- `GameConfig`
- `InitialListener`
- `Shop`
- `tasks`
- `Database`

Observed persistent class-brawl domains:

- `bootstrap`
- `command`
- `data`
- `game`
- `hero`
- `listener`
- `map`
- `gui`

Guidance:

- Group by gameplay domain or subsystem, not by vague “utils” buckets.
- Split once a feature has its own state, configuration, and lifecycle.
- Keep package names aligned with how you reason about the game.

## Pattern 4: Two valid architecture styles emerge

Match-heavy minigames lean toward manager-centric gameplay orchestration.

- Good fit for:
  - rounds
  - team elimination
  - map-specific game instances
  - match overlays on top of base game rules

Persistent class-brawl modes lean toward service-centric runtime orchestration.

- Good fit for:
  - a persistent combat lobby
  - class selection and respawn loops
  - progression and player data integration
  - rotating maps with a shared game mode

Guidance:

- Prefer manager-centric architecture for per-match or per-arena instances.
- Prefer service-centric architecture for one persistent shared mode with reusable systems.

## Pattern 5: Real plugins need both gameplay and operational layers

Real gameplay plugins combine gameplay code with operational subsystems:

- config loading
- database connectivity
- scoreboard refreshes
- map loading
- command and listener registration
- shutdown cleanup

Guidance:

- Do not design only the combat mechanic.
- Also design startup, shutdown, persistence, UI refreshes, and failure paths.

## Pattern 6: Instance-heavy plugins need explicit isolation layers

SkyWars-style and dungeon-style plugins need a clear boundary around each active game instance.

Common isolated surfaces:

- player-to-game session ownership
- world or map instance ownership
- temporary mob or entity ownership
- game-specific chat recipients
- visibility groups
- per-game scoreboards and titles
- resource refill or wave timers

Guidance:

- Treat `Game` as the owner of anything that should not leak into another arena.
- Keep global managers responsible for lookup and lifecycle, not for every gameplay rule.
- When adding a new listener, first decide whether it is global, lobby-only, or game-instance-only.
- If the plugin can run multiple games at once, every event should resolve the owning game before mutating gameplay state.

## When to reuse which pattern

- New minigame with rounds, teams, and map instances:
  - prefer `GameManager` + `Game` + `PlayerSession` + optional `MatchManager`
- Persistent PvP lobby with class selection and map rotation:
  - prefer `GameService` + `PlayerSession` + `HeroService` + `MapManager`
- SkyWars-style isolated arena:
  - prefer `GameManager` + `Game` + `GameMap` + countdown tasks + per-game scoreboard and loot managers
- PvE dungeon or wave progression:
  - prefer `Game` + lobby map + `RoundManager` or stage manager + entity ownership map + explicit cleanup hooks
- Plugin already large and messy:
  - use the domain package split pattern before adding more features
