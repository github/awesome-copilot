# JavaScript MCP Tools

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.js` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

## Dependencies

**package.json:**
```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

## Source Code

**src/functions/mcpTools.js:**
```javascript
const { app } = require('@azure/functions');

// Tool definitions
const tools = [
    {
        name: 'get_weather',
        description: 'Get weather for a city',
        inputSchema: {
            type: 'object',
            properties: {
                city: { type: 'string', description: 'City name' }
            },
            required: ['city']
        }
    },
    {
        name: 'search_docs',
        description: 'Search documentation',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
        }
    }
];

// Tool implementations
const toolHandlers = {
    get_weather: async (args) => {
        return { temperature: 72, conditions: 'sunny', city: args.city };
    },
    search_docs: async (args) => {
        return { results: [`Result for: ${args.query}`], count: 1 };
    }
};

app.http('mcp', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        const body = await request.json();
        const { method, params, id } = body;

        if (method === 'tools/list') {
            return {
                jsonBody: { jsonrpc: '2.0', id, result: { tools } }
            };
        }

        if (method === 'tools/call') {
            const { name, arguments: args } = params;
            const handler = toolHandlers[name];
            
            if (!handler) {
                return {
                    status: 400,
                    jsonBody: { jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found' } }
                };
            }

            const result = await handler(args);
            return {
                jsonBody: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } }
            };
        }

        return {
            status: 400,
            jsonBody: { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }
        };
    }
});

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async () => ({
        status: 200,
        jsonBody: { status: 'healthy', type: 'mcp' }
    })
});
```

## Files to Remove

- `src/functions/httpTrigger.js`
