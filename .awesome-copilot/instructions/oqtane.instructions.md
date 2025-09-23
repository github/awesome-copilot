---
description: 'Oqtane Module patterns'
applyTo: '**/*.razor, **/*.razor.cs, **/*.razor.css'
---

## Blazor Code Style and Structure

- Write idiomatic and efficient Blazor and C# code.
- Follow .NET and Blazor conventions.
- Use Razor Components appropriately for component-based UI development.
- Use Blazor Components appropriately for component-based UI development.
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

## Oqtane specific Guidelines
- See base classes and patterns in the [Main Oqtane repo](https://github.com/oqtane/oqtane.framework)
- Follow client server patterns for module development.
- The Client project has various modules in the modules folder.
- Each action in the client module is a seperate razor file that inherits from ModuleBase with index.razor being the default action.
- For complex client processing like getting data, create a service class that inherits from ServiceBase and lives in the services folder. One service class for each module. 
- Client service should call server endpoint using ServiceBase methods
- Server project contains MVC Controllers, one for each module that match the client service calls.  Each controller will call server-side services or repositories managed by DI
- Server projects use repository patterns for modules, one repository class per module to match the controllers. 

## Error Handling and Validation

- Implement proper error handling for Blazor pages and API calls.
- Use built-in Oqtane logging methods from base classes.
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
- use built-in Oqtane state management in the base classes like PageState and SiteState when appropriate.
- Avoid adding extra depenencies like Fluxor or BlazorState when the application grows in complexity.
- For client-side state persistence in Blazor WebAssembly, consider using Blazored.LocalStorage or Blazored.SessionStorage to maintain state between page reloads.
- For server-side Blazor, use Scoped Services and the StateContainer pattern to manage state within user sessions while minimizing re-renders.

## API Design and Integration

- Use service base methods to communicate with external APIs or server project backend.
- Implement error handling for API calls using try-catch and provide proper user feedback in the UI.

## Testing and Debugging in Visual Studio

- All unit testing and integration testing should be done in Visual Studio Enterprise.
- Test Blazor components and services using xUnit, NUnit, or MSTest.
- Use Moq or NSubstitute for mocking dependencies during tests.
- Debug Blazor UI issues using browser developer tools and Visual Studio's debugging tools for backend and server-side issues.
- For performance profiling and optimization, rely on Visual Studio's diagnostics tools.

## Security and Authentication

- Implement Authentication and Authorization using built-in Oqtane base class members like User.Roles.
- Use HTTPS for all web communication and ensure proper CORS policies are implemented.
