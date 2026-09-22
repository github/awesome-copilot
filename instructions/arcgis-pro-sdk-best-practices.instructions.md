---
description: "Best practices when authoring or modifying managed C# code, ViewModels, and related components in projects using the ArcGIS Pro SDK for .NET"
applyTo: "**/*.cs,**/*.csproj,**/*.xaml,**/*.daml"
license: Apache-2.0
metadata:
  author: Esri, Inc.
  version: "1.0.0"
---

<!--
Copyright 2026 Esri
 
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
    https://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# ArcGIS Pro SDK Best Practices (Managed C#)

Use these rules and guidance when authoring or modifying related C# code in ArcGIS Pro SDK extensibility projects.

## Authoritative Resources
- https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/csharp.instructions.md
- https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/dotnet-wpf.instructions.md
- https://github.com/Esri/arcgis-pro-sdk/wiki/
- Resolve conflicts in this order: this document, official ArcGIS Pro SDK documentation, then generic C# and WPF guidance.

## Example Verification

- Treat official ArcGIS Pro SDK samples and snippets as starting points, not proof that an implementation is correct for the current SDK version or repository standards.
- Before sharing adapted code, verify API signatures, SDK and .NET version compatibility, thread affinity, async flow, application-context capture, null handling, and DAML or add-in wiring.
- When source code conflicts with these practices, follow these practices and explain any material correction rather than reproducing the source defect.

## Core Design Rules

- Keep implementation code small, coherent, and hard to misuse.
- Design custom types/members around one clear responsibility.
- Keep method names verb-first and property/type names noun/adjective-based.
- Use boolean prefixes consistently, such as Is, Has, Can, and Should.
- Prefer `ArcGIS.Core.Geometry` types for geometry operations and custom method contracts unless an ArcGIS Pro API specifically requires a CIM geometry representation.
- Throw managed, specific exceptions with actionable messages.
- Document thread-affinity requirements explicitly where applicable.
- Favor verified API-safe patterns from official snippets when multiple approaches are possible.
- Keep DAML declarations and code-behind synchronized, including IDs, classes, captions, tooltips, and conditions.

## Threading and QueuedTask Guidance

- Respect ArcGIS Pro threading rules. Use `ArcGIS.Desktop.Framework.Threading.Tasks.QueuedTask.Run` for work that must execute on the Main CIM Thread (MCT).
- Always use `QueuedTask.Run` for ArcGIS Pro SDK operations that require the MCT. Avoid using it as a general-purpose replacement for `Task`.
- Use `QueuedTask.Run` for ArcGIS Pro API operations documented as requiring the MCT, including MCT-bound application or CIM state changes. Modify WPF-bound state on the UI thread, and call ArcGIS Pro asynchronous APIs from the threads permitted by their documentation.
- Never alter ArcGIS Pro application state from an arbitrary thread.
- Use normal `Task`-based APIs for asynchronous I/O that does not involve ArcGIS Pro APIs. Use `Task.Run` only for suitable CPU-bound work that does not require the UI thread, MCT, COM compatibility, or Pro-managed background threads.

```cs
   var data = await httpClient.GetFromJsonAsync<MyData>(uri);

   await QueuedTask.Run(() =>
   {
       ApplyDataToMap(data); // Requires the MCT.
   });
```
   
- Keep UI-specific interaction on the UI thread and avoid blocking work there.
- ArcGIS Pro SDK methods documented as callable from the UI thread may be invoked there and awaited. Follow any narrower thread requirement in the API reference.
- Do not use `Task.Result` or `Task.Wait` on the UI thread.
- If a method has no `await`, omit the `async` modifier and return the task directly when appropriate.
- Use `QueuedTask.OnGUI` and `QueuedTask.OnWorker` when thread validation is necessary; do not use them as a substitute for following documented API thread-affinity requirements.
- Treat deadlocks and blocking async misuse paths as implementation defects to fix.

## BackgroundTask Guidance

- Use `ArcGIS.Core.Threading.Tasks.BackgroundTask` only for non-modal operations that are suitable for Pro's concurrent background thread pool and compatible with any underlying COM components.
- Treat `BackgroundTask` as a specialized exception, not as a faster or parallel replacement for `QueuedTask`. Most GIS workflows and all MCT-bound application or CIM state mutations belong on the MCT via `QueuedTask.Run`.
- A background operation must not continually read or modify project, map, layer, layout, style, or other application/CIM state. Capture the required input before starting, preferably as immutable values or snapshots; perform MCT-bound reads with `QueuedTask.Run` first.
- Do not write application or CIM state from `BackgroundTask`. Apply computed results afterward in a separate awaited `QueuedTask.Run`.
- Call only ArcGIS Pro APIs documented as thread-safe, free-threaded, or otherwise valid from `BackgroundTask`. `TaskPriority.single` provides a consistent background thread; it does not grant MCT access or make application-state APIs safe.
- Do not require user input, show modal UI, display a modal progress dialog, or disable the entire application while a background operation runs. Use `BackgroundProgressorSource` for non-modal progress and cancellation.
- Assume the UI remains enabled and application state can change at any time. The user may change views, remove data, or close the project while the task runs. Revalidate context before applying results and cancel or discard stale work.
- Background tasks run concurrently and are not FIFO ordered. Protect shared mutable add-in state with appropriate synchronization, keep critical sections short, and avoid nested `BackgroundTask.Run` calls.
- Await every `BackgroundTask.Run` call so completion, cancellation, and exceptions are observed. Catch `OperationCanceledException` separately when cancellation is expected.

Use a three-phase workflow when background computation starts from or produces ArcGIS Pro state:

```cs
// 1. Capture a stable, immutable input snapshot on the required thread.
var input = await QueuedTask.Run(() => CaptureInputSnapshot());

// 2. Perform independent work without reading or changing Pro application state.
var result = await BackgroundTask.Run(
  TaskPriority.normal,
  () => ComputeResult(input),
  BackgroundProgressor.None);

// 3. Revalidate context and apply the result on the MCT.
await QueuedTask.Run(() => ApplyResultIfStillValid(result));
```

Choose task priority deliberately:

- Use `TaskPriority.normal`, the default, for most moderate or long-running operations and whenever duration is uncertain.
- Use `TaskPriority.high` only for reliably short, CPU-bound operations that perform no I/O.
- Use `TaskPriority.single` only when the operation has a genuine thread-affinity requirement and must use one consistent background thread. Operations submitted with `single` execute sequentially on that background thread.

Use `BackgroundProgressorSource` instead of a progress dialog for cancelable background work:

```cs
// The items must already be immutable values that are safe for background use.
var itemSnapshot = items.ToArray();

using var progressorSource = new BackgroundProgressorSource();
progressorSource.Max = (uint)itemSnapshot.Length;
progressorSource.Message = "Processing items";

try
{
  await BackgroundTask.Run(
    TaskPriority.normal,
    () =>
    {
      var progressor = progressorSource.Progressor;

      foreach (var item in itemSnapshot)
      {
        progressor.CancelToken.ThrowIfCancellationRequested();
        ProcessIndependentItem(item);
        progressor.Value++;
      }
    },
    progressorSource.Progressor);
}
catch (OperationCanceledException)
{
  // Cancellation is an expected completion path.
}
```

Request cancellation from the owning UI or lifecycle code with `progressorSource.CancellationTokenSource.Cancel()`. Do not block while waiting for cancellation to complete.

## Modal UI and Row Event Guidance

- Do not show modal message boxes, modal dialogs, or other potentially blocking UI from inside a `QueuedTask.Run` lambda.
- Do not show modal UI within event handlers for `ArcGIS.Desktop.Editing.Events.RowCreatedEvent`, `ArcGIS.Desktop.Editing.Events.RowChangedEvent`, or `ArcGIS.Desktop.Editing.Events.RowDeletedEvent`.
- Modal UI that waits for user dismissal can block ArcGIS Pro or hang the edit and event-processing pipeline in these contexts.
- Collect the required result or status inside a queued operation. After the awaited `QueuedTask.Run` completes, show modal UI only from the UI thread; dispatch explicitly when the caller is not already on that thread.
- Row-event callbacks already execute on the QueuedTask during an edit operation. Do not dispatch modal UI from the callback. Defer arbitrary user interaction until both the callback and edit pipeline have completed, using an appropriate later workflow or event such as `EditCompletedEvent`.
- Use the row-event argument's `CancelEdit` API when the supported edit-cancellation prompt is the intended behavior; do not replace it with a custom modal dialog.
- Keep row-event handlers short and non-blocking; defer user interaction and other work that can wait, re-enter Pro, or depend on the event pipeline completing.

## Async Workflow Guidance

- ArcGIS Pro workflows are usually sequential; execute a related MCT-bound workflow as a unit rather than queueing every individual API step.
- Await asynchronous API calls to establish step ordering.
- Avoid repetitive QueuedTask calls when multiple SDK operations should execute together as a single workflow.
- Avoid nested QueuedTask calls when multiple SDK operations should execute together as a single workflow.
- Prefer one consolidated QueuedTask.Run per workflow segment rather than many small queued calls.

```cs

// Illustrative pseudocode.
// Avoid this:
await QueuedTask.Run(() =>
{
  method1(...);
});

await QueuedTask.Run(() =>
{
  method2(...);
});

await QueuedTask.Run(() =>
{
  method3(...);
});

// Avoid nested queued tasks:
await QueuedTask.Run(async () =>
{
  method1(...);
  await QueuedTask.Run(async () =>
  {
     method2(...);
	 await QueuedTask.Run(() =>
     {
       method3(...);
     });
  });
});

// Prefer this:
await QueuedTask.Run(() =>
{
  method1(...);
  method2(...);
  method3(...);
});
```

- Do not assume ArcGIS Pro application state or context will remain unchanged while queued or background work is waiting to start.
- Capture and validate required application context, such as `MapView.Active`, before invoking the queued-task lambda.

```cs
// Map workflow: capture the active map view before entering QueuedTask.Run.
var mapView = MapView.Active;
if (mapView == null)
  return;

await QueuedTask.Run(() =>
{
  mapView.SelectFeatures(mapView.GetExtent());
});
```

```cs
// Layout workflow: use this separately when a layout view is active.
var layoutView = LayoutView.Active;
if (layoutView == null)
  return;

await QueuedTask.Run(() =>
{
  var mapFrame = layoutView.Layout
    .GetElements()
    .OfType<MapFrame>()
    .FirstOrDefault();
});
```

- Mark calling methods async when using await.
- Await asynchronous API calls to preserve the intended operation order without blocking.

```cs
protected override async void OnClick()
{
  var mapView = MapView.Active;
  if (mapView == null)
    return;

  var values = new[] { "TerritorialStats_3", "NEW_SELECTION", "name = 'Kent CC'" };

  try
  {
    // Preserve ordering without blocking the UI.
    await Geoprocessing.ExecuteToolAsync("SelectLayerByAttribute_management", values);

    // Use the captured view rather than reacquiring application context after await.
    await mapView.ZoomToSelectedAsync(TimeSpan.FromSeconds(3));
  }
  catch (Exception exception)
  {
    HandleErrorOnUiThread(exception);
  }
}
```

- Avoid putting QueuedTask.Run inside tight loops when the loop body can be moved into one queued lambda block.

```cs
// Avoid repeatedly entering the MCT for each item.
foreach (var itemId in itemIds)
{
  await QueuedTask.Run(() => ProcessItem(itemId));
}

// Prefer acquiring and processing MCT-bound objects in one queued operation.
await QueuedTask.Run(() =>
{
  foreach (var itemId in itemIds)
  {
    ProcessItem(itemId);
  }
});
```

- Prefer using `await` when assigning the result of an asynchronous operation.
- Avoid fire-and-forget work unless it is explicitly required and failures are observed or reported.
- Avoid using `Task.Result` or `Task.Wait` on the UI thread.

### Exception Handling

- Use `try`/`catch` around awaited calls for normal exception handling.
- Catch exceptions inside a queued lambda only when they can be fully handled there without UI interaction. Otherwise, allow them to propagate to the awaiting caller.
- Await `QueuedTask.Run` or `BackgroundTask.Run` to catch an exception outside the lambda.

```cs
try
{
  await QueuedTask.Run(() => PerformMctWork());
}
catch (ArgumentNullException exception)
{
  HandleErrorOnUiThread(exception);
}

await QueuedTask.Run(() =>
{
  try
  {
    PerformRecoverableMctWork();
  }
  catch (InvalidOperationException exception)
  {
    LogWorkerSafeError(exception);
  }
});
```

- Test error scenarios carefully because exception behavior differs between blocking and asynchronous patterns, such as `Task.Wait`, `Task.Result`, and `await`.
  
### Invoking UI Updates

- Use the ArcGIS Pro application dispatcher, `FrameworkApplication.Current.Dispatcher`, to invoke WPF-bound UI updates.

```cs
var dispatcher = FrameworkApplication.Current.Dispatcher;
```

 - Prefer `Dispatcher.BeginInvoke` over `Dispatcher.Invoke` when the caller does not need to block.
 - Use `Dispatcher.CheckAccess()` to determine whether dispatch is required.
 - Observe the returned `DispatcherOperation` when completion or error handling matters.

```cs
private void UpdateProgress(int progress, string message)
{
    ProgressValue = progress;
    ProgressMessage = message;
    NotifyPropertyChanged(nameof(ProgressValue));
    NotifyPropertyChanged(nameof(ProgressMessage));
}

public Task UpdateProgressAsync(int progress, string message)
{
    return RunOnUIThreadAsync(() => UpdateProgress(progress, message));
}
```

- Consider implementing a utility method that returns a task so callers can observe completion and exceptions:

```cs
public Task RunOnUIThreadAsync(Action action)
{
    ArgumentNullException.ThrowIfNull(action);

    var dispatcher = FrameworkApplication.Current.Dispatcher;
    if (dispatcher.CheckAccess())
    {
       action();
       return Task.CompletedTask;
    }

    return dispatcher.BeginInvoke(action).Task;
}

await Module1.Current.RunOnUIThreadAsync(
    () => UpdateProgress(50, "Working..."));
```

## Custom Synchronous and Asynchronous Method Design

- Write synchronous methods for work that is naturally synchronous, especially small utility and helper functions.
- Prefer synchronous core methods for naturally synchronous ArcGIS Pro APIs, especially MCT-bound workflow steps that must execute sequentially.
- Prefer to consolidate the synchronous methods that comprise an MCT-bound ArcGIS Pro workflow into a single `QueuedTask` call. Implement a separate asynchronous method to wrap the `QueuedTask` when useful. That task-returning wrapper can be called and awaited from the UI thread, for example within a button `OnClick()` handler.
- Do not expose a synchronous alternative for naturally asynchronous I/O merely to offer both forms.
- Do not start asynchronous work from a synchronous method and then block on or abandon it.
- Give custom task-returning methods the `Async` suffix and return `Task` or `Task<T>`. Preserve names required by overrides or interfaces. Avoid `async void` except for top-level event handlers.
- Handle exceptions within `async void` event handlers because callers cannot await them or catch their exceptions.
- When an asynchronous wrapper is required for synchronous MCT-bound work, consider implementing and testing the synchronous core method first.

```cs

  // This synchronous core method must be called on the QueuedTask.
  public static SelectionSet SelectFeaturesWith2DViewExtent(
      MapView mapView,
      double ratio,
      bool asRatio)
  {
      Envelope selectionExtent = mapView.Extent.Expand(ratio, ratio, asRatio);
      return mapView.SelectFeatures(selectionExtent);
  }
  
  // This wrapper can be called and awaited from the UI thread.
  public static Task<SelectionSet> SelectFeaturesWith2DViewExtentAsync(
      MapView mapView,
      double ratio,
      bool asRatio)
  {
      ArgumentNullException.ThrowIfNull(mapView);

      return QueuedTask.Run(
          () => SelectFeaturesWith2DViewExtent(mapView, ratio, asRatio));
  }
```

### Return Types from Asynchronous Methods

- Do return `Task` or `Task<T>` from asynchronous methods. 
- Avoid returning void unless it is from a top-level event handler. Methods returning `void` cannot be awaited.
- Use another awaitable return type only when an API or established project convention requires it.

### WPF ObservableCollection Thread Synchronization Rules

When writing code that updates an `ObservableCollection<T>` bound to a WPF UI element from background threads, follow these mandatory steps to avoid `NotSupportedException` and race conditions:

1. **Setup Registration:**
   - Define a dedicated synchronization lock object (e.g., `private readonly object _collectionLock = new();`) alongside your `ObservableCollection<T>`.
   - Register the collection during initialization on the UI thread using `BindingOperations.EnableCollectionSynchronization(CollectionInstance, _collectionLock);`.

2. **Mandatory Synchronization of Access:**
   - Enabling synchronization does **not** make the collection thread-safe automatically. 
   - Synchronize **all application access**, including enumeration, reads, and mutations, with the registered mechanism.
   - Wrap every mutation (add, remove, clear, insert) in a matching `lock (_collectionLock)` block, regardless of whether it occurs on the MCT, a background thread, or the UI thread.
   - Use the EXACT SAME lock object instance that was passed to `EnableCollectionSynchronization`.

3. **Performance Best Practices:**
   - Never perform blocking, heavy, or long-running operations (such as geodatabase queries, file I/O, or network requests) inside the `lock` block. 
   - Fetch data or perform heavy lifting first, and then lock only for the brief moment the collection is mutated.

```cs
using System;
using System.Collections.ObjectModel;
using System.Windows.Data;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework.Contracts;
using ArcGIS.Desktop.Framework.Threading.Tasks;

public class Dockpane1ViewModel : DockPane
{
    // 1. Define the collection and the lock object
    private readonly object _parcelIdsLock = new();

    public Dockpane1ViewModel()
    {
        // Register synchronization on the UI thread during view-model initialization.
        BindingOperations.EnableCollectionSynchronization(
            ParcelIds,
            _parcelIdsLock);
    }   
	
	/// <summary>
    /// Gets the list of current parcel IDs.
    /// </summary>
    /// <remarks>Bound to the WPF UI for displaying the list of parcel IDs.</remarks>
    public ObservableCollection<string> ParcelIds { get; } = new();

    // Invoked whenever a new parcel ID is available.
    private Task AddParcelIdOnUpdateAsync()
    {
        return QueuedTask.Run(() =>
        {
            var parcelId = GetNewParcelId();

            lock (_parcelIdsLock)
            {
                ParcelIds.Add(parcelId);
            }
        });
    }
}
```

### Blocking When Async/Await Cannot be Used

- Prefer to eliminate the need for synchronous blocking entirely.
- Prefer to refactor asynchronous properties into methods.
- Prefer to refactor asynchronous constructors to put asynchronous code into separate initialization methods.
- Do not prescribe a general blocking recipe. Any unavoidable blocking must be reviewed for synchronization-context, UI-thread, MCT-affinity, deadlock, and thread-pool starvation risks.
- Never wrap MCT- or UI-bound work in `Task.Run` to make synchronous blocking appear safe.

### Cancellation and Progress
- Use `ArcGIS.Desktop.Framework.Threading.Tasks.ProgressorSource` and `ArcGIS.Desktop.Framework.Threading.Tasks.CancelableProgressorSource` to show a visual dialog for MCT process progress.
- Progress can be supplied to any `QueuedTask.Run` operation, including operations that may finish quickly.
- Set `delayedShow: true` when creating a progressor source unless immediate display is specifically required. ArcGIS Pro's internal delayed-show heuristic suppresses the progress dialog when an operation completes quickly, preventing flashing or unnecessary visual noise.
- These framework progressors are for `QueuedTask`. Use `BackgroundProgressorSource` for `BackgroundTask`, and use the progress mechanism appropriate to other task-based APIs.

```cs
//delayedShow = true to avoid showing progress if the operation is too short and would 'flash' or add 'noise'...
using (var ps = new ProgressorSource("Doing my thing...", true))
  await RunProgressAsync(ps);

// Progress dialogs do not appear while running in the debugger.
public Task RunProgressAsync(ProgressorSource ps)
{
  return QueuedTask.Run(
    () => PerformMctWork(),
    ps.Progressor);
}

public Task RunProgressAsync2(ProgressorSource ps, uint max = 100, uint step = 10)
{
  //Increment progress while doing work...
  ps.Progressor.Max = max;
  ps.Progressor.Value = 0;

  return QueuedTask.Run(() =>
  {
    while (ps.Progressor.Value < ps.Progressor.Max)
    {
      PerformMctWorkStep();
      ps.Progressor.Value = Math.Min(ps.Progressor.Value + step, ps.Progressor.Max);
      ps.Progressor.Status = "Status " + ps.Progressor.Value;
      ps.Progressor.Message = "Message " + ps.Progressor.Value;
    }
  }, ps.Progressor);
}

```

- Use `CancelableProgressorSource("Show this message while working", "show when cancelled", true)` for cancelable progress.
- Use `CancellationTokenSource` for cooperative cancellation when a visual cancelable progress dialog is not required, and pass its token through the operation chain.
- `QueuedTask.Run` does not provide an overload that accepts a `CancellationToken` directly. Capture the token in the queued lambda and check it during cancellable work.
- Check token state in long-running loops and throw `OperationCanceledException` when canceling.
- Dispose or replace canceled token sources; do not reuse a canceled source.

```cs

using (var cps = new CancelableProgressorSource("Doing my thing...", "Cancelled", true))
  await RunCancelableProgressAsync(cps, 10);
		
// Progress dialogs do not appear while running in the debugger.
public Task RunCancelableProgressAsync(CancelableProgressorSource cps, int stepCount)
{
  return QueuedTask.Run(() =>
  {
    cps.Progressor.Max = (uint)stepCount;
    while (cps.Progressor.Value < cps.Progressor.Max)
    {
      cps.Progressor.CancellationToken.ThrowIfCancellationRequested();

      PerformMctWorkStep();
      cps.Progressor.Value += 1;
      cps.Progressor.Status = "Status " + cps.Progressor.Value;
      cps.Progressor.Message = "Message " + cps.Progressor.Value;
    }
  }, cps.Progressor);
}
```

- Use `Progressor.None` or `CancelableProgressor.None` when visual progress/cancel is not needed.

```cs
using var cancellationSource = new CancellationTokenSource();

try
{
  await RunCancelableMctWorkAsync(cancellationSource.Token);
}
catch (OperationCanceledException)
{
  // Cancellation is an expected completion path.
}

public Task RunCancelableMctWorkAsync(CancellationToken cancellationToken)
{
  return QueuedTask.Run(() =>
  {
    while (HasMoreWork())
    {
      cancellationToken.ThrowIfCancellationRequested();
      PerformMctWorkStep();
    }
  });
}

// The owning UI or lifecycle code can request cancellation with:
// cancellationSource.Cancel();
```
