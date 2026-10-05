# Batch Files: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Variables

### Environment Variables

```bat
set _MY_VAR=Hello World
echo %_MY_VAR%
set _MY_VAR=
```

- `set` with no arguments lists all variables
- `set _PREFIX` lists variables starting with `_PREFIX`
- No spaces around `=` — `set name = val` sets variable `"name "` to `" val"`

### Special Variables

| Variable | Value |
|----------|-------|
| `%CD%` | Current directory |
| `%DATE%` | System date (locale-dependent) |
| `%TIME%` | System time HH:MM:SS.mm |
| `%RANDOM%` | Pseudorandom number 0–32767 |
| `%ERRORLEVEL%` | Exit code of last command |
| `%USERNAME%` | Current user name |
| `%USERPROFILE%` | Current user profile path |
| `%TEMP%` / `%TMP%` | Temporary file directory |
| `%PATHEXT%` | Executable extensions list |
| `%COMSPEC%` | Path to cmd.exe |

### Scoping with SETLOCAL / ENDLOCAL

```bat
setlocal
set _LOCAL_VAR=scoped value
endlocal
REM _LOCAL_VAR is no longer defined here
```

To return a value from a scoped block:

```bat
endlocal & set _RESULT=%_LOCAL_VAR%
```

### Delayed Expansion

Variables inside parenthesized blocks are expanded at parse time. Use delayed expansion for runtime evaluation:

```bat
setlocal EnableDelayedExpansion
set _COUNT=0
for /l %%i in (1,1,5) do (
    set /a _COUNT+=1
    echo !_COUNT!
)
endlocal
```

- `!VAR!` expands at execution time (delayed)
- `%VAR%` expands at parse time (immediate)

## Cross-Platform and Extended Tools

When batch scripting reaches its limits, these tools extend cmd.exe capabilities:

| Tool | Purpose |
|------|---------|
| **Cygwin** | Full POSIX environment on Windows (grep, sed, awk, ssh) |
| **MSYS2** | Lightweight Unix tools and package manager (pacman) |
| **WSL** | Windows Subsystem for Linux — run native Linux binaries |
| **GnuWin32** | Individual GNU utilities as native Windows executables |
| **PowerShell** | Modern Windows scripting with .NET integration |

Use batch when you need: fast startup, simple file operations, PATH-based CLI tools, or Task Scheduler integration. Consider PowerShell or WSL for complex data processing, REST APIs, or object-oriented scripting.
