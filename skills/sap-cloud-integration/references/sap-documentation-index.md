# SAP documentation index

Use these pages to confirm details, quote SAP's wording, or give the user a source. **When you give the user a link, use a public SAP page**: the SAP Help Portal, SAP Business Accelerator Hub, or SAP Architecture Center links below, or another official SAP site. Do not link the GitHub Markdown source. The links in *Cloud Integration pages behind this skill* use each page's stable SAP topic ID, the same form SAP uses in its own cross-references; the entry points are top-level pages.

## Entry points

| Source | Use for |
|---|---|
| [SAP Integration Suite documentation](https://help.sap.com/docs/integration-suite) | Official documentation for all capabilities |
| [What is SAP Integration Suite](https://help.sap.com/docs/integration-suite/sap-integration-suite/what-is-sap-integration-suite) | Capability overview and terminology |
| [SAP-docs/btp-integration-suite](https://github.com/SAP-docs/btp-integration-suite) | Markdown source of the Help Portal, for searching the text only (for example with the `web` tool); link users to the Help Portal page instead |
| [SAP Business Accelerator Hub: integrations](https://api.sap.com/integrations/discoverintegrations) | Prepackaged integration content to reuse or extend before building from scratch |
| [SAP Architecture Center](https://architecture.learning.sap.com/) | Reference architectures for SAP BTP and integration patterns |

## Cloud Integration pages behind this skill

| Topic | SAP page |
|---|---|
| Header vs. exchange property scope, header size limits | [About Headers and Exchange Properties](https://help.sap.com/docs/integration-suite/sap-integration-suite/about-headers-and-exchange-properties-0974c4f3c9304694a66bcb77dc275c64) |
| Headers and properties set by the runtime (`SAP_*`, `Camel*`, `SAPJMSRetries`) | [Headers and Exchange Properties Provided by the Integration Framework](https://help.sap.com/docs/integration-suite/sap-integration-suite/headers-and-exchange-properties-provided-by-the-integration-framework-d0fcb0988f034e889f611c6e36d43ad5) |
| Allowed Header(s), log level | [Specify the Runtime Configuration](https://help.sap.com/docs/integration-suite/sap-integration-suite/specify-the-runtime-configuration-0c1c96e50ff340869090469d260976f3) |
| Exception Subprocess with End event (Completed + custom status) | [Variant: Exception Subprocess with End Event](https://help.sap.com/docs/integration-suite/sap-integration-suite/variant-exception-subprocess-with-end-event-5f7b1c7c00f54339bc039ecd3c398a32) |
| Exception Subprocess with Error End event (Failed) | [Variant: Exception Subprocess with Error End Event](https://help.sap.com/docs/integration-suite/sap-integration-suite/variant-exception-subprocess-with-error-end-event-35262c9e300f4592b54b66db60ac5232) |
| Exception Subprocess with Escalation End event (Escalated) | [Variant: Exception Subprocess with Escalation End Event](https://help.sap.com/docs/integration-suite/sap-integration-suite/variant-exception-subprocess-with-escalation-end-event-5649cde1d7e549bbb22a4869b1ac0ab2) |
| HTTP receiver error details in a script | [Script Example for Exception Handling in HTTP Receiver](https://help.sap.com/docs/integration-suite/sap-integration-suite/script-example-for-exception-handling-in-http-receiver-a443efe1d5d2403fb95ee9def1a672d4) |
| OData V2 receiver error details in a script | [Script Example for Exception Handling in OData V2 Receiver Adapter](https://help.sap.com/docs/integration-suite/sap-integration-suite/script-example-for-exception-handling-in-odata-v2-receiver-adapter-361c5e87ffff45aea5b23c67c8e02189) |
| HTTP receiver *Request Headers* | [HTTP Receiver Adapter](https://help.sap.com/docs/integration-suite/sap-integration-suite/http-receiver-adapter-2da452effb764b3bb28f8e0a2f5bd480) |
| JMS receiver, *Transfer Exchange Properties* | [Configure the JMS Receiver Adapter](https://help.sap.com/docs/integration-suite/sap-integration-suite/configure-the-jms-receiver-adapter-79edc04c91574a6bb8c15ae3e1a27b03) |
| JMS sender retry, `SAPJMSRetries` | [Configure the JMS Sender Adapter](https://help.sap.com/docs/integration-suite/sap-integration-suite/configure-the-jms-sender-adapter-161791b8cb98485ba00d81efa4197a49) |
| JMS queue, size, and header limits | [JMS Resource Limits and Optimizing their Usage](https://help.sap.com/docs/integration-suite/sap-integration-suite/jms-resource-limits-and-optimizing-their-usage-4857054e3f194ae6a7ed93a52002d556) |
| Which side retries: sender vs. Cloud Integration | [Sender Handles Retry](https://help.sap.com/docs/integration-suite/sap-integration-suite/sender-handles-retry-48b120a03f524f9d9f4d497f392b46da), [SAP Integration Suite Handles Retry](https://help.sap.com/docs/integration-suite/sap-integration-suite/sap-integration-suite-handles-retry-035a1c917b6149558c3d03f7d02d7b55) |
| Retry and timeouts for synchronous HTTP senders; receiver adapter connection retries | [Apply the Retry Pattern in the Sender Applications](https://help.sap.com/docs/integration-suite/sap-integration-suite/apply-the-retry-pattern-in-the-sender-applications-0e27ac963308474f941436565d76de6b) |
| Transaction Handling options and defaults | [Define Transaction Handling](https://help.sap.com/docs/integration-suite/sap-integration-suite/define-transaction-handling-2a5d4bc3b5da46df84b26ac96450587b), [Define Proper Transaction Handling](https://help.sap.com/docs/integration-suite/sap-integration-suite/define-proper-transaction-handling-1c3196315d5a46a293d350b73dc2ccd5) |
| JMS transaction started by the JMS sender; JDBC/JMS combination risks | [Transaction Handling Characteristics and Restrictions](https://help.sap.com/docs/integration-suite/sap-integration-suite/transaction-handling-characteristics-and-restrictions-2388efb12dfd4c6ca2473e8c7c730efc), [Transaction Handling Guidelines](https://help.sap.com/docs/integration-suite/sap-integration-suite/transaction-handling-guidelines-52e3f6760a4c46f7a423c43cf5656d75) |
| Data store vs. variables vs. JMS | [Data Storages](https://help.sap.com/docs/integration-suite/sap-integration-suite/data-storages-31efe35bdf65422a8df18a08c4e4160f) |
| Idempotent Process Call | [Define Idempotent Process Call](https://help.sap.com/docs/integration-suite/sap-integration-suite/define-idempotent-process-call-84c85d753dcd4400a440fb1915899b72) |
| Duplicate risk when the receiver is not idempotent (at least once) | [Receiver Isn't Idempotent](https://help.sap.com/docs/integration-suite/sap-integration-suite/receiver-isn-t-idempotent-5955d3fa4f0944609454faa291d85694) |
| OData V2 batch requests (XML `batchParts` body) | [Perform OData Batch Requests](https://help.sap.com/docs/integration-suite/sap-integration-suite/perform-odata-batch-requests-b0372d4d1c0745cbadadbfb6b094ea51), [Configure the OData V2 Receiver Adapter](https://help.sap.com/docs/integration-suite/sap-integration-suite/configure-the-odata-v2-receiver-adapter-c5c2e38e0c87472e996dfda04920bfc4) |
| MPL properties, attachments, custom header properties | [Add Information to the Message Processing Log](https://help.sap.com/docs/integration-suite/sap-integration-suite/add-information-to-the-message-processing-log-e8e928373b66488b8d78fb5a314b8a9e) |
| Message API in scripts (`getBodySize()`, OOM warning for String conversion) | [Read and Modify Message Header, Message Body, and Exchange Properties](https://help.sap.com/docs/integration-suite/sap-integration-suite/read-and-modify-message-header-message-body-and-exchange-properties-5822f320823040af915c54a379463547) |
| MPL attachment limit (1 GB per 24 hours) | [Message Processing Log Text View](https://help.sap.com/docs/integration-suite/sap-integration-suite/message-processing-log-text-view-718309ae651b452ea750b3abe2297a7b) |
| Script guidelines | [General Scripting Guidelines](https://help.sap.com/docs/integration-suite/sap-integration-suite/general-scripting-guidelines-fcbf0f20059a4ffba7dfda7d28830ccd) |
| Value mapping from scripts | [Access Value Mappings in Scripts](https://help.sap.com/docs/integration-suite/sap-integration-suite/access-value-mappings-in-scripts-12536ee29f7547bf9fb177b4350309b4) |
| SSH connectivity test, host keys | [SSH Connectivity Tests](https://help.sap.com/docs/integration-suite/sap-integration-suite/ssh-connectivity-tests-da7dfd0f1fce401d99bca63e2de5bde1) |
| TLS connectivity test, server certificate chain, *Add to keystore* | [TLS Connectivity Tests](https://help.sap.com/docs/integration-suite/sap-integration-suite/tls-connectivity-tests-03bbb5da16854f5aaf4ad4a26014c8a7) |
| Adapter error catalog (incl. `SAP_DisableMonitoringHeaders`) | [Troubleshooting Adapters](https://help.sap.com/docs/integration-suite/sap-integration-suite/troubleshooting-adapters-b7a3906a083f44da86fde70e81d7bb97) |
| HTTP status error catalog with SAP Notes | [Troubleshooting HTTP Error Catalog](https://help.sap.com/docs/integration-suite/sap-integration-suite/troubleshooting-http-error-catalog-069b461074a14d7b8cb2e2e273ac67db) |
