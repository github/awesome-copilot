---
title: "可选：集成 Foundry"
description: "使用 Microsoft Foundry Canvas 构建以目录为依据的 Backer Concierge，并在各阶段设置可安全暂停的位置。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /zh-cn/learning-hub/copilot-workshops/app/10-review/, label: 回顾与后续步骤 }
next:
  link: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: 准备项目和模型
tags:
  - workshop
---

在这一可选学习流程中，将使用 GitHub Copilot app 中的 Microsoft Foundry Canvas，为 Tailspin Toys 添加 **Backer Concierge**。整个流程从以目录为依据的模型实验开始，逐步构建托管代理，最后集成到本地网站。

## 学习流程

每个模块最后都设有检查点，可在此安全暂停。整个流程始终使用同一个 Tailspin Toys 存储库、工作树分支、关联议题的会话、Foundry 项目和模型部署。

- [准备项目和模型][module-1]：明确回答所依据的目录数据范围，创建项目和模型部署，并在 Canvas 中检查。
- [构建并部署代理][module-2]：生成 Backer Concierge 的初始框架，在本地测试，然后部署并重新测试托管代理。
- [将代理连接到网站][module-3]：添加保护凭据的本地代理服务、支持无障碍访问的聊天组件和端到端测试。

> [!IMPORTANT]
> Microsoft Foundry Canvas 和托管代理目前处于公开预览阶段。
>
> 此流程会创建计费的 Azure 资源，包括模型部署，以及从模块 2 开始创建的托管代理。创建资源之前，必须确认订阅、区域、配额和预计费用并获得批准。即使只完成项目和模型阶段就停止，也需要清理资源。

1. 从[准备项目和模型][module-1]开始，所有操作都应在自己的 Tailspin Toys 存储库中完成，而不是在本研讨会的内容存储库中。
2. 如果你想先完成核心研讨会，请继续前往[回顾和后续步骤][core-review]。

## 清理资源

在任一检查点结束实验后，请删除 Azure 资源以免产生不必要的费用。清理会删除后续模块所需的资源，因此之后继续时需要重新创建这些资源。

> [!WARNING]
> 仅当 `rg-tailspin-toys` 专用于本练习且不包含需要保留的资源时，才能将其删除。删除共享资源组也会删除无关资源。
>
> 如果在模块 1 中批准了其他资源组名称，请在以下所有命令中使用该名称替换 `rg-tailspin-toys`。

1. 在相应终端中停止自己启动的本地 Agent Inspector、Azure Function 或 Astro 开发服务器。
2. 如果在模块 2 或 3 中部署了托管代理，请在同一个 Tailspin Toys 工作树中打开终端，使用相同的 `azd` 环境，然后运行：

   ```bash
   azd down --purge
   ```

3. 检查当前选择的订阅以及研讨会资源组是否仍然存在：

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   如果命令返回 `false`，则清理已完成。如果返回 `true`，请检查组中的资源：

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   确认所有剩余资源都属于本练习。如果在模块 1 后停止，即使没有部署 `azd` 服务，也仍需清理 Foundry 项目和模型。
4. 如果专用研讨会资源组仍然存在，并且仅包含要删除的资源，请运行：

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. 由于 `--no-wait` 命令会在删除完成前返回，请重新运行以下命令，直到它返回 `false`：

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## 资源

Microsoft 文档介绍了 Canvas、托管部署及其权限。

- [什么是 Microsoft Foundry Canvas？][foundry-canvas]
- [使用 Foundry Canvas 部署第一个托管代理][hosted-agent-quickstart]
- [托管代理权限][hosted-agent-permissions]

[module-1]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /zh-cn/learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
