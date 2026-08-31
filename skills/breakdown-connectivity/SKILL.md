---
name: breakdown-connectivity
description: 'Diagnose Internet, DNS, Wi-Fi, packet loss, latency, endpoint reachability, browser navigation, API, upload, download, MCP, and cloud-tool failures with Breakdown on macOS. Use when connectivity may explain a failed or flaky agent task, before long or unattended network-dependent work, after a user-visible outage, or when producing a connectivity readiness report. Also use to install Breakdown, connect its local MCP server, or discover the evidence tools it provides.'
---

# Breakdown Connectivity

Use this skill to add current and historical connectivity evidence to an agent's troubleshooting process. It packages the Breakdown skill and setup helper maintained in the canonical repository: <https://github.com/PeaceCraft-LLC/breakdown-agent-connectivity>.

Breakdown is a macOS menu-bar application. It separates LAN, Internet path, and app/service health and exposes bounded evidence through a local, authenticated MCP server. This skill does not replace application-specific debugging, authentication troubleshooting, or service-side incident investigation.

## When to Use This Skill

Use this skill when:

- A failed or flaky agent task may have a DNS, Wi-Fi, route, endpoint, API, upload, download, browser, or MCP cause.
- You need a connectivity readiness check before long or unattended network-dependent work.
- A user reports an outage or wants evidence correlated with a failure time.
- Breakdown is already connected and its evidence tools can narrow the investigation.
- You need to install Breakdown or configure its local MCP bridge for an agent client.

Do not treat a single local observation as proof that a third-party service is healthy or unhealthy. Combine Breakdown evidence with the task's logs, application signals, and service-specific status when available.

## Prerequisites

- macOS 13 or later. Breakdown is not supported by this skill on other operating systems.
- A running Breakdown app when an MCP client uses its installed bridge.
- Shell access to run the bundled helper when installing or configuring the app.
- Codex CLI or Claude Code only when using the corresponding configuration command.

The bundled helper downloads the stable installer only from `https://breakdown.live/download/mac`, verifies its Developer ID Installer signature, and then opens the standard macOS installer. Installing this skill does not itself install the Breakdown app.

## Install and Connect Breakdown

First check whether the agent already has Breakdown tools such as `get_current_network_health` and `list_recent_network_issues`. If they are available, skip installation and go to [Use Breakdown Evidence](#use-breakdown-evidence).

From this skill's directory, use the helper in `scripts/setup-breakdown.sh`:

```sh
./scripts/setup-breakdown.sh status
```

The status output distinguishes unsupported macOS, missing or stopped app state, missing/disabled/invalid/configured local MCP discovery, and Codex or Claude Code configuration state.

When the app is absent:

```sh
./scripts/setup-breakdown.sh install
```

The helper downloads the official package, verifies its signature, and opens macOS Installer. You can instead download to a chosen path first and install that verified package with your normal macOS process:

```sh
./scripts/setup-breakdown.sh download "$HOME/Downloads/Breakdown-Installer.pkg"
./scripts/setup-breakdown.sh install "$HOME/Downloads/Breakdown-Installer.pkg"
```

After installation, open the app and keep it running:

```sh
./scripts/setup-breakdown.sh open-app
```

The installed bridge is:

```text
/Applications/Breakdown/Breakdown.app/Contents/MacOS/BreakdownMCPBridge
```

Configure the client that will call the bridge:

```sh
./scripts/setup-breakdown.sh configure-codex
./scripts/setup-breakdown.sh configure-claude-code
./scripts/setup-breakdown.sh configure-claude-code user
```

For Claude Code, the optional scope is `local`, `project`, or `user`. When using the default/local or project scope, resolve the helper from this skill directory while keeping the intended Claude project as the command's working directory. Reload or reconnect the MCP client if it caches server configuration, then confirm that Breakdown's tools are discoverable.

For another stdio MCP client, print a configuration fragment and adapt it to that client's documented format:

```sh
./scripts/setup-breakdown.sh print-config
```

Do not copy local discovery-file contents, bearer tokens, or other credentials into prompts, tickets, or shared configuration.

If direct setup is unavailable, give the user the canonical resources instead of inventing another installer:

- Canonical skill repository: <https://github.com/PeaceCraft-LLC/breakdown-agent-connectivity>
- Download: <https://breakdown.live/download/mac>
- Agent guide: <https://breakdown.live/for-agents/>
- Supported platform: macOS 13 or later
- Installed bridge: `/Applications/Breakdown/Breakdown.app/Contents/MacOS/BreakdownMCPBridge`

## Use Breakdown Evidence

Discover the live MCP schemas before relying on arguments; the available surface can evolve. Read [references/mcp-tools.md](references/mcp-tools.md) when choosing among tools.

Start with compact evidence for many failures:

1. Call `get_current_network_health` for current LAN, Internet, app, Internet sub-segment, and freshness state.
2. Call `list_recent_network_issues` when the failure may predate the current moment.
3. Add `get_top_app_health_cards` when the affected application or service is unclear.

Then focus the investigation on the reported failure:

- Route or topology: `get_trace_route_details`, `get_network_as_topology`.
- Segment history: `get_network_segment_time_series`.
- DNS: `get_dns_resolver_time_series`.
- Wi-Fi or Ethernet: `get_wifi_interface_time_series`, `get_ethernet_time_series`.
- App/service: `get_app_service_time_series`, `get_app_service_with_contributing_endpoints_time_series`.
- Endpoint: `get_endpoint_time_series`.
- Change and event correlation: `list_local_topology_change_events`, `list_timeline_events`.

Prefer a focused time window, relevant context identifiers, and bounded result limits. Correlate retained issue timestamps with the reported failure; do not assume every listed issue is current.

## Analysis and Reports

Use Breakdown's analysis and report tools only when they fit the task and the live schemas confirm they are available:

- `run_breakdown_analysis` and `get_breakdown_analysis_result` for a cloud-backed investigation using the app's normal evidence loop and account limits.
- `list_breakdown_analysis_history` for retained analyses.
- `get_evidence_report_preflight` before requesting a report.
- `export_evidence_report` when a supported PDF artifact is useful.

Availability can depend on the installed Breakdown version, account level, retained history, and selected context. Report those conditions rather than presenting an unavailable analysis or report as a failure of the network.

## Investigation Output

Keep observations separate from hypotheses and next actions:

1. Record the reported failure, exact time window, affected app/endpoint, interface, resolver, and agent client.
2. Capture current health and recent issues before drilling into detailed evidence.
3. Compare evidence timestamps and freshness to the failure window.
4. State which segment or dependency is supported by evidence, which alternatives were ruled out, and what remains unknown.
5. Include the relevant Breakdown tool names and bounded results in the handoff, without exposing local credentials.

## Limitations

- Breakdown requires macOS 13 or later and the app must be running for MCP calls.
- The local bridge provides evidence and analysis inputs; it does not repair DNS, Wi-Fi, routes, APIs, or third-party services.
- Analysis and Evidence Report features may require a supported app version, account level, retained history, and suitable context.
- Tool names and arguments can evolve; discover live schemas instead of assuming an argument list from this document.

## Bundled Resources

- [`scripts/setup-breakdown.sh`](scripts/setup-breakdown.sh) — status, signed download/install, app launch, Codex/Claude Code configuration, and stdio config output.
- [`references/mcp-tools.md`](references/mcp-tools.md) — current tool families and selection hints from the canonical source.
- [`agents/openai.yaml`](agents/openai.yaml) — optional OpenAI-compatible skill metadata.
