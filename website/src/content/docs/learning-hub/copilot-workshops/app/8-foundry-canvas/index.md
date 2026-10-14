---
title: "Optional: Incorporate Foundry"
description: "Build a catalog-grounded Backer Concierge with Microsoft Foundry Canvas, with safe stopping points along the way."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /learning-hub/copilot-workshops/app/10-review/, label: Review and next steps }
next:
  link: /learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: Prepare project and model
tags:
  - workshop
---

This optional journey adds a **Backer Concierge** to Tailspin Toys using Microsoft Foundry Canvas in the GitHub Copilot app. It moves from a catalog-grounded model experiment to a hosted agent and then a local website integration.

## The journey

Each module ends with a checkpoint and a safe stopping point. The same Tailspin Toys repository, worktree branch, issue-linked session, Foundry project, and model deployment carry through the journey.

- [Prepare project and model][module-1] establishes the catalog boundary, creates the project and model deployment, and checks them in Canvas.
- [Build and deploy the agent][module-2] scaffolds the Backer Concierge, tests it locally, and deploys and retests the hosted agent.
- [Connect the agent to the site][module-3] adds a local credential-safe proxy, an accessible chat widget, and end-to-end tests.

> [!IMPORTANT]
> Microsoft Foundry Canvas and hosted agents are in public preview.
>
> This journey creates billable Azure resources, including a model deployment and, from module 2, a hosted agent. Subscription, region, quota, and estimated cost need approval before resource creation. Cleanup applies even when stopping after only the project and model.

1. Begin with [Prepare project and model][module-1], keeping the work in your Tailspin Toys repository rather than this workshop content repository.
2. If you'd rather finish the core workshop, continue to [Review and next steps][core-review].

## Clean up your resources

When you're done experimenting at any checkpoint, remove the Azure resources to avoid unwanted costs. Cleanup removes resources needed by later modules, so continuing afterward requires recreating them.

> [!WARNING]
> Only delete `rg-tailspin-toys` if it is dedicated to this exercise and contains no resources you need to keep. Deleting a shared resource group would remove unrelated resources too.
>
> If you approved a different resource-group name in module 1, substitute it for `rg-tailspin-toys` in every command below.

1. Stop any local Agent Inspector, Azure Function, or Astro development server you started in its terminal.
2. If you deployed the hosted agent in module 2 or 3, open a terminal in the same Tailspin Toys worktree and use the same `azd` environment, then run:

   ```bash
   azd down --purge
   ```

3. Check the selected subscription and whether the workshop resource group still exists:

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   If the command returns `false`, cleanup is complete. If it returns `true`, inspect the resources in the group:

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   Verify that all remaining resources belong to this exercise. If you stopped after module 1, the Foundry project and model still need cleanup even though you did not deploy an `azd` service.
4. If the dedicated workshop resource group still exists and contains only resources you intend to remove, run:

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. Because `--no-wait` returns before deletion completes, rerun the following command until it returns `false`:

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## Resources

The Microsoft documentation describes Canvas, hosted deployments, and their permissions.

- [What is Microsoft Foundry Canvas?][foundry-canvas]
- [Deploy your first hosted agent with Foundry Canvas][hosted-agent-quickstart]
- [Hosted agent permissions][hosted-agent-permissions]

[module-1]: /learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
