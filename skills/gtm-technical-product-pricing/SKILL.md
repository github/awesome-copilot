---
name: gtm-technical-product-pricing
description: Pricing strategy for technical products. Use when choosing usage-based vs seat-based, designing freemium thresholds, structuring enterprise pricing conversations, deciding when to raise prices, or using price as a positioning signal.
license: MIT
metadata:
  author: Smit Patel (https://linkedin.com/in/smitkpatel)
  source: https://github.com/beingsmit/technical-product-gtm
---

# Technical Product Pricing


## Initial Assessment

Before recommending pricing, understand:

1. **Product type**: API/platform, developer tool, SaaS application, infrastructure?
2. **Current pricing**: What do you charge now? How long has it been this way?
3. **GTM motion**: Self-serve, sales-assisted, enterprise, or hybrid?
4. **Cost structure**: What's your marginal cost per customer/user/unit?
5. **Competitive landscape**: What do alternatives cost? (Including "do nothing")

---

## Core Frameworks

### 1. The Price Increase Nobody Noticed (You're Probably Underpriced)

**The Pattern:**

Platform company, growth stage. Pricing hadn't changed since launch. Enterprise customers paying $15K/year for a product saving them $200K+ in engineering time.

Leadership debate: "If we raise prices, we'll lose customers."

**What actually happened:**

Raised enterprise tier from $15K to $45K/year. Added dedicated support, SSO, audit logs to justify the jump.

Lost: 0 enterprise customers. Zero.

Gained: 3x revenue per enterprise account. Plus the customers who stayed started taking the product more seriously — higher adoption, more internal champions, more expansion.

**Why This Happens:**

Technical founders anchor pricing to cost ("it costs us $X to serve them, so we charge $2X"). Enterprise buyers anchor pricing to value ("this saves us $200K, so $45K is cheap").

**The Pricing Sanity Check:**

For every customer segment, calculate:

```
Value Ratio = Customer's alternative cost / Your price

If Value Ratio > 10x → You're massively underpriced
If Value Ratio > 5x  → You're underpriced (most startups are here)
If Value Ratio 3-5x  → Healthy pricing
If Value Ratio < 3x  → Approaching ceiling
If Value Ratio < 2x  → You're expensive (need strong differentiation)
```

**How to Calculate Alternative Cost:**

- Hours spent on manual process × hourly rate × frequency
- Cost of building in-house (engineers × months × loaded cost)
- Cost of existing tool + switching cost + productivity loss during transition
- Cost of *not solving the problem* (incidents, downtime, churn)

**Common Mistake:**

Comparing your price to competitors instead of to customer's alternative cost. Competitors anchor you to a race to the bottom. Value anchors you to what the customer actually saves.

---

### 2. The Three Pricing Models (And When Each Breaks)

**Model 1: Seat-Based ($X/user/month)**

**Works when:**
- Value scales with number of users (collaboration tools, communication)
- Usage is relatively uniform across users
- You want predictable revenue

**Breaks when:**
- Power users and casual users get same price (casual users churn)
- Product value doesn't scale with seats (one admin configures for 1,000 users)
- Customers consolidate seats to reduce cost (usage goes up, revenue doesn't)

**Model 2: Usage-Based ($X/unit)**

**Works when:**
- Usage varies significantly by customer (API calls, compute, storage)
- Marginal cost is meaningful (you need usage to track with revenue)
- Value directly correlates with usage

**Breaks when:**
- Customers can't predict bills (sticker shock at month-end)
- Low-usage customers aren't worth supporting
- High-usage customers negotiate volume discounts that compress margins

**Model 3: Outcome-Based ($X/result)**

**Works when:**
- You can measure outcomes reliably (leads generated, tickets resolved, code deployed)
- Outcomes directly create customer value
- You have confidence in your product's effectiveness

**Breaks when:**
- Outcomes depend on factors outside your control
- Measurement is disputed ("that lead wasn't from your tool")
- Customers game the metric

**The Hybrid That Usually Wins:**

Platform fee (covers your fixed costs) + usage/outcome variable (scales with value).

Example: $500/month base + $0.05 per transaction (or API call, task completed, record processed — whatever your unit of value is).

Why this works:
- Base fee ensures every customer covers cost to serve
- Variable fee aligns price with value
- Customers can predict minimum spend (base) while scaling naturally
- You capture upside when customers grow

---

### 3. Freemium Threshold Design (Where Free Ends and Paid Begins)

**The Pattern:**

The hardest pricing decision for developer tools: where do you draw the line between free and paid?

**The Framework: Find the Production Boundary**

Free users who never pay are fine — they create awareness, community, and content. The problem is when *production users* never pay.

**How to Find the Boundary:**

Map your usage distribution:

```
Usage Level          |  User Type        |  Willingness to Pay
─────────────────────────────────────────────────────────────
<100 units/mo        |  Hobbyist/learner |  $0 (never paying)
100-1K units/mo      |  Side project     |  $0-20/mo (maybe)
1K-10K units/mo      |  Production use   |  $50-200/mo (will pay)
>10K units/mo        |  Business-critical|  $200-2K/mo (must pay)
```

**Set your free tier limit just below where production usage starts.** In this example: 1,000 units/month free.

Why: Hobbyists and learners stay free (they're your marketing engine). Production users hit the limit naturally and convert (they have budget).

**The Three Types of Free-to-Paid Triggers:**

**1. Usage limit** (most common for platforms)
- Free: 1,000 units/month (API calls, tasks, records, whatever your value unit is)
- Triggers when: Production usage exceeds limit
- Conversion signal: User is building something real

**2. Team/collaboration gate** (best for tools)
- Free: Individual use
- Triggers when: User invites second person
- Conversion signal: Tool is valuable enough to share

**3. Enterprise feature gate** (best for platforms)
- Free: Core features
- Triggers when: Needs SSO, RBAC, audit logs, SLAs
- Conversion signal: IT/security involved (real deployment)

**Common Mistake:**

Setting free tier too high ("we want developers to love us"). If production users don't hit the limit, they never convert. Generosity in free tier should target *learners*, not *production users*.

---

### 4. Enterprise Pricing (The Conversation, Not the Number)

**The Pattern:**

Enterprise pricing isn't a page on your website. It's a conversation. The "Contact Sales" button exists because enterprise deals have unique requirements — and because you should be pricing based on value, not a menu.

**Enterprise Pricing Variables:**

**1. Deployment model** (self-serve cloud, dedicated cloud, on-prem, hybrid)
- Each has different cost to serve → different price floor
- On-prem commands 2-5x premium over cloud (support complexity)

**2. Usage scale** (seats, API volume, data volume)
- Volume discounts should never go below cost to serve + 40% margin
- Discount off list price, not off already-discounted price

**3. Support level** (community, standard, premium, dedicated)
- Premium support: 1.5-2x base price
- Dedicated CSM: 2-3x base price
- 24/7 support with SLA: 3-5x base price

**4. Compliance requirements** (SOC 2, HIPAA, FedRAMP, data residency)
- Each compliance adds real cost (audits, infrastructure, process)
- Price accordingly: 1.5-2x base per compliance standard

**The Enterprise Pricing Conversation:**

When prospect says "what does it cost?":

1. **Don't answer with a number.** Answer with a question: "It depends on your deployment and scale requirements. Help me understand what you need."

2. **Map their requirements:**
   - How many users/seats/units?
   - Cloud or on-prem?
   - Compliance needs?
   - Support expectations?
   - Integration requirements?

3. **Anchor to value before presenting price:**
   - "Based on what you've described, you're currently spending [X] on this problem. Our solution typically reduces that by [Y%]."
   - Then present price as fraction of savings.

4. **Present 3 options:**
   - Good: Meets minimum requirements
   - Better: Meets requirements + nice-to-haves (anchor here)
   - Best: Everything, including things they didn't ask for
   - Most buyers pick Better. That's your real price.

**Common Mistake:**

Publishing enterprise pricing on your website. The moment you publish a number, that's the ceiling — the negotiation only goes down from there. Keep enterprise pricing as a conversation.

---

### 5. Pricing as Positioning Signal

**The Pattern:**

Your price tells buyers who you're for. This is as much a positioning decision as a revenue decision.

**Price Signals:**

**$0 (Open source / free tier):**
- Signal: We're for developers who want to try before they buy
- Attracts: Individual contributors, experimenters
- Risk: Perceived as "not enterprise-ready"

**$20-100/month:**
- Signal: We're for teams and small businesses
- Attracts: Self-serve buyers, startups
- Risk: Enterprises won't take you seriously (too cheap)

**$500-2,000/month:**
- Signal: We're for production workloads
- Attracts: Growing companies with real budgets
- Risk: Startups priced out (may need free tier)

**$5,000-50,000/year:**
- Signal: We're for enterprises
- Attracts: Mid-market and enterprise
- Risk: Need sales team (can't be self-serve at this price)

**$100K+/year:**
- Signal: We're mission-critical infrastructure
- Attracts: Large enterprises
- Risk: Long sales cycles, heavy support expectations

**The Positioning Test:**

If you price at $50/month but want enterprise customers, your price is undermining your positioning. Enterprise buyers associate low price with low value. You may need to *raise* prices to attract the customers you want.

**Common Mistake:**

Pricing for the customer you have instead of the customer you want. If your roadmap is enterprise, price for enterprise — even if it means losing some SMB customers today.

---

### 6. When and How to Raise Prices

**Timing Signals:**

- Value ratio > 5x for most customers
- Win rates above 40% (you're not losing on price)
- No customer pushback on pricing in last 6 months
- Customers expanding faster than expected
- Competitors raised prices and didn't lose share

**How to Raise Without Losing Customers:**

**1. Grandfather existing customers** (12-24 months)
- New pricing for new customers only
- Existing customers get notice + timeline
- Creates urgency for prospects ("price is going up")

**2. Add value to justify increase**
- New tier with new features at higher price
- Move current tier features to new higher tier
- This is repositioning, not just a price increase

**3. Annual increase clause in contracts**
- Include 5-10% annual escalator in enterprise contracts
- Normalizes price increases
- Prevents "we've been paying the same for 4 years" conversations

**The Communication:**

"We're investing in [specific improvements]. To continue this level of investment, we're updating our pricing on [date]. Your current plan is locked in at your current rate until [grandfather date]."

Never apologize for raising prices. Frame it as investment in the product they love.

---

## Decision Trees

### Which Pricing Model?

```
Does usage vary >5x between customers?
├─ Yes → Usage-based (or hybrid with usage component)
└─ No → Continue...
    │
    Does value scale with team size?
    ├─ Yes → Seat-based
    └─ No → Continue...
        │
        Can you measure customer outcomes reliably?
        ├─ Yes → Outcome-based (or hybrid)
        └─ No → Platform fee + feature-based tiers
```

### Should We Raise Prices?

```
Is value ratio > 5x for most customers?
├─ Yes → Raise prices
└─ No → Continue...
    │
    Are win rates > 40%?
    ├─ Yes → Price isn't the problem, but consider raising
    └─ No → Continue...
        │
        Are you losing deals specifically on price?
        ├─ Yes → Don't raise. Improve value or segment better.
        └─ No → Something else is wrong (product, positioning, sales)
```

---

## Related Skills

- **ai-gtm**: AI-specific pricing models (variable-cost AI, pricing outputs vs inputs)
- **product-led-growth**: Freemium conversion and PLG pricing gates
- **enterprise-account-planning**: Enterprise deal structuring and negotiation
- **positioning-strategy**: Price as positioning signal

---

*Based on pricing work at developer platforms and enterprise software companies, including enterprise price increases with zero customer loss, freemium threshold design that separated hobbyists from production users, partner pricing models, and pricing conversations across hundreds of enterprise deal cycles. Not theory — patterns from pricing decisions that directly impacted revenue.*
