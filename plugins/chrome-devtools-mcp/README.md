# Chrome DevTools MCP

Reliable automation, in-depth debugging, and performance analysis in Chrome using Chrome DevTools and Puppeteer.

This plugin provides access to the [Chrome DevTools MCP server](https://github.com/ChromeDevTools/chrome-devtools-mcp), allowing Copilot to interact with browser instances for automation, performance analysis, and debugging.

## Features

- **Input automation**: click, drag, fill, fill_form, handle_dialog, hover, press_key, type_text, upload_file
- **Navigation automation**: close_page, list_pages, navigate_page, new_page, select_page, wait_for
- **Emulation**: emulate, resize_page
- **Performance**: performance_analyze_insight, performance_start_trace, performance_stop_trace, take_memory_snapshot
- **Network**: get_network_request, list_network_requests
- **Debugging**: evaluate_script, get_console_message, lighthouse_audit, list_console_messages, take_screenshot, take_snapshot

## Installation

```bash
copilot plugin install chrome-devtools-mcp@awesome-copilot
```

## License

Apache-2.0
