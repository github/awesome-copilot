---
title: "第 0 课 - 先决条件"
description: "为 GitHub Copilot app 课程做好准备：为 Tailspin Toys 项目安装 Node.js，并通过模板创建自己的存储库副本。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

GitHub Copilot app 是一款桌面应用，作为 Copilot 和 GitHub 的中央枢纽。它支持快速访问议题和拉取请求，也支持使用 GitHub Copilot 进行构建。在本研讨会中，你将在本地使用基于 Astro 构建的 Tailspin Toys 应用和 GitHub Copilot app。开始前，请先确保本地已安装 Node.js，然后再安装 Copilot app。

本课将介绍如何：

- 安装 Node.js，以便在本机运行项目测试。
- 通过模板创建自己的 Tailspin Toys 项目副本。

## 安装 Node.js

多节课程会要求智能体构建功能，并在本地运行 Tailspin Toys 测试套件。这需要项目唯一依赖的运行时 [**Node.js**][nodejs]。请安装 **22 或更高版本**；当前的 **LTS** 版本是稳妥的选择。

所有平台上最简单的方式都是使用官方安装程序：

1. 在操作系统中使用 Windows Terminal、macOS 终端或常用工具打开终端窗口。
2. 运行以下命令，确认已安装 Node.js 22 或更高版本：

    ```shell
    node --version
    ```

3. 如果看到 `v22` 或更高版本号，可以跳到下一节。

> [!TIP]
> 仅当尚未安装 Node 或需要更新时，才需要完成以下步骤。

4. 打开 [Node.js 下载页面][node-download]。
5. 下载适用于当前操作系统的 **LTS** 版本。
6. 运行安装程序并接受默认设置。在 Windows 上，保留选中的 **Add to PATH** 选项。
7. 安装完成后，打开新的终端窗口。
8. 在新终端窗口中运行以下命令，确认安装成功：

    ```bash
    node --version
    ```

9. 应会看到 `v22.x.x` 或更高版本。

> [!TIP]
> 更喜欢容器？如果已安装 [**Docker**][docker]，可以使用存储库的[开发容器][dev-containers]，无需在本地安装 Node.js。开发容器已包含 Node，两种方式无需同时使用。

## 设置实验存储库

你将使用自己的 Tailspin Toys 项目副本。现在通过[模板存储库][template-repository]创建副本。新存储库包含实验所需的全部文件，下一课会将其连接到应用。

1. 在新的浏览器窗口中，转到本实验的 GitHub 存储库：`https://github.com/github-samples/tailspin-toys`。
2. 在实验存储库页面选择 **Use this template** 按钮，再选择 **Create a new repository**，创建自己的存储库副本。

    ![展开 Use this template 下拉菜单并选中 Create a new repository](/images/learning-hub/copilot-workshops/app-0-use-template.png)

3. 如果在 GitHub 或 Microsoft 主办的活动中参加本研讨会，请遵循导师提供的说明。否则，可在有权使用 GitHub Copilot 的组织中创建新存储库。

    ![Create a new repository 表单，其中 github-samples/tailspin-toys 被设为模板，且已填写存储库名称](/images/learning-hub/copilot-workshops/app-0-create-repository.png)

4. 记下所创建的存储库路径 (**organization-or-user-name/repository-name**)，后续实验会用到该路径。

> [!NOTE]
> 通过模板创建存储库时，系统会自动创建一组 GitHub 议题作为待办事项。整个研讨会都会使用这些议题，无需自行创建。

## 总结与后续步骤

准备工作已完成。你安装了 Node.js，因此可以在本机构建和测试项目；还通过模板创建了自己的 Tailspin Toys 存储库副本。

接下来，你将安装 GitHub Copilot app、连接刚创建的存储库并熟悉工作区。继续学习[第 1 课 - 安装 GitHub Copilot app][next-lesson]。

## 资源

- [下载 Node.js][node-download]
- [通过模板创建存储库][template-repository]
- [关于 GitHub Copilot app][about-copilot-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/1-install-copilot-app/
[nodejs]: https://nodejs.org/
[node-download]: https://nodejs.org/en/download
[docker]: https://www.docker.com/products/docker-desktop/
[dev-containers]: https://code.visualstudio.com/docs/devcontainers/containers
[template-repository]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-template-repository
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app