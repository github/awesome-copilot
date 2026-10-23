# Agentic Loop lessons

Verified lessons from building this workspace. Improve mode turns them into skill and workflow changes, only with approval.

## 2026-09-02 expense-assistant, SDD

Outcome: Deployed after two Verify rounds.

| Observation and evidence | Proposed skill change (file, section) | Expected benefit | Regression check | Status |
| --- | --- | --- | --- | --- |
| Verify r1 (wr_101): no `execute_tool` spans for `get_receipt`; the MCP server had no OpenTelemetry exporter. Fixed by configuring the exporter; trace rerun passed. | `references/observability.md`, MCP server | Saves one Verify round (measured once) | eval 11 | proposed |
| Deploy (wr_101): `TOOLBOX_ENDPOINT` missing in the hosted agent; mapped it in `azure.yaml` env and redeployed; smoke passed. | `references/azd-layout.md`, environment mapping | Avoids a failed deploy (estimate) | eval 26 | adopted |

## 2026-09-20 travel-desk, SDD

Outcome: Deployed after two Verify rounds.

| Observation and evidence | Proposed skill change (file, section) | Expected benefit | Regression check | Status |
| --- | --- | --- | --- | --- |
| Verify r1 (wr_117): MCP tool spans missing again in Application Insights; same missing exporter in the MCP server. Trace rerun passed after the fix. | `references/observability.md`, MCP server | Saves one Verify round (measured twice) | eval 11 | proposed |
| Implement (wr_117): the frontend dev server picked port 5174 because 5173 was busy; restarted on 5173. | none | — | — | rejected |
| Hosted checkpoint (wr_117): runtime skill load verified through the toolbox before backend work. | `references/hosted-integration-checkpoint.md` | Validated by wr_117 | eval 8 | validated |

## 2026-10-05 lease-review, SDD

Outcome: Blocked at Verify; user stopped the run.

| Observation and evidence | Proposed skill change (file, section) | Expected benefit | Regression check | Status |
| --- | --- | --- | --- | --- |
| Verify r1 (wr_123): Playwright timed out once on a cold Container Apps start; the rerun passed without changes. | none | — | — | proposed |
