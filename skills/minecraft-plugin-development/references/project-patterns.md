# Real Project Patterns

This reference captures architecture patterns observed in two real Paper plugins:

- `NightMare`: match-heavy, multi-phase gameplay plugin with maps, teams, brands, boss waves, scoreboards, and match-mode overlays
- `War`: class-based brawl plugin with hero progression, map rotation, player data services, and async leaderboard refreshes

Use this file when the user asks for repo structure, feature placement, or how to organize a growing Minecraft plugin.

## Pattern 1: Central plugin bootstrap with explicit subsystems

Both projects keep one main plugin class responsible for constructing and wiring core subsystems.

Observed examples:

- `NightMare` wires database, config managers, game manager, match manager, GUI objects, sidebar services, listeners, commands, and repeating tasks from `onEnable`.
- `War` wires config, progression, database, repository, player data service, scoreboard manager, map manager, hero registry, hero service, game service, and hero skill handler from `onEnable`.

Guidance:

- Keep plugin startup readable and ordered.
- Construct core services before registering listeners or commands that depend on them.
- Treat the main plugin class as an orchestration root, not a dumping ground for gameplay logic.

## Pattern 2: Stateful gameplay belongs in dedicated session or manager objects

Both projects avoid storing all gameplay data directly on listeners.

Observed examples:

- `NightMare` uses `GameManager`, `MatchManager`, `Game`, `PlayerSession`, `GamePhase`, and `MatchSession` style objects.
- `War` uses `GameService`, `PlayerSession`, `PlayerState`, `HeroService`, and `MapManager`.

Guidance:

- Put long-lived state into session, manager, or service classes.
- Keep listeners thin: validate the event, delegate to the relevant service, and exit.
- Prefer explicit gameplay state models over scattered flags.

## Pattern 3: Complex plugins grow by domain modules

As plugin scope grows, both projects split features into domain-oriented packages.

Observed `NightMare` domains:

- `Command`
- `Game`
- `Match`
- `GameConfig`
- `InitialListener`
- `Shop`
- `tasks`
- `Database`

Observed `War` domains:

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

`NightMare` leans toward manager-centric gameplay orchestration.

- Good fit for:
  - rounds
  - team elimination
  - map-specific game instances
  - match overlays on top of base game rules

`War` leans toward service-centric runtime orchestration.

- Good fit for:
  - a persistent combat lobby
  - class selection and respawn loops
  - progression and player data integration
  - rotating maps with a shared game mode

Guidance:

- Prefer manager-centric architecture for per-match or per-arena instances.
- Prefer service-centric architecture for one persistent shared mode with reusable systems.

## Pattern 5: Real plugins need both gameplay and operational layers

Both projects combine gameplay code with operational subsystems:

- config loading
- database connectivity
- scoreboard refreshes
- map loading
- command and listener registration
- shutdown cleanup

Guidance:

- Do not design only the combat mechanic.
- Also design startup, shutdown, persistence, UI refreshes, and failure paths.

## When to reuse which pattern

- New minigame with rounds, teams, and map instances:
  - prefer `GameManager` + `Game` + `PlayerSession` + optional `MatchManager`
- Persistent PvP lobby with class selection and map rotation:
  - prefer `GameService` + `PlayerSession` + `HeroService` + `MapManager`
- Plugin already large and messy:
  - use the domain package split pattern before adding more features
