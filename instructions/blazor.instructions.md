---
description: 'Blazor component and application patterns'
applyTo: '**/*.razor, **/*.razor.cs, **/*.razor.css'
---

## Blazor Code Style and Structure

- Write idiomatic and efficient Blazor and C# code.
- Follow .NET and Blazor conventions.
- Use Razor Components appropriately for component-based UI development.
- Prefer inline functions for smaller components but separate complex logic into code-behind or service classes.
- Async/await should be used where applicable to ensure non-blocking UI operations.

## Naming Conventions

- Follow PascalCase for component names, method names, and public members.
- Use camelCase for private fields and local variables.
- Prefix interface names with "I" (e.g., IUserService).

## Blazor and .NET Specific Guidelines

- Utilize Blazor's built-in features for component lifecycle (e.g., OnInitializedAsync, OnParametersSetAsync).
- Use data binding effectively with @bind.
- Leverage Dependency Injection for services in Blazor.
- Structure Blazor components and services following Separation of Concerns.
- Always use the latest version C#, currently C# 13 features like record types, pattern matching, and global usings.

## Error Handling and Validation

- Implement proper error handling for Blazor pages and API calls.
- Use logging for error tracking in the backend and consider capturing UI-level errors in Blazor with tools like ErrorBoundary.
- Implement validation using FluentValidation or DataAnnotations in forms.

## Blazor API and Performance Optimization

- Utilize Blazor server-side or WebAssembly optimally based on the project requirements.
- Use asynchronous methods (async/await) for API calls or UI actions that could block the main thread.
- Optimize Razor components by reducing unnecessary renders and using StateHasChanged() efficiently.
- Minimize the component render tree by avoiding re-renders unless necessary, using ShouldRender() where appropriate.
- Use EventCallbacks for handling user interactions efficiently, passing only minimal data when triggering events.

## Caching Strategies

- Implement in-memory caching for frequently used data, especially for Blazor Server apps. Use IMemoryCache for lightweight caching solutions.
- For Blazor WebAssembly, utilize localStorage or sessionStorage to cache application state between user sessions.
- Consider Distributed Cache strategies (like Redis or SQL Server Cache) for larger applications that need shared state across multiple users or clients.
- Cache API calls by storing responses to avoid redundant calls when data is unlikely to change, thus improving the user experience.

## State Management Libraries

- Use Blazor's built-in Cascading Parameters and EventCallbacks for basic state sharing across components.
- Implement advanced state management solutions using libraries like Fluxor or BlazorState when the application grows in complexity.
- For client-side state persistence in Blazor WebAssembly, consider using Blazored.LocalStorage or Blazored.SessionStorage to maintain state between page reloads.
- For server-side Blazor, use Scoped Services and the StateContainer pattern to manage state within user sessions while minimizing re-renders.

## API Design and Integration

- Use HttpClient or other appropriate services to communicate with external APIs or your own backend.
- Implement error handling for API calls using try-catch and provide proper user feedback in the UI.

## Testing and Debugging in Visual Studio

- All unit testing and integration testing should be done in Visual Studio Enterprise.
- Test Blazor components and services using xUnit, NUnit, or MSTest.
- Use Moq or NSubstitute for mocking dependencies during tests.
- Debug Blazor UI issues using browser developer tools and Visual Studio's debugging tools for backend and server-side issues.
- For performance profiling and optimization, rely on Visual Studio's diagnostics tools.

## Security and Authentication

- Implement Authentication and Authorization in the Blazor app where necessary using ASP.NET Identity or JWT tokens for API authentication.
- Use HTTPS for all web communication and ensure proper CORS policies are implemented.

## API Documentation and Swagger

- Use Swagger/OpenAPI for API documentation for your backend API services.
- Ensure XML documentation for models and API methods for enhancing Swagger documentation.
