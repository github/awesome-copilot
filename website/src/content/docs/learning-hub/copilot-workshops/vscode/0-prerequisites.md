---
title: "Exercise 0: Prerequisites"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Before you start the VS Code exercises, you need to get everything ready. You'll create your own copy of the Tailspin Toys repository, spin up a [codespace][codespaces] to work in, and confirm GitHub Copilot Chat is up and running in your editor.

## Setting up the lab repository

To create a copy of the repository for the code you'll create, you'll make an instance from the [template][template-repository]. The new instance will contain all of the necessary files for the lab, and you'll use it as you work through the exercises.

1. In a new browser window, navigate to the GitHub repository for this lab: `https://github.com/github-samples/tailspin-toys`.
2. Create your own copy of the repository by selecting the **Use this template** button on the lab repository page. Then select **Create a new repository**.

    ![Use this template button](/images/learning-hub/copilot-workshops/ex0-use-template.png)

3. If you are completing the workshop as part of an event being led by GitHub or Microsoft, follow the instructions provided by the mentors. Otherwise, you can create the new repository in an organization where you have access to GitHub Copilot.

    ![Input the repository template settings](/images/learning-hub/copilot-workshops/ex0-repository-settings.png)

4. Make a note of the repository path you created (**organization-or-user-name/repository-name**), as you will be referring to this later in the lab.

> [!NOTE]
> **Your backlog is ready**
>
> When you create your repository from the template, a backlog of GitHub issues is created for you automatically. You'll work from these issues throughout the workshop — there's nothing to file yourself.
## Creating a codespace

Next up, you'll use a codespace to complete the lab exercises.

[GitHub Codespaces][codespaces] are a cloud-based development environment that allows you to write, run, and debug code directly in your browser. It provides a fully-featured IDE with support for multiple programming languages, extensions, and tools.

1. Navigate to your newly created repository.
2. Select the green **Code** button.

    ![Select the Code button](/images/learning-hub/copilot-workshops/ex0-code-button.png)

3. Select the **Codespaces** tab and select the **+** button to create a new Codespace.

    ![Create a new codespace](/images/learning-hub/copilot-workshops/ex0-create-codespace.png)

The creation of the codespace will take several minutes, although it's still far quicker than having to manually install all the services! That said, you can use this time to explore other features of GitHub Copilot, which we'll turn your attention to next.

> [!CAUTION]
> You'll return to the codespace in a future exercise. For the time being, leave it open in a tab in your browser.

> [!NOTE]
> This workshop is built to run inside a codespace or local [dev container][dev-containers]. Both ensure the environment has all the necessary prerequisites installed for a smooth experience. If you'd prefer to run it locally, open the cloned repository in VS Code and select **Reopen in Container** when prompted — VS Code will build the same dev container the codespace uses.

[codespaces]: https://github.com/features/codespaces
[dev-containers]: https://code.visualstudio.com/docs/devcontainers/containers
## Using GitHub Copilot Chat and agent mode

To access GitHub Copilot Chat agent mode, you need to have the GitHub Copilot Chat extension installed in your IDE, which should already be the case if you are using a GitHub Codespace.

> [!TIP]
> If you do not have the GitHub Copilot Chat extension installed, you can [install it from the Visual Studio Code Marketplace][copilot-chat-extension]. Or open the Extensions view in Visual Studio Code, search for **GitHub Copilot Chat**, and select **Install**.

Once you have the extension installed, you may need to authenticate with your GitHub account to enable it.

1. Return to your codespace.
2. If you don't already see Copilot Chat on the right side of your editor, select the **Copilot Chat** icon at the top of your codespace.
3. Type a message like "Hello world" in the Copilot Chat window and press enter. This should activate Copilot Chat.
4. Alternatively, if you are not authenticated you will be prompted to sign in to your GitHub account. Follow the instructions to authenticate.

    ![Example of Copilot Chat authentication prompt](/images/learning-hub/copilot-workshops/ex1-copilot-authentication.png)

5. After authentication, you should see the Copilot Chat window appear.

## Summary

Congratulations, you have created a copy of the lab repository! You also began the creation process of your codespace, which you'll use when you begin writing code.

## Next step

Let's start putting Copilot to work. Continue to [Exercise 1 - Custom instructions][next-lesson], where you'll teach Copilot your project's conventions.

## Resources

- [GitHub Codespaces overview][codespaces]
- [Creating a repository from a template][template-repository]
- [Getting started with Codespaces][codespaces-quickstart]

[template-repository]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-template-repository
[codespaces-quickstart]: https://docs.github.com/codespaces/getting-started/quickstart
[copilot-chat-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat
[next-lesson]: /learning-hub/copilot-workshops/vscode/1-custom-instructions/
