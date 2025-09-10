# MCP Server: Awesome Copilot

This is an MCP server that retrieves GitHub Copilot customizations from the [awesome-copilot](https://github.com/github/awesome-copilot) repository.

## Install

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode) [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode-insiders)

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Aspire CLI nightly: `iex "& { $(irm https://aspire.dev/install.ps1) } -Quality dev"`
- [Visual Studio Code](https://code.visualstudio.com/) with
  - [C# Dev Kit](https://marketplace.visualstudio.com/items/?itemName=ms-dotnettools.csdevkit) extension
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/)

## What's Included

Awesome Copilot MCP server includes:

| Building Block | Name                  | Description                                                           | Usage                                    |
| -------------- | --------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| Tools          | `search_instructions` | Searches custom instructions based on keywords in their descriptions. | `#search_instructions`                   |
| Tools          | `load_instruction`    | Loads a custom instruction from the repository.                       | `#load_instruction`                      |
| Prompts        | `get_search_prompt`   | Get a prompt for searching copilot instructions.                      | `/mcp.awesome-copilot.get_search_prompt` |

## Getting Started

- [Getting repository root](#getting-repository-root)
- [Running MCP server](#running-mcp-server)
  - [On a local machine](#on-a-local-machine)
  - [In a container](#in-a-container)
  - [On Azure](#on-azure)
- [Connect MCP server to an MCP host/client](#connect-mcp-server-to-an-mcp-hostclient)
  - [VS Code + Agent Mode + Local MCP server](#vs-code--agent-mode--local-mcp-server)

### Running MCP server

#### On a local machine

1. Run the MCP server app using Aspire.

   ```bash
   aspire run
   ```

Once running, the Aspire dashboard will be loaded in your default web browser, or you can click the URL provided in the terminal. From here, you'll have access to the MCP server endpoint, logs and metrics.

#### In a container

1. Build the MCP server app as a container image.

   ```bash
   cd mcp-server
   docker build -f Dockerfile -t awesome-copilot:latest .
   ```

1. Run the MCP server app in a container.

   ```bash
   docker run -i --rm -p 8080:8080 awesome-copilot:latest
   ```

   Alternatively, use the container image from the container registry.

   ```bash
   docker run -i --rm -p 8080:8080 ghcr.io/github/awesome-copilot:latest
   ```

#### On Azure

1. Navigate to the directory.

   ```bash
   cd mcp-server
   ```

1. Login to Azure.

   ```bash
   # Login with Azure Developer CLI
   azd auth login
   ```

1. Deploy the MCP server app to Azure.

   ```bash
   azd up
   ```

   While provisioning and deploying, you'll be asked to provide subscription ID, location, environment name.

1. After the deployment is complete, get the information by running the following commands:

   - Azure Container Apps FQDN:

     ```bash
     azd env get-value AZURE_RESOURCE_MCP_AWESOME_COPILOT_FQDN
     ```

### Connect MCP server to an MCP host/client

#### Install the MCP server:

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode) [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode-insiders)

1. Open Command Palette by typing `F1` or `Ctrl`+`Shift`+`P` on Windows or `Cmd`+`Shift`+`P` on Mac OS, and search `MCP: List Servers`.
1. Choose `awesome-copilot` then click `Start Server`.
1. When prompted, enter one of the following values:
   - The absolute directory path of the `AwesomeCopilot.McpServer` project
   - The FQDN of Azure Container Apps.
1. Use a prompt by typing `/mcp.awesome-copilot.get_search_prompt` and enter keywords to search. You'll get a prompt like:

   ```text
   Please search all the chatmodes, instructions and prompts that are related to the search keyword, `{keyword}`.

   Here's the process to follow:

   1. Use the `awesome-copilot` MCP server.
   1. Search all chatmodes, instructions, and prompts for the keyword provided.
   1. DO NOT load any chatmodes, instructions, or prompts from the MCP server until the user asks to do so.
   1. Scan local chatmodes, instructions, and prompts markdown files in `.github/chatmodes`, `.github/instructions`, and `.github/prompts` directories respectively.
   1. Compare existing chatmodes, instructions, and prompts with the search results.
   1. Provide a structured response in a table format that includes the already exists, mode (chatmodes, instructions or prompts), filename, title and description of each item found. Here's an example of the table format:

       | Exists | Mode         | Filename               | Title         | Description   |
       |--------|--------------|------------------------|---------------|---------------|
       | ✅    | chatmodes    | chatmode1.json         | ChatMode 1    | Description 1 |
       | ❌    | instructions | instruction1.json      | Instruction 1 | Description 1 |
       | ✅    | prompts      | prompt1.json           | Prompt 1      | Description 1 |

       ✅ indicates that the item already exists in this repository, while ❌ indicates that it does not.

   1. If any item doesn't exist in the repository, ask which item the user wants to save.
   1. If the user wants to save it, save the item in the appropriate directory (`.github/chatmodes`, `.github/instructions`, or `.github/prompts`) using the mode and filename, with NO modification.
   ```

1. Confirm the result.
