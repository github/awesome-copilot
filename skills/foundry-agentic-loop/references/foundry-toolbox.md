# Foundry toolbox

Reference for the `foundry-agentic-loop` skill: how a solution's skills, MCP tools and grounding reach its hosted agents through one Foundry toolbox. `microsoft-foundry` owns the command surface and tool types (its toolbox guide), [azd-layout.md](azd-layout.md#azureyaml) owns the declarative services, and [copilot-sdk-with-toolbox.py](copilot-sdk-with-toolbox.py) is the reference consumer.

## Model

- A **toolbox** bundles project connections, skills and tools behind one MCP endpoint. Versions are immutable: every change creates one, and only the first becomes the default automatically.
- A **skill** is a `SKILL.md` (front matter with `name` and `description`, then Markdown instructions) versioned in the project. Skills are in preview.
- The **consumer** URL `<project>/toolboxes/<name>/mcp?api-version=v1` always serves the default version, so promoting a toolbox version reaches agents without a redeploy. The **developer** URL `.../toolboxes/<name>/versions/<v>/mcp?api-version=v1` pins one version.
- Attached skills arrive as MCP resources (`skill://<name>/SKILL.md`) that follow the skill's default version unless the toolbox pins `version`. The agent writes them under the temp directory per request, because hosted containers are read-only except `/tmp`; the agent image never copies `skills/`.

## Author

1. Write each skill at `skills/<name>/SKILL.md`; its front matter `name` matches the folder.
2. Build or reuse each MCP server (FastMCP over streamable HTTP, generated with `python-mcp-server-generator` from [build-skills-catalog.md](build-skills-catalog.md)). Reach servers through connections, never hard-coded URLs or secrets. Expose Foundry IQ grounding through the toolbox too ([foundry-iq-grounding.md](foundry-iq-grounding.md)).
3. Compose one toolbox per capability set: `skills[]`, `connections[]` (connections must already exist), and connectionless built-ins such as `web_search` or `code_interpreter` under `tools[]`. At most one tool may be unnamed: name built-ins with `name` and MCP tools with `server_label`. Before exceeding about five tools, add `toolbox_search_preview`, which counts as the unnamed tool.
4. Agents that load skills run on the Copilot SDK and consume the toolbox like the reference agent. MAF agents follow microsoft-foundry's toolbox-in-hosted-agent guidance.

## Publish

- **SDD:** declare `azure.ai.skill`, `azure.ai.connection` and `azure.ai.toolbox` services ([azd-layout.md](azd-layout.md#azureyaml)). Deploy publishes them in `uses` order and writes `TOOLBOX_<NAME>_MCP_ENDPOINT`; map it to the agent's `TOOLBOX_ENDPOINT`. Without approval to upgrade older extensions, use the ordered `postprovision` fallback in the same file.
- **Rapid:** publish with the CLI against the selected project (`azd ai project set <project-endpoint>`):

  ```bash
  azd ai skill create claims-policy --file skills/claims-policy/SKILL.md --no-prompt   # later versions: azd ai skill update
  azd ai toolbox create claims-tools --from-file toolbox.yaml --no-prompt              # writes TOOLBOX_CLAIMS_TOOLS_MCP_ENDPOINT
  ```

  ```yaml
  # toolbox.yaml
  description: Claims tools
  skills:
    - name: claims-policy          # omit version to follow the skill's default
  connections:
    - name: claims-mcp-conn        # RemoteTool (MCP)
    - name: policy-search          # CognitiveSearch needs index
      index: policies
  tools:
    - type: web_search
      name: web
  ```

- **Change:** `azd ai toolbox connection add|remove` and `azd ai toolbox skill add|remove` each create a version without changing the default; promote or roll back with `azd ai toolbox publish <name> <version>`. Connectionless built-ins can't be added later: recreate the toolbox with the full set. `azd ai skill update <name> --set-default-version <v>` rolls a skill without uploading content.
- **Extensions:** `azure.ai.toolboxes`, `azure.ai.skills` and `azure.ai.connections`, at the minimum versions in [azd-layout.md](azd-layout.md#azureyaml).

## Consume

Follow [copilot-sdk-foundry.md](copilot-sdk-foundry.md) and the reference agent:

- Keep the URL in `TOOLBOX_ENDPOINT`, never a `FOUNDRY_*` name, which the platform overwrites. If the written URL pins `/versions/<v>/`, redeploy the agents that use the toolbox after it changes; record which form each agent uses.
- Send a token for `https://ai.azure.com/.default` on every request (cognitiveservices tokens get 401), `Foundry-Features: Toolboxes=V1Preview`, and the caller's `x-agent-foundry-call-id` when present.
- `initialize` is optional; `prompts/list` and `ping` are unsupported. MCP-sourced tools are named `<server_label>___<tool>`.
- The proxy does not enforce `require_approval`: approve tools in the agent's permission handler.
- A `-32006` error wrapping `CONSENT_REQUIRED` carries a per-user consent URL for an OAuth connection: surface it to the caller instead of retrying.
- An HTTP 403 from the toolbox means the caller lacks Foundry User on the project; a `-32007` error wrapping 403 comes from the MCP server's own auth.

## Verify

- `tools/list` returns the expected tools and `resources/list` the expected `skill://` entries.
- Hosted logs show skills written under the temp directory, and answers show each skill applied.
- Record the toolbox name, its published default version and the URL form in the root `README.md` (rapid) or `docs/implementation.md` (SDD).

Sources: microsoft-foundry toolbox and skills guides; [Toolbox](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/toolbox); [Skills](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/skills).
