Connect to Subotiz MCP to handle subscriptions, usage billing, payments, taxes, and invoices — and drive revenue growth.



Subotiz is a global **subscription growth engine** and **MoR** platform built for **AI products, SaaS, and digital businesses**. Supporting over 180 countries and 150+ currencies, Subotiz enables developers to manage **usage-based billing, subscriptions, global payments, tax compliance, and revenue operations** all within a single platform. By integrating the Subotiz MCP, you can let your agents manage product pricing, handle subscriptions, process transactions or refunds, issue invoices to accelerate your monetization.



**Learn more**: For an overview of Subotiz products and capabilities, visit the [<u>Subotiz homepage</u>](https://www.subotiz.com/).

***

### Prerequisites

1. A host that supports Streamable HTTP MCP (e.g. VS Code 1.101+, Claude Desktop, Cursor, Trae, etc.)

2. A valid Subotiz access token

***

### Subotiz MCP URL

* sandbox: [<u>https://api.sandbox.subotiz.com/mcp</u>](https://api.sandbox.subotiz.com/mcp)

* prod: [<u>https://api.subotiz.com/mcp</u>](https://api.subotiz.com/mcp)

***

### MCP Configuration

When connecting to the official hosted service, you only need to configure the URL and `Authorization: Bearer`; no other request headers are required.

Cursor example (add to Cursor’s MCP settings):

```json
{
  "mcpServers": {
    "my-remote-server": {
      "url": "{{MCP_URL}}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Replace `{{MCP_URL}}` with the MCP URL for your target environment and `{{YOUR_TOKEN_HERE}}` with your Subotiz access token. In hosts such as VS Code, Cursor, or Claude Desktop, merge the above into their respective MCP configuration (e.g. `servers` or `mcpServers`) to use it.

Obtaining an API Key: The token in the configuration is your Subotiz API Key. For steps to create one and authentication details, see the [<u>Authentication guide</u>](https://developer.subotiz.com/v1.0-zh-cn/reference/authentication-1).
