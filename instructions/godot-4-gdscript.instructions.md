---
description: "Prevent Godot 3 syntax in Godot 4 projects: GDScript 2.0 annotations, await, setters, @rpc, typed signals and Callables"
applyTo: "**/*.gd"
---

# Godot 4 GDScript 2.0 (no Godot 3 syntax)

## GDScript 2.0 syntax (never Godot 3)
| Godot 3 (wrong) | Godot 4 (use) |
|---|---|
| `export var speed = 5` / `export(int) var` | `@export var speed: float = 5.0` (`@export_range`, `@export_enum`, `@export_group`) |
| `onready var x = $X` | `@onready var x: Node2D = $X` |
| `tool` | `@tool` (first line) |
| `yield(get_tree().create_timer(1), "timeout")` | `await get_tree().create_timer(1.0).timeout` |
| `yield(obj, "signal")` | `await obj.signal_name` |
| `var x setget set_x, get_x` | `var x: int:` with `set(value):` / `get:` blocks |
| `puppet` funcs | `@rpc` (authority-only; Godot 4 default) |
| `remote` funcs | `@rpc("any_peer")` |
| `remotesync` funcs | `@rpc("any_peer", "call_local")` |
| `puppetsync` funcs | `@rpc("call_local")` |
| `master` funcs | no direct map; use `@rpc("any_peer")` + `multiplayer.get_remote_sender_id()` check |
| `funcref(obj, "m")` | `Callable(obj, "m")` or just `obj.m` |
| `PoolStringArray`, `PoolVector2Array` | `PackedStringArray`, `PackedVector2Array` |
- Use static typing everywhere: `var hp: int = 100`, `func hit(dmg: int) -> void:`. Use `:=` for inferred types.
- Lifecycle overrides (`_ready`, `_process`) no longer call the parent automatically; call `super()` when extending a scripted class.
- Use `StringName` literals `&"action"` for input actions/groups and `^"path"` NodePaths where it helps.

## Signals & Callables
- Declare typed signals: `signal health_changed(new_value: int)`.
- Connect with the Signal object: `button.pressed.connect(_on_button_pressed)`. Never use the Godot 3 form `connect("pressed", self, "_on_button_pressed")`.
- Bind extra args with `.bind()`: `enemy.died.connect(_on_enemy_died.bind(enemy))`. Flags: `connect(callable, CONNECT_ONE_SHOT)`.
- Emit with `health_changed.emit(hp)` rather than `emit_signal("health_changed", hp)`.
- Disconnect with `sig.disconnect(callable)`; check `sig.is_connected(callable)` first.
- Use lambdas for small handlers: `timer.timeout.connect(func(): queue_free())`.
- Prefer signals ("call down, signal up") over `get_parent().get_parent()` chains.
