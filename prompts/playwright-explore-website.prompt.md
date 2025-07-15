---
mode: agent
tools: ['changes', 'codebase', 'editFiles', 'fetch', 'findTestFiles', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'playwright', 'browser_click', 'browser_close', 'browser_console_messages', 'browser_drag', 'browser_file_upload', 'browser_handle_dialog', 'browser_hover', 'browser_install', 'browser_navigate', 'browser_navigate_back', 'browser_navigate_forward', 'browser_network_requests', 'browser_pdf_save', 'browser_press_key', 'browser_resize', 'browser_select_option', 'browser_snapshot', 'browser_tab_close', 'browser_tab_list', 'browser_tab_new', 'browser_tab_select', 'browser_take_screenshot', 'browser_type', 'browser_wait_for']
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
