# experts-router

## purpose

You are the **root task router**. Before doing any work, interview the developer to understand scope and preferences. Then classify intent and load exactly one domain router. Do NOT load micro-expert files directly from here.

## pre-task interview (mandatory)

**Every task starts here.** Before routing, loading experts, or writing any code, interview the developer. The depth scales with the task — a small bug fix may need one confirmation; a multi-file migration needs detailed scoping.

### How it works

1. **Assess complexity.** Read the developer's message. Determine if the task is small (single file, clear intent), medium (multi-file, some ambiguity), or large (architectural, multi-step, cross-cutting).
2. **Ask the right questions.** Use `AskUserQuestion` to walk through the applicable question blocks below. Skip any question the developer's message already answers unambiguously.
3. **Always offer the escape hatch.** Every question set MUST include a **"You decide everything"** (first question) or **"You decide everything else"** (subsequent questions) option. Selecting it means: use your best judgment for all remaining decisions, apply expert defaults, and proceed without further questions.
4. **Record and carry forward.** Store all answers. They shape routing, expert selection, and implementation decisions for the entire task.

### Question blocks

Pick from these based on complexity. You don't need all of them — use judgment.

#### Q1 — Scope & intent (always ask)
```
header: "Scope"
question: "Before I start, let me confirm what you need. Which best describes this task?"
options:
  - label: "You decide everything"
    description: "I trust your judgment — assess the task, make all decisions, and just do it."
  - label: "Quick fix / small change"
    description: "Single file or minor tweak. Just need it done."
  - label: "Feature / migration step"
    description: "Multi-file change with some decisions to make."
  - label: "Architectural / large task"
    description: "Significant scope — I want to review the approach before you start."
multiSelect: false
```

If the developer picks **"You decide everything"** → skip all remaining questions, proceed with expert defaults.

#### Q2 — Approach preferences (medium+ tasks)
```
header: "Approach"
question: "Any preferences on how I tackle this?"
options:
  - label: "You decide everything else"
    description: "No preferences — use best practices and expert defaults."
  - label: "Minimal changes"
    description: "Touch as few files as possible. Keep the diff small."
  - label: "Do it right"
    description: "Refactor if needed. Prioritize correctness and clean code."
  - label: "Let me review first"
    description: "Show me a plan before writing any code."
multiSelect: false
```

If **"Let me review first"** → enter plan mode (`EnterPlanMode`) before implementation.

#### Q3 — Specifics (large tasks or when ambiguity remains)
```
header: "Details"
question: "A few specifics to nail down:"
options:
  - label: "You decide everything else"
    description: "Use your best judgment for all remaining decisions."
  - label: "I'll answer each"
    description: "Walk me through the decisions one at a time."
multiSelect: false
```

If **"I'll answer each"** → proceed to any expert-level `## interview` sections after routing. If **"You decide everything else"** → fill expert interviews with defaults and skip them.

### Interaction with expert-level interviews

The pre-task interview gates the entire workflow. Expert-level `## interview` sections (described in the auto-interview protocol below) handle domain-specific decisions. If the developer chose "You decide everything" or "You decide everything else" at the pre-task level, those expert interviews are auto-filled with defaults and skipped.

## routing rules

Scan the user's message for signal words. Pick the **first matching domain**; if signals overlap, prefer the domain whose signals appear more often.

### Teams — build or modify a Teams bot / agent
Signals: Teams SDK, `@microsoft/teams-ai`, Adaptive Cards, ChatPrompt, Graph API, MCP, A2A, `app.ts`, manifest, proactive message, message extension, dialog, task module, Agents Toolkit, Bot Framework, SSO, OAuth, streaming, citations, RAG, function calling, memory, state, storage, `microsoft_teams`, `microsoft_teams.apps`, `microsoft_teams.ai`, `ActivityContext`, `@app.on_message`, `OpenAICompletionsAIModel`, `Microsoft.Teams.Apps`, `Microsoft.Teams.AI`, `AddTeams()`, `UseTeams()`, `IContext<TActivity>`, `OnMessage`, `OpenAIChatPrompt`, Teams Python, Teams .NET, Teams C#, `m365agents.yml`, `atk provision`, `atk deploy`, `atk publish`, `atk preview`, `atk validate`, `atk package`, `atk new`, Agents Playground, `.m365agentsplayground.yml`, lifecycle hooks, `env/.env`
→ Read `experts/teams/index.md`

### Slack — build or modify a Slack app
Signals: Slack Bolt, `@slack/bolt`, Block Kit, `ack()`, Slack events, `app.message`, `app.command`, `app.event`, `app.action`, `app.shortcut`, `app.view`, slash command, Slack OAuth, `InstallProvider`, `InstallationStore`, multi-workspace, `app.assistant`, Assistant container, `threadStarted`, `userMessage`, `setSuggestedPrompts`, `setStatus`, `setTitle`, `getThreadContext`, Socket Mode, `socketMode`, `appToken`, `@slack/socket-mode`, `SocketModeReceiver`, `chat.postMessage`, `chat.update`, `chat.postEphemeral`, proactive message, `WebClient`, `app.client`, `filesUploadV2`, global shortcut, message shortcut, `message_action`, modal, `views.open`, `views.update`, `views.push`, `view_submission`, `view_closed`, `private_metadata`, `slack_bolt`, `AsyncApp`, `SocketModeHandler`, `chat_postMessage`, `views_open`, `slack-bolt-java`, `com.slack.api.bolt`, `AppConfig.builder()`, `MethodsClient`, Slack Python, Slack Java, Slack CLI, `slack create`, `slack run`, `slack deploy`, `slack activity`, `slack trigger`, `slack datastore`, `slack env`, `slack manifest`, `slack auth login`, `slack doctor`, `slack app install`, `slack collaborator`, `slack function distribute`, `slack project`, `.slack/`, `project.json`, `manifest.ts`, `slack.json`, trigger definition, Slack hosted platform
→ Read `experts/slack/index.md`

### Bridge — cross-platform bridging between Slack and Teams, or AWS and Azure
Signals: bridge, cross-platform, migrate, migration, convert, port, Slack to Teams, Teams to Slack, Slack→Teams, Teams→Slack, Slack↔Teams, Block Kit to Adaptive Cards, Adaptive Cards to Block Kit, AWS to Azure, Azure to AWS, Lambda to Functions, S3 to Blob, CloudWatch to App Insights, middleware chain, ack(), Socket Mode, RTM, transport, WebSocket to HTTPS, InstallationService, OAuthStateService, views.open, viewSubmission, viewClosed, App Home, views.publish, attachmentAction, legacy attachments, callback_id, modals to dialogs, task module, replace_original, delete_original, chat.update, chat.postEphemeral, response_url, ephemeral, files.upload, file_shared, link_shared, chat.unfurl, unfurl, shortcut, global shortcut, message shortcut, scheduleMessage, reminders.add, conversations.create, conversations.archive, conversations.invite, channel ops, Workflow Builder, workflow_step_execute, Power Automate, App Directory, InstallationStore, sideloading, rate limit, retry, 429, throttle, circuit breaker, Dapr, FileConsentCard, add Teams support, add Slack support, help me migrate, cross-platform advisor, bridging decisions, assess bridging, bridging scope, dual bot, single server, shared Express, REST API, Java, C#, Go, no SDK, raw HTTP, Bot Framework REST, manual JWT, signature verification, Python dual-platform, Python cross-platform, `slack_bolt` + `microsoft_teams`, unified Python server
→ Read `experts/bridge/index.md`

### Models — configure and call AI models from any provider
Signals: OpenAI, Azure OpenAI, GPT-4o, GPT-4, Anthropic, Claude, `@anthropic-ai/sdk`, Bedrock, `@aws-sdk/client-bedrock-runtime`, Converse API, Foundry Local, `foundry model`, `foundry service`, Foundry cloud, MaaS, model-as-a-service, GitHub Models, Ollama, vLLM, LM Studio, llama.cpp, TGI, LocalAI, open-source model, local LLM, OpenAI-compatible, `/v1/chat/completions`, `openai` npm, model provider, AI model, LLM, chat completions, tool use, function calling, Bedrock agents, Bedrock guardrails, Phi-4, Qwen, Llama, Mistral, DeepSeek, embeddings, model selection, Transformers.js, `@huggingface/transformers`, in-process inference, browser inference, WASM, WebGPU, local embeddings, local classification, pipeline API, HuggingFace
→ Read `experts/models/index.md`

### Deploy — deploy a bot to Azure or AWS
Signals: deploy, deployment, provision, hosting, publish, go live, production, `az login`, `aws configure`, App Service, Azure Functions, Container Apps, Lambda, EC2, ECS, Fargate, Elastic Beanstalk, Azure Bot, `atk provision`, `atk deploy`, Agents Toolkit deploy, zip deploy, SAM deploy, CDK deploy, API Gateway, deploy to Azure, deploy to AWS, push to cloud, CloudFormation
→ Read `experts/deploy/index.md`

### Convert — rewrite source code from another language to TypeScript
Signals: JS to TS, Ruby to TS, Java to TS, Kotlin to TS, convert language, transpile, rewrite in TypeScript, port code, language conversion, gems to npm, Maven to npm, Gradle to npm, type annotations, require to import, add types, snake_case to camelCase, Lombok, @Data, @Builder, Gson, Jackson, @SerializedName, CompletableFuture, bulk conversion, large-scale, trailing lambda, `it` parameter, `trimIndent`, `when` expression, data class, companion object, sealed class, extension function
→ Read `experts/convert/index.md`

### Security — harden inputs, secrets, or credentials
Signals: input validation, sanitize, secrets, credentials, key vault, PII, injection, XSS
→ Read `experts/security/index.md`

## auto-interview protocol (expert-level)

After loading any expert, check for a `## interview` section. If one exists **and the developer did NOT choose "You decide everything" / "You decide everything else" in the pre-task interview**, execute the expert interview before writing any code or giving implementation advice.

If the developer DID choose an escape hatch in the pre-task interview, auto-fill all expert interview answers with the expert's documented defaults and skip the questions.

### How it works

1. **Check pre-task answers.** If the developer already opted out of detailed questions, skip to implementation using defaults.
2. **Detect.** After reading an expert file, scan for `## interview`. If missing, proceed directly to implementation.
3. **Execute.** Walk through each question block (`### Q1`, `### Q2`, ...) in order. Use `AskUserQuestion` for each one, following the `header`, `question`, `options`, and `multiSelect` fields exactly as specified.
4. **Record.** Store the developer's answers. Pass them into the expert's rules and patterns as context — the answers shape which code paths, patterns, and configurations apply.
5. **Escape hatch.** Every expert interview MUST include a "You decide everything else" option. Selecting it fills all remaining answers with the expert's documented defaults and skips remaining questions.
6. **Context-skip.** If the developer's original message already answers an interview question unambiguously (e.g., "use Azure OpenAI" when the question is "OpenAI or Azure OpenAI?"), skip that question — don't re-ask what's already known.

### Experts with embedded interviews

Some experts (like `cross-platform-advisor-ts.md`) have the interview woven into their phased workflow rather than in a separate `## interview` section. These already satisfy the protocol — their Phase 2 / decision walkthrough IS the interview.

## ambiguity tiebreaker

If the request mixes **bridge** signals with a target-platform signal (e.g., "convert Block Kit to Adaptive Cards"), route to **bridge** first — bridge experts already reference the target platform's patterns.

If the request mixes **convert** signals with **bridge** signals (e.g., "rewrite this Ruby Slack bot in TypeScript for Teams"), route to **convert** first for language translation, then **bridge** for platform mapping. The convert domain's combining rule handles this layering.

## fallback

If no domain matches, ask **one** clarifying question:
> "Are you working on a Teams bot, a Slack app, a migration between them, or something else?"

If the routed experts don't fully cover the request (gaps remain after the initial pass), read `experts/fallback.md` for a two-phase recovery: re-scan all domain routers for missed experts, then web-search for any remaining gaps.

## expert evolution

The expert system is **self-evolving**. As conversations reveal knowledge gaps, outdated patterns, or new topic areas, update the system in-place. Follow the rules below.

### Naming conventions

| Convention | Meaning |
|---|---|
| `topic-ts.md` | Normal expert — can be created, updated, or replaced |
| `topic-ts.locked.md` | **Locked** — read-only, do NOT edit. Rename to remove `.locked` only with explicit user approval |
| `_filename.md` | System/template file — not a routable expert |
| `index.md` | Domain router — update when adding/removing experts in that domain |

To lock an expert: rename `topic-ts.md` → `topic-ts.locked.md`. The routing system treats `.locked.md` identically for reads — only writes are blocked.

### When to UPDATE an existing expert

Update an expert when **any** of these are true during a conversation:
1. **Corrected mistake** — you discover a rule, code pattern, or pitfall is wrong and fix it in practice. Backport the correction to the expert.
2. **New pattern emerged** — you write a working pattern that isn't covered by any existing expert. Add it to the most relevant expert's `## patterns` section.
3. **SDK/API changed** — the user provides or you discover updated API signatures, new options, or deprecated features. Update the affected rules and patterns.
4. **Missing pitfall** — you hit a gotcha during implementation that the expert didn't warn about. Add it to `## pitfalls`.
5. **Cross-reference gap** — an expert should reference another but doesn't. Add a `Pair with` entry to `## instructions` and update the domain `index.md` cluster.

**Do NOT update locked experts** (`*.locked.md`). If a locked expert needs changes, flag it to the user.

### When to CREATE a new expert

Create a new expert when **all** of these are true:
1. **No existing expert covers the topic** — the knowledge doesn't fit as an addition to any current file.
2. **The topic is reusable** — it will apply to future tasks, not just the current one-off request.
3. **Sufficient depth** — the topic warrants 8+ rules and 2+ code patterns. If it's only 2-3 rules, add them to an existing expert instead.

**Creation steps:**
1. Copy the template from `experts/_expert-ts.md`.
2. Name it `{topic}-ts.md` in the appropriate domain folder.
3. Fill in all sections: purpose, rules, patterns, pitfalls, references, instructions (with `Pair with` cross-refs), research.
4. Complete the **post-creation checklist** from `_expert-ts.md`:
   - Add to domain `index.md` task cluster `Read:` list (with `Depends on:` / `Cross-domain deps:` if applicable).
   - Add to domain `index.md` file inventory.
   - Add signal words to root `index.md` if the new expert introduces terms not already covered.

### When to CREATE a new domain folder

Create a new domain (folder + `index.md` router) when **all** of these are true:
1. **3+ experts** would belong to the new domain — a domain with 1-2 experts should stay as a cluster within an existing domain.
2. **Distinct signal words** — the domain's topics wouldn't naturally route through any existing domain's signals.
3. **Separable routing** — moving these experts out of an existing domain simplifies that domain's router, not complicates it.

**Creation steps:**
1. Create the folder: `experts/{domain-name}/`.
2. Create `experts/{domain-name}/index.md` following the router pattern from any existing domain index (purpose, task clusters with `When:`/`Read:`, combining rule, file inventory).
3. Move or create the expert files in the new folder.
4. Add a new routing entry to this root `index.md` under `## routing rules` with `Signals:` and a `→ Read` directive.
5. Remove any moved experts from their old domain's `index.md`.

### Evolution audit trail

When you modify the expert system, add a one-line comment at the bottom of the affected domain's `index.md`:
```
<!-- Updated YYYY-MM-DD: {what changed and why} -->
```

This lets future sessions see what evolved and when, without cluttering the routing logic.

## utilities

These files support the expert system itself — not a specific domain.

### Fallback recovery
→ Read `experts/fallback.md`
When the initial routing pass leaves knowledge gaps.

### New expert template
→ Read `experts/_expert-ts.md`
When creating a new micro-expert file. Provides the canonical stub structure and a post-creation checklist.

### Research workflow
→ Read `experts/researcher.md`
When fleshing out a stub expert with real content. Provides the step-by-step Deep Research workflow.

<!-- Updated 2026-02-11: Added convert domain (js-to-ts, ruby-to-ts, java-to-ts, dependency-mapping, type-mapping) for language conversion to TypeScript -->
<!-- Updated 2026-02-11: Expanded convert domain (json-serialization, bulk-conversion-strategy) and migrate domain (slack-middleware-to-teams, slack-transport-to-teams); updated java-to-ts with Lombok/CompletableFuture; updated slack-identity-to-aad with OAuth impl code -->
<!-- Updated 2026-02-11: Added kotlin-to-ts to convert domain; added slack-modals-to-teams-dialogs, slack-app-home-to-teams, slack-legacy-attachments-to-teams to migrate domain -->
<!-- Updated 2026-02-11: Added auto-interview protocol — experts with ## interview sections now auto-trigger AskUserQuestion before implementation. Added interviews to bulk-conversion-strategy-ts, compat.botbuilder-interop-ts. Updated _expert-ts template with interview format. -->
<!-- Updated 2026-02-11: Added mandatory pre-task interview — every task now starts with a developer interview (scope, approach, specifics) before routing. Always includes "You decide everything" escape hatch. Expert-level interviews respect pre-task choices. -->
<!-- Updated 2026-02-27: Added Slack experts (bolt-assistant, bolt-events, bolt-oauth-distribution) from @slack/bolt v4.6.0 source. Added bridge experts (cross-platform-architecture, rest-only-integration) for dual-bot hosting and SDK-less Java/C#/Go patterns. Updated Slack and bridge signal words. -->
<!-- Updated 2026-02-28: Added deploy domain (azure-bot-deploy, aws-bot-deploy) for step-by-step cloud deployment walkthroughs with CLI setup, provisioning, and verification. Includes cloud provider interview. -->
<!-- Updated 2026-02-28: Added models domain (openai-azure-openai, anthropic, bedrock, foundry-local, foundry-cloud, oss-openai-compatible) for AI model provider integration. Covers 6 providers with unified OpenAI SDK patterns and provider abstraction. -->
<!-- Updated 2026-03-01: Added Teams Agents Toolkit signals (m365agents.yml, teamsapp CLI, Agents Playground, env/.env) and Slack CLI signals (slack create/run/deploy/trigger/datastore/env/manifest/auth/app/collaborator) -->
