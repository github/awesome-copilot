// Single source of truth for the agent id used inside this frontend's
// CopilotKit registry (`runtime.agents` key, `CopilotChat.agentId`,
// `useRenderTool`/`useHumanInTheLoop` agentId). CopilotKit hooks that don't
// receive an explicit agentId typically resolve against the literal string
// "default" — so we register the runtime agent under that same key to avoid
// having to thread a custom id through every hook call site. Confirm this
// default is still current for your installed version.
//
// The Foundry hosted agent's OWN identity (hosted/responses/agent.py AGENT_NAME,
// hosted/responses/agent.yaml, backend/bridge_app.py) is a SEPARATE constant
// (e.g. "my-hosted-agent") — the two identifiers do not have to match.
export const AGENT_NAME = "default";
