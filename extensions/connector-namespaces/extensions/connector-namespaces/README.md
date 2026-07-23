# MCP Connectors

A GitHub Copilot app canvas extension for discovering and connecting hosted MCP
servers from [Azure Connector Namespace](https://learn.microsoft.com/en-us/azure/connector-namespace/connector-namespace-overview).
It brings the Microsoft and partner connector catalog, guided browser sign-in,
and connected-server management into the Copilot side panel.

## Features

- **Connector catalog** - browse and search Microsoft and partner MCP servers
  available in your namespace.
- **Guided Azure setup** - sign in from the canvas, then choose a subscription
  and Connector Namespace.
- **Browser-based connection flow** - complete each connector's authentication
  or consent without leaving the setup experience.
- **My MCPs** - see which servers are connected and ready to add to Copilot.
- **Namespace playground** - open any connected server in the Connector
  Namespace playground with **Sandbox**.
- **Persistent namespace selection** - retain the selected namespace while Azure
  tokens remain in memory and sign-in is requested again after a restart.

## Install

Open the GitHub Copilot app, go to **Settings > Plugins**, search for
`connector-namespaces`, and select **Install**.

You can also open the
[MCP Connectors gallery page](https://awesome-copilot.github.com/extension/connector-namespaces/)
and select **Install in GitHub Copilot app**.

## Requirements

- Access to an Azure subscription with a Connector Namespace. If you do not
  have one, follow the
  [Connector Namespace creation guide](https://learn.microsoft.com/en-us/azure/connector-namespace/create-connector-namespace).
- Permission to view the namespace and create its connections and hosted MCP
  server configurations.
- A browser for Microsoft Entra sign-in and connector consent.

Connector Namespace is currently an Azure preview service and availability can
vary by region.

## Usage

1. Open the **MCP Connectors** canvas in the GitHub Copilot app.
2. Select **Sign in to Azure** and complete Microsoft Entra authentication in
   your browser.
3. Choose an Azure subscription and Connector Namespace.
4. Browse or search the catalog, then select **Connect** on an MCP server.
5. Complete the connector's sign-in or consent flow when prompted.
6. Confirm the server appears under **My MCPs**.
7. Restart the GitHub Copilot app so the new tools become available to the
   agent.

Use **Sandbox** on a connected server to inspect it in the Connector Namespace
playground. Use **Change namespace** to switch subscriptions or namespaces.

## Authentication and privacy

Azure sign-in and connector sign-in are separate:

- **Azure sign-in** lets the canvas discover and manage Connector Namespace
  resources. Access and refresh tokens remain in the extension process and are
  never written to extension files. Reloading the extension or restarting the
  app requires Azure sign-in again. The selected namespace coordinates are
  retained in
  `~/.copilot/extensions/connector-namespaces/artifacts/gateway-config.json` so
  the canvas can explain that the namespace is still linked and return directly
  to its connectors after sign-in.
- **Connector sign-in** grants an individual MCP server access to its backing
  service. The resulting connection is managed by Connector Namespace.

The canvas serves its interface from loopback only (`127.0.0.1`). Azure
management requests are restricted to `https://management.azure.com/`.
The gateway API key that lets Copilot reach a connected server is stored in the
user-scoped GitHub Copilot MCP configuration and sent only to that server's
configured HTTPS endpoint.

## License

[MIT](./LICENSE) © Microsoft Corporation.
