# Config, Data, And Async Patterns

Use this reference when a task touches config loading, persistence, caches, scoreboards, or background refreshes.

## Config patterns from real plugins

### NightMare-style config layer

`NightMare` uses multiple config-oriented classes:

- `PluginConfigManager`
- `GameConfigurationManager`
- `KillMessagesConfig`
- `MessagesConfig`
- `LevelsConfig`
- `MapConfig`
- `PlayerConfig`

This pattern works well when gameplay systems each own a distinct config surface.

Tradeoff:

- easy to grow per-domain config
- harder to keep defaults and reload semantics consistent unless carefully managed

### War-style config layer

`War` uses a more defensive wrapper around the main config and separate loaders for other domain files such as progression and heroes.

Observed strengths:

- fallback values
- warning logs on invalid config
- one wrapper for core lobby and material settings

Guidance:

- if the project is still compact, prefer a typed wrapper with fallbacks
- split into many config managers only when domain complexity truly requires it

## Database and player data patterns

### NightMare observations

- uses a database manager plus stats and brand-related storage
- flushes pending updates before disconnecting

### War observations

- separates `DatabaseManager`, repository, and service
- keeps in-memory cache keyed by `UUID`
- tracks dirty players
- flushes asynchronously
- rebuilds leaderboards from cached data

Guidance:

- use a repository or DAO boundary when persistence logic grows
- keep a cache for hot player stats
- record dirty entries instead of writing on every event
- flush on intervals and on shutdown

## Async rules for Paper plugins

Observed safe pattern in `War`:

- preload cache asynchronously
- when data is ready, switch to the main thread for Bukkit-side UI refreshes
- async leaderboard rebuilds avoid blocking gameplay

Recommended rules:

- async:
  - SQL
  - file-heavy processing
  - leaderboard rebuilds
  - cache recomputation
- main thread:
  - teleport
  - inventory changes
  - entity or world mutation
  - scoreboard and visible UI changes unless the API is explicitly thread-safe

## Background task patterns

Observed `War` patterns:

- async periodic leaderboard rebuild checks
- async dirty-player flush task
- throttled UI refresh strategy with dirty sets

Observed `NightMare` patterns:

- main-thread periodic game-stage task
- per-session cooldown ticking
- time-sensitive display refreshes tied to game progression

Guidance:

- use async tasks for data maintenance
- use main-thread tasks for gameplay progression
- if a task can be event-driven plus dirty-flagged, prefer that over brute-force refreshing everything every tick

## Config contribution guidance

When generating config-aware code:

- provide defaults
- validate inputs
- document required keys
- avoid silently crashing on invalid material names or missing locations
- mention whether reload is safe for the specific subsystem
