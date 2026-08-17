# Section Interview Guide

Load only the sections in play. Each entry gives what the section decides, the questions to ask, option sets where a real architectural choice exists, and the trap to watch for.

**⚑ marks a load-bearing decision.** Do not let the session move past it without either a decision or a named owner and blocking date.

---

## Contents

**Track A - Foundation:** 1 Programme context | 2 Scope ⚑ | 3 Target operating model  
**Track B - Solution:** 4 Application architecture ⚑ | 5 Data architecture ⚑ | 6 Integration architecture  
**Track C - Data and control:** 7 Data migration ⚑ | 8 Security and licensing  
**Track D - Platform:** 9 Environment and ALM | 10 Reporting and analytics | 11 Performance and volumetrics  
**Track E - Delivery:** 12 Test strategy | 13 Deployment and cutover ⚑ | 14 Support and operating model

---

# TRACK A - FOUNDATION

## 1. Programme context and business case

**Decides:** why this programme exists, what success looks like, and what is genuinely non-negotiable. Everything downstream gets prioritised against this.

**Ask:**
- What is driving this now: legacy end-of-life, growth, acquisition integration, compliance, cost, or another factor?
- What does the business case commit to, in measurable terms? Who owns those outcomes?
- Who is the executive sponsor and who has decision authority?
- Which constraint is genuinely fixed: date, budget, scope, regulation, or something else?
- What has been attempted before and what was learned?

**Trap:** an efficiency business case that depends on process change nobody has agreed to make.

**Produces:** drivers, measurable objectives, sponsor and governance, fixed constraints, and programme history.

---

## 2. Scope ⚑

**Decides:** which applications, modules, legal entities, countries, and deployment waves are in scope.

**Ask:**
- Which Dynamics 365 applications and modules are in scope, and which are explicitly out?
- ⚑ How many legal entities are proposed, and what drives each one's existence: statutory filing, functional currency, regulatory need, management model, or inherited structure?
- Which countries and localisations are required?
- What remains on another system, and who owns that boundary?
- ⚑ What is the deployment phasing: big bang, geography, legal entity, module, or pilot-then-rollout?

**Options to propose - phasing:**

| Approach | Works when | Costs you |
|---|---|---|
| **Big bang** | Scope is compact or highly interdependent | Highest single-point cutover risk; no learning between waves |
| **By geography / legal entity** | Units can operate semi-independently | Longer dual-running and interim integration complexity |
| **By module** | A clear functional sequence is justified | Temporary integration between D365 and legacy processes |
| **Pilot then rollout** | Many similar entities support a template approach | First wave absorbs template learning and needs strong governance |

Always ask what the interim-state integrations and controls will cost.

**Trap:** legal-entity structure copied from the legacy system without testing whether the reasons still apply.

**Produces:** application/module scope, legal-entity register, country/localisation scope, explicit out-of-scope statement, and wave plan.

---

## 3. Target operating model and process architecture

**Decides:** how the business will run after go-live and which processes D365 supports.

**Ask:**
- Is there a target operating model, or are we designing against current state?
- Shared services or distributed processing? Which functions?
- Where will approval authority sit, and is it changing?
- Which processes are genuinely differentiating and which are commodity?
- Who owns each end-to-end process and has authority to decide?
- Are intercompany flows changing or simply moving systems?

**Options to propose - standard-first posture:**

| Posture | Statement | Suits |
|---|---|---|
| **Strict standard** | Business adapts unless a statutory constraint requires otherwise | Cost-led programmes with strong change appetite |
| **Standard with justified exception** | Extensions require a documented business/regulatory reason and named approval authority | Most enterprise implementations |
| **Fit to process** | System adapts heavily to existing business process | Rarely defensible without clear value and lifecycle-cost acceptance |

**Trap:** "use standard wherever possible" without a threshold, approval forum, or authority to reject gaps.

**Produces:** operating model summary, process architecture, process ownership, and gap-governance posture.

---

# TRACK B - SOLUTION

## 4. Application architecture ⚑

**Decides:** the application landscape, instance strategy, ISVs, Power Platform role, and extension posture.

**Ask:**
- ⚑ Single production instance or multiple? What requirement would justify multiple?
- Which ISVs are in scope? What is their support and service-update posture?
- ⚑ What belongs on Power Platform rather than in Finance/SCM, and why?
- Which existing Power Apps, Power Automate flows, or Dataverse dependencies must survive?
- ⚑ What is the extension-approval threshold and who can approve a gap?

**Options to propose - logic placement:**

| Layer | Use for | Avoid when |
|---|---|---|
| D365 configuration | Parameters, workflow, policies, standard behaviour | The requirement genuinely needs new business logic |
| Electronic Reporting | Documents, regulatory formats, file-generation scenarios | Complex transactional logic |
| Power Platform | Task apps, approvals, lightweight orchestration | High-volume transaction processing requiring ERP consistency |
| X++ extension | ERP business logic requiring transactional consistency | Standard configuration or lower-code options can meet the need |
| External service | Specialist domains and decoupled capabilities | It creates a platform the organisation cannot operate |

**Trap:** an ISV selected before architecture without testing update compatibility, support model, and exit strategy.

**Produces:** application landscape, instance decision, ISV register, Power Platform scope, and extension governance.

---

## 5. Data architecture ⚑

**Decides:** chart of accounts, financial dimensions, product model, master-data ownership, and Dataverse/dual-write scope.

**Ask:**
- ⚑ Is the chart of accounts shared or entity-specific, and is rationalisation part of scope?
- ⚑ Which financial dimensions are required, which are mandatory, and what decision/report does each serve?
- ⚑ What product, storage, tracking, batch/serial, and variant dimensions are required?
- Who owns customer, vendor, product, and other master data? Is there an MDM platform?
- ⚑ Which entities, if any, are dual-written and in which direction?
- What happens operationally if dual-write or another data-sync dependency is unavailable?

**Options to propose - dimension design:**

| Approach | Consequence |
|---|---|
| Few, governed dimensions | Cleaner posting, easier adoption, simpler reporting |
| Many optional dimensions | Flexible analysis but higher complexity, weaker data quality, and larger cardinality |

For each proposed dimension ask: *which report or decision does it serve, and who consumes it?*

**Trap:** product/inventory dimension decisions made in isolation from costing, warehouse, quality, and reporting teams.

**Produces:** COA/dimension design, product model, master-data ownership matrix, dual-write scope, and failure behaviour.

---

## 6. Integration architecture

**Decides:** the interface landscape, pattern principles, middleware direction, and failure-design standards.

**Ask:**
- What is the full interface inventory: source, target, direction, volume, frequency, latency, and criticality?
- What is the business consequence of each critical interface being down for four hours?
- What middleware strategy is intended: direct, Azure Integration Services, existing ESB, or another platform?
- Who owns each interface after go-live and who receives alerts?
- Which legacy contracts or external interfaces constrain the design?

**Pattern options:**

| Pattern | Suits | Watch |
|---|---|---|
| OData / custom service | Low-volume synchronous access | Throttling and synchronous coupling |
| Data management / recurring integration | Batch and bulk movement | Latency, staging, and error handling |
| Business events | Event-driven notifications | Duplicate delivery and idempotency |
| Dual-write | Near-real-time F&O/Dataverse synchronization | Coupling and failure behaviour |
| Service Bus / Logic Apps | Decoupling, retry, orchestration | Additional platform ownership and operations |
| Analytics export/Fabric path | Reporting and analytics consumption | Not an operational write pattern |

For critical interfaces, require retry, poison-message handling, idempotency, alerting, ownership, and reconciliation at blueprint level.

**Trap:** interface inventory sized on average volume and designed only for the happy path.

**Produces:** inventory, pattern principles, middleware decision, failure principles, and ownership model.

---

# TRACK C - DATA AND CONTROL

## 7. Data migration ⚑

**Decides:** what data moves, how history is handled, how opening balances are treated, and how correctness is proved.

**Ask:**
- ⚑ Historical data: migrate, retain legacy read-only, or extract to an archive/data platform? What specific obligation or business need drives the answer?
- Which objects fall into configuration, master, open transaction, opening balance, and historical classes?
- What opening-balance treatment is required for GL, AR/AP, inventory, fixed assets, bank, and other relevant areas?
- Where is data cleansing happening and who owns it?
- Who signs off migrated data and against which source/control reports?
- Which tools and environments are intended for migration?

**Options to propose - history:**

| Approach | Cost | Consequence |
|---|---|---|
| Migrate detailed history | Highest reconciliation and database cost | Full in-system history |
| Keep legacy read-only | Ongoing legacy access cost | Fastest migration, weaker user experience |
| Extract to archive / analytics store | Moderate implementation cost | Often a strong reporting compromise |

**Trap:** historical migration requested by habit rather than a legal, audit, or operational need.

**Produces:** migration scope, history decision, opening-balance strategy, cleansing ownership, reconciliation, sign-off model, and tooling direction.

---

## 8. Security, compliance, and licensing

**Decides:** security principles, segregation-of-duties requirements, data-access boundaries, licensing shape, and access administration.

**Ask:**
- What job families and user populations exist, and across which legal entities?
- What SoD expectations apply and who is the control authority?
- Are there data residency, privacy, or sector-specific constraints?
- Is record-level restriction required beyond legal-entity and organisational boundaries?
- What licences are currently contracted and what assumptions underpin the quantity?
- Who administers joiners, movers, leavers, privileged access, and recertification?

**Trap:** licence entitlement agreed before role design and never revalidated against actual access.

**Produces:** role-family model, SoD expectations, compliance constraints, XDS need, indicative licence shape, and access-admin model.

---

# TRACK D - PLATFORM

## 9. Environment strategy and ALM

**Decides:** environment topology and how code/configuration move through the landscape.

**Ask:**
- Which environments are entitled and what additional capacity is required?
- What is each environment for, who owns it, and what is the refresh cadence?
- Where is golden configuration held and how is configuration transported?
- What branching and source-control strategy applies across all delivery parties?
- How are builds, releases, approvals, and production deployments automated?
- Who owns service-update planning and the regression gate?

**Trap:** environment planning sized for build but not for migration rehearsals, UAT, training, and cutover concurrently.

**Produces:** environment topology, refresh strategy, golden configuration approach, branching/pipeline design, and update governance.

---

## 10. Reporting and analytics architecture

**Decides:** which information products are required and which technologies serve them.

**Ask:**
- Which reports are genuinely business-critical? Who consumes them and what decision do they drive?
- What latency does each actually need?
- What statutory and regulatory reporting exists by country?
- What is the analytics-platform direction: Power BI, Fabric, existing warehouse, or another platform?
- Who builds and maintains reports after go-live?

**Tool-selection examples:**

| Need | Candidate approach |
|---|---|
| Financial statements | Financial reporting capabilities |
| Operational documents and statutory formats | SSRS / Electronic Reporting where applicable |
| Operational enquiry | Standard D365 views and workspace capabilities |
| Cross-functional dashboards | Power BI |
| Enterprise analytics | Fabric / governed data platform |
| Ad-hoc finance analysis | Excel integration where appropriate |

**Trap:** "real time" requested without connecting latency to an actual decision cadence.

**Produces:** report inventory, latency requirements, tool mapping, analytics direction, statutory approach, and ownership.

---

## 11. Performance, scale, and volumetrics

**Decides:** whether the design can support expected production load and what must be tested later.

**Ask:**
- What are average and peak transaction volumes per critical process?
- What are current and projected data volumes over three years?
- What is peak user concurrency by function?
- What batch windows and hard deadlines exist?
- How long does month-end or another critical business cycle take today, and what is the target?
- Which operational deadlines create non-negotiable performance constraints?

**Trap:** annual averages used where peak-hour or period-end demand is the real design driver.

**Produces:** volumetric baseline, growth projection, concurrency profile, batch-window constraints, and performance acceptance targets.

---

# TRACK E - DELIVERY

## 12. Test strategy

**Decides:** how quality is proven before go-live and maintained through future service updates.

**Ask:**
- Which test levels are required: unit, functional, integration/end-to-end, UAT, performance, security, regression, DR?
- Who writes and owns tests and how do they trace back to requirements/processes?
- What test data and volume will be used?
- What regression automation is required, and what is the cost of the manual alternative?
- What numeric exit criteria apply to each phase?
- Who signs off UAT and readiness?

**Trap:** no regression automation and no funded manual regression capacity.

**Produces:** test-level model, traceability approach, test-data strategy, automation decision, exit criteria, and severity model.

---

## 13. Deployment and cutover approach ⚑

**Decides:** the shape of go-live and the constraints a later detailed runbook must satisfy.

**Ask:**
- ⚑ Does the phasing decision from section 2 still hold after the rest of the architecture has been understood?
- What cutover window is available and what drives its boundaries?
- Is parallel running required? By whom, and what will it prove?
- What is the rollback position and point of no return?
- Who declares go/no-go and against which measurable criteria?
- What business freeze is tolerable?

**Trap:** a cutover window based on preference rather than measured full-volume migration timings.

**Produces:** deployment approach, cutover-window constraint, parallel-running decision, rollback position, and go/no-go authority.

---

## 14. Support and operating model

**Decides:** who runs the solution after implementation and how knowledge, updates, support, and change are governed.

**Ask:**
- What is the target support model: L1/L2/L3, internal, partner-managed, or hybrid?
- What are hypercare duration, staffing, and exit criteria?
- Which named people will hold functional, technical, and architecture knowledge after go-live?
- Who owns the service-update calendar and regression gate?
- What is the post-go-live change process for enhancements, new entities, and new requirements?
- Who owns the Microsoft/product-roadmap relationship?

**Trap:** knowledge-transfer plans with roles or teams named but no actual recipients allocated.

**Produces:** support tiers and ownership, hypercare model, knowledge-transfer plan, update governance, and change process.
