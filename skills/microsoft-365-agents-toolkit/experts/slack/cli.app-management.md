# cli.app-management

## purpose

App lifecycle management (`slack app`), collaborator administration (`slack collaborator`), and workspace installation controls via the Slack CLI.

## rules

1. **`slack app install` installs the production app to a workspace.** After `slack deploy`, use this to install the app in additional workspaces. The app must be deployed before it can be installed.
2. **`slack app uninstall` removes the app from a workspace.** Revokes all tokens and permissions. Users lose access to the app's triggers, functions, and datastores in that workspace.
3. **`slack app delete` permanently removes the app.** Deletes the app registration from Slack's platform. This is irreversible — all triggers, datastores, and installations are lost. Requires confirmation.
4. **`slack app link` associates an existing app with a project.** If you have an app created outside the CLI (e.g., via api.slack.com), link it to your local project for CLI management. Updates `.slack/project.json`.
5. **`slack app unlink` disconnects an app from the project.** Removes the app-to-project mapping in `.slack/project.json`. The app still exists on Slack's platform — it's just no longer managed by this project directory.
6. **`slack app list` shows apps linked to this project.** Displays app IDs, workspace names, and deployment status (dev vs deployed). Useful for multi-workspace setups.
7. **`slack app settings` opens the app config in a browser.** Navigates to `api.slack.com/apps/<id>` for the app's web-based settings page. Useful for configuring features not exposed via CLI.
8. **`slack collaborator add` grants another developer access.** They can run CLI commands against the app (deploy, run, trigger management). Requires the collaborator's Slack email or user ID.
9. **`slack collaborator remove` revokes a collaborator's access.** They can no longer deploy, run, or manage the app via the CLI.
10. **`slack collaborator list` shows all collaborators.** Displays user IDs, emails, and permission levels for the app.
11. **`slack collaborator update` changes a collaborator's role.** Modify permissions (e.g., read-only vs full access) for an existing collaborator.
12. **Multi-workspace management is first-class.** One project can have multiple app installations across workspaces. Each workspace gets its own app ID in `.slack/project.json`. Use `--team` to target specific workspaces.

## patterns

### Pattern 1: App lifecycle workflow

```bash
# Deploy the app first (creates/updates the production app)
slack deploy

# Install to additional workspaces
slack app install --team T0SECOND_WS

# List all linked apps and their workspaces
slack app list
# Output:
#   App ID         Team                  Status
#   A01234 (dev)   MyWorkspace (T001)    Development
#   A05678         MyWorkspace (T001)    Deployed
#   A09012         OtherWorkspace (T002) Deployed

# View app settings in browser
slack app settings --app A05678

# Uninstall from a workspace (keeps app, removes from workspace)
slack app uninstall --team T0SECOND_WS

# Permanently delete the app (irreversible!)
slack app delete --app A05678
# CLI prompts: "Are you sure? This cannot be undone." → confirm
```

### Pattern 2: Collaborator management

```bash
# Add a collaborator by email
slack collaborator add --email alice@example.com

# Add by Slack user ID
slack collaborator add --user U0ALICE

# List all collaborators
slack collaborator list
# Output:
#   User ID    Email                Role
#   U0OWNER    owner@example.com    Owner
#   U0ALICE    alice@example.com    Collaborator
#   U0BOB      bob@example.com      Collaborator

# Update collaborator role
slack collaborator update --user U0ALICE --role viewer

# Remove a collaborator
slack collaborator remove --user U0ALICE
```

### Pattern 3: Multi-workspace project setup

```bash
# Authenticate with multiple workspaces
slack auth login                    # Primary workspace
slack auth login                    # Secondary workspace (repeat login)
slack auth list                     # Shows both workspaces

# Deploy to primary workspace
slack deploy --team T0PRIMARY

# Deploy to secondary workspace (creates a separate app registration)
slack deploy --team T0SECONDARY

# Create triggers per workspace (triggers are workspace-scoped)
slack trigger create --trigger-def triggers/greeting.ts --team T0PRIMARY
slack trigger create --trigger-def triggers/greeting.ts --team T0SECONDARY

# Monitor activity per workspace
slack activity --team T0PRIMARY
slack activity --team T0SECONDARY

# Project config tracks both
cat .slack/project.json
# Shows app IDs for both workspaces
```

### Pattern 4: Linking and unlinking existing apps

```bash
# Link an app created via api.slack.com to this project
slack app link --app A0EXISTING --team T0WORKSPACE
# Updates .slack/project.json with the app mapping

# Unlink without deleting the app
slack app unlink --app A0EXISTING
# Removes from .slack/project.json, app still exists on Slack

# Initialize a project and link in one step
cd existing-code/
slack project init
slack app link --app A0EXISTING --team T0WORKSPACE
slack deploy  # Now deploys to the linked app
```

## pitfalls

- **`slack app delete` is irreversible** — All data, triggers, and installations are permanently destroyed. Double-check the app ID before confirming. There is no undo.
- **Confusing uninstall with delete** — `uninstall` removes from a workspace (reversible via re-install). `delete` destroys the app entirely.
- **Deploying to wrong workspace** — Without `--team`, deploys to the default workspace. Always verify with `slack auth list` which workspace is active.
- **Collaborators vs workspace members** — Collaborators are developers who can manage the app via CLI. Workspace members are end users who interact with the app. These are different permission systems.
- **Unlinked app still exists** — `slack app unlink` only removes the local project mapping. The app continues running on Slack's platform. To fully remove, use `slack app delete`.
- **Triggers are workspace-scoped** — When deploying to multiple workspaces, you must create triggers separately in each workspace. They don't automatically propagate.
- **Stale `.slack/project.json` after manual changes** — If you delete an app via the web UI, the local project.json still references it. Run `slack app list` and `slack app unlink` to clean up.
- **Collaborator email must be a Slack account** — The person must have a Slack account in the workspace. External emails without Slack accounts can't be added.

## references

- [slack app reference](https://tools.slack.dev/cli/reference/slack_app/)
- [App installation](https://tools.slack.dev/cli/guides/installing-an-app/)
- [Collaborator management](https://tools.slack.dev/cli/reference/slack_collaborator/)
- [Multi-workspace apps](https://tools.slack.dev/cli/guides/deploying-to-slack/)
- [slack app link](https://tools.slack.dev/cli/reference/slack_app_link/)

## instructions

Do a web search for:

- "Slack CLI app install uninstall delete link management 2025"
- "Slack CLI collaborator add remove permissions"
- "Slack CLI multi-workspace deployment project.json"

Pair with:
- `cli.local-dev-deploy.md` — deploy before install, dev vs production apps
- `cli.getting-started.md` — auth and project setup before app management
- `cli.manifest-triggers.md` — triggers must be created per workspace after install
- `bolt-oauth-distribution-ts.md` — OAuth distribution for multi-workspace Bolt apps

## research

Deep Research prompt:

"Write a micro expert on Slack CLI app management and collaboration. Cover app lifecycle (install, uninstall, delete, link, unlink, list, settings), collaborator management (add, remove, list, update), multi-workspace deployment (--team flag, separate app IDs per workspace, workspace-scoped triggers), project.json workspace mapping, app link/unlink for existing apps, and the difference between dev and deployed app installations. Include canonical patterns for: app lifecycle workflow, collaborator management, multi-workspace setup, linking existing apps."
