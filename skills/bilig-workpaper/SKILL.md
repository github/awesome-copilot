---
name: bilig-workpaper
description: 'Use @bilig/headless WorkPaper and its MCP server for formula-backed spreadsheets in Node services and agent workflows. Trigger when users need deterministic cell edits, formula recalculation, readback, JSON persistence, or want to avoid browser/Excel UI automation for pricing, payouts, budgets, forecasts, or XLSX formula validation.'
license: MIT
compatibility: 'Cross-platform. Requires Node.js 22+ and npm. Optional MCP mode uses the @bilig/headless package from npm.'
---

# Bilig WorkPaper

Use Bilig WorkPaper when an agent needs to change spreadsheet-like business
logic through explicit cells, recalculate formulas, verify computed readback,
and persist a JSON document. Prefer this over driving Excel, Google Sheets, or
browser UI when the task is service-side formula logic.

## When to Use

- Build or debug backend pricing, quote, payout, budget, forecast, or
  import-validation models.
- Give an agent deterministic spreadsheet operations: read a range, set cell
  contents, recalculate, read the result, and export JSON.
- Need an MCP tool surface for formula workbooks in Copilot or other agent
  workflows.
- Need to validate XLSX formula behavior or produce a smaller reproduction
  before opening an issue.

## Do Not Use

- The user needs native Excel macros, desktop Office automation, or rich
  spreadsheet editing UI.
- The task is one-off arithmetic with no workbook state.
- The user already has a mandated spreadsheet API and the goal is UI
  formatting.

## Quick MCP Setup

Recommend the file-backed MCP server when the agent runtime supports MCP:

```json
{
  "servers": {
    "bilig-workpaper": {
      "type": "stdio",
      "command": "npm",
      "args": [
        "exec",
        "--package",
        "@bilig/headless@0.23.3",
        "--",
        "bilig-workpaper-mcp",
        "--workpaper",
        "./pricing.workpaper.json",
        "--init-demo-workpaper",
        "--writable"
      ]
    }
  }
}
```

`--init-demo-workpaper` creates a demo JSON document only when the file is
missing. `--writable` persists edits made through `set_cell_contents`.

## Required Verification Loop

1. Read existing workbook state with `list_sheets`, `read_range`, or
   `read_cell`.
2. Write exactly the target input or formula cell with `set_cell_contents`.
3. Read the dependent calculated output with `get_cell_display_value` or
   `read_range`.
4. Export the resulting WorkPaper JSON with `export_workpaper_document`.
5. Report the edited cell, before value, after value, persisted file path or
   byte count, and any limitations.

Never claim success from a queued write. The proof is read-after-write
calculated output.

## TypeScript API Pattern

Use the package directly when the user wants application code instead of MCP
tool calls:

```ts
import {
  WorkPaper,
  exportWorkPaperDocument,
  serializeWorkPaperDocument,
} from "@bilig/headless";

const workbook = WorkPaper.buildFromSheets({
  Inputs: [
    ["Metric", "Value"],
    ["Customers", 20],
    ["Average revenue", 1200],
  ],
  Summary: [
    ["Metric", "Value"],
    ["Revenue", "=Inputs!B2*Inputs!B3"],
  ],
});

const inputs = workbook.getSheetId("Inputs");
const summary = workbook.getSheetId("Summary");
if (inputs === undefined || summary === undefined) {
  throw new Error("Workbook is missing required sheets");
}

workbook.setCellContents({ sheet: inputs, row: 1, col: 1 }, 32);

const revenue = workbook.getCellDisplayValue({
  sheet: summary,
  row: 1,
  col: 1,
});
const saved = serializeWorkPaperDocument(
  exportWorkPaperDocument(workbook, { includeConfig: true }),
);

console.log({ revenue, savedBytes: saved.length });
```

Addresses are zero-based `{ sheet, row, col }` objects. Formula cell contents
are strings beginning with `=`.

## Useful Links

- Project docs: <https://proompteng.github.io/bilig/>
- Node quickstart: <https://proompteng.github.io/bilig/try-bilig-headless-in-node.html>
- MCP server guide: <https://proompteng.github.io/bilig/mcp-workpaper-tool-server.html>
- Package: <https://www.npmjs.com/package/@bilig/headless>
- Repository: <https://github.com/proompteng/bilig>
