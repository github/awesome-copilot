---
agent: agent
description: 'Website exploration for testing using Playwright MCP'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'web/fetch', 'findTestFiles', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'search/searchResults', 'runCommands/terminalLastCommand', 'runCommands/terminalSelection', 'testFailure', 'playwright']
model: 'Claude Sonnet 4'
---

# Website Exploration for Testing

Your goal is to explore the website and identify key functionalities.

## Specific Instructions

1. Navigate to the provided URL using the Playwright MCP Server. If no URL is provided, ask the user to provide one.
2. Identify and interact with 3-5 core features or user flows.
3. Document the user interactions, relevant UI elements (and their locators), and the expected outcomes.
4. Close the browser context upon completion.
5. Provide a concise summary of your findings.
6. Propose and generate test cases based on the exploration.
