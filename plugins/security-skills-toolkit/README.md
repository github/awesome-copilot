# Security Skills Toolkit

An AI-powered helper for developers modernizing the security posture of Azure-based applications. You describe the problem, the orchestrator routes you to a specialist skill (where one exists), and you stay in the driver's seat throughout — deciding what changes, when, and how.

```text
You describe a problem ──▶ Orchestrator classifies it ──▶ Specialist skill takes it from there, which then:
    ├─ Pulls the relevant public docs
    ├─ Helps you understand how they apply to your codebase
    ├─ Helps you plan the changes
    └─ Helps you work through applying them, at the granularity you want
```

> **IMPORTANT**:  
> **Your role as a developer collaborating with this AI-powered helper:** review every change, validate it in your environment, and follow any change-management process that applies to you before merging anything.

---

## Safe Secrets

Most of what the toolkit does today falls under a single theme we call **Safe Secrets** — helping applications stop relying on long-lived secrets and static keys.

The managed-identity skills help you replace things like Azure Storage account keys, SQL passwords, Cosmos DB keys, Redis access keys, Event Hubs and Service Bus SAS, and Cognitive Services API keys with managed identity and Microsoft Entra-based authentication. The MSAL.js and container skills cover related modernizations aimed at reducing the same kind of long-lived-credential risk.

---

## Quick Start

### Install

This plugin is intended to be installed and used through the **GitHub Copilot CLI**, with the plugin published to the [awesome-copilot](https://github.com/github/awesome-copilot) marketplace. You can install it from your shell or from inside an interactive Copilot CLI session.

#### From your shell

For most users, the `awesome-copilot` marketplace is already registered, so you can install the plugin directly:

```bash
copilot plugin install security-skills-toolkit@awesome-copilot
```

If you see an error that the marketplace is unknown, register it once and then install:

```bash
copilot plugin marketplace add github/awesome-copilot
copilot plugin install security-skills-toolkit@awesome-copilot
```

#### From inside an interactive Copilot CLI session

If you are already in an interactive `copilot` session, use the `/plugin` slash command:

```text
/plugin install security-skills-toolkit@awesome-copilot
```

If the marketplace is not yet registered, add it first:

```text
/plugin marketplace add github/awesome-copilot
/plugin install security-skills-toolkit@awesome-copilot
```

> See the [awesome-copilot](https://github.com/github/awesome-copilot) README for the most current install guidance.

### Use the orchestrator

The toolkit's entry point is the `sst-security-skills-orchestrator` agent. Start `copilot` in your repo and describe a security concern in plain language — Copilot CLI will route to the orchestrator.

Example prompts:

```text
My app uses Azure Storage account keys. Help me plan a move to managed identity.
```

```text
We're connecting to Service Bus with SAS connection strings. Walk me through migrating to managed identity.
```

```text
This app is on an old version of @azure/msal-browser. Help me plan an upgrade to a supported version.
```

```text
My Dockerfile uses a vulnerable base image. Help me plan a safer update.
```

```text
I'm not sure what's risky in this repo. Help me find credential or auth issues and plan how to address them.
```

You can also reference the orchestrator by name explicitly in your prompt. Example prompt:

```text
Use the sst-security-skills-orchestrator to help me plan a migration from Azure Storage access keys to managed identity.
```

Or browse and pick it from the agent list:

```text
/agent
```

---

## How It Works

1. **You describe a security concern** in plain language.
2. **The orchestrator agent asks for consent** before scanning your codebase.
3. **It classifies your concern and routes** to a specialist skill, or to a generic helper if no dedicated skill matches.
4. **The skill works through it with you** — pulling relevant public Microsoft documentation, helping you understand it, and helping you plan and apply changes.
5. **The orchestrator agent wraps with a summary** of what was addressed and where to read more.

Coverage is intentionally narrow. The generic helper covers issues that don't have dedicated skills, but its usefulness varies by scenario.

---

## Built On Public Guidance

The skills in this toolkit are grounded in publicly available Microsoft security documentation, including:

- Microsoft Entra and Azure managed identity adoption patterns
- MSAL.js modernization guidance
- Container image hygiene and dependency update practices
- Broader Secure Future Initiative patterns and practices where public guidance exists

References:
- [Microsoft Entra managed identity overview](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview)
- [Secure Future Initiative Overview](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview)
- [Zero Trust Principles](https://learn.microsoft.com/security/zero-trust/)

---

## What Problems Does This Solve?

### Safe Secrets

| Your problem | Skill | What it does |
|---|---|---|
| I'm using Storage account keys, connection strings, or shared-key auth in my app | `sst-storage-secretless-auth` | Helps you migrate from Storage account keys to managed identity, including planning infrastructure, RBAC, and client-code changes. |
| My app connects to Azure SQL with a username and password | `sst-sql-secretless-auth` | Helps you migrate from SQL passwords to Microsoft Entra-based authentication, including the server, database, and client-code changes. |
| I have Cosmos DB primary or secondary keys in my code or config | `sst-cosmosdb-secretless-auth` | Helps you migrate from Cosmos DB keys to managed identity, including the data-plane role assignments and client-code changes. |
| I'm authenticating to Azure Cache for Redis with access keys | `sst-redis-secretless-auth` | Helps you migrate from Redis access keys to Microsoft Entra-based access, including the access policy, role assignments, and client-code changes. |
| My Event Hubs clients depend on SAS keys or connection strings | `sst-eventhub-secretless-auth` | Helps you migrate from Event Hubs SAS to managed identity, including planning RBAC and client-code changes. |
| I've got Service Bus SAS keys or shared access policies in use | `sst-servicebus-secretless-auth` | Helps you migrate from Service Bus SAS to managed identity, including planning RBAC and client-code changes. |
| I'm calling Azure AI or Cognitive Services with API keys | `sst-cognitive-secretless-auth` | Helps you migrate from API keys to managed identity, including planning RBAC and client-code changes. |

### Auth library modernization

Older `@azure/msal-*` packages miss security fixes, lack modern browser support, and eventually lose support entirely. Staying current keeps your authentication flows on a supported codepath.

| Your problem | Skill | What it does |
|---|---|---|
| My app is on an outdated `@azure/msal-browser`, `msal-node`, `msal-react`, or `msal-angular` package | `sst-msaljs-migration` | Helps you walk through each major-version upgrade your app needs to reach a current, supported MSAL.js release, with dedicated sub-skills for browser, Node, React, and Angular. |

### Container image security

Vulnerable, stale, or floating-tag base images are a common supply-chain risk. Keeping container images patched reduces the attack surface of your deployed apps.

| Your problem | Skill | What it does |
|---|---|---|
| My Dockerfile is using a vulnerable, stale, or floating-tag base image | `sst-container-vulnerability-patching` | Helps you analyze your Dockerfile and plan safer base image updates, including how to address known vulnerabilities. |

### Everything else

Even when your concern doesn't match a dedicated skill, the toolkit can still help — though the experience will vary depending on how much public guidance exists for your scenario.

| Your problem | Skill | What it does |
|---|---|---|
| My security concern doesn't match any of the dedicated skills above | `sst-general-security-helper` | Helps you find the relevant public Microsoft documentation and build a tailored plan to address it in your codebase. |

---

## Known Limitations

| Limitation | What to expect |
|------------|----------------|
| Coverage is intentionally narrow today | The toolkit currently focuses on a few well-bounded modernization areas rather than broad security scanning across every category |
| Not every concern has a dedicated skill | The `sst-general-security-helper` skill can help you work through a documentation-guided session for scenarios outside the dedicated skill set |

---

## Agent Signals

This toolkit ships no signal-capture skill — but agents you run with it can improve over time if you capture your own. A signal is a short, structured self-assessment an agent emits after a task: what worked, what was hard, where a skill or doc fell short.

**Why capture them:**
- **Recurring gaps surface** — the same skill or doc tripping up agents becomes a visible pattern.
- **Fixes are evidence-based** — feed real friction back into your skills instead of guessing.
- **Calibration is measurable** — self-assessment vs. actual outcome shows where an agent is over- or under-confident.
- **The loop outlives the model** — signals survive model and tooling changes; the feedback loop is the durable part.

**How to start:**
- Define a simple JSON signal schema agents emit after each task.
- Write signals to a local file to start — no infrastructure needed.
- Escalate transports as value shows: local file → Git → issue tracker → OpenTelemetry.
- Close the loop — review signals and turn recurring patterns into skill, doc, or prompt fixes.

See **[Agent Signals | Agentic DevOps](https://jennyf19.github.io/agentic-devops/agent-signals/)** for the schema, examples, and adapters.

---

## Plugin Structure

This is the **materialized layout** that Copilot installs (source skills/agent live in the
awesome-copilot repo's top-level `skills/` and `agents/` directories and are referenced
declaratively from `plugin.json`):

```text
security-skills-toolkit/
├── .github/
│   └── plugin/
│       └── plugin.json
├── README.md
├── agents/
│   └── sst-security-skills-orchestrator.md
└── skills/
    ├── sst-cognitive-secretless-auth/
    ├── sst-container-vulnerability-patching/
    ├── sst-cosmosdb-secretless-auth/
    ├── sst-eventhub-secretless-auth/
    ├── sst-general-security-helper/
    ├── sst-msaljs-migration/                  # MSAL.JS router
    ├── sst-msaljs-migration-angular-v2-to-v3/
    ├── sst-msaljs-migration-angular-v3-to-v4/
    ├── sst-msaljs-migration-angular-v4-to-v5/
    ├── sst-msaljs-migration-browser-v2-to-v3/
    ├── sst-msaljs-migration-browser-v3-to-v4/
    ├── sst-msaljs-migration-browser-v4-to-v5/
    ├── sst-msaljs-migration-node-v2-to-v3/
    ├── sst-msaljs-migration-node-v3-to-v5/
    ├── sst-msaljs-migration-react-v3-to-v5/
    ├── sst-redis-secretless-auth/
    ├── sst-servicebus-secretless-auth/
    ├── sst-sql-secretless-auth/
    └── sst-storage-secretless-auth/
```

---

## Contributing

Contributions are welcome. The current priority is to add more reusable, public-safe security skills without depending on internal systems or proprietary workflows.

When adding a new skill:
1. Create a new `sst-<name>/` folder under the awesome-copilot repo's top-level `skills/` directory.
2. Follow the existing `SKILL.md` structure and `sst-` naming pattern.
3. Register the skill in `.github/plugin/plugin.json` and add routing guidance to `agents/sst-security-skills-orchestrator.agent.md`.
4. Keep the guidance grounded in public documentation.
5. Update this README to reflect newly shipped capability areas.

### How to Test Changes Locally

On the `staged` branch (or a feature branch off `staged`), the plugin isn't published to the
marketplace yet, and its folder here holds only `plugin.json` + `README.md` — the `agents/` and
`skills/` are referenced declaratively and get copied in by CI.

To exercise your changes the way
users actually get them, validate, materialize the plugin, and install it from a local path:

1. **Validate** your changes before testing:
   ```bash
   npm run plugin:validate
   ```

2. **Materialize** (mirrors what CI does) from the repo root:
   ```bash
   node ./eng/materialize-plugins.mjs
   ```
   - This copies the source `agents/` and `skills/` into `plugins/security-skills-toolkit/` in place.
   - Those copied folders are `.gitignored`, so they **won't appear in `git diff`** even though they're
   there on disk.
   - Materializing also **rewrites the tracked `plugin.json`** (to directory references) —
   that change *will* show in `git diff` and **must not be committed**; step 5 restores it.

   > **IMPORTANT**: DO NOT commit the modified `plugin.json` files that are changed after running this command.

   > **IMPORTANT**: Complete `Step 5` to restore the plugin directories and remove the materialized plugin files.

3. **Install with the real command** — pass the local path to the materialized plugin folder:
   ```bash
   copilot plugin install "<your-clone-of-awesome-copilot>/plugins/security-skills-toolkit"
   ```
   > **NOTE**: Use the real `copilot plugin install` command — hand-copying files into `~/.copilot/installed-plugins/`
   skips agent and skills registration, so agents and skills won't appear in Copilot CLI.

4. **Restart Copilot CLI**, then verify:
   - `/plugin list` shows the plugin:
     ```
     /plugin list
     ```
   - `/agent` lists the `sst-security-skills-orchestrator` agent:
     ```
     /agent
     ```
   - Routing between agents and skills works as expected — try a prompt like:
     ```
     Can you help me migrate my Azure storage usage to managed identity?
     ```

5. **Clean up** when done:
   - Uninstall the test plugin
   ```powershell
   copilot plugin uninstall security-skills-toolkit
   ```
   - Cleanup the materialized plugin directories
   ```powershell
   npm run plugin:clean
   ```

   > **IMPORTANT**: `npm run plugin:clean` removes the materialized `agents/`/`skills/` copies and restores `plugin.json` to
   the source form required on the `staged` branch.

6. **Re-validate** — `plugin:clean` can rewrite the `skills` array in an order the validator rejects
   (the `sst-msaljs-migration` router sorts ahead of its hops). Re-run validation:
   ```powershell
   npm run plugin:validate
   ```
   If it reports `skills must be sorted alphabetically`, auto-fix the order with this one-liner. It
   sorts the `skills` array with an `Intl.Collator` — the same locale-aware ordering the validator's
   `localeCompare` uses:
   ```powershell
   node -e "f='plugins/security-skills-toolkit/.github/plugin/plugin.json';p=require('./'+f);p.skills.sort(new Intl.Collator().compare);require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
   ```
   Then run `npm run plugin:validate` once more to confirm it passes before committing.

---

## Contact

If you run into gaps, incorrect routing, or a security scenario that should become a dedicated skill, open an issue in this repository.

---

## License

MIT — distributed under the [awesome-copilot](https://github.com/github/awesome-copilot) marketplace [LICENSE](https://github.com/github/awesome-copilot/blob/main/LICENSE).
