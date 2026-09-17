# Create the shepherd-task “making of”

Work autonomously in the current `awesome-copilot` repository. Research the
system from the repository evidence, then create this net-new file:

```text
plugins/shepherd-task/making-of.md
```

Do not merely describe what the file should contain. Write the complete file.
Do not ask the user questions. Do not modify unrelated files.

## Purpose

This is not another shepherd-task usage guide. The existing
`plugins/shepherd-task/README.md` already explains how to operate the system.

The new document must explain **how and why shepherd-task was conceived,
designed, implemented, tested, and evolved**, so that another engineer can
understand the “silicon in the calculator” and apply the same engineering
method to a different agentic workflow.

The primary audience is an experienced engineer who is less interested in
running shepherd-task than in learning:

- how the original human-in-the-loop workflow was decomposed;
- how responsibilities were divided among humans, scripts, Copilot CLI,
  Copilot Coding Agent (CCA), Copilot code review (CCRA), GitHub Actions, Git,
  and `gh`;
- how asynchronous GitHub state was turned into an explicit, fail-closed state
  machine;
- how durable issue, campaign, run, review, test, telemetry, and post-mortem
  artifacts made the system traceable;
- how production experience and experiments changed the design;
- which ideas generalized, which did not, and how someone could build a
  comparable system for another team.

## Authoritative intent, in priority order

When deciding what the document should emphasize, use this priority order.

### 1. Rich Chiodo’s request

Treat the following as the highest-priority statement of the desired document:

> I'd be more interested in how you came up with the workflow and how somebody
> could create their own. I mean following your workshop might kind of impart
> that, but I'm thinking the details in how you created the scripts and
> workflow you made are more interesting to me. It's very similar to work the
> Python team has done and the most interesting part are the differences, but
> not necessarily running it.
>
> It's like you built a calculator. I don't really want to use it to add
> numbers. I want to know how you made the silicon in the calculator.

The result must answer that request directly. Favor design genesis,
construction method, discoveries, failures, tradeoffs, and transferable
lessons over operational instructions.

Do not invent details about the Python team’s implementation. If the local
authoritative sources do not document it, say that a factual implementation
comparison is outside the available evidence. You may identify comparison
dimensions exposed by shepherd-task, but do not claim how the Python system
behaves without evidence.

### 2. The creator’s stated motivations

Treat these motivations as authoritative:

1. The goal was to scale beyond this repetitive AI-assisted workflow for an
   existing issue:

   1. Assign the issue to CCA.
   2. Wait for CCA, including the human intervention required to approve
      workflows.
   3. Evaluate CCRA comments one by one on their merits.
   4. Fix meritorious comments locally and decline non-meritorious comments.
   5. Re-run CI/CD after fixes.
   6. Push the topic branch.
   7. Repeat review rounds until clean.
   8. Mark the PR ready for review.
   9. Apply any additional review feedback through the same evaluate, fix,
      test, push, and re-review loop.

2. The system should leverage the GitHub issue tracker as a durable
   coordination and specification surface.
3. Everything should be completely traceable.
4. The system should incorporate:
   - Architectural Decision Records;
   - research spikes and their resolved findings.

Explain how those motivations became concrete architecture and invariants.
Do not leave them as an introductory bullet list disconnected from the
implementation.

### 3. Latent motivations and design forces found in evidence

Discover and explain additional design forces revealed by the implementation,
experiments, post-mortems, prompt logs, and commit history. Likely examples
include, but are not limited to:

- asynchronous state ambiguity;
- misleading process exit codes and success-shaped output;
- idle termination during long waits;
- distinction between request acknowledgement, completion, and useful result;
- resumability after partial progress;
- serial integration to keep each next task on the latest campaign base;
- separation of remote implementation from local review remediation;
- security and privacy of durable transcripts;
- cross-platform Bash/PowerShell parity;
- installation and version coherence;
- the need to test the orchestration itself, not only the product it creates;
- the difference between prose knowledge and executable knowledge;
- the cost and failure modes of lesson propagation.

Treat this list as a set of leads to verify, not as permission to assert
anything unsupported.

## Authoritative evidence

Use repository evidence as the source of truth. Read before writing.

### Current system

Start with:

```text
plugins/shepherd-task/README.md
```

Then recursively inspect and understand **all tracked files** beneath:

```text
plugins/shepherd-task/
skills/shepherd-task-*/
```

Expand the file mask. Include the skills’ bundled examples and the plugin’s
scripts, manifests, version contract, diagrams, tests, fixtures, drivers, and
supporting files. Do not infer the implementation from the README alone or
summarize files from their names.

The tests and fixtures are design evidence. Use them to explain what the
system’s authors considered important enough to make executable: stage
contracts, Bash/PowerShell parity, PowerShell native pipeline behavior, remote
resolution, body fidelity, session outcomes, installed-estate behavior,
macOS portability, version alignment, serial merges, substantive CI, and
treatment/control campaigns.

### Development record

Treat every tracked file beneath this directory as authoritative historical
evidence:

```text
dd-3031763-improve-agentic-velocity-remove-before-merge/
```

This directory contains large prompt logs as well as focused plans, reviews,
memories, experiment analyses, and post-mortems. Inventory all files first.
Read the focused analysis and plan documents completely. Search the large
prompt logs for the events and decisions needed to corroborate the narrative;
do not mechanically paste or summarize millions of characters.

Pay particular attention to evidence about:

- the primitive shepherd workflow before the formal campaign model;
- post-mortem reviews of failures involving CCA, CCRA, Copilot CLI, and `gh`;
- the transition from prompt logs to structured post-mortems;
- campaign formalization and numbered lifecycle stages;
- redaction and durable evidence;
- treatment/control experiments for campaign lesson propagation;
- simple-math and Cargo Tracker experiments;
- portability, parity, installation, output cleanup, and versioning work.

Historical plans and prompts describe intent at a point in time. Verify whether
their proposed behavior was actually implemented before presenting it as
current behavior.

### Actual topic-branch commits

Inspect the actual commit history on the current topic branch. Determine the
appropriate base (normally `main`) rather than assuming that every commit in
the repository belongs to shepherd-task.

At minimum, use commands equivalent to:

```bash
git branch --show-current
git log --reverse --date=short --format=fuller <base>..HEAD -- \
  plugins/shepherd-task 'skills/shepherd-task-*'
git log --reverse --stat <base>..HEAD -- \
  plugins/shepherd-task 'skills/shepherd-task-*'
git show <commit>
```

Read the initial shepherd-task commit in full and inspect the commits that
introduced or materially changed major design concepts. Use commit contents,
not just subjects. Follow renames.

Reconstruct a defensible chronology that includes the important pivots, such
as:

- the original two-phase, three-skill system;
- independent script verification rather than trusting the LLM process;
- idle-wait and explicit-review-request fixes;
- monitoring, telemetry, and post-mortems;
- ignorance-reduction planning and plan-to-issue conversion;
- stronger readiness, CI, review, and semantic-outcome gates;
- redaction and trace persistence;
- formal campaign identity and numbered stages;
- optional campaign lesson propagation and its experiments;
- stage/result ledgers and one-shot failure semantics;
- installed-estate versioning and complete-lineup releases;
- offline contracts, end-to-end fixtures, macOS portability, and
  Bash/PowerShell parity.

The final document does not need to list every commit. It must cite enough
representative hashes and dates to make the evolution auditable.

## Research and synthesis rules

1. **Separate evidence classes.** Clearly distinguish:
   - creator-stated motivation;
   - current implemented behavior;
   - historical behavior;
   - experimental observations;
   - interpretation or transferable advice.
2. **Prefer primary evidence.** Current scripts, skills, manifests, tests,
   artifacts, and commits outrank later summaries when they conflict.
3. **Use exact dates.** The current date is September 17, 2026. Use concrete
   dates when describing evolution.
4. **Do not flatten the story into a feature list.** Explain the problem or
   failed assumption that caused each important mechanism to exist.
5. **Do not romanticize the outcome.** Include false starts, deterministic
   defects, excessive review loops, observability failures, portability
   issues, and negative or mixed experimental results.
6. **Do not overclaim causality.** In particular, preserve the distinction
   between proven lesson delivery, observed behavior consistent with a lesson,
   and unproven cognitive use by an agent.
7. **Explain why both prose and scripts exist.** Show how skills supply
   semantic judgment while scripts supply durable orchestration, process
   boundaries, artifacts, and independent verification.
8. **Explain authority boundaries.** Identify which state is authoritative at
   each layer: issue body, campaign manifest, run manifest, stage result,
   creation ledger, GitHub APIs, PR head SHA, CI checks, review IDs/threads,
   local test output, and final merge state.
9. **Explain the issue tracker choice.** Connect ordered issues to
   specification, decomposition, serial execution, traceability, linkage, and
   human-visible recovery.
10. **Explain ADR and spike integration.** Show the pipeline from unknowns to
    an ignorance-reduction plan, human-resolved `Resolution` blocks, spike
    findings, a spike firewall that prevents throwaway code from becoming
    production templates, and detailed implementation issues.
11. **Explain the human role accurately.** Shepherd-task reduces repetitive
    supervision; it does not eliminate human ownership, campaign setup,
    research resolution, manual intervention at hard failures, or final
    campaign-to-`main` review.
12. **Use code sparingly.** Prefer small, illustrative snippets or schemas
    that expose a design mechanism. Do not reproduce large scripts or turn the
    document into an API reference.
13. **Cite locally.** Use repository-relative paths, commit hashes, artifact
    names, and dates inline. Do not add external citations unless a local
    source makes one necessary.
14. **Do not browse the web for the narrative.** The local repository sources
    and Git history are authoritative for this task.

## Required themes

The finished document must cover all of these themes as a coherent narrative.

### The manual loop that became the product

Begin with the repetitive supervisory work. Explain which parts required
judgment and which parts were mechanical. Show how that distinction led to an
orchestrator that combines LLM skills, deterministic scripts, local tools, and
GitHub-hosted agents rather than trying to make one prompt do everything.

### The key decomposition

Explain the roles of:

- human campaign owner;
- GitHub issues and the campaign base branch;
- CCA;
- CCRA;
- local Copilot CLI;
- local Bash/PowerShell scripts;
- GitHub Actions;
- `gh`;
- Git worktrees;
- durable campaign and run artifacts.

Explain why CCA handles initial implementation while local Copilot CLI handles
review findings, and why the scripts verify outcomes after each LLM session.

### Turning an activity diagram into a state machine

Show how vague states such as “Copilot is working,” “the review was
requested,” or “CI is green” became explicit states and gates. Include
head-SHA binding, review IDs, thread resolution, substantive CI, issue
acceptance evidence, terminal markers/results, retry budgets, and fail-closed
timeouts.

### Campaigns, stages, and durable identity

Explain why a list of tasks became a campaign with:

- a UUID;
- a non-`main` base branch;
- a repository-visible temporary metadata directory;
- a manifest;
- ordered child issues;
- one or more run directories;
- post-mortems for success and failure.

Explain why stages are numbered with gaps and why stages 10 and 20 are
optional when suitable issues already exist.

### From ADRs and spikes to coding-agent-ready issues

Explain the stage 10 → human research gate → stage 15 → stage 20 path. Show
how the plan captures unknowns, how humans resolve implementation-gating
questions, how the system creates traceability maps and issue specifications,
and why spike findings are carried forward while spike source code is fenced
off.

### Traceability as an engineering property

Explain the chain from campaign issue and plan through child issue, PR, commit,
CI, review, lesson, merge, run manifest, logs, telemetry, and post-mortem.
Include redaction and the reason evidence must be safe enough to persist.

### Evolution through failures

Use concrete examples from prompt logs, post-mortems, and commits. Include
important discoveries such as:

- workflow approval semantics were not what the first implementation assumed;
- PR existence was not task completion;
- an `Initial plan` commit was not substantive work;
- a zero process exit was not semantic success;
- a review request needed separate positive acknowledgement;
- a completed review could still mean “too many files” or no useful coverage;
- long polling could kill an idle Copilot CLI session;
- mutable PR state required validation against one unchanged head;
- remote-qualified branch names and assumed remote names were unsafe;
- PowerShell pipelines could hide native command failures;
- treatment/control evidence challenged the assumption that more prose memory
  necessarily improves velocity.

Tie each discovery to the mechanism it produced.

### Testing the workflow itself

Explain the progression from real-world battle testing to:

- offline contract tests;
- fake or fixture GitHub responses;
- generated-launcher inspection;
- paired Bash/PowerShell checks;
- simple-math end-to-end campaigns;
- Cargo Tracker end-to-end campaigns;
- treatment/control experiments;
- installed-estate validation;
- portability tests.

Explain why orchestration software needs product-like testing even though its
outputs are AI-driven.

### What another team should copy—and what it should not

Conclude with a reusable construction method. It should be a design playbook,
not shepherd-task installation instructions. Include steps equivalent to:

1. Write down the current human supervisory loop.
2. Separate judgment from mechanical state transitions.
3. Name actors and authority boundaries.
4. Model states, transitions, invariants, and failure outcomes.
5. Choose a durable work/specification unit.
6. Define machine-readable identity and run artifacts early.
7. Bind every assertion to immutable evidence where possible.
8. Make retries resumable and mutations auditable.
9. Preserve evidence safely.
10. Add post-mortems before optimizing.
11. Convert recurring failures into contracts and tests.
12. Run controlled experiments on optional complexity.
13. Version and release the orchestration as a coherent lineup.

Also identify shepherd-task-specific choices that should not be copied
blindly, such as exact stage numbers, exact review budgets, repository-specific
CI exemptions, or the current experimental lesson lifecycle.

## Required document shape

Use a descriptive title such as:

```markdown
# Making shepherd-task: from a manual AI supervision loop to a traceable engineering campaign
```

Use a strong opening that answers Rich’s “silicon” question in the first few
paragraphs.

The exact heading names may vary, but the document must contain:

1. a concise origin story;
2. the original manual workflow;
3. the architectural decomposition and authority model;
4. a chronological evolution with representative dates and commits;
5. detailed discussion of ADRs, spikes, issues, campaigns, and traceability;
6. concrete failure-driven design examples;
7. testing and experimental methodology;
8. an honest treatment of costs and tradeoffs;
9. a practical “build your own” design playbook;
10. a short closing section that distinguishes the transferable method from
    the shepherd-task-specific implementation.

Include at least:

- one compact architecture diagram, state diagram, or layered flow diagram in
  Mermaid;
- one table mapping a recurring human burden or observed failure to the design
  mechanism it produced;
- one chronological table or timeline with representative commits;
- repository-relative path references and representative commit hashes.

Aim for a substantial engineering essay, approximately 3,500-6,000 words.
Prefer clear prose over exhaustive inventory. The document should stand alone,
but link to `README.md` for operating instructions rather than duplicating
them.

## Tone

Write in a direct, reflective engineering voice. Be specific and candid.
Prefer:

- “This failed because… so the design changed to…”
- “The authoritative signal became…”
- “The experiment proved the mechanism but not the claimed benefit…”

Avoid:

- marketing language;
- an uncritical success story;
- anthropomorphic claims about unobservable agent reasoning;
- a release-note-style list of features;
- a tutorial dominated by commands;
- unsupported claims about other teams.

## Completion and verification

Before finishing:

1. Confirm `plugins/shepherd-task/making-of.md` exists and is nonempty.
2. Confirm it is not a duplicate or lightly edited version of
   `plugins/shepherd-task/README.md`.
3. Confirm every major historical claim has local evidence in a path, artifact,
   or commit.
4. Confirm it directly answers Rich’s question about how the workflow was
   created and how another engineer could create their own.
5. Confirm the creator’s four stated motivations are all connected to concrete
   design choices.
6. Confirm the document distinguishes current behavior, historical behavior,
   experiment result, and interpretation.
7. Confirm no unsupported Python-team comparison was introduced.
8. Inspect `git diff -- plugins/shepherd-task/making-of.md` and fix formatting,
   broken local links, chronology errors, or unsupported claims.

Report only the created path and a concise summary of the document’s emphasis.
