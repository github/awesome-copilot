---
name: gtm-partnership-architecture
description: Build and scale partner ecosystems that drive revenue and platform adoption. Use when building partner programs from scratch, tiering partnerships, managing co-marketing, making build-vs-partner decisions, or structuring crawl-walk-run partner deployment.
license: MIT
metadata:
  author: Smit Patel (https://linkedin.com/in/smitkpatel)
  source: https://github.com/beingsmit/technical-product-gtm
---

# Partnership Architecture

Build and scale partner ecosystems that drive revenue and platform adoption. These aren't theory — they're patterns from building partner programs that drove 8-figure ARR and observing partnerships with real economic commitment.

## When to Use

**Triggers:**
- "How do I structure a partner program?"
- "Should we build this or partner for it?"
- "Partner-led vs direct sales motion"
- "Ecosystem strategy"
- "How to recruit and tier partners"
- "Co-marketing with partners"
- "When does a partnership actually matter?"

**Context:**
- Building partnership program from scratch (0→1)
- Scaling existing program (1→100)
- Evaluating build vs partner decisions
- Structuring partner deals and economics
- Planning partner GTM motions

---

## Core Frameworks

### 1. Real Partnerships Require Skin in the Game

**The Pattern:**

Most "partnerships" are co-marketing theater. Joint webinars, logo swaps, press releases. No economic commitment. No real skin in the game.

Real partnerships look different:
- Economic commitment (spend, revenue share, co-investment)
- Product roadmap alignment (features built for the partnership)
- Executive sponsorship (leadership engaged quarterly)
- Mutual risk (both sides can fail if it doesn't work)

**How to Tell the Difference:**

Ask: "If this partnership fails, what does each side lose?"

If the answer is "nothing" — it's not a partnership. It's a handshake.

The best partnerships I've seen involved uncomfortable commitments on both sides. Multi-year cloud spend commitments. Dedicated engineering teams. Revenue guarantees. The discomfort is the point — it forces both sides to make the partnership work.

**Framework: Three-Sided Value Proposition**

Every successful partnership creates clear value for three parties:

**Your Company:**
- Distribution (access to partner's customers)
- Credibility (association with known brand)
- Revenue (direct or influenced)
- Product leverage (capability you don't build)

**The Partner:**
- Revenue or margin improvement
- Customer retention/stickiness
- Competitive differentiation
- Reduced support burden

**Shared Customers:**
- Workflow improvement
- Reduced integration pain
- Single vendor relationship
- Cost efficiency

**Decision Criteria:**

Before pursuing any partnership, answer:

1. What is our economic commitment? (Eng resources, spend, revenue share?)
2. What is partner's economic commitment? (Are they investing too?)
3. What happens if this fails? (Do we both lose something real?)

If both sides can walk away with zero cost, **it's not a partnership — it's a handshake.**

**Common Mistake:**

Treating "partnerships" as marketing announcements. Integration launches, joint webinars, co-branded content. These create buzz, not business. Real partnerships require uncomfortable commitments.

---

### 2. Ecosystem Control = Discovery, Not Gatekeeping

**The Developer Marketplace Decision:**

Running ecosystem at a platform company during hypergrowth. Leadership debate: Open the network to anyone, or curate for quality?

**Quality control camp:** "We need gatekeeping. Otherwise we'll get SEO spam, low-quality APIs, brand damage."

**Open network camp:** "Developers route around gatekeepers. Network effects matter more than quality control."

**The decision:** Went open. Quality concerns were real, but we made a bet: **Control comes from discovery + trust layers, not submission gatekeeping.**

**What We Built Instead of Gatekeeping:**

1. **Search and discovery** - Surface high-quality APIs through algorithms
2. **Trust signals** - Verified badges, usage stats, health scores
3. **Community curation** - User ratings, collections, recommendations
4. **Moderation** - Remove spam after publication, not block before

**Result:** Network effects won. Thousands of APIs published. Quality surfaced through usage, not through us deciding upfront.

**The Pattern:**

**Curated ecosystem (Gatekeeper Model):**
- Pros: High quality, controlled brand
- Cons: Slow growth, partner friction, you become the bottleneck

**Open ecosystem (Discovery Model):**
- Pros: Network effects, rapid growth, self-service
- Cons: Quality variance, moderation overhead

**When to Use Which:**

```
Is brand damage risk high if low-quality partners join?
├─ Yes (regulated, security-critical) → Curated
└─ No → Continue...
    │
    Can you scale human review?
    ├─ No (thousands of potential partners) → Open
    └─ Yes (dozens of partners) → Curated
```

**Common Mistake:**

Defaulting to curated because "we need quality control." This works when you have 10 partners. At 100+, you become the bottleneck. Build discovery and trust systems instead.

---

### 3. Partnership Tactics > Partnership Theater

**The Certification Wedge:**

Early in a cloud partnership, looking for channel leverage. Targeting managed service providers (MSPs).

**The insight:** Buried in the cloud provider's partner program requirements: "Must include [our product category] in certified stack."

**The play:** Built entire partnership pitch around that one line. MSPs didn't just want our product — they **needed it** to maintain certification.

**Result:** We became required, not "nice to have." Closed MSP deals 3x faster than generic partnerships.

**Framework: Partnership Leverage Types**

**1. Requirement leverage** (Strongest)
- Partner needs you for certification/compliance/partnership status
- Example: Cloud provider certification requiring your category of product
- How to find: Read partner program requirements, marketplace rules

**2. Economic leverage** (Strong)
- Helps partner make or save money directly
- Example: Reduce partner's support costs by 30%
- How to measure: Calculate partner's ROI in their P&L terms

**3. Competitive leverage** (Moderate)
- Gives partner differentiation vs competitors
- Example: Exclusive integration for 6 months
- How to validate: Ask "would competitors want this?"

**4. Customer leverage** (Moderate)
- Partner's customers demand the integration
- Example: 50+ support tickets requesting integration
- How to measure: Partner support ticket volume

**5. Co-marketing leverage** (Weak)
- Joint content, events, logo swaps
- Example: Co-branded webinar
- Reality: Nice to have, rarely closes deals

**How to Apply:**

**Before pitching partnership, identify your leverage:**

High leverage (requirements, economics) → Full partnership investment
Moderate leverage (competitive, customer) → Light partnership, test first
Low leverage (co-marketing only) → Don't do it, you'll waste time

**The Qualification Question:**

"If we don't do this partnership, what happens to you?"

- "We lose cloud provider certification" → High leverage, pursue
- "We might lose some customers" → Moderate, test carefully
- "Nothing really changes" → No leverage, walk away

**Common Mistake:**

Pitching partnerships based on your benefit, not theirs. "We want access to your customers" is co-marketing theater. "You'll maintain cloud provider certification" is leverage.

---

### 4. Partner Tiering: Three-Tier Model

Structure partner programs into clear tiers based on commitment and capability:

**Tier 1: Integration Partner (Self-Serve)**
- Partner builds with your public API/docs
- You provide: documentation, Slack channel, office hours
- Partner drives their own promotion
- Timeline: 2-6 months
- Best for: Ambitious partners with engineering resources

**Tier 2: Partnership Partner (Joint Development)**
- Co-developed integration
- You provide: dedicated channel, regular syncs, product input
- Platform provides co-marketing support
- Timeline: 6-12 months
- Best for: Strategic fit partners, accelerating integration quality

**Tier 3: Strategic Partner (Co-Development)**
- Deep product roadmap integration
- You provide: dedicated partner manager, executive relationship
- Customized co-marketing, revenue objectives
- Timeline: Ongoing
- Best for: Marquee partnerships that shift positioning

**Decision Criteria:**
- Tier based on strategic fit AND partner capability
- Don't over-tier (creates expectations you can't meet)
- Create clear graduation path between tiers

**Common Mistake:**

Treating all partners equally. Tier 1 partners want self-serve, Tier 3 want white-glove. Mismatch creates frustration.

---

### 5. Crawl-Walk-Run Partnership Deployment

De-risk partnerships with phased validation before full commitment.

**Crawl (4-8 weeks):**
- 1-2 pilot customers using both solutions
- Manual or lightweight integration (not production-grade)
- Measure specific outcomes: time savings, adoption, revenue impact
- Go/no-go: 20%+ improvement on stated metric

**Walk (8-12 weeks):**
- 5-10 additional customers
- Build formal integration
- Co-marketing: joint announcements, webinars
- Sales enablement: training, playbooks
- Go/no-go: 70%+ adoption rate of invited customers

**Run (6-12 months ongoing):**
- Full-scale deployment
- Joint enterprise sales, integrated customer success
- APIs/native integrations, marketplace listing
- Quarterly business reviews, executive steering

**The Pattern:**

Most partnerships fail in Crawl phase. That's good — you learn fast with minimal investment.

**Common Mistakes:**
- Skipping Crawl phase (jumping straight to full commitment)
- Running phases in parallel (creates confusion, can't isolate signal)
- Continuing partnerships not delivering value (sunk cost fallacy)
- Moving to next phase without clear go/no-go criteria

**Go/No-Go Criteria:**

**After Crawl:**
- Did pilot customers see 20%+ improvement?
- Would they recommend to peers?
- Can we scale this integration?

**After Walk:**
- Did 70%+ of invited customers adopt?
- Is partner actively promoting?
- Is support burden manageable?

**Enter Run Only If:**
- Both Crawl and Walk passed criteria
- Both sides committed to next phase
- ROI model validates at scale

---

### 6. Partnership Value Exchange Clarity

If you can't articulate what each party gets, the partnership will fail.

**Partnership Charter (Required Before Launch):**

**Mutual Goals:**
- What does success look like for us?
- What does success look like for partner?
- What does success look like for customers?

**Value Exchange:**
- What we give (engineering time, co-marketing, revenue share)
- What partner gives (distribution, credibility, co-investment)
- Is this balanced? (Would both sides still do this if other walked?)

**Timeline:**
- Crawl phase (dates, deliverables, metrics)
- Walk phase (dates, deliverables, metrics)
- Run phase (ongoing cadence, QBRs)

**Measurement:**
- Specific metrics for success (revenue, customers, retention)
- How we'll track (dashboard, reports, reviews)
- Review cadence (monthly? quarterly?)

**Governance:**
- Who owns decisions on each side?
- Escalation path for disputes
- Exit criteria (what triggers ending partnership?)

**The Signature Test:**

Both sides should sign the charter. If either side won't commit to paper, there's no real partnership.

**Common Mistake:**

Verbal agreements without documentation. When things get hard (and they will), you need written alignment.

---

### 7. Co-Marketing Execution Checklist

**Pre-Launch (4-6 weeks before):**
- [ ] Joint value prop finalized (reviewed by both marketing teams)
- [ ] Customer case study identified (ideally 2-3 options)
- [ ] Technical integration validated (no launch-day bugs)
- [ ] Sales enablement ready (one-pager, deck, demo)
- [ ] Support trained (both teams know how to handle tickets)
- [ ] Marketplace listings prepared (if applicable)

**Launch Week:**
- [ ] Press release (coordinated timing)
- [ ] Blog posts (both companies)
- [ ] Joint webinar scheduled (within 2 weeks of launch)
- [ ] Social media campaign (coordinated hashtags)
- [ ] Sales teams briefed (live training session)
- [ ] Customer comms sent (email to relevant segments)

**Post-Launch (Weeks 2-8):**
- [ ] Customer adoption tracked (weekly dashboard)
- [ ] Support issues triaged (joint Slack channel)
- [ ] Case study published (quantified results)
- [ ] Pipeline impact measured (influenced deals)
- [ ] Quarterly business review scheduled

**Common Mistake:**

Treating launch as finish line. Real work starts after launch — adoption, support, iteration.

---

## Decision Trees

### Should We Build or Partner?

```
Is this capability core to our product differentiation?
├─ Yes → Build it yourself
└─ No → Continue...
    │
    Would building this delay our roadmap by >6 months?
    ├─ Yes → Partner
    └─ No → Continue...
        │
        Is there a credible partner who needs us too?
        ├─ Yes → Partner
        └─ No → Build
```

### Which Partner Tier?

```
Does partner have engineering resources to self-serve?
├─ Yes → Start at Tier 1, evaluate for Tier 2 after 6 months
└─ No → Continue...
    │
    Is this a marquee logo that shifts our positioning?
    ├─ Yes → Tier 3 (Strategic)
    └─ No → Tier 2 (Joint Development)
```

### Should We Continue This Partnership?

```
Did Crawl phase meet success criteria?
├─ No → End partnership, learn from failure
└─ Yes → Continue...
    │
    Did Walk phase meet success criteria?
    ├─ No → End partnership or restart Crawl with changes
    └─ Yes → Move to Run phase
```

---

## Common Mistakes

1. **Treating partnerships as sales channel, not platform expansion**
   - Partnerships should expand what your product can do, not just who buys it

2. **Launching without clear integration pathways**
   - Partners will struggle and fail without step-by-step guides

3. **Expecting partners to self-promote**
   - You must provide co-marketing templates, resources, support

4. **Creating too many tiers**
   - 2-3 is optimal; more causes confusion and expectation mismatch

5. **Ghosting after launch**
   - Relationships need ongoing cultivation; schedule recurring touchpoints

6. **Pursuing partnerships for vanity**
   - Brand name or funding connections don't equal customer value

7. **No clear exit criteria**
   - Define upfront what failure looks like and when to deprioritize

---

## Quick Reference

**Before starting any partnership:**
- [ ] Three-sided value prop articulated
- [ ] Partner tier identified
- [ ] Crawl phase scope defined
- [ ] Success metrics agreed
- [ ] Partnership charter drafted

**Before launching any partnership:**
- [ ] Customer ready criteria met
- [ ] Co-marketing checklist complete
- [ ] Sales team briefed
- [ ] Health management cadence scheduled

**Partnership leverage hierarchy:**
1. Requirement (they need you for cert/compliance)
2. Economic (saves/makes them money)
3. Competitive (differentiates them)
4. Customer (their customers want it)
5. Co-marketing (nice to have, rarely decisive)

**Go/no-go criteria:**
- Crawl: 20%+ customer outcome improvement
- Walk: 70%+ adoption rate
- Run: Both phases passed + ROI validated

---

## Related Skills

- **developer-ecosystem**: Developer-specific ecosystem programs
- **enterprise-account-planning**: Managing enterprise deals with partners
- **technical-product-pricing**: Pricing partnership deals

---

*Based on partnerships work across multiple platform companies during hypergrowth, including running a developer marketplace ecosystem (open vs curated decision) and leveraging cloud provider certification requirements for channel growth. Not theory — patterns from partnerships that actually drove revenue and platform adoption.*
