# Python SQL Trigger + Output

## Dependencies

**requirements.txt:**
```
azure-functions
```

## Source Code

**function_app.py:**
```python
import logging
import json
from typing import List
import azure.functions as func
from todo_item import ToDoItem

app = func.FunctionApp()

@app.sql_trigger(
    arg_name="changes", 
    table_name="[dbo].[ToDo]",
    connection_string_setting="AZURE_SQL_CONNECTION_STRING_KEY"
)
def sql_trigger_todo(changes: str) -> None:
    """SQL trigger function that responds to changes in the ToDo table."""
    logging.info("SQL trigger function processed changes")
    
    try:
        changes_list = json.loads(changes)
        
        for change in changes_list:
            operation = change.get('Operation', 'Unknown')
            item_data = change.get('Item', {})
            
            todo_item = ToDoItem.from_dict(item_data)
            
            logging.info(f"Change operation: {operation}")
            logging.info(f"Id: {todo_item.id}, Title: {todo_item.title}, "
                        f"Url: {todo_item.url}, Completed: {todo_item.completed}")
    except json.JSONDecodeError:
        logging.error(f"Failed to parse changes as JSON: {changes}")
    except Exception as e:
        logging.error(f"Error processing changes: {str(e)}")


@app.function_name("httptrigger-sql-output")
@app.route(route="httptriggersqloutput", methods=["POST"])
@app.sql_output(
    arg_name="todo",
    command_text="[dbo].[ToDo]", 
    connection_string_setting="AZURE_SQL_CONNECTION_STRING_KEY"
)
def http_trigger_sql_output(
    req: func.HttpRequest, 
    todo: func.Out[func.SqlRow]
) -> func.HttpResponse:
    """HTTP trigger with SQL output binding to insert ToDo items."""
    logging.info('HTTP trigger with SQL Output Binding processed a request.')
    
    try:
        req_body = req.get_json()
        
        if not req_body:
            return func.HttpResponse(
                "Please pass a valid JSON object in the request body",
                status_code=400
            )
        
        row = func.SqlRow.from_dict(req_body)
        todo.set(row)
        
        return func.HttpResponse(
            json.dumps(req_body),
            status_code=201,
            mimetype="application/json"
        )
        
    except ValueError as e:
        logging.error(f"JSON parsing error: {e}")
        return func.HttpResponse("Invalid JSON in request body", status_code=400)
    except Exception as e:
        logging.error(f"Error processing request: {e}")
        return func.HttpResponse("Internal server error", status_code=500)
```

**todo_item.py:**
```python
from dataclasses import dataclass
from typing import Optional
import uuid

@dataclass
class ToDoItem:
    """ToDo item model for Azure SQL Database."""
    id: str
    title: str
    url: str
    order: Optional[int] = None
    completed: Optional[bool] = None
    
    def __init__(self, id: str = None, title: str = "", url: str = "", 
                 order: Optional[int] = None, completed: Optional[bool] = None):
        self.id = id if id is not None else str(uuid.uuid4())
        self.title = title
        self.url = url
        self.order = order
        self.completed = completed
        
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "url": self.url,
            "order": self.order,
            "completed": self.completed
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            id=data.get("id"),
            title=data.get("title", ""),
            url=data.get("url", ""),
            order=data.get("order"),
            completed=data.get("completed")
        )
```

## Files to Remove

- `src/function_app.py` (replace with above)

## Test

```bash
# Insert a row via HTTP trigger
curl -X POST "https://<func>.azurewebsites.net/api/httptriggersqloutput?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"id": "1", "title": "Test", "url": "https://example.com", "completed": false}'
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
