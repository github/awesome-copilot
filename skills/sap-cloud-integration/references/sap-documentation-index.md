# SAP documentation index

Use these pages to confirm details, quote SAP's wording, or give the user a source. Each GitHub link is the Markdown source of the matching SAP Help Portal page. The Help Portal URL usually follows the pattern `https://help.sap.com/docs/integration-suite/sap-integration-suite/<file name without the trailing hash>`.

## Entry points

| Source | Use for |
|---|---|
| [SAP Integration Suite documentation](https://help.sap.com/docs/integration-suite) | Official documentation for all capabilities |
| [What is SAP Integration Suite](https://help.sap.com/docs/integration-suite/sap-integration-suite/what-is-sap-integration-suite) | Capability overview and terminology |
| [SAP-docs/btp-integration-suite](https://github.com/SAP-docs/btp-integration-suite) | Searchable Markdown source; `docs/ISuite_Integrations_APIs/` covers Cloud Integration |
| [SAP Business Accelerator Hub: integrations](https://api.sap.com/integrations/discoverintegrations) | Prepackaged integration content to reuse or extend before building from scratch |
| [SAP Architecture Center](https://github.com/SAP/architecture-center) | Reference architectures for SAP BTP and integration patterns |

## Cloud Integration pages behind this skill

| Topic | SAP page |
|---|---|
| Header vs. exchange property scope, header size limits | [About Headers and Exchange Properties](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/about-headers-and-exchange-properties-0974c4f.md) |
| Headers and properties set by the runtime (`SAP_*`, `Camel*`, `SAPJMSRetries`) | [Headers and Exchange Properties Provided by the Integration Framework](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/headers-and-exchange-properties-provided-by-the-integration-framework-d0fcb09.md) |
| Allowed Header(s), log level | [Specify the Runtime Configuration](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/specify-the-runtime-configuration-0c1c96e.md) |
| Exception Subprocess with End event (Completed + custom status) | [Variant: Exception Subprocess with End Event](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/variant-exception-subprocess-with-end-event-5f7b1c7.md) |
| Exception Subprocess with Error End event (Failed) | [Variant: Exception Subprocess with Error End Event](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/variant-exception-subprocess-with-error-end-event-35262c9.md) |
| Exception Subprocess with Escalation End event (Escalated) | [Variant: Exception Subprocess with Escalation End Event](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/variant-exception-subprocess-with-escalation-end-event-5649cde.md) |
| HTTP receiver error details in a script | [Script Example for Exception Handling in HTTP Receiver](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/script-example-for-exception-handling-in-http-receiver-a443efe.md) |
| OData V2 receiver error details in a script | [Script Example for Exception Handling in OData V2 Receiver Adapter](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/script-example-for-exception-handling-in-odata-v2-receiver-adapter-361c5e8.md) |
| HTTP receiver *Request Headers* | [HTTP Receiver Adapter](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/http-receiver-adapter-2da452e.md) |
| JMS receiver, *Transfer Exchange Properties* | [Configure the JMS Receiver Adapter](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/configure-the-jms-receiver-adapter-79edc04.md) |
| JMS sender retry, `SAPJMSRetries` | [Configure the JMS Sender Adapter](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/configure-the-jms-sender-adapter-161791b.md) |
| JMS queue, size, and header limits | [JMS Resource Limits and Optimizing their Usage](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/jms-resource-limits-and-optimizing-their-usage-4857054.md) |
| Data store vs. variables vs. JMS | [Data Storages](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/data-storages-31efe35.md) |
| Idempotent Process Call | [Define Idempotent Process Call](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/define-idempotent-process-call-84c85d7.md) |
| MPL properties, attachments, custom header properties | [Add Information to the Message Processing Log](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/add-information-to-the-message-processing-log-e8e9283.md) |
| Script guidelines | [General Scripting Guidelines](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/general-scripting-guidelines-fcbf0f2.md) |
| Value mapping from scripts | [Access Value Mappings in Scripts](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/access-value-mappings-in-scripts-12536ee.md) |
| SSH connectivity test, host keys | [SSH Connectivity Tests](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/ssh-connectivity-tests-da7dfd0.md) |
| Adapter error catalog (incl. `SAP_DisableMonitoringHeaders`) | [Troubleshooting Adapters](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/troubleshooting-adapters-b7a3906.md) |
| HTTP status error catalog with SAP Notes | [Troubleshooting HTTP Error Catalog](https://github.com/SAP-docs/btp-integration-suite/blob/main/docs/ISuite_Integrations_APIs/troubleshooting-http-error-catalog-069b461.md) |
