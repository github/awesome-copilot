---
name: minecraft-plugin-development
description: 'Use this skill when building or modifying Minecraft server plugins for Paper, Spigot, or Bukkit, including plugin.yml setup, commands, listeners, schedulers, player state, team or arena systems, persistent progression, economy or profile data, configuration files, Adventure text, and version-safe API usage. Trigger for requests like "build a Minecraft plugin", "add a Paper command", "fix a Bukkit listener", "create plugin.yml", "implement a minigame mechanic", "add a perk or quest system", or "debug server plugin behavior".'
---

# Minecraft Plugin Development

Use this skill for Minecraft server plugin work in the Paper, Spigot, and Bukkit ecosystem.

This skill is especially useful for gameplay-heavy plugins such as combat systems, wave or boss encounters, war or team modes, arenas, kit systems, cooldown-based abilities, scoreboards, and config-driven game rules.

For grounded implementation patterns drawn from real Paper plugins, load these references as needed:

- [`references/project-patterns.md`](references/project-patterns.md) for high-level architecture patterns seen in real gameplay plugins
- [`references/bootstrap-registration.md`](references/bootstrap-registration.md) for `onEnable`, command wiring, listener registration, and shutdown expectations
- [`references/state-sessions-and-phases.md`](references/state-sessions-and-phases.md) for player session modeling, game phases, match state, and reconnect-safe logic
- [`references/config-data-and-async.md`](references/config-data-and-async.md) for config managers, database-backed player data, async flushes, and UI refresh tasks
- [`references/maps-heroes-and-feature-modules.md`](references/maps-heroes-and-feature-modules.md) for map rotation, hero or class systems, and modular feature growth
- [`references/minigame-instance-flow.md`](references/minigame-instance-flow.md) for arena instances, countdowns, loot refreshes, wave systems, visibility isolation, and entity-to-game ownership
- [`references/persistent-progression-and-events.md`](references/persistent-progression-and-events.md) for long-running PvP servers with profiles, perks, buffs, quests, economy, custom domain events, and extension registries
- [`references/build-test-and-runtime-validation.md`](references/build-test-and-runtime-validation.md) for Maven or Gradle packaging, shaded dependencies, generated resources, soft dependencies, config validation commands, and first-round server test plans

## Scope

- In scope: Paper, Spigot, Bukkit plugin development
- In scope: `plugin.yml`, commands, tab completion, listeners, schedulers, configs, permissions, Adventure text, player state, minigame flow, arena instances, map copies, loot, waves, persistent profiles, perks, buffs, quests, economy, and PvP/PvE game loops
- In scope: Java-based server plugin architecture, debugging, refactoring, and feature implementation
- Out of scope by default: Fabric mods, Forge mods, client mods, Bedrock add-ons

If the user says "Minecraft plugin" but the stack is unclear, first determine whether the project is Paper/Spigot/Bukkit or a modding stack.

## Default Working Style

When this skill triggers:

1. Identify the server API and version target.
2. Identify the build system and Java version.
3. Inspect `plugin.yml`, the main plugin class, and command or listener registration.
4. Map the gameplay flow before editing code:
   - player lifecycle
   - game phases
   - timers and scheduled tasks
   - team, arena, or match state
   - config and persistence
5. Make the smallest coherent change that keeps registration, config, and runtime behavior aligned.

If the plugin is gameplay-heavy or stateful, read [`references/project-patterns.md`](references/project-patterns.md) and [`references/state-sessions-and-phases.md`](references/state-sessions-and-phases.md) before editing.

If the task touches arena isolation, map instances, chest or resource refills, wave spawning, route voting, spectator visibility, or game-specific chat, also read [`references/minigame-instance-flow.md`](references/minigame-instance-flow.md).

If the task touches persistent player progression, profile saves, economy rewards, perks, buffs, quests, custom combat events, or long-running shared PvP servers, also read [`references/persistent-progression-and-events.md`](references/persistent-progression-and-events.md).

If the task touches build files, `plugin.yml` metadata, shaded dependencies, generated resource output, deployment to a test server, optional plugin integrations, or release validation, also read [`references/build-test-and-runtime-validation.md`](references/build-test-and-runtime-validation.md).

## Project Discovery Checklist

Check these first when present:

- `plugin.yml`
- `pom.xml`, `build.gradle`, or `build.gradle.kts`
- the plugin main class extending `JavaPlugin`
- command executors and tab completers
- listener classes
- config bootstrap code for `config.yml`, messages, kits, arenas, or custom YAML files
- generated resource output such as `target/classes`, `build/resources`, or copied plugin jars
- scheduler usage through Bukkit scheduler APIs
- any player data, team state, arena state, or match state containers

## Core Rules

### Prefer the concrete server API in the repo

- If the project already targets Paper APIs, keep using Paper-first APIs instead of downgrading to generic Bukkit unless compatibility is explicitly required.
- Do not assume an API exists across all versions. Check the existing dependency and surrounding code style first.

### Keep registration in sync

When adding commands, permissions, or listeners, update the relevant registration points in the same change:

- `plugin.yml`
- plugin startup registration in `onEnable`
- any permission checks in code
- any related config or message keys

### Respect main-thread boundaries

- Do not touch world state, entities, inventories, scoreboards, or most Bukkit API objects from async tasks unless the API explicitly permits it.
- Use async tasks for external I/O, heavy computation, or database work, then switch back to the main thread before applying gameplay changes.

### Model gameplay as state, not scattered booleans

For gameplay plugins, prefer explicit state objects over duplicated flags:

- match or game phase
- player role or class
- cooldown state
- team membership
- arena assignment
- alive, eliminated, spectating, or queued state

When the feature affects match-heavy minigames or persistent-brawl gameplay, look for hidden state transitions first before patching symptoms.

For multi-arena plugins, isolate per-game visibility, chat recipients, scoreboards, loot, and entity ownership. Do not let one arena observe or mutate another arena by accident.

### Favor config-driven values

When the feature includes damage, cooldowns, rewards, durations, messages, map settings, or toggles:

- prefer config-backed values over hardcoding
- provide sensible defaults
- keep key names stable and readable
- validate or sanitize missing values

### Be careful with reload behavior

- Avoid promising safe hot reload unless the code already supports it well.
- On config reload, ensure in-memory caches, scheduled tasks, and gameplay state are handled consistently.

## Implementation Patterns

### Commands

For new commands:

- add the command to `plugin.yml`
- implement executor and tab completion when needed
- validate sender type before casting to `Player`
- separate parsing, permission checks, and gameplay logic
- send clear player-facing feedback for invalid usage

Minimal registration shape:

```yaml
commands:
  arena:
    description: Join or leave an arena
    usage: /arena <join|leave>
```

```java
@Override
public void onEnable() {
    ArenaCommand command = new ArenaCommand(gameService);
    PluginCommand arena = getCommand("arena");
    if (arena != null) {
        arena.setExecutor(command);
        arena.setTabCompleter(command);
    }
}
```

### Listeners

For event listeners:

- guard early and return early
- check whether the current player, arena, or game phase should handle the event
- avoid doing expensive work in hot events such as move, damage, or interact spam
- centralize repeated checks where practical

### Scheduled Tasks

For timers, rounds, countdowns, cooldowns, or periodic checks:

- store task handles when cancellation matters
- cancel tasks on plugin disable and when a match or arena ends
- avoid multiple overlapping tasks for the same gameplay concern unless explicitly intended
- prefer one authoritative game loop over many loosely coordinated repeating tasks
- ensure countdown or refill tasks self-cancel when the game leaves the expected state

Main-thread handoff shape:

```java
Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
    PlayerData data = repository.load(playerId);
    Bukkit.getScheduler().runTask(plugin, () -> {
        Player player = Bukkit.getPlayer(playerId);
        if (player != null && player.isOnline()) {
            scoreboard.update(player, data);
        }
    });
});
```

### Player and Match State

For per-player or per-match state:

- define ownership clearly
- clean up on quit, kick, death, match end, and plugin disable
- avoid memory leaks from stale maps keyed by `Player`
- prefer `UUID` for persistent tracking unless a live player object is strictly needed

### Text and Messages

When the project uses Adventure or MiniMessage:

- follow the existing formatting approach
- avoid mixing legacy color codes and Adventure styles without a reason
- keep message templates configurable when messages are gameplay-facing

## High-Risk Areas

Pay extra attention when editing:

- damage handling and custom combat logic
- death, respawn, spectator, and elimination flow
- arena join and leave flow
- scoreboard or boss bar updates
- inventory mutation and kit distribution
- async database or file access
- economy, quest, perk, and profile mutation
- custom event dispatch or extension registries
- version-sensitive API calls
- shutdown and cleanup in `onDisable`
- cross-arena visibility, chat, and broadcast isolation
- map copy, unload, and folder deletion logic
- mob, NPC, projectile, or temporary entity ownership
- chest or resource refill systems

## Output Expectations

When implementing or revising plugin code:

- produce runnable Java code, not pseudo-code, unless the user asks for design only
- mention any required updates to `plugin.yml`, config files, build files, or resources
- call out version assumptions explicitly
- point out thread-safety or API-compatibility risks when they exist
- preserve the project's existing conventions and folder structure

When the requested change touches plugin startup, async data, match flow, class systems, or rotating maps, consult the matching reference file before editing.

## Validation Checklist

Before finishing, verify as many of these as the task allows:

- the command, listener, or feature is registered correctly
- `plugin.yml` matches the implemented behavior
- imports and API types match the targeted server stack
- scheduler usage is safe
- config keys referenced in code exist or have defaults
- state cleanup paths exist for match end, player quit, and plugin disable
- per-arena chat, visibility, scoreboards, and broadcasts are isolated
- temporary worlds, mobs, tasks, and generated resources are cleaned up
- there are no obvious null, cast, or lifecycle hazards

## Common Gotchas

- Casting `CommandSender` to `Player` without checking
- Updating Bukkit state from async tasks
- Forgetting to register listeners or declare commands in `plugin.yml`
- Using `Player` objects as long-lived map keys when `UUID` is safer
- Leaving repeating tasks alive after a round, arena, or plugin shutdown
- Hardcoding gameplay constants that should live in config
- Assuming Paper-only APIs in a Spigot-targeted plugin
- Treating reload as free even though stateful plugins often break under reload
- Broadcasting, showing players, or applying scoreboard changes across unrelated game instances
- Loading or mutating chest/container blocks before their chunks are available
- Forgetting to unregister spawned mobs or temporary entities from the owning game
- Editing generated files under `target/classes` or `build/resources` instead of source files under `src/main/resources`

## Preferred Response Shape

For substantial requests, structure work like this:

1. Current plugin context and assumptions
2. Gameplay or lifecycle impact
3. Code changes
4. Required registration or config updates
5. Validation and remaining risks

For small requests, keep the answer concise but still mention any needed `plugin.yml`, config, or lifecycle updates.
