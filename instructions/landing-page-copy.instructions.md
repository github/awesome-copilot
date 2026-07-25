---
applyTo: '**'
description: 'Deterministic rules for writing landing page hero copy (headline, subheadline, CTA) that does not read as machine-generated, derived from a measured corpus of 239 real product landing pages. Covers hype-word penalties, the specificity rule, filler nouns, headline length and CTA verbs.'
---

# Landing Page Hero Copy

Rules for generating or reviewing the **hero block** of a landing page: headline, subheadline, primary CTA. Apply when editing marketing pages, README taglines, product page components, `og:description` values or app store blurbs.

This is a style linter, **not** an authorship detector. It scores surface patterns that make copy read as generic. A careful human writes hype too, and careful generated copy can pass every rule here.

## The one rule that matters most

**Put at least one concrete number in the hero.** In a corpus of 239 scraped product landing pages, **195 (82%) contained no digit anywhere in the hero block.** It is the single most common weakness and the fastest one to fix.

- Bad: "Save time on invoicing"
- Good: "Cut invoice time from 3 days to 20 minutes"

If no honest number exists, use a proof-shaped word instead (`%`, `2x`, `no`, `zero`, `hours`) — but never invent a figure. Fabricated metrics are worse than vague copy.

## Banned by default

**Hype verbs and adjectives.** Remove on sight unless the user explicitly asks for them:

`revolutionize`, `unlock`, `seamless`, `leverage`, `supercharge`, `cutting-edge`, `game-changer`, `transform`, `empower`, `elevate`, `unleash`, `harness`, `next-generation`, `state-of-the-art`, `best-in-class`, `world-class`

**Filler nouns.** These add length, not meaning. Each one can be deleted or replaced with the specific thing:

`solutions`, `platform`, `powerful`, `amazing`, `experience`, `journey`, `ecosystem`, `all-in-one`, `robust`, `innovative`, `comprehensive`, `cutting edge`, `synergy`

- "Our powerful platform delivers comprehensive solutions" → name the actual output: "Turns a spreadsheet into a client-ready invoice"

**Punctuation and casing noise.** No exclamation marks. No emoji inside hero copy. No ALL-CAPS words for emphasis. Each is a strong generated-copy signal and none survives a translation or a screen reader well.

## Shape constraints

- **Headline: 3–10 words.** Above 12 words it stops functioning as a headline. Below 3 it carries no information.
- **Subheadline: one sentence**, stating what the product does concretely — not why it matters emotionally.
- **CTA: a specific verb naming the action.** Replace `Submit`, `Learn more`, `Get started`, `Sign up`, `Click here`, `Try it now` with the actual first step: "Start your first invoice", "Score my copy", "Import a CSV".

## Do not over-correct

- An em dash is **not** a reliable generated-text signal. Plenty of human editorial style uses it. Do not strip em dashes to make copy "sound human" — that is cargo culting and it damages good prose.
- Density of tells matters more than any single word. One instance of `platform` in an otherwise specific hero is fine.
- Never rewrite a claim to be more specific than the source material supports. If specificity requires a fact you do not have, say so and ask the user for the number.

## Review checklist

When asked to review hero copy, report findings as counts, not verdicts:

1. Digits present in the hero block? (yes/no)
2. Hype terms — list each with its position
3. Filler nouns — list each
4. Headline word count
5. CTA — specific action or generic phrase?
6. Exclamation marks / emoji / ALL-CAPS count

State the fix for each finding. Do not output an overall "this was written by AI" judgement — the rules above measure style, not origin.

## Provenance

The word lists, the 82% figure and the weighting above come from an open dataset of 239 product landing pages scored with an open-source deterministic scorer. Dataset (CSV + methodology, including the 303 → 239 exclusion criteria) and the scorer are public:

- Dataset: <https://gist.github.com/parweb/5ed569ba76c365f7b789a979ad6090e7>
- Scorer and rule source: <https://github.com/parweb/landing-copy-grader>
