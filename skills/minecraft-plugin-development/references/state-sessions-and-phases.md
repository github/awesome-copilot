# State, Sessions, And Phases

Use this reference when designing player state, match flow, cooldowns, respawn logic, class selection, or round progression.

## Session modeling in real plugins

### Rich minigame session

Feature-heavy minigames often keep rich per-player runtime state in `PlayerSession`, including:

- current team
- kill and final kill counters
- death flag
- persistent potion-like buffs
- selected brands grouped by category
- per-brand cooldowns
- special item cooldowns

This is a strong pattern for feature-heavy minigames where one player can carry many temporary gameplay modifiers.

### Lean persistent-brawl session

Persistent brawl modes often keep a leaner `PlayerSession`, including:

- `PlayerState`
- selected hero
- fall protection state
- safe-zone tracking
- generic cooldown map

This is a strong pattern when the plugin has one dominant game loop and most feature-specific behavior lives in services.

## Rule 1: model player state explicitly

Do not infer state from inventory contents, world, or scoreboard text alone.

Prefer an enum or similarly explicit model such as:

- `LOBBY`
- `RESPAWNING`
- `IN_BRAWL`
- queueing
- spectating
- eliminated
- reconnect-pending

## Rule 2: use sessions as the source of temporary truth

Good session contents:

- cooldowns
- selected class or hero
- selected team
- in-round modifiers
- safe-zone knowledge
- reconnect markers
- fall protection or spawn protection

Avoid placing these as scattered listener fields.

## Rule 3: gameplay phases deserve first-class objects

Observed match-heavy minigame pattern:

- `GamePhase`
- scheduled phase transitions
- boss and bed-destruction events tied to phases
- phase-dependent spawners and world border changes

Guidance:

- for round-based modes, use a phase enum or state machine
- trigger map-wide events from phase transitions, not random listeners
- keep the “what happens at phase N” logic centralized

## Rule 4: match overlays should not be mixed blindly into normal rounds

Observed match overlay pattern:

- `MatchManager`
- `MatchSession`
- separate handling for participants, observers, reconnects, brand rules, and round interception

Guidance:

- if tournament or match mode changes the base game rules, isolate it behind a dedicated manager
- keep “normal game” and “match override” behavior composable, not tangled

## Rule 5: reconnect and cleanup paths matter

Observed concerns:

- match participants may disconnect and reconnect
- game sessions can outlive the current online `Player` object
- cleanup must happen on quit, death, round end, and plugin shutdown

Guidance:

- prefer `UUID` for durable identity
- if you must keep live `Player` references, also define detach/reattach behavior
- always think through quit, reconnect, death, respawn, and shutdown together

## Rule 6: cooldowns should be centralized

Observed patterns:

- Some match-heavy minigames tick cooldown maps during stage task updates
- Some persistent-brawl modes store cooldown expiry timestamps in session data

Choose based on your mode:

- tick-down integers:
  - good for per-second synchronized gameplay pacing
- expiry timestamps:
  - good for lightweight cooldown checks across arbitrary actions

## Practical design heuristic

If your feature changes what a player is allowed to do for some period of time, it probably belongs in session state.

If your feature changes what the whole match is doing, it probably belongs in game or match state.
