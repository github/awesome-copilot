---
description: 'EF Core and async safety for ASP.NET Core: no sync-over-async, no N+1, AsNoTracking, pagination, DTO projection'
applyTo: '**/*.cs'
---

# EF Core and async safety (ASP.NET Core)

Frontier C# models still copy JavaScript-shaped patterns: `.Result` on tasks, returning tracked entities from controllers, and N+1 reads. These instructions exist because generic C# guidance does not pin those failures.

Target .NET 8+ / C# 12+. Assume nullable enabled.

## Async I/O

- Async I/O methods return `Task` / `Task<T>` and are suffixed `Async`. Use `ValueTask<T>` only on hot paths that often complete synchronously.
- Never `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` in application code. Those block a thread and can deadlock.
- No `async void` except real event handlers. Exceptions from `async void` cannot be awaited.
- Flow `CancellationToken cancellationToken = default` as the last parameter through EF Core, `HttpClient`, streams, and delays.
- Do not wrap synchronous I/O in `Task.Run` and call it async.

## EF Core reads

- Use `AsNoTracking()` on read-only queries. Change tracking is only for entities you will `SaveChangesAsync`.
- Prevent N+1: `Include` / `ThenInclude`, or project with `Select`. Prefer projection for read models.
- Do not enable lazy-loading proxies in web apps. They hide N+1 during serialization.
- Paginate unbounded queries (`.Skip().Take()` or keyset). Never materialize a whole table.
- Use `AnyAsync(...)` for existence, not `CountAsync() > 0`.
- Do not combine `Include` with a `Select` projection — pick one.
- Consider `AsSplitQuery()` for multiple collection `Include`s.
- Use async EF APIs and pass `CancellationToken`.

## HTTP boundary

- Controllers are thin: bind, dispatch, map. No business logic and no direct EF in the controller if a service exists.
- Bind request DTOs. Never bind a domain entity (overposting).
- Return response DTOs, not entities.
- `201 Created` with `Location` for creates; `404` for missing; validation failures as `ProblemDetails`.

## Logging

- Use `ILogger<T>` with message templates, not string interpolation.
- Never log secrets or unnecessary PII. Never expose full exception messages to end users.
