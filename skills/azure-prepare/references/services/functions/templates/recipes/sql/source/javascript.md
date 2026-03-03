# JavaScript SQL Trigger + Output

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

**src/functions/sqlTrigger.js:**
```javascript
const { app } = require('@azure/functions');

app.sql('sqlTriggerToDo', {
    tableName: 'dbo.ToDo',
    connectionStringSetting: 'AZURE_SQL_CONNECTION_STRING_KEY',
    handler: async (changes, context) => {
        context.log('SQL trigger function processed a request.');
        
        for (const change of changes) {
            const toDoItem = change.Item;
            context.log(`Change operation: ${change.Operation}`);
            context.log(`Id: ${toDoItem.id}, Title: ${toDoItem.title}, Url: ${toDoItem.url}, Completed: ${toDoItem.completed}`);
        }
    }
});
```

**src/functions/sqlOutputHttpTrigger.js:**
```javascript
const { app, output } = require('@azure/functions');

const sqlOutput = output.sql({
    commandText: 'dbo.ToDo',
    connectionStringSetting: 'AZURE_SQL_CONNECTION_STRING_KEY'
});

app.http('httpTriggerSqlOutput', {
    methods: ['POST'],
    authLevel: 'function',
    extraOutputs: [sqlOutput],
    handler: async (request, context) => {
        context.log('HTTP trigger with SQL Output Binding function processed a request.');

        try {
            const toDoItem = await request.json();
            
            if (!toDoItem || !toDoItem.title || !toDoItem.url) {
                return {
                    status: 400,
                    jsonBody: { error: 'Missing required fields: title and url are required' }
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
                jsonBody: { error: 'Invalid request body. Expected ToDoItem JSON.' }
            };
        }
    }
});
```

**src/functions/health.js:**
```javascript
const { app } = require('@azure/functions');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async () => ({
        status: 200,
        jsonBody: { status: 'healthy', trigger: 'sql' }
    })
});
```

## Files to Remove

- `src/functions/httpTrigger.js`

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.js setup
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
