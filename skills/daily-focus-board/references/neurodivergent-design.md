# Neurodivergent-friendly design — principles behind the board

This board is built on well-established **executive-function–friendly** design principles —
the same patterns ADHD/EF-aware tools use. It is designed to help *everyone* focus, and to be
genuinely supportive for neurodivergent people. Two ground rules:

- **Don't medicalize or assume.** Never diagnose a user or call it an "ADHD mode." Frame it as
  focus-friendly design for everyone. Every affordance is optional.
- **Neurodivergence is heterogeneous.** "Meet one person with ADHD, and you've met one person with
  ADHD." So these are *configurable supports*, not a prescriptive system.

> Provenance: grounded in established executive-function / ADHD design knowledge from recognized
> sources — see **Sources** at the end of this doc (CHADD for executive function, Simply
> Psychology for body doubling, and W3C/MDN for reduced-motion accessibility). These are
> educational references, not a systematic literature review or clinical guidance.

## Challenge → principle → feature

| Executive-function challenge | Design principle | Feature in the board |
|---|---|---|
| **Task initiation** — starting is the wall (activation energy) | shrink the first step; make "next" obvious | agent behavior: offer one tiny first action; **Focus mode** to surface a single task |
| **Time blindness** — deadlines feel abstract until they're on top of you | make time concrete + visible | live **clock**; gentle **due countdowns** ("2h 10m left"), soft amber when past, never red |
| **Working memory / object permanence** — out of sight, out of mind | keep it visible + externalized | always-on canvas; the **momentum feed** as external memory of the day |
| **Overwhelm** — a long list paralyzes | reduce visible load; one thing at a time | **Focus mode** dims all but one; carryover keeps the list short |
| **Dopamine / reward** — interest- & urgency-driven; needs immediate payoff | instant, visible reward + novelty | progress ring, confetti, momentum feed; **starting counts** (flip to in-progress — the partner can log it in the feed); rotating encouragements |
| **Perfectionism / shame spiral** — miss one → abandon the whole system | no punishment; partial credit; easy defer | **"not today" carryover** (no overdue-shaming); "in progress" counts; carried items leave the ring math |
| **Intrusive thoughts** — a stray thought pulls you off task | frictionless capture, deal with it later | **🧠 brain-dump box** ("park it, keep going") |
| **Task-switching / transitions** | explicit "what's next" handoff | agent behavior: name ONE next action, offer Focus mode |
| **Body-doubling** — focus improves with a present partner | be the other-in-the-room | the whole premise: you drive the board *by talking to your AI partner* |
| **Sensory / motion sensitivity** | calm base, optional stimulation | **reduced-motion toggle** (kills confetti/transitions); honors `prefers-reduced-motion` by default |
| **Self-regulation / interoception** — reacting before noticing your state | *locate yourself* without judgment first | **above/below-the-line check-in** (from Conscious Leadership); below-the-line quietly softens the partner's suggestions |
| **Motivation / self-talk** — a bare to-do list is joyless | a kind, chosen intention | **daily mantra** — self-set or 🔄-suggested, keyed to the check-in (grounding when below, momentum when above) |
| **Prioritization overwhelm** — everything feels equally urgent | separate *important* from *urgent* | **Eisenhower quadrants** (Do first / Schedule / Delegate / Later) + **sort by priority** + a 🧭 plain-language legend |
| **Agency / ownership** — rigid systems get abandoned | let people shape their own tool | **drag-to-reorder** (or ▲/▼ / keyboard), **editable labels**, **add tasks** live (remove the ones you add) |
| **Closure / reflection** — days blur together without a marker | end with a gentle, concrete recap | **end-of-day save** — download or copy a Markdown recap; paste it to the partner to journal and plan tomorrow |

## The most important part is behavior, not chrome

The UI affordances matter, but the biggest EF support is **how the partner shows up**: shrink the
first step, suggest one thing, celebrate starting, never shame an incomplete, offer carryover
freely, park intrusive thoughts, make time concrete, protect against overload. Those are encoded
in `SKILL.md` ("Executive-function-friendly behavior"). A pretty board with a shaming, do-everything
partner would miss the point entirely.

## Sources

Educational references behind the principles above (links verified live 2026-07-27). Not clinical
guidance; neurodivergence is heterogeneous, so treat these as supports to adapt, not rules.

- **Executive function — task initiation, activation energy, time management, working memory** —
  CHADD (Children and Adults with ADHD), the leading ADHD nonprofit:
  - *Executive Function Skills* — https://chadd.org/about-adhd/executive-function-skills/
  - *Executive Function Issues and ADHD* (Brown & Barkley models) —
    https://chadd.org/attention-article/executive-function-issues-and-adhd/
- **Body doubling** — focus improving in the presence of a partner; the board's core premise
  ("drive it by talking to your AI") — Simply Psychology, *Body Doubling and ADHD* —
  https://www.simplypsychology.com/articles/body-doubling-adhd
- **Reduced motion / sensory sensitivity** — behind the reduced-motion toggle and honoring the OS
  `prefers-reduced-motion` setting:
  - MDN, *`prefers-reduced-motion`* —
    https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
  - W3C WCAG 2.1, *Understanding SC 2.3.3: Animation from Interactions* —
    https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- **Above/below the line — "locating yourself"** (the arrival check-in) — The Conscious Leadership
  Group, *Locating Yourself: A Key to Conscious Leadership* —
  https://conscious.is/video/locating-yourself-a-key-to-conscious-leadership
- **Important vs. urgent** (the Eisenhower quadrant labels + "Schedule is where the good work lives"):
  - Asana, *The Eisenhower Matrix* — https://asana.com/resources/eisenhower-matrix
  - Todoist, *The Eisenhower Matrix* — https://todoist.com/productivity-methods/eisenhower-matrix
- **Self-compassion** (the mantra's kind, non-shaming framing) — Dr. Kristin Neff,
  self-compassion.org — https://self-compassion.org/

ADDitude Magazine (additudemag.com) is another widely used, ADHD-focused resource worth searching
for deeper reading on task initiation, time blindness, and body doubling.
