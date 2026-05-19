# vibe-coding

Discipline plugin for vibe-driven development. Turns mood, feel, and outcome-shaped requests — "make it feel snappy", "vibe-code a dashboard", "like Linear but cozy", "build me something that does X, you figure out the rest" — into shippable code without the usual drift, hallucinated APIs, and silent scope creep.

The plugin is intentionally small. It does one thing: it keeps vibe coding honest from the first prompt to the first runnable slice.

## What's Included

| Component | Type | Role |
|---|---|---|
| [`vibe-coder`](../../skills/vibe-coder/) | Skill (entry) | Captures the vibe as a four-line Vibe Lock, enforces the runnable-slice rhythm, names the failure modes |
| [`graphic-designer`](../../skills/graphic-designer/) | Skill | Translates `Feel` into palette, type, layout, motion, and accessibility decisions |
| [`quasi-coder`](../../skills/quasi-coder/) | Skill | Translates shorthand, pseudo-code, and mixed-language fragments into idiomatic code in the locked stack |
| [`noob-mode`](../../skills/noob-mode/) | Skill (middleware) | Plain-English layer for non-technical collaborators — see [How `noob-mode` Fits In](#how-noob-mode-fits-in) |

## Typical Flow

1. **Collaborator sends a vibey request.** `vibe-coder` writes the four-line Vibe Lock and waits for "lock it".
2. **Once locked**, `vibe-coder` decides what to dispatch:
   - UI taste work → `graphic-designer`
   - Shorthand, `()=>` fragments, mixed-language code, or stack-selection → `quasi-coder`
   - Everything else → handled by `vibe-coder` itself
3. **First runnable slice ships.** No styling pass, no second feature.
4. **Re-confirm the Vibe Lock** before slice two.

## How `noob-mode` Fits In

`noob-mode` is wired in as a middleware skill, not a parallel one. It activates based on the collaborator's apparent technical fluency, not the request's content.

- **~50% confidence the writer is not fluent in computer science, programming, or related topics:** Ease into `noob-mode`. Mirror its plain-English phrasing without naming it. Drop jargon where a short phrase would do. Keep the four-line Vibe Lock — non-technical collaborators benefit from it more than anyone — but explain each field in one sentence the first time.
- **Blatantly obvious the writer has no technical background:** Respond fully per the `noob-mode` skill. Use it as a collaborator that sits between this plugin and the writer — every output from `vibe-coder`, `graphic-designer`, or `quasi-coder` is paraphrased through `noob-mode` before it reaches the writer. Approval prompts, error messages, and technical output get color-coded risk indicators per the skill's spec.
- **Writer is clearly technical:** Do not engage `noob-mode`. Plain output.

Signals that raise the noob-mode probability:

- Use of vague verbs for technical actions ("make it go", "hook it up")
- Confusion between adjacent concepts (file vs. folder, function vs. variable, repo vs. branch)
- Requests phrased as outcomes with no mechanism ("I want a website that does this")
- Apologetic framing about not understanding code
- Asking what an error message means

Signals that lower it:

- Naming languages, frameworks, or packages correctly
- Reading or modifying code in the prompt
- Using domain terms (PR, diff, stash, async, type) accurately

## Installation

In this repository, the plugin is laid out per the awesome-copilot spec:

```
plugins/vibe-coding/
└── .github/plugin/plugin.json
skills/
├── vibe-coder/
├── graphic-designer/
├── quasi-coder/
└── noob-mode/
```

## When to Invoke This Plugin

`vibe-coding` is not meant to load automatically. Reach for it deliberately, in the moments when you want an AI agent to carry the parts of building software you do not want to carry yourself — picking the stack, naming the look and feel, translating a rough idea into working code, deciding what "done enough" means for the first slice.

Summon it by opening a request with the vibe in plain language ("vibe-code me a…", "make it feel like…", "build something that does X") or by naming `vibe-coder` directly. The plugin then takes over the discipline pieces — locking the vibe, choosing the right skill, shipping one runnable slice at a time — so you can stay focused on the outcome instead of the mechanics.

## When to Use This Plugin

- Describe software by feel rather than spec
- Compare to existing products ("like Linear but warmer")
- Skip the stack decision and want a recommendation
- Mix UI taste and code in the same ask
- Paste shorthand, `()=>` markers, or pseudo-code without a target language
- Prototype heavily and need discipline rather than ceremony

Do not install it for teams that already work from formal specs, ADRs, or strict design tokens — those teams have the discipline built in elsewhere.

## What This Plugin Adds Beyond a Frontier Model

Each component is targeted at a specific failure mode a frontier model exhibits when handed a vibe:

| Failure mode | Component that addresses it |
|---|---|
| Silently rewrites the goal mid-generation | `vibe-coder` — Vibe Lock checkpoint |
| Ships a 500-line file when one runnable slice would do | `vibe-coder` — runnable-slice rule |
| Produces a UI that contradicts the stated feel | `graphic-designer` — derives palette/type/motion from `Feel` |
| Translates shorthand into broken polyglot code | `quasi-coder` — idiomatic single-target translation |
| Speaks fluent jargon to a non-technical user | `noob-mode` — middleware paraphrase |

## License

MIT. See the awesome-copilot repository for full license terms.
