# Redact and persist Copilot Markdown sessions

Implement this plan autonomously in the current `awesome-copilot` repository. Make the code changes, update directly related documentation and tests, run validation, and fix failures. Do not merely describe an implementation.

Do not edit any installed plugin files under `C:\Users\edburns\.copilot`. The source of record is the current repository, including `plugins/shepherd-task/`.

## Goal

Every shepherd-task Copilot invocation that uses `copilot --share` must persist a deterministic, redacted Markdown session transcript in the campaign artifact directory.

The Copilot CLI currently prints messages such as:

```text
Session exported to: C:\Users\edburns\AppData\Local\Temp\shepherd-redact-<guid>\session.md
```

Those temporary files are deliberately deleted after processing. The useful content must instead be available at the durable session path already associated with the invocation, and shepherd-task must explicitly print that durable path after redaction and persistence.

Raw, unredacted Markdown or JSONL must never be copied into a campaign directory. Temporary raw artifacts must be deleted on success and failure.

## Scope

Cover every active shepherd-task execution surface:

1. Stage 20 generated invocation scripts:
   - `plugins/shepherd-task/scripts/shepherd-task-15-prepare-create-issues.ps1`
   - `plugins/shepherd-task/scripts/shepherd-task-15-prepare-create-issues.sh`
2. Per-issue stage 30 and stage 40 runners:
   - `plugins/shepherd-task/scripts/shepherd-task.ps1`
   - `plugins/shepherd-task/scripts/shepherd-task.sh`
3. Stage 50 invocation from stage 25:
   - `plugins/shepherd-task/scripts/shepherd-task-25-given-list.ps1`
   - `plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh`
4. Shared redaction helpers and directly related tests or documentation.

Preserve the existing durable filenames:

```text
create-issues-session-<timestamp>.md
create-issues-session-<timestamp>.jsonl
phase1-task-<timestamp>-<issue>.md
phase1-task-<timestamp>-<issue>.jsonl
phase2-task-<timestamp>-<issue>.md
phase2-task-<timestamp>-<issue>.jsonl
post-mortem-session-<timestamp>.md
post-mortem-session-<timestamp>.jsonl
```

Do not attempt to recover temporary sessions from historical runs after their temporary directories have already been deleted.

## Required behavior

### Redaction-first persistence

For each Copilot invocation:

1. Create a unique `shepherd-redact-<guid>` temporary directory.
2. Direct raw `copilot --output-format json` stdout to `session.jsonl` in that directory.
3. Direct raw `copilot --share` output to `session.md` in that directory.
4. Capture the Copilot exit code without allowing shell error handling to skip artifact processing.
5. Run the existing platform redactor against the temporary directory.
6. Require redaction to succeed before either artifact is moved to durable storage.
7. Move only the redacted `session.jsonl` and `session.md` to their deterministic campaign artifact paths.
8. Run the existing defense-in-depth redaction pass over the containing run directory, including any OTel output.
9. Delete the temporary directory in an unconditional cleanup path.
10. Return the original Copilot failure after redacted artifacts have been preserved. A redaction or persistence failure must be surfaced as a shepherd failure and must never result in raw artifacts being retained.

PowerShell and Bash must implement the same observable contract.

### Durable-path logging

After both redacted session files have been persisted, print:

```text
[shepherd-task] Session transcript persisted: <durable-markdown-path>
[shepherd-task] Session events persisted:     <durable-jsonl-path>
```

If OTel is enabled for the invocation, also print:

```text
[shepherd-task] Session telemetry persisted:  <durable-otel-path>
```

These messages must refer only to durable redacted paths. Do not print a success-shaped persistence message before redaction and movement have completed.

The Copilot CLI may continue to print its own temporary `Session exported to:` message. Do not depend on that message, parse it, or represent its path as durable.

On Copilot failure, print the durable paths before reporting the nonzero exit, provided redaction and persistence succeeded.

### Failure semantics

Use these precedence rules:

1. If redaction fails, fail the invocation because safe persistence cannot be guaranteed.
2. If redaction succeeds but persistence fails, fail the invocation and identify the destination that could not be written.
3. If artifact handling succeeds and Copilot exited nonzero, preserve the redacted artifacts and return/report the Copilot failure.
4. Always delete the temporary directory.
5. Never silently ignore a missing expected `session.md` or `session.jsonl`.

Do not add broad exception catches or success-shaped fallbacks.

## Implementation design

### 1. Extract shared platform helpers

Remove the duplicated raw-session handling from the stage runners by adding:

```text
plugins/shepherd-task/scripts/invoke-copilot-redacted.ps1
plugins/shepherd-task/scripts/invoke-copilot-redacted.sh
```

The helpers must own:

- temporary-directory creation;
- invocation of `copilot --yolo --output-format json --share <temporary-session.md>`;
- raw JSONL capture;
- Copilot exit-code capture;
- redaction of the temporary directory;
- validation that both redacted files exist;
- movement to caller-supplied durable Markdown and JSONL paths;
- optional OTel environment setup, cleanup, and final redaction;
- durable-path logging;
- unconditional temporary cleanup;
- final exit status.

Use explicit parameters rather than parsing a free-form command line.

Suggested PowerShell interface:

```powershell
& "$PSScriptRoot/invoke-copilot-redacted.ps1" `
  -Prompt $prompt `
  -SessionPath $sessionSharePath `
  -JsonlPath $sessionJsonlPath `
  -OtelPath $sessionOtelPath
```

Make `-OtelPath` optional for stage 50.

Suggested Bash interface:

```bash
printf '%s' "$prompt" |
  "$SCRIPT_DIR/invoke-copilot-redacted.sh" \
    --session "$session_share_path" \
    --jsonl "$session_jsonl_path" \
    --otel "$session_otel_path"
```

The Bash helper should accept the prompt on stdin so multiline prompt content is preserved exactly. The PowerShell helper may accept the prompt as a parameter.

Use the existing `redact-secrets.ps1` and `redact-secrets.sh`; do not duplicate secret-detection logic.

### 2. Make destination handling safe

Resolve and validate destination paths before invoking Copilot:

- the Markdown and JSONL destinations must be different files;
- their parent directory must already exist;
- when supplied, the OTel destination must be distinct from both session paths;
- use literal-path operations in PowerShell and quoted paths in Bash;
- create only redacted temporary sibling files when an atomic final rename is needed;
- do not place raw intermediate files in the campaign directory.

Preserve the current overwrite behavior unless an existing test or documented contract requires rejecting collisions. Do not broaden this task into timestamp or run-directory redesign.

### 3. Update stage 20 generated launchers

Replace the generated inline PowerShell temporary-directory implementation with the shared PowerShell helper.

Replace the generated Bash pipeline that writes `--share` directly into the durable run directory with the shared Bash helper. The current Bash behavior can expose an unredacted Markdown transcript in durable storage until the later directory redaction pass; eliminate that interval.

Ensure the generated launcher still:

- sets or passes the OTel destination;
- checks the Copilot/helper exit code;
- validates `stage-20-result.json`;
- prints `Create-issues session complete.` only after successful artifact handling and result validation.

Update generator tests so they inspect the generated script, not merely the generator source.

### 4. Update stage 30 and stage 40 runners

Replace the local `Invoke-CopilotRedacted` and `run_copilot_redacted` implementations in `shepherd-task.ps1` and `shepherd-task.sh` with calls to the shared helpers.

Pass the existing phase-specific Markdown, JSONL, and OTel destinations.

Correct the PowerShell failure ordering: it currently throws on a nonzero Copilot exit before redacting and moving the raw session. The new helper must redact and persist available artifacts first, then report the Copilot failure.

Correct the Bash `--share` behavior: it currently passes the durable Markdown destination directly to Copilot and redacts it only afterward. The shared helper must use a temporary raw share path.

Preserve all existing phase prompts, verification logic, and fail-fast orchestration behavior.

### 5. Update stage 50 invocation

Replace the local stage-25 helper implementations with the shared platform helpers.

Retain the stage-50 logging introduced by commit `94e74099`:

```text
[shepherd-task] Stage 50: Generating campaign post-mortem...
[shepherd-task] Stage 50 report:  ...
[shepherd-task] Stage 50 session: ...
[shepherd-task] Stage 50 events:  ...
[shepherd-task] Stage 50 prompt: ...
[shepherd-task] Stage 50 COMPLETE: Post-mortem created: ...
```

The new durable-session messages should appear after the stage-50 Copilot process exits and its session artifacts have been safely persisted.

Keep run-manifest finalization before stage-50 invocation so the post-mortem reads terminal run state.

### 6. Redact OTel consistently

OTel output is written directly by Copilot rather than through `--share`. After Copilot exits:

- run the existing redactor on the OTel file or its containing run directory;
- do not print `Session telemetry persisted` until that redaction succeeds;
- unset or restore `COPILOT_OTEL_FILE_EXPORTER_PATH` in unconditional cleanup;
- do not leave an environment value that can affect a later invocation.

If the caller already had `COPILOT_OTEL_FILE_EXPORTER_PATH`, restore its original value rather than deleting it.

### 7. Update documentation

Update the shepherd-task plugin documentation wherever session artifacts are described. State that:

- `*.md` session transcripts are durable redacted Copilot `--share` exports;
- `*.jsonl` files are durable redacted Copilot event streams;
- temporary `shepherd-redact-*` paths are implementation details and are deleted;
- console persistence messages identify the authoritative artifact paths.

Do not document the temporary path as recoverable.

## Tests

Add a focused cross-platform artifact test, preferably:

```text
plugins/shepherd-task/test/07-redacted-session-persistence.ps1
plugins/shepherd-task/test/07-redacted-session-persistence.sh
```

Use a temporary test directory and a fake `copilot` executable placed first on `PATH`. Do not invoke the real Copilot CLI or GitHub.

The fake Copilot must:

- accept the arguments used by the helper;
- write a Markdown share file containing ordinary content and representative fake secrets;
- emit JSONL containing ordinary content, scalar arrays, and representative fake secrets;
- optionally write OTel content when the exporter variable is set;
- print a temporary `Session exported to:` line;
- support configurable zero and nonzero exit codes.

Cover at least these cases:

1. **Successful invocation**
   - durable Markdown and JSONL exist;
   - expected ordinary content remains;
   - fake secrets are redacted;
   - durable-path messages are printed;
   - the temporary directory is deleted.
2. **Copilot exits nonzero after producing artifacts**
   - redacted Markdown and JSONL still exist;
   - durable paths are logged;
   - the helper returns the Copilot failure;
   - the temporary directory is deleted.
3. **Markdown share is missing**
   - helper fails clearly;
   - no success-shaped persistence message is printed;
   - no raw durable file exists.
4. **JSONL is missing**
   - helper fails clearly;
   - no success-shaped persistence message is printed.
5. **Redaction failure**
   - helper fails;
   - no raw artifact is moved into durable storage;
   - temporary content is deleted.
6. **Persistence failure**
   - helper identifies the failed destination;
   - no raw artifact is exposed.
7. **OTel enabled**
   - telemetry is redacted;
   - its durable path is logged only after redaction;
   - a preexisting exporter environment value is restored.
8. **Paths containing spaces**
   - all artifacts are written to the exact requested destinations.

Extend existing contract tests to verify that all three execution surfaces call the shared helper:

- stage-20 generated launchers;
- stage-30/40 per-task runners;
- stage-50 finalization.

Retain the scalar-array and JSONL regression coverage already present in the stage-20 artifact tests.

## Acceptance criteria

The implementation is complete only when:

- every active shepherd-task `copilot --share` invocation writes raw output to a unique temporary directory;
- every produced Markdown transcript has a durable redacted copy in the appropriate campaign artifact directory;
- JSONL and optional OTel artifacts are redacted and durable;
- nonzero Copilot exits preserve available redacted evidence;
- no raw session is ever moved into the campaign directory;
- temporary raw directories are removed on every path;
- console output clearly distinguishes Copilot's temporary export from shepherd-task's durable artifacts;
- PowerShell and Bash behavior match;
- stage-20, stage-30, stage-40, and stage-50 workflows retain their current orchestration semantics;
- all targeted and repository validation passes.

## Validation

Run the smallest relevant tests first, then the repository validation required for shepherd-task changes:

```powershell
& 'plugins\shepherd-task\test\05-stage20-artifact-contract.ps1'
& 'plugins\shepherd-task\test\06-stage40-review-contract.ps1'
& 'plugins\shepherd-task\test\07-redacted-session-persistence.ps1'

& 'C:\Program Files\Git\bin\bash.exe' -lc @'
bash -n \
  plugins/shepherd-task/scripts/invoke-copilot-redacted.sh \
  plugins/shepherd-task/scripts/shepherd-task-15-prepare-create-issues.sh \
  plugins/shepherd-task/scripts/shepherd-task.sh \
  plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh \
  plugins/shepherd-task/test/07-redacted-session-persistence.sh
plugins/shepherd-task/test/05-stage20-artifact-contract.sh
plugins/shepherd-task/test/06-stage40-review-contract.sh
plugins/shepherd-task/test/07-redacted-session-persistence.sh
'@

npm run plugin:validate
npm run skill:validate
npm run build
& 'C:\Program Files\Git\bin\bash.exe' -lc 'bash eng/fix-line-endings.sh'
git diff --check
```

If the existing test numbering or available Bash test files differ, follow the repository's current conventions while retaining equivalent coverage.

Review the final diff to confirm that no installed file under `C:\Users\edburns\.copilot` was modified and no raw test secret or temporary session artifact was added to Git.
