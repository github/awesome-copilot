---
name: shopify-review-triage
description: 'Use this skill when someone wants public Shopify App Store reviews, low-star reviews, or merchant feedback triaged, prioritized, clustered, or turned into a product or support brief. Trigger for prompts like "triage these app store reviews", "what should we fix first from this feedback", "cluster our 1-star reviews", or "write a weekly low-star review brief", for a single Shopify app or a portfolio plus watched competitors. Produces a P0-P3 brief covering incident risk, repeated friction, pricing confusion, feature requests, and an explicit needs-human-read bucket, where every item keeps its public source link and stays labeled first pass or human-checked. Do not trigger for support tickets, order data, or any other private merchant data, and never use it to reply to or contact a reviewer.'
license: MIT
compatibility: 'Cross-platform. Pure reasoning skill over review rows the user pastes - no network access, scripts, API keys, or system packages. Portable to any client that supports the Agent Skills SKILL.md format.'
metadata:
  version: '1.0'
  author: 'Shopify App Review Brief - independent, not affiliated with or endorsed by Shopify Inc.'
  source: https://alfredtech2026.github.io/shopify-app-review-brief/guides/shopify-app-review-triage.html
---

# Shopify review triage - public low-star reviews to a P0-P3 brief

## What this does

Takes rows of **public** Shopify App Store review text and produces one prioritized brief a
product or support owner can act on: what kind of problem each review describes, how badly it
can hurt, what to do first, and where the original wording came from.

It is built for independent Shopify app teams and the agencies that run their support - the
case where low-star reviews arrive scattered across several listings plus a few watched
competitors, and the failure mode is treating them all as equally urgent.

The rubric below is not invented here. It reproduces a publicly published rule set verbatim, so
a manual pass and this skill sort the same row the same way. See [Provenance](#provenance) for
the source.

## Hard rules

These are not style preferences. Breaking one makes the output worse than nothing.

1. **Public review text only.** Never accept, request, or copy support tickets, merchant emails,
   order data, personal contact details, internal telemetry, or anything else not already public
   on a listing page. If such data appears in the input, stop, say which rows are affected, and
   ask for them to be removed before continuing.
2. **Never invent evidence.** Do not write a review, a rating, a date, an app name, or a source
   URL that was not supplied. A row with no link gets `source: not captured` - never a guessed one.
3. **Keyword output is a sort, not a verdict.** Everything produced by the rubric alone is
   labeled *first pass - not human-checked*. Only a person who read the review and checked it
   against their own systems may relabel an item *human-checked*.
4. **Reviews are customer reports, not verified defects.** Write "the reviewer reports the editor
   showed a blank screen", never "the editor is broken". The distinction survives into the brief.
5. **No coverage claims.** The brief covers exactly the rows supplied and says so. Make no claim
   of exhaustive coverage of a listing, a period, or an app.
6. **No promises.** No revenue impact, no outcome, no ranking effect, no legal or compliance
   advice. Suggest actions; do not predict results.
7. **Draft only - never contact anyone.** Do not send email, post a developer reply, open a
   support ticket, message a reviewer, or publish anything. Hand the draft back to the team and
   let a person decide what to send.
8. **Reviewers are people.** Refer to "the reviewer". Do not name, profile, or speculate about them.

## 1. Collect the rows

Ask for one review per line. The full form keeps the source link, which the brief needs:

```text
rating | app name | review date | public reviews URL | review text
```

A shorter three-field form is also accepted - treat field 1 as the rating when it is a bare 1-5
(optionally followed by `star` or `stars`), otherwise as the app name:

```text
rating | app name | review text
```

Rules for this step:

- Lines starting with `#` are comments. Blank lines are skipped.
- If a row lacks a source URL, carry `source: not captured` through to the brief. Do not drop
  the row and do not fabricate a link.
- Do not go and fetch anything yourself. This skill needs no network access; the person you are
  helping pastes the public rows they already opened.
- The trigger this rubric is tuned for is a **new 1-3-star review**. Higher-rated rows still
  classify correctly (a 5-star review often lands in feature requests or needs-human-read), so
  keep them if they were supplied, but never present them as low-star signal.

## 2. First pass - apply the rubric

Lower-case the review text and normalize curly apostrophes (`’` to `'`) before matching, so a
pasted "won’t load" still matches `won't load`. Also match every keyword below with the
apostrophe dropped entirely: merchants routinely type these contractions without one, and the
apostrophe-free spelling must classify exactly the same as the contracted form.

Five buckets. Each row gets exactly **one primary** bucket - the first dimension below, in this
order, with any matching keyword. Further matches are recorded as **secondary**, never as a
second brief item.

### P0 - Incident risk

The purchase path, app activation, or merchant data may be at stake right now. Left alone it
costs the merchant money and the team installs.

**Suggested action.** Try to reproduce on a test store today. If confirmed, treat it as an
incident: fix or mitigate first, then reply to the reviewer with what changed.

**Signal keywords.** `won't load`, `won't open`, `won't close`, `can't close`, `cannot close`, `blank screen`, `broken`, `crash`, `stopped working`, `not working`, `doesn't work`, `does not work`, `checkout`, `losing sales`, `lost sales`, `error`

### P1 - Repeated friction

The product works, but the same struggle keeps showing up across reviews or against an open
support theme. Repetition is the signal, not volume of adjectives.

**Suggested action.** Log it against the matching support theme. If the same complaint repeats
across rows, schedule a UX fix ahead of new feature work.

**Signal keywords.** `confusing`, `unclear`, `hard to`, `difficult`, `complicated`, `clunky`, `slow`, `couldn't figure`, `could not figure`, `annoying`, `had to contact support`, `setup took`, `too many steps`

### P2 - Pricing confusion

What the merchant expected to pay and what happened diverged. Usually a copy problem in the
listing, the plan limits, or the upgrade prompts - not a code problem.

**Suggested action.** Compare what the reviewer expected with the listing's pricing section and
in-app upgrade prompts; clarify the copy where they diverge.

**Signal keywords.** `pricing`, `price`, `charged`, `charge`, `billing`, `billed`, `expensive`, `free plan`, `trial`, `refund`, `hidden fee`, `hidden cost`, `paywall`

### P3 - Feature request

The merchant wants something the app does not do, or could not find. Valuable as a log entry,
rarely urgent on its own.

**Suggested action.** Add it to the feature-request log with a link to the review. If the
capability already exists, reply to the reviewer with where to find it.

**Signal keywords.** `wish`, `would be great`, `would love`, `please add`, `feature request`, `missing`, `if only`, `would like`, `no option to`, `needs an option`, `hope you add`, `add support for`

### Needs human read

No keyword matched. Vague frustration, sarcasm, mixed praise, or a story that needs context.

**Suggested action.** No keyword matched. Read the full review yourself and file it manually -
the heuristic makes no guess here.

**Priority.** The rubric labels this bucket `P2` and sorts it last. Treat that label as
provisional placement in the queue, not as a severity judgment - nothing has been judged yet.

### Tie-breaks and escalation

1. **Most severe wins.** A row naming both a broken checkout and a billing surprise files under
   P0 with pricing noted as secondary. Never split one review across two brief items.
2. **Repetition escalates.** If the same friction or pricing theme appears in three or more
   reviews within about 60 days, move it up one level and say how many rows drove the change.
3. **Age discounts.** A review older than a year is background, not evidence of a current
   problem, unless a recent row corroborates it. Cite it as context, never as the headline.
4. **Competitor reviews never create a P0 for you.** A competitor's incident is roadmap,
   positioning, or copy input - it belongs in the competitor watch section.
5. **When unsure, choose needs human read.** The bucket exists so the rubric never launders
   uncertainty into a priority label.

## 3. Human pass - verify before you promote anything

The first pass is where this skill stops being able to help on its own. Before any item is
presented as more than a keyword match, a person on the team has to:

- read the full original review at its source link;
- for P0 candidates, attempt to reproduce on a development store and check the error tracker and
  support inbox for matching signals from the same period;
- record the outcome as *reproduced*, *not reproduced*, or *attempted - notes attached*.

Ask for these outcomes rather than assuming them. Until you have them, every item stays labeled
*first pass - not human-checked*, including in the summary line. An unverified P0 is a candidate,
not an incident.

Known limits to state plainly when they apply: keyword matching is English-only, misses sarcasm
and context, can misfile a review that mentions "checkout" in passing, and sees only the rows
supplied.

## 4. Write the brief

One document per portfolio, sections in rubric order, every item carrying an owner, a next
action, and a source link. An item without an owner is a note, not a brief entry.

```markdown
# Low-star review brief - {portfolio or team name} - week of {YYYY-MM-DD}

Scope: {apps monitored} - {competitors watched} - {N} rows supplied, {date range}.
Covers only the rows supplied - no claim of exhaustive coverage.
Reviews are customer reports, not verified defects. Items marked "first pass" are
unverified keyword matches; "human-checked" means a person read the review and checked it.

## P0 - Incident risk
- **{App} - {signal in a few words}** ({rating} stars, {review date}, [source]({public reviews URL}))
  - Reviewer reports: {one sentence, in their words where possible}
  - Status: first pass - not human-checked / human-checked
  - Reproduced: {yes / no / attempted - notes}
  - Next action: {action} - owner {name}, due {date}

## P1 - Repeated friction
- **{App} - {theme}** ({rating} stars, {date}, [source]({public reviews URL}); also seen: {where})
  - Status: first pass - not human-checked / human-checked
  - Next action: {UX or docs change} - owner {name}, due {date}

## P2 - Pricing confusion
- **{App} - {signal}** ({rating} stars, {date}, [source]({public reviews URL}))
  - Expected vs. actual: {one line}
  - Status: first pass - not human-checked / human-checked
  - Next action: {copy or prompt change} - owner {name}, due {date}

## P3 - Feature requests
- **{App} - {request}** ({rating} stars, {date}, [source]({public reviews URL})) - {log it, or already exists so reply with where to find it}

## Needs human read
- **{App}** ({rating} stars, {date}, [source]({public reviews URL})) - {no keyword matched; what a human should look for}

## Competitor watch
- **{Competitor} - {signal}**: {what it implies for our roadmap, copy, or positioning}

## Decisions this week
- {one decision or experiment, with the rows that motivated it}
```

Open the summary line with the counts, e.g. *"Triaged 8 rows supplied: 3 incident risk,
2 repeated friction, 1 pricing confusion, 1 feature request, 1 needs human read - first pass,
not human-checked."*

## 5. Self-check before you hand it over

Refuse to deliver until every line is true:

- [ ] Every item names its bucket and priority from the rubric above, and nothing else.
- [ ] Every item carries a source link or an explicit `source: not captured`.
- [ ] No review text, rating, date, app name, or URL appears that was not supplied.
- [ ] Every unverified item says *first pass - not human-checked*; nothing claims a human check
      that did not happen.
- [ ] Claims are phrased as reports ("the reviewer reports..."), not as findings about the code.
- [ ] The scope line says how many rows were supplied and makes no coverage claim.
- [ ] No promise about revenue, ratings, outcomes, or compliance appears anywhere.
- [ ] No private data survived into the output.
- [ ] Nothing was sent, posted, or published - the brief is a draft for the team.

## Worked example

These eight fictional rows exercise every bucket. Two of them are deliberately 4-star and
5-star, to reach the feature-request and needs-human-read buckets.

```text
1 | Example Popup App | The editor shows a blank screen and the popup won't load. We are losing sales every day.
2 | Example Popup App | The overlay can't close on mobile and it blocks the checkout button.
1 | Example Currency App | Conversion is broken at checkout and we were still billed for the month.
3 | Example Currency App | Setup took hours and the settings screen is confusing. Support was slow to reply.
3 | Example Reviews App | The widget looks fine but the template editor is confusing and hard to use on a tablet.
2 | Example Currency App | We kept getting charged after uninstalling, and the pricing page never mentioned this.
4 | Example Reviews App | Great app, but I wish it could export reviews to CSV. Please add filtering by country.
5 | Example Reviews App | Does what it promises and support replied the same day.
```

First pass over those rows:

```text
row 1 -> P0 incident risk
row 2 -> P0 incident risk
row 3 -> P0 incident risk (secondary: pricing confusion)
row 4 -> P1 repeated friction
row 5 -> P1 repeated friction
row 6 -> P2 pricing confusion
row 7 -> P3 feature request
row 8 -> needs human read
```

Rows 4 and 5 both matched `confusing`, so they are flagged as a repeated theme - two rows, which
is a cluster to watch, not yet the three that trigger escalation. Row 3 is a single P0 item with
pricing recorded as secondary, never two items. Row 8 matched nothing and stays unjudged. None of
these rows carried a source URL, so each item would read `source: not captured` until the team
supplies the listing links.

## Gotchas

- **The Shopify App Store has no stable per-review permalink.** Cite the listing's public reviews
  page, keep the rating filter if one was used (`.../reviews?ratings%5B%5D=1`), and pin the item
  with the review date plus the reviewer's first few words so a human can find it again.
- **Prefer the five-field input form.** It carries the review date and the source URL the brief
  needs. A three-field parser folds everything after the second `|` into the review text, so a
  row carrying a date and a URL still classifies but displays them inside the quoted review.
- **`checkout` is the noisiest keyword in the set.** It fires on "we love the checkout upsell".
  A P0 whose only evidence is the word `checkout` is a needs-human-read row wearing a P0 badge -
  say so instead of promoting it.
- **`missing` and `error` cross buckets.** "missing a dark mode" is P3; "settings page errors out"
  is P0. Primary-bucket order resolves the collision mechanically; the human pass fixes the ones
  where it guessed wrong.
- **Non-English reviews will not match at all.** They land in needs human read. That is the
  correct outcome - do not translate and then classify as if the keyword had matched.
- **A competitor's P0 is not yours.** It goes to competitor watch even when the wording is worse
  than anything on the team's own listings.
- **One review, one item.** Secondary matches are annotations. Splitting a review across sections
  double-counts the same merchant and inflates every count in the summary line.

## Provenance

The dimensions, priorities, keyword lists, suggested actions, tie-break rules, and brief template
reproduced above come from a publicly published manual triage guide:
<https://alfredtech2026.github.io/shopify-app-review-brief/guides/shopify-app-review-triage.html>

That guide is maintained independently and is not affiliated with, endorsed by, or sponsored by
Shopify Inc. or any app developer. Shopify is a trademark of Shopify Inc.
