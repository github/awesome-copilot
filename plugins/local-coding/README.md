# Local Coding Plugin

**Experimental, for dogfooding.** Let a cloud GitHub Copilot CLI session hand large, mechanical
sub-tasks to **MAI Code 1.1 Flash** running on your own Windows PC. The main session keeps
planning and answering. The local model does the bulky reading and the repetitive edits. Those
tokens stay out of the main session's context and, because they run on your device, do not use
GitHub AI Credits. It is about 10x to 11x slower than cloud only, and it has not shown a cost
saving on our task set (see [Measured results](#measured-results)).

Version 0.3.2: offload agent v12 with the DONE double-check, the `on-device-delegate` skill, and
two setup scripts, `Set-LocalOutputCap.ps1` and `Update-LocalCodingPlugin.ps1`.

## Installation

```bash
copilot plugin install local-coding@awesome-copilot
```

Then cap the local model's output tokens once (strongly recommended, see
[Cap runaway generations](#cap-runaway-generations)).

## What's Included

| Component | Type | Use it when |
|---|---|---|
| `On-Device Offload` (`local-coding:on-device-offload`) | Agent | You want the main session to hand a whole read-heavy or mechanical task to the local model. Start here. |
| `on-device-delegate` | Skill | You want the main session to brief one bounded sub-task to the local model and check the answer once. |
| `On-Device Worker` (`local-coding:on-device-worker`) | Agent | Used by the `on-device-delegate` skill. You do not call it directly. |
| `skills/on-device-delegate/scripts/Set-LocalOutputCap.ps1` | Script | You run it once to cap the local model's output tokens in your `providers.json`. |
| `skills/on-device-delegate/scripts/Update-LocalCodingPlugin.ps1` | Script | You want the install or update and the cap in one command. |

Neither agent pins a model in its frontmatter. On Copilot CLI 1.0.105 a pinned CLI-managed model
id is rejected, so the main session passes the model on the task call. Both agents limit
themselves to the read, search, edit, and shell tools (no sub-agents), and finish with a one-line
`DONE` or `UNABLE` (or the exact answer format they were asked for).

What the plugin adds over a plain custom agent with a local model:

- **When to offload.** The agent description and the skill gate on how much the main session
  would otherwise read (about 10 KB for the agent, about 25 KB for the skill), and rule out new
  code from a spec, design decisions, and security review.
- **A worker prompt tuned for a small local model.** A tool-call budget, scripts instead of
  reading whole files, computing every count or extraction two independent ways, in-place edits
  with a diff check, and an explicit stop on loops.
- **DONE double-check.** Before the main session accepts the worker's `DONE`, it reads the
  deliverable and checks each item, count, or value it will report against the source with one
  targeted search or a small view of the cited lines, or reruns the worker's own check. It never
  re-reads the whole input or redoes the task. If any fact is wrong or missing, it treats the reply
  as `UNABLE`, undoes the worker's files, and does the task itself.
- **A brief format** (`GOAL`, `INPUTS`, `RULES`, `OUTPUT`, and `ANSWER`) for the skill, so the
  main session never reads the big input itself, plus a single cheap check of the result.

## Prerequisites

These come from the GitHub Docs page
[Adding LLM models to GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-llm-models#installing-a-local-model-from-the-model-picker),
where local models are in public preview:

- A Windows PC with an NVIDIA GPU, at least 96 GB of combined RAM, and 60 GB of free storage for
  MAI Code 1.1 Flash.
- GitHub Copilot CLI, signed in.
- Experimental features on: start the CLI with `copilot --experimental`, or run
  `/experimental on` once.
- MAI Code 1.1 Flash installed from the model picker:
  1. In a session, enter `/model`.
  2. Under **Local and self-hosted**, select **MAI Code 1.1 Flash** and press Enter.
  3. Choose **Download and set up**. The CLI checks your hardware, downloads the model, and tells
     you in the conversation when it is done.
  4. Pick your usual cloud model again for the main session.
- Windows PowerShell 5.1 or PowerShell 7 for the two scripts.

## Cap runaway generations

Run `Set-LocalOutputCap.ps1` once after you install the model. Copilot CLI 1.0.105 asks the local
model for up to the model row's `maxOutputTokens`, and **Download and set up** writes 128,000 for
MAI Code 1.1 Flash. When the model loops, one reply can run for 25 to 50 minutes. With an 8,192
cap the loop stops at the cap, the offload agent's reply is not `DONE`, and the main session does
the task itself. In our runs the cap took runaway timeouts from 6 to 0.

The plugin cannot change that setting by itself. The script backs up `providers.json` first and
changes only that one model row. It ships inside the installed plugin, under
`%USERPROFILE%\.copilot\installed-plugins\`:

```powershell
$cap = Get-ChildItem "$HOME\.copilot\installed-plugins" -Recurse -Filter Set-LocalOutputCap.ps1 |
  Where-Object FullName -match '\\local-coding\\' | Select-Object -First 1
powershell -ExecutionPolicy Bypass -File $cap.FullName -WhatIf    # show the change
powershell -ExecutionPolicy Bypass -File $cap.FullName            # cap at 8,192
powershell -ExecutionPolicy Bypass -File $cap.FullName -Restore   # undo
```

Restart open sessions afterwards. Running **Download and set up** for the model again puts 128,000
back, so run the script again then. Options: `-MaxOutputTokens <n>`, `-Model <provider/id>`, and
`-ProvidersJson <file>`.

## Update or one-shot setup

`Update-LocalCodingPlugin.ps1` does the install or update and the cap in one go, and is safe to run
again:

1. It installs or updates `local-coding@awesome-copilot`. If that fails, or the marketplace has an
   older version than the copy the script came in, it installs that local copy instead
   (`-PluginPath`, default: the plugin folder the script sits in). It then removes the other copy,
   so the agents do not load twice.
2. It checks that `copilot plugin list` shows this version or newer, and enables the plugin if it
   is disabled.
3. It runs the installed `Set-LocalOutputCap.ps1`. If `providers.json` has no CLI-managed
   MAI Code 1.1 Flash row, it says so and skips the cap.
4. It prints the next steps.

```powershell
$upd = Get-ChildItem "$HOME\.copilot\installed-plugins" -Recurse -Filter Update-LocalCodingPlugin.ps1 |
  Where-Object FullName -match '\\local-coding\\' | Select-Object -First 1
powershell -ExecutionPolicy Bypass -File $upd.FullName -WhatIf   # show the plan
powershell -ExecutionPolicy Bypass -File $upd.FullName           # do it
```

Options: `-Source Marketplace|Local` (default `Auto`), `-PluginPath <folder>`,
`-CopilotHome <dir>`, `-MaxOutputTokens <n>`, `-SkipCap`, `-Restore` (undo the cap only), and
`-Help`. Restart open CLI sessions afterwards.

## The model id

The agent and skill text use the provider-qualified id that Copilot CLI gives the model it
installs:

```text
winml-azureml-mai-code-1.1-flash-on-device/MAI-Code-1.1-Flash-On-Device
```

`/model` shows the same model as **MAI Code 1.1 Flash** under **Local and self-hosted**. If your
CLI shows a different id, put that id in the routing line below. The agent and the skill use the id
the routing line names, and fall back to the id above when there is none.

## Check the installation

```bash
copilot plugin list
copilot skill list
```

The install message counts only skills ("Installed 1 skill"). The two agents are installed too.
Plugin agents load with the plugin name as a prefix: `local-coding:on-device-offload` and
`local-coding:on-device-worker`. In a session, `/agent` lists **On-Device Offload** and
**On-Device Worker**, and `/skills list` shows `on-device-delegate`. A personal or project agent or
skill with the same id takes precedence over the plugin's copy. Copied agents (for example in
`~/.copilot/agents/`) load without the prefix, as plain `on-device-offload` and
`on-device-worker`, and the agent and skill text fall back to those ids.

## Use the offload agent

Start `copilot --experimental` in your repository and keep a cloud model as the main model.
Begin the prompt with this routing line, then your task:

```text
An on-device offload agent is installed. Use it only when its description says so. When you do, set model winml-azureml-mai-code-1.1-flash-on-device/MAI-Code-1.1-Flash-On-Device on its task calls.
```

Example tasks:

```text
Summarize every failing test in test-output.log into failures.md: one line per test with the test name, file, and first error line.
```

```text
Rename the setting retryCount to maxRetries in every file under src\ and docs\. Change nothing else.
```

```text
Read every file under docs\ and list each TODO in todos.md as path:line followed by the TODO text.
```

When the agent runs, the session shows an offload sub-agent on the local model that ends in
`DONE: ...` or `UNABLE: ...`. On `DONE`, the main session spot-checks the result against the
source, then answers in one sentence that names what was written. On `UNABLE`, an error, or a
failed check, it runs `git status`, undoes only the files the worker changed, and does the task
itself.

## Use the skill

Name the skill in the prompt:

```text
Use the on-device-delegate skill. From the logs under logs\, list every distinct error message with its count, most frequent first.
```

The skill briefs one bounded sub-task to the `On-Device Worker` agent and sets the task's `model`
to the local model id, because the worker does not pin one. The worker's block in the session
shows the model it ran on. The skill only delegates when the task means reading a lot of text. For
small tasks, or when the worker agent is not available, the main session does the work itself.

## Measured results

For dogfooding and testing, **not a cost win under either main model so far**. Measured on Copilot
CLI 1.0.108 with plugin 0.3.2, 12 tasks x 3, one test PC (RTX, 66 GB), using MAI Code 1.1 Flash
(CLI-managed, 8,192 output cap) as the offload model. The offload set is log triage,
long-document extraction, and multi-file edits. Cost per success charges each failed run a redo
at the pure-cloud price.

| Main model | Offload agent v12 with the DONE double-check | Pure cloud, same main model | Cost per success | Time per success |
|---|---|---|---|---|
| Claude Sonnet 5.5 | 33/36 | 36/36 | 29.4% higher (0.0756 vs 0.0584 USD), interval spans zero | 11.1x slower (193.6 vs 17.5 s) |
| GPT-6.1 Sol | 35/36 | 36/36 | 4.4% lower (0.0498 vs 0.0521 USD), interval [-19.3, +24.7] spans zero | 10.6x slower (322.4 vs 30.5 s) |

- **No measurable cost saving on this set.** Both cost intervals span zero. Read the Sol number as
  a wash, not as a saving, and the Sonnet number as dearer.
- The double-check costs about 0.02 USD and 9 to 12 s per `DONE` reply. It caught 2 wrong `DONE`
  replies in each arm and rejected no correct one. It does not catch them all: 3 wrong `DONE`
  replies were kept under Claude Sonnet 5.5, and 1 under GPT-6.1 Sol.
- The output cap keeps a runaway response bounded. Both arms had 0 timeouts in these runs.
- Three runs per task on one task set: most differences between plugin versions are within noise.

Treat these as one machine's dogfooding numbers, not a benchmark.

## Fully local instead

To run the whole session on the local model, with no cloud main model and no plugin, select
**MAI Code 1.1 Flash** in `/model` and choose **Select this model**.

## Good for and not for

Good for: reading or summarizing big logs and many files, search and extraction, test and log
triage, and the same mechanical edit across files.

Not for: multi-step coding, hard or long tasks, design decisions, security review, or anything
where a confident wrong answer is costly.

## Limits

- **Experimental.** Treat results as drafts and review the files the agent names.
- **Check the results.** The local model can return a confident but wrong answer. The DONE
  double-check catches most of these, not all (one wrong `DONE` was kept in 27 under GPT-6.1 Sol).
- **Slower than cloud only.** Expect minutes, not seconds, per offloaded task. The first offload
  in a session waits for the local model to load.
- **Output cap is opt-in.** Without `Set-LocalOutputCap.ps1`, a long or looping response can run
  for many minutes before the agent's own loop check stops it.
- **No hooks in this listing.** The plugin has no session-start hook, so type the routing line
  yourself, and it does not undo a failed offload's partial edits for you. The agent text tells the
  main session to undo only the worker's files with `git status` before it does the task itself.
  Changes outside the git work tree are not covered.
- **One surface at a time.** Do not use the local model from the CLI, the Copilot app, and VS Code
  at the same time. Each loads its own copy into memory.

## Related

- [Delegating focused tasks to a specific model](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli#delegating-focused-tasks-to-a-specific-model)
  describes the custom-agent mechanism these agents use.
- **Copilot Fusion** with **Fusion Standard** in `/model` picks MAI Code 1.1 Flash automatically
  for suitable tasks. This plugin is the explicit, per-task alternative.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
