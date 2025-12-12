---
description: '.NET MAUI component and application patterns'
applyTo: '**/*.xaml, **/*.cs'
---

# .NET MAUI

## .NET MAUI Code Style and Structure

- Write idiomatic and efficient .NET MAUI and C# code.
- Follow .NET and .NET MAUI conventions.
- Keep UI (Views) focused on layout and bindings; keep logic in ViewModels and services.
- Use async/await for I/O and long-running work to keep the UI responsive.

## Naming Conventions

- Follow PascalCase for component names, method names, and public members.
- Use camelCase for private fields and local variables.
- Prefix interface names with "I" (e.g., IUserService).

## .NET MAUI and .NET Specific Guidelines

- Utilize .NET MAUI's built-in features for component lifecycle (e.g. OnAppearing, OnDisappearing).
- Use data binding effectively with `{Binding}` and MVVM patterns.
- Structure .NET MAUI components and services following Separation of Concerns.
- Use the language version supported by the repo's target .NET SDK and settings; avoid requiring preview language features unless the project is already configured for them.

## Critical Rules (Consistency)

- NEVER use ListView (deprecated). Use CollectionView.
- NEVER use TableView (deprecated). Prefer CollectionView or layouts such as Grid/VerticalStackLayout.
- NEVER use Frame (deprecated). Use Border instead.
- NEVER use `*AndExpand` layout options (deprecated). Use Grid and explicit sizing instead.
- NEVER place ScrollView or CollectionView inside StackLayout/VerticalStackLayout/HorizontalStackLayout (can break scrolling and virtualization). Use Grid as the parent layout.
- NEVER reference images as `.svg` at runtime. Use PNG/JPG resources.
- NEVER mix Shell navigation with NavigationPage/TabbedPage/FlyoutPage.
- NEVER use renderers. Use handlers.
- NEVER set `BackgroundColor`; use `Background` (supports gradients/brushes and is the preferred modern API).

## Layout and Control Selection

- Prefer `VerticalStackLayout`/`HorizontalStackLayout` over `StackLayout Orientation="..."` (more performant).
- Use `BindableLayout` for small, non-scrollable lists (≤20 items). Use `CollectionView` for larger or scrollable lists.
- Prefer `Grid` for complex layouts and when you need to subdivide space.
- Prefer `Border` over `Frame` for containers with borders/backgrounds.

## Shell Navigation

- Use Shell as the primary navigation host.
- Register routes with `Routing.RegisterRoute(...)` and navigate with `Shell.Current.GoToAsync(...)`.
- Set `MainPage` once at startup; avoid changing it frequently.
- Don't nest tabs inside Shell.

## Error Handling and Validation

- Implement proper error handling for .NET MAUI pages and API calls.
- Use logging for app-level errors; log and surface user-friendly messages for recoverable failures.
- Implement validation using FluentValidation or DataAnnotations in forms.

## MAUI API and Performance Optimization

- Prefer compiled bindings for performance and correctness.
	- In XAML, set `x:DataType` on pages/views/templates.
	- Prefer expression-based bindings in C# where possible.
	- Consider enabling stricter XAML compilation in project settings (for example `MauiStrictXamlCompilation=true`), especially in CI.
- Avoid deep layout nesting (especially nested StackLayouts). Prefer Grid for complex layouts.
- Keep bindings intentional:
	- Use `OneTime` when values don't change.
	- Use `TwoWay` only for editable values.
	- Avoid binding static constants; set them directly.
- Update UI from background work using `Dispatcher.Dispatch()` or `Dispatcher.DispatchAsync()`:
	- Prefer `BindableObject.Dispatcher` when you have a reference to a Page, View, or other BindableObject.
	- Inject `IDispatcher` via DI when working in services or ViewModels without direct BindableObject access.
	- Use `MainThread.BeginInvokeOnMainThread(...)` as a fallback only when no Dispatcher is available.
	- **Avoid** obsolete `Device.BeginInvokeOnMainThread` patterns.

## Resources and Assets

- Place images in `Resources/Images/`, fonts in `Resources/Fonts/`, and raw assets in `Resources/Raw/`.
- Reference images as PNG/JPG (e.g., `<Image Source="logo.png" />`), not `.svg`.
- Use appropriately sized images to avoid memory bloat.

## State Management

- Prefer DI-managed services for shared state and cross-cutting concerns; keep ViewModels scoped to navigation/page lifetimes.

## API Design and Integration

- Use HttpClient or other appropriate services to communicate with external APIs or your own backend.
- Implement error handling for API calls using try-catch and provide proper user feedback in the UI.

## Storage and Secrets

- Use `SecureStorage` for secrets (tokens, refresh tokens), and handle exceptions (unsupported device, key changes, corruption) by clearing/resetting and re-authenticating.
- Avoid storing secrets in Preferences.

## Testing and Debugging

- Test components and services using xUnit, NUnit, or MSTest.
- Use Moq or NSubstitute for mocking dependencies during tests.

## Security and Authentication

- Implement Authentication and Authorization in the MAUI app where necessary using OAuth or JWT tokens for API authentication.
- Use HTTPS for all web communication and ensure proper CORS policies are implemented.

## Common Pitfalls

- Changing `MainPage` frequently can cause navigation issues.
- Gesture recognizers on both parent and child views can conflict; use `InputTransparent = true` where needed.
- Memory leaks from unsubscribed events; always unsubscribe and dispose resources.
- Deeply nested layouts hurt performance; flatten the visual hierarchy.
- Testing only on emulators misses real-device edge cases; test on physical devices.
