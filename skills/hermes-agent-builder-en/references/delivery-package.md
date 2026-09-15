# Complete implementation kit

The skill's final result must be self-contained. The implementing agent should
not need the prior interview or conversation. It receives a directory or archive,
reads one instruction, and builds a working system through acceptance checks.

## 1. Kit states

Allowed states:

- `draft`: discovery or architecture is incomplete;
- `ready_for_implementation`: every critical decision is made and the kit can be
  handed to an implementing agent;
- `implemented`: code exists, checks ran, and results were verified. An
  architecture document alone cannot use this state.

A transferable archive may be created only for `ready_for_implementation` or
`implemented`.

## 2. Required structure

```text
<name>-agent-kit/
├── AGENTS.md
├── START-HERE.md
├── IMPLEMENTATION.md
├── manifest.json
├── requirements/
│   ├── goal.md
│   ├── work-map.md
│   └── constraints.md
├── architecture/
│   ├── system.md
│   ├── decisions.md
│   ├── authority.md
│   └── interface-and-storage.md
├── acceptance/
│   ├── criteria.md
│   └── scenarios.md
├── blueprint/
│   ├── AGENTS.md
│   ├── project-tree.md
│   ├── profiles/
│   ├── skills/
│   ├── tools/
│   ├── processes/
│   ├── storage/
│   └── interface/
├── evidence/
│   └── sources.md
└── unresolved.md
```

Do not create empty directories merely to match the diagram. If a layer is not
needed, record that decision in `architecture/decisions.md` and omit it from the
blueprint.

## 3. File responsibilities

### `START-HERE.md`

A short human-facing guide explaining the kit, how to check `manifest.json`, how
to hand the work to Codex or Hermes, what the user still must provide, and where
the implementation result will appear.

### Root `AGENTS.md`

Mandatory rules for the implementing agent. Codex and Hermes can use this file as
project context. It must point to `IMPLEMENTATION.md`, forbid requirement
substitution and unapproved external actions, and require the acceptance checks.

`blueprint/AGENTS.md` serves a different purpose: it is the project instruction
for the agent system being created.

### `IMPLEMENTATION.md`

The single instruction for the implementing agent. It must require the agent to:

1. read `manifest.json`, requirements, architecture, and acceptance files;
2. stop when status is not `ready_for_implementation` or a critical unknown
   remains;
3. build the system in a separate `implementation/` directory;
4. preserve selected profile, skill, tool, process, state, and authority
   boundaries;
5. implement a server, panel, database, or integrations only when architecture
   requires them;
6. keep real credentials out of the project;
7. avoid enabling schedules or making external changes without separate user
   approval;
8. run every check under `acceptance/`;
9. create `IMPLEMENTATION-RESULT.md` with run commands, check results, remaining
   limitations, and required human actions;
10. continue beyond descriptions and scaffolds when a testable implementation is
    possible in the current environment.

Use `assets/IMPLEMENTATION.template.md`.

### `manifest.json`

Minimum schema:

```json
{
  "schema_version": 1,
  "system_slug": "example-agent",
  "status": "ready_for_implementation",
  "target_agents": ["codex", "hermes"],
  "entrypoint": "START-HERE.md",
  "implementation_instruction": "IMPLEMENTATION.md",
  "critical_unknowns": [],
  "profiles": [
    {
      "slug": "example-agent",
      "kind": "primary",
      "specification": "blueprint/profiles/example-agent/profile.md",
      "distribution": "blueprint/profiles/example-agent/distribution"
    }
  ],
  "expected_results": [
    "implementation/",
    "implementation/IMPLEMENTATION-RESULT.md"
  ]
}
```

`critical_unknowns` must be empty in a ready archive. Every profile must point to
both a specification and a complete Hermes distribution scaffold.

### `requirements/`

- `goal.md`: current and desired situations, urgency, higher-level goal, success
  criteria, and first complete outcome.
- `work-map.md`: real work episodes, functions, inputs, outputs, cadence,
  exceptions, and handoffs.
- `constraints.md`: budget, deadlines, environment, data limits, mandatory and
  forbidden actions.

### `architecture/`

- `system.md`: profiles, orchestrator, deterministic processes, and connections.
- `decisions.md`: `D1–D4`, `P1–P3`, `I1–I6`, and `O1–O4` tables, plus selected
  and rejected alternatives.
- `authority.md`: credentials, external effects, approvals, limits, idempotency,
  and recovery.
- `interface-and-storage.md`: control surfaces, screens, API, source of truth,
  storage schema, backup, and recovery.

### `acceptance/`

- `criteria.md`: testable readiness conditions for the complete system and each
  major component.
- `scenarios.md`: end-to-end normal work, clarification, approval refusal,
  failure, duplicate event, cancellation, and recovery.

Every criterion needs a verification method. “Works correctly” without an
observable result is invalid.

### `blueprint/`

The blueprint specifies files and contracts, not just concepts:

- `AGENTS.md`: implementation and validation rules suitable for Codex and Hermes.
- `project-tree.md`: expected project structure and responsibilities.
- `profiles/`: each profile's outcome, state, skills, tools, authority, start, and
  completion.
- `skills/`: trigger, input, method, output, and verification for every skill.
- `tools/`: operation, schemas, credentials, errors, idempotency, and effects.
- `processes/`: states, transitions, retries, stopping, and partial results.
- `storage/`: files or tables, data owners, constraints, and migrations.
- `interface/`: pages, actions, states, permissions, and server connections.

Create this scaffold for every proposed Hermes profile:

```text
blueprint/profiles/<name>/distribution/
├── distribution.yaml
├── SOUL.md
├── config.yaml
├── mcp.json
├── .env.EXAMPLE
├── .gitignore
├── skills/
└── cron/
```

Never include a real `.env`, `auth.json`, memory, sessions, logs, or state
database. Scheduled tasks ship disabled and are enabled by a person only after
review.

## 4. Implementation readiness gates

The kit may use `ready_for_implementation` only when all conditions pass:

- `R1 Goal`: desired change, success criteria, and first complete result are
  defined.
- `R2 Work`: every important function is grounded in a real or explicitly
  hypothetical work episode.
- `R3 Architecture`: profiles, skills, tools, processes, state owners, and
  relationships are defined.
- `R4 Contracts`: every component has input, output, errors, and verification.
- `R5 Authority`: credentials, external effects, approvals, limits, and
  idempotency are defined.
- `R6 Data and control`: interface, source of truth, storage schema, concurrent
  writes, backup, and recovery are defined.
- `R7 Build and run`: target environment, dependencies, environment variables,
  install, run, and test commands are known.
- `R8 Acceptance`: testable criteria and end-to-end scenarios exist, with no
  critical unknown.

```text
implementation_readiness = R1 AND R2 AND R3 AND R4 AND R5 AND R6 AND R7 AND R8
```

An unknown is critical when it changes the goal, profile boundaries, authority,
cost, source of truth, privacy, target environment, or success criteria.

## 5. Required implementation result

The implementing agent creates only components required by the architecture, but
brings them to a testable state:

- executable code and configuration;
- every Hermes profile distribution;
- skills, tools, deterministic processes, and scheduled jobs;
- database schema and migrations when required;
- control panel when required;
- secret-free environment examples;
- automated checks;
- installation, operation, update, backup, and recovery instructions;
- acceptance-results report.

Live accounts, publication, spending, and schedule activation remain outside
automatic implementation without separate authorization.

## 6. Handing off the kit

For Codex:

1. Extract the archive and open the directory as a project.
2. Send: “Read `IMPLEMENTATION.md` and implement the complete kit through all
   acceptance criteria.”

Codex reads the root `AGENTS.md` as project context. The implementing agent must
copy `blueprint/AGENTS.md` to the root of the generated project.

For Hermes:

1. Extract the archive and start Hermes in that directory.
2. Send the same `IMPLEMENTATION.md` instruction.
3. Validate profile distributions locally after implementation.
4. Install a reviewed profile with
   `hermes profile install <distribution-path> --alias`.

Each profile has its own `distribution.yaml` and is installed separately. Do not
run two Hermes processes against one profile.

## 7. Creating the archive

Run the packager from this skill:

```bash
python <skill-directory>/scripts/package_delivery.py <kit-directory>
```

The script checks required files, status, critical unknowns, complete profile
distribution scaffolds, and secret-like files. It then creates an archive with a
SHA-256 checksum list.
