---
description: 'Blazor rendering performance best practices for Razor components: skip unnecessary rerenders, virtualize long lists, keep components rendered at scale lightweight, and avoid event-driven render churn.'
applyTo: '**/*.razor, **/*.razor.cs'
---

# Blazor Rendering Performance

Apply these rules when writing or reviewing Razor components. They follow the official [ASP.NET Core Blazor rendering performance best practices](https://learn.microsoft.com/aspnet/core/blazor/performance/rendering) and target .NET 8 or later.

Rerendering, event, and virtualization guidance applies to components that render interactively: the Interactive Server, Interactive WebAssembly, and Interactive Auto render modes, and standalone Blazor WebAssembly apps. Components rendered with static SSR don't rerender after the response is sent, so only the cost of their request-time render matters.

## Decide Whether a Component Needs Optimizing

- Write most components with plain `ComponentBase` conventions. Routable pages, dialogs, forms, and layout pieces usually render once and then only after a user gesture.
- Reserve the techniques below for hot paths:
  - Components repeated at scale: grid rows and cells, long lists, chart data points, large nested forms with hundreds of inputs.
  - Components that rerender at high frequency: timers, real-time feeds, pointer and scroll events.
  - High-level components whose events rerender a large subtree.
- Do not add `ShouldRender` overrides, manual `SetParametersAsync`, or `IHandleEvent` to a component without a rendering problem to solve. They add complexity and can cause stale UI.
- Measure before and after a change (browser performance profiler, render timings). When several techniques apply, benchmark them instead of assuming which one wins.

## Understand When Blazor Rerenders

- After an event handler runs, `ComponentBase` rerenders the component that owns the handler. Each child then receives a new set of parameters and rerenders too, recursively, unless change detection proves nothing changed or its `ShouldRender` returns `false`.
- Change detection skips a child only when **every** parameter is either `null` in both renders or a known immutable type whose value hasn't changed. On .NET 8 and later the known immutable types are `bool`, `char`, `byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong`, `float`, `double`, `decimal`, `string`, `DateTime`, enums, `Guid`, `EventCallback`, and `EventCallback<T>`, plus the nullable forms of those value types (`int?`, `DateTime?`). .NET 10 adds `DateOnly` and `TimeOnly`. The framework can change this list between releases.
- A non-null value of any other type counts as "may have changed" on every parent render, even when the value is identical. This includes records, `DateTimeOffset`, `TimeSpan`, tuples, custom structs, collections, class instances, and `RenderFragment` (so any component that receives child content).
- `ShouldRender` is not consulted for the first render. A component always renders when it's first added to the tree.

## Avoid Unnecessary Rerendering of Subtrees

- Give components that repeat at scale parameters of known immutable types. Pass the values the child needs (`OrderId="order.Id" Customer="@order.Customer"`) rather than the whole model object when that keeps every parameter immutable.
- Prefix expressions assigned to `string` parameters with `@`. Without it, Razor passes the attribute text literally: `Customer="order.Customer"` renders the text "order.Customer".
- On repeated children, let the child pass its own key back (`OnSelect.InvokeAsync(OrderId)`) instead of capturing the item in a lambda. A lambda that captures a loop variable (`OnSelect="() => SelectOrder(order.Id)"`) produces a new delegate target on every render, so the child is always seen as changed.
- Keep that `EventCallback` equal across renders. On .NET 10 and later, bind a method group: `<OrderRow OrderId="order.Id" OnSelect="SelectOrder" />`. On .NET 8 and 9, `EventCallback` equality compares delegate references and every method-group conversion creates a new delegate, so create the callback once and reuse it: assign `selectOrder = EventCallback.Factory.Create<int>(this, SelectOrder);` in `OnInitialized`, then pass `OnSelect="selectOrder"`.
- When a child must accept complex parameters, override `ShouldRender` and compare a cheap change key captured in `OnParametersSet`:

  ```razor
  @code {
      [Parameter, EditorRequired] public Order Order { get; set; } = default!;

      private int lastOrderId;
      private int lastVersion = -1;
      private bool shouldRender = true;
      private bool showDetails;

      protected override void OnParametersSet()
      {
          shouldRender = Order.Id != lastOrderId || Order.Version != lastVersion;
          lastOrderId = Order.Id;
          lastVersion = Order.Version;
      }

      protected override bool ShouldRender() => shouldRender;

      private void ToggleDetails()
      {
          showDetails = !showDetails;
          shouldRender = true; // Local state changed: allow this render.
      }
  }
  ```

- If a component with a `ShouldRender` override also changes its own state (event handlers, timers, JS callbacks), set the flag to `true` in those paths. Otherwise `ShouldRender` silently blocks the update.
- For UI-only components whose output never changes after the first render, return `false` from `ShouldRender`.

## Virtualize Long Lists

- Replace `@foreach` loops over long scrollable collections (hundreds of items or more) with `<Virtualize>`, which renders only the visible items plus an overscan.
- `Virtualize` renders no items until its JavaScript side reports the viewport size, so it only shows items once the component is interactive: nothing during static SSR or prerendering. Page the data on the server for statically rendered lists.
- Use `Items` for an in-memory `ICollection<T>`. Use `ItemsProvider` for large or remote data sets, or non-generic sources such as `DataRow`, and never set both (the component throws `InvalidOperationException`).
- In an items provider, fetch only `request.Count` items starting at `request.StartIndex`, pass `request.CancellationToken` to the data call, and return the total item count in `ItemsProviderResult<T>`.
- Set `ItemSize` to the rendered item height in pixels (default `50`) so the first render and the scroll position are correct. On .NET 11, `ItemSize` is only the initial estimate: the component then positions items using a running average of measured heights.
- In every version, keep items and placeholder content the same height, render them as a single vertical stack (`display: block` or `table-row`), and don't style the spacer elements.
- Inside a `<tbody>`, set `SpacerElement="tr"` and render one `<tr>` per item.
- Provide `<Placeholder>` content when items load asynchronously and `<EmptyContent>` for empty results.
- Call `RefreshDataAsync()` on the `Virtualize` reference when data behind an `ItemsProvider` changes. If that happens outside a Blazor event or lifecycle method, wrap the refresh and `StateHasChanged()` in `InvokeAsync`.
- Make the scroll container focusable so keyboard scrolling works in Chromium-based browsers. Use `tabindex="0"` so keyboard users can tab to a standalone scroll region, and give it an accessible name (`role="region" aria-label="Orders"`). Reserve `tabindex="-1"` for containers that code focuses explicitly.

```razor
@inject IOrderService Orders

<div style="height: 600px; overflow-y: auto" tabindex="0" role="region" aria-label="Orders">
    <Virtualize ItemsProvider="LoadOrdersAsync" ItemSize="48" Context="order">
        <ItemContent>
            <OrderRow @key="order.Id" OrderId="order.Id" Customer="@order.Customer" Total="order.Total" />
        </ItemContent>
        <Placeholder>
            <div class="order-row">Loading...</div>
        </Placeholder>
    </Virtualize>
</div>

@code {
    private async ValueTask<ItemsProviderResult<OrderSummary>> LoadOrdersAsync(ItemsProviderRequest request)
    {
        var page = await Orders.GetPageAsync(request.StartIndex, request.Count, request.CancellationToken);
        return new ItemsProviderResult<OrderSummary>(page.Items, page.TotalCount);
    }
}
```

## Keep Components Rendered at Scale Lightweight

### Avoid Thousands of Component Instances

- Each component instance adds fixed rendering overhead (about 0.06 ms per instance was measured in Blazor WebAssembly, so 2,000 extra instances add about 120 ms to a render).
- For thousands of rows, cells, or points, inline the item markup in the parent loop instead of creating one child component per item.
- Keep a child component per item only when the item needs independent rerendering or its own interactive state. That's the capability you give up by inlining.

### Reuse Markup With `RenderFragment` Instead of Components

- When a child component exists only to reuse markup, declare a `RenderFragment` or `RenderFragment<T>` in the `@code` block instead. It avoids per-component overhead.

  ```razor
  <ul class="log">
      @foreach (var entry in logEntries)
      {
          @LogLine(entry)
      }
  </ul>

  @code {
      private RenderFragment<LogEntry> LogLine = entry =>
          @<li class="log-@entry.Level">@entry.Timestamp.ToString("T") @entry.Message</li>;
  }
  ```

- Declare the fragment `public static` to share it across components without per-component cost.
- Razor template syntax (`@<tag>...</tag>`) in `RenderFragment` assignments only works in `.razor` files. Use a property (`=>`) instead of a field when the template references instance members.
- A `RenderFragment` has no component boundary: it can't rerender on its own and can't skip rendering when its parent renders.

### Keep Parameter Counts Low on Repeated Components

- Every parameter adds cost per instance: in a grid cell rendered 4,000 times, each parameter added about 15 ms to the render.
- Group values that are identical for every instance (for example a `GridOptions` object) into a single parameter.
- An object parameter defeats change detection, so the child rerenders every time its parent does. Prefer a few immutable parameters when the parent rerenders often, and benchmark when unsure.

### Fix Cascading Values That Don't Change

- Set `IsFixed="true"` on `<CascadingValue>` whenever the value doesn't change over time. A non-fixed cascading value makes every `[CascadingParameter]` recipient subscribe to change notifications, which is much more expensive than a regular parameter.
- Always set `IsFixed="true"` when cascading `this`, because the instance never changes during the component's lifetime.

### Avoid Attribute Splatting on Repeated Components

- `[Parameter(CaptureUnmatchedValues = true)]` with `@attributes` forces the renderer to match every supplied parameter, build a dictionary, and resolve attribute overwrites on each render.
- Keep splatting for components that aren't repeated much (form inputs, buttons, dialogs). On per-row or per-cell components, expose explicit parameters such as `Class` or `Style` instead.

### Treat Manual `SetParametersAsync` as a Last Resort

- Only consider overriding `SetParametersAsync` when a component has hundreds or thousands of instances, accepts many parameters, and profiling shows parameter assignment as a bottleneck.
- The gain is small on .NET 10 and later (typically under 10% even at 10,000+ instances), and in Interactive Server apps the SignalR diff transport usually costs more.
- If you do override it, assign every declared parameter by name in a `switch` over the `ParameterView`, throw for unknown names, and finish with `return base.SetParametersAsync(ParameterView.Empty);` so the lifecycle still runs without assigning the parameters twice.

### Hardcode Sequence Numbers in Manual Render Trees

- In `BuildRenderTree` code written by hand, pass literal sequence numbers to `RenderTreeBuilder` calls. Never generate them with a counter (`seq++`), which misleads the diff algorithm and produces larger edit scripts. Prefer `.razor` markup, where the compiler assigns them.

## Handle Events Without Wasteful Renders

### Throttle High-Frequency Browser Events

- Don't bind .NET handlers directly to events that fire tens or hundreds of times per second (`@onmousemove`, `@onpointermove`, `@onscroll`).
- Register the listener in JavaScript during the first render, throttle it there, and call back into .NET at a bounded rate through a `DotNetObjectReference` and a `[JSInvokable]` method. Dispose the reference with the component.

  ```js
  // PointerTracker.razor.js
  export function trackPointer(element, dotNetRef, intervalMs) {
    let last = 0;
    element.addEventListener('pointermove', e => {
      const now = performance.now();
      if (now - last < intervalMs) return;
      last = now;
      dotNetRef.invokeMethodAsync('OnPointerMove', e.offsetX, e.offsetY);
    });
  }
  ```

  ```razor
  @implements IAsyncDisposable
  @inject IJSRuntime JS

  <div @ref="surface" class="surface">@position</div>

  @code {
      private ElementReference surface;
      private IJSObjectReference? module;
      private DotNetObjectReference<PointerTracker>? selfRef;
      private string position = "";

      protected override async Task OnAfterRenderAsync(bool firstRender)
      {
          if (firstRender)
          {
              selfRef = DotNetObjectReference.Create(this);
              module = await JS.InvokeAsync<IJSObjectReference>("import", "./Components/PointerTracker.razor.js");
              await module.InvokeVoidAsync("trackPointer", surface, selfRef, 100);
          }
      }

      [JSInvokable]
      public void OnPointerMove(double x, double y)
      {
          position = $"{x:0}, {y:0}";
          StateHasChanged();
      }

      public async ValueTask DisposeAsync()
      {
          if (module is not null)
          {
              try { await module.DisposeAsync(); } catch (JSDisconnectedException) { }
          }

          selfRef?.Dispose();
      }
  }
  ```

### Skip the Automatic Render When a Handler Changes No UI State

- `ComponentBase` calls `StateHasChanged` after every event handler, synchronous or asynchronous. When a handler only logs, sends telemetry, or triggers a JavaScript-only effect, skip that render.
- For every handler of a component, implement `IHandleEvent` and call `StateHasChanged()` explicitly in the handlers that do change state:

  ```razor
  @implements IHandleEvent

  @code {
      Task IHandleEvent.HandleEventAsync(EventCallbackWorkItem callback, object? arg)
          => callback.InvokeAsync(arg);
  }
  ```

- For a single handler, wrap it in a delegate whose target implements `IHandleEvent`. Blazor dispatches the event to that target instead of the component, so no automatic render follows. `EventUtil` is app code, not a framework API:

  ```csharp
  using Microsoft.AspNetCore.Components;

  public static class EventUtil
  {
      public static Action AsNonRenderingEventHandler(Action handler)
          => new NonRenderingTarget(handler, null).Invoke;

      public static Func<Task> AsNonRenderingEventHandler(Func<Task> handler)
          => new NonRenderingTarget(null, handler).InvokeAsync;

      public static Action<T> AsNonRenderingEventHandler<T>(Action<T> handler)
          => new NonRenderingTarget<T>(handler, null).Invoke;

      public static Func<T, Task> AsNonRenderingEventHandler<T>(Func<T, Task> handler)
          => new NonRenderingTarget<T>(null, handler).InvokeAsync;

      private sealed class NonRenderingTarget(Action? handler, Func<Task>? asyncHandler) : IHandleEvent
      {
          public void Invoke() => handler!();
          public Task InvokeAsync() => asyncHandler!();

          Task IHandleEvent.HandleEventAsync(EventCallbackWorkItem item, object? arg) => item.InvokeAsync(arg);
      }

      private sealed class NonRenderingTarget<T>(Action<T>? handler, Func<T, Task>? asyncHandler) : IHandleEvent
      {
          public void Invoke(T arg) => handler!(arg);
          public Task InvokeAsync(T arg) => asyncHandler!(arg);

          Task IHandleEvent.HandleEventAsync(EventCallbackWorkItem item, object? arg) => item.InvokeAsync(arg);
      }
  }
  ```

  Use it as `@onclick="EventUtil.AsNonRenderingEventHandler(TrackClick)"`, or pass the event args type explicitly when the handler takes them: `@onclick="EventUtil.AsNonRenderingEventHandler<MouseEventArgs>(TrackClickAsync)"`.
- Exceptions thrown by these handlers don't reach an `ErrorBoundary`. If you rely on error boundaries, catch the exception and call `await DispatchExceptionAsync(ex)`.

### Call `StateHasChanged` Only When the Framework Can't Render for You

- Don't call it at the end of an event handler or lifecycle method (`OnInitialized{Async}`, `OnParametersSet{Async}`). `ComponentBase` already renders there, and when an async handler or lifecycle method first yields at an `await`.
- Do call it to show intermediate progress between later `await`s of a multi-step async event handler or lifecycle method, to refresh a component from outside Blazor's event system (timers, C# events raised by a state container, background work), wrapped in `InvokeAsync(...)` when running off the renderer's synchronization context, or to rerender a component outside the subtree that handled the event.
- To render partway through otherwise synchronous work, call `StateHasChanged()` followed by `await Task.Yield()`, not `await Task.Delay(1)`.
- Never call `StateHasChanged()` unconditionally from `OnAfterRender{Async}`, which creates a render loop. Guard it with `firstRender` or an explicit state check.

### Don't Recreate Delegates for Many Repeated Elements

- A lambda that captures the loop variable (`@onclick="() => Select(item.Id)"`) creates a new delegate for every element on every render. Blazor then treats each handler as changed, replaces its event handler registration, and sends an attribute update per element (over the circuit for Interactive Server).
- That's fine for a handful of elements. For large lists, create the delegates once and reuse them, or move the item into a child component that takes an immutable key and a stable `EventCallback` (a method group on .NET 10 and later, a cached callback on .NET 8 and 9).

  ```razor
  @inject ICatalogService Catalog

  <table>
      <tbody>
          @foreach (var row in rows)
          {
              <tr @key="row.Id" class="@(row.Id == selectedId ? "selected" : null)">
                  <td>@row.Name</td>
                  <td><button @onclick="row.Select">Select</button></td>
              </tr>
          }
      </tbody>
  </table>

  @code {
      private List<Row> rows = [];
      private int? selectedId;

      protected override async Task OnInitializedAsync()
      {
          var products = await Catalog.GetProductsAsync();
          rows = products.Select(p => new Row(p.Id, p.Name, () => selectedId = p.Id)).ToList();
      }

      private sealed record Row(int Id, string Name, Action Select);
  }
  ```

### Key Lists That Change

- When a rendered list gets items inserted, removed, or reordered, set `@key` on the outermost element or component of each iteration, using a unique ID or the model instance. Blazor then preserves the matching elements and components instead of rebuilding them by position.
- Never use the loop index as a key, and make sure keys don't clash (duplicates throw). `@key` has a small cost, so skip it for static lists.

## Review Checklist for Components Rendered at Scale

- [ ] Long scrollable collections in interactive components use `<Virtualize>` with an accurate `ItemSize`.
- [ ] Repeated children receive only known immutable parameters (with `@` before expressions assigned to `string` parameters), or override `ShouldRender` with a cheap change key that local state changes also update.
- [ ] Items without independent state are inlined or rendered through a `RenderFragment` rather than one component each.
- [ ] Event handlers in large loops don't use lambdas that capture the loop variable, and repeated children get stable `EventCallback`s (method groups on .NET 10 and later, cached callbacks on .NET 8 and 9).
- [ ] No `CaptureUnmatchedValues` on per-row or per-cell components.
- [ ] `<CascadingValue>` uses `IsFixed="true"` for values that never change.
- [ ] High-frequency DOM events are throttled in JavaScript.
- [ ] Handlers that don't change UI state don't trigger a render, and `StateHasChanged` appears only where the framework can't render automatically.

## References

- [ASP.NET Core Blazor rendering performance best practices](https://learn.microsoft.com/aspnet/core/blazor/performance/rendering)
- [ASP.NET Core Razor component rendering](https://learn.microsoft.com/aspnet/core/blazor/components/rendering)
- [ASP.NET Core Razor component virtualization](https://learn.microsoft.com/aspnet/core/blazor/components/virtualization)
- [Retain element, component, and model relationships in ASP.NET Core Blazor](https://learn.microsoft.com/aspnet/core/blazor/components/element-component-model-relationships)
- [Blazor change detection rules (`ChangeDetection.cs` reference source)](https://github.com/dotnet/aspnetcore/blob/main/src/Components/Components/src/ChangeDetection.cs)
