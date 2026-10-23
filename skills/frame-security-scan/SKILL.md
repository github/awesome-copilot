---
name: frame-security-scan
description: Scan Python code for security vulnerabilities with the open-source Frame CLI, triage the findings, generate and verify fixes, and re-scan. Use when the user asks to security-scan a repo or file, review taint or injection findings, or fix scan results.
license: Apache-2.0
---

Use this skill when the user wants a security scan of source code with Frame (github.com/lambdasec/frame), help reading the results, or fixes for the findings. Do not use it for general code review, dependency audits, or scanning code the user does not have the right to scan.

Frame is a command-line tool. The scan steps run locally in the user's shell; run them when the user asks and show the output. Ask first before any step that sends code to a network endpoint (the optional AI layer) or changes files (`frame fix --in-place`).

## 1. Check that Frame is installed

Frame is a source install, so this skill does not install it. Check whether it is already available:

```bash
frame --version
frame scan --help
```

If `frame` is not found, tell the user it is not installed and point them to the install steps in the project README (github.com/lambdasec/frame). Do not clone repositories or run install commands on the user's behalf, and do not run anything from an unpinned source. Continue once the user confirms it is installed.

## 2. Run a scan

```bash
frame scan app.py                          # one file
frame scan src/ --pattern "**/*.py"        # a directory
frame scan src/ -f json -o findings.json   # machine-readable, for later steps
```

Useful flags (confirmed in `frame scan --help`): `--min-severity {critical,high,medium,low,info}`, `--fail-on {critical,high,medium,low,any,none}` (default `high`, sets the exit code), `-f {text,json,sarif}`, `-o FILE`, `--no-verify` (faster, may add false positives), `--timeout MS`, `-v`. The `--language` option lists only `python` in this version's help, so say so if the user asks about other languages and check the README for what it claims.

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

Compare with the earlier file. Report which findings are gone, which remain, and any new ones. Run the project's tests if it has them, since a patch can close a finding and still break behavior.

## Benchmarks

Only cite numbers from the README, with their caveats. Example: on the Endor Labs corpus (193 vulnerabilities in 5 apps) the README gives Frame's full mode 0.67 recall at 0.51 precision, against 0.52 and 0.40 for Semgrep; the README also says that benchmark has caveats and the numbers use specific open models. Do not promise the user's code will get similar results.

## Limits

Frame can miss vulnerabilities and can report false ones. A clean scan is not proof of safety. Say this in your summary.
