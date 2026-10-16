# Agent Radar

Agent Radar is a canvas extension for the GitHub Copilot app.
The canvas shows the Copilot agents that are active on this computer.
It also shows their sub-agents, their commands, and the destinations of their data.

![Agent Radar in demo mode](assets/preview.png)

## Features

- The canvas shows sessions from the Copilot app, the Copilot CLI, and VS Code.
- The layout has five columns: You, surface, sessions, sub-agents, and data destinations.
- Each line shows one data flow from an agent to a destination.
- A destination can be a model, a local resource, or a different tool or service.
- The group "Tools & services" can contain local tools and remote services.
- The name of an MCP destination is the name of the MCP server.
- The feed below the map shows the full command of each tool call.
- The token panel shows the tokens for each model. The active models are at the top.
- By default, the canvas shows only agents that work or wait for you.
- You can use the keyboard to select agents and destinations in the side panel.
- If the operating system is set to reduce motion, the canvas does not show animations.

## Requirements

- GitHub Copilot app with canvas support

## Usage

1. Install the plugin:

   ```bash
   copilot plugin install agent-radar@awesome-copilot
   ```

2. In the Copilot app, open **Canvases**.
3. Open **Agent Radar**.

## Canvas action

The canvas has one action, `snapshot`.
The action gives a JSON summary of the agents.
When `activeOnly` is `true`, the summary shows only agents that work or wait for you.
The default value of `activeOnly` is `true`.

```js
invoke_canvas_action({ instanceId: "radar-main", actionName: "snapshot", input: { activeOnly: true } })
```

## Demo mode

Add `?demo` to the canvas URL to show sample data.
In demo mode, the UI does not read local session data.
The preview image shows demo mode.

## Privacy

The extension reads only local files. The extension does not send requests to the network.

The extension reads these files:

- `$COPILOT_HOME/session-state/*/events.jsonl`, `workspace.yaml`, and the `inuse.*.lock` files.
- `$COPILOT_HOME/ide/*.lock`.
- For VS Code, VS Code Insiders, Cursor, and VSCodium:
  - `User/workspaceStorage/*/chatSessions/*` and `User/workspaceStorage/*/workspace.json`.
  - The `.code-workspace` file of a multi-root window, to find its folders.
  - `User/globalStorage/emptyWindowChatSessions/*`.

The default value of `$COPILOT_HOME` is `~/.copilot`.

The `snapshot` action gives session data to the agent that calls the action.
This data includes session names, folders, repositories, user prompts, and full commands.
The agent can send this data to its model.
Do not use the action if the sessions contain secrets.

The HTTP server listens only on `127.0.0.1`. The first port is 47800.
Each server start makes a new random token in the URL path.
The server does not accept a request without the token, or a request with a different `Host` or `Origin` header.
The UI does not load scripts or styles from external servers.

## Troubleshooting

- If the canvas shows "stale", reload the extensions and open the canvas again.
- If the extension has the status `failed`, read the extension log in the Copilot app.

## License

MIT. Refer to [LICENSE](LICENSE).
