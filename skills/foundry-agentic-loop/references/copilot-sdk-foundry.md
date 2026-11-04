# Copilot SDK with Foundry

Read only for Copilot SDK agents, SDK/identity troubleshooting, or the dependency-packaging fallback. Continue using Microsoft Agent Framework when the architecture selects it; this recipe does not change framework defaults.

**Recipe revision 3 (2026-10-19).** Configuration/signatures were source-checked against `github/copilot-sdk` **v1.0.14** and re-inspected on the installed packages below. The "v1.0.14" labels mark the first checked release, not an upper bound. This is not a claim that every SDK/runtime pair has passed a hosted deployment. Keep the project's approved compatible pins; record and validate its actual combination at the [hosted checkpoint](hosted-integration-checkpoint.md).

| Surface used by this recipe | 1.0.14 | 1.0.20 (installed check) | Later |
| --- | --- | --- | --- |
| `create_session(*, provider=..., mcp_servers=...)` keyword-only | yes | yes | inspect |
| `send_and_wait(prompt: str, *, request_headers=...)` | yes | yes | inspect |
| `ProviderConfig.bearer_token_provider` refresh callback | yes | yes | inspect |
| `MCPHTTPServerConfig.headers` static dict (no refresh callback) | yes | yes | inspect |
| `CopilotClient(telemetry=TelemetryConfig)` and `get_status().version` | yes | yes | inspect |
| `azure-ai-agentserver-responses` `ResponseEventStream` items ([hosted agent](foundry-hosted-agent.md#hosted-agent-protocol)) | 2.2.0 | 2.3.0 | inspect |

For an unlisted version, inspect these signatures before coding and record the result with the compatibility record.

## Compatibility record first

Before troubleshooting, record Python (retain **3.13**), `github-copilot-sdk`, Azure Identity, project/hosting-adapter versions, lockfile hash and the **running Copilot runtime version**. In v1.0.14, after client startup, `(await client.get_status()).version` reports that runtime; `importlib.metadata.version("github-copilot-sdk")` reports the Python package. Do not assume the developer shell's `copilot --version` is the deployed runtime.

Inspect installed signatures/types, particularly `CopilotClient.create_session`, `CopilotSession.send_and_wait`, `ProviderConfig` and the hosting request-context accessor. The v1.0.14 Python interface uses keyword arguments for `create_session`, a string prompt for `send_and_wait`, and `request_headers` for per-turn model headers. Older examples accepting config/message dictionaries are not interchangeable. The bearer-token callback surface is experimental in this release: check the runtime supports its protocol; never silently replace an unsupported refresh callback with a static token. Use the SDK-supported runtime distribution and pin the validated combination.

## Model configuration and token refresh

For the discovered OpenAI-compatible **`/openai/v1/`** base, use `type: "openai"` and `wire_api: "responses"`. Keep the Basic sample's actual deployment or the user's existing deployment; a model catalog name is not necessarily its deployment name. Do not mix this route with the native `type: "azure"` host-only recipe or with the hosted-agent Responses endpoint.

The following provider fragment uses v1.0.14 fields. `credential` must be the approved **deployed workload** async credential in hosted runs; select it through current `microsoft-foundry` guidance. `token_scope` comes from the verified endpoint contract (the documented Foundry path uses `https://ai.azure.com/.default`); verify the audience for a different Azure endpoint rather than assuming it.

```python
from azure.core.credentials_async import AsyncTokenCredential
from copilot.session import ProviderConfig, ProviderTokenArgs

def model_provider(
    base_url: str,
    token_scope: str,
    credential: AsyncTokenCredential,
) -> ProviderConfig:
    async def refresh_token(_request: ProviderTokenArgs) -> str:
        return (await credential.get_token(token_scope)).token

    return {
        "type": "openai",
        "base_url": base_url,
        "wire_api": "responses",
        "bearer_token_provider": refresh_token,
    }
```

The SDK requests a token before outbound provider calls; Azure Identity handles caching/renewal. Keep that credential alive for its owning client and close it on shutdown. Do not capture one startup token in `bearer_token`, `.env` or a long-lived Authorization header. Test another request after simulated expiry; no new deployment should be needed.

Create the session with the verified provider and deployment using an explicit least-privilege permission handler, not an unrestricted approval shortcut. Subscribe to errors and execution events before sending; `send_and_wait`/`session.idle` alone is not the hosted Responses success condition. Its timeout does not abort in-flight work: explicitly cancel/clean up the task-owned request through supported lifecycle APIs. Use the checkpoint's terminal-status and schema validation.

## Hosted caller-context forwarding

Use the current hosting adapter's request-context accessor; verify its installed API instead of guessing imports. For **container protocol 2.0.0**, the documented outbound caller-context header is **`x-agent-foundry-call-id`**. Forward its opaque value unchanged to the configured Foundry **model and toolbox** requests. The platform-generated **`x-agent-user-id` is local partitioning context and must not be forwarded outbound**. Do not copy all inbound headers, trust caller-supplied `x-client-*` as identity, or propagate incoming Authorization/cookies.

- Capture an allowlisted copy of context for each hosted request. Pass the call ID through `session.send_and_wait(prompt, request_headers=foundry_headers)` for the model request in v1.0.14. For adapters using provider `headers`, isolate the provider/session per request; never mutate a global header dictionary.
- Pass the same request's call ID to MCP `tools/list`, skill-loading and `tools/call` requests. Use the platform-aware toolbox client or a request-local MCP adapter that acquires/refreshes its own token for the toolbox audience. A Copilot model `bearer_token_provider` does **not** refresh MCP credentials.
- In v1.0.14, remote MCP configuration exposes `headers` as a static dictionary, not a token-refresh callback. Do not invent a callback field or keep a startup bearer token there indefinitely. Use a supported refreshing MCP transport, or a request-scoped connection with explicit token lifetime/reconnect handling; retain least-privilege tool approval.
- Bind SDK sessions, callbacks and MCP connections to the originating caller/turn. Capture request context before crossing async/process boundaries; callbacks may run outside the hosting context variable. Isolate concurrent sessions or serialize same-session turns so headers/results cannot cross requests.
- Only send platform context to the intended trusted Foundry endpoints, never arbitrary tool URLs or logs. Toolbox connections govern downstream credentials. For local-only tests, absent platform context can be legitimate; do not fabricate call IDs. If a deployed path requires context and it is absent, fail that probe explicitly.

Verify actual outbound header **presence and request association** with redacted instrumentation, including two concurrent requests and token renewal. Do not merely inspect configuration or use an SDK mock as proof that the hosted runtime forwarded it.

## Telemetry

Configure telemetry in the minimal slice, before deployment. The Python hosting adapter and Copilot runtime are separate telemetry producers: a project connection or Python exporter alone does not prove that runtime model/tool spans are exported.

1. **Record the route.** Add the hosting/Copilot SDK and running runtime versions, export paths, discovered receiver endpoints and exporting identities/scopes to the root `README.md` (rapid) or `docs/implementation.md` (SDD), and the Application Insights resource ID to `.azure/deployment-plan.md`. Keep connection configuration in the appropriate deployment settings and Git-ignored `.env`, not diagnostic logs. Resolve the selected project's linked Application Insights through `microsoft-foundry`; prefer its azd-owned values over duplicated metadata. Do not silently use a different destination.
2. **Configure the host once.** Load telemetry configuration before constructing the hosting adapter. Current AgentServer Core initializes observability through `microsoft-opentelemetry`, supports Azure Monitor export with `APPLICATIONINSIGHTS_CONNECTION_STRING`, and supports OTLP export with `OTEL_EXPORTER_OTLP_ENDPOINT`. Inspect the installed adapter's behavior before using these settings; do not independently initialize a duplicate global provider/exporter. Generic HTTP-client instrumentation is disabled by default in the inspected source: enable only needed supported instrumentation or add explicit spans at owned MCP/application boundaries.
3. **Configure the runtime explicitly.** Merge the following v1.0.14 fragment into the existing client's configuration rather than creating a second runtime. `COPILOT_OTLP_ENDPOINT` is an application-defined variable containing a verified, reachable OTLP HTTP receiver base URL, not an Application Insights connection string or ordinary ingestion URL.

   ```python
   import os
   from copilot import CopilotClient

   client = CopilotClient(
       telemetry={
           "otlp_endpoint": os.environ["COPILOT_OTLP_ENDPOINT"],
           "otlp_protocol": "http/protobuf",
           "exporter_type": "otlp-http",
           "capture_content": False,
       },
   )
   ```

   Verify the receiver's supported onward export to the intended Azure Monitor/Application Insights destination. Reuse a working route; obtain approval before provisioning a collector or other ingestion resources. Native Azure Monitor OTLP ingestion requires its discovered endpoints, Data Collection Rule (DCR) and authentication; an ordinary connection string does not configure that route. Do not point an HTTP/protobuf client at a gRPC-only receiver or assume the Python host is an OTLP receiver.
4. **Check the actual exporter identity.** Verify supported authentication for the installed version and chosen route. Current Core source supports `APPLICATIONINSIGHTS_AUTH_MODE=entra` using managed identity for Azure Monitor export. Direct authenticated Application Insights ingestion requires the actual emitter's applicable permission on the component; native OTLP collector ingestion requires the collector identity's Monitoring Metrics Publisher role on the DCR. A remote collector can have a different identity from the agent. Recheck actual principals after deployment and defer current role/resource mechanics to `microsoft-foundry`; do not grant both scopes indiscriminately.
5. **Preserve distributed trace context.** Keep session creation/resume/send under the intended active hosting-request span. With OpenTelemetry available and configured, v1.0.14 Python propagates W3C `traceparent`/`tracestate` into the runtime and restores context around tool callbacks. Preserve context through supported MCP transports or owned boundary instrumentation. Test concurrent requests for correct trace/parent association; never use a global mutable trace-header dictionary. W3C tracing is separate from `x-agent-foundry-call-id` authentication context; neither substitutes for the other. Do not fabricate remote child spans as execution evidence.
6. **Keep content private.** Keep Copilot `capture_content=False` and hosting sensitive-data capture disabled unless explicitly approved with redaction and retention controls. These options do not sanitize explicit application, adapter or tool logs: avoid prompts, completions, tool arguments/results, credentials and opaque caller-context values. Record safe identifiers, status, duration and available usage metadata instead.
7. **Verify delivery and lifecycle.** Start instrumentation before requests and shut down the runtime/flush owned exporters through supported graceful-lifecycle APIs. Record sampling and ensure checkpoint probes are retained without silently changing production policy. Allow bounded batching/ingestion delay, then require the deployed probe's hosting, model and required tool spans with correct trace/parent links and agent/version identification. Follow the Foundry trace workflow: for its Application Insights schema, start from `requests` filtered by agent name and join `dependencies` by `operation_Id`. Verify the actual schema for native OTLP ingestion instead of assuming those tables. Host-only spans, exporter startup and local mocks do not satisfy the checkpoint.

If spans are missing, inspect producer enablement, active context, receiver reachability, destination/authentication, sampling and flush/ingestion delay before changing code or infrastructure. Report the failed boundary and keep the checkpoint blocked; do not redeploy an unchanged artifact to wait for telemetry.

## Dependency-packaging fallback

Remote build remains the default. When server-side dependency resolution fails, first capture the restore error and correct invalid/incompatible requirements. For access/feed failures, follow the approved package-feed guidance; do not disable TLS or integrity checks. If remote resolution still cannot work, use the supported **bundled source-code deployment** mode through `microsoft-foundry`, not an unrequested container-image migration.

1. Export the approved lockfile to a fully pinned, hashed requirements file, including transitive dependencies and the **target Linux wheel hashes**. Preserve private feeds/pins. Work in a fresh, task-owned staging directory; do not reuse a macOS/Windows virtualenv.
2. For the currently documented Linux x86_64 Python 3.13 runtime, install extracted modules into `packages/`:

   ```bash
   python3.13 -m pip install --require-hashes -r requirements.lock \
     --target packages/ --platform manylinux2014_x86_64 \
     --python-version 3.13 --implementation cp --only-binary=:all:
   ```

   `requirements.lock` here is the exported pip-compatible hash-locked file. If required wheels are unavailable, report the package/platform blocker; use a reproducible matching Linux build with verified artifacts rather than silently dropping hashes or shipping host-native binaries.
3. Validate imports and runtime startup in matching Linux/Python 3.13. The Copilot runtime/native assets are separate from Python wheels: resolve the SDK-supported Linux runtime, preserve executable permissions, and record its version/checksum. Do not bundle the developer's desktop binary or depend on an untested first-start download.
4. Produce a flat deployment archive with entry point, application sources, locked requirements, required assets and extracted `packages/` at the root. Set `runtime: python_3_13` and `dependency_resolution: bundled` using the current platform/tool schema. Inspect the archive and confirm packaging ignore rules did not remove `packages/`; compute and verify the deployed ZIP hash.
5. Exclude staging directories, `packages/`, runtime binaries and deployment archives from **Git and pytest discovery** (`testpaths`/`norecursedirs` or the repository's equivalent), but explicitly include required artifacts in the deployment ZIP. Keep the lockfile and packaging instructions in Git. Exclude `.env`, caches, credentials and unrelated files from the archive.
6. Redeploy this changed artifact once, rerun the hosted checkpoint, and record the reason for bundling plus versions/hash. A successful upload or `active` state is not acceptance. Remove only task-created staging/debug resources afterward.

## Versioned sources

- [v1.0.14 BYOK configuration](https://github.com/github/copilot-sdk/blob/v1.0.14/docs/auth/byok.md)
- [v1.0.14 managed identity and token refresh](https://github.com/github/copilot-sdk/blob/v1.0.14/docs/setup/azure-managed-identity.md)
- [v1.0.14 Python provider, MCP and session types](https://github.com/github/copilot-sdk/blob/v1.0.14/python/copilot/session.py)
- [v1.0.14 client signatures and runtime status](https://github.com/github/copilot-sdk/blob/v1.0.14/python/copilot/client.py)
- [v1.0.14 runtime telemetry configuration](https://github.com/github/copilot-sdk/blob/v1.0.14/docs/observability/opentelemetry.md)
- [v1.0.14 Python trace-context propagation](https://github.com/github/copilot-sdk/blob/v1.0.14/python/copilot/_telemetry.py)
- [AgentServer Core observability source (moving main; verify installed version)](https://github.com/Azure/azure-sdk-for-python/blob/main/sdk/agentserver/azure-ai-agentserver-core/azure/ai/agentserver/core/_tracing.py)
- [Azure Monitor native OTLP ingestion and DCR permissions](https://learn.microsoft.com/azure/azure-monitor/containers/opentelemetry-protocol-ingestion)
- [Foundry platform headers](https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-contract#platform-request-headers-container-protocol-200)
- [Supported bundled code-deployment layout](https://learn.microsoft.com/azure/foundry/agents/how-to/deploy-hosted-agent-code#package-the-zip-manually)
