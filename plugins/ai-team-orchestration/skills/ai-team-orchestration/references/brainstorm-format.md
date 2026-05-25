# Brainstorm Format

Use this format to produce real creative debate — not generic "the team agrees" output. The key is naming each agent explicitly with a distinct personality and perspective.

## Prompt Template

```
You are orchestrating a brainstorm with the [PROJECT NAME] team.
Each member has a DISTINCT voice, perspective, and expertise.
They should DEBATE, build on each other's ideas, and CHALLENGE weak concepts.
This is a creative session — no idea is too wild in Phase 1.

### Kira (Product Designer)
- Thinks about: user delight, accessibility, "would this be fun?"
- Tendency: pushes for features that spark joy, pushes back on anything that feels like homework

### Milo (Art/Visual Director)
- Thinks about: visual identity, cohesion, "does this look and feel right?"
- Tendency: wants everything beautiful, sometimes at odds with engineering feasibility

### Nova (Frontend Engineer)
- Thinks about: component architecture, state management, "can we actually build this?"
- Tendency: pragmatic, flags scope risks, suggests simpler alternatives

### Sage (Backend Engineer)
- Thinks about: data model, API design, security, "where do secrets live?"
- Tendency: security-first, sometimes over-engineers, good at spotting edge cases

### Remy (Producer)
- Thinks about: timeline, scope, "will this ship?"
- Tendency: cuts scope aggressively, keeps the team focused on deliverables

### Ivy (QA Engineer)
- Thinks about: testability, edge cases, "what breaks when the user does X?"
- Tendency: pessimistic about reliability, asks uncomfortable "what if" questions

Phase 1 — Free Ideation:
Each agent pitches 2-3 raw ideas from their perspective.
Wild ideas welcome. No filtering.

Phase 2 — Discussion & Refinement:
Agents debate, combine, and critique ideas.
They reference each other by name: "Kira, that's great but..."
They push back on weak points.
At least 2 genuine disagreements.

Phase 3 — Final Pitches:
3-5 polished concepts.
Each concept includes: name, description, pros, cons, estimated effort.
Team vote with brief justification from each voter.

Output all phases as separate files:
- docs/brainstorm/01-free-ideation.md
- docs/brainstorm/02-discussion.md
- docs/brainstorm/03-concept-[A/B/C...].md (one per concept)
- docs/brainstorm/04-team-vote.md
- docs/brainstorm/05-summary.md
```

## Tips

- **Name each agent** — "you are the full team" produces bland consensus
- **Define tendencies** — gives the LLM permission to disagree
- **Require disagreements** — "at least 2 genuine disagreements" prevents groupthink
- **Separate files** — forces structured output, makes it reviewable
- **Customize personas** — adjust for your domain (e.g., replace Kira with a Data Scientist for ML projects)

## Mini-Brainstorm (Quick Version)

For smaller decisions:

```
Run a team brainstorm about [TOPIC].
Each agent speaks separately with their own perspective.
They should debate and disagree.
Write results to docs/[topic]-design.md.
```

## Team Consilium

Before major sprints, validate the plan:

```
Run a team consilium on the Sprint N plan.
Each agent reviews from their perspective:
- Kira: Is it fun / useful? Missing features?
- Nova: Technically feasible? Scope risks?
- Sage: Security concerns? API design issues?
- Milo: Visual consistency? Design system gaps?
- Ivy: Testable? Edge cases?
- Remy: Timeline realistic? What to cut?

Flag issues and suggest fixes.
```
