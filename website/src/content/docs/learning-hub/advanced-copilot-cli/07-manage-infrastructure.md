---
title: '07 · Managing Copilot''s Infrastructure'
description: 'Scale your AI infrastructure with a custom MCP server, a plugin, and enterprise-level distribution.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 7 — Managing Copilot's infrastructure

| [← Previous: Modernizing apps with Copilot CLI][previous-lesson] | [Next: Wrap-up →][next-lesson] |
|:--|--:|

Everything so far has been scoped to a single repository, or to you as the individual developer. The instructions, custom agents, agent skills, and lifecycle hooks you committed to AssetTrack do travel to anyone who clones it — but they stop at that repo's boundary. The MCP configuration was saved to your user settings. In practice, though, there are always rules, agents, skills, and shared resources that shouldn't belong to single repository; they encode how the whole organization works, and every developer at Contoso should get them automatically. This module moves that setup to the enterprise level: a custom MCP server that exposes a shared resource, a plugin that bundles your AI infrastructure into a single installable unit, and enterprise standards that push it to every developer without anyone cloning a repo or copying a file.

## What you will learn

By the end of this module you will be able to:

- Explain when a custom MCP server is the right way to extend Copilot, and add one to a session.
- Author a custom MCP server that exposes AssetTrack's databases as a live, read-only schema catalog.
- Package your custom agents, agent skills, hooks, and MCP configuration into a plugin that installs in one command.
- Distribute your setup at the enterprise level with a marketplace, enterprise-managed plugin standards, and enterprise custom agents.

## Scenario

The accessibility upgrade, the test backfill, the hooks, the barcode feature, and the modernization all worked because you had the right AI infrastructure. A new engineer who clones AssetTrack inherits the repo-scoped pieces (instructions, agents, skills, and hooks), but the user-scoped setup on your machine doesn't come with the clone, and none of it reaches Contoso's *other* repositories and teams. The consistency you fought for inside AssetTrack stops at its edge, and every other team is starting from scratch.

Closing that gap means lifting the setup out of AssetTrack and up to where the whole organization can reach it: AssetTrack's databases exposed as a shared schema catalog through an MCP server, the surrounding AI infrastructure packaged so it installs in a single step, and enterprise standards that put the setup in front of every Contoso developer the moment they authenticate — no cloning, no copying.

> [!NOTE]
> Starting state: your fork has a working set of AI infrastructure in place — custom instructions, custom agents, agent skills, lifecycle hooks, a Playwright test suite, and the modernized barcode feature, all committed to AssetTrack. If you're jumping in here, check out the catch-up branch that holds them:
>
> ```bash
> git checkout start-of-module-07
> ```
>
> The plugin and MCP work in this module targets your fork only, but the patterns are written for org-wide rollout.

## Custom MCP servers as shared infrastructure

As we explored in an earlier module, [Model Context Protocol (MCP)][mcp-concept] is an open standard for giving a model access to external tools and data. Copilot CLI ships with the GitHub MCP server built in, and you can add others, such as [Context7][context7-mcp] and [Microsoft Learn][mslearn-mcp] documentation servers. Those are servers publicly published. Your organization can also create and publish a *custom* MCP server to expose a resource specific to your team.

Custom MCP servers are powerful because they allow developers to stay in the zone rather than opening a separate tool. You can use them to provide Copilot resources it would otherwise lack, such as how internal libraries work, the service catalog that only lives in an internal portal, or the operational database behind a SQL client.

AssetTrack is split across services that each own their own database — assets in one, employees and their assignments in another, audit events in a third. That layout is normal for microservices, but it means no single place tells you where a given piece of data lives. When an engineer sets out to add a feature — say, a service that returns the most recent events for a piece of hardware by employee — the first question is *which databases hold that data?*, and today the only way to answer is to read through every service or ask whoever remembers. That knowledge lives in people's heads instead of in a tool Copilot can reach.

A custom MCP server can turn that scattered knowledge into a live catalog. Pointed at the databases, it introspects them on demand and exposes read-only tools — `list_databases`, `get_schema`, and `find_data` — that let Copilot discover which service owns which tables and columns. Ask where hardware, employees, and events live, and Copilot answers from the catalog: assets in the assets service, assignments and employees in the workforce service, events in the audit service, along with the columns that join them. Because the tools only ever read schema, never rows, the server is a safe surface that reflects the databases exactly as they are — with no schema files to write or keep in sync.

### Where MCP configuration lives

Copilot CLI merges MCP configuration from several locations:

- `~/.copilot/mcp-config.json` — user-level servers available in every session on your machine. This is where `/mcp add` and `copilot mcp add` write.
- A `.mcp.json` file committed to the repo root — workspace servers shared with everyone who clones it. Workspace servers load only when the working directory is trusted.
- A `.mcp.json` file inside a plugin — configuration that travels with the plugin, which is how you'll distribute the AssetTrack catalog's server entry later in this module.

Each entry is one of two kinds: a **local** server that Copilot launches as a subprocess and talks to over `stdin`/`stdout`, or a **remote** server that Copilot connects to at an HTTP URL. The catalog you build in this module is a remote HTTP server — a shape that later lets the whole organization point at one shared endpoint instead of each developer running their own copy.

> [!NOTE]
> We'll explore creating plugins later in this module.

If your organization or enterprise has configured an [MCP registry URL and allowlist policy][add-mcp-servers], those settings apply to Copilot CLI as well, and only permitted servers can run.

## Exercise 1: Build the AssetTrack schema catalog MCP server

You'll scaffold an MCP server that introspects AssetTrack's service databases and serves them as a read-only schema catalog over HTTP, register it by URL, and confirm Copilot uses it to answer where data lives across the services.

### Start the databases and scaffold the server

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Open a terminal by selecting <kbd>Ctrl</kbd> + <kbd>\`</kbd>, then start AssetTrack once so each service creates and seeds its database. Run `npm run dev` and leave it running. Each service's `dev:*` script creates its SQLite file under `services/<service>/data/`.
3. Open a second terminal by selecting <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>\`</kbd>, then start Copilot CLI from the repository root by running `copilot --yolo`.
4. If prompted, trust the project folder by selecting **Yes, and remember this folder for future sessions**.
5. Run `/models`, select **Auto** from the list, and select <kbd>Enter</kbd>.
6. Ask Copilot to scaffold the catalog server, keeping it read-only and pointed at the dev databases:

    ```text
    Build an MCP server in a new mcp-servers/assettrack-catalog/ folder that gives Copilot a read-only schema catalog of AssetTrack's databases. It should introspect the databases live and expose the schema through a few tools.

    Requirements:
    - Serve it over HTTP using the MCP SDK's Streamable HTTP transport at /mcp, on the port from the PORT env var (default 5010).
    - Find the dev SQLite databases under services/*/data/ starting from the ASSETTRACK_REPO_ROOT env var (default to the current working directory), and figure out which service owns each one from its path.
    - Read the schema live from each database rather than storing it, and open them read-only.
    - Expose three tools and no write tools: list_databases, get_schema (optionally for one database), and find_data to search tables and columns for a term.
    - Wire it into the repo's npm run dev by adding a dev:catalog script and including it in the root concurrently command so it starts alongside the services.
    ```

> [!NOTE]
> You used plan mode in earlier modules to think through larger changes before writing any code, and it would work well here too. We're keeping this prompt short and direct so you can stay focused on the MCP concepts rather than the build itself.

7. Review the generated code before running anything. Confirm it opens each database read-only, introspects live (no hard-coded or stored schema), exposes only the three read tools, and reads the repository root from the environment rather than hard-coding a path.

### Run and register the server

1. The catalog now starts with the rest of AssetTrack. Stop the `npm run dev` you left running by selecting <kbd>Ctrl</kbd> + <kbd>C</kbd>, then run `npm run dev` again so `concurrently` picks up the new `dev:catalog` process. The catalog comes up alongside the services and listens at `http://localhost:5010/mcp`.

2. Register the server with the current session. In the CLI, run `/mcp add` and complete the form with the following values:

    - Server Name: `assettrack-catalog`
    - Server Type: `HTTP` (the Streamable HTTP transport; choose `SSE` only for a legacy server)
    - URL: `http://localhost:5010/mcp`
    - Tools: `*`

    The server is available immediately without restarting the CLI.

    > [!TIP]
    > To register it without the form, use `copilot mcp add` with the HTTP transport (it writes to `~/.copilot/mcp-config.json`):
    >
    > ```bash
    > copilot mcp add --transport http assettrack-catalog http://localhost:5010/mcp
    > ```

3. Select <kbd>Ctrl</kbd> + <kbd>S</kbd> to save the configuration.
4. Select <kbd>Esc</kbd> to exit the configuration screen.
5. Confirm the server loaded by running `/mcp` and checking that `assettrack-catalog` appears with its three tools.
6. Start a new session by using the command `/new` and selecting <kbd>Enter</kbd>.:
7. Test the new MCP server by using the following prompt:

    ```text
    Where is the data for hardware events by employee stored, and what tables/columns relate hardware, employees, assignments, and recent events?
    ```

    Watch the tool calls: Copilot should call `find_data` and `get_schema` and answer from the catalog — events from `audit_events` in the audit service, hardware from `assets` in the assets service, and the employee link from `assignments` and `employees` in the workforce service — instead of guessing or grepping the codebase.

With the catalog registered, "where does this data live?" is now a first-class tool call in every session. Instead of reading through the services or asking whoever remembers, Copilot reads the live schema across AssetTrack's databases and points you — and any new service you build — at exactly the right source.

### Commit and merge the changes

With our new MCP server created, let's create a pull request (PR) so it becomes part of our project!

1. Use the `/new` prompt in Copilot to create a new session.
2. Use the following prompt to tell Copilot to create a new branch, a commit and a PR, and to merge the PR when done:

    ```
    We just defined a new MCP server. Can you please create a new branch called add-mcp-server, generate a short commit message, then create the PR. Once the CI completes for the PR, go ahead and merge it.
    ```

Copilot will get to work on creating the PR and merging it. This will take just a couple of minutes to complete.

## Plugins: bundling AI infrastructure

A [plugin][copilot-plugins] is a single installable package that extends Copilot — including Copilot CLI and the Copilot cloud agent — with reusable components. A plugin can contain any combination of:

- Custom agents — `*.agent.md` files in `agents/`
- Agent skills — skill subdirectories in `skills/`, each with a `SKILL.md`
- Hooks — a `hooks.json` file
- MCP server configurations — a `.mcp.json` file, exactly the shape you saw in Exercise 1
- LSP server configurations — an `lsp.json` file

Every plugin has a `plugin.json` manifest at its root that names the plugin and points to the components it provides. A typical layout:

```text
contoso-assettrack-plugin/
├── plugin.json           # Required manifest
├── agents/               # Custom agents
│   └── accessibility-expert.agent.md
├── skills/               # Agent skills
│   └── make-repo-contribution/
│       └── SKILL.md
├── hooks/                # Lifecycle hooks that run checks after Copilot edits files
│   ├── hooks.json
│   └── scripts/
│       └── test-router.sh
└── .mcp.json             # MCP config pointing at the schema catalog's HTTP URL
```

You install a plugin from a marketplace with `copilot plugin install PLUGIN-NAME@MARKETPLACE-NAME` (or the `/plugin install` slash command), or enable it declaratively through the `enabledPlugins` field of a user-level `~/.copilot/settings.json` or repository-level `.github/copilot/settings.json` file. A marketplace is just a registry of plugins — it can live in a GitHub repository, another Git host, or a local or shared file system — so even while you're developing a plugin, you register a marketplace (a local folder works fine) and install from it. Because a plugin's components are cached after install, you re-run the install command to pick up edits.

## Exercise 2: Package the AssetTrack AI infrastructure as a plugin

You'll gather the agents, skills, hooks, and MCP configuration built across the course into one plugin, then register your repo as a marketplace and install it from there — the same path a teammate would take to get everything in a single command.

### Assemble the plugin

Let's build the plugin!

1. Ask Copilot to build the whole plugin by gathering the various agents, skills, and hooks you've worked with thus far:

    ```text
    Create a plugin named contoso-assettrack-plugin in a new folder of the same name, with a plugin.json manifest that lists me as the author. Include the following:
    - All the agents, skills, and hooks defined in this repo, copied into the plugin so it is self-contained
    - A .mcp.json that registers an MCP server named assettrack-catalog pointing at http://localhost:5010/mcp
    ```

2. Review what Copilot produced before going further. Two things matter most: the components were copied into the plugin (not referenced from `.github/...`), so it's self-contained and installs from anywhere; and any path the hooks use is plugin-relative with `${PLUGIN_ROOT}`, which the CLI expands to the installed plugin's directory — so a hook that used a `.github/...` path in the repo should now call `"${PLUGIN_ROOT}/hooks/scripts/test-router.sh"`. The `.mcp.json` only references the catalog server's URL; it bundles no server code, because the catalog runs as a separate HTTP process.

### Register your repo as a marketplace and install the plugin

Copilot CLI installs plugins from a marketplace, and a marketplace is just a repository with a `marketplace.json` manifest that lists which plugins it holds. Your fork already contains the plugin, so instead of standing up a second repo you'll turn the fork itself into the marketplace by adding one manifest.

> [!NOTE]
> This is the one shortcut we're taking: using the AssetTrack repo itself as the marketplace. It keeps the exercise to a single repo. In a real organization you'd usually give the marketplace its own repository so plugin distribution isn't tied to one product's codebase. The `marketplace.json` and the commands are identical regardless of what repository is being used.

1. Ask Copilot to add the marketplace manifest to your repo:

    ```text
    Add a plugin marketplace manifest to this repo at .github/plugin/marketplace.json. Name the marketplace contoso-marketplace and list the contoso-assettrack-plugin with its name, description, and version, using the contoso-assettrack-plugin folder at the repo root as its source. Follow the marketplace.json format in the GitHub Copilot CLI plugin docs.
    ```

With the marketplace created, add it from the Copilot CLI session you're already using so you can test the plugin without leaving the flow.

1. Register your repo as a marketplace by pointing at the repository root, then confirm it's known and browse its plugins:

    ```text
    /plugin marketplace add .
    /plugin marketplace list
    /plugin marketplace browse contoso-marketplace
    ```

2. Install the plugin from the marketplace by its `name@marketplace` identifier:

    ```text
    /plugin install contoso-assettrack-plugin@contoso-marketplace
    ```

### Test the plugin in action

With the plugin installed, do a little spot-checking in the same Copilot CLI session to ensure everything is installed and behaving as expected.

1. Use the command `/mcp list` to list all MCP servers. You should see both assettrack-catalog MCP servers, with a note the one from the plugin is being used.
2. Use the command `/agent` to list all installed agents. You should see the Accessibility agent with a mark that it's from a plugin.
3. Select <kbd>Esc</kbd> to exit the agents list screen.
4. Use the command `/skills list` to list all installed skills. You should see a group of available skills highlighted from the plugin.

The AssetTrack AI infrastructure is now a single unit. Everything you built piece by piece across the course — the accessibility agent, the contribution skill, the hooks, and the schema catalog MCP server — installs with one plugin, which is exactly what makes it something you can hand to the rest of Contoso.

## Distributing at the enterprise level

Installing from your own marketplace solves the problem for you; solving it for everyone is a distribution problem. This can be tackled in three steps:

1. host the marketplace where the whole organization can reach it, 
2. make the plugin install automatically through enterprise-managed plugin standards,
3.  and govern org-wide personas through enterprise custom agents.|

These are driven from the enterprise's `.github-private` repository, so their rules are version-controlled and reviewed like any other change.

The first step is hosting. The marketplace you created is defined by the `marketplace.json` file already committed to your repo, listing which plugins exist and where to find them. Because a [plugin marketplace][plugins-marketplace] can live in a repository, another Git host, or a shared file path, you make it organization-wide simply by pushing that repo so any developer can add it with `copilot plugin marketplace add OWNER/REPO`.

Hosting the marketplace makes the plugin available, but installing it still requires action. [Enterprise-managed plugin standards][enterprise-plugin-standards] close that gap. An enterprise owner adds a `managed-settings.json` file to `copilot/managed-settings.json` in the `.github-private` repository, and Copilot applies it to everyone on the enterprise's plan. Two keys do the work — `enabledPlugins` installs (or blocks) a plugin automatically, keyed as `PLUGIN-NAME@MARKETPLACE-NAME`, while `extraKnownMarketplaces` / `strictKnownMarketplaces` control which marketplaces developers may install from. The [enterprise managed settings reference][enterprise-managed-settings-reference] lists the rest.

[Custom agents have a built-in enterprise configuration option][enterprise-custom-agents] that needs no plugin at all, with the ability to define them in a `.github-private` repo for the entire enterprise. An enterprise owner points the **Custom agents** setting (under the enterprise's **AI controls**) at one organization's [`.github-private` repository][github-private-repo], and every `*.agent.md` profile in that repository's `agents/` directory becomes available to everyone on the enterprise's Copilot plan, Copilot CLI included, without those users needing access to the repository. A ruleset keeps edits in check — enterprise owners commit directly while everyone else proposes changes through pull requests — and [agent names are deduplicated across levels][custom-agents-config], so a personal or repository-level agent of the same name wins.

> [!TIP]
> In practice you'll use both. Enterprise custom agents are the right tool for a governed set of personas — the Contoso accessibility reviewer, a compliance bot — that should be available org-wide from one reviewed repository. A plugin, set as a default through `enabledPlugins`, is the right tool when you need to ship a whole bundle at once: agents plus skills, hooks, and the AssetTrack schema catalog MCP server. Either way, a new Contoso engineer signs in and the standard setup is simply there — no cloning, no copying, no manual install.

## Summary

You've turned one developer's setup into team-wide capability. In this module, you:

- Built a custom MCP server that exposes AssetTrack's databases as a live, read-only schema catalog.
- Bundled your custom agents, agent skills, hooks, and MCP server into an installable plugin.
- Registered your repo as a marketplace and installed the plugin from it, then planned an enterprise rollout using enterprise-managed plugin standards and enterprise custom agents, so the whole setup arrives automatically when a teammate authenticates.

AI infrastructure is only complete when it's available across the entirety of your organization. The key to productivity with Copilot is ensuring the same toolsets — from MCP servers to custom agents to agent skills and more — are always discoverable and callable, no matter which engineer opens a session.

Wrap up the course in [Module 8][next-lesson].

## Resources

- [About GitHub Copilot plugins][copilot-plugins]
- [Creating a plugin for GitHub Copilot CLI][plugins-creating]
- [GitHub Copilot CLI plugin reference][plugin-reference]
- [Finding and installing plugins for GitHub Copilot CLI][plugins-finding-installing]
- [Creating a plugin marketplace for GitHub Copilot CLI][plugins-marketplace]
- [About enterprise-managed plugin standards][enterprise-plugin-standards]
- [Preparing to use custom agents in your enterprise][enterprise-custom-agents]
- [Custom agents configuration reference][custom-agents-config]
- [Configuring enterprise-managed settings][configure-enterprise-managed-settings]
- [Enterprise managed settings reference][enterprise-managed-settings-reference]
- [Adding MCP servers for GitHub Copilot CLI][add-mcp-servers]
- [About Model Context Protocol (MCP)][mcp-concept]
- [Copilot CLI command reference][commands-reference]
- [Comparing GitHub Copilot CLI customization features][cli-customization-comparison]

---

| [← Previous: Modernizing apps with Copilot CLI][previous-lesson] | [Next: Wrap-up →][next-lesson] |
|:--|--:|

[previous-lesson]: ../06-modernize-apps/
[next-lesson]: ../08-wrap-up/
[m06]: ../06-modernize-apps/
[m02]: ../02-building-ai-infrastructure/
[m04]: ../04-lifecycle-hooks/
[mcp-concept]: https://docs.github.com/copilot/concepts/context/mcp
[context7-mcp]: https://github.com/upstash/context7
[mslearn-mcp]: https://github.com/microsoftdocs/mcp
[copilot-plugins]: https://docs.github.com/copilot/concepts/agents/about-plugins
[plugins-creating]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating
[plugin-reference]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-plugin-reference
[plugins-finding-installing]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing
[plugins-marketplace]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace
[enterprise-plugin-standards]: https://docs.github.com/copilot/concepts/agents/about-enterprise-plugin-standards
[configure-enterprise-managed-settings]: https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-agents/configure-enterprise-managed-settings
[enterprise-managed-settings-reference]: https://docs.github.com/copilot/reference/enterprise-managed-settings-reference
[add-mcp-servers]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
[commands-reference]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference
[cli-customization-comparison]: https://docs.github.com/copilot/concepts/agents/copilot-cli/comparing-cli-features
[copilot-plugins-repo]: https://github.com/github/copilot-plugins
[awesome-copilot]: https://github.com/github/awesome-copilot
[enterprise-custom-agents]: https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-agents/prepare-for-custom-agents
[github-private-repo]: https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-agents/create-github-private-repo
[custom-agents-config]: https://docs.github.com/copilot/reference/custom-agents-configuration
