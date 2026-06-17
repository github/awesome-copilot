# Minigame Instance Flow

Use this reference when building arena-style PvP games, SkyWars-style island games, dungeon or wave modes, rotating map instances, or any plugin where multiple players, worlds, mobs, scoreboards, and timers belong to a specific game instance.

## Instance ownership pattern

Good minigame plugins make ownership explicit:

- a global `GameManager` or `GameService` tracks active games
- each `Game` owns its map or world instance
- players are mapped to exactly one active game or lobby state
- temporary mobs, projectiles, NPCs, or spawned objects are mapped back to their owning game
- scoreboards, visibility, chat recipients, loot, and timers are scoped to the owning game

Recommended maps:

- `Map<String, Game>` for active games by generated ID
- `Map<UUID, Game>` or `Map<UUID, PlayerSession>` for player ownership
- `Map<UUID, Game>` for spawned mob or entity ownership when using MythicMobs, custom NPCs, or boss waves

Avoid relying on world name, inventory contents, scoreboard text, or entity display names as the only source of truth.

## State machine for arena games

Common PvP arena states:

- `WAITING`
- `STARTING`
- `STARTED`
- `ENDED`

Common persistent-brawl states:

- `LOBBY`
- `RESPAWNING`
- `IN_BRAWL`

Common dungeon or route-node states:

- lobby or route-selection phase
- active combat node
- peaceful room, shop, event, or rest node
- victory or cleanup phase

Guidance:

- gate every event listener by state before applying gameplay effects
- when transitioning state, update timers, scoreboards, visibility, player inventory, and protected areas together
- use state changes as the single place to start countdowns, refill tasks, end countdowns, and wave spawning
- if a task only makes sense in one state, it should cancel itself when the game leaves that state

## Player isolation

Multi-arena plugins must isolate more than teleport destinations.

Check these surfaces:

- player visibility with `showPlayer` and `hidePlayer`
- chat recipients, especially in `AsyncChatEvent`
- scoreboard instances and sidebar updates
- tab list names or ranks
- boss bars and title broadcasts
- lobby items and game-only inventory state
- damage, block, item pickup, item drop, interact, teleport, respawn, and quit events

Rules:

- if two players are not in the same visibility group, hide them from each other from both directions
- lobby players should not receive arena chat or arena broadcasts
- arena players should not receive unrelated lobby or other-arena game messages
- spectator players should be excluded from combat, pickup, block, and interaction logic unless explicitly allowed

## Countdown and repeating task lifecycle

Typical tasks:

- start countdown
- end countdown
- chest or resource refill countdown
- scoreboard or sidebar flush
- phase or wave delay
- map rotation ticker
- dirty data flush

Rules:

- store `BukkitTask` handles when cancellation matters
- do not start a second task for the same game concern without canceling or checking the first
- countdown tasks should read the current game state on every tick and self-cancel when stale
- delay tasks should re-check that the game still exists and is still running before acting
- clean up tasks on game end and plugin shutdown

## Loot and resource refill systems

Sky-island and arena plugins often need config-driven resource distribution.

Useful structure:

- group container locations by role, such as island, middle, center, normal, rare, or overpowered
- load weighted loot from config
- build a total loot pool for a group
- shuffle items before placing them
- choose random empty inventory slots with a bounded retry loop
- validate missing or invalid loot config by warning and falling back safely

Container safety:

- load the chunk before reading a configured chest or barrel
- verify the block is a `Container` before casting
- if the configured block is missing, either recreate it intentionally or warn and skip it
- clear previous contents before refill if the design expects a full reset
- avoid heavy loot generation in hot events

## Wave, mob, and route-node systems

Dungeon-style plugins commonly combine route selection with combat waves.

Recommended model:

- keep a queue of pending mob IDs for the current wave
- keep a set of active mob UUIDs for spawned mobs
- register each spawned mob UUID to the owning game
- on mob death, remove it from the active set and unregister ownership
- a wave is clear only when both the pending queue and active set are empty
- after a wave clears, schedule the next wave or return to the route/lobby phase

Route voting guidance:

- only alive and active players should vote or proceed
- prune vote maps against currently active player UUIDs before checking thresholds
- handle missing stage templates with a fallback or a clean victory/end path
- peaceful rooms should have a clear proceed gate instead of silently advancing

Cleanup rules:

- unregister mobs on death, game stop, and plugin disable
- unload old stage maps only after players are safely teleported out
- clear wave queues and active mob sets when a game ends
- never let a stale mob death event advance a completed or deleted game

## Map instance and rotation rules

For copied temporary worlds:

- copy the source map into a unique active folder
- create or load the world from that folder
- configure gamerules after the world exists
- set autosave intentionally
- teleport players out before unload
- unload the world before deleting its folder
- delete old folders after unload and log failures

For rotating shared battlefields:

- warn players before rotation
- snapshot current participants before loading the next map
- move participants to the new spawn and reset transient class or ability state
- refresh scoreboards, tab names, leaderboards, and visibility after rotation
- prevent scoreboard refresh from running every tick if the displayed countdown changes slowly

## Listener heuristics

For every listener touching gameplay state:

- return early if the entity or player has no session
- resolve the owning game once and reuse it
- check the game state before mutating blocks, inventory, health, drops, or scoreboards
- check spectator, safe-zone, team, and combat-tag rules before allowing damage
- keep world-to-game and entity-to-game checks consistent
- do not assume `Player#getKiller()` is enough for custom combat; use combat tags when projectile, skill, or ability damage matters

## Third-party plugin integrations

Common integrations:

- PlaceholderAPI for scoreboards, tab names, or external placeholders
- MythicMobs for custom mob spawning and skills
- menu plugins for lobby selectors
- database libraries for player progression

Rules:

- declare hard dependencies in `depend` only when startup cannot work without them
- use `softdepend` and runtime checks for optional features
- keep optional integration registration isolated from core startup
- when casting external skills or spawning external mobs, handle missing IDs and API failures gracefully
- prefer service boundaries so the rest of the game code does not directly depend on every integration API
