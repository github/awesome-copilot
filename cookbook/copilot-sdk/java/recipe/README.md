# Runnable Recipe Examples

This folder contains standalone, executable Java examples for each cookbook recipe. Each file can be run directly with [JBang](https://www.jbang.dev/) — no project setup required.

## Prerequisites

- Java 17 or later
- GitHub Copilot authentication configured before running model requests
- Microsoft Copilot SDK for Java 1.0.21 (resolved automatically from `//DEPS`; source remains in the existing GitHub SDK repository)
- JBang installed:

```bash
# macOS (using Homebrew)
brew install jbangdev/tap/jbang

# Linux/macOS (using curl)
curl -Ls https://sh.jbang.dev | bash -s - app setup

# Windows (using Scoop)
scoop install jbang
```

For other installation methods, see the [JBang installation guide](https://www.jbang.dev/download/).

The default child-process transport spawns the `copilot-runtime`
(`copilot-runtime.exe` on Windows) wrapper from the platform's runtime-classifier
JAR. Add `com.github:copilot-sdk-java-runtime:1.0.21:<classifier>` with JBang's
`--deps` option (see [In-Process Runtime](../in-process-runtime.md#prerequisites)
for published classifiers). This transport does not require JNA.

Alternatively, explicitly select an external Copilot CLI executable. Having
`copilot` on `PATH` alone is insufficient. For these recipes, set
`COPILOT_CLI_PATH` before launching Java:

```bash
export COPILOT_CLI_PATH="$(command -v copilot)"
```

```powershell
Get-Command copilot -ErrorAction Stop | Out-Null
$env:COPILOT_CLI_PATH = "copilot"
```

On Windows, keep the bare command name so the SDK can resolve a native executable
or launch an npm CMD shim through `cmd /c`. Do not pass the absolute path returned
by PowerShell's `Get-Command`: it may point to `copilot.ps1`, which Java's
`ProcessBuilder` cannot execute directly.

Applications can instead use `CopilotClientOptions.setCliPath(...)` (including
`setCliPath("copilot")` to select a PATH-installed executable). For subprocess
executable selection, the programmatic path takes precedence over
`COPILOT_CLI_PATH`, which takes precedence over the classifier-provided wrapper.
An external CLI replaces the need for the runtime-classifier JAR in subprocess
mode. Configure a supported authentication source before model requests; no
particular credential file is required, and `COPILOT_HOME` is optional.

The in-process recipe uses the same runtime-classifier JAR differently: it loads
the `runtime.node` native library through JNA instead of spawning the wrapper.
JNA must be declared explicitly and is tested here at 5.19.1. This transport needs
neither an external CLI nor a separate runtime process. A classpath containing the
SDK, matching runtime-classifier JAR, and JNA can serve either transport; merely
adding these dependencies does not select in-process mode. These runtime and
authentication rules also apply to Maven/Gradle applications.

## Running Examples

Each `.java` file is a complete, runnable program. Simply use:

```bash
jbang <FileName>.java
```

### Available Recipes

| Recipe               | Command                              | Description                                |
| -------------------- | ------------------------------------ | ------------------------------------------ |
| Error Handling       | `jbang ErrorHandling.java`           | Demonstrates error handling patterns       |
| Multiple Sessions    | `jbang MultipleSessions.java`        | Manages multiple independent conversations |
| Managing Local Files | `jbang ManagingLocalFiles.java`      | Previews file organization; see safety notes |
| PR Visualization     | `jbang PRVisualization.java`         | Generates PR age charts; requires GitHub access |
| Persisting Sessions  | `jbang PersistingSessions.java`      | Save and resume sessions across restarts   |
| Ralph Loop           | `jbang RalphLoop.java`               | Autonomous AI task loop; modifies files and may commit |
| Accessibility Report | `jbang AccessibilityReport.java`     | WCAG reports; requires Node.js and Playwright MCP |
| In-Process Runtime   | `jbang --deps com.github:copilot-sdk-java-runtime:1.0.21:linux-x64 InProcessRuntime.java` | Native runtime; choose your platform classifier |

### Examples with Arguments

**PR Visualization with specific repo:**

```bash
jbang PRVisualization.java github/copilot-sdk
```

**Managing Local Files with specific folder:**

```bash
jbang ManagingLocalFiles.java /path/to/your/folder
```

**Ralph Loop with a custom prompt file:**

```bash
jbang RalphLoop.java PROMPT_build.md 20
```

## Safety & Prerequisites

The examples use `PermissionHandler.APPROVE_ALL` only for isolated, trusted
demonstrations. This gives the agent permission to use tools without asking you;
replace it with a restrictive handler before using untrusted prompts or workspaces.

<details>
<summary><strong>Managing Local Files</strong> - Test on disposable copies</summary>

The runnable example requests a preview and explicitly tells the model not to move
files. That prompt is not a filesystem security boundary, especially when adapting
the recipe to perform moves. Use a copy of the directory first.
Run the following from this recipe directory:

```bash
recipeDir=$(pwd)
tempDir=$(mktemp -d)
touch "$tempDir/document1.txt" "$tempDir/image1.png" "$tempDir/data.json"
jbang "$recipeDir/ManagingLocalFiles.java" "$tempDir"
# Inspect the plan and files before testing on a real directory.
```

```powershell
$recipeDir = (Get-Location).Path
$tempDir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null
"document1.txt", "image1.png", "data.json" | ForEach-Object {
    New-Item -ItemType File -Path (Join-Path $tempDir $_) | Out-Null
}
jbang "$recipeDir/ManagingLocalFiles.java" "$tempDir"
# Inspect the plan and files before testing on a real directory.
```

The command-line argument selects the target directory. Without it, the example
uses an `example-files` folder inside the system temporary directory.
</details>

<details>
<summary><strong>Ralph Loop</strong> - Modifies files and can create commits</summary>

Run the loop only in an isolated repository until you have reviewed its behavior.
It reads `PROMPT.md` by default and performs at most 50 iterations; pass a prompt
path and a small iteration limit for testing.
Run the following from this recipe directory:

```bash
recipeDir=$(pwd)
tempDir=$(mktemp -d)
cd "$tempDir"
git init
printf '# Task\nCreate a small README. Do not commit changes.\n' > PROMPT.md
jbang "$recipeDir/RalphLoop.java" PROMPT.md 1
git status --short
git diff
cd "$recipeDir"
```

```powershell
$recipeDir = (Get-Location).Path
$tempDir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null
Push-Location $tempDir
try {
    git init
    "# Task`nCreate a small README. Do not commit changes." | Set-Content PROMPT.md
    jbang "$recipeDir/RalphLoop.java" PROMPT.md 1
    git status --short
    git diff
} finally {
    Pop-Location
}
```

Review any edits or commits before removing the test repository. Fresh SDK
sessions isolate model context, not filesystem access.
</details>

<details>
<summary><strong>Accessibility Report</strong> - Requires Playwright MCP</summary>

Install Node.js so `npx` is available. The recipe launches
`npx @playwright/mcp@latest` on demand; a global MCP installation is not required.
Allow time for package resolution and browser setup on the first run.

```bash
jbang AccessibilityReport.java
```

The recipe prompts for a URL and can generate Playwright tests after the report.
</details>

<details>
<summary><strong>PR Visualization</strong> - Requires GitHub API access</summary>

Configure the Copilot CLI's GitHub MCP Server and authenticate for the repository
you want to analyze. Private repositories require appropriate access.
GitHub API requests are subject to
[rate limits](https://docs.github.com/rest/overview/rate-limits-for-the-rest-api).
The agent can run chart-generation code and write images to the working directory.

```bash
jbang PRVisualization.java github/copilot-sdk
```

This Java recipe accepts `owner/repo` as a positional argument, unlike the .NET
recipe's `--repo` option. With no argument, it tries the current Git remote and
then prompts for a repository. Tool search is enabled with a deferral threshold
of 20 tools.
</details>

<details>
<summary><strong>In-Process Runtime</strong> - Requires native dependencies</summary>

Choose the classifier for your operating system and architecture. For example,
on Apple Silicon, check native startup and an in-process ping round trip over
FFI without authenticating or making a model request:

```bash
jbang --deps com.github:copilot-sdk-java-runtime:1.0.21:darwin-arm64 InProcessRuntime.java --ping
```

The recipe then exercises the normal client shutdown path; this does not prove
that every native teardown phase succeeded. Omit `--ping` to create a session
and send the greeting. See
[In-Process Runtime](../in-process-runtime.md) for dependencies, experimental API
opt-in, published platform classifiers, tested coverage, and process-wide limitations.
</details>

## Why JBang?

JBang lets you run Java files as scripts — no `pom.xml`, no `build.gradle`, no project scaffolding. Dependencies are declared inline with `//DEPS` comments and resolved automatically.

## Learning Resources

- [JBang Documentation](https://www.jbang.dev/documentation/guide/latest/)
- [Microsoft Copilot SDK for Java documentation](https://github.com/github/copilot-sdk/tree/main/java)
- [GitHub Copilot CLI](https://github.com/features/copilot/cli)
- [Parent Cookbook](../README.md)
