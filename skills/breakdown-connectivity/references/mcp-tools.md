# Breakdown MCP tools

Breakdown exposes local, authenticated MCP tools while the app is running. Discover the live tool schemas from the connected server; the list below helps select a useful surface.

## Compact starting points

- `get_current_network_health`: current LAN, Internet, App, Internet sub-segment, and freshness status.
- `list_recent_network_issues`: retained issue summaries with severity, affected area, and context identifiers.
- `get_top_app_health_cards`: compact ranked app and service health.

## Focused evidence

- `get_trace_route_details`: observed path details.
- `get_network_as_topology`: autonomous-system and path topology.
- `get_network_segment_time_series`: LAN, Internet, App, and Internet sub-segment history.
- `get_dns_resolver_time_series`: DNS resolver loss, round-trip time, and jitter.
- `get_wifi_interface_time_series`: Wi-Fi signal, link rate, and traffic.
- `get_ethernet_time_series`: Ethernet traffic observations.
- `get_app_service_time_series`: app or service health, traffic, and path evidence.
- `get_endpoint_time_series`: endpoint traffic, loss, round-trip time, and jitter.
- `get_app_service_with_contributing_endpoints_time_series`: app evidence with its contributing endpoints.
- `list_local_topology_change_events`: local interface, LAN, DNS, route, and topology changes.
- `list_timeline_events`: event details for a time window or exact event context identifiers.

Most evidence tools accept a time window, result limit, context identifiers, app/service search terms, and an evidence budget. Use the live schema because available arguments can evolve with Breakdown.

## Breakdown analysis and reports

- `run_breakdown_analysis`: start a cloud-backed Breakdown investigation using the app's normal evidence loop and account limits.
- `get_breakdown_analysis_result`: poll or retrieve an analysis result.
- `list_breakdown_analysis_history`: list retained analysis history.
- `get_evidence_report_preflight`: inspect Evidence Report availability.
- `export_evidence_report`: export a supported Evidence Report PDF.

Analysis and Evidence Report availability can depend on the installed Breakdown version, account level, retained history, and selected context.
