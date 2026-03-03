# Python — Azure Functions v2 Triggers & Bindings

> **Model**: Python v2 programming model. **NO** `function.json` files.
> Entry point: `function_app.py`
> Import: `import azure.functions as func`

## Lambda Migration Rules

> Shared rules (bindings over SDKs, latest runtime, identity-first auth) → [global-rules.md](../global-rules.md)

Python-specific: all functions use the v2 decorator model shown throughout this file. No additional migration rules beyond global.

## HTTP Trigger

```python
@app.route(route="hello", methods=["GET", "POST"], auth_level=func.AuthLevel.ANONYMOUS)
def http_function(req: func.HttpRequest) -> func.HttpResponse:
    name = req.params.get('name') or req.get_body().decode()
    return func.HttpResponse(f"Hello, {name}!")
```

## Blob Storage

```python
# Trigger (use EventGrid source)
@app.blob_trigger(arg_name="myblob", path="samples-workitems/{name}",
                  connection="AzureWebJobsStorage", source="EventGrid")
def blob_trigger(myblob: func.InputStream):
    logging.info(f"Blob: {myblob.name}, Size: {myblob.length}")

# Input
@app.blob_input(arg_name="inputblob", path="input/{name}", connection="AzureWebJobsStorage")

# Output
@app.blob_output(arg_name="outputblob", path="output/{name}", connection="AzureWebJobsStorage")
```

## Queue Storage

```python
# Trigger
@app.queue_trigger(arg_name="msg", queue_name="myqueue-items",
                   connection="AzureWebJobsStorage")
def queue_trigger(msg: func.QueueMessage):
    logging.info(f"Queue message: {msg.get_body().decode()}")

# Output
@app.queue_output(arg_name="outputmsg", queue_name="outqueue",
                  connection="AzureWebJobsStorage")
```

## Timer

```python
@app.timer_trigger(schedule="0 */5 * * * *", arg_name="mytimer",
                   run_on_startup=False)
def timer_function(mytimer: func.TimerRequest):
    logging.info("Timer triggered")
```

## Event Grid

```python
# Trigger
@app.event_grid_trigger(arg_name="event")
def eventgrid_trigger(event: func.EventGridEvent):
    logging.info(f"Event: {event.subject} - {event.event_type}")

# Output
@app.event_grid_output(arg_name="outputEvent",
                       topic_endpoint_uri="MyEventGridTopicUriSetting",
                       topic_key_setting="MyEventGridTopicKeySetting")
```

## Cosmos DB

```python
# Trigger (Change Feed)
@app.cosmos_db_trigger_v3(arg_name="documents",
                          connection="CosmosDBConnection",
                          database_name="mydb",
                          container_name="mycontainer",
                          create_lease_container_if_not_exists=True)
def cosmosdb_trigger(documents: func.DocumentList):
    for doc in documents:
        logging.info(f"Changed doc: {doc['id']}")

# Input
@app.cosmos_db_input(arg_name="doc", connection="CosmosDBConnection",
                     database_name="mydb", container_name="mycontainer",
                     id="{id}", partition_key="{partitionKey}")

# Output
@app.cosmos_db_output(arg_name="newdoc", connection="CosmosDBConnection",
                      database_name="mydb", container_name="mycontainer")
```

## Service Bus

```python
# Queue Trigger
@app.service_bus_queue_trigger(arg_name="msg", queue_name="myqueue",
                               connection="ServiceBusConnection")
def sb_queue_trigger(msg: func.ServiceBusMessage):
    logging.info(f"Message: {msg.get_body().decode()}")

# Topic Trigger
@app.service_bus_topic_trigger(arg_name="msg", topic_name="mytopic",
                                subscription_name="mysubscription",
                                connection="ServiceBusConnection")
def sb_topic_trigger(msg: func.ServiceBusMessage):
    logging.info(f"Topic message: {msg.get_body().decode()}")

# Output
@app.service_bus_queue_output(arg_name="outmsg", queue_name="outqueue",
                              connection="ServiceBusConnection")
```

## Event Hubs

```python
# Trigger
@app.event_hub_message_trigger(arg_name="event", event_hub_name="myeventhub",
                                connection="EventHubConnection",
                                cardinality="many")
def eventhub_trigger(event: func.EventHubEvent):
    logging.info(f"Event: {event.get_body().decode()}")

# Output
@app.event_hub_output(arg_name="outevent", event_hub_name="outeventhub",
                      connection="EventHubConnection")
```

## Table Storage

```python
# Input
@app.table_input(arg_name="tableEntity", table_name="mytable",
                 partition_key="{partitionKey}", row_key="{rowKey}",
                 connection="AzureWebJobsStorage")

# Output
@app.table_output(arg_name="tableOut", table_name="mytable",
                  connection="AzureWebJobsStorage")
```

## SQL

```python
# Trigger
@app.sql_trigger(arg_name="changes", table_name="dbo.MyTable",
                 connection_string_setting="SqlConnection")
def sql_trigger(changes: func.SqlRowList):
    for change in changes:
        logging.info(f"Change: {change}")

# Input
@app.sql_input(arg_name="items",
               command_text="SELECT * FROM dbo.MyTable WHERE Id = @Id",
               command_type="Text", parameters="@Id={id}",
               connection_string_setting="SqlConnection")

# Output
@app.sql_output(arg_name="newitem", command_text="dbo.MyTable",
                connection_string_setting="SqlConnection")
```

## SignalR

```python
@app.generic_output_binding(arg_name="signalr", type="signalR",
                             hub_name="myhub",
                             connection_string_setting="AzureSignalRConnectionString")
```

## SendGrid

```python
@app.generic_output_binding(arg_name="mail", type="sendGrid",
                             api_key="SendGridApiKey",
                             from_address="noreply@example.com")
```

## Combining Decorators

```python
@app.route(route="process", methods=["POST"])
@app.cosmos_db_input(arg_name="doc", connection="CosmosDBConnection",
                     database_name="mydb", container_name="mycontainer",
                     id="{id}", partition_key="{pk}")
@app.queue_output(arg_name="outmsg", queue_name="outqueue",
                  connection="AzureWebJobsStorage")
def process_item(req: func.HttpRequest, doc: func.DocumentList,
                 outmsg: func.Out[str]) -> func.HttpResponse:
    outmsg.set(doc[0].to_json())
    return func.HttpResponse("Processed")
```

> Full reference: [Azure Functions Python developer guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
