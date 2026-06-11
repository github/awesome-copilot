---
name: gtm-product-led-growth
description: Build self-serve acquisition and expansion motions. Use when deciding PLG vs sales-led, optimizing activation, driving freemium conversion, building growth equations, or recognizing when product complexity demands human touch. Includes the parallel test where sales-led won 10x on revenue.
license: MIT
metadata:
  author: Smit Patel (https://linkedin.com/in/smitkpatel)
  source: https://github.com/beingsmit/technical-product-gtm
---

# Product-Led Growth

Build self-serve acquisition and expansion motions. But first, figure out if PLG is even the right motion for your product.

## When to Use

**Triggers:**
- "Should we build PLG or sales-led?"
- "How do we drive self-serve adoption?"
- "Freemium to paid conversion isn't working"
- "Developer-led adoption strategy"
- "Which growth channels should we invest in?"
- "How do I know if PLG will work?"

**Context:**
- Developer tools and platforms
- B2B SaaS with self-serve potential
- Products where value is obvious without demo
- Bottom-up adoption motions
- Growth channel prioritization

---

## Core Frameworks

### 1. The PLG Reality Check (Test Before You Commit)

**What I Learned Running Both Motions in Parallel:**

Classic startup debate. PLG camp: "Developers want self-serve." Sales camp: "Enterprises need hand-holding." Instead of arguing, we tested both for 6 months. Same product, two GTM motions, tracked everything.

**The Results:**

PLG: High volume, low ACV (~$5K), fast time-to-revenue, higher churn. Sales-led: Lower volume, high ACV (~$50K), slower time-to-revenue, lower churn. **Sales won 10x on dollars despite 10x less volume.**

**Why:** Product complexity + buyer seniority = sales-led wins. The product required integration with existing infrastructure, change management across teams, and multi-stakeholder alignment. Developers loved self-serve. But they weren't the economic buyer.

**PLG works when:**
- Value is obvious in first 5 minutes
- Implementation is trivial
- Individual user gets value without team buy-in
- No procurement/legal hurdles
- Buyer = user

**Sales-led works when:**
- Product requires integration/setup
- Multiple stakeholders need alignment
- Buyer ≠ user
- Deal size justifies human touch
- Customer needs education to see value

**Before building PLG, test your motion. Don't assume PLG is better because it's trendy.** PLG is efficient at volume, but sales-led can be more profitable with complexity.

---

### 2. The Growth Equation (Map Inputs to Outputs)

**The Pattern:**

Growth compounds when you systematize the relationship between activities and user acquisition. Not "do more marketing" — map specific inputs to measurable outputs.

**How to Build Your Growth Equation:**

For each channel, define: Activity (input) → Traffic (output) → Conversions.

- **Organic Search:** 1 quality blog post → 400 users/month → 5% conversion = 20 new users
- **Paid Ads:** $1K spend at 8% conversion on 100K impressions = 8K clicks → conversions at X%
- **Community Events:** 1 event → 60 attendees → 35% conversion = 21 users
- **Referral:** 1 integration partner → N referred users → conversions at Y%

**Why This Matters:**

Once you validate the equation, scaling becomes math. "I need 200 more users next month" → "I need 10 more blog posts" or "I need $5K more ad spend." Without the equation, you're guessing.

**Testing the Equation:**

1. Start with hypothesis: "If I create X, it drives Y conversion"
2. Test with small sample: 1 blog post, measure actual conversion
3. Validate: Does reality match hypothesis?
4. Scale with confidence: If yes, increase input
5. Kill if not: 4 weeks of data is enough to decide

**Common Mistake:**

Guessing at conversion rates without testing. Assuming all users from the same channel are equal quality. Scaling before validating the equation.

---

### 3. Channel Economics (Kill Losers, Double Down on Winners)

**The Pattern:**

Every channel has economics. Without tracking them, you over-invest in losers and under-invest in winners.

**Track Per Channel:**
1. **CAC:** Total spend / new users
2. **Conversion rate:** Signups → paying
3. **Retention:** 30-day, 90-day by source
4. **LTV:** Revenue over customer lifetime, by channel
5. **Payback period:** How long to recoup CAC

**The Decision Framework:**

- CAC < (LTV × margin) → Scale aggressively
- CAC ≈ (LTV × margin) → Optimize, don't scale
- CAC > (LTV × margin) → Kill within 4 weeks

**Monthly channel review:** Which channels are profitable? Which are drains? Quarterly reallocation: 3x budget to winners, kill losers.

**Critical Insight: Channel Quality Varies**

Cheap CAC doesn't mean good CAC. Organic search might deliver users at $0 CAC with 85% 30-day retention. Paid search might deliver users at $12 CAC with 45% 30-day retention. The "free" channel is 10x more valuable when you factor in retention and LTV.

**Systematic Testing:**

Test 2 new channels monthly. Give each 4 weeks of data. Kill decisively if economics don't work. Document learnings regardless of outcome — what didn't work is as valuable as what did.

**Common Mistake:**

Tracking CAC without retention. A cheap channel that churns users costs more than an expensive channel that retains them.

---

### 4. Time to First Value (The Only Activation Metric)

**The Pattern:**

Users decide product value in the first 5-10 minutes. If they don't reach the aha moment fast, they abandon.

**The Activation Audit:**

1. Sign up for your own product as a new user
2. Time how long to first value
3. Count steps to aha moment
4. Where did you get stuck?

**If TTFV > 10 minutes, you have an activation problem.**

**Before:** Sign up → confirm email → fill profile → configure settings → read docs → first action

**After:** Sign up → pre-loaded sample data → first action (immediate aha moment)

**Specific Fixes:**

1. **Pre-load sample data.** Users want to see value, not set up. Give them a working example immediately.
2. **Skip non-essential setup.** Email confirmation, profile, settings — all can wait until after the aha moment.
3. **Progressive disclosure.** Don't show all features upfront. Start with one core workflow. Reveal complexity gradually.
4. **Show, don't tell.** Interactive tutorial > video > text docs. Let them click through a workflow.

**Common Mistake:**

Assuming users will read documentation. They won't. They'll click around for 5 minutes, and if nothing works, they leave.

---

### 5. The $5K → $50K Inflection (When PLG Breaks)

**The Pattern:**

PLG works for $1K-$10K ARR. Between $20K-$50K, the motion breaks because organizational friction kicks in: procurement, legal, security, multi-stakeholder buy-in.

**The Hybrid Approach:**

**PLG ($0-$10K):** Self-serve sign-up → free tier → paid tier → credit card checkout → automated onboarding

**Sales-Assisted ($10K-$50K):** Self-serve discovery → sales engages on usage signals → human-negotiated contract → dedicated onboarding

**Enterprise ($50K+):** Outbound or inbound lead → demo → POC → proposal → legal/security review → executive sponsor

**PQL Signals (When to Trigger Sales):**

- **Usage depth:** Daily active, core features used, approaching limits
- **Expansion signals:** Multiple users from same company, team features, integrations
- **Buying signals:** Requests for SSO/compliance/SLAs, asks about team pricing

**The Handoff:**

Bad: "Hey, I saw you signed up." (Cold, generic, kills trust)
Good: "Your team is using [specific feature] across 12 repos. We can help you [specific value]. Want 15 minutes?" (Warm, specific, offers value)

**Common Mistake:**

Sales engaging too early on <$5K deals. Kills PLG motion, scares users. Let them self-serve until they need help.

---

### 6. Growth Forecasting (Plan for Uncertainty)

**The Pattern:**

Forecasts are always wrong. Plans are still valuable because they force thinking and create accountability.

**Model Three Scenarios:**

**Baseline (current trajectory continues):**
- Organic search: 35% growth → 40K new users
- Paid: Flat → 2K new users
- Community: 10% growth → 400 new users
- Total: 42.4K

**Upside (if all growth initiatives execute):**
- Organic: 50% growth (3x content) → 48K
- Paid: 2x spend, same efficiency → 4K
- New initiative (partnerships): ramp → 3K
- Total: 55K

**Downside (if key channels fail):**
- Organic: 0% growth → 26K
- Paid: CPA doubles → 1K
- Total: 27K

**Use This For:**
- Setting baseline targets (baseline scenario)
- Stretch goals (upside scenario)
- Escalation triggers (if you hit downside, something needs to change)
- Resource allocation (what inputs change to hit upside?)

**Monthly Update:** Compare forecast to actual. Adjust model. Don't forecast-and-forget.

**Common Mistake:**

Overly optimistic forecasts that assume everything works. Not updating monthly. Treating forecast as target (it's a range, not a number).

---

### 7. The Playbook Documentation Habit

**The Pattern:**

Knowledge dies with people. The goal isn't one-off wins — it's systematizing what works.

**After every successful campaign or experiment, write a 1-page playbook:**

```
PLAYBOOK: [Channel/Tactic Name]

Goal: [What outcome]
Steps: [Numbered, specific enough for someone unfamiliar]
Expected Output: [Specific metrics]
Metrics to Track: [How to measure]
Risks & Mitigations: [What could go wrong]
Owner: [Name]
Last Updated: [Date]
```

**The Test:** Could someone who wasn't involved execute this playbook? If not, it's too vague.

**Review quarterly.** Remove playbooks that no longer work. Update ones that have evolved. This becomes your growth operating system.

**Common Mistake:**

Running experiments without documenting learnings. Scaling before you understand the mechanism. Having growth knowledge trapped in one person's head.

---

## Decision Trees

### Should We Build PLG or Sales-Led?

```
Can users get value in <10 min without docs?
├─ No → Sales-led required
└─ Yes → Can they self-serve implementation?
    ├─ No → Sales-led required
    └─ Yes → Is buyer = user?
        ├─ No → Hybrid (PLG + sales-assist)
        └─ Yes → Pure PLG viable
```

### Keep, Scale, or Kill This Channel?

```
CAC < (LTV × margin)?
├─ No → Kill within 4 weeks
└─ Yes → 90-day retention > 60%?
    ├─ No → Optimize (improve activation/onboarding)
    └─ Yes → Scale aggressively (3x budget)
```

---

## Common Mistakes

**1. Assuming PLG always works**
Product complexity + buyer seniority = sales-led wins. Test before committing.

**2. No channel economics**
Every channel has CAC, retention, and LTV. Track them or you're flying blind.

**3. Free tier too generous or too limited**
Too generous: no conversion. Too limited: no activation. Allow 10-20 aha moments.

**4. No growth equation**
"Do more marketing" isn't a strategy. Map inputs → outputs → conversions per channel.

**5. Scaling before validating**
4 weeks of data before scaling any channel. Kill decisively if economics don't work.

**6. Growth knowledge in one person's head**
Document every successful experiment as a playbook.

---

## Quick Reference

**PLG readiness:** Value in <10 min + self-serve implementation + buyer = user

**Growth equation:** Activity (input) → Traffic (output) → Conversions, per channel

**Channel economics:** CAC, conversion, 30/90-day retention, LTV, payback — per channel, monthly review

**Kill criteria:** CAC > (LTV × margin) → 4 weeks to improve, then kill

**PQL signals:** Usage depth + expansion (multi-user) + buying (SSO/compliance requests)

**Sales handoff:** <$10K: PLG → $10K-$50K: Sales-assist → >$50K: Full sales

**Forecast:** Baseline + Upside + Downside, updated monthly

---

## Related Skills

- **technical-product-pricing**: Freemium thresholds and pricing gates
- **developer-ecosystem**: Developer-specific adoption programs
- **0-to-1-launch**: Finding first customers before PLG scales

---

*Based on experience across multiple platform companies — leading a growth team building PLG and sales-led motions from scratch, and operating inside successful PLG + sales-led machines at hypergrowth companies. The combination taught both sides: what it takes to establish these motions early (when resources are thin and every bet matters) and what the mature version looks like at scale (growth equations, channel economics systems, freemium pricing gates, and systematic A/B testing that documents every win and loss into executable playbooks). Not theory — lessons from building the machine and operating inside ones that worked.*
