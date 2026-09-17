---
title: '06 · Modernizing Apps'
description: 'Give Copilot better signal with LSP and MCP servers and drive a defensible modernization with per-stack migrator agents.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 6 — Modernizing apps with Copilot CLI

| [← Previous: Adding a new feature][previous-lesson] | [Next: Managing Copilot's infrastructure →][next-lesson] |
|:--|--:|

Modernizing a brownfield service is a research problem before it's a coding problem, and an orchestration problem once the research is done. Then, the cycle continues.

The temptation with an agent is to point it at an old service and say "upgrade this" — the same open-ended prompt that [sent Copilot wandering][m05] on the barcode feature. The discipline that made the barcode feature work applies here too: assess the ground truth, plan against real sources, build a safety net, migrate in small reviewable steps, validate each one, and write down what you learned so the next upgrade is faster.

This module walks that loop against AssetTrack's oldest service. You'll give Copilot better signal with a language server and a documentation MCP server, use `/research` to produce a migration plan you can defend, protect the change with tests, and drive the upgrade with a custom migrator agent. Along the way you'll build reusable assets — an agent, a saved plan, a playbook, an extended test hook — so the second legacy service costs a fraction of the first.

## What you will learn

By the end of this module you will be able to:

- Explain why a standard modernization process still applies when an agent does the work, and how to keep an upgrade small and reviewable.
- Configure a Language Server Protocol (LSP) server so Copilot reasons about Java from the compiler instead of from text search.
- Register a documentation MCP server so Copilot grounds framework claims in first-party docs rather than stale training data.
- Use `/research` to produce a citation-backed migration plan and save it as a reusable asset.
- Establish a test safety net that gives fast signal when a change breaks behavior, so the upgrade can move quickly.
- Author a custom migrator agent that executes the upgrade in reviewable phases, and capture a playbook that accelerates the next service.

## Scenario

AssetTrack is a polyglot system, and two of its Java services are a generation behind. `audit-svc` and `auth-svc` both run on Java 17 and Spring Boot 3.5 — a supported but no-longer-current generation — while the platform's target is the current supported generation, Java 21 and Spring Boot 4.1. The services aren't vulnerable today: their dependencies are pinned to CVE-clean versions, and the hard rule is that no branch of this upgrade may ship a known-vulnerable package. But staying a generation back means missing the current framework's defaults, its language and runtime features, and the security posture that comes from tracking the latest supported line. The mandate is to bring them forward onto the current runtime and framework generation without ever regressing that clean dependency baseline.

You won't do both at once. You'll modernize `audit-svc` first because it's the smaller, better-bounded service — it has no security-token code and no third-party JSON or JWT dependencies — so the upgrade is close to mechanical and you can learn the shape of the work with fewer moving parts. Then you'll turn what you learn into assets — a migrator agent and a written playbook — that make `auth-svc` a repeat rather than a fresh start. `auth-svc` is where the real dependency-security lesson lives: its `jjwt` token library drags a vulnerable transitive Jackson 2 under Spring Boot 4, and clearing that is the centerpiece of the second upgrade. `workforce-svc` already runs on Java 21, so the runtime jump is well-trodden ground; the Spring Boot 4 major is new ground for all of them.

> [!NOTE]
> **Starting state**: your fork has the AI infrastructure from earlier modules in place — custom instructions, the `Accessibility Expert` agent, the [`make-repo-contribution` skill][m02] you built earlier, and the [lifecycle hooks][m04] you added. If you're jumping in here, check out the catch-up branch that holds them:
>
> ```bash
> git checkout start-of-module-06
> ```
>
> This module changes production code in `audit-svc` and `auth-svc`; you'll modernize both services, then ship the whole thing as a single pull request at the end with the `make-repo-contribution` skill, which creates the branch and opens the PR for you.

## Modernization is still a process, even with an agent

The reason "upgrade this service" fails as a prompt is the same reason it fails as a plan for a human: an upgrade is a sequence of decisions, and skipping the decisions doesn't make them go away — it just moves them into the diff where they're expensive to find. A framework major that raises the minimum runtime, a namespace that gets renamed out from under your imports, a dependency that no longer resolves: each is a fork in the road, and an agent with no plan takes them at random.

The loop that keeps that under control is the ordinary one that careful teams already use for a risky upgrade, and an agent doesn't change it:

1. **Assess** — establish what the service actually is today: its runtime, framework version, dependencies, and the shape of its code.
2. **Plan** — turn the target into a sequence of small, ordered steps, grounded in the real migration guides rather than guesses.
3. **Protect** — put a test safety net in place so you can tell immediately when a change alters behavior.
4. **Migrate** — apply one step at a time, keeping each change small enough to review.
5. **Validate** — build and test after every step so a regression surfaces against the step that caused it, not ten steps later.
6. **Document** — capture the decisions and the recipe so the next service reuses the thinking instead of rediscovering it.

Agents change the speed of each step, not the steps themselves. An agent can assess a service and apply a mechanical migration far faster than doing it by hand — which makes the plan, the safety net, and the validation matter more than ever, because a fast agent makes a wrong assumption expensive just as fast. This is also the shape of the purpose-built modernization tooling you'll meet at the end of the module — GitHub's own Java modernization agent runs an assess-plan-execute pipeline, which is the same loop productized. Learning it by hand first is what lets you drive that tooling well later.

> [!NOTE]
> In this module you'll be modernizing Java code to newer versions. Modernizing an entire application is an entire course unto itself, so our goal here isn't to teach the finer points of the process, but rather highlight how the standard flow is augmented with GitHub Copilot.
>
> Additionally, there is a purpose-built version of a Copilot CLI plugin, [GitHub Copilot modernization][copilot-modernization-plugin]. It installs from a marketplace and runs a `modernize` agent through a standard process.
>
> We'll be walking through the process by hand, using research, custom agents, and tests. Basically, you can think of this as doing the math by hand to see the numbers, then you can reach for a calculator in the future.

## Model choice during the upgrade process

GitHub Copilot provides access to numerous models of various levels, including the ability to bring your own key. This allows you to choose the right model for the job.

As you work through the application modernization flow, you'll move back and forth between higher-end tasks, like planning and research, to lower-end tasks, like writing code and generating tests. With `/model` you can switch to an appropriate model depending on the needs of the current ask, both saving time and reducing the credit usage necessary to complete the operation. For example, you might choose Claude Opus 4.8 to build the plan, then assign an agent using MAI-Flash-1 to implement the code as defined in the plan.

> [!NOTE]
> During our exploration here we're going to use `auto` as our model choice, which allows Copilot to choose the model it thinks is most appropriate for the task. This is both to streamline the lesson and to allow for completion of the course with reduced credit usage. When it comes time to being complex operations on your production codebase, you can deploy various strategies to choose the right model at the right time.

## Giving Copilot better signal: LSP and documentation MCP

Before Copilot makes upgrade changes, it needs a strong signal about both the code it is changing and the framework it is targeting. It should understand the code the way a compiler does, and understand the target framework the way its maintainers document it. Two extension points provide that signal.  

A **[Language Server Protocol (LSP)][copilot-cli-lsp-concept]** server gives Copilot structured code intelligence — go-to-definition, find-references, hover types, workspace symbol search — from the language's own analyzer rather than from text matching. On a modernization that precision matters: when Copilot needs to know every caller of a method whose signature changed, or whether a renamed symbol is fully rewired, an LSP answers from the compiler's model of the code, and it does so with compact structured results instead of reading whole files into the conversation. Copilot CLI uses a configured LSP automatically whenever one is available for the language in play.

2. **An MCP server** extends what Copilot can *do*; a documentation MCP server points that extension at first-party docs. [Model Context Protocol (MCP)][mcp-concept] is an open standard for giving a model access to external tools and data, and Copilot CLI ships with the GitHub MCP server built in. For a Spring Boot major upgrade the documentation that matters is the frameworks' own, and the most direct way to reach it is [GitMCP][gitmcp], an open-source server that turns any public GitHub repository into a documentation surface. Point it at `spring-projects/spring-boot` and Copilot reads Spring's own docs straight from the source, with no account or API key — and because it's open source you can self-host it. Pointing Copilot at a live docs surface is what keeps its framework claims tied to current guidance instead of whatever version happened to be current when its training data was frozen. For a framework major upgrade where the whole point is that things changed, that freshness is the difference between advice you can trust and advice you have to re-verify by hand.  

### Where LSP and MCP configuration live

Copilot CLI loads LSP configuration from, in priority order, a project-level `.github/lsp.json`, any installed plugins, and a user-level `~/.copilot/lsp-config.json`. A project-level file is the right choice for a shared course repo because it travels with the clone, so every contributor gets the same code intelligence — as long as the language server itself is installed in their environment. Each entry maps a language server to the file extensions it handles. MCP servers are configured separately and added with the `/mcp add` command inside a session, or with `copilot mcp add` from your shell.

## Exercise 1: Configure a Java LSP and a documentation MCP server

You'll give Copilot structured intelligence for AssetTrack's Java code and a first-party documentation surface for the framework research that follows. The fastest way to set up an LSP correctly is the `lsp-setup` skill, which detects your OS, installs the right server, and writes the configuration for you.

### Install the Java language server

Start with the code signal: install the Eclipse JDT language server through the `lsp-setup` skill and commit its configuration so the whole team shares the same view of the code.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Open a terminal by selecting <kbd>Ctrl</kbd> + <kbd>\`</kbd>, then start Copilot CLI from the repository root by running `copilot --yolo`.
3. If prompted, trust the project folder by selecting **Yes, and remember this folder for future sessions**.
4. Run `/models`, select **Auto** from the list, and select <kbd>Enter</kbd>.
5. Ask Copilot to install the skill directly from the [Awesome GitHub Copilot][awesome-copilot] collection by entering the prompt:

    ```text
    Install the lsp-setup skill from awesome-copilot
    ```

    Copilot fetches the skill and writes it into the project skills directory as `.github/skills/lsp-setup/`.
6. Start a new chat with `/new` so Copilot loads the newly installed skill. Confirm it's available by running `/skills list` — you should see `lsp-setup` in the list — then start the setup by entering the prompt:

    ```text
    setup lsp
    ```

7. When asked which language, choose **Java**. When asked about scope, choose the repository-level configuration so it's written to `.github/lsp.json` and shared with the team. The exact prompts vary depending on the approach Copilot takes, so follow the remaining prompts and use your best judgment to install the server.

8. When setup finishes, load the configuration by running `/lsp reload`, then confirm the server starts by running `/lsp test java`. You should see the `java` server start and report ready.

    The skill writes a `.github/lsp.json` that registers the [Eclipse JDT Language Server (`jdtls`)][jdtls] for Java. It looks like this:

    ```json
    {
        "lspServers": {
            "java": {
                "command": "jdtls",
                "args": [],
                "fileExtensions": {
                    ".java": "java"
                }
            }
        }
    }
    ```

> [!NOTE]
> The committed `.github/lsp.json` tells Copilot how to launch `jdtls`, but each environment still needs the server installed — that's what the `lsp-setup` skill does. A teammate who clones the repo runs the same skill once to install `jdtls` locally. It runs on the Java 21 JDK the AssetTrack devcontainer provides, which both builds `audit-svc` and `auth-svc` — they target Java 17 — and analyzes their source without trouble.

9. To complete the installation, exit Copilot CLI by using the command `/exit`, then `/exit` again, then re-open Copilot by running `copilot --yolo`.

With `.github/lsp.json` committed and `jdtls` installed, every contributor now gets the same compiler-backed view of AssetTrack's Java code.

### Register a documentation MCP server

Now add the framework signal: register GitMCP, pointed at Spring Boot's own repository, so Copilot can read first-party documentation while it works.

1. In the same session, run `/mcp add` to open the registration form.
2. Complete the form for the GitMCP documentation server, using <kbd>Tab</kbd> to move between fields:
    - **Server Name**: `gitmcp-spring-boot`
    - **Server type**: **HTTP**
    - **URL**: `https://gitmcp.io/spring-projects/spring-boot`
3. Select <kbd>Ctrl</kbd> + <kbd>S</kbd> to save, then <kbd>Esc</kbd> to leave the form.
4. Confirm the server loaded by running `/mcp list` and checking that `gitmcp-spring-boot` appears alongside the built-in GitHub server.  
5. Select <kbd>Esc</kbd> to exit the MCP configuration screen.

> [!TIP]
> GitMCP serves whatever documentation a repository publishes — a project's `llms.txt` if it has one, otherwise its in-repo reference docs and README — so it's only as good as the source repo. If an answer comes back thin, point it at a more documentation-rich repository, add a second GitMCP server for another library (for example the Jackson repository, which matters for the Spring Boot 4 JSON change), or use the dynamic `https://gitmcp.io/docs` endpoint and name the repository in your prompt.

GitMCP for Spring Boot is now registered, so Copilot can pull Spring Boot's own documentation on demand as it plans and applies the upgrade.

Both the language server and the documentation MCP server are part of AssetTrack's AI infrastructure from now on.

## Planning the migration with `/research`

A framework major upgrade is exactly the kind of decision `/research` exists to support: it needs current, cross-referenced sources, and the cost of getting it wrong is high. The [`/research`][copilot-research] slash command runs a specialized agent that investigates your codebase, relevant GitHub repositories, and the web, then produces a cited Markdown report. Unlike a normal chat answer, the report is saved to disk, so it becomes an artifact you can review, save into the repo, and hand to a teammate.

A good research prompt for a migration names the service, the current stack, the target, and the specific decisions the plan has to make — the runtime jump, the framework version, the namespace change, the data-access approach — and asks for phases and risks rather than a yes/no answer. A weak prompt ("how do I upgrade this?") gives the agent nothing to optimize against, and the report drifts toward a generic checklist. Because the research agent works autonomously and documents its assumptions rather than stopping to ask, the more constraints you give it up front, the more useful the report.

Treat the result as evidence, not as the decision. The upgrade touches real things: Spring Boot 4 builds on [Spring Framework 7][spring-framework-7] and raises the minimum Java version, so the runtime and the framework move together; Spring Boot 4 defaults to [Jackson 3][jackson-3] — the new `tools.jackson` namespace — and no longer manages Jackson 2, so anything still resolving a Jackson 2 artifact needs a deliberate decision rather than a silent transitive pull; and the target is the current framework generation, not a data-layer rewrite — so keep `audit-svc`'s working `JdbcTemplate` code in this upgrade and record the larger move to [Spring Data JPA][spring-data-jpa] as a separate follow-on rather than smuggling a rewrite into a framework bump. A good report will surface each of these with a source; your job is to confirm the sources are real and current before you let the plan drive code.

> [!NOTE]
> The riskiest part of a major upgrade is often the changes in default behavior, not renames and versions. A new major version can silently alter how the framework behaves out of the box, so code that never changed starts doing something different, and the failure shows up at runtime with no obvious link to anything you edited. That's why default behavior belongs in your research up front: a shifted default is far cheaper to surface in a report and hand to the agent as an explicit constraint than to debug in a failing service later. A research pass that digs to this depth takes real time and reads dozens of sources, which is exactly why the plan in the next exercise was produced once and captured as a reusable asset rather than regenerated live.

## Exercise 2: Get a research-backed migration plan for audit-svc

The plan you'll drive the rest of the module from was produced by a real `/research` run — the research prompt in the tip below, pointed at `audit-svc` — and then trimmed so Copilot can consult it without re-reading a 700-line report every time it needs the recipe. It's a representative artifact: citation-backed, phased, and grounded in the actual `contoso-inventory` source. You'll pull it into the repo now so it becomes the first reusable asset of the modernization, then verify it before it drives any code.

1. In your main session, have Copilot find the representative plan in the course repository and save it into your repo. Copilot CLI ships with the GitHub MCP server, so it can locate the file by repository and name rather than a brittle raw URL:

    ```text
    Using the built-in GitHub MCP server, find the audit-svc migration plan in the github-samples/advanced-copilot-cli repository — it's the resource file under content/resources for modernizing audit-svc. Read its contents and save them to docs/modernization/audit-svc-plan.md in this repo. Save it as-is — don't summarize or reformat it.
    ```

2. Open `docs/modernization/audit-svc-plan.md` and read the phases. Check it against the ground truth so you trust it before it drives code: it names a specific Spring Boot 4.1 parent rather than a generic "4.x", it accounts for the Jackson 2→3 default that Spring Boot 4 brings, and it keeps the existing `JdbcTemplate` data access rather than folding a JPA rewrite into the upgrade. Verify a couple of the cited links resolve. This is the contract the migrator agent works against, so if any phase reads too vaguely to hand to a teammate, ask Copilot to deepen it — ambiguity here becomes drift later.

> [!TIP]
> Want to see how the plan was produced? Generate your own! Type `/research`, then paste the prompt that names the service, the current and target stacks, and the decisions the plan must make. Do keep in mind it will take roughly 30 minutes for the research to complete.
>
> ```text
> I need to modernize the audit-svc service in this repo. It currently runs on Java 17 and Spring Boot 3.5.16 with raw JDBC (JdbcTemplate) over SQLite, with jackson-bom and log4j2 pinned to CVE-clean versions. The target is the current supported generation: Java 21 and Spring Boot 4.1 (Spring Framework 7). Produce a phased migration plan. For each phase cover: the exact changes (the spring-boot-starter-parent version bump to the latest Spring Boot 4.1, the java.version bump from 17 to 21, how the Spring Boot 4 default of Jackson 3 affects this service, and confirmation that the existing JdbcTemplate data access stays as-is for this upgrade with any move to Spring Data JPA called out only as an optional follow-on), the order to do them in, how to validate each phase, and the risks. A hard constraint: no phase may introduce a known-vulnerable dependency. Cite the official Spring Boot 4 migration guide and Jackson 3 sources.
> ```
>
> The research runs for several minutes while the agent reads the code and the official Spring Boot and Jackson guides on the web — it won't stop to ask questions, it records its findings in the report. When it finishes, save it with `/share file research docs/modernization/audit-svc-plan.md`. Your report will be longer and more heavily footnoted than the trimmed version you downloaded, but the decisions and the shape will be the same.

## Creating a test safety net

A modernization is a unique kind of code update: the whole point is that behavior stays the same while the framework underneath it migrates completely. That's exactly the situation tests were built for. A suite that pins the current behavior turns every phase of the upgrade into a yes/no question, "Did the parent bump, the base-image change, or a moved import alter what the service does?", and answers it in seconds instead of in a production incident weeks later. Without that signal you're reading diffs and hoping; with it, you can let a fast agent make sweeping changes and know immediately when one lands wrong.

Two layers of tests catch different failures, and a real upgrade wants both:

- **Regression tests at the service** — unit and integration tests that exercise `audit-svc`'s endpoints and its data access. These are the inner loop: they run in seconds after every phase and pinpoint the exact change that broke a behavior, so a regression is fixed against the phase that caused it rather than untangled ten phases later.
- **End-to-end tests across the system** — a [Playwright suite you built earlier][m03] that drives AssetTrack through the UI. A framework major can leave a service's own tests green while breaking how it integrates with the rest of the system; the e2e layer is the outer net that catches a contract that shifted at the seams.

The catch is that `audit-svc` has no tests today, which is common for exactly the services most in need of modernizing. So the first move isn't the upgrade — it's building enough of a net to make the upgrade observable. You capture the current behavior *before* you change the framework, so the tests describe "what `audit-svc` does on Spring Boot 3.5," and then hold that description constant as you move it to 4.1. Tests written after an upgrade only prove the new code is self-consistent; tests written before it prove you didn't change behavior on the way.

> [!TIP]
> Writing characterization tests against the old version first is what makes a modernization safe to hand to an agent at all. The tests become the specification the agent has to keep satisfying, which turns "trust me, the upgrade is fine" into a green suite anyone can rerun.

## Exercise 3: Build a test safety net for audit-svc

Now put that into practice: capture `audit-svc`'s current behavior in tests *before* you touch the framework, so the upgrade has a baseline to be measured against.

1. Still in your main session, have Copilot add the tests and run them, so the safety net is green before anything changes:

    ```text
    audit-svc has no tests. Before we modernize it, add a safety net that captures its current behavior. Add a Spring Boot context-load test like workforce-svc's WorkforceApplicationTests, plus integration tests that exercise the AuditController endpoints and the AuditRepository queries and assert the current JSON responses. Configure the tests to use an isolated temporary SQLite database instead of the real AUDIT_DB_PATH so they don't touch /data/audit.db. Then run them with mvn test from services/audit-svc and confirm they pass on the current Spring Boot 3.5 code before we change anything.
    ```

2. Confirm Copilot reports the suite passing against the *old* version. This is the baseline: if the upgrade changes behavior, these are the tests that will tell you.

When you're done, `audit-svc` has a green safety net on Spring Boot 3.5 — the behavioral baseline the migrator agent has to keep satisfying phase by phase.

## Driving the upgrade with a custom migrator agent

You could run the migration from your main session, but a modernization is a good candidate for a dedicated custom agent, because a written scope and a small tool surface keep the work reviewable and repeatable. A migrator agent whose instructions pin it to one service — its source, its build, and the repo wiring that service depends on — stays out of the frontend and the other services, and because its behavior is written down, you can point it at the next legacy service without re-explaining the job.

One caveat, stated honestly: that scope is an instruction the agent follows, not a sandbox. A custom agent's tools control the *kinds* of actions it can take — read, edit, run commands — but `edit` and `execute` still reach the whole repository. The agent keeps to the service it's migrating and that service's wiring because its instructions say so. That is exactly why the approval gate matters, and why the finishing edits it makes to shared files, like the test router and `package.json`, are ones to read most closely.  

The migrator's instructions encode the process, not a specific service: read the saved plan, apply one phase at a time, run the service's tests after each phase, stop after each phase and wait for your approval before starting the next, and report rather than pressing on when a phase fails. Once the phases are approved and green it finishes the job the way a careful person would — running the end-to-end suite as a final gate, wiring the service into the repo's test router and dev script, and writing a status report — so what comes out the other end is a fully migrated service, not just an edited `pom.xml`. That approval gate is what keeps a fast agent honest: validation between phases is where a framework upgrade catches its own mistakes, and it only helps if you read the diff before waving the agent on.

## Exercise 4: Modernize audit-svc with the migrator agent

You'll author a `Java migrator` custom agent, run it through the saved plan one reviewable phase at a time, and capture what you learned so the next service reuses it.

### Author the migrator agent

Now encode the process itself in a reusable agent whose written scope keeps the migration reviewable and lets you rerun it on the next service.

1. Ask Copilot to write the agent definition from the migration plan you saved, so the process the research captured becomes the agent's instructions instead of a list you re-describe by hand:

    ```text
    Read docs/modernization/audit-svc-plan.md, then create a custom agent at .github/agents/java-migrator.agent.md named "Java migrator" with read, edit, and execute tools that follows that plan to modernize one service and its wiring at a time — never another service or the frontend. It works one phase at a time, running the service's Maven tests after each phase and stopping for my approval before the next, then runs the Playwright end-to-end suite (npm run test:e2e) as a final gate. Finish with a testing status report confirming both layers pass on the target stack.  
    ```

2. Open `.github/agents/java-migrator.agent.md` and review it. Confirm the scope (one service plus its wiring, never another service's source or the frontend), the read/edit/execute tools, the phase-by-phase rule that stops for your approval and runs the service's tests between phases, the finishing work it does once the phases are green — the end-to-end gate, the test-router route, and the dev-script cleanup — and the closing testing status report that confirms both the unit and end-to-end suites passed on the updated framework and runtime.  
3. Reset to a clean conversation with `/new` so Copilot picks up the new agent, then confirm it with `/agent`. You should see `Java migrator` in the list. Select <kbd>Esc</kbd> to exit the agent menu.

The `Java migrator` agent now exists as a repository scoped asset — one you'll use to drive your migrations.

### Run the migration phase by phase

Drive the upgrade through the saved plan, approving one phase at a time and reading the diffs — watching most closely where the agent touches shared files. The agent runs the migration end to end; your job is the review at each gate.

1. Switch to the agent with `/agent` and select `Java migrator`, and select <kbd>Enter</kbd>.
2. Tell the agent to perform the upgrade of audit-svc by using the following prompt:

    ```text
    Modernize services/audit-svc following the guidelines provided in the agent, and give me a final status report at the end. The baseline test suite from the previous exercise is already in place, so confirm it passes and start from the toolchain phase.
    ```

    Watch the agent work the loop: it bumps the `spring-boot-starter-parent` to Spring Boot `4.1.0` and the `java.version` from `17` to `21`, re-points the `jackson-bom` currency pin at a CVE-clean Jackson 3 (Boot 4.1.0 otherwise resolves a still-vulnerable Jackson `3.1.4`), and builds and tests after each phase. When the LSP is active, notice that it locates callers and symbols precisely rather than grepping.

3. Read the agent's testing status report. It should name the stack the service now targets — Java 21 and Spring Boot 4.1.0 — and confirm both layers ran and passed against it: the per-phase `audit-svc` unit and integration tests, and the final end-to-end suite.

### Capture the playbook and update the agent

As highlighted previously, app modernization follows a cycle of research, coding and orchestration. As you complete one cycle, learnings should be documented and updates made to the tools used. Now that you've updated the first service, let's document any learnings, and ensure the agent is updated to reflect any needed changes. Writing docs and editing the agent definition are outside the migrator's scope, so switch back to your default agent with `/agent` before you start.

1. Turn what you just learned into a short playbook so the next service reuses the recipe. Ask Copilot to write it from the actual work, not from theory, by sending the following prompt:

    ```text
    Using the the learnings and process we just followed, let's create an updated migration-playbook.md file that will supersede the original. Bring over anything applicable generalized from the original research, and any lessons from the upgrade you just performed.
    ```

2. Ask Copilot to update the agent with any learnings it has that might improve the process by using the following prompt:

    ```text
    Let's perform a similar update to the agent definition as well. Identify any areas of the agent's definition that could be improved upon.
    ```

3. Review the newly generated `migration-playbook.md` and updated `java-migrator.agent.md` files, making any changes you believe are necessary for clarity's sake.

When you're done, `audit-svc` runs on Java 21 and Spring Boot 4.1, its tests are green, and it has moved a full generation forward from Java 17 / Spring Boot 3.5 — and you've produced four assets that outlast this one service: the `Java migrator` agent, the saved plan, the playbook, and a test router that now guards the modernized service.

## Exercise 5: Reuse the assets on the next service

Modernizing the first service was the expensive part. The second one is where building assets pays off: the same agent and the same playbook are most of the work already done — and because the playbook already captured the recipe, you don't need a second research pass to rediscover it. `auth-svc` starts from the same Java 17 / Spring Boot 3.5 baseline as `audit-svc`, but it carries this module's real dependency-security lesson: it issues JWTs with the `jjwt` library, and under Spring Boot 4 `jjwt`'s serializer drags in a vulnerable transitive Jackson 2 — exactly the dependency the framework upgrade stops managing for you. Clearing it without regressing the clean baseline is the substance of this upgrade: bump `jjwt` from `0.11.5` to `0.12.7` (its `-api`, `-impl`, and `-gson` artifacts) and swap the `jjwt-jackson` serializer for `jjwt-gson`, whose CVE-clean Gson dependency (`2.13.2`) removes Jackson 2 from `auth-svc` entirely.

> [!TIP]
> That difference is here on purpose. `auth-svc` isn't a clean re-run of `audit-svc`, and that's the point. It leans on an extra third-party library for its login tokens, and that library's transitive dependencies react to the Spring Boot 4 upgrade in a way `audit-svc`'s never do — small, realistic ways that no two services are ever quite alike. When the vulnerable-Jackson pull trips a build or a dependency check, you're watching the safety net do its job, not the agent coming apart. A red signal is a precise instruction you hand back to the agent — "this library pulled a vulnerable transitive," "swap the serializer to jjwt-gson" — and it adapts. That loop, where good prep plus a red result sharpens the next instruction, is exactly how better inputs produce better AI outcomes. Expect a little iteration on the second service, and read it as the process working rather than the agent misbehaving.

1. Start a new session in Copilot to load the changes we just made by using the `/new` command.
2. Build the safety net first, the same way you did for `audit-svc`. Have Copilot write the tests and confirm they pass against the current version so you have a baseline before anything changes:

    ```text
    Add safety net tests for auth-svc: a context-load test plus integration tests for the TokenController that assert a token is issued and validates, using an isolated temporary database. Run them with mvn test and confirm they pass on the current version.
    ```

3. Enable the Java migrator agent by using the `/agent` command in Copilot, selecting `java-migrator`, then selecting <kbd>Enter</kbd>.
4. Run the newly updated agent and playbook to modernize `auth-svc` by using the following prompt:

    ```text
    Modernize services/auth-svc following the guidelines provided in the agent, and give me a final status report at the end. The baseline test suite from the previous exercise is already in place, so confirm it passes and start from the toolchain phase.
    ```

    The agent performs the upgrade, following the steps lessons from your research and the first migration process.

5. Once the work is complete, ask Copilot to create a PR with your new agent, playbook, and newly upgraded services by using the following prompt:

    ```text
    Group all the changes we made into logically grouped commits. Then create a new pull request with a summary of what we built.
    ```

When you're done, both legacy services are on the modern stack, and the second upgrade reused the migrator agent, the playbook, and the router pattern instead of rediscovering them — the payoff of starting small, learning, and documenting rather than writing one-off prompts. That's how the process compounds.

## Summary

You modernized AssetTrack's oldest service without letting the agent improvise, by running the same process a careful engineer would. In this module, you:

- Configured a Java LSP so Copilot reasoned about the code from the compiler, and registered a GitMCP documentation MCP server pointed at Spring Boot's own repository so its framework claims came from current, first-party docs.
- Used `/research` to produce a citation-backed, phased migration plan and saved it into the repo as a reusable asset.
- Built a test safety net that captured the service's behavior before the upgrade, giving fast signal at every phase and an end-to-end check across the system.
- Built a scoped `Java migrator` agent that applied the upgrade in reviewable phases, validated by its own unit and end-to-end tests.
- Reused the agent, a captured playbook, and an extended test router to modernize the second service faster than the first, then shipped both upgrades as a single reviewed pull request.

The throughline is that AI changes the cost of each step, not the need for the steps. Assess, plan, protect, migrate, validate, and document is what keeps a fast agent producing an upgrade you can review — and the assets you build doing it are what make the next one cheap. Next, you'll take the agents, skills, and MCP servers you've built and distribute them across the whole organization [in the next module][next-lesson].

> [!NOTE]
> Now that you've run the loop by hand, the [GitHub Copilot modernization plugin][copilot-modernization-plugin] maps onto it almost one for one — same discipline, more of it automated. Its **assessment** stage is the code-and-docs signal you stood up with the LSP and the documentation MCP; its **planning** stage is the phased, citation-backed plan you produced with `/research` and saved into the repo; its **execution** stage is the scoped migrator agent applying reviewable phases. The self-verification its executors run — build, test, and validate with retry — is your test safety net, and the per-phase commits it preserves for review are your captured playbook. It even generalizes the scope and guardrails you hand-wrote into your agent into a reusable *rulebook*, so target stacks, upgrade standards, and compliance policies apply to every plan it generates. The calculator runs the same six steps you just did by hand — the difference is it runs them across a fleet of services at once, which is exactly why knowing the numbers first is what lets you trust the result.

## Resources

- [Adding LSP servers for GitHub Copilot CLI][copilot-cli-lsp-add]
- [Eclipse JDT Language Server (`jdtls`)][jdtls]
- [Adding MCP servers for GitHub Copilot CLI][copilot-mcp]
- [Researching with GitHub Copilot CLI][copilot-research]
- [Creating custom agents for GitHub Copilot CLI][copilot-agents-create]
- [Spring Boot 4.0 migration guide][spring-boot-4-migration]
- [Spring Framework 7 reference][spring-framework-7]
- [Jackson 3][jackson-3]
- [GitHub Copilot modernization plugin][copilot-modernization-plugin]

---

| [← Previous: Adding a new feature][previous-lesson] | [Next: Managing Copilot's infrastructure →][next-lesson] |
|:--|--:|

[previous-lesson]: ../05-add-feature-barcode/
[next-lesson]: ../07-manage-infrastructure/
[m02]: ../02-building-ai-infrastructure/
[m03]: ../03-test-suite-remote-delegation/
[m04]: ../04-lifecycle-hooks/
[m05]: ../05-add-feature-barcode/
[copilot-cli-lsp-concept]: https://docs.github.com/copilot/concepts/agents/copilot-cli/lsp-servers
[mcp-concept]: https://docs.github.com/copilot/concepts/context/mcp
[gitmcp]: https://github.com/idosal/git-mcp
[awesome-copilot]: https://awesome-copilot.github.com/
[jdtls]: https://github.com/eclipse-jdtls/eclipse.jdt.ls
[copilot-research]: https://docs.github.com/copilot/concepts/agents/copilot-cli/research
[jackson-3]: https://github.com/FasterXML/jackson#jackson-30
[spring-framework-7]: https://docs.spring.io/spring-framework/reference/7.0/index.html
[spring-data-jpa]: https://spring.io/guides/gs/accessing-data-jpa/
[copilot-modernization-plugin]: https://github.com/microsoft/github-copilot-modernization
[copilot-cli-lsp-add]: https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers
[copilot-mcp]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
[copilot-agents-create]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
[spring-boot-4-migration]: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide
