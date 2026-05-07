---
name: async-profiler
description: 'Install, run, and analyze async-profiler for Java — low-overhead sampling profiler producing flamegraphs, JFR recordings, and allocation profiles. Use for: "install async-profiler", "set up Java profiling", "Failed to open perf_events", "what JVM flags for profiling", "capture a flamegraph", "profile CPU/memory/allocations/lock contention", "profile my Spring Boot app", "generate a JFR recording", "heap keeps growing", "what does this flamegraph mean", "how do I read a flamegraph", "interpret profiling results", "open a .jfr file", "what''s causing my CPU hotspot", "wide frame in my profile", "I see a lot of GC / Hibernate / park in my profile". Use this skill any time a Java developer mentions profiling, flamegraphs, async-profiler, JFR, or wants to understand JVM performance.'
compatibility: Requires Python 3.7+ for the analyze_collapsed.py script.
---

# async-profiler

async-profiler is a production-safe, low-overhead sampling profiler for Java
that avoids the safepoint bias of standard JVM profilers. It can capture CPU
time, heap allocations, wall-clock time, and lock contention, and produce
interactive flamegraphs, JFR recordings, and collapsed stack traces.

## Installing this skill

### IntelliJ IDEA (Junie or GitHub Copilot)

Skills live in a `.claude/skills/`, `.agents/skills/`, or `.github/skills/`
directory, either in your project repo or in your home directory.

**Project-level — recommended for teams** (commit so everyone gets it):
```bash
# From your project root:
mkdir -p .github/skills
cd .github/skills
unzip /path/to/async-profiler.skill
git add async-profiler
git commit -m "Add async-profiler skill"
```

**Global — personal use across all projects:**
```bash
mkdir -p ~/.claude/skills
cd ~/.claude/skills
unzip /path/to/async-profiler.skill
```

> **Note for GitHub Copilot users:** There is a known issue where the Copilot
> JetBrains plugin does not reliably pick up skills from the global `~/.copilot/skills`
> directory. Use the project-level `.github/skills/` location to be safe.

Alternatively, install the **Agent Skills Manager** plugin from the JetBrains
Marketplace (*Settings → Plugins → Marketplace* → "Agent Skills Manager") for
a UI that installs skills without unzipping manually.

---

## Using this skill in IntelliJ IDEA

### With Junie (JetBrains AI)

Junie is JetBrains' native coding agent, available in the AI Chat panel.

1. Open the AI Chat panel (*View → Tool Windows → AI Chat*, or the chat icon
   in the right toolbar)
2. In the agent dropdown at the top of the chat, select **Junie**
3. Choose a mode:
   - **Code mode** — Junie can run terminal commands, write files, and execute
     the profiling scripts directly. Use this when you want it to actually run
     `scripts/install.sh` or `scripts/run_profile.sh` for you.
   - **Ask mode** — read-only; Junie analyzes and explains but won't touch
     files. Use this when you want help interpreting a flamegraph or JFR file.
4. Just ask naturally — Junie loads the skill automatically when your question
   matches the description. You don't need to invoke it by name.

Example prompts that will trigger this skill in Junie:
- *"My Spring Boot app is using too much CPU. Help me capture a flamegraph."*
- *"I have this JFR file — open it and tell me what's slow."*
- *"Install async-profiler on this machine and set up the JVM flags."*

In Code mode, Junie will run `scripts/install.sh`, execute `scripts/run_profile.sh`
with the right flags, and then walk you through the results — all without
leaving IntelliJ.

### With GitHub Copilot in IntelliJ

1. Enable agent mode: *Settings → GitHub Copilot → Chat → Agent* → turn on
   **Agent mode** and **Agent Skills**
2. Open the Copilot Chat panel and make sure the mode selector shows **Agent**
3. Ask naturally — Copilot loads the skill when your prompt matches

Example prompts:
- *"Profile my running Java app and show me where the CPU is going."*
- *"Analyze this collapsed stack file and tell me what's allocating the most."*

GitHub Copilot's agent mode can also run the bundled scripts on your behalf —
it will propose the terminal command and ask for confirmation before executing.

### GitHub Copilot CLI

```bash
# Copilot CLI
mkdir -p ~/.copilot/skills
cd ~/.copilot/skills
unzip /path/to/async-profiler.skill

# Or, if your version uses ~/.agents/skills/:
mkdir -p ~/.agents/skills
cd ~/.agents/skills
unzip /path/to/async-profiler.skill
```

Run `/skills list` to confirm it loaded. Then just ask naturally in the terminal.

---

## Bundled scripts

This skill includes four ready-to-run scripts in `scripts/`:

| Script | What it does |
|---|---|
| `scripts/install.sh` | Auto-detects platform, downloads the right binary, verifies install |
| `scripts/run_profile.sh` | Wraps `asprof` with defaults, timestamps output, prints opening instructions |
| `scripts/collect.sh` | Agent-friendly background collection: start all-event profiling, do other work, then stop and get all flamegraphs |
| `scripts/analyze_collapsed.py` | Ranked self-time / inclusive-time table for `.collapsed` files, with filters |

Always offer to run these scripts on the user's behalf when relevant.

`scripts/_asprof_lib.sh` is an internal shared helper sourced by the profiling wrappers so async-profiler discovery and versioned-install lookup stay consistent across `run_profile.sh` and `collect.sh`.

## How to use this skill

This skill keeps detailed guidance in `references/` so the root `SKILL.md`
stays focused and loads quickly. Read only the guide that matches the user's
current need:

| Situation | Read |
|---|---|
| User needs to install or configure async-profiler, or is hitting setup errors | `references/setup.md` |
| User wants to run a profiling session (capture flamegraph, JFR, etc.) | `references/profile.md` |
| User has profiling output and wants to understand or interpret it | `references/analyze.md` |

**When the conversation spans multiple phases** (e.g., the user just ran a
profile and now wants to understand the output), read whichever guide is
most relevant to the current question. If the user needs both setup *and*
profiling guidance in one message, read `references/setup.md` first and
summarize the setup steps before moving to `references/profile.md`.

Read the relevant reference now before responding.
