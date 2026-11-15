---
name: on-device-delegate
description: 'Saves cloud-model context by briefing one bounded, read-heavy sub-task (more than about 25 KB of prose, or many files that no single command can answer) to the local-coding plugin''s on-device worker, which runs on the local MAI Code 1.1 Flash model. Use for log and test triage, summarizing many files, or extracting facts from large inputs. When the user names this skill, call the skill tool in the same response as your first other tool call, never as a separate step.'
compatibility: 'GitHub Copilot CLI on Windows with experimental features on, MAI Code 1.1 Flash installed from /model, and the local-coding plugin installed (it provides the on-device worker agent).'
---

# On-Device Delegate

Send the bulky reading in a task to the on-device worker, then check its answer
once. The main session keeps planning and answering. The worker reads the big
inputs on the local model, so they never enter the main context.

## Steps

1. **Gate on what you would read.** If one command or a short script can
   compute the answer, do it yourself now: no plan, no notes about this
   skill. Delegate only when you would otherwise READ more than about 25 KB
   of text into your context (prose, many files). Never delegate security
   review or design decisions.
2. **Check the worker.** The worker is the custom agent
   `local-coding:on-device-worker` (the plugin id). If the task tool lists it
   as plain `on-device-worker` instead (copied into an agents folder), use
   that. If neither is available, work normally.
3. **Brief.** Do not read the big input first. Make ONE task call:
   - `name`: "on-device-<short-kebab>"
   - `description`: 3-5 words
   - `agent_type`: the worker id from step 2
   - `mode`: "sync"
   - `model`: the on-device model id named in the session's routing line,
     exactly (if there is none:
     "winml-azureml-mai-code-1.1-flash-on-device/MAI-Code-1.1-Flash-On-Device").
     The worker does not pin a model, so without this it runs on your own
     model.
   - `prompt`, exactly:

     ```text
     GOAL: <one sentence>
     INPUTS: <exact paths>
     RULES: Read only INPUTS. At most 8 tool calls. Edit nothing but OUTPUT. No questions.
     OUTPUT: <file path and exact format, or: reply only>
     ANSWER: Reply ONCE with only <exact format>, then stop.
     If you cannot, reply only: UNABLE: <reason>
     ```

4. **Check once.** At most ONE cheap check (format, a count, or one spot
   check). Never recompute the answer or re-read the input. If the answer is
   wrong, UNABLE, or the task call fails: do it yourself. Then finish.

## Example

User: "Use the on-device-delegate skill. From the logs under `logs\`, list
every distinct error message with its count, most frequent first."

Task prompt:

```text
GOAL: Count each distinct error message in the logs.
INPUTS: logs\
RULES: Read only INPUTS. At most 8 tool calls. Edit nothing but OUTPUT. No questions.
OUTPUT: reply only
ANSWER: Reply ONCE with only lines of the form "<count> <message>", most frequent first, then stop.
If you cannot, reply only: UNABLE: <reason>
```

Check: confirm the lines match the format and spot-check one count with a
single search. Then answer the user.

## Limits

- The worker can return a confident but wrong answer. The single check
  catches format errors, not every wrong fact. Tell the user what you checked.
- Expect minutes, not seconds, per delegated task, especially on the first
  call while the local model loads.

## Setup scripts

[`scripts/`](scripts/) holds two setup scripts for the user, described in the
local-coding plugin README. They are not part of a task: never run them while
you work on the user's request.

- [`scripts/Set-LocalOutputCap.ps1`](scripts/Set-LocalOutputCap.ps1) caps the
  local model's output tokens in the user's `providers.json`.
- [`scripts/Update-LocalCodingPlugin.ps1`](scripts/Update-LocalCodingPlugin.ps1)
  installs or updates the plugin, then runs the cap script.
