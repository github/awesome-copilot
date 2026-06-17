# Build, Test, And Runtime Validation

Use this reference when a Minecraft plugin task touches build configuration, packaging, generated resources, deployment to a local test server, optional plugin integrations, reload behavior, or release readiness.

This is especially useful for Maven or Gradle Paper plugins with many YAML resources, shaded libraries, soft dependencies such as PlaceholderAPI or MythicMobs, and admin commands that validate runtime configuration.

## Build metadata and generated resources

Plugin projects often keep source resources under `src/main/resources` while build tools copy filtered output into `target/classes` or `build/resources`.

Guidance:

- Edit source resources, not generated copies.
- Treat `target/classes`, `build/classes`, `build/resources`, and copied server plugin jars as build output.
- When `plugin.yml` uses filtered values such as `${project.version}`, confirm resource filtering is enabled in Maven or Gradle.
- Keep `plugin.yml` `name`, `main`, `api-version`, commands, permissions, `depend`, `softdepend`, and `libraries` aligned with code and build files.
- If the package or main class changes, update `plugin.yml` in the same change.
- If command names change, update command registration, permission checks, tab completers, and usage text together.

Maven shape to recognize:

```xml
<resources>
  <resource>
    <directory>src/main/resources</directory>
    <filtering>true</filtering>
  </resource>
</resources>
```

## Shading and dependency scope

Paper plugins often combine server-provided APIs, optional plugin APIs, and libraries that must be bundled.

Guidance:

- Keep `paper-api`, Bukkit, Spigot, and optional plugin APIs as `provided` unless the project has a clear reason to bundle them.
- Shade libraries that the server will not provide, such as small UI helpers or standalone utility libraries.
- Relocate shaded libraries when they are likely to conflict with other plugins.
- Disable or review dependency-reduced POM output when it creates noisy or misleading repo changes.
- Do not shade plugin APIs that are listed in `depend` or `softdepend`.
- If `plugin.yml` uses Paper `libraries`, ensure the server version supports that mechanism and the dependency should be loaded by Paper instead of shaded.

Common relocation example:

```xml
<relocation>
  <pattern>fr.mrmicky.fastboard</pattern>
  <shadedPattern>com.example.plugin.libs.fastboard</shadedPattern>
</relocation>
```

## Optional plugin integrations

Plugins that integrate with PlaceholderAPI, MythicMobs, WorldEdit, economy plugins, permissions, NPC systems, or custom model plugins should degrade cleanly when the integration is optional.

Guidance:

- Put required plugins in `depend` and optional integrations in `softdepend`.
- Check `PluginManager#isPluginEnabled` before registering listeners that reference optional plugin event classes.
- Keep optional integration code isolated in a listener, adapter, or service.
- Log a clear warning when a soft dependency is missing and gameplay will be reduced.
- Ensure optional integration data flows through the plugin's normal state machine instead of bypassing rewards, inventory, quest, or cleanup logic.

For MythicMobs-style resource mobs:

- Match by stable internal mob names, not display names.
- Resolve the player killer carefully because the direct killer may be a projectile or other entity.
- Clear raw drops only after the plugin has accepted ownership of the reward path.
- Keep custom mob rewards tied to the same cleanup and persistence logic as normal gameplay rewards.

## Runtime config validation

Config-heavy plugins benefit from a non-destructive validation command that can run on startup, reload, and before a test round.

Useful validation surfaces:

- missing worlds, lobby points, spawn points, regions, or trial rooms
- zero-radius or zero-volume regions
- overlapping regions whose priority may be ambiguous
- unknown perk, kit, objective, mob, tier, material, or sidebar identifiers
- disabled systems still referenced by sidebar lines, rewards, objectives, or commands
- cooldowns, reward shares, and percentage sums outside safe ranges

Guidance:

- Return warnings and errors instead of crashing on every imperfect config.
- Cache the latest validation result so an admin command can display it after reload.
- Include the config file and path in each issue.
- Validate after reload before refreshing runtime services.
- Keep auto-fixes conservative; changing map coordinates, rewards, or progression rules silently can surprise server operators.

## Reload and service refresh

Stateful plugin reload is risky but sometimes required for active server iteration.

Guidance:

- Reload typed config models before rebuilding services that consume them.
- Restart repeating tasks that depend on changed config.
- Refresh online player state after reload: region, sidebar, action bar, NPC visibility, perk selections, and active objective state.
- Avoid stacking duplicate schedulers, boss bars, holograms, NPCs, or listeners after reload.
- Prefer explicit `stop()` and `start()` methods on services that own tasks or spawned entities.
- If reload is only partially supported, say exactly which systems require a server restart.

## First-round server test plan

For gameplay plugins, include a short manual test plan when code changes are hard to prove with unit tests.

Recommended checklist:

- Start the target Paper version with required dependencies installed.
- Confirm the plugin loads without console exceptions.
- Run the plugin's validation command if it has one.
- Test core commands and tab completion as both player and console where relevant.
- Test join, leave, death, respawn, disconnect, reconnect, and plugin disable cleanup.
- Test one happy path for the changed feature.
- Test one failure path such as missing permission, cooldown, invalid target, missing dependency, or bad config.
- Confirm generated entities, mobs, NPCs, holograms, scoreboards, boss bars, and temporary worlds are cleaned up.
- Confirm profile saves, rewards, ranking updates, and UI refreshes happen once and on the expected thread.

## Review checklist

Before finishing build or deployment-related changes, verify:

- source resources were changed instead of generated output
- generated README or marketplace files are updated if the repository requires it
- build files and `plugin.yml` agree on version, main class, dependencies, and commands
- shaded dependencies are relocated when conflict-prone
- optional integrations have guards and clear degraded behavior
- validation commands or test checklists cover the changed gameplay path
- local build output is not committed unless the repository intentionally tracks it
