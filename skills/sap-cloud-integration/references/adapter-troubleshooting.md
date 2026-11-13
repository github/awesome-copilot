# Adapter troubleshooting: MPL text → cause → check

Always start from the exact error text and the failing step in the MPL. Give the user one concrete check per likely cause, most likely first.

## Cloud Connector (any on-premise target)

| Symptom | Likely cause | Check |
|---|---|---|
| Error says no Cloud Connector is connected, or a connection or timeout error to a virtual host | Cloud Connector offline, wrong subaccount, or Location ID mismatch | Cloud Connector UI: connected subaccount and Location ID; the adapter's **Location ID** field matches |
| HTTP 403 or 404 from an on-premise target only through CPI | Path not exposed in Cloud Connector **Access Control** | Add the resource path (with "path and all sub-paths" if needed) for the virtual host |
| Works in Postman on the network, fails from CPI | Adapter **Proxy Type** not set to On-Premise, or virtual host/port used incorrectly | Adapter uses the virtual host and port defined in Cloud Connector, not the internal host |

## SFTP

| MPL text contains | Likely cause | Check |
|---|---|---|
| `Auth fail` | Client authentication rejected: wrong user, wrong key or password alias, public key not installed for that user, or an unsupported key type | Security Material alias and type; ask the server admin which user and key fingerprint were presented |
| `reject HostKey` / host key changed | Server host key missing from or outdated in **known_hosts** | **Monitor → Connectivity Tests → SSH**: fetch the host key, verify the fingerprint with the server owner, update known_hosts. Never disable host key checking. |
| `No such file` / `Permission denied` | Wrong directory, chroot path differences (absolute vs. relative), or missing rights for read/delete/rename | Connectivity Test with the same user and directory; post-processing needs write or delete rights |
| Sender polls but picks nothing up | File name pattern mismatch, files already recorded in the idempotent repository ("Keep File and Mark as Processed"), or another node holds the lock | Pattern and case; idempotent repository entries; post-processing option |

## HTTP, OAuth, and certificates

| Symptom | Likely cause | Check |
|---|---|---|
| 401 from receiver | Wrong credential or OAuth2 artifact, wrong token URL or scope, client authentication method mismatch (body vs. Basic header) | Deployed OAuth2 Client Credentials artifact; request a token with the same settings in a test tool |
| 403 with a CSRF message from SAP Gateway | Target requires an `X-CSRF-Token`. The HTTP adapter does not fetch it; the OData adapter can (CSRF Protected) | Use the OData adapter, or Request-Reply `GET` with `X-CSRF-Token: Fetch`, then send the token and session cookie |
| Client gets 403 calling a CPI endpoint | Caller lacks the role for the Process Integration Runtime instance (`ESBMessaging.send` or a custom role), or **CSRF Protected** is enabled on the HTTPS sender | Service key or role collection of the caller; the sender's CSRF setting |
| Client gets 404 calling a CPI endpoint | Address path wrong, iFlow not deployed or started, or path changed | Monitor → Manage Integration Content → endpoint URL |
| `PKIX path building failed` / SSL handshake error | Server CA chain not trusted by the tenant | Run **Monitor → Connectivity Tests → TLS** to see the chain the server presents. **Do not trust it on that basis alone.** See *Trusting a server certificate chain* below |
| `AhcOperationFailedException ... status code 400` with no obvious payload problem | The receiver rejects the SAP monitoring headers the runtime adds | Set exchange property `SAP_DisableMonitoringHeaders` = `true` in a Content Modifier right before the HTTP receiver |
| Wrong target called after a dynamic URL | `CamelHttpUri` or the address expression resolved differently than expected | MPL property `RealDestinationUrl` shows the URL actually used |
| 413, or a timeout on a large call | Payload above the target's limit, or receiver adapter timeout too low | Target limits; adapter **Timeout**; consider splitting or async |

### Trusting a server certificate chain

What a server presents during a TLS test is unauthenticated input: a misconfigured proxy or an attacker in the path can present its own chain. Importing it lets the tenant trust an impersonated receiver.

1. Identify the issuing CA from the TLS test result (issuer names and SHA-256 fingerprints).
2. Get the root and any intermediate certificates **from an independent source**: the CA's official repository, or the receiver's owner over a separate, trusted channel. Compare the SHA-256 fingerprints with what the test showed.
3. Only then upload them to the tenant Keystore. Use the TLS test's *Add to keystore* or *Download* options only after the fingerprints match.
4. Trust CA certificates, not the server's own (leaf) certificate. Pin a leaf or self-signed certificate only as a deliberate, documented decision agreed with the receiver's owner, and track its expiry.
5. Never switch off server certificate validation in a receiver adapter to work around the error. Unselecting *Validate Server Certificate* in the TLS test is for diagnosis only.
6. After the upload, run the TLS test again with validation on, then retest the iFlow.

## IDoc

| Direction | Required setup | Typical failure |
|---|---|---|
| S/4HANA/ECC → CPI (IDoc sender) | SM59 type **G** connection to the CPI endpoint path; WE21 port of type **XML HTTP** using it; WE20 partner profile | Port or RFC destination points to the wrong path, or client certificate/basic authentication not configured in SM59 |
| CPI → S/4HANA/ECC (IDoc receiver) | Endpoint `/sap/bc/srt/idoc?sap-client=<client>`; SICF service active; IDoc SOAP inbound registered in transaction **SRTIDOC** | IDoc status **56** ("IDoc with errors added"): read the status long text in WE02/WE05 first. The most common cause is a control record (`EDI_DC40` sender partner, partner type, port, message type) that does not match an active WE20 inbound partner profile. Status **51**: passed to the application but not posted; check the application error, not CPI |

## OData

- Errors arrive as `OsciException`. Read the OData error payload from the body inside the Exception Subprocess.
- For large reads, use **Process in Pages** and `$select`, rather than one unrestricted query.
- For `$batch` with the **OData V2 receiver**, select *Enable Batch Processing* and send an **XML** body in the adapter's `batchParts` format. The adapter builds the multipart HTTP request itself, so do not build raw multipart content for it. A read batch looks like this (SAP example):

  ```xml
  <batchParts>
      <batchQueryPart>
          <method>GET</method>
          <uri>Products</uri>
      </batchQueryPart>
      <batchQueryPart>
          <method>GET</method>
          <uri>CustomerReviews</uri>
      </batchQueryPart>
  </batchParts>
  ```

  The *Resource Path* field is still mandatory with batch processing. For create/update/delete operations, use the adapter's change set structure described on SAP's *Configure the OData V2 Receiver Adapter* page. Inspect each part of the response, because one operation can fail while others succeed.
- Build a raw `multipart/mixed` batch body only when calling the OData service through the **HTTP** receiver adapter.

## SOAP

- One-way (fire-and-forget) SOAP sender calls return HTTP 202 and do not report later processing errors to the caller. Use Request-Reply when the caller needs the outcome.
- WS-Security errors usually mean a mismatched policy: signing or encryption expected but not configured, a certificate alias missing in the keystore, or a timestamp/clock skew.

## AS2

- Partner rejects the message or MDN: AS2-From/AS2-To IDs, signing and encryption certificate aliases, or the MIC algorithm differ from what was agreed.
- Asynchronous MDN never arrives: the partner cannot reach the MDN endpoint, or the MDN URL or authentication is wrong.
