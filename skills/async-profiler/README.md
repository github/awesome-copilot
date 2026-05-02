# async-profiler

Install, run, and analyze async-profiler for Java — a low-overhead sampling profiler producing flamegraphs, JFR recordings, and allocation profiles.

## What it does

- Installs async-profiler automatically for macOS or Linux
- Captures CPU time, heap allocations, wall-clock time, and lock contention
- Produces interactive flamegraphs, JFR recordings, and collapsed stack traces
- Interprets profiling output: identifies hotspots, GC pressure, lock contention, N+1 Hibernate patterns

## Compatibility

Requires Python 3.7+ for the analysis script. async-profiler works on macOS and Linux with a running JVM process.

## Installation

**GitHub Copilot CLI:**

Point Copilot at the skill directory from within a session:
```
/skills add /path/to/async-profiler
```

Or copy manually to your personal skills directory (`~/.copilot/skills/` or `~/.agents/skills/` depending on your version):
```bash
cp -r async-profiler ~/.copilot/skills/
# or
cp -r async-profiler ~/.agents/skills/
```

**Claude Code:**
```bash
cp -r async-profiler ~/.claude/skills/async-profiler
```

**OpenCode:**
```bash
cp -r async-profiler ~/.config/opencode/skills/async-profiler
```

## Trigger phrases

- "install async-profiler"
- "capture a flamegraph"
- "profile my Spring Boot app"
- "heap keeps growing"
- "what does this flamegraph mean"
- "I see a lot of GC in my profile"

## Bundled scripts

| Script | Purpose |
|---|---|
| `scripts/install.sh` | Auto-detect platform, download and verify async-profiler |
| `scripts/run_profile.sh` | Wrap `asprof` with defaults, timestamp output |
| `scripts/collect.sh` | Background collection: start all-event profiling, stop and retrieve flamegraphs |
| `scripts/analyze_collapsed.py` | Ranked self-time/inclusive-time table for `.collapsed` files |

## Directory structure

```
async-profiler/
├── SKILL.md          # Entry point — routes to focused reference guides
├── README.md         # Human-readable overview and installation help
├── references/
│   ├── setup.md      # Installation and configuration
│   ├── profile.md    # Running profiling sessions
│   └── analyze.md    # Interpreting profiling output
└── scripts/          # Bundled scripts
```
