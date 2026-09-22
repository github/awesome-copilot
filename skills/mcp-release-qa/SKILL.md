---
name: mcp-release-qa
description: 'Verify an MCP server before release by exercising a real protocol session, comparing runtime capabilities with source and documentation, testing failure paths, and recording reproducible evidence. Use when shipping or reviewing an MCP server, tool, resource, prompt, catalog, or install path.'
---

# MCP Release QA

Test the server that users will run. A schema review or a passing unit test is
not runtime evidence.

This skill complements security review. It focuses on protocol behavior,
published-contract drift, transport correctness, and reproducible release
evidence.

## Rules

- Run checks against a fresh server process built from the candidate revision.
- Keep `initialize`, `notifications/initialized`, discovery, and invocation in
  the same session. A new process is a new STDIO session.
- Treat source registrations as implementation truth and public documentation
  as a contract that must match it.
- Record exact commands and raw responses. Do not replace missing evidence with
  "looks correct."
- Do not invoke mutation-capable tools against production data. Use fixtures, a
  sandbox, or stop and name the missing safe test environment.
- Derive the expected capability inventory from the candidate source on every
  run.

## 1. Establish the release surface

Identify:

- candidate commit and build command;
- server entry point and transport: STDIO, Streamable HTTP, or SSE;
- supported MCP protocol versions;
- source files that register tools, resources, resource templates, and prompts;
- generated catalogs, manifests, README tables, and install instructions;
- existing protocol, integration, and smoke-test commands.

Prefer repository-native commands. Inspect `package.json`, `pyproject.toml`,
`Makefile`, CI workflows, and contributor instructions before inventing a test
harness.

## 2. Start a clean server

Build the candidate and start the documented entry point with test-safe
configuration. Capture:

- the exact command;
- commit SHA;
- environment variable names, with values redacted;
- stdout, stderr, and exit status;
- the endpoint or child-process transport used by the client.

For STDIO, stdout is protocol-only. Logs, banners, and stack traces belong on
stderr. For HTTP transports, record the status, relevant MCP headers, and
session identifier handling without printing credentials.

If the server cannot start from its documented instructions, report that as a
release failure and preserve the startup error verbatim.

## 3. Exercise one complete session

Run this sequence through a real MCP client or the repository's integration
harness:

1. `initialize` with a protocol version the server claims to support.
2. Confirm the negotiated version and advertised capabilities.
3. Send `notifications/initialized`.
4. Call `ping`.
5. Call each supported discovery method:
   - `tools/list`
   - `resources/list`
   - `resources/templates/list`
   - `prompts/list`
6. Exercise at least one representative read-only item from every advertised
   capability class.
7. Follow pagination until no cursor remains when a list method is paginated.

Do not send post-initialization requests through separate one-shot processes.
That accidentally tests several incomplete sessions instead of one valid
session.

## 4. Prove inventory parity

Build four inventories from current evidence:

| Surface | Evidence |
|---|---|
| Source | Registered tool, resource, template, and prompt definitions |
| Runtime | Results from the live discovery methods |
| Generated metadata | Catalogs, manifests, or generated indexes |
| Documentation | README, reference pages, and install output |

Compare by stable identifier. Report:

- source entries missing at runtime;
- runtime entries absent from metadata or documentation;
- stale names, descriptions, arguments, URIs, or prompt parameters;
- documented install commands that do not start the candidate server.

Regenerate derived files with the repository's own build command, then fail if
the working tree still contains unexplained generated changes.

## 5. Check published contracts

For every discovered item, verify the runtime definition against its source:

### Tools

- Name and description are stable and specific.
- `inputSchema` defines types, required fields, enums, and bounds where needed.
- Unknown properties are rejected when the tool contract is closed.
- Mutation, idempotence, read-only, and open-world annotations match behavior.
- Successful calls conform to `outputSchema` when one is published.
- Errors are protocol errors or structured tool failures, not leaked stack
  traces.

### Resources and templates

- URIs and MIME types match the registered definitions.
- Static resources are readable.
- Template parameters are validated before resolution.
- Missing or forbidden resources fail explicitly.

### Prompts

- Required and optional arguments match discovery output.
- `prompts/get` returns usable messages for valid arguments.
- Missing required arguments and unknown prompt names fail explicitly.

## 6. Test failure paths

At minimum, probe:

- a request before initialization completes;
- malformed JSON or an invalid JSON-RPC envelope;
- an unknown method;
- an unsupported protocol version;
- repeated initialization;
- unknown tool, resource, and prompt names;
- missing, extra, wrong-type, and out-of-bounds arguments;
- a request at the documented transport-size limit and one beyond it;
- a controlled internal failure with credentials and stack traces redacted.

Verify that each response has the correct request ID, a useful error message,
and no successful side effect. For STDIO, also confirm every stdout line is a
complete protocol message and a healthy session leaves stderr clean unless the
server explicitly documents diagnostic output.

## 7. Smoke-test installation

When the project publishes an install command:

1. Create a temporary destination outside the source checkout.
2. Run the public install command exactly as documented.
3. Start the installed artifact without relying on files from the source tree.
4. Repeat initialization, discovery, and one read-only invocation.
5. Remove the temporary destination after preserving the command output.

An install string that was only inspected is unverified.

## 8. Report the evidence

Use this format:

```markdown
# MCP Release QA

Candidate: [commit]
Transport: [STDIO | Streamable HTTP | SSE]
Verdict: PASS | PASS WITH CAVEATS | FAIL

## Commands and results
- `[exact command]` — [exit status and result]

## Session transcript
- initialize: [result]
- discovery: [result]
- representative calls: [result]
- negative paths: [result]

## Parity
| Identifier | Source | Runtime | Metadata | Docs | Result |
|---|---|---|---|---|---|

## Findings
| Severity | Evidence | Impact | Narrowest fix |
|---|---|---|---|

## Missing evidence
- [check that could not run and why]
```

Use `FAIL` for a server that cannot start, complete a valid session, keep the
transport parseable, or safely reject invalid input. Use `PASS WITH CAVEATS`
only for bounded documentation or metadata drift that does not misrepresent a
dangerous capability. Otherwise use `PASS`.
