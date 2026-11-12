# Groovy scripting in SAP Cloud Integration

## Script contract

```groovy
import com.sap.gateway.ip.core.customdev.util.Message

def Message processData(Message message) {
    // work on the message
    return message
}
```

- The Script step calls `processData` by default. Another function name can be set in the step's **Script Function** field.
- `messageLogFactory` is available as a binding. Get the log with `messageLogFactory.getMessageLog(message)` and null-check it.
- Shared code belongs in a **Script Collection** that iFlows reference. Do not copy the same script into many iFlows.
- Scripts run concurrently for different messages. Keep them stateless: no static mutable fields and no caching between calls.

## Body access

| Call | Behavior | Use when |
|---|---|---|
| `message.getBody(java.io.Reader)` | Streams the body | Large or unknown-size payloads; line or record processing |
| `message.getBody(java.io.InputStream)` | Streams raw bytes | Binary, or passing the stream on unchanged |
| `message.getBody(String)` | Loads the whole payload into memory as a String | Small payloads only (configuration, tokens, short JSON) |
| `message.setBody(x)` | Accepts String, byte[], or InputStream | Prefer a stream for large output |

For large XML, split with a **General/Iterating Splitter with Streaming enabled** before the script, or parse with StAX. `XmlSlurper` and `XmlParser` both build the whole document in memory.

## Headers and properties

```groovy
def orderId  = message.getHeader('X-Order-Id', String)   // typed header read
def headers  = message.getHeaders()                      // Map, includes Camel* and SAP_* names
def retry    = message.getProperty('retryCount')         // exchange property
message.setHeader('SAP_ApplicationID', orderId)          // searchable in Monitor
message.setProperty('targetSystem', 'S4P')               // stays inside this iFlow run
```

See [headers-properties-expressions.md](headers-properties-expressions.md) for scope rules.

## Message Processing Log (MPL)

```groovy
def log = messageLogFactory.getMessageLog(message)
if (log != null) {
    log.setStringProperty('OrderId', orderId)              // shown in the MPL properties
    log.addCustomHeaderProperty('OrderId', orderId)        // searchable via Custom Header Properties
    if (message.getProperty('logPayload') == 'true') {     // property set from an externalized parameter
        log.addAttachmentAsString('Request', message.getBody(String), 'text/plain')
    }
}
```

- MPL attachments are stored in the tenant database and are kept with the log. Unconditional per-message attachments in high-volume or split flows consume tenant storage and slow processing. Gate them behind a flag that a Content Modifier sets from an externalized parameter (for example `{{LOG_PAYLOAD}}`).
- Never attach or log credentials, tokens, or personal data.
- `addCustomHeaderProperty` is the right tool for values support teams search on (order ID, file name, partner). Use `setStringProperty` for diagnostic detail.

## Security material and value mapping

```groovy
import com.sap.it.api.ITApiFactory
import com.sap.it.api.securestore.SecureStoreService
import com.sap.it.api.securestore.UserCredential
import com.sap.it.api.mapping.ValueMappingApi

def secureStore = ITApiFactory.getService(SecureStoreService.class, null)
UserCredential cred = secureStore.getUserCredential('S4_TECH_USER')   // alias deployed in Security Material
String user = cred.getUsername()
String pwd  = new String(cred.getPassword())                           // char[]; do not log it

def vm = ITApiFactory.getService(ValueMappingApi.class, null)
def target = vm.getMappedValue('S4', 'Plant', '1000', 'WMS', 'Site')   // returns null when no entry exists
```

- Handle a `null` value-mapping result explicitly: fail with a clear message or apply a documented default.
- Credentials come only from deployed Security Material aliases, never from externalized parameters or headers.

## Errors

- Throwing an exception sends the message to the Exception Subprocess, if one is modeled. The text becomes `${exception.message}`.
- Use a clear, actionable message, for example `IllegalStateException("Header X-Order-Id is missing; check the sender Allowed Header(s) setting")`.
- Do not swallow exceptions and return the message unchanged. The MPL then shows Completed for a failed message.

## Avoid

- `System.out.println`. Output does not appear in the MPL; use `messageLog`.
- `Thread.sleep` or polling loops. Use JMS retry or a Timer start instead.
- Outbound HTTP calls from a script. Use a Request-Reply step with a receiver adapter so security material, Cloud Connector, and monitoring apply.
- Building XML or JSON with string concatenation. Use `groovy.xml.MarkupBuilder` / `StreamingMarkupBuilder` or `groovy.json.JsonOutput` / `JsonBuilder`.

## Template: validate a header, set monitoring keys, stream-count records

```groovy
import com.sap.gateway.ip.core.customdev.util.Message

def Message processData(Message message) {
    String orderId = message.getHeader('X-Order-Id', String)?.trim()
    if (!orderId) {
        throw new IllegalArgumentException("Required header 'X-Order-Id' is missing or blank.")
    }
    message.setHeader('SAP_ApplicationID', orderId)

    int lines = 0
    message.getBody(java.io.Reader).withReader { r -> r.eachLine { lines++ } }  // stream; no full load
    message.setProperty('recordCount', lines)

    def log = messageLogFactory.getMessageLog(message)
    if (log != null) {
        log.addCustomHeaderProperty('OrderId', orderId)
        log.setStringProperty('RecordCount', lines.toString())
    }
    return message
}
```

Reading the Reader consumes it. If later steps need the body, make sure the runtime can read it again: test with a payload in trace mode. If it cannot, collect the content while streaming and set the body again.
