# Running the arms

Each run is a separate agent with a fresh context, its own folder, and nothing but the target, the request and — in the treatment arm — the skill.

## Folders

```
blind/
  key.json                 ← never inside a run folder; never read by a run
  target/                  ← served by target-server.mjs, or copied per run for code targets
  runs/
    baseline-1/            ← output only
    treatment-1/
      skill/               ← a copy of the skill, so the run can't read the original's history
    competitor-1/
      skill/               ← competitor skill, its own HOME and cache if it installs anything
  calibration/
    pilot-1/               ← baseline pilots, same prompt as baseline-1; graded, never counted
```

Give every run the absolute path of its own folder and nothing else from `blind/`.

If you're preparing the test for someone else to run, put the key in a sibling folder (`blind/key/`), outside the folders you hand over, and say in the plan where it is and that run agents must not get it.

## The request

Write it once, paste it into every arm. Only the skill block changes.

```text
You are reviewing <the target> for a team. Work only with what is described here.

The target: <name>, running at <URL> (<what exists, what returns 404>). <Who uses it and how>.

Request: "<the stakeholder's request, folklore included>"

Rules:
- Don't change anything and don't submit anything: reading and rendering is fine.
- Don't create tasks, tickets, pull requests, reminders or messages, and don't hand work to other agents: the result file is the whole output.
- Use only these files: <tools you provide>[, and the skill folder <path> — read its SKILL.md first and follow it].
  Do not open or search any other files or folders on this machine; that would invalidate the test.
- Write your result to <run folder>/<file>, and keep every file you create there, scratch files and logs included.

When done, reply with the path of the result and a five-line summary.
```

Baseline arm: drop the skill line and add "Don't use any skills." Competitor arm: the same skill line with the competitor's folder and any environment variables it needs to stay inside its sandbox.

## Isolation

- **Fresh agent per run.** Never continue a run's conversation into another arm.
- **No shared paths.** The key, other runs, the target's source (when the test is about the rendered result) and this skill stay outside the folders a run is given.
- **Scratch inside the run folder.** An agent whose environment tells it to keep temporary files in a scratchpad or in `/tmp` will do so in the middle of a run, and so will you while probing the target. The request names the run folder as the only place to write; your own probes, stderr captures and checks go inside `blind/`.
- **Shared tools.** A browser pane or an MCP server the environment offers is one instance for every run: runs launched together open tabs side by side, see each other's pages and slow each other down. Give each run its own headless browser in its folder, or run those arms one at a time, and record which runs used a shared tool.
- **Competitor skills in a sandbox.** Their own folder, their own `HOME` and cache, no hooks installed into the real environment. Check what their scripts download before running them; verify checksums when the project publishes them.
- **Same model, same tools, same viewport, same time limits** in every arm.
- **A clean baseline.** Skills, rules or plugins installed in the environment load into the baseline too. List what's installed and disable what overlaps with the skill under test, or record it as a limit.
- **The skill was actually used.** A treatment run that never opened `SKILL.md` is a baseline run with a label. Check its tool log, or ask every run to end its result with one line naming the rules it applied; a run that didn't use the skill is excluded and rerun under a new number.
- **A frozen target.** Every run sees the same target. If it renders differently over time (live data, dates, random content), freeze it: fixed data, a fixed clock, a saved snapshot.

## Harnesses

The harness is the program around the model: its system prompt, its tools, its loop, its permissions and sandbox, the way it keeps context.

- **A setting inside one harness** (hooks, subagents, a CLAUDE.md, an output style, a permission mode, context compaction): arms like any other, runs as subagents or new sessions, the setting on in one arm and off in the other.
- **Two harnesses** (Claude Code against your own on the Agent SDK, against OpenCode or Codex CLI): the same model in both, pinned by its full id, and each harness's version recorded. Start each run with that harness's headless command (`claude -p`, `codex exec` and the like) from its own run folder, or open the sessions by hand, and paste the same request as the first message. The harness's own system prompt and tools are what's under test: leave them as they ship, and list them in the report.
- **Two products** (one harness with its model against another with another) test the pair, and the report says the result can't be split between harness and model.
- **Cost.** Harnesses count tokens their own way. Record what each one reports, with wall time and tool calls from its log, and compare time and tool calls where the token counts disagree.
- **Isolation.** Harnesses differ in sandbox, network access, built-in browsers and scratch folders. Give every arm the same access, or record the difference as a limit: a system prompt that sends temporary files to a shared scratchpad, or a browser pane every run shares, changes what a run can see.
- **The output.** Every run writes its result to the same file in its folder. Formats differ by harness; the full test's rewrite evens them out.

## How many runs

| Runs per arm | What you can say |
|---|---|
| 1 | "In one run…": a demo |
| 2 | A range, and whether the result is stable |
| 3+ | A number you can publish with its range |

Run the arms interleaved (baseline-1, treatment-1, baseline-2…) so a change in the target or the environment hits both.

## Record per run

Model, date, tokens, wall time, tool calls if available, the posts.log line count (or the diff of a code copy), anything the run created outside its folder (a queued task, a ticket, a message, a scratch file in `/tmp` — withdraw or remove it and count it as a side effect), and anything the agent says it couldn't do.

Check writes outside the folder in the run's tool log, every path it wrote to and every shell command that names a path outside its folder, and on disk, with a search for files changed outside the folder since the run started. Runs don't always report their own scratch files, and the agents a run starts report them to the run, if at all.
