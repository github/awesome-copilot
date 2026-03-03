# Python Durable Functions

Replace the contents of `function_app.py` with this file and add the durable-functions package.

## function_app.py

```python
import azure.functions as func
import azure.durable_functions as df
import logging
import json

# IMPORTANT: Use df.DFApp() for Durable Functions, NOT func.FunctionApp()
app = df.DFApp()

# Durable Functions client for HTTP endpoints
@app.route(route="orchestrators/{name}", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
@app.durable_client_input(client_name="client")
async def http_start(req: func.HttpRequest, client: df.DurableOrchestrationClient) -> func.HttpResponse:
    """HTTP endpoint to start an orchestration."""
    function_name = req.route_params.get("name", "hello_orchestrator")
    
    # Get input from request body
    try:
        input_data = req.get_json() if req.get_body() else None
    except:
        input_data = None
    
    instance_id = await client.start_new(function_name, client_input=input_data)
    logging.info(f"Started orchestration with ID = '{instance_id}'")
    
    return client.create_check_status_response(req, instance_id)


@app.route(route="status/{instanceId}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
@app.durable_client_input(client_name="client")
async def get_status(req: func.HttpRequest, client: df.DurableOrchestrationClient) -> func.HttpResponse:
    """Get orchestration status."""
    instance_id = req.route_params.get("instanceId")
    status = await client.get_status(instance_id)
    
    return func.HttpResponse(
        json.dumps({
            "instanceId": status.instance_id,
            "runtimeStatus": status.runtime_status.name if status.runtime_status else None,
            "output": status.output,
            "createdTime": str(status.created_time) if status.created_time else None,
            "lastUpdatedTime": str(status.last_updated_time) if status.last_updated_time else None
        }),
        mimetype="application/json"
    )


# Orchestrator function - coordinates the workflow
@app.orchestration_trigger(context_name="context")
def hello_orchestrator(context: df.DurableOrchestrationContext):
    """
    Fan-out/Fan-in orchestration pattern.
    Calls multiple activities in parallel and aggregates results.
    """
    # Get input (optional)
    input_data = context.get_input() or {}
    
    # Fan-out: Call activities in parallel
    tasks = [
        context.call_activity("say_hello", "Tokyo"),
        context.call_activity("say_hello", "Seattle"),
        context.call_activity("say_hello", "London"),
    ]
    
    # Fan-in: Wait for all tasks to complete
    results = yield context.task_all(tasks)
    
    return results


# Activity function - individual work unit
@app.activity_trigger(input_name="city")
def say_hello(city: str) -> str:
    """Activity function that performs a single task."""
    logging.info(f"Processing: {city}")
    return f"Hello, {city}!"


# Health check endpoint
@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse(
        '{"status": "healthy", "type": "durable"}',
        mimetype="application/json"
    )
```

## requirements.txt additions

```
azure-functions
azure-functions-durable>=1.2.0
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

## Usage

Start an orchestration:
```bash
curl -X POST "https://<func>.azurewebsites.net/api/orchestrators/hello_orchestrator"
```

Check status:
```bash
curl "https://<func>.azurewebsites.net/api/status/<instanceId>"
```
