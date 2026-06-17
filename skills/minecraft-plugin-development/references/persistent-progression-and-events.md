# Persistent Progression And Event Systems

Use this reference when working on long-running Minecraft server plugins where player progress, economy, perks, buffs, quests, or custom combat events persist beyond a single match.

This is most relevant for Pit-style PvP servers, MMORPG-like hubs, persistent brawl modes, faction-adjacent gameplay, and any plugin where the same player profile is mutated by many independent systems.

## Persistent profile boundaries

Large progression plugins often separate durable profile data from temporary runtime state.

Durable examples:

- level, prestige, experience, coins, renown, bounty, stats
- owned perks, selected perks, quest progress, trade limits, mail, medals
- inventory-like storage such as saved kits, ender chests, warehouses, or backups
- schema or profile format version

Runtime-only examples:

- combat timer
- current damage attribution map
- active buffs
- temporary streak counters
- editing mode
- last damage timestamp
- cached live `ItemStack` references

Guidance:

- Make save boundaries explicit with transient fields, ignored serializer fields, or dedicated DTOs.
- Use `UUID` as the durable identity for profile lookup and persistence.
- Avoid saving live Bukkit objects directly unless the project already has a serializer for them.
- Keep a profile version field when the profile shape may migrate over time.
- Prefer maps keyed by internal names for hot lookups such as perks, quests, buffs, or unlock states.

## Economy and progression mutation

Progression features rarely change only one number. A kill reward may affect coins, experience, bounty, streak, quests, assist credit, scoreboard lines, boss bars, and persistence dirty state.

Guidance:

- Route rewards through one service or domain method instead of duplicating math in listeners.
- Fire or call a domain-level event before finalizing rewards if other systems can modify the result.
- Clamp and validate player-facing amounts such as coins, XP, level, health, bounty, or cooldowns.
- Mark profiles dirty after mutation and save in batches when the codebase uses dirty tracking.
- Update visible UI from the main thread after persistence or reward computation completes.

## Custom domain events

Complex plugins often wrap Bukkit events in plugin-specific events such as damage, kill, assist, reward, quest completion, profile loaded, potion effect, or streak-change events.

Use custom events when:

- multiple systems need to observe or modify the same gameplay decision
- raw Bukkit events are too low-level for the plugin's rules
- rewards, assists, buffs, or perks need a consistent extension point
- tests or future features would benefit from a single domain signal

Guidance:

- Keep Bukkit listeners thin: translate the raw event into the plugin's domain model, then delegate.
- Define whether the custom event is cancellable or mutable.
- Document whether listeners may change damage, rewards, target state, or side effects.
- Avoid firing custom events from async threads if handlers may touch Bukkit state.
- Prevent recursion when a custom event handler triggers another raw Bukkit action.

## Perk, buff, quest, and event registries

Feature-heavy plugins often use factories or registries to discover and expose extension modules:

- perk registries grouped by interfaces such as damage, kill, assist, respawn, shoot, or tick hooks
- buff registries with optional Bukkit listener registration
- timed event registries split into normal and major events
- quest or medal registries keyed by stable internal names

Guidance:

- Require a stable internal name for every registered module.
- Keep display names separate from internal names so localization or formatting does not break saved data.
- Register Bukkit listeners only for modules that actually implement `Listener`.
- Prefer explicit registration when startup reliability matters; use reflection scanning only if the project already relies on it.
- Fail loudly on duplicate internal names.
- Expose read-only views when other systems only need to inspect registered modules.

## Timed events and rotating server activity

Long-running servers often schedule global events independently of arena matches.

Guidance:

- Store active event, next event, cooldown, and preparation phase explicitly.
- Separate preparation, active, inactive, and cleanup hooks.
- Avoid overlapping global events unless the design supports it.
- Keep boss bar, scoreboard, and broadcast updates tied to the active event state.
- Cancel or expire timers when the event is replaced, forced, or the plugin disables.
- Use configured online-player thresholds before starting high-impact events.

## Version and dependency boundaries

Persistent server plugins often depend on multiple optional and required plugins such as permissions, economy, points, protocol, world edit, database drivers, packet libraries, or custom server forks.

Guidance:

- Keep `plugin.yml` `depend` and `softdepend` aligned with startup code.
- Detect optional dependencies before using their APIs.
- Provide a degraded path or clear warning when a soft dependency is absent.
- Isolate NMS, packet, reflection, and custom fork calls behind adapters or utility classes.
- Check the target Minecraft version before adding APIs that do not exist on that server line.

## Review checklist

Before finishing changes to persistent progression code, verify:

- profile mutations happen through the intended service or domain method
- durable and runtime fields are not accidentally mixed during serialization
- custom events fire once and on the correct thread
- perk, buff, quest, or event modules have stable internal names
- duplicate modules cannot silently overwrite each other
- economy and progression changes update UI and dirty-save state consistently
- optional dependencies are checked before use
- scheduled global events clean up boss bars, tasks, and active state
