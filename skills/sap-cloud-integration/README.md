# sap-cloud-integration skill

CPI runtime knowledge for GitHub Copilot: Groovy script API usage, header and property scope across JMS and ProcessDirect, Exception Subprocess status behavior, JMS retry and idempotency patterns, and an MPL-error-to-root-cause map for SFTP, HTTP/OAuth, IDoc, OData, SOAP, AS2, and Cloud Connector.

## Install

Copy the whole `sap-cloud-integration` folder, including `references/`, into your project's `.github/skills/` folder or your personal skills folder. Copilot loads `SKILL.md` when a request matches its description and reads the references it routes to.

## Provenance and maintenance

- Written and reviewed by Rameshkumar Varanganti, SAP integration architect (20+ years with SAP PI/PO and SAP Integration Suite).
- Baseline: SAP Cloud Integration on the Cloud Foundry environment (Integration Suite), current as of November 2026. Neo-environment differences are not covered.
- Each behavior claim is cross-checked against the SAP Help Portal source in [SAP-docs/btp-integration-suite](https://github.com/SAP-docs/btp-integration-suite); see [references/sap-documentation-index.md](references/sap-documentation-index.md). Report corrections as issues in the source repository.

## Evaluation scenarios

Each scenario compares a capable model without this skill against the same model with it. "Skill-specific" means the point comes from CPI runtime behavior documented in `references/`, not from general engineering practice.

| # | Prompt | Skill-specific points the answer must contain |
|---|---|---|
| 1 | "My Exception Subprocess catches the HTTP error, builds an error JSON, and ends with an End event. Support says failed messages don't show up as failed. Why?" | A Message End event in the Exception Subprocess makes the MPL status Completed; use Error or Escalation End; set `CamelHttpResponseCode` for a synchronous caller |
| 2 | "iFlow A sets property `targetSystem`, then sends to iFlow B over JMS. In B the property is empty. Fix it." | Properties are not propagated over ProcessDirect and are not stored in JMS unless *Transfer Exchange Properties* is on (not recommended; 4 MB limit for headers plus properties); pass as a header or in the body |
| 3 | "Write a Groovy script that logs the full payload for every message to the MPL." | Gate the attachment with an externalized `LOG_PAYLOAD` flag and cap it with `getBodySize()`; 1 GB/24 h tenant attachment limit; `addCustomHeaderProperty` for searchable keys; no secrets or PII |
| 4 | "IDoc from CPI to S/4HANA arrives with status 56." | Start from the status long text; control record vs. WE20 as the most common cause; 56 vs. 51 distinction |
| 5 | "In the Exception Subprocess I need the receiver's HTTP status and error body." | `CamelExceptionCaught`; `AhcOperationFailedException` with `getStatusCode()` / `getResponseBody()`; compare by class name |
