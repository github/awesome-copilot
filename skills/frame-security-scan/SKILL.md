---
name: frame-security-scan
description: Scan code (Python, JavaScript/TypeScript, Java, C#, C/C++) for security vulnerabilities with the open-source Frame CLI or its MCP server, triage the findings, generate and verify fixes, and re-scan. Use when the user asks to security-scan a repo or file, review taint or injection findings, or fix scan results.
license: Apache-2.0
---

Use this skill when the user wants a security scan of source code with Frame (github.com/lambdasec/frame), help reading the results, or fixes for the findings. Do not use it for general code review, dependency audits, or scanning code the user does not have the right to scan.

Frame is a command-line tool. The scan steps run locally in the user's shell; run them when the user asks and show the output. Ask first before any step that sends code to a network endpoint (the optional AI layer) or changes files (`frame fix --in-place`).

If the `frame` MCP server is connected (tools named `scan`, `verify`, `fix`, `solve` and so on), you can call those tools instead of the shell commands below. They take the same options and return the same JSON. The same rules apply: ask before `ai=true`, `fix` with `in_place=true`, or `exploit`.

## 1. Check that Frame is installed

Check whether Frame is already available:

```bash
frame --version
frame scan --help
```

If `frame` is not found, tell the user it is not installed. It is on PyPI as `frame-security`; the install command from the README is:

```bash
pip install "frame-security[scan]"
```

Show the user that command and let them run it, or run it only after they agree. Do not clone repositories or run anything from an unpinned source. Continue once Frame is installed.

## 2. Run a scan

```bash
frame scan app.py                          # one file
frame scan src/                            # a directory (every supported source file)
frame scan src/ -f json -o findings.json   # machine-readable, for later steps
```

Useful flags (confirmed in `frame scan --help`, Frame 1.0.0): `--min-severity {critical,high,medium,low,info}`, `--fail-on {critical,high,medium,low,any,none}` (default `high`, sets the exit code), `-f {text,json,sarif}`, `-o FILE`, `--no-verify` (faster, may add false positives), `--timeout MS`, `-v`, `--changed [REF]` (only files changed since REF), `--baseline FILE` and `--write-baseline FILE` (report only findings that are not in a saved baseline).

Languages: the symbolic frontends cover python, javascript, typescript, java, c, cpp and csharp; each file is analysed in the language its extension names, and `-l` narrows a directory scan. Other languages (for example php, ruby, go) get only the LLM detector under `--ai`, so say that if the user asks.

## 3. Optional AI layer

`--ai` adds LLM detection and LLM triage on top of the symbolic scan. `--llm-detect` and `--llm-triage` enable each half separately. It needs an OpenAI-compatible endpoint, set through environment variables from the README:

```bash
export FRAME_LLM_BASE_URL=http://localhost:8080/v1   # your endpoint
export FRAME_LLM_API_KEY=                            # empty for local servers
export FRAME_LLM_MODEL=<model name your endpoint serves>
export FRAME_LLM_REPO_ROOT=/path/to/repo             # lets it read other files in the repo
frame scan src/ --ai -f json -o findings.json
```

Before enabling it, tell the user that with a hosted endpoint, code snippets leave the machine, and get their agreement. A server running on their own machine keeps the code local. `--model` overrides `FRAME_LLM_MODEL` for one run.

## 4. Read the findings

Each finding has a type, severity, CWE ID (`cwe_id`), location (file, line, column), the function, the source variable, the sink type, and a confidence value. Report these as given. Do not invent severity or exploitability.

Separate the two tiers when you summarize:

- Symbolic findings: the `source` is a real variable name from the code (for example `u`). The README says these are reported only when the taint flow is provably reachable.
- LLM findings: the `source` is `llm_detect` or `llm_verified` (confirmed in the Frame source). `llm_verified` means the model's finding matched Frame's own sink model. `llm_detect` is a model opinion that has not been checked. Treat both as leads to read, not as proof.

## 5. Triage

Open each finding's location and read the code. Use `references/triage-checklist.md`. For every finding, tell the user one of: confirmed, likely false positive (with the reason, such as the value is validated or never reaches the sink), or needs the user's judgement. Never mark something safe only because the scanner's confidence is low.

## 6. Fix

```bash
frame fix src/ --guidance findings.json --diff
```

`--guidance` takes the findings JSON (a file path, or `-` for stdin). By default `frame fix` prints a unified diff and re-scans the patched code to check that the finding is gone; `--no-verify` turns that check off. Show the diff and read it yourself. Only add `--in-place` after the user agrees to have files changed, and make sure their work is committed or backed up first. `frame fix` needs the same FRAME_LLM_* endpoint.

## 7. Re-scan to confirm

```bash
frame scan src/ -f json -o findings-after.json
```

Compare with the earlier file. Report which findings are gone, which remain, and any new ones. `frame verify findings.json -f json` does this for you: it re-scans the files behind each earlier finding and marks it fixed, present, suppressed, uncertain or unverifiable. Run the project's tests if it has them, since a patch can close a finding and still break behavior.

## Other ways to run Frame

Mention these only when they fit what the user is doing:

- MCP server, so any MCP client can call Frame as tools: `claude mcp add frame -- uvx frame-mcp` (Claude Code), or `uvx frame-mcp` in other clients. Source: github.com/lambdasec/frame-mcp.
- GitHub Action that uploads SARIF to code scanning: `uses: lambdasec/frame-action@v1`.
- pre-commit hook: `repo: https://github.com/lambdasec/frame`, `rev: v1.0.0`, hook `id: frame`.

## Benchmarks

Only cite numbers from the README, with their caveats. Example: on the Endor Labs corpus (193 vulnerabilities in 5 apps) the README gives Frame's full mode 0.67 recall at 0.51 precision, against 0.52 and 0.40 for Semgrep; the README also says that benchmark has caveats and the numbers use specific open models. Do not promise the user's code will get similar results.

## Limits

Frame can miss vulnerabilities and can report false ones. A clean scan is not proof of safety. Say this in your summary.
