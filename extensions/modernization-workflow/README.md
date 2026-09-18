# Modernization Workflow canvas

An interactive GitHub Copilot CLI canvas that visualizes the documented
Modernize CLI lifecycle:

1. **Assess** the application and generate evidence.
2. **Plan** a reviewable modernization strategy and task list.
3. **Execute** transformations with build, security, and result validation.

The canvas detects .NET, Java, and C++ repository signals, generates commands
from the current workflow configuration, and refreshes progress from artifacts
under `.github/modernize/`.

## Canvas ID

`modernization-workflow`

## Agent actions

- `get_workflow_state`
- `configure_workflow`
- `set_step_status`
- `refresh_from_artifacts`

Workflow state is stored in `.github/modernize/canvas-<stateId>.json` in the
application repository so progress survives canvas and CLI restarts.
