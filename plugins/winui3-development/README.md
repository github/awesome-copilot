# WinUI 3 Development Plugin

WinUI 3 and Windows App SDK development agent, instructions, and migration guide. Prevents common UWP API misuse and guides correct WinUI 3 patterns for desktop Windows apps.

## Installation

```bash
# Using Copilot CLI
copilot plugin install winui3-development@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/winui3-development:winui3-migration-guide` | UWP-to-WinUI 3 migration reference with API mappings and before/after code snippets |

### Agents

| Agent | Description |
|-------|-------------|
| `winui3-expert` | Expert agent for WinUI 3 and Windows App SDK development. Prevents common UWP-to-WinUI 3 API mistakes, guides XAML controls, MVVM patterns, windowing, threading, app lifecycle, dialogs, and deployment. |

## Key Features

- **UWP→WinUI 3 API migration rules** — prevents the most common code generation mistakes
- **Threading guidance** — DispatcherQueue instead of CoreDispatcher
- **Windowing patterns** — AppWindow instead of CoreWindow/ApplicationView
- **Dialog/Picker patterns** — ContentDialog with XamlRoot, pickers with window handle interop
- **MVVM best practices** — CommunityToolkit.Mvvm, compiled bindings, dependency injection
- **Migration checklist** — step-by-step guide for porting UWP apps

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
