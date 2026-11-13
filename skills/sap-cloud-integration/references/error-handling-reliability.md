# Error handling and reliable delivery

## Exception Subprocess and monitored status

| How the Exception Subprocess ends | Status in Monitor | Synchronous sender receives |
|---|---|---|
| End (Message End) event | **Completed** | The current body, with HTTP 200 unless `CamelHttpResponseCode` is set |
| Error End event | **Failed** | An error response |
| Escalation End event | **Escalated** | An error response |
| No Exception Subprocess | **Failed** | An error response containing the exception |

Rules:

- Ending with an End event after "handling" an error makes the message Completed in monitoring. If you choose this deliberately (for example, to return a custom error to the caller), set the exchange property `SAP_MessageProcessingLogCustomStatus` (for example `LowPrio`) so support can filter these messages by **Custom Status**. Otherwise end with Error End or Escalation End.
- For a synchronous HTTP sender that must return a business error, build the error body, set `CamelHttpResponseCode` (for example 400, 422, or 502), and decide deliberately which End event to use.
- Inspect the cause in a script through `message.getProperty('CamelExceptionCaught')`:

```groovy
def ex = message.getProperty('CamelExceptionCaught')
if (ex?.getClass()?.getCanonicalName() == 'org.apache.camel.component.ahc.AhcOperationFailedException') {
    message.setProperty('httpStatus', ex.getStatusCode())
    message.setProperty('httpStatusText', ex.getStatusText())
    message.setProperty('httpErrorBody', ex.getResponseBody())   // the receiver's error payload
}
```

  - HTTP receiver failures surface as `AhcOperationFailedException`, which carries the status code and response body.
  - OData V2 receiver failures surface as `com.sap.gateway.core.ip.component.odata.exception.OsciException`. `ex.getRequestUri()` gives the failing request, and the service's error payload is in the message body inside the subprocess.
  - Compare by class name, as shown, which is also how SAP's own script examples do it. Importing adapter-internal classes can break when the runtime is updated.

## Delivery guarantees

| Need | Pattern |
|---|---|
| Caller waits for the result | Synchronous Request-Reply. The message is not persisted for redelivery: if processing fails, the caller gets an error and must retry (SAP: *Sender Handles Retry*), so the receiver call must be safe to repeat. Some receiver adapters retry the connection within the same call; the flow keeps its worker resources until a response arrives or those retries are exhausted, so keep sender timeouts longer than the total receiver retry time. |
| Fire-and-forget with retry | iFlow A: sender → **JMS receiver** (queue), returns immediately. iFlow B: **JMS sender** → processing → receiver. The JMS sender retries failed messages. |
| Skip reprocessing of messages already processed successfully | **Idempotent Process Call** around the receiver call, with a stable business key as Message ID (`${header.SAP_ApplicationID}` or a payload key). It records **successful** processing and skips (or flags) later duplicates with the same ID. |
| Hold data between runs or for later reprocessing | **Data Store** Write/Get/Select/Delete with an explicit Entry ID |

**Limit of the Idempotent Process Call.** It cannot guarantee duplicate-free effects at a receiver that is not idempotent. If the receiver commits but its response or acknowledgment is lost, CPI records no success, and the retry calls the receiver again. SAP describes the resulting quality of service as *at least once*. For true no-duplicate behavior, the receiver must detect duplicates itself (for example by a unique business key or message ID it stores), or you must reconcile with the receiver before retrying an uncertain outcome.

## JMS retry details

- On the JMS sender, configure the retry interval, exponential backoff, and maximum retry interval. Without a stop condition, a permanently failing message retries until it expires.
- The JMS sender cannot be configured to stop after a fixed number of retries. For *Non-Exclusive* queues, it sets `SAPJMSRetries`. Add an Exception Subprocess that calls a Local Integration Process which checks `${header.SAPJMSRetries} > 'N'`. After N attempts it writes the message to a data store or an error queue, raises an alert, and ends successfully, so the queue drains. (For the XI adapter with a data store, use `SAP_DataStoreRetries`.)
- Reading from a queue with the JMS sender starts a JMS transaction automatically; a failed message stays in the queue and is retried. You do not need *Required for JMS* for that.
- Set **Transaction Handling = Required for JMS** when the process **writes** to JMS queues (JMS receiver) and those writes must commit or roll back together, for example JMS sends after a Splitter or in a reusable subprocess. Since Integration Process version 1.2, the default is *Not Required*.
- Do not expect JDBC (data store) and JMS work to commit atomically together. If one commits and the other fails, the message is retried and can be duplicated (SAP *Transaction Handling Guidelines*).
- Queues and JMS storage are limited per tenant, and the limits depend on the service plan. Check **Monitor → Manage Stores → Message Queues** before adding queues. Delete unused queues.
- Use the **Dead-Letter Queue** option for poison messages that crash processing, so they do not block the queue. Then monitor and reprocess them from Manage Stores.

## Data store details

- Data stores live in the tenant database. Keep entries small, give them a deterministic Entry ID, and delete them after successful processing.
- On **Write**, set the expiration period and alerting threshold deliberately. Do not rely on defaults for business data.
- **Overwrite Existing Message** must be enabled when the same Entry ID can be written again. Otherwise the second write fails.
- A Global data store is visible to all iFlows on the tenant. A Local one is visible only to the iFlow that wrote it.

## Monitoring

- Set `SAP_ApplicationID` and custom header properties so support can find messages by business key.
- Trace log level expires after 10 minutes by default and switches back to the previous level. Enable it to reproduce one problem. Do not leave Debug on for high-volume flows.
- Route alerts through SAP Alert Notification service or SAP Cloud ALM rather than custom email steps in every iFlow.
