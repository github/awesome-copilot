---
name: optimize-simplicite-logs
description: capability to parse Simplicité logs from a raw `.txt` file, filter fields to reduce noise, and output the result as structured JSON.
---

# Optimize Simplicite Logs

This skill provides the capability to parse Simplicité logs from a raw `.txt` file, filter fields to reduce noise, and output the result as structured JSON. This is critical for optimizing AI context size (saving ~56% of tokens) and providing structured, predictable data for troubleshooting.

## When to Use This Skill

Use this skill when you need to:
- Analyze user-provided Simplicité log files in `.txt` format.
- Avoid ingesting massive raw log files into your context window.
- Extract structured fields (like `timestamp`, `level`, `body`) from verbose multi-line log output.

**IMPORTANT:** Instead of directly reading a raw `.txt` log file provided by the user using file read tools, you **must** use one of the log converter scripts (PowerShell or Python) to parse the file into a JSON format first, optionally extracting only the fields needed.

## Prerequisites

- Access to either the PowerShell script (`/scripts/SimpliciteLog2Json.ps1`) or the Python script (`/scripts/simplicite-log2json.py`).

## Core Capabilities

### 1. Context Optimization
Reduces the tokens consumed by large Simplicité logs by extracting only relevant log fields (e.g. `body`, `timestamp`, `level`) and discarding non-relevant structural log data (like `app`, `endpoint`, `contextPath`).

### 2. Multi-line Support
Properly captures stack traces and multiline errors inside the `body` field of the JSON structure, which a simple text search might miss.

### 3. Stdout Support
If no output path is provided for the JSON file (e.g. omitting `--output` or `-Output`), the parsed JSON will be printed directly to stdout, allowing you to pipe the output to other tools.

## Output Summary

After processing, the tool prints a summary to stderr (or console):
```
Processed: 123 entries, Skipped: 2 entries
```

## Usage Examples

### Example 1: Python Version (Recommended)
Convert a log file to JSON, keeping only the most important fields:
```sh
python /absolute/path/to/skills/optimize-simplicite-logs/scripts/simplicite-log2json.py <input.txt> --include timestamp,level,body --output <output.json>
```

### Example 2: PowerShell Version
```powershell
/python /absolute/path/to/skills/optimize-simplicite-logs/scripts/SimpliciteLog2Json.ps1 -InputPath "<input.txt>" -Output "<output.json>" -Include "body,timestamp,level"
```

After generating the `<output.json>`, you can safely read the resulting file to perform your analysis.

## Guidelines

1. **Always Convert First:** Never directly read `.txt` log files from Simplicité using standard text reading tools. Always convert them to JSON using the available scripts.
2. **Filter Fields:** Use `--include` (Python) or `-Include` (PowerShell) to restrict fields to what is absolutely necessary to diagnose the issue (usually `timestamp,level,body`).
3. **Available Fields:** The fields you can filter include: `timestamp`, `app`, `level`, `endpoint`, `contextPath`, `event`, `user`, `class`, `function`, `rowId`, `body`.

## Common Patterns

### Pattern: Fast Contextual Troubleshooting
```sh
# 1. Run the script to generate a minified JSON output in the current directory
python /absolute/path/to/skills/optimize-simplicite-logs/scripts/simplicite-log2json.py logs.txt --include timestamp,level,body --output logs_minified.json

# 2. Then read logs_minified.json to understand the context.
```

## Limitations

- The parser depends on a fixed regex pattern that matches the standard Simplicité log output. If the log format has been heavily customized, parsing might fail or degrade.
