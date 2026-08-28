---
title: '05 · Adding a Feature: Barcode Support'
description: 'Plan and build a new feature end to end with /research, /plan, rubber-duck critique, /fleet, and a QA custom agent.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 5 — Adding a new feature: barcode support

| [← Previous: Shaping Copilot CLI's lifecycle with hooks][previous-lesson] | [Next: Modernizing apps with Copilot CLI →][next-lesson] |
|:--|--:|

Adding a greenfield feature inside a brownfield app is a real test of an agentic workflow. It takes forethought: finding the services that already exist, scoping the change, making the updates, and making sure nothing else breaks. An open-ended prompt like "add barcode support" is exactly the kind of request that sends an agent wandering across services, inventing schema, and producing a diff no one can review.

The antidote isn't a trick; it's a loop you run every time you work with an agent — research, spec and plan, build, QA, then iterate. This module walks that loop end to end, using QR code support for AssetTrack as the forcing function for `/research`, `/plan` with a rubber-duck critique, `/fleet`, and a quality assurance custom agent you build yourself.

> [!NOTE]
> **Starting state**: instructions, custom agents (including the `Accessibility Expert` from [Module 2][m02]), and the tests from [Modules 2–3][m02] are in place, and the hooks from [Module 4][m04] are wired up. If you're jumping in here, check out the catch-up branch that holds them:
>
> ```bash
> git checkout start-of-module-05
> ```
>
> This module registers the Playwright MCP server and has you build a quality assurance custom agent, then **modifies application code** in `assets-svc` and `web` — so work on a feature branch such as `feat/barcode-support`.

## What you will learn

- The repeatable loop for working with an agent — research, spec and plan, build, QA, iterate — and how this module makes each step concrete.
- How to build a custom quality assurance agent from a spec, register the Playwright MCP server so it can drive the running app, and compose it with the `Accessibility Expert` from Module 2.
- How to use `/research` to choose a library before committing to an approach, and how to treat the resulting report as evidence rather than as a decision.
- How to use `/plan` and plan mode to produce a written, bounded plan before any code changes, and how a rubber-duck critique catches the gaps a first plan always hides.
- How `/fleet` runs subagents in parallel: when that genuinely accelerates the work, when it backfires, and how to keep the combined diff reviewable.

## Scenario

AssetTrack tracks physical hardware — laptops, monitors, phones, badges — and every asset already carries a unique asset tag such as `CON-LPT-001`. Operators today read those tags by eye and type them in. Contoso wants each asset to carry a scannable QR code so that, in a later phase, an operator can point a phone at an asset and pull up its record. In this module you'll find a library to generate those codes, plan the updates it requires, and add generation to the application — leaving the scanning phase for later.

## The agentic loop

Whether you're fixing a bug or adding a feature that spans several services, the standard approach without AI is:

1. **Research** — understand the problem and the realistic options before committing to an approach.
2. **Spec and plan** — turn that understanding into a written, bounded plan you could hand to someone else.
3. **Build** — implement the plan, ideally in independent slices that can move in parallel.
4. **QA** — prove the result against the plan: it runs, it's tested, it's reviewed, it's accessible.
5. **Iterate** — feed what QA finds back into the work until the gate passes.

The steps don't change when introducing AI agents. If anything, it becomes more important. Spending the time up front to determine what needs to be done, then following it with validation that everything was done correctly, is key to success.

> [!NOTE]
> For our exercise, we're going to start by building out our quality assurance custom agent. Then you'll use it at the end of the module to validate the work done to add the required feature.

## Build the quality gate first

You met custom agents in [Module 2][m02], where you imported the `Accessibility Expert` from a community catalog. Here you'll go the other way and build one to a precise spec, because the checks you want are specific to this feature and this app. A custom agent is a configured persona of Copilot — a name, a description, a restricted toolset, and instructions — that runs in its own isolated context and is invoked deliberately with `/agent`.

The quality assurance agent needs to do five things:

1. read the spec and review the research to determine what needed to be done, 
2. explore the running app to confirm the new functionality actually exists, 
3. run the tests, 
4. review the code on the branch, 
5. confirm the new UI is accessible.

Two of those need help from outside the agent's own reasoning. Exploring the running app means controlling a real browser, which the agent can't do on its own — so you'll give it access to the **Playwright MCP server**, a tool surface that lets Copilot navigate and read pages in a live browser. (MCP servers extend what Copilot can do; [Module 6][next-lesson] goes deeper, but you only need this one here.) And the accessibility check already has an owner — the `Accessibility Expert` agent from Module 2 — so rather than re-teach that knowledge, the quality assurance agent hands the new UI to it and treats a failed confirmation as a finding like any other.

## Exercise 1: Register the Playwright MCP server

Let's start by registering the Playwright MCP server for the quality assurance agent to be able to use later.

> [!NOTE]
> You'll start Copilot CLI with `--yolo`, which auto-approves every edit, command, and tool call so the work doesn't stop for permission on each step — useful once the `/fleet` build is running. That's appropriate here because a codespace is the kind of sandboxed, disposable container that [Module 1][m01] called out as the right home for YOLO mode. Treat it as the exception: on your own machine, or anywhere near real credentials or unreviewed code, start Copilot with plain `copilot` and approve actions deliberately.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Open a terminal window by selecting <kbd>Ctrl</kbd> + <kbd>`</kbd>.
3. Create and switch to a feature branch with `git switch -c feat/barcode-support`.
4. Start Copilot CLI in YOLO mode from the repository root:

    ```bash
    copilot --yolo
    ```

5. In Copilot CLI, run the command `/mcp add` to open the MCP registration panel.
6. Fill out the form, using <kbd>Tab</kbd> to move between fields, with the following information:
    - **Server Name**: `playwright`
    - **Server type**: **STDIO**
    - **Command**: `npx @playwright/mcp@latest`
7. Select <kbd>Ctrl</kbd>+<kbd>S</kbd> to save.

You've now added the Playwright MCP server to Copilot's toolset!

## Exercise 2: Build a Quality assurance agent

Now let's create a `Quality assurance` custom agent whose instructions encode the five checks above. The agent has nothing to inspect yet. You're defining the finish line before the race starts; it does its real work in the final exercise, once research, planning, and the build have given it something to gate.

1. Ask Copilot to create the Quality assurance agent definition. Describe the five responsibilities and let it write the file:

    ```text
    Create a custom agent at .github/agents/qa.agent.md named "Quality assurance" that acts as a quality gate for a feature branch. Give it permissions to read and shell access, the Playwright MCP server, and the ability to invoke other agents. Its instructions should have it, in order: (1) read the feature's research report and plan; (2) use the Playwright MCP server to open the running app and confirm the new functionality actually exists in the UI; (3) run the project's test suites and report the results; (4) review the code changes on the current branch against the plan; and (5) hand any new or changed UI to the Accessibility Expert agent to confirm accessibility, treating a failed confirmation as a finding. It should finish by reporting what it covered, what it couldn't verify, and every gap it found.
    ```

2. Open `.github/agents/qa.agent.md` and review what Copilot wrote. Confirm the five steps are present and in order, that the toolset includes the Playwright MCP server and the ability to call another agent, and tighten any instruction that reads as vague.
3. Reset to a clean conversation with `/new` so Copilot picks up the new agent, then confirm with `/agent`. You should see `Quality assurance` in the list. Exit the agent menu with `Esc`.

When you're done, `.github/agents/qa.agent.md` defines a `Quality assurance` agent that lists in `/agent`, encodes the five checks in order, and is wired to both the Playwright MCP server and the `Accessibility Expert`. It has nothing to gate yet — you'll point it at the finished feature in the last exercise.

## Choosing a barcode library with `/research`

Taking on a new library dependency is not something to improvise. These choices carry consequences that outlive the afternoon you spend on them: the license has to be compatible with the project, the library has to be actively maintained, and — the trap that catches most teams — it must not drag in native dependencies that break inside the production environment. A library that renders by leaning on the host operating system's graphics stack will pass on your laptop and fail in the deployed container. This is precisely the kind of question `/research` exists to answer.

A good research prompt names the decision and its constraints rather than asking for a favorite. It states the use case (generate a QR image for an asset, server-side, in the .NET `assets-svc`), the runtime reality (the service runs in a Linux container, so no native graphics dependencies), and the decision criteria (a permissive license, active maintenance, a pure-managed rendering path). A weak prompt — "what's the best QR library?" — gives the agent nothing to optimize against, and the report drifts toward generic popularity rankings.

Treat the report the way you'd read a colleague's recommendation: check that the cited sources are real and current, that it names a specific library and version, and that the integration sketch points at the actual service. The report is evidence for a decision you make, not the decision itself.

## Exercise 3: Use `/research` to choose a QR library

Now let's use `/research` to determine which library fits best for server-side QR generation in `assets-svc`, with the Linux-container constraint front and center. You'll review the report, and save it locally so it becomes an asset in the repository. This will aid future code generation and other developers on your team, as it will explain what was selected and why it was selected.

1. In the same Copilot CLI session, run `/research` with a prompt that names the use case, the runtime constraint, and the decision criteria:

    ```text
    /research Research a QR code generation library for AssetTrack's assets service (services/assets-svc, .NET 10). I need to generate a QR code image for an asset on the server. The service runs in a Linux container, so the library must not depend on native OS graphics such as System.Drawing. Compare the realistic options and recommend one. For each option, report the license, a maintenance signal (last release and activity), whether rendering is pure-managed, and the output formats it supports (PNG and SVG). End with a recommendation and a short integration sketch for services/assets-svc. Cite your sources.
    ```

> [!NOTE]
> The research will take several minutes as it searches the internet and considers options.

2. Once the report is generated, ask Copilot to save the report to a folder named `reports` and a file named `qr-code-research.md` by using the following prompt:

    ```
    Save the report to reports/qr-code-research.md
    ```

3. In your codespace, open the file `reports/qr-code-research.md`. Review the report, reading through the information Copilot collected. The exact libraries it will return will vary, but you may see the following:

    - Net.Codecrete.QrCodeGenerator
    - QRCoder
    - ZXing.Net

4. Based on the information provided, select the library you think works best. In the prompt examples below, we'll use `Net.Codecrete.QrCodeGenerator`, but if there's a different one you like you're free to use it!

You now have a full report with the various options available to you, comparisons between them, that's now an asset that can be reviewed in the future.

## Planning the feature with `/plan` and rubber-duck critique

A written plan is the cheapest place to catch a mistake. Once an agent starts editing files and running tools, a wrong assumption costs real time to unwind; in a plan, it costs a sentence. That economy is the whole argument for planning first, and it's why this stage produces a plan and nothing else — no edits yet.

The plan for QR support has more substance than "generate an image," because the decision to store the code rather than regenerate it on every request introduces a genuine data change. Persisting the QR payload means the feature naturally separates into waves. The first is a schema change in `assets-svc`: a new column on the assets table, populated when an asset is created or updated, plus a migration. The second is the API: a new `GET /assets/{id}/qr` endpoint that renders the stored payload into an image using the library research settled on. The third is the UI: surfacing the code on the asset detail page at `services/web/src/pages/assets/[id].astro`, with the field threaded through the TypeScript model in between.

The most valuable part of this stage is the critique. A first plan always reads as complete and almost always hides a gap, and rubber-ducking it — asking Copilot to argue against its own plan, ideally with a different model — is how that gap surfaces before it becomes a bug. Here the gap is specific: the QR payload is a deep-link URL that needs the asset's id, but the id doesn't exist until after the row is inserted. A plan that says "generate the payload on insert" is subtly wrong, and the fix — populate on write and backfill the rows that already exist — is exactly the kind of thing a critique catches.

## Exercise 4: Plan the feature with `/plan` and a rubber-duck critique

Now let's turn the library choice into a bounded, multi-wave plan, saving it to `docs/plans/qr-support.md` — still with no application code changed. The plan is finished when a teammate, handed it, would produce the same diff you would.

> [!NOTE]
> Because Copilot is probabilistic rather than deterministic, the exact plan generated and flow you experience may vary. The steps below provide guidance on what to expect, but you will need to adjust based on the exact path Copilot takes.

1. In the same session, select <kbd>Shift</kbd>+<kbd>Tab</kbd> until Copilot CLI is in **plan** mode.
2. Ask for a plan that covers the whole feature by using the following prompt:

    ```text
    /plan QR code support for AssetTrack using the library Net.Codecrete.QrCodeGenerator. The QR payload is a deep-link URL to the asset's detail page. Cover: a schema change in services/assets-svc to store the payload, populating it when an asset is created or updated, a new GET /assets/{id}/qr endpoint that renders the stored payload as an SVG image, surfacing the QR code on the asset detail page in services/web, and tests across each layer.
    ```

> [!NOTE]
> Copilot will likely ask follow-up questions as it builds the plan. Use your best judgement and the following guidance to answer the questions:
>
> 1. Because the website won't actually be deployed, it's OK to accept `http://localhost:4321` as the target URL base.
> 2. Use server-side rendering whenever possible.
> 3. Expose payload as JSON for flexibility.

3. Review the plan. Look for anything that might be vague or otherwise confusing. If you're not sure how you'd follow the plan, the same would hold true for the agent. As needed, cursor down to the bottom option, which will read something like `Suggest changes`, and request any necessary updates.

Once you're satisfied with the plan, it's still a best practice to have a review of it. Copilot can do this for you through rubber ducking. Let's ask Copilot to perform a rubber duck review!

4. In Copilot CLI, cursor down to `Suggest changes`.
5. Use the following prompt to request the rubber duck review:

    ```text
    Rubber duck this plan with a new model and agent. Have the rubber duck look for what's missing, what breaks existing behavior, and what would a reviewer reject? Pay attention to the QR payload: it's a deep-link URL that needs the asset id. Does the plan handle assets that already exist in the database?
    ```

6. Copilot will rubber duck the plan, identifying potential gaps and any other updates. Follow the prompts from Copilot, answering questions based on the approach you'd like to take to adding the functionality.
7. Once you're happy with the plan, select the prompt that says something similar to `Exit plan mode and I will prompt myself.`
8. Save the plan so it becomes a referenceable asset — and so `/fleet` and the Quality assurance agent can read it later. Ask Copilot to write it to `docs/plans/qr-support.md`:

    ```text
    Save the plan to docs/plans/qr-support.md
    ```

With the help of Copilot, and a rubber duck, you now have a good plan to implement the feature.

## Executing in parallel with `/fleet`

With a bounded plan in hand, the implementation is ready to run — and because the plan split cleanly, parts of it can run at the same time. `/fleet` spins up several subagents at once, each owning an independent slice of the work. The qualifier that matters is independent. Parallelism pays off when slices don't touch each other's inputs: separate files, separate test suites, a server change and a UI change that meet only at a stable contract. It backfires on cross-cutting work, where one agent's output is another agent's input and running them together just produces conflicts.

The QR plan is a good fit because its waves were drawn along those lines. The schema-and-API work in `assets-svc` and the UI work in `services/web` meet only at the shape of the `GET /assets/{id}/qr` endpoint, so once that contract is fixed, the two can proceed in parallel. Each subagent produces its own diff stream, which is what keeps the parallelism from turning into a tangle — you review each slice on its own terms rather than trying to make sense of one merged blast of changes.

This is also where the discipline of the earlier stages pays off. The reason these slices can run in parallel without stepping on each other is that the research settled the library and the plan drew clean seams. `/fleet` is fast here not because parallelism is inherently fast, but because the work was shaped to be parallelizable.

## Exercise 5: Build the waves in parallel with `/fleet`

Now let's implement the plan with `/fleet`. Copilot will look at the plan and what needs to be done, then divide the work appropriately.

Let's tell Copilot to use a fleet of agents, and to divide the work between the frontend and backend, bringing everything together when each separate component is complete. Also provide guidance to run tests and make the necessary fixes. 

1. Send the following prompt to launch the fleet of agents:

> [!IMPORTANT]
> Type the `/fleet` command manually and paste the rest of the prompt. This will ensure fleet mode is properly enabled.

    ```
    /fleet Implement the plan we just created. Divide the work between the backend and frontend. Ensure we have tests each step of the way, and that they pass. Bring everything together into one agent as necessary.
    ```

Copilot will get to work implementing the feature!

> [!NOTE]
> Building this feature will take several minutes to complete.

When you're done, the feature is built and compiles: an asset has a stored `qr_payload`, existing assets were backfilled, `GET /assets/{id}/qr` returns an image, and the asset detail page renders the QR card — each wave arriving as its own reviewable diff. What you don't yet have is anyone vouching for it. That's the next stage.

## Running the gate with your Quality assurance agent

Parallel speed has a cost: several subagents each moved fast on their own slice, and no single pass has looked at the whole result with testing in mind. That's the QA step of the loop, and the agent you built in Exercise 2 is what performs it. Point it at the branch and it works through its five checks: it reads the research and plan, drives the running app through the Playwright MCP server to confirm the QR code actually appears, runs the tests, reviews the diff against the plan, and hands the new asset detail UI to the `Accessibility Expert` for a verdict.

Whatever it surfaces is the start of the fifth step — iterate. A gate is only useful if you act on it: you fold its findings back into the code and run it again, until the feature clears it. One agent owns "is the promised behavior covered and working," and it delegates "is the new surface accessible" to the agent that already owns that question.

## Exercise 6: Run the Quality assurance agent you built

Finally, let's run the `Quality assurance` agent over the `/fleet` build, then iterate on what it finds. The agent will drive the running app, so make sure AssetTrack is up — `npm run dev`, with the UI reachable at `http://localhost:4321` — in the terminal where you've kept the app running.

> [!NOTE]
> Custom agents start with a fresh context. This means they'll only have the information you pass to it or they discover on their own. That can be advantageous in many scenarios, including performing a review. Having a Quality assurance agent do its review knowing the approach that was taken could lead to it taking shortcuts, assuming work was completed that wasn't actually done. By starting from scratch, only knowing what was supposed to be done, means it will naively explore, ask questions, and report back anything that doesn't align with the original goals.

1. Switch to the agent with `/agent`, select `Quality assurance`, then run it over the branch:

    ```text
    Review the QR code feature on this branch against reports/qr-code-research.md and docs/plans/qr-support.md. Work through your full checklist: confirm the QR code renders in the running app, run the tests, review the diff, and confirm the new asset detail UI with the Accessibility Expert. Report what you covered, anything you couldn't verify, and every gap you found.
    ```

2. Watch the agent work through its checks. It should open the app in a browser through the Playwright MCP server to confirm the QR code is really there, run the test suites, review the changes, and delegate the UI accessibility check to the `Accessibility Expert`.
3. Iterate on the findings. For each gap the agent reports, ask Copilot to fix it, then run the `Quality assurance` agent again. Repeat until the gate comes back clean.
4. Commit the feature, along with any tests the gate added, once it passes.

When you're done, the `Quality assurance` agent has confirmed the QR code renders in the running app, the tests pass, the diff matches the plan, and the new asset detail UI carries an accessibility sign-off — with every gap it found either fixed or recorded rather than silently skipped.

## Summary

QR support is a small feature, but it's a real one: it changes the database, adds an API endpoint and a dependency, threads a field through to the UI, and carries tests across every layer it touches. Walking the loop end to end, you:

- Built a `Quality assurance` custom agent first — your definition of "done" — wired to the Playwright MCP server and composed with the `Accessibility Expert` from Module 2.
- Used `/research` to choose a QR library you can defend, with the container constraint front and center and citations to back the choice.
- Used `/plan` and a rubber-duck critique to turn that choice into a bounded, multi-wave plan — and caught the deep-link backfill problem before it became a bug.
- Used `/fleet` to build the independent waves in parallel, then integrated a set of independently reviewable diffs.
- Ran the Quality assurance agent as the gate, then iterated on its findings until the feature passed.

The throughline is the loop itself: research and planning make the parallel build safe, and a quality gate you defined up front catches what speed alone would miss. Next, you'll apply the same research-and-plan instincts to a larger problem — modernizing AssetTrack's older services — with `/research`, `/lsp`, MCP servers, and per-stack migrator agents in [Module 6][next-lesson].

## Resources

- [Plan mode in Copilot CLI][copilot-plan]
- [About custom agents in Copilot CLI][copilot-agents]
- [Adding MCP servers to Copilot CLI][copilot-mcp]
- [Playwright MCP server][playwright-mcp]

---

| [← Previous: Shaping Copilot CLI's lifecycle with hooks][previous-lesson] | [Next: Modernizing apps with Copilot CLI →][next-lesson] |
|:--|--:|

[previous-lesson]: ../04-lifecycle-hooks/
[next-lesson]: ../06-modernize-apps/
[m01]: ../01-working-with-copilot-cli/
[m02]: ../02-building-ai-infrastructure/
[m04]: ../04-lifecycle-hooks/
[copilot-plan]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[copilot-agents]: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
[copilot-mcp]: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
[playwright-mcp]: https://github.com/microsoft/playwright-mcp
