---
name: gtm-enterprise-onboarding
description: Four-phase framework for onboarding enterprise customers from contract to value realization. Use when implementing new enterprise customers, preventing churn during onboarding, or solving the adoption cliff that kills deals post-go-live. Includes the Week 4 ghosting pattern.
license: MIT
metadata:
  author: Smit Patel (https://linkedin.com/in/smitkpatel)
  source: https://github.com/beingsmit/technical-product-gtm
---

# Enterprise Onboarding

Four-phase framework for onboarding enterprise customers from contract to value realization. The goal isn't just go-live — it's sustained adoption that doesn't cliff at Week 12.

## When to Use

**Triggers:**
- "How do we onboard this enterprise customer?"
- "Customer went live but adoption is weak"
- "We keep losing customers 3 months after go-live"
- "POC to production transition"
- "How do I prevent Week 4 ghosting?"
- "Customer success onboarding framework"

**Context:**
- Enterprise or mid-market deals
- Complex technical requirements
- Multiple stakeholders involved
- 30-90 day implementation timelines
- Risk of churn during first year

---

## Core Frameworks

### 1. The Week 4 Ghosting Problem (And How to Prevent It)

**The Pattern:**

Week 1: Kickoff call goes great. Everyone's excited.
Week 2-3: Technical discovery, requirements gathering. Still good.
Week 4: Customer stops responding. Meetings get cancelled. "Too busy."

**What Happened?**

You started customer onboarding before internal alignment on their side.

**Who Owns This Project Internally?**
- Sales rep? (Already moved to next deal)
- Technical champion? (Day job took over)
- Executive sponsor? (Delegates, doesn't drive)
- Nobody? (**This is why they're ghosting**)

**The Framework: Internal Owner Validation**

Before kickoff call, answer:

**Who on customer side will:**
- Attend weekly project meetings? (Not "invited" — will actually show up)
- Unblock issues with procurement/legal/security? (Has authority)
- Drive adoption with end users? (Has influence)
- Escalate when things stall? (Has executive access)

**If you can't name a specific person for each, you don't have a project owner. You have a signed contract with nobody driving it.**

**How to Fix It:**

**During sales → CS handoff (before customer kickoff):**

Sales rep must identify:
- Primary project owner (name, not role)
- Their capacity (dedicated or side project?)
- Their authority (can they unblock?)
- Their motivation (what's in it for them?)

**If there's no clear owner:**

Don't start onboarding yet. Have sales introduce you to economic buyer:

"Before we kick off implementation, we want to make sure we have the right project owner on your side. In our experience, implementations succeed when someone owns driving this forward week-to-week. Who on your team should we partner with?"

**Common Mistake:**

Assuming someone will own it. Ask explicitly. If they can't name someone, the deal is at risk.

---

### 2. The Adoption Cliff (Week 12 Problem)

**The Pattern:**

Go-live happens Week 6. Usage spikes. You celebrate.

Week 8: Usage plateaus.
Week 10: Usage declining.
Week 12: Usage down 50% from peak.

**Why This Happens:**

You treated go-live as the finish line. **Go-live is the starting line.**

**What Drives Sustained Adoption:**

**Not:** Feature completeness, technical integration, training sessions

**Yes:** Ongoing value demonstration, user success stories, expanding use cases

**Framework: Adoption Stages Beyond Go-Live**

**Week 1-6 (Implementation):** Get it working
- Measure: % of technical setup complete
- Owner: Technical lead

**Week 6-12 (Initial Adoption):** Get people using it
- Measure: # active users, frequency of use
- Owner: Enablement / DevRel

**Week 12-26 (Sustained Adoption):** Prove ongoing value
- Measure: Use case expansion, team spread
- Owner: Customer success

**Week 26+ (Expansion):** Grow within account
- Measure: New teams, new use cases, upgrade triggers
- Owner: Account executive + CS

**The Handoff That Most Teams Miss:**

Week 6 (go-live) → Week 12 (sustained adoption)

Most CS teams celebrate go-live and move to next customer. **This is when churn seeds get planted.**

**What to Do Week 6-12:**

**Week 7:** First value report
"Here's what your team accomplished in the first week: [specific metric]. Here's what good looks like at Week 12: [target]."

**Week 9:** User success story
"[User name] on [team name] saved [X hours/reduced Y errors] this week. Here's how they're using it."

**Week 11:** Use case expansion conversation
"You're using us for [primary use case]. Teams like yours also use us for [adjacent use case]. Want to explore?"

**Common Mistake:**

Measuring "go-live completion" instead of "sustained active usage." Go-live is not success. Week 26 retained adoption is success.

---

### 3. Pre-Onboarding: Success Is Built Before First Customer Call

**The Pattern:**

Most onboarding failures trace back to pre-kickoff gaps.

**What Gets Missed:**

**Sales didn't brief CS properly:**
- Deal drivers unknown
- Stakeholder dynamics unclear
- Technical requirements assumed

**No internal project owner identified:**
- CS reaches out, nobody responds
- Meetings get scheduled with wrong people
- Decisions don't stick

**Customer timeline unrealistic:**
- They want go-live in 2 weeks
- Technical setup takes 6 weeks minimum
- Expectations misaligned from Day 1

**Framework: Pre-Kickoff Checklist**

Before scheduling kickoff call, validate:

**Account Intelligence:**
- [ ] Sales handoff completed (deal drivers, stakeholders, technical requirements)
- [ ] Past interactions reviewed (demo notes, proposal, emails)
- [ ] Organizational structure mapped (team sizes, reporting lines)
- [ ] Use cases documented (primary + future)

**Internal Setup:**
- [ ] Internal Slack channel created (#account-[customer-name])
- [ ] Account plan updated in CRM
- [ ] Project plan template prepared
- [ ] Roles assigned (CSM lead, technical lead, exec sponsor)

**Customer Readiness:**
- [ ] Project owner identified by name (not just "their DevRel team")
- [ ] Executive sponsor confirmed on both sides
- [ ] Timeline realistic (their goals vs your typical timeline)
- [ ] Known blockers documented (procurement, security, legal)

**Timeline Validation:**
- [ ] Customer's go-live date is realistic given technical requirements
- [ ] Internal capacity available (not overbooked)
- [ ] Dependencies identified (SSO, integrations, data migration)

**Decision Criteria:**

Only schedule kickoff when all four sections validated. If gaps exist, surface to sales or executive sponsor before engaging customer.

**Common Mistake:**

Starting onboarding without internal clarity. This creates confusion, missed deadlines, and erosion of customer confidence.

---

### 4. The Four-Phase Onboarding Flow

**Phase 1: Kickoff (Week 1)**

**Goal:** Align on objectives, timeline, success metrics

**Attendees:** Executive sponsors + project leads + technical leads

**Agenda:**
1. Introductions and roles (5 min)
2. Executive alignment on strategic objectives (5 min)
3. Success definition: "What does success look like in 3/6/12 months?" (10 min)
4. Timeline and milestones (5 min)
5. Meeting cadence (weekly project team, monthly exec review) (5 min)
6. Next steps (technical discovery call, success plan review) (5 min)

**Deliverable:** Kickoff recap sent within 24 hours with success metrics, timeline, next meetings

**Phase 2: Discovery & Planning (Week 2-3)**

**Goal:** Understand technical landscape, map use cases, plan rollout

**Three parallel workstreams:**

**Workstream 1: Technical Discovery**
- Current infrastructure (on-prem, cloud, hybrid)
- Existing tools and integrations
- Security/compliance requirements
- Timeline constraints

**Workstream 2: Success Planning**
- Use cases prioritized (start with highest-value)
- Success metrics defined (how to measure adoption)
- Training needs identified (who needs what)

**Workstream 3: Technical Setup**
- SSO/identity configuration
- Integrations required
- Data migration (if applicable)
- Pilot group identified

**Deliverable:** Customer Success Plan document with use cases, metrics, timeline, milestones

**Phase 3: Implementation (Week 4-6)**

**Goal:** Deploy to pilot group, validate use cases, prepare for broader rollout

**Three parallel tracks:**

**Track 1: Administration & Setup**
- SSO configuration complete
- Integrations live
- Data migrated (if applicable)

**Track 2: User Enablement**
- Training sessions for pilot group
- Documentation shared
- Office hours scheduled

**Track 3: Pilot & Feedback**
- Pilot group using product
- Feedback collected weekly
- Issues triaged and resolved

**Deliverable:** Go-live readiness checklist completed, pilot group validated

**Phase 4: Go-Live & Ongoing Success (Week 6+)**

**Goal:** Roll out broadly, sustain adoption, expand use cases

**Week 6-8 (Rollout):**
- Broader rollout to all teams
- Training sessions scheduled
- Support available (Slack, email, office hours)

**Week 8-12 (Value Demonstration):**
- First value report (Week 7)
- User success stories shared (Week 9)
- Use case expansion conversation (Week 11)

**Week 12-26 (Sustained Adoption):**
- Monthly business reviews
- Adoption tracking (active users, frequency, use cases)
- Expansion opportunities identified

**Common Mistake:**

Treating go-live as completion. Phase 4 is where retention is won or lost.

---

### 5. The Parallel Tracks Anti-Pattern

**The Pattern:**

Most onboarding teams run workstreams **sequentially**:
1. Technical setup (Weeks 1-2)
2. Then training (Weeks 3-4)
3. Then pilot (Weeks 5-6)

**Total time: 6 weeks**

**What Works Better: Parallel Tracks**

Run technical setup, training, and pilot **simultaneously**:
- Week 1: Technical discovery + identify pilot group + schedule training
- Week 2: SSO config + pilot group training + pilot starts
- Week 3: Integrations + broader training + pilot feedback

**Total time: 3 weeks**

**Why Parallel Works:**

1. Shortens time-to-value
2. Keeps customer engaged (something happening every week)
3. Identifies blockers early (pilot group surfaces issues before broad rollout)

**How to Execute:**

Assign clear owners to each track:
- Track 1 (Admin): Technical lead
- Track 2 (Enablement): Training/DevRel lead
- Track 3 (Pilot): CSM + pilot group champion

Weekly sync across tracks to surface dependencies and blockers.

**Common Mistake:**

Waiting for "perfect technical setup" before starting pilot. Get pilot group using it early, even if setup isn't perfect. Their feedback makes the broad rollout better.

---

## Decision Trees

### Should I Start Customer Onboarding?

```
Has sales identified a project owner by name?
├─ No → Get project owner identified before kickoff
└─ Yes → Continue...
    │
    Is their timeline realistic given typical deployment?
    ├─ No → Reset expectations before kickoff
    └─ Yes → Continue...
        │
        Do you have internal capacity?
        ├─ No → Delay kickoff or get more resources
        └─ Yes → Proceed to kickoff
```

### Is This Onboarding At Risk?

```
Is customer responding to meeting invites?
├─ No → Week 4 ghosting, escalate to exec sponsor
└─ Yes → Continue...
    │
    Are they completing their action items?
    ├─ No → No project owner, identify who drives this
    └─ Yes → Continue...
        │
        Is pilot group using the product?
        ├─ No → Pilot group wrong or product not solving pain
        └─ Yes → On track
```

### Is Adoption Sustained Post-Go-Live?

```
Are active users growing Week 6 → Week 12?
├─ Yes → Healthy adoption
└─ No → Continue...
    │
    Are active users declining?
    ├─ Yes → Adoption cliff, intervene immediately
    └─ No (plateau) → At risk, start value demonstration
```

---

## Common Mistakes

**1. Starting customer onboarding before internal alignment**
   - Wastes first 2-3 weeks, creates confusion, kills credibility

**2. Not identifying real project owner upfront**
   - Discovers it Week 4, has to restart or deal stalls

**3. Overcommitting on timeline without technical requirements**
   - Discovers blockers mid-implementation, misses deadline

**4. No internal communication hub**
   - Decisions don't propagate across teams, rework happens

**5. Treating go-live as project complete**
   - Adoption cliff at Week 12, account at risk

**6. Sequential tracks instead of parallel**
   - Implementation takes twice as long, customer loses momentum

**7. No ongoing metrics post go-live**
   - Discovers adoption issues too late to save account

---

## Quick Reference

**Pre-Kickoff Validation:**
- [ ] Sales handoff complete (deal drivers, stakeholders, requirements)
- [ ] Project owner identified by name on customer side
- [ ] Timeline realistic (their goals vs typical deployment)
- [ ] Internal roles assigned (CSM, technical, exec sponsor)

**Kickoff Agenda (30-45 min):**
1. Introductions (5 min)
2. Executive alignment (5 min)
3. Success definition (10 min)
4. Timeline and milestones (5 min)
5. Meeting cadence (5 min)
6. Next steps (5 min)

**Adoption Tracking (Week 6-26):**
- Week 7: First value report
- Week 9: User success story
- Week 11: Use case expansion conversation
- Week 13: First monthly business review
- Week 26: Expansion readiness assessment

**Four Phases:**
1. Kickoff (Week 1): Align
2. Discovery (Week 2-3): Plan
3. Implementation (Week 4-6): Deploy to pilot
4. Go-Live & Sustained (Week 6+): Rollout, value demonstration, expansion

**Red Flags:**
- Customer not responding Week 4 → No project owner
- Pilot group not using product Week 5 → Wrong group or wrong use case
- Active users declining Week 8-12 → Adoption cliff forming

---

## Related Skills

- **enterprise-account-planning**: Pre-sale deal planning and stakeholder mapping
- **operating-cadence**: Onboarding review cadence and health metrics
- **product-led-growth**: Self-serve onboarding patterns

---

*Based on enterprise onboarding across multiple platform companies — designing partner onboarding directly and collaborating closely with CS on customer onboarding. Not theory — lessons from seeing Week 4 ghosting happen repeatedly and learning that go-live ≠ success, and understanding the adoption cliff that kills 30% of deals in first year.*
