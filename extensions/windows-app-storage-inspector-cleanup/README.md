# Windows App Storage Inspector & Cleanup

Have you ever wondered why your Windows disk keeps filling up with local models, agentic tools, Docker containers, package caches, and other app data? It can be hard to tell what is using the space, what a folder actually does, and whether it is safe to remove.

This GitHub Copilot app canvas helps you discover and catalog what is chewing through your disk space. Explore storage in a drill-down treemap, group files by application and category, exclude OneDrive cloud-only placeholders from local totals, use purpose-built storage analyzers, and ask GitHub Copilot to explain a folder and recommend the safest cleanup approach.

Approved cleanup items are moved to the Windows Recycle Bin rather than permanently deleted. The canvas scans the current Windows user profile and `C:\ProgramData`.

## Install

Run this command in the GitHub Copilot app:

```text
copilot plugin install windows-app-storage-inspector-cleanup@awesome-copilot
```

Canvas extensions are supported in the GitHub Copilot app only.

## Using the canvas

1. Open **Windows App Storage Inspector & Cleanup**.
2. Select **User profile**, **ProgramData**, or both.
3. Select **Scan storage**.
4. Monitor the scan status, active folder, progress, and live totals in **Live scan analysis**.
5. After the scan completes:
   - Select treemap folders to drill down.
   - Use **Application ownership** and **File categories** to understand usage.
   - Select a file or folder path in the result tabs to navigate the treemap to its deepest visible parent folder.
   - Use the result tabs to inspect folders, large files, cloud-only files, cleanup candidates, and warnings.
   - Select **Analyze folder & cleanup options** or **Ask Copilot** in a result row for a structured Copilot explanation of a selected item.
   - Open **Custom storage analyzers** for application-specific analysis.

**Live scan analysis** stays visible after a scan completes or is cancelled so you can review its final or last-observed totals. Scans can take time on large profiles. Inaccessible folders are reported as warnings rather than silently ignored.

## Canvas actions

The canvas exposes these actions to GitHub Copilot:

| Action                       | Purpose                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `start_scan`                 | Scan the selected user profile and/or `C:\ProgramData`.                                |
| `get_scan_status`            | Read scan progress, current totals, and completion state.                              |
| `set_cleanup_safety`         | Enable acknowledged direct cleanup or control protection for analyzer-managed folders. |
| `get_results`                | Retrieve treemap data, classifications, cleanup candidates, and warnings.              |
| `cancel_scan`                | Stop an active scan.                                                                   |
| `list_custom_analyzers`      | List specialized storage analyzers.                                                    |
| `analyze_custom_storage`     | Run the VS Code Insiders, Microsoft Scout, Docker, npm cache, or uv cache analyzer.    |
| `list_categorizers`          | List built-in and user-defined categorization rules.                                   |
| `add_categorizer`            | Add a persistent application/category rule for a path.                                 |
| `remove_categorizer`         | Remove a custom categorization rule.                                                   |
| `inspect_storage_item`       | Inspect bounded metadata for a file or folder.                                         |
| `ask_copilot_to_investigate` | Generate a Copilot explanation and cleanup guidance for a folder.                      |
| `preview_cleanup`            | Revalidate selected cleanup items and show the exact Recycle Bin preview.              |
| `execute_cleanup`            | Move confirmed, validated items to the Windows Recycle Bin.                            |

The extension also provides the `storage_inspector_inspect_item` Copilot agent tool. Use it to inspect local storage metadata before researching what a folder does or whether cleanup is safe.

## Ask Copilot investigations

The **Ask Copilot** actions open a blocking modal while Copilot inspects the bounded local metadata and researches product-specific guidance. The modal shows an activity bar while the request is running, provides a **Cancel** button that aborts the active Copilot turn, and displays the returned explanation when it completes.

Results explain the likely creating application, what the item contains and is used for, cleanup safety and impact, supported cleanup methods, best practices, warnings, and authoritative sources.

## Direct cleanup safety

The **Cleanup safety** panel sits below **Scan roots** in the left sidebar. Its **Allow Delete** switch defaults to disabled for every extension start. While disabled, the canvas is inspection-only: it can scan storage, explain folders, and run supported analyzer commands, but cannot preview or move files to the Recycle Bin.

Enable **Allow Delete** only after acknowledging that incorrect file removal can damage applications or the system. The setting applies to all Recycle Bin cleanup, including eligible analyzer items. Analyzer commands remain available because they use the product's supported cleanup process.

The **Protect analyzer folders** switch defaults to enabled. It shows locks on analyzer-managed paths, excludes their files from direct cleanup candidates, and blocks them again during validation. Changing it starts a rescan so the displayed candidates reflect the selected policy. Hover either switch for its current, detailed effect.

## Protected analyzer-managed folders

A **🔒** icon identifies folders managed by a custom analyzer while analyzer-folder protection is enabled. The lock appears in the treemap, breadcrumbs, and selected-folder path. These folders are excluded from direct cleanup candidates and blocked again during cleanup validation.

Select the protected-folder link below the graph to open its custom analyzer and use its supported cleanup operations instead.

## Cleanup workflow

All deletion paths use the same centralized cleanup service and modal:

1. Select eligible scan candidates or analyzer items.
2. Select **Review cleanup**.
3. Wait while every item is validated against the approved scan roots and protected-path rules.
4. Review the exact paths and sizes in the modal.
5. Select the explicit confirmation checkbox.
6. Select **Move to Recycle Bin**.
7. Keep the modal open while it reports validation and Recycle Bin progress.

The service revalidates every item immediately before execution. It rejects changed files or directory subtrees, unexpected entry types, symbolic links or junctions anywhere in the path, protected locations, changed scan roots, and paths that resolve outside the selected scan roots. Redirected Windows known folders such as Documents and Desktop are resolved and protected.

Cleanup uses a recycle-only Windows operation that fails when an item cannot be recycled rather than falling back to permanent deletion. A refresh scan starts after cleanup.

Generic folders named `cache`, `logs`, `temp`, and similar are classified for inspection but do not become direct cleanup candidates from their name and age alone. Scan candidates require an explicit, application-specific built-in cleanup policy or an analyzer-managed path whose protection the user deliberately disabled.

## Custom categorizers

A categorizer assigns an application/owner name and storage category to a file or folder subtree. Use one when the general path and extension rules classify application data too broadly.

### Create a categorizer in the canvas

1. Complete a scan.
2. Open **Folders**, **Largest files**, or **Cloud-only excluded**.
3. Find the item to classify.
4. Select **Categorize**.
5. Enter:
   - **Application or owner name**
   - **Storage category**
   - An optional description
6. Wait for the automatic rescan.

The path must:

- Be absolute.
- Exist when the categorizer is created.
- Be a regular file or folder, not a symbolic link.
- Be inside one of the selected scan roots.
- Not already have a custom categorizer.

A path categorizer applies to the selected path and all descendants. The most specific matching rule wins. Custom categorizers override general application and file-category recognition and deliberately set `cleanupPolicy` to `manual`, so matching files do not become automatic cleanup candidates.

Remove a custom rule from the **Custom categorizers** panel. Removal also starts a rescan.

### Categorizer storage

Custom categorizers are stored as versioned JSON at:

```text
%COPILOT_HOME%\extensions\windows-app-storage-inspector-cleanup\artifacts\categorizers.json
```

When `COPILOT_HOME` is unset, it defaults to:

```text
%USERPROFILE%\.copilot\extensions\windows-app-storage-inspector-cleanup\artifacts\categorizers.json
```

Stored data has this shape:

```json
{
  "version": 1,
  "rules": [
    {
      "id": "generated-uuid",
      "name": "Application name",
      "category": "Storage category",
      "description": "Optional description",
      "path": "c:\\normalized\\absolute\\path",
      "createdAt": "2026-08-10T00:00:00.000Z"
    }
  ]
}
```

Use the canvas to add or remove rules. The store is cached in memory and written atomically, so editing it while the extension is running can be overwritten or leave the in-memory state out of sync. Up to 200 custom rules are supported. Names, categories, and descriptions are limited to 120 characters; paths are limited to 4,096 characters.

### Add a built-in categorizer

Built-in categorizers are code-defined in `src\core\categorizers.mjs`. Add an entry to `BUILT_IN_CATEGORIZERS`:

```js
{
    id: "built-in-example-cache",
    name: "Example App",
    category: "Application cache",
    description: "Downloaded data managed by Example App.",
    match: "token",
    value: "\\example app\\cache",
    cleanupPolicy: "manual",
    source: "built-in",
}
```

Built-in rules are not written to `categorizers.json`. Token values should be normalized, lower-case Windows path fragments. Keep `cleanupPolicy: "manual"` unless a separate, tested application-specific policy is deliberately implemented. A tested built-in rule can use `cleanupPolicy: "automatic"` to permit files matching the scanner's age and cleanup-path rules to become direct candidates.

Docker storage is categorized automatically:

- `AppData\Local\Docker` is labeled **Docker Desktop / Container image and build storage**.
- `ProgramData\Docker` is labeled **Docker Engine / Container image and build storage**.

These rules are manual-only because Docker owns the layer database and virtual disk. Use the Docker CLI or Docker Desktop to reclaim image, container, volume, or build-cache storage.

## Custom storage analyzers

Analyzers are code modules, not user-created data records. Use an analyzer when an application needs specialized discovery, process checks, storage summaries, or cleanup eligibility rules that a categorizer cannot provide.

Current analyzers:

- **VS Code Insiders**: identifies retained installation versions and enables cleanup only when a running process positively identifies the active version.
- **Microsoft Scout**: separates application files, user data, and regenerable storage; cleanup is disabled while Scout is running or its process state is unknown.
- **Docker images**: reads Docker image metadata with the Docker CLI, identifies Docker-managed storage under the user profile and `ProgramData`, and provides reviewed Docker cleanup commands. Docker layer folders and virtual disks are never offered for direct Recycle Bin cleanup.
- **npm cache**: reads npm's configured cache location, reports its size and largest files, and provides npm-managed verification and cleanup commands. Its opaque `_cacache` contents are never offered for direct Recycle Bin cleanup.
- **uv cache**: reads uv's configured cache location, reports uv-managed storage and largest files, and provides uv-managed cache commands. Cache files are never offered for direct Recycle Bin cleanup.

Analyzer results are held in memory and are discarded on a new scan or extension restart.

Analyzer commands have a **Run** button. Each command runs through the extension's fixed command allowlist and a singleton command runner, so only one analyzer command can execute at a time across canvas instances.

A blocking modal displays the command, an indeterminate progress bar, and a **Cancel** button while it runs, then displays its result. Cancellation terminates the full spawned Windows process tree and reports the command as cancelled only after termination is verified.

Destructive commands require an explicit confirmation and use non-interactive, scoped CLI arguments. The canvas never executes arbitrary command text received from the browser.

### Create an analyzer

1. Create a module under `src\analyzers`, for example `src\analyzers\example-app.mjs`.
1. Export one async analysis function:

```js
export async function analyzeExampleApp(result) {
  // Use the completed scan result and bounded local inspection.
  return {
    status: "not-running",
    message: "Example App is not running.",
    totalBytes: 0,
    cleanupItems: [
      {
        id: "example-cache",
        name: "Regenerable cache",
        path: "C:\\Users\\...\\Example App\\Cache",
        bytes: 0,
        files: 0,
        modifiedAt: new Date().toISOString(),
        entryType: "directory",
        cleanupEligible: true,
        reason: "Cache can be regenerated by Example App",
        risk: "low",
      },
    ],
    topFiles: [],
  };
}
```

For cleanup integration, return `cleanupItems`. Each eligible item must include:

| Field             | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `id`              | Stable identifier within the analyzer result     |
| `path`            | Absolute path inside a scanned root              |
| `bytes`           | Observed logical size                            |
| `modifiedAt`      | ISO modification timestamp used for revalidation |
| `entryType`       | `file` or `directory`                            |
| `cleanupEligible` | Must be exactly `true` to allow selection        |
| `reason`          | User-facing reason cleanup is appropriate        |
| `risk`            | User-facing risk level                           |

Only mark an item eligible when safety can be positively established. If application process inspection fails or the active data set is ambiguous, return `cleanupEligible: false`.

1. Import and register the analyzer in `src\analyzers\custom-analyzers.mjs`:

```js
import { analyzeExampleApp } from "./example-app.mjs";

export const CUSTOM_ANALYZERS = [
  // Existing analyzers...
  {
    id: "example-app",
    name: "Example App",
    description: "Inspect Example App storage and regenerable caches.",
    analyze: analyzeExampleApp,
  },
];
```

1. Add the analyzer ID to both `analyzerId` enums in root `extension.mjs`:
   - `analyze_custom_storage`
   - `preview_cleanup`
1. Add a purpose-built renderer in `src\ui\renderer.mjs` and dispatch to it from `renderCustomAnalyzer()`.
1. If selecting a recognized folder should activate the analyzer automatically, add a path-segment rule to `analyzerForPath()` in `src\ui\renderer.mjs`.
1. Add analyzer and cleanup-safety coverage to `test\self-test.mjs`.
1. Reload extensions so the updated analyzer registry is discovered.

Do not implement a separate deletion endpoint or Recycle Bin helper for a new analyzer. Return eligible `cleanupItems` and use the centralized `preview_cleanup` and `execute_cleanup` flow so every analyzer receives the same validation, confirmation, progress, and failure handling.

For managed stores such as Docker, do not return direct filesystem cleanup items. Display supported product commands in the analyzer and explain why deleting the underlying storage folders is unsafe.

## Data and persistence

| Data                              | Storage                          | Lifetime                                                  |
| --------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Custom categorizers               | `artifacts\categorizers.json`    | Persistent across sessions and repositories               |
| Completed scan and file inventory | Extension memory                 | Current provider lifetime                                 |
| Analyzer results                  | Extension memory                 | Until the next scan or provider restart                   |
| Cleanup previews                  | Extension memory                 | Ten minutes or until executed                             |
| Cleanup result summary            | Extension memory                 | Current provider lifetime                                 |
| Folder explanation cache          | Canvas iframe memory             | Current canvas page lifetime                              |

The extension does not persist general scan inventories or folder explanations by default.

## Key files

| File                                 | Responsibility                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `extension.mjs`                      | Canvas registration, action schemas, and Copilot folder-explanation handoff    |
| `src\api\server.mjs`                 | Loopback-only HTTP and Server-Sent Events API                                  |
| `src\ui\renderer.mjs`                | Canvas UI, treemap, analyzer widgets, and centralized cleanup modal            |
| `src\core\storage-service.mjs`       | Scan, categorizer, analyzer, preview, cleanup, and progress orchestration      |
| `src\core\scanner.mjs`               | Filesystem traversal, aggregation, classification, and conservative candidates |
| `src\core\cleanup.mjs`               | Shared path validation and Windows Recycle Bin execution                       |
| `src\core\categorizers.mjs`          | Built-in rules and persistent custom categorizer store                         |
| `src\core\analyzer-commands.mjs`     | Fixed analyzer command allowlist and singleton command execution               |
| `src\analyzers\custom-analyzers.mjs` | Analyzer registry and dispatch                                                 |
| `src\analyzers\vscode-insiders.mjs`  | VS Code Insiders analyzer                                                      |
| `src\analyzers\microsoft-scout.mjs`  | Microsoft Scout analyzer                                                       |
| `src\analyzers\docker-images.mjs`    | Docker image and managed-storage analyzer                                      |
| `src\core\folder-explanation.mjs`    | Structured Copilot prompt and response validation                              |
| `test\self-test.mjs`                 | Regression tests for scanning, classification, cleanup, and explanations       |

## Validate changes

Run the existing syntax and regression checks:

```powershell
node --check .\extension.mjs
node --check .\src\ui\renderer.mjs
node --check .\src\core\storage-service.mjs
node .\test\self-test.mjs
```

After changing extension code, reload extensions and reopen the canvas to load the new provider and iframe.
