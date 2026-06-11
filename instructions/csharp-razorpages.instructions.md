---
description: 'Razor Pages component and application patterns'
applyTo: '**/*.cshtml, **/*.cshtml.cs'
---

## Razor Pages Code Style and Structure

- Write idiomatic, efficient Razor Pages and C#.
- Stick to the conventions the framework is built around: handler-based PageModels, not MVC controller patterns shoehorned into pages.
- Keep PageModels focused on request/response orchestration; business logic belongs in injected domain services.
- Trivial handlers can stay inline. For pages with lots of handlers and dependencies, reach for a mediator like MediatR.
- Use async/await end-to-end so handlers don't block the request pipeline.

## Naming Conventions

- PascalCase for PageModel classes, handler methods, and public members (`CreateModel`, `OnPostAsync`, `OnPostDeleteAsync`).
- camelCase for private fields and locals, with the `_` prefix on private fields per the .NET convention (`_context`, `_logger`).
- Interface names start with "I" (`IEmailService`).
- Named handlers drop the `OnPost`/`Async` affixes when routed. `OnPostJoinListAsync` is reached as `handler=JoinList`.

## Model Binding and Overposting

- Don't put `[BindProperty]` on EF or domain entities directly. An attacker can post extra fields like `IsAdmin` or `Secret` and the binder will happily set them, even if the form doesn't render them.
- Bind to a dedicated Input Model or View Model that exposes only the properties the page is allowed to accept, then map to the entity.
- `TryUpdateModelAsync<T>` with an explicit allow-list of properties is another option, especially in edit scenarios.
- Avoid `[Bind]` for edits. Excluded properties get reset to `default(T)` rather than left alone, which is rarely what you want. Prefer Input Models.
- Don't enable `[BindProperty(SupportsGet = true)]` broadly. Razor Pages skips GET binding by default for a reason; opt in per-property and validate what comes in.
- For custom types (including strongly-typed IDs), implement `TryParse` or a `TypeConverter` so they bind from route and query values. Without one, the binder treats them as complex types and binding silently fails. One of those bugs that wastes an afternoon.
- `[BindRequired]` and `[Required]` aren't the same thing. `[BindRequired]` errors when the source value is *absent* from the posted form; `[Required]` validates that the bound value isn't null/empty. `[BindRequired]` only applies to form binding, since JSON and XML go through input formatters instead.

## Handler Methods and Request Flow

- Always use Post-Redirect-Get on successful POSTs. Return `RedirectToPage("./Index")`, never `Page()`. Returning `Page()` on success means a browser refresh resubmits the form.

```csharp
public async Task<IActionResult> OnPostAsync()
{
    if (!ModelState.IsValid) return Page();          // re-render on error
    await _service.CreateAsync(Input);
    return RedirectToPage("./Index");                // PRG on success
}
```

- Guard every persistence path with `if (!ModelState.IsValid) return Page();`. Client-side validation can be bypassed; the server is authoritative.
- Use a handler parameter (`OnGetAsync(int id)`) for single-request route or query values. Use `[BindProperty]` for POST data that needs to round-trip back to the view on validation errors.
- Named handlers (`OnPostDeleteAsync`, `OnPostApproveAsync`) need the `asp-page-handler` tag helper on the submit button. Without it, plain buttons fall back to `OnPostAsync` or 404.
- If `OnGet` does expensive work, add a lightweight `OnHead`. Razor Pages falls back to `OnGet` for HEAD requests otherwise, so every probe pays the full GET cost.
- Filters work differently here than in MVC: `[ActionFilter]` attributes are silently ignored on page handlers. Use `IPageFilter` / `IAsyncPageFilter`, or register global conventions through `options.Conventions` in `Program.cs`.

## Project Structure and Conventions

- Shared layouts, partials, and templates go in `Pages/Shared/`, not `Views/Shared/`. Razor Pages resolves views hierarchically from the page's folder up through `Pages/`, and mixing in MVC conventions just fights the framework.
- Set `Layout` in `Pages/_ViewStart.cshtml`. Use `Pages/_ViewImports.cshtml` for `@namespace`, `@addTagHelper`, and shared directives.
- Keep `.cshtml` and `.cshtml.cs` colocated. Per-page locality is one of the main reasons to use Razor Pages in the first place, and splitting them across folders throws that away.

## Security

- Trust Razor's default `@` expression HTML encoding. Don't reach for `@Html.Raw()` on user-supplied content; it disables encoding and opens the door to XSS.
- Stick with `<form method="post">` and the Form Tag Helper so the antiforgery token gets injected automatically. For AJAX or `fetch`, render the token with `@Html.AntiForgeryToken()` and send it as the `RequestVerificationToken` header.
- Don't commit secrets to `appsettings.json`. Use `appsettings.{Environment}.json` for environment overrides, User Secrets (`dotnet user-secrets`) locally, and Azure Key Vault or environment variables in production. Bind via `IOptions<T>`.

## Dependency Injection in PageModels

- Watch for the scoped-in-singleton captive dependency trap. If a singleton holds a reference to a scoped service (like an EF `DbContext`), that instance leaks across requests. Common bug in PageModel-adjacent services.
- Don't register a `DbContext` as `Singleton`. The default `AddDbContext` registration is `Scoped` for a reason.

## Entity Framework Core in Page Handlers

- Project EF entities to DTOs or View Models with `.Select(...)` before returning them to the view. Passing entities with navigation properties straight through causes lazy-loading exceptions, N+1 queries, or serialization cycles when the view renders.
- Use `.AsNoTracking()` on read-only queries like list pages or details pages without edit. The change tracker has overhead you don't need there.
- Prefer `FindAsync(key)` over `FirstOrDefaultAsync(x => x.Id == key)` when fetching by primary key without `Include`. `FindAsync` checks the change tracker first.

## State Management

- `TempData` is for one-shot, cross-redirect messages like flash notifications after a PRG. It's read-once, cookie-serialized by default, and not a substitute for session storage.
- For actual per-user session state, use `ISession`. For per-request data, `HttpContext.Items`. For shared state within a single request, request-scoped DI services.
- Call `TempData.Keep()` or `TempData.Peek()` when a value needs to survive multiple redirects without being consumed.

## Testing

- Unit-test `PageModel` classes directly. Instantiate them with mocked dependencies (Moq, NSubstitute) and assert on the returned `IActionResult`: `PageResult` for re-renders, `RedirectToPageResult` for successful PRG, `NotFoundResult` for 404 paths.
- For integration tests that exercise routing, model binding, and antiforgery, use `WebApplicationFactory<TEntryPoint>` with `Microsoft.AspNetCore.Mvc.Testing`.
- When testing handlers that read `ModelState`, populate it manually with `PageModel.ModelState.AddModelError(...)`. The binding pipeline doesn't run in unit tests.