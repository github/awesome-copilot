---
name: sap-cloud-integration
description: 'SAP Cloud Integration (CPI, part of SAP Integration Suite) runtime-specific guidance for building and troubleshooting iFlows. Use when writing or reviewing CPI Groovy scripts, choosing headers vs. exchange properties, designing exception subprocesses, JMS retry, idempotency or data store patterns, or diagnosing adapter errors (SFTP, HTTP/OAuth, SOAP, IDoc, OData, AS2, Cloud Connector) from Message Processing Log (MPL) text. Not for SAP PI/PO, ABAP development, or generic Java/Groovy outside CPI.'
---

# SAP Cloud Integration (CPI)

This skill supplies CPI runtime behavior that general models often get wrong: what survives a JMS or ProcessDirect hop, how End events change the monitored status, which Camel and `SAP_` headers the runtime reads, how scripts should touch large payloads, and how specific adapter error texts map to root causes.

## Required references

Read the matching reference before answering. Resolve paths relative to this file.

| Task | Read first |
|---|---|
| Write, review, or optimize a Groovy script | [references/groovy-scripting.md](references/groovy-scripting.md) |
| Decide header vs. property, write Simple expressions, use `SAP_`/`Camel` names | [references/headers-properties-expressions.md](references/headers-properties-expressions.md) |
| Exception subprocess, End events, retry, JMS, idempotency, data store | [references/error-handling-reliability.md](references/error-handling-reliability.md) |
| Diagnose an MPL error or adapter failure | [references/adapter-troubleshooting.md](references/adapter-troubleshooting.md) |
| Need SAP's own wording, a field not covered here, or a source link for the user | [references/sap-documentation-index.md](references/sap-documentation-index.md) |

## Rules that change the answer

1. **Exchange properties stay inside one iFlow.** They are not propagated over ProcessDirect. They are not stored in a JMS queue unless the JMS receiver's *Transfer Exchange Properties* option is on, which SAP does not recommend because of size limits. Pass what a downstream iFlow needs as a header or in the body. Headers that leave the tenant must not carry secrets.
2. **An Exception Subprocess that ends with a Message End event reports the message as Completed.** Use an Error End event when the failure must stay visible in monitoring. For synchronous senders, also set `CamelHttpResponseCode`.
3. **Check `message.getBodySize()` before reading a body with `getBody(String)`.** Treat `-1` (size unknown) as too large. For large payloads, use a streaming parser or a streaming splitter. Line-by-line reading only helps for line-delimited formats; minified JSON or XML is often a single line. Never attach payloads to the MPL unconditionally: gate attachments behind an externalized flag and cap their size. Tenants can write at most 1 GB of MPL attachments per 24 hours.
4. **Use `SAP_ApplicationID` for business keys.** It makes messages searchable in Monitor. Do not build custom correlation stores for this.
5. **Reliable delivery needs JMS (or a data store) for retry, and duplicate protection on the receiver side.** An Idempotent Process Call skips messages already processed successfully, but if a receiver commits and the acknowledgment is lost, a retry can still duplicate the effect (at least once). A failed synchronous call is not redelivered by the runtime; the caller must retry. To stop retrying after N attempts, route on `SAPJMSRetries`. The JMS sender sets it only for *Non-Exclusive* queues.
6. **Read credentials through the Security Material APIs** (`SecureStoreService`), never from externalized parameters or headers. Trust a server certificate chain only after verifying its fingerprints against an independent source, never just because a TLS test returned it, and never disable certificate validation as a fix.
7. **Diagnose from the exact MPL text.** Separate evidence (error text, HTTP status, step ID) from hypotheses, and give one concrete check per hypothesis (Connectivity Test, trace, keystore entry, Cloud Connector log).

## Output contract

- Code is complete and runnable in a CPI Script step: imports, null handling, guarded `messageLog`.
- Generated code contains no author names, credits, or promotional URLs.
- Say which iFlow step the code or setting belongs to and what to configure there (adapter field, End event, externalized parameter).
- Include test steps for the tenant (trace level, expected MPL status and properties).
- End with *Static analysis — not tested on a tenant* unless the user confirms a successful test run on their tenant; deployment alone is not enough.
- If a field name, limit, or behavior is not in these references and you are unsure, say so and point to the matching page in [references/sap-documentation-index.md](references/sap-documentation-index.md). Do not invent adapter fields, headers, or SAP Note numbers.
- Before designing a new integration between SAP products, check SAP Business Accelerator Hub for prepackaged integration content and SAP Architecture Center for a reference architecture. Extend standard content rather than rebuilding it.

## Authoritative sources

- SAP Integration Suite documentation: https://help.sap.com/docs/integration-suite (overview: https://help.sap.com/docs/integration-suite/sap-integration-suite/what-is-sap-integration-suite)
- Markdown source of the same documentation, for searching its text only: https://github.com/SAP-docs/btp-integration-suite
- Prepackaged integration content: https://api.sap.com/integrations/discoverintegrations
- Reference architectures: https://architecture.learning.sap.com/

When you cite a source to the user, link the public SAP page (SAP Help Portal, SAP Business Accelerator Hub, SAP Architecture Center, or another official SAP site), not the GitHub Markdown source. When these sources and this skill disagree, the SAP documentation wins. Tell the user about the difference.
