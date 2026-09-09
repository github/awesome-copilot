---
name: katalon-exploratory-charter
description: Write, run, and debrief exploratory testing charters against Katalon True Platform/TestOps when there is no script to follow. Use when you need to turn a vague area into a charter (mission, areas, oracles, timebox), run a timeboxed unscripted session, log what you find as session notes, judge which findings are real defects, and promote what was learned into atomic manual cases plus the folder or suite that holds them. This is unscripted discovery and the debrief after it; when a written requirement is already in hand and the job is designing cases from it, use katalon-create-test-cases instead. Written for the manual tester who has an hour, a feature, and no cases to run against it.
---

# Katalon Exploratory Charter

Use this skill for the **unscripted** part of the design stage: a timeboxed session that learns something the written requirement does not say, then converts what it learned into scripted coverage. A charter is not a test case and a session is not a test run. The value is the *learning plus the promotion*, so a session that produces no notes and no promoted cases has failed even if nothing crashed.

Treat the human as a tool. Ask when the area, the timebox, the environment, or the risk appetite cannot be resolved safely. Never invent an oracle.

## Availability Boundary

**There is no exploratory session object in the platform.** Say that before promising to "run a session in Katalon".

- **Available via MCP:** resolve scope (`list_projects`, `list_repositories`), read the oracles you already have (`find_requirements`, `read_requirement`, `fetch_requirement_data`), check whether an area is already covered before spending the timebox on it (`find_test_cases`, `find_test_cases_by_requirement`), and land the outcome (`manage_test_folder`, `create_test_case`, `link_requirements_to_test_case`, `manage_test_suite`, `read_test_suite`).
- **Not available, and no workaround exists:** a charter / session / session-sheet entity, a session timer or duration field, attachment upload for screenshots or video or HAR files, a tool that sets a manual test result to failed, custom fields or tags to mark a case as exploratory in origin, and creating a requirement for behavior the charter discovered. Do not reach for `create_charter`, `upload_attachment`, `set_test_result_status`, or `manage_tags` - none of them exists.
- **The defect trap.** `create_defect` requires a known **failed test result ID**. An unscripted session produces no test result, so a charter finding cannot be filed through MCP as it stands. In order of preference: (1) file it in Jira or Azure DevOps directly, outside the MCP; (2) execute the reproduction case and mark it failed in the TestOps UI, then file from that run. A third path is MCP-legal but conditional - promote the finding to a case, `create_manual_test_run`, `create_manual_ai_session`, and if the AI run genuinely fails, `create_defect` with that result ID. It only works when Run with AI actually reproduces the bug, so never offer it as the default.
- **The Katalon MCP cannot see the application.** It reads and writes platform objects only. Every observation in a session comes from a browser you drive yourself, so use Browser or Playwright for the product and the MCP for the artifacts.
- **Where the charter lives.** Author the charter and the session sheet as a local artifact the user keeps. Optionally mirror the charter into the platform as one test case in the charter folder, mission in Description and session log in Steps. Say which you did.

Read `references/charter-and-session.md` before writing a charter. Consult `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks whether Katalon can run exploratory sessions for them.

## Session Workflow

```text
+------------------+     +------------------+     +------------------+
| Frame the area   | --> | Write charter    | --> | Run the timebox  |
| scope + coverage |     | mission/oracles  |     | notes as you go  |
+------------------+     +------------------+     +------------------+
                                                           |
                                                           v
+------------------+     +------------------+     +------------------+
| Promote to cases | <-- | Debrief          | <-- | Classify findings|
| hand to authoring|     | timebox account  |     | oracle broken    |
+------------------+     +------------------+     +------------------+
```

## Steps and tool rules

1. **Resolve scope and existing coverage.** `list_projects` -> `list_repositories`. Then `find_test_cases` on the area keywords and `find_test_cases_by_requirement` when a requirement key is known. **Coverage is an input to the charter, not an afterthought**: an area that already has twenty cases is a poor use of the timebox, and the gaps are where the charter should point.
2. **Write the charter before touching the application.** Six fields, all required: mission, areas, oracles, timebox, out of scope, done when. Show it to the user and get one confirmation. A charter without oracles is a browsing session; refuse to start until at least one oracle is named.
3. **Choose the tours that fit the mission.** Pick two or three from `references/oracles-and-tours.md`. Name them in the charter so the session is reproducible by another tester.
4. **Run the timebox and take notes as you go, not afterwards.** Every note is timestamped and typed - `SETUP`, `OBS`, `Q`, `BUG`, `RISK`, `IDEA`. A `BUG` note is worthless without the steps that produced it, so write the repro before moving on. Use Browser or Playwright for the application itself; the Katalon MCP cannot see the AUT UI.
5. **Stop when the timebox ends, not when you run out of ideas.** Record the timebox accounting - minutes on charter, minutes on bug investigation and writeup, minutes on setup. A session that spent 40 of 60 minutes on setup is a finding about the environment; report it as one.
6. **Classify every finding against the oracle it broke.** Product defect, katalon-test-data or environment issue, question for the product owner, or design risk. A finding with no broken oracle is an observation, not a defect - say so plainly rather than inflating it.
7. **Debrief.** Report what the mission was, what was covered, what was not reached, the findings by class, the timebox accounting, and the charter you would run next. The next charter is part of the deliverable.
8. **Promote, then hand off.** Turn confirmed findings into a promotion list - title, priority, requirement link if one exists, and the one-line expected result. `manage_test_folder` to create or reuse the charter folder, then **hand authoring to `katalon-create-test-cases`**, which owns duplicate checking, the atomic-case rules, and import. Do not reimplement those rules here. Add the promoted cases to the relevant suite with `manage_test_suite` and confirm with `read_test_suite`.

## Hard rules

- **No oracle, no charter.** At least one named, checkable oracle before the timebox starts. *It feels wrong* is not an oracle.
- **The timebox ends the session.** Not the idea supply. An overrun charter is two charters that were never split.
- **A `BUG` note carries its repro or it is an `OBS`.** Write the reproduction before moving to the next observation, while the state is still on screen.
- **A finding with no broken oracle is not a defect.** Report it as a question or a risk. Inflating observations into defects is how a session loses its credibility.
- **Never explore production without explicit confirmation.** Confirm the environment from `read_auts` or from the user before the first action.
- **A session with no promoted cases and no notes has failed.** Nothing crashing is not a result.

## Naming and platform constraints

- Test case and folder **names** accept only letters, numbers, spaces, and `( ) . , _ -`. Charter titles love colons, and a colon will be rejected. Use `CH-01 Explore guest checkout with expired card`, never `CH-01: Explore ...`. Folder paths may use `/`.
- There is no tag or custom field via MCP, so the only durable marker of exploratory origin is the naming convention plus the folder. Keep both: folder `Exploratory / <charter id> <short mission>`, and prefix promoted case titles with the charter id.
- Prefer `update_test_case` over delete-and-recreate when a later session revises a promoted case. Deletion can fail server-side and updating in place keeps IDs, links, and history.

## Worked example

**User asks:** *We shipped guest checkout last week with no cases for it. Run an hour of exploratory testing on the payment step in Cellphone Shop and tell me what to write up.*

**Step 1 - scope and coverage.**

```text
list_projects            -> Cellphone Shop (id 4021), Demo Bank (id 3980)
list_repositories        -> Katalon Cloud (id 118)   [exactly one, so use it]
find_requirements "CEL"  -> CEL-6 Guest checkout (synced from Jira)
find_test_cases_by_requirement CEL-6
                         -> 4 cases, all on the cart step, none on payment
```

Coverage gap confirmed, so the payment step is worth the timebox.

**Step 2 - the charter, confirmed with the user before starting.**

```text
CHARTER      CH-01
Mission      Explore guest checkout payment with declined, expired, and
             mistyped cards, to discover error-handling and cart-state defects
Areas        Payment form, order confirmation, cart persistence, email receipt
Oracles      CEL-6 acceptance lines 3 and 4 (an unsuccessful payment keeps
             the cart intact and shows a retry message)
             Consistency with the logged-in checkout flow, which is covered
             Consistency with purpose (no order record means no charge)
             The payment provider's published test-card behavior
Tours        Error-message tour, then money tour
Timebox      60 minutes, one tester, staging
Out of scope Saved cards, subscriptions, refunds, mobile web
Done when    Every declined-card path has a recorded outcome and every
             finding is classified
```

**Step 4 - session sheet excerpt.**

```text
00:00 SETUP  Staging reachable, cart seeded with 1 phone, provider test keys present
00:07 OBS    CVV field accepts 5 digits without complaint, submit still enabled
00:09 BUG-1  Expired card 01/24 -> spinner 41s -> blank page. Back button shows an
             EMPTY cart. No order in Orders. No charge on the provider dashboard.
             Repro 3/3. Oracle broken - CEL-6 line 3, cart must survive a decline
00:24 Q-1    Is a 5-digit CVV meant to be accepted, or is the provider silently
             truncating? No acceptance line covers CVV length
00:31 BUG-2  Declined card shows the raw provider string "card_declined" instead
             of a user message. Oracle broken - CEL-6 line 4
00:38 RISK-1 Retrying after a decline re-submits the same idempotency key. Could
             double-charge under a slow network. Not reproduced in the timebox
00:52 OBS    Receipt email never arrives for guest orders. Out of scope, logged
01:00 STOP
```

**Step 5 - timebox accounting.** 44 minutes on charter, 11 on bug investigation and writeup, 5 on setup.

**Step 6 - findings.**

| ID | Class | Oracle broken | Severity | Promote |
|---|---|---|---|---|
| BUG-1 | product defect | CEL-6 line 3 | P0 | yes, 2 cases |
| BUG-2 | product defect | CEL-6 line 4 | P1 | yes, 1 case |
| Q-1 | question for the product owner | none, the rule does not exist | n/a | no, ask first |
| RISK-1 | design risk, unreproduced | none yet | n/a | no, next charter |

**Step 8 - promotion list handed to `katalon-create-test-cases`.**

```text
CH-01 Guest checkout keeps the cart after an expired card is declined   P0  CEL-6
CH-01 Guest checkout shows a retry message after a decline              P0  CEL-6
CH-01 Guest checkout shows a readable message not a provider code       P1  CEL-6
```

```text
find_test_cases "checkout expired card"  -> 0 matches   [dedupe before create]
manage_test_folder create "Exploratory / CH-01 Guest checkout payment"
                                         -> folder id 9134
-> hand to katalon-create-test-cases for create_test_case x3 + link_requirements_to_test_case
manage_test_suite add the 3 cases to "CEL-6 Regression"
read_test_suite                          -> 7 cases, 3 new   [confirmed]
```

**Expected report back to the user.** Name every one of these; a report missing the boundary line is incomplete:

```text
Charter CH-01, guest checkout payment, 60 minutes on staging. Timebox: 44 charter / 11 writeup / 5 setup.
Findings: 2 product defects (BUG-1 P0 cart lost on decline, BUG-2 P1 raw provider string),
  1 open question (CVV length, no acceptance line covers it), 1 unreproduced risk (duplicate idempotency key).
Promoted: 3 cases under folder 9134 "Exploratory / CH-01 Guest checkout payment", added to the CEL-6
  Regression suite. read_test_suite confirms 7 cases, 3 new.
Not reached: email receipt path, out of scope by the charter.
Next charter: CH-02, retry and idempotency under a slow network, 45 minutes.
Boundary: the two defects were NOT filed through MCP. create_defect needs a failed test result ID and this
  session produced none. File them in Jira, or run the three promoted cases and file from the failed run.
```

## Prompt recipes

- `Run a 60 minute exploratory charter on guest checkout payment in Cellphone Shop and give me the findings.`
- `Write a charter for the new search filters. I have no requirement, just the feature.`
- `Debrief my session notes below and tell me which findings should become test cases.`
- `We have an hour before the release. Which area is worth exploring given current coverage?`
- `Which of these findings are real defects and which are just observations?`

## Hand-offs

- Promoted cases to author, dedupe, and import -> `katalon-create-test-cases`.
- The data a promoted case needs before anyone can run it -> `katalon-test-data`.
- Running the promoted cases, by hand or with AI -> `katalon-execute-test`.
- **A red run, not a session.** If the user already has failed test results, this is not the skill - `katalon-analyze-failures` owns failures with a result ID. This skill owns findings that have no result ID at all.
- A charter programme across a sprint or release -> `katalon-test-plan`.
- Coverage gaps the session exposed across the repository -> `katalon-test-management`.

Read `references/charter-and-session.md` before writing a charter, and `references/oracles-and-tours.md` before choosing how to explore.
