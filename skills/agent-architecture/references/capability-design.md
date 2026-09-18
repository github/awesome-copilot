# Domain Capabilities and Skill Structure

Read when designing domain substance or checking that an existing agent performs the required work. This describes specifications, not skill installation or application implementation.

## 1. From need to capability

A capability is observable work with a domain output: for example, preparing a testable hypothesis or handling a request under current policy. An “analysis” stage alone explains neither method nor output.

Build a compact map: `requirement/scenario → capability → input and source → method/rules → output → check → executor`. Cover main scenarios, rather than giving every technical action its own row.

Allocate responsibility by meaning:

| Mechanism | Assign to it |
|---|---|
| Model | Interpretation and synthesis with defined grounds, boundaries, and quality criteria |
| Skill / domain instruction | Repeatable method, examples, decision criteria, and source handling |
| Tool | A concrete read, computation, or external action with a contract |
| Runtime / ordinary code | Permissions, schemas, calculations, states, limits, and mandatory checks |
| Human | Decisions and evaluation requiring their authority or domain judgment |

A capability may use several mechanisms. A skill is not a subagent, workflow stage, or API method. A reusable method, its own context, or an independent lifecycle can justify a separate skill. A simple one-off transformation needs only an instruction and example within one design; a capability map does not require a skill catalog.

## 2. Specification of a selected skill

Populate these fields with task-specific details for each needed skill. Put shared rules in one place and link to them. Method complexity determines depth, not file count.

| Field | Content |
|---|---|
| Purpose and selection | Need addressed; triggers and inapplicable cases; who selects the procedure |
| Input and context | Required data, authoritative sources, versions, access, freshness; behavior on absence or conflict |
| Method | Domain steps, selection criteria, and alternatives; grounds for conclusions and uncertainty boundaries |
| Output | Artifact fields and their meaning, consumer; one brief populated example |
| Tools and control | Required operations; programmatic checks versus human judgment; link to shared authority contract |
| Errors and stopping | Failure, insufficient data, permitted rework, and user outcome; link to shared budget |
| Validation | Ordinary, negative, or difficult example; usefulness criteria and unacceptable result |
| Ownership and changes | Method owner, version, update/rollback rules; user/tenant scope where applicable |

Replace “analyze it and do it well” with an operational method. Propose unknown domain rules with grounds and status, or identify a specific gap and owner; do not invent corporate policy. The architecture contains a proposed procedure, not a promise to “write a skill later.”

## 3. Instructions, materials, and existing platform

Show the future solution's logical structure: shared behavior/authority contract → skill selection conditions → domain procedures → references, examples, and templates. For each element, identify purpose, consumer, and loading condition. Sections of one document, a file tree, or store records are acceptable; empty directories and duplicate instructions do not add substance.

Context initially contains minimal shared rules and information needed to select work; a selected procedure receives only required materials. Define source precedence and the scope of corporate rules. Untrusted data and skill contents cannot expand runtime authority.

For the chosen platform, allocate: `responsibility → existing mechanism and evidence → required configuration/addition → unverified part and verification method`. A platform name proves neither support for a function nor correct configuration. If documentation/version is unavailable, propose the required contract without claiming it exists.

If shared and corporate catalogs exist, define version selection and override rules, authorized editor, conflict resolution, and tool compatibility. A run records selected versions. A catalog update does not silently replace the method mid-task: define continuation on the previous version or explicit migration; for a revoked version or permissions, describe safe stopping and subsequent investigation.

## 4. A populated example instead of a stage list

The following example is synthetic, illustrates descriptive depth, and does not impose marketing on every agent.

**Capability:** prepare an activation improvement hypothesis. Input: brief B1 defines activation as the first workspace created; report A7 says some new users stop at inviting colleagues. It does not contain reasons for abandonment.

**Method:** separate observation from explanation → formulate a possible cause → choose an intervention that changes that barrier → link it to measurable behavior → identify what could falsify the explanation. The procedure reads B1 definitions and A7 data; the model proposes a causal hypothesis, while a tool provides report access and calculations.

**Output H1:** observation—stops at the invitation step (A7); proposed cause—invitation requires colleagues' participation too early (unconfirmed); intervention—allow skipping invitations; expected behavior—first workspace creation; limitations—no causal evidence, a comparison plan is still needed. H1's consumer is the experiment designer, not a publication tool.

**Validation and continuation:** verify event definition and reference; the product owner assesses hypothesis grounds. Design the experiment's comparison method, data requirements, and decision rule. If A7 contains only page views, mark H1's initial observation unconfirmed: the user receives an explanation and needed data, not a claim that the barrier is established or growth achieved.

For your project, work through the entire main scenario with similarly populated intermediate artifacts and show the final user outcome. This is a tabletop walkthrough, not evidence of a completed experiment. Completed-package conditions are in [architecture-contract.md](architecture-contract.md).
