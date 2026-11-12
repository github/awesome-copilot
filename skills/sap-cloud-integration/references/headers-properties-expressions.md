# Headers, exchange properties, and expressions

## Scope: what survives where

| Crossing | Headers | Exchange properties | Body |
|---|---|---|---|
| Steps inside one integration process | Yes | Yes | Yes |
| Local Integration Process call | Yes | Yes | Yes |
| ProcessDirect (iFlow → iFlow) | Yes | **No** (only `SAP_SAPPASSPORT` is propagated) | Yes |
| JMS receiver → queue → JMS sender | Yes, simple-typed values only (strings, primitives) | **No**, unless *Transfer Exchange Properties* is selected on the JMS receiver. SAP does not recommend it. | Yes |
| HTTP receiver adapter | **No custom headers by default.** Only the headers listed in *Request Headers* (pipe-separated, or `*` for all) | Never | Yes |
| Sender adapter → iFlow | Only headers listed in *Runtime Configuration → Allowed Header(s)* (plus adapter-specific ones) | n/a | Yes |

Consequences:

- Pass values a downstream iFlow needs (after ProcessDirect or JMS) as headers or in the body. Rebuild properties after the hop.
- Headers and exchange properties saved to a JMS queue must not exceed **4 MB in total**. Keep large values in the body or a data store.
- HTTP-based receivers can reject calls with large headers; the limit typically ranges from 4 to 16 KB depending on the receiver. Delete headers that should not go out with a Content Modifier before the receiver call.
- An HTTP header from a sender that "disappears" is usually missing from *Allowed Header(s)*. SAP warns against `*` there, because the iFlow then processes headers you do not control.
- Keep secrets out of headers. Headers can leave the tenant through receiver adapters.
- An HTTP receiver that returns **400** for no obvious reason may be rejecting the SAP monitoring headers the runtime adds. Set the exchange property `SAP_DisableMonitoringHeaders` to `true` in a Content Modifier right before the call.

## Names the runtime reads or sets

| Name | Type | Purpose |
|---|---|---|
| `SAP_ApplicationID` | Header | Business key shown as **Application Message ID** and searchable in Monitor |
| `SAP_Sender`, `SAP_Receiver`, `SAP_MessageType` | Header | Shown in the MPL; filterable in monitoring |
| `SAP_MessageProcessingLogCustomStatus` | Property | Custom status text displayed for the message in Monitor |
| `CamelHttpResponseCode` | Header | Status returned by an HTTP receiver call. On a synchronous HTTP sender, set it to control the status code returned to the caller |
| `CamelHttpUri`, `CamelHttpPath`, `CamelHttpQuery`, `CamelHttpMethod` | Header | Request details on HTTP sender; dynamic target overrides on receiver. The URL actually called appears in the MPL property `RealDestinationUrl` |
| `Content-Type` | Header | Media type sent by HTTP-based receivers |
| `CamelFileName` | Header | File name on SFTP/File sender; target file name on SFTP receiver when set |
| `CamelExceptionCaught` | Property | The exception object inside an Exception Subprocess |
| `CamelSplitIndex`, `CamelSplitSize`, `CamelSplitComplete` | Property | Position within a splitter run |
| `SAPJMSRetries` | Header | Retry count set by the JMS sender, for *Non-Exclusive* queues only |
| `SAP_DataStoreRetries` | Header | Retry count when the XI adapter uses a data store as temporary storage |

Confirm the exact semantics of any name not listed here in the SAP Help Portal before relying on it.

## Simple expressions (Content Modifier, Router, adapter fields)

| Expression | Meaning |
|---|---|
| `${header.Name}` | Header value |
| `${property.Name}` | Exchange property value |
| `${in.body}` | Current body (loads it into memory; avoid for large payloads) |
| `${date:now:yyyy-MM-dd'T'HH:mm:ss}` | Current timestamp, Java date format |
| `${exception.message}`, `${exception.stacktrace}` | Inside an Exception Subprocess |
| `{{PARAM}}` | Externalized parameter, resolved at deployment |

- Router conditions use either XML (XPath) or Non-XML (Simple) syntax, chosen per Router step. Do not mix them.
- In a Content Modifier, a value of type **XPath** needs a **Data Type** (for example `java.lang.String`). Namespaced XPath needs the prefix declared in the iFlow's **Namespace Mapping** runtime property.
- Externalize anything that differs per environment: URLs, aliases, directories, flags such as `LOG_PAYLOAD`. Keep the iFlow transportable.
