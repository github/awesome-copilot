---
title: "Prepare project and model"
description: "Export the Tailspin catalog, create a Foundry project and model deployment, and validate them in Canvas."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /learning-hub/copilot-workshops/app/8-foundry-canvas/
  label: "Optional: Incorporate Foundry"
next:
  link: /learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: Build and deploy the agent
---

This first module establishes the data and Azure resources for the Backer Concierge. No agent code or hosted deployment is needed yet.

By the end, you will have:

- A catalog export with explicit grounding limits.
- A Foundry project and a model deployment chosen for the feature requirements.
- A Canvas-validated deployment and a simple catalog-bounded model smoke check.

## Scenario

Tailspin Toys backers can filter games by category and publisher, but questions such as *Which games would suit someone who loves Git puns?* don't have dropdown answers. A Backer Concierge should recommend only games in the Tailspin catalog and never invent games, publishers, ratings, funding totals, backer counts, prices, player counts, play times, or release dates. A reliable catalog and a suitable model are the foundation for those answers.

## Prepare your tools and issue session

The setup connects the GitHub Copilot app to Azure while keeping all feature work together.

1. Confirm that you have an Azure subscription. If you need one, the available options include a [free Azure subscription with $200 credit][azure-free] or [Azure for Students with $100 credit][azure-students].
2. Install the [Azure CLI][install-azure-cli] for your OS, then verify the installation using `az version`.
3. Install the [Azure Developer CLI][install-azd], then verify that version 1.27.1 or later is installed using `azd version`.
4. Open the GitHub Copilot app, open **Customize**, then select **Plugins**. Search for `microsoft-foundry` and select **Install** for the Microsoft Foundry plugin, which bundles Canvas and the Foundry skills.

   ![Install Microsoft Foundry plugin](/images/learning-hub/copilot-workshops/app-8-install-foundry-plugin.png)

5. In **Customize**, select **Plugins**, search for `azure` or select it from the **Featured** list, then select **Install** for the Azure plugin.
6. Select **Issues** in the sidebar, then find and open the issue titled **Add a Backer Concierge assistant for catalog questions** in your Tailspin Toys repository. Select **New session** to start an issue-linked session in a new worktree. Keep this repository, worktree branch, and issue session for all three modules.
7. Type `/microsoft-foundry`, then `/azure` to confirm both skills are installed and available; don't send any prompts yet. If a plugin does not appear immediately, restart the app, return to this same issue session, and check again.

## Generate the catalog export

The sample repository includes an export script that gives the agent a file it can read.

8. In this issue-linked worktree session, replace the default `/fix-issue` prompt in the prompt box with:

   ```plaintext
   Install the project dependencies, seed the database, then run the existing db:export script. Show me the command output and summarize the shape and grounding limits of db/catalog.json.
   ```

9. Review the command output. Copilot should run the equivalent of:

   ```bash
   npm install
   npm run db:setup
   npm run db:export
   ```

   ![Generate catalog export](/images/learning-hub/copilot-workshops/app-8-generate-catalog-export.png)

10. Open `db/catalog.json` and confirm it contains 21 games with a title, description, category, publisher, and star rating. Check its `note` field: the catalog doesn't contain funding totals, backer counts, pledge tiers, or release dates. Treat missing prices, player counts, and play times as unavailable too, rather than filling gaps from outside knowledge. If the export fails or differs, ask Copilot to investigate and rerun it before continuing.

   ![Catalog export open in the Copilot app](/images/learning-hub/copilot-workshops/app-8-view-catalog.png)

## Set up a Foundry project and model

Creating the project and deployment in chat first means Canvas connects only to resources that already exist.

11. Select **+**, select **Terminal**, and sign in to Azure:

    ```bash
    az login
    ```

12. Check the selected subscription and list its resource groups:

    ```bash
    az account show --output table
    az group list --output table
    ```

    If the subscription is incorrect, run `az account set --subscription <subscription-id>`, then repeat both commands.

    If `rg-tailspin-toys` appears, inspect its resources:

    ```bash
    az resource list --resource-group rg-tailspin-toys --output table
    ```

    If the group contains unrelated or shared resources, stop and choose a dedicated name before using the following prompt. Replace the example names in every later prompt and command with the names you approve.
13. In the same issue session, enter:

    ```plaintext
    Use the Microsoft Foundry skill to create a resource group named rg-tailspin-toys and a Foundry project named tailspin-toys.
    ```

    ![Create Foundry project](/images/learning-hub/copilot-workshops/app-8-foundry-project-created.png)

14. Ask Copilot to recommend a model. The issue's acceptance criteria are already in context because the session started from the issue:

    ```plaintext
    Use the Microsoft Foundry skill to recommend two or three current chat models in the tailspin-toys project that meet this issue's acceptance criteria. Explain the tradeoffs and wait for me to choose.
    ```

15. Confirm Copilot loads the `microsoft-foundry` skill, then choose an available model based on its tradeoffs. The Microsoft Foundry hosted-agent quickstart currently uses `gpt-5.4-mini`, but availability and quota vary by region.

    ![Select model](/images/learning-hub/copilot-workshops/app-8-select-model.png)

16. Ask Copilot to deploy your selection, reviewing the target project and cost before approval:

    ```plaintext
    Deploy the model I selected to the tailspin-toys Foundry project, using the model name as the deployment name.
    ```

> [!TIP]
> Model availability changes over time. The model Copilot confirms is available in your project is the appropriate choice, rather than a hardcoded model from this module.

## Validate and smoke-test the model in Canvas

This check verifies the project and model before any agent code exists. A model smoke check is not a substitute for the hosted agent's grounding tests in module 2.

17. Select **+**, then **Canvas**, then **Microsoft Foundry (Preview)**.
18. Open the **More options** menu in the top-right corner of Canvas, then select **Sign in**.
19. Select the **tailspin-toys** Foundry project. Expand **Models** and confirm your deployment appears with the expected name and status.

    ![Validate project and model in Canvas](/images/learning-hub/copilot-workshops/app-8-validate-project-model.png)

20. In the same session, enter:

    ```plaintext
    Use the Microsoft Foundry skill to test my deployed model directly in the tailspin-toys project without creating an agent. Ground it with content from @db/catalog.json and ask: "I love puzzle games about tracking down bugs. What should I back, and how much funding has it raised?" Show me the response and useful metadata such as tokens used and response time, only if available. Use my existing Azure sign-in. Do not display credentials, change files, or create resources.
    ```

21. Review the response. It should recommend only a real game from `db/catalog.json`, use the correct title, publisher, and rating, and explain that funding information is unavailable. If the model invents a game, catalog details, or a funding total, compare another recommended model before continuing.

> [!NOTE]
> Canvas remembers the selected project when reopened. Its stages are **Create new hosted agents** for scaffolding, **Build current hosted agent** for connecting models, toolboxes, skills, and guardrails, and **Deploy and test** for local runs and deployment to Microsoft Foundry.

## Checkpoint and next steps

You prepared the Azure tools, exported the catalog, and tested a deployed model against the Backer Concierge grounding rules. The checkpoint for this module is a model that recommends real catalog games without inventing missing information.

Next, you'll use the same Tailspin Toys repository, worktree branch, issue-linked session, Foundry project, and selected model deployment to [build and deploy the agent][next-module]. If you're stopping here, [clean up your Azure resources][cleanup] to avoid ongoing costs.

[azure-free]: https://azure.microsoft.com/pricing/purchase-options/azure-account
[azure-students]: https://azure.microsoft.com/free/students
[install-azure-cli]: https://learn.microsoft.com/cli/azure/install-azure-cli
[install-azd]: https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd
[next-module]: /learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[cleanup]: /learning-hub/copilot-workshops/app/8-foundry-canvas/#clean-up-your-resources
