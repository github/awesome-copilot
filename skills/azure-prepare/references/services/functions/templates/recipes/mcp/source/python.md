# Python MCP Tools

Replace the contents of `function_app.py` with this file.

## function_app.py

```python
import azure.functions as func
import logging
import json
from typing import Any

app = func.FunctionApp()

# MCP Tool definitions
MCP_TOOLS = {
    "get_weather": {
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"}
            },
            "required": ["city"]
        }
    },
    "search_docs": {
        "description": "Search documentation for a query",
        "parameters": {
            "type": "object", 
            "properties": {
                "query": {"type": "string", "description": "Search query"}
            },
            "required": ["query"]
        }
    },
    "run_query": {
        "description": "Execute a database query",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SQL query to execute"}
            },
            "required": ["sql"]
        }
    }
}


def handle_tool_call(tool_name: str, arguments: dict) -> Any:
    """Execute a tool and return the result."""
    if tool_name == "get_weather":
        city = arguments.get("city", "Unknown")
        # Demo implementation - replace with actual weather API
        return {"city": city, "temperature": 72, "conditions": "Sunny"}
    
    elif tool_name == "search_docs":
        query = arguments.get("query", "")
        # Demo implementation - replace with actual search
        return {"results": [f"Doc 1 about {query}", f"Doc 2 about {query}"]}
    
    elif tool_name == "run_query":
        sql = arguments.get("sql", "")
        # Demo implementation - replace with actual database query
        return {"rows": [], "message": f"Executed: {sql[:50]}..."}
    
    else:
        raise ValueError(f"Unknown tool: {tool_name}")


@app.route(route="mcp", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def mcp_handler(req: func.HttpRequest) -> func.HttpResponse:
    """
    MCP JSON-RPC handler.
    Supports: tools/list, tools/call
    """
    try:
        body = req.get_json()
        method = body.get("method")
        params = body.get("params", {})
        request_id = body.get("id")
        
        if method == "tools/list":
            # Return list of available tools
            tools = [
                {"name": name, **spec} 
                for name, spec in MCP_TOOLS.items()
            ]
            result = {"tools": tools}
        
        elif method == "tools/call":
            # Execute a tool
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            result = handle_tool_call(tool_name, arguments)
        
        else:
            return func.HttpResponse(
                json.dumps({
                    "jsonrpc": "2.0",
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                    "id": request_id
                }),
                mimetype="application/json",
                status_code=400
            )
        
        return func.HttpResponse(
            json.dumps({
                "jsonrpc": "2.0",
                "result": result,
                "id": request_id
            }),
            mimetype="application/json"
        )
    
    except Exception as e:
        logging.error(f"MCP error: {e}")
        return func.HttpResponse(
            json.dumps({
                "jsonrpc": "2.0",
                "error": {"code": -32603, "message": str(e)},
                "id": None
            }),
            mimetype="application/json",
            status_code=500
        )


@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse(
        json.dumps({
            "status": "healthy",
            "type": "mcp",
            "tools": list(MCP_TOOLS.keys())
        }),
        mimetype="application/json"
    )
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python"
  }
}
```

## Test Commands

List tools:
```bash
curl -X POST "https://<func>.azurewebsites.net/api/mcp?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

Call a tool:
```bash
curl -X POST "https://<func>.azurewebsites.net/api/mcp?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_weather","arguments":{"city":"Seattle"}},"id":2}'
```
