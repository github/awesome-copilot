# Foundry hosted agent

Reference for the `foundry-agentic-loop` skill: runtime concerns for an agent hosted on Microsoft Foundry. Hosted agents should expose the **Responses API** by default; use invocations only when explicitly required for compatibility. `foundry-agentic-loop` decides *that* the agent is hosted and *which framework* it uses; this file holds the hosted-agent runtime detail. The reference agent is [`copilot-sdk-with-toolbox.py`](copilot-sdk-with-toolbox.py).

## Hosted-agent protocol

Default to the **Responses API** protocol for hosted agents. Responses exposes an OpenAI-compatible `/responses` endpoint, and the platform manages conversation history, streaming, and session lifecycle. Prefer it for new hosted agents and generated plans.

A tool-using agent streams each tool call as output items, because evaluators score only output items; never return a bare `TextResponse` from it. With `azure-ai-agentserver-responses` 2.2.0–2.3.0 (check the installed API first), the `@app.response_handler` of `ResponsesAgentServerHost()` returns an async generator that creates `ResponseEventStream(response_id=context.response_id, request=request)`, yields `emit_created()` and `emit_in_progress()`, then the events of `output_item_function_call(name, call_id, arguments)` and `output_item_function_call_output(call_id, output)` for each call, then those of `output_item_message(text)`, kept last so `output_text` stays the answer, and finally `emit_completed()`.

Use the **invocations** protocol only when the user explicitly requests it, when an existing deployed agent already depends on it, or when a required sample/runtime is not yet available through Responses. If invocations is selected, document the reason in `./docs/spec.md` (SDD) or the root `README.md` (rapid).

## Python dependency contract (`requirements.txt`)

Declare each agent's dependencies in `requirements.txt` or `pyproject.toml`. Resolve the latest stable compatible releases at implementation time and lock them; the table is the required intent for the choices already made. Pick one framework row per agent, following SKILL.md's framework rule.

| When | Package | Why |
| --- | --- | --- |
| Always | `azure-identity` | `DefaultAzureCredential`: managed identity hosted, `az login` locally |
| Always | `azure-ai-agentserver-responses` | Serves the Responses endpoint; its core exports host telemetry from `APPLICATIONINSIGHTS_CONNECTION_STRING` |
| Invocations only | `azure-ai-agentserver-invocations` | Only when invocations is explicitly selected |
| Agents that use runtime skills | `github-copilot-sdk[telemetry]` | Copilot runtime, BYOK provider and runtime telemetry; brings `httpx` for the toolbox bridge in [`copilot-sdk-with-toolbox.py`](copilot-sdk-with-toolbox.py) |
| Basic agents and explicit workflows | `agent-framework-foundry` (add `agent-framework-foundry-hosting` when hosting through MAF) | Microsoft Agent Framework subpackages, each pinned with `==`; never the `agent-framework` meta-package |
| Multi-file skills or skills outside a toolbox | `azure-ai-projects` | Skills API download (see microsoft-foundry); toolbox skills arrive as MCP resources instead |
| In-process OpenAI-client model calls | `opentelemetry-instrumentation-openai-v2` | Model spans the runtime doesn't emit |

Don't add a second global telemetry exporter next to the hosting adapter's ([observability.md](observability.md)). Don't add `azure-search-documents`: Foundry IQ grounding comes through the toolbox; add Search SDKs only for the direct-retrieval escape hatch in [`foundry-iq-grounding.md`](foundry-iq-grounding.md#escape-hatch-direct-in-code-retrieval).

Resolve versions against the index the build uses as well, because a mirror or proxy can lag the official index. Hashed locks keep only sha256, sha384 or sha512 hashes; pip rejects others ("Allowed hash algorithms for --hash are sha256, sha384, sha512").

## Local runs and code packaging

- `azd ai agent run` syncs with `uv sync --locked`. If it reports that `uv.lock` needs updating while `pyproject.toml` and the lock agree, a machine uv config (`/etc/uv/uv.toml`, `~/.config/uv/uv.toml` or `UV_INDEX*`, often a package feed proxy) is rewriting the index. Re-lock only for the local run, then restore the committed lock before deploying.
- Code deploy packages the agent's service folder using only its `.agentignore`; `.azdignore` is ignored. The defaults already exclude `.env*`, `.azure/`, `.git/`, `.venv/`, `__pycache__/` and `*.pyc`, so list only the extra non-runtime files: tests, evaluators, eval config and the Dockerfile.

## Copilot SDK compatibility

Generated code must match the latest stable `github-copilot-sdk`, not a stale example. At implementation time, resolve the latest stable release from the official index, install it, and inspect `CopilotClient.create_session`, `CopilotSession.send_and_wait`, the event data types and the async context-manager lifecycle before writing handlers. If the build's index lacks that release, lock the newest stable release it serves (never a pre-release) and record the gap. [copilot-sdk-foundry.md](copilot-sdk-foundry.md) lists what to record.

Compatibility checks belong to the generated application's implementation and CI, which run against its resolved lockfile; this skill bundles no SDK test suite. If companion-skill guidance conflicts with the installed package, follow the package API and report the defect upstream (issue or PR) instead of patching the third-party skill locally.

When reviewing or correcting SDK code, state the resolved version, the Python minimum (3.11 for v1.0.14–1.0.23; hosted agents keep 3.13), and the session-creation, prompt-send, event and lifecycle shapes, so the correction can be checked.

## Read-only container filesystem

Hosted containers are read-only except `/tmp`. Default every runtime write (skills, session state, generated files) under `tempfile.gettempdir()`; writing under the app directory crashes the first invocation. The reference agent writes skills to a per-turn temporary directory and moves Copilot session state under the temp directory only when HOME isn't writable.
