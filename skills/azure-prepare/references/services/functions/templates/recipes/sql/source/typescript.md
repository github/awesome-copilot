# TypeScript SQL Trigger + Output

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

**src/functions/sql_trigger.ts:**
```typescript
import { app, InvocationContext, SqlChange } from '@azure/functions';
import { ToDoItem } from '../models/ToDoItem';

app.sql('sqlTriggerToDo', {
    tableName: 'dbo.ToDo',
    connectionStringSetting: 'AZURE_SQL_CONNECTION_STRING_KEY',
    handler: async (changes: SqlChange[], context: InvocationContext): Promise<void> => {
        context.log('SQL trigger function processed a request.');
        
        for (const change of changes) {
            const toDoItem: ToDoItem = change.Item as ToDoItem;
            context.log(`Change operation: ${change.Operation}`);
            context.log(`Id: ${toDoItem.id}, Title: ${toDoItem.title}, Url: ${toDoItem.url}, Completed: ${toDoItem.completed}`);
        }
    }
});
```

**src/functions/sql_output_http_trigger.ts:**
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { ToDoItem } from '../models/ToDoItem';

const sqlOutput = output.sql({
    commandText: 'dbo.ToDo',
    connectionStringSetting: 'AZURE_SQL_CONNECTION_STRING_KEY'
});

app.http('httpTriggerSqlOutput', {
    methods: ['POST'],
    authLevel: 'function',
    extraOutputs: [sqlOutput],
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('HTTP trigger with SQL Output Binding function processed a request.');

        try {
            const toDoItem: ToDoItem = await request.json() as ToDoItem;
            
            if (!toDoItem || !toDoItem.title || !toDoItem.url) {
                return {
                    status: 400,
                    jsonBody: { 
                        error: 'Missing required fields: title and url are required'
                    }
                };
            }

            context.extraOutputs.set(sqlOutput, toDoItem);

            return {
                status: 201,
                jsonBody: toDoItem
            };
        } catch (error) {
            context.log('Error processing request:', error);
            return {
                status: 400,
                jsonBody: { 
                    error: 'Invalid request body. Expected ToDoItem JSON.'
                }
            };
        }
    }
});
```

**src/models/ToDoItem.ts:**
```typescript
export interface ToDoItem {
    id: string;
    title: string;
    url: string;
    order?: number;
    completed?: boolean;
}
```

## Files to Remove

- `src/functions/httpTrigger.ts` (or equivalent HTTP function)

## Test

```bash
curl -X POST "https://<func>.azurewebsites.net/api/httpTriggerSqlOutput?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"id": "1", "title": "Test", "url": "https://example.com", "completed": false}'
```

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.ts setup + build
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
