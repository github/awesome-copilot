# Bootstrap And Registration

Use this reference when changing `onEnable`, `onDisable`, command setup, event wiring, or startup ordering.

## Bootstrap pattern from real plugins

### Match-heavy minigame bootstrap

Common traits:

- connect database first
- register configuration serialization when needed
- initialize multiple config managers
- create gameplay managers and GUI helpers
- apply lobby UI to already-online players
- register many listeners explicitly
- start repeating tasks
- register commands and tab completers last

This pattern works well when startup must assemble many gameplay subsystems before the server can safely accept interactions.

### Persistent class-brawl bootstrap

Common traits:

- save default config and bundled resources first
- construct config wrapper and progression config
- connect database and create repository/service layers
- construct scoreboard, map, hero, and game services
- wire service dependencies together
- start background tasks
- preload async cache, then schedule main-thread UI refreshes
- register listeners and commands after service graph is ready

This pattern works well when player data and async services are first-class dependencies.

## Command registration rules

Observed practices:

- Match-heavy minigames often declare all commands in `plugin.yml`, then set executors and tab completers in code.
- Persistent brawl modes may declare a small command surface such as `leave`, then null-check `getCommand` before assigning the executor.

Recommended rules:

- always add new commands to `plugin.yml`
- if a command may be optional or renamed, null-check `getCommand`
- if tab completion exists, register it in the same change
- keep usage, permission, and permission-message aligned with actual code behavior

## Listener registration rules

Observed practices:

- both plugins register listeners in one place during startup
- listener constructors receive only the services they actually need

Recommended rules:

- keep registration centralized in the main plugin class or a clearly named bootstrap helper
- inject services explicitly instead of having listeners discover globals everywhere
- if a listener depends on a task, GUI, or manager, construct that dependency first

## Repeating tasks and startup ordering

Observed practices:

- Match-heavy minigames often start periodic gameplay tasks directly from startup for boundary checks and spectator UI refreshes
- Persistent brawl modes often start background tasks via services such as player data and game services

Recommended rules:

- start repeating tasks only after required state holders exist
- cancel them in shutdown
- if the task mutates gameplay state, ensure it runs on the main thread
- if the task does I/O or cache rebuilds, prefer async execution and hop back to main thread for Bukkit work

## Shutdown expectations

Observed practices:

- Match-heavy minigames delete games, unload maps, flush pending stats, close DB resources, and clear sidebars
- Persistent brawl modes shut down game service, player data service, map manager, then disconnect database

Recommended rules:

- stop tasks
- flush dirty data
- detach or clear UI objects
- unload temporary worlds if your plugin creates them
- close database pools last

## Contribution guidance for this skill

When generating code for startup or shutdown, mention:

- which config or resource files must exist
- which commands or listeners must be registered
- what tasks must be started or canceled
- what resources require cleanup on disable
