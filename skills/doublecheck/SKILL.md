---
name: doublecheck
description: 'Three-layer verification pipeline for AI output. Extracts verifiable claims, finds supporting or contradicting sources via web search, runs adversarial review for hallucination patterns, and produces a structured verification report with source links for human review.'
---

# Doublecheck

Run a three-layer verification pipeline on AI-generated output. The goal is not to tell the user what is true -- it is to extract every verifiable claim, find sources the user can check independently, and flag anything that looks like a hallucination pattern.

## Activation

Doublecheck operates in two modes: **active mode** (persistent) and **one-shot mode** (on demand).

### Active Mode

When the user invokes this skill without providing specific text to verify, activate persistent doublecheck mode. Respond with:

> **Doublecheck is now active.** I'll verify factual claims in my responses before presenting them. You'll see an inline verification summary after each substantive response. Say "full report" on any response to get the complete three-layer verification with detailed sourcing. Turn it off anytime by saying "turn off doublecheck."

Then follow ALL of the rules below for the remainder of the conversation:

**Rule: Classify every response before sending it.**

Before producing any substantive response, determine whether it contains verifiable claims. Classify the response:

| Response type | Contains verifiable claims? | Action |
|--------------|---------------------------|--------|
| Factual analysis, legal guidance, regulatory interpretation, compliance guidance, or content with case citations or statutory references | Yes -- high density | Run full verification report (see high-stakes content rule below) |
| Summary of a document, research, or data | Yes -- moderate density | Run inline verification on key claims |
| Code generation, creative writing, brainstorming | Rarely | Skip verification; note that doublecheck mode doesn't apply to this type of content |
| Casual conversation, clarifying questions, status updates | No | Skip verification silently |

**Rule: Inline verification for active mode.**

When active mode applies, do NOT generate a separate full verification report for every response. Instead, embed verification directly into your response using this pattern:

1. Generate your response normally.
2. After the response, add a `Verification` section.
3. In that section, list each verifiable claim with its confidence rating and a source link where available.

Format:

```
---
**Verification (N claims checked)**

- [VERIFIED] "Claim text" -- Source: [URL]
- [VERIFIED] "Claim text" -- Source: [URL]
- [PLAUSIBLE] "Claim text" -- no specific source found
- [FABRICATION RISK] "Claim text" -- could not find this citation; verify before relying on it
```

For active mode, prioritize speed. Run web searches for citations, specific statistics, and any claim you have low confidence about. You do not need to search for claims that are common knowledge or that you have high confidence about -- just rate them PLAUSIBLE and move on.

If any claim rates DISPUTED or FABRICATION RISK, call it out prominently before the verification section so the user sees it immediately. When auto-escalation applies (see below), place this callout at the top of the full report, before the summary table:

```
**Heads up:** I'm not confident about [specific claim]. I couldn't find a supporting source. You should verify this independently before relying on it.
```

**Rule: Auto-escalate to full report for high-risk findings.**

If your inline verification identifies ANY claim rated DISPUTED or FABRICATION RISK, do not produce inline verification. Instead, place the "Heads up" callout at the top of your response and then produce the full three-layer verification report using the template in `assets/verification-report-template.md`. The user should not have to ask for the detailed report when something is clearly wrong.

**Rule: Full report for high-stakes content.**

If the response contains legal analysis, regulatory interpretation, compliance guidance, case citations, or statutory references, always produce the full verification report using the template in `assets/verification-report-template.md`. Do not use inline verification for these content types -- the stakes are too high for the abbreviated format.

**Rule: Discoverability footer for inline verification.**

When producing inline verification (not a full report), always append this line at the end of the verification section:

```
_Say "full report" for detailed three-layer verification with sources._
```

**Rule: Offer full verification on request.**

If the user says "full report," "run full verification," "verify that," "doublecheck that," or similar, run the complete three-layer pipeline (described below) and produce the full report using the template in `assets/verification-report-template.md`.

### One-Shot Mode

When the user invokes this skill and provides specific text to verify (or references previous output), run the complete three-layer pipeline and produce a full verification report using the template in `assets/verification-report-template.md`.

### Deactivation

When the user says "turn off doublecheck," "stop doublecheck," or similar, respond with:

> **Doublecheck is now off.** I'll respond normally without inline verification. You can reactivate it anytime.

---

## Layer 1: Self-Audit

Re-read the target text with a critical lens. Your job in this layer is extraction and internal analysis -- no web searches yet.

### Step 1: Extract Claims

Go through the target text sentence by sentence and pull out every statement that asserts something verifiable. Categorize each claim:

| Category | What to look for | Examples |
|----------|-----------------|---------|
| **Factual** | Assertions about how things are or were | "Python was created in 1991", "The GPL requires derivative works to be open-sourced" |
| **Statistical** | Numbers, percentages, quantities | "95% of enterprises use cloud services", "The contract has a 30-day termination clause" |
| **Citation** | References to specific documents, cases, laws, papers, or standards | "Under Section 230 of the CDA...", "In *Mayo v. Prometheus* (2012)..." |
| **Entity** | Claims about specific people, organizations, products, or places | "OpenAI was founded by Sam Altman and Elon Musk", "GDPR applies to EU residents" |
| **Causal** | Claims that X caused Y or X leads to Y | "This vulnerability allows remote code execution", "The regulation was passed in response to the 2008 financial crisis" |
| **Temporal** | Dates, timelines, sequences of events | "The deadline is March 15", "Version 2.0 was released before the security patch" |

Assign each claim a temporary ID (C1, C2, C3...) for tracking through subsequent layers.

### Step 2: Check Internal Consistency

Review the extracted claims against each other:
- Does the text contradict itself anywhere? (e.g., states two different dates for the same event)
- Are there claims that are logically incompatible?
- Does the text make assumptions in one section that it contradicts in another?

Flag any internal contradictions immediately -- these don't need external verification to identify as problems.

### Step 3: Initial Confidence Assessment

For each claim, make an initial assessment based only on your own knowledge:
- Do you recall this being accurate?
- Is this the kind of claim where models frequently hallucinate? (Specific citations, precise statistics, and exact dates are high-risk categories.)
- Is the claim specific enough to verify, or is it vague enough to be unfalsifiable?

Record your initial confidence but do NOT report it as a finding yet. This is input for Layer 2, not output.

---

## Layer 2: Source Verification

For each extracted claim, search for external evidence. The purpose of this layer is to find URLs the user can visit to verify claims independently.

### Search Strategy

For each claim:

1. **Formulate a search query** that would surface the primary source. For citations, search for the exact title or case name. For statistics, search for the specific number and topic. For factual claims, search for the key entities and relationships.

2. **Run the search** using `web_search`. If the first search doesn't return relevant results, reformulate and try once more with different terms.

3. **Evaluate what you find:**
   - Did you find a primary or authoritative source that directly addresses the claim?
   - Did you find contradicting information from a credible source?
   - Did you find nothing relevant? (This is itself a signal -- real things usually have a web footprint.)

4. **Record the result** with the source URL. Always provide the URL even if you also summarize what the source says.

### What Counts as a Source

Prefer primary and authoritative sources:
- Official documentation, specifications, and standards
- Court records, legislative texts, regulatory filings
- Peer-reviewed publications
- Official organizational websites and press releases
- Established reference works (encyclopedias, legal databases)

Note when a source is secondary (news article, blog post, wiki page) vs. primary. The user can weigh accordingly.

### Handling Citations Specifically

Citations are the highest-risk category for hallucinations. For any claim that cites a specific case, statute, paper, standard, or document:

1. Search for the exact citation (case name, title, section number).
2. If you find it, confirm the cited content actually says what the target text claims it says.
3. If you cannot find it at all, flag it as FABRICATION RISK. Models frequently generate plausible-sounding citations for things that don't exist.

---

## Layer 3: Adversarial Review

Switch your posture entirely. In Layers 1 and 2, you were trying to understand and verify the output. In this layer, **assume the output contains errors** and actively try to find them.

### Hallucination Pattern Checklist

Check for these common patterns:

1. **Fabricated citations** -- The text cites a specific case, paper, or statute that you could not find in Layer 2. This is the most dangerous hallucination pattern because it looks authoritative.

2. **Precise numbers without sources** -- The text states a specific statistic (e.g., "78% of companies...") without indicating where the number comes from. Models often generate plausible-sounding statistics that are entirely made up.

3. **Confident specificity on uncertain topics** -- The text states something very specific about a topic where specifics are genuinely unknown or disputed. Watch for exact dates, precise dollar amounts, and definitive attributions in areas where experts disagree.

4. **Plausible-but-wrong associations** -- The text associates a concept, ruling, or event with the wrong entity. For example, attributing a ruling to the wrong court, assigning a quote to the wrong person, or describing a law's provision incorrectly while getting the law's name right.

5. **Temporal confusion** -- The text describes something as current that may be outdated, or describes a sequence of events in the wrong order.

6. **Overgeneralization** -- The text states something as universally true when it applies only in specific jurisdictions, contexts, or time periods. Common in legal and regulatory content.

7. **Missing qualifiers** -- The text presents a nuanced topic as settled or straightforward when significant exceptions, limitations, or counterarguments exist.

### Adversarial Questions

For each major claim that passed Layers 1 and 2, ask:
- What would make this claim wrong?
- Is there a common misconception in this area that the model might have picked up?
- If I were a subject matter expert, would I object to how this is stated?
- Is this claim from before or after my training data cutoff, and might it be outdated?

### Red Flags to Escalate

If you find any of these, flag them prominently in the report:
- A specific citation that cannot be found anywhere
- A statistic with no identifiable source
- A legal or regulatory claim that contradicts what authoritative sources say
- A claim that has been stated with high confidence but is actually disputed or uncertain

---

## Producing the Verification Report

After completing all three layers, produce the report using the template in `assets/verification-report-template.md`.

### Confidence Ratings

Assign each claim a final rating:

| Rating | Meaning | What the user should do |
|--------|---------|------------------------|
| **VERIFIED** | Supporting source found and linked | Spot-check the source link if the claim is critical to your work |
| **PLAUSIBLE** | Consistent with general knowledge, no specific source found | Treat as reasonable but unconfirmed; verify independently if relying on it for decisions |
| **UNVERIFIED** | Could not find supporting or contradicting evidence | Do not rely on this claim without independent verification |
| **DISPUTED** | Found contradicting evidence from a credible source | Review the contradicting source; this claim may be wrong |
| **FABRICATION RISK** | Matches hallucination patterns (e.g., unfindable citation, unsourced precise statistic) | Assume this is wrong until you can confirm it from a primary source |

### Report Principles

- Provide links, not verdicts. The user decides what's true, not you.
- When you found contradicting information, present both sides with sources. Don't pick a winner.
- If a claim is unfalsifiable (too vague or subjective to verify), say so. "Unfalsifiable" is useful information.
- Be explicit about what you could not check. "I could not verify this" is different from "this is wrong."
- Group findings by severity. Lead with the items that need the most attention.

### Limitations Disclosure

Always include this at the end of the report:

> **Limitations of this verification:**
> - This tool accelerates human verification; it does not replace it.
> - Web search results may not include the most recent information or paywalled sources.
> - The adversarial review uses the same underlying model that may have produced the original output. It catches many issues but cannot catch all of them.
> - A claim rated VERIFIED means a supporting source was found, not that the claim is definitely correct. Sources can be wrong too.
> - Claims rated PLAUSIBLE may still be wrong. The absence of contradicting evidence is not proof of accuracy.

---

## Domain-Specific Guidance

### Legal Content

Legal content carries elevated hallucination risk because:
- Case names, citations, and holdings are frequently fabricated by models
- Jurisdictional nuances are often flattened or omitted
- Statutory language may be paraphrased in ways that change the legal meaning
- "Majority rule" and "minority rule" distinctions are often lost

For legal content, give extra scrutiny to: case citations, statutory references, regulatory interpretations, and jurisdictional claims. Search legal databases when possible.

### Medical and Scientific Content

- Check that cited studies actually exist and that the results are accurately described
- Watch for outdated guidelines being presented as current
- Flag dosages, treatment protocols, or diagnostic criteria -- these change and errors can be dangerous

### Financial and Regulatory Content

- Verify specific dollar amounts, dates, and thresholds
- Check that regulatory requirements are attributed to the correct jurisdiction and are current
- Watch for tax law claims that may be outdated after recent legislative changes

### Technical and Security Content

- Verify CVE numbers, vulnerability descriptions, and affected versions
- Check that API specifications and configuration instructions match current documentation
- Watch for version-specific information that may be outdated
