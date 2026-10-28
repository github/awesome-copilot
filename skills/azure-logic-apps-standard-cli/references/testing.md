# Native workflow testing

Mandatory before `test create`, `test plan`, `test run`, or `test results show`.
Baseline: `logicapp` 1.0.0b1. Testing is optional/task-directed, not an implicit host startup,
dependency installation, NuGet restore, Azure mutation, or substitute for integration checks.

## Select the phase explicitly

| Command | Contract |
|---|---|
| `test create` | Writes new native SDK/MSTest source; no restore or execution |
| `test plan` | Bounded read-only preflight/XML inspection; no tests executed |
| `test run` | Explicit trusted native build/test with separately opt-in restore |
| `test results show` | Inspects supported saved JSON; never reruns tests or follows embedded paths |

Use explicit `--path App --workflow Orders`, otherwise a named/active local context, otherwise
current directory. Explicit `--path` bypasses an implicit active context; an explicitly named
cloud context is refused even with a path. No Azure login or running host is required for
local planning. Input/target failures before reporting are not successful plans.

## Scaffold, then author real assertions

Inspect existing tests and output paths first. Default scaffold output is `Tests/Orders`
under the selected host project; a dedicated test directory within the project is supported.
External dedicated tests are also valid when explicitly selected.

```azurecli
az logicapp test create --path App --workflow Orders
```

Creation refuses an existing destination rather than adopting or overwriting it. Multiple
triggers require explicit `--trigger`. A relative `--output-path` uses the selected project.
The scaffold includes native project/test source, trigger fixture, SDK selection, NuGet
configuration, and Git exclusions. It does not copy app credentials/settings or SDK binaries.

The starter is ignored and inconclusive, **not a passing business test**.
Before removing both the Ignore attribute and inconclusive guard:

1. Populate synthetic trigger data for the actual workflow/trigger.
2. Mock external operations using supported SDK mocks, including required failure paths.
3. Write meaningful business assertions against required behavior/action outputs.
4. Review project imports, build targets, package sources, and test code for permitted effects.

The scaffold links the current selected workflow at build time. Do not remove valid workflow
outputs, alter expected business values, or weaken assertions simply to obtain a pass.
Workflow Succeeded alone does not establish business coverage.

## Plan without execution

```azurecli
az logicapp test plan --path App --workflow Orders --output json
```

Planning inspects local authored inputs and literal references; an optional/default scaffold
`.csproj` is XML metadata, not evaluated MSBuild or executable test discovery. It does not
install, restore, generate fixtures, launch a host, or contact a cloud target.

| Plan exit | Meaning |
|---|---|
| 0 | Plan generated, not tests passed |
| 1 | Authoring finding |
| 3 | Invalid/unsafe local input |
| 4 | Under `--strict`, blocked execution gates after otherwise successful planning |
| 5 | Observed input drift |
| 6 | Report publication failure |

Inspect `notExecuted` markers and findings. A successful plan does not accept SDK terms or
authorize execution. Preserve supported historical reports' recorded exit policies.
Reports are stdout-only by default. Optional `--report-path` needs an existing parent;
overwriting a plan report requires deliberate `--force`, which authorizes no SDK activity.

## Review dependencies, SDK terms, and project trust

Current qualified contract: Tests SDK **1.0.3**, engine **1.165.50**, MSTest **4.0.2**,
target **net8.0**, selected .NET **8** SDK. The scaffold selects **8.0.426** with latest-patch
roll-forward. A target framework does not select the SDK in an existing project.

**.NET 8 support ends 2026-11-10.** Check lifecycle and publisher compatibility at execution
time. Do not silently upgrade the pinned SDK/engine/runner combination, remove selection
guards, or claim a later toolchain is qualified. If no supported approved combination is
available, report the native test execution blocker and keep offline inspection available.

Review the publisher's
[SDK 1.0.3 license](https://www.nuget.org/packages/Microsoft.Azure.Workflows.WebJobs.Tests.Extension/1.0.3/License),
including use/redistribution/commercial-use restrictions, data collection, and updates.
The CLI's MIT license does not license the SDK. Obtain publisher/legal clarification where
needed; do not redistribute SDK binaries with this skill or a generated project.

For **each invocation**, obtain authorization before adding:

- `--accept-sdk-terms`: caller acknowledgement of applicable SDK terms, not a saved-report grant.
- `--trust-project`: acknowledgement that project/imports/targets/test code can execute
  arbitrary code and contact services.
- `--restore`: separate permission to resolve packages through reviewed sources.

Do not infer these permissions from activating the skill, generating a plan, a prior run,
saved flags, a context, or `--force`. Caches and mocks are not a security sandbox or denied
egress. Use an appropriately isolated environment for untrusted native code.

The scaffold NuGet configuration clears inherited sources and selects the official feed.
Before restore, adapt/review it for the customer's approved feed/proxy policy; do not
prescribe a company-specific proxy to all users. Use explicit `--nuget-config CONFIG_PATH`
if appropriate. Never bypass TLS or silently add another source after restore failure.
Inherited user feed/credential/proxy environment configuration is not automatically passed
to the private runner; a mirror requiring those must be configured through a supported,
reviewed mechanism rather than assumed to work.

Existing lockfiles use locked restore; a new restore produces a lockfile for review.
Commit appropriate `packages.lock.json`, not package binaries. Without `--restore`,
build/test use `--no-restore`; missing dependency evidence is an error, not permission
to download. The CLI does not install a global SDK to satisfy this task.

## Execute only reviewed tests

Only after the above approvals, choose the required invocation:

```azurecli
az logicapp test run --path App --workflow Orders --accept-sdk-terms --trust-project --restore --timeout 300
```

For a reviewed previously restored project, omit `--restore`. From the directory containing
`App`, after creating `App\reports`, save a new sanitized report with:

```azurecli
az logicapp test run --path App --workflow Orders --accept-sdk-terms --trust-project --report-path reports/native.json --timeout 300
```

Use the host OS's path separator when invoking examples. Select an existing custom
project with `--test-project`; there is no need to regenerate tests just to run them.
`--timeout` bounds native steps (1-3600 seconds); identity-checked cleanup can take longer.

| Path argument | Resolution |
|---|---|
| Relative create `--output-path`, plan/run `--report-path` | Selected host project |
| Explicit relative `--test-project`, `--nuget-config` | Shell current directory |
| Results `--result-file`, `--workflow-file` | Shell current directory |

Use absolute paths when these different bases would be ambiguous. Report parents must
exist; native report destinations must be new files. For example, after creating an
`App\reports` directory, `--path App --report-path reports/native.json` writes
`App\reports\native.json`. Using `--report-path native.json` instead writes `App\native.json`,
not a file in the reports directory. Results inspection must name the same saved file
relative to the shell's working directory, not the selected project.

## Interpret results without overstating coverage

| Run exit | Meaning |
|---|---|
| 0 | Native tests passed with at least one executed test; inspect skipped counts and assertions |
| 1 | Native test/assertion failure |
| 2 | Toolchain, dependency, restore/build, runner, or results error |
| 3 | Invalid/unsafe local input |
| 4 | Missing terms/project-trust acknowledgement; no native execution |
| 5 | Observed selected-input drift |
| 6 | Report publication failed; inspect destination before retry |
| 7 | Zero executed tests, including entirely skipped scaffolds; not passed |
| 8 | Native deadline; no complete verdict |
| 9 | Safe process cleanup incomplete; retained ownership receipt |
| 130 | Interrupted; no complete verdict |

Native counts do not attest that arbitrary C# invoked the SDK, executed the selected
workflow, or covered useful behavior. Preserve `notAttested` workflow/business coverage
and `notProvided` isolation markers; complement counts with reviewed assertions.

Native stdout/stderr is not raw-echoed by the CLI. Raw TRX stays under the dedicated test
directory's `.logicapp-test-state` run storage and can contain fixtures, outputs, paths,
and failure details. Protect it; do not share it as a sanitized report.
CLI telemetry opt-out does not establish that SDK telemetry is disabled.

From the same directory containing `App`, inspect that saved sanitized report and the
selected workflow:

```azurecli
az logicapp test results show --result-file App/reports/native.json --workflow-file App/Orders/workflow.json
```

Select the actual files according to the path table. Results inspection accepts closed
supported preflight/native JSON, not raw SDK/TRX. It does not follow report-embedded paths,
rerun tests, or authenticate authorship. Inspection exit 0 means read success; recorded
outcomes/counts are historical. Optional workflow-byte comparison detects drift, not a
new execution or attested coverage.

## Failure and cleanup boundaries

SDK 1.0.3/engine 1.165.50 has a documented `InvalidCastException` for some valid nonempty
typed top-level workflow outputs. Do not delete outputs, patch binaries, or change workflow
semantics to hide it. Report the actual failing test/SDK limitation and seek a separately
qualified publisher fix. Action-output assertions are not a universal workaround.

If cleanup cannot safely complete, retain the process receipt and ownership evidence.
A later run refuses new work while such a receipt remains, including malformed receipts.
Do not delete receipts or kill processes by name to unblock execution. Inspect/reconcile
ownership explicitly; report unresolved cleanup. Old completed reports alone do not grant
permission to stop anything.

Keep native tests/state in dedicated directories. Do not colocate them with host/workflow
runtime content. Packaging excludes verified dedicated native test content and raw TRX,
but arbitrary trusted code may write elsewhere: inspect package contents independently.

**Gate:** Required native assertions actually executed, counts/outcomes/limitations reported,
approved source/terms/trust boundaries preserved, sensitive artifacts excluded, and no
hidden cleanup or dependency blocker.
