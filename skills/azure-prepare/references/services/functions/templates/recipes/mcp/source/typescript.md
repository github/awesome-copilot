# TypeScript MCP Tools

Replace the contents of `src/functions/` with these files.

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.ts` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

> 📦 **Build Required**: Run `npm run build` before deployment to compile TypeScript to `dist/`.

## src/functions/mcp.ts

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface McpTool {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, { type: string; description: string }>;
        required: string[];
    };
}

const MCP_TOOLS: Record<string, McpTool> = {
    get_weather: {
        name: 'get_weather',
        description: 'Get current weather for a city',
        parameters: {
            type: 'object',
            properties: {
                city: { type: 'string', description: 'City name' }
            },
            required: ['city']
        }
    },
    search_docs: {
        name: 'search_docs',
        description: 'Search documentation for a query',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
        }
    },
    run_query: {
        name: 'run_query',
        description: 'Execute a database query',
        parameters: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: 'SQL query to execute' }
            },
            required: ['sql']
        }
    }
};

function handleToolCall(toolName: string, args: Record<string, unknown>): unknown {
    switch (toolName) {
        case 'get_weather':
            return { city: args.city, temperature: 72, conditions: 'Sunny' };
        case 'search_docs':
            return { results: [`Doc 1 about ${args.query}`, `Doc 2 about ${args.query}`] };
        case 'run_query':
            return { rows: [], message: `Executed: ${String(args.sql).slice(0, 50)}...` };
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

export async function mcpHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as {
            method: string;
            params?: { name?: string; arguments?: Record<string, unknown> };
            id: string | number;
        };
        
        const { method, params = {}, id } = body;
        let result: unknown;

        if (method === 'tools/list') {
            result = { tools: Object.values(MCP_TOOLS) };
        } else if (method === 'tools/call') {
            const { name, arguments: args = {} } = params;
            if (!name) throw new Error('Tool name required');
            result = handleToolCall(name, args);
        } else {
            return {
                status: 400,
                jsonBody: {
                    jsonrpc: '2.0',
                    error: { code: -32601, message: `Method not found: ${method}` },
                    id
                }
            };
        }

        return {
            jsonBody: { jsonrpc: '2.0', result, id }
        };
    } catch (error) {
        context.log(`MCP error: ${error}`);
        return {
            status: 500,
            jsonBody: {
                jsonrpc: '2.0',
                error: { code: -32603, message: String(error) },
                id: null
            }
        };
    }
}

app.http('mcp', {
    methods: ['POST'],
    route: 'mcp',
    authLevel: 'function',
    handler: mcpHandler,
});
```

## src/functions/healthCheck.ts

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheck(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    return {
        jsonBody: {
            status: 'healthy',
            type: 'mcp',
            tools: ['get_weather', 'search_docs', 'run_query']
        }
    };
}

app.http('healthCheck', {
    methods: ['GET'],
    route: 'health',
    authLevel: 'function',
    handler: healthCheck,
});
```

## package.json additions

```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```
