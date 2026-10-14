---
title: "构建并部署代理"
description: "在 Canvas 中生成 Backer Concierge 的初始框架，在本地检查，然后在 Foundry 中部署并重新测试。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: 准备项目和模型
next:
  link: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
  label: 将代理连接到网站
---

本模块将使用 Microsoft Foundry Canvas，把[准备项目和模型][previous-module]中创建的项目、模型部署和目录转变为托管的 Backer Concierge。

完成本模块后，将获得：

- 一个已生成初始框架的代理，包含打包的目录数据和针对性测试。
- 针对每项目录和对话验收标准的本地验证证据。
- 一个已部署并在 Foundry 中重新测试的代理版本。

## 场景

Tailspin Toys 需要一个能够回答实际目录问题、承认信息缺失，并记住对话中讨论过的游戏的助手。在成为游戏商店的一部分之前，这项服务必须先证明自身可靠。

## 准备部署工具

托管代理的检查和部署通过 Canvas 使用 Azure Developer CLI 完成；继续使用已有的 Foundry 项目和模型。

1. 返回模块 1 中关联 **Add a Backer Concierge assistant for catalog questions** 议题的同一会话。确认 `db/catalog.json` 完好、已连接到正确的订阅和 Foundry 项目，并且模型部署仍然存在。如果已清理资源，请先重新完成相关的[项目和模型设置][previous-module]。

2. 选择 **+**，选择 **Terminal**，然后登录 Azure Developer CLI，并在出现提示时在浏览器中完成身份验证：

   ```bash
   azd auth login
   ```

3. 运行 `azd config show` 验证 Azure 订阅。如果为空或不正确，请使用 `azd config set defaults.subscription <subscription-id>` 更新，然后再次运行 `azd config show` 确认更改。
## 生成 Backer Concierge 的初始框架

Canvas 会生成代码、文件夹结构以及根目录下的 `azure.yaml`，将 Backer Concierge 连接到已有的模型部署。

4. 在 **Create new hosted agents** 预览界面中输入：

   ```plaintext
   Scaffold a hosted agent named Backer Concierge in agent/backer-concierge, connected to the tailspin-toys project and the model deployment I just confirmed. Use Microsoft Agent Framework with the Responses API. Ground it in db/catalog.json and ensure it meets the acceptance criteria in this issue. Keep a single azure.yaml at the repository root with the hosted-agent service pointing to agent/backer-concierge. Make sure the deployed agent includes the catalog data it needs, and add focused tests.
   ```

   Canvas 会将提示词以及当前订阅和 Foundry 项目的上下文发送给 Copilot。它会查找 Agent Framework + Responses API 示例；可能会出现 **Agent with Local Tools (Responses, Agent Framework, Python)** 等选项。

   ![在 Canvas 中生成 Backer Concierge 代理的初始框架](/images/learning-hub/copilot-workshops/app-8-scaffold-backer-concierge.png)

5. 在 **Files** 选项卡中，按照以下检查点审查 Copilot 的更改。`src` 中生成的文件名可能不同，但项目边界和 `azure.yaml` 位置应符合以下要求：

   - 代理位于 `agent/backer-concierge`。
   - 存储库根目录中只有一个 `azure.yaml`，其中包含使用 `host: azure.ai.agent` 的服务。
   - 可部署的代理包含为其生成的目录副本。
   - 针对性测试覆盖回答必须以目录为依据的要求。
   - 不包含凭据或本地环境文件。

   ```text
   tailspin-toys/
   ├── azure.yaml
   ├── agent/
   │   └── backer-concierge/
   │       └── requirements.txt
   ├── db/
   │   └── catalog.json
   └── src/
   ```

6. 要求 Copilot 运行针对性测试并修复所有失败项，然后再继续到 **Deploy and test**。

## 在本地检查代理

**Inspect Locally** 会在 Copilot 集成终端中运行 `azd ai agent run`，等待托管代理启动，然后打开嵌入式 Agent Inspector。

7. 在 **Deploy and test** 中选择 **Inspect Locally**，然后等待 Agent Inspector 打开。

> [!NOTE]
> 首次本地运行时，`azd` 需要创建环境并安装依赖项，可能耗时几分钟。

8. 如果检查器无法连接，请确认没有其他进程占用所需端口，将错误发送给 Copilot，并在修复后重试。
9. 在 Agent Inspector 中测试**以目录为依据的推荐**：

    ```text
    I love puzzle games about tracking down bugs. What should I back?
    ```

    预期结果：只提及目录中真实存在的游戏名称，并使用每款游戏的正确信息。

    ![Agent Inspector 中以目录为依据的推荐](/images/learning-hub/copilot-workshops/app-8-grounded-recommendation.png)

10. 测试**幻觉陷阱**：

    ```text
    How much has Pipeline Conquest raised so far, and how many backers does it have?
    ```

    预期结果：说明目录不记录筹款或支持者信息，然后提供目录中确实存在的信息。

11. 测试**目录外问题施压**：

    ```text
    Do you have Wingspan? If not, what's the closest thing you've got?
    ```

    预期结果：说明目录中没有 Wingspan，不使用外部知识介绍它，并转而推荐真实存在的 Tailspin 游戏。

12. 测试**模糊请求**：

    ```text
    Recommend me something good.
    ```

    预期结果：提出一个简短的澄清问题，暂不推荐具体游戏。

13. 测试**排名准确性**：

    ```text
    What are your three highest rated games?
    ```

    预期结果：按正确顺序返回目录中评分最高的三个条目，并给出正确评分。

14. 在同一段对话中发送以下提示词，测试**对话连续性**：

    ```text
    Show me two highly rated strategy games.
    ```

    ```text
    Which of those has the higher rating?
    ```

    预期结果：第二次回答只涉及第一次回答中的两款游戏，并正确比较它们在目录中的评分。

15. 将每次回答与 `db/catalog.json` 和议题的验收标准对比。确认代理绝不编造游戏、发行商、评分、筹款总额、支持者人数、价格、玩家人数、游戏时长或发布日期。如果 Agent Inspector 报错，或回答超出了目录依据的范围，请将结果复制到 Canvas 的提示词区域，并要求 Copilot 修复。每次更改后都要重新启动本地检查并重跑失败的测试，然后确认全部六项检查通过，再进行部署。

## 部署并重新测试托管代理

Canvas 使用 `azd` 部署经过测试的代理。Foundry 会打包服务源代码、解析依赖项、远程构建，并将其发布到 Microsoft Foundry。

16. 在 Canvas 的 **Deploy and test** 中选择 **Deploy to Foundry**。审查自动填入聊天的提示词。

    ![画布上的 Deploy to Foundry 提示词](/images/learning-hub/copilot-workshops/app-8-deploy-to-foundry.png)

17. 检查是否收到部署确认、代理版本、状态及 Foundry 中代理试验场的链接。如果部署失败，请将错误发送给 Copilot，在同一项目中解决问题后，再通过 Canvas 重试。
18. 在 Canvas 中选择 **Test in Foundry Portal**，打开已部署代理的试验场。针对这个已部署版本，重新运行第 9–14 步中的全部六项验收检查；连续性检查中的两个提示词仍须在同一段对话中发送。将回答与目录对比；如果有任何检查失败，请要求 Copilot 修复，重新运行本地测试，通过 Canvas 重新部署，并再次测试托管版本。

## 检查点与后续步骤

你已生成 Backer Concierge 的初始框架，在本地测试其目录依据和对话行为，将其部署到 Microsoft Foundry，并重新测试了托管版本。本模块的检查点是一个能够通过全部六项验收检查且不会编造缺失信息的托管代理。

接下来，你将使用同一个 Tailspin Toys 存储库、工作树分支、关联议题的会话、Foundry 项目、所选模型部署和托管代理来[将代理连接到网站][next-module]。如果在此停止，请[清理 Azure 资源][cleanup]以免继续产生费用。

[previous-module]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[next-module]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[cleanup]: /zh-cn/learning-hub/copilot-workshops/app/8-foundry-canvas/#%E6%B8%85%E7%90%86%E8%B5%84%E6%BA%90
