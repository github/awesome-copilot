---
name: connector-sandbox
description: 'Open a named connector from My MCPs in the Azure Connector Namespace Sandbox. Use when the user asks to open, test, try, or debug an MCP connector in Sandbox or the MCP playground.'
---

# Connector Sandbox

Open a connector already listed under **My MCPs** in the current Connector Namespace.

1. Inspect the `connector-namespaces` canvas capabilities.
2. Open the canvas if no instance is available.
3. Invoke its `open_sandbox` action with the connector name or ID in `server`.
4. If the result is `ambiguous`, ask the user to choose from `matches`.
5. If the result is `not_found_in_my_mcps`, show the returned `available` connectors.

Use the canvas action instead of constructing or opening the URL directly. It uses the saved namespace and only opens connectors already present in **My MCPs**.
