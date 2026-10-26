# Cross-component implementation contract

Reference for the `foundry-agentic-loop` skill: the small contract that must be frozen before frontend, backend, agent, ingestion, or infrastructure work proceeds in parallel. Copy this table into the root `README.md` (rapid) or the `Implementation contract` section of `./docs/spec.md` (SDD) and replace every placeholder.

## Contract table

| Contract | Frozen value | Producer / authority | Consumers | Verification |
| --- | --- | --- | --- | --- |
| `azure.yaml` service names | `<frontend>`, `<backend>`, `<agent>`, `<ingestion>` as applicable | Infrastructure | azd hooks, deployment scripts, CI | `azd config list` and manifest review |
| Environment variables | Exact name, type, required/optional status, and default for each variable | Provisioning output or owning service | Every component that reads it | Generated env map matches code/config reads |
| Hosted-agent protocol | Responses API version and OpenAI-compatible `/responses` endpoint | Foundry hosted agent | Backend/client | Contract test invokes deployed endpoint |
| Responses metadata | Allowed keys and JSON value types; no implementation-specific objects | Backend/client contract | Agent and telemetry | Schema validation |
| Toolbox endpoint | `<project-endpoint>/toolboxes/<name>/versions/<version>/mcp?api-version=v1`; define pinned versus promoted-version behavior | `azd ai toolbox create` / provisioning | Agent MCP bridge | MCP initialize and `tools/list` |
| MCP tools | Exact tool names, input JSON schemas, output/error shapes | Tool owners | Agent | Schema snapshot and discovery test |
| Model inference | Endpoint, deployment name, model/version/SKU, and token scope (`https://ai.azure.com/.default`) | Foundry provisioning | Agent framework | Authenticated smoke test |
| Response body | Exact JSON shape, status/error mapping, and streaming behavior | Backend API | Frontend/client | API contract test |
| Citations | Source, section, anchor/chunk id, and claim association | Foundry IQ/toolbox | Agent, backend, frontend | Known-answer citation test |
| Grounding refusal | Exact deterministic refusal text used when no cited evidence supports the answer | Product/API contract | Agent, backend, evals | No-supported-source test |
| Runtime versions | Python, Node, hosted-agent runtime and each direct dependency, including `github-copilot-sdk`, resolved during implementation to the latest stable release, API-verified before generating code and pinned exactly; exact image tags (digest preferred), never a floating "latest" | Official package index, the build's package index and registries | All services and CI | Lockfile/manifests match CI; the build's index or registry serves each pinned version |

For environment variables, add one row per value when that is clearer than a comma-separated list. Record both the producer and every consumer; this catches values that provisioning emits under one name while runtime code expects another.

## Reconciliation before merge

1. Compare every `azure.yaml` service and hook target with the frozen service names.
2. Search code, Bicep outputs, azd hooks, CI, and docs for each environment-variable producer and consumer.
3. Exercise the Responses endpoint with contract-valid metadata and validate response/citation/refusal schemas.
4. Initialize the toolbox endpoint, compare discovered MCP names and schemas with the frozen snapshot, and fail on drift.
5. Confirm model endpoint, deployment name, and token scope agree across provisioning and agent configuration.
6. Compare runtime and package manifests with the resolved version row and run compatibility checks in the generated application.
7. Update the contract and all consumers in one change when an intentional interface change is required.
