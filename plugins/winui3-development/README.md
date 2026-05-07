# WinUI 3 Development Plugin

End-to-end WinUI 3 and Windows App SDK toolkit: expert agent, coding instructions, UWP-to-WinUI 3 migration guide, MVVM Toolkit reference, plus CLIs for packaging/debugging (winapp) and Microsoft Store publishing (msstore). Covers the full write → package → publish lifecycle for desktop Windows apps and prevents common UWP API misuse.

## Installation

```bash
# Using Copilot CLI
copilot plugin install winui3-development@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/winui3-development:msstore-cli` | Microsoft Store Developer CLI for publishing Windows apps to the Microsoft Store — credentials, app/submission management, package flights, CI/CD publishing |
| `/winui3-development:mvvm-toolkit` | CommunityToolkit.Mvvm core: source generators (`[ObservableProperty]`, `[RelayCommand]`), base classes, validation, and pitfalls |
| `/winui3-development:mvvm-toolkit-di` | Wire MVVM Toolkit ViewModels into `Microsoft.Extensions.DependencyInjection` — Generic Host, lifetimes, constructor injection, testing |
| `/winui3-development:mvvm-toolkit-messenger` | MVVM Toolkit Messenger pub/sub — `WeakReferenceMessenger`, `IRecipient<T>`, `RequestMessage<T>`, channels, lifecycle |
| `/winui3-development:winapp-cli` | Windows App Development CLI for building, MSIX packaging, debugging-as-packaged, manifests, certificates, signing, and UI automation |
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
- **MVVM best practices** — CommunityToolkit.Mvvm source generators, compiled bindings, dependency injection
- **Migration checklist** — step-by-step guide for porting UWP apps
- **MSIX packaging & debugging** — `winapp` CLI for build, run-as-packaged, manifest, cert, and sign workflows
- **Store publishing** — `msstore` CLI for credentials, submissions, flights, and CI/CD publishing pipelines

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
