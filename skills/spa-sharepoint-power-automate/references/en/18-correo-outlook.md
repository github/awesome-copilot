<!-- spa-sharepoint-power-automate · references/18-correo-outlook.md · section §30 · English translation of the Spanish original -->
<!-- New (2026-09-24). Verified against Microsoft Learn (email troubleshooting in flows, Exchange Online limits, known connector issues). Derived calculations are marked. Index: ../SKILL.md -->

# 30 · Email from the flow: connector, limits and pitfalls

The summary email is the end of almost every flow in this pipeline (§9: `Send_email_V2` at the root, after the loops). It is also where things break **silently** when volume or attachment size grows.

## 30.1 Which connector to use

| Connector | Documented limit |
|---|---|
| **Mail** (generic) | **100 calls per 24 hours** |
| **Office 365 Outlook** | **300 calls per 60 seconds** |

Microsoft states it verbatim: if "the send email action seems stuck", switch from the *Mail* connector to the *Office 365 Outlook* one. For this pipeline, always use **Office 365 Outlook** (`Send an email (V2)`).

## 30.2 Message size and attachments

Verified facts:

- The **default** message size in Exchange Online is **35 MB to send** and 36 MB to receive. An administrator can set it between **1 MB and 150 MB**, but the effective limit also depends on the client.
- Messages that **leave Microsoft data centers** carry **+33% extra for encoding**; the maximum goes from 150 MB to **112 MB**.
- Classic attachments: up to **112 MB**; OneDrive ones, up to 2 GB. Maximum of **250 attachments** per message (Office 365 profiles).
- In connectors, file content travels in **base64**: the real size can be **30-40% larger** than the original and, if a size rule applies, the encoded size is what counts.
- The **Approval** action attaches files to the email **up to 5 MB**; if it goes over, the email points to the approvals center. A Dataverse administrator can raise that limit (Email settings).

**Derived calculation (not a fact from the documentation):** with the default limit of 35 MB, the total of raw attachments is around **26 MB** (35 / 1.33). A flow that attaches 12 photos of 3 MB plus a PDF can pass in testing and **fail in production** the day the photos weigh more. Guidelines:

1. Do not attach the photos: save them in SharePoint (§9) and **link** them in the email.
2. If you attach the generated PDF, check its size (§5) and leave the rest as a link.
3. Test with the **worst case** (maximum number of photos at maximum size), not with the average.

## 30.3 Shared mailbox and "send as"

- To send **from a shared mailbox or distribution list**: use the **`Send an email from a shared mailbox (V2)`** action with the mailbox address. The administrator has to **grant you permission** first. The message is saved in that mailbox's *Sent Items* folder.
- Known error with shared mailboxes: **`Item ID doesn't belong to current mailbox`**. It appears when an email action uses an id from another mailbox; check that the action and the id correspond to the **same** mailbox.
- A flow sends **as the owner of the connection**. If the connection belongs to a person, emails go out under their name and break when they change their password or leave (§9, §28.5). Use a **service account or shared mailbox** as a stable sender.

## 30.4 Build pitfalls

- **`Apply to each` around `Send an email`** = one email per item. For **a single email to several recipients**, build a **text string** (not an array) with the addresses separated by **semicolons**. *(Verified in the Power Automate email guide.)*
- The email **inside** a loop gets duplicated (§9, "Email duplicate trap"): put it at the **root**, with *run after* only if the previous step succeeded.
- The **"when a new email arrives"** trigger fires only for **new** email; **moving** an email to another folder does not trigger it.
- **Embedded** images in the body (inline): those in Send an email (V2) have a size limit (forums cite **1 MB**; it is not confirmed as an official attachment limit). Use links to images or a real attachment.
- If the email does not arrive: check Outlook rules that move it, the **Focused/Other inbox**, and that IT has allowed the Power Automate endpoints to reach their mail servers (§29.4).
- Failure of an **intermittent email action** with error 500: configure the **retry policy** (§22.4). Retrying can **duplicate** the email if the first attempt did go out: if it matters, record the folio that was sent.

## 30.5 Error email for the team (pattern)

The **failure** email is not the same as the business one (§13, §22.1):

- **Recipient**: a monitored mailbox, not a person.
- **Content**: folio, action that failed, **link to the run** and time. **No personal data** from the payload (§22.6, §33).
- **Frequency**: not one email per retry: group or throttle them, or the mailbox gets flooded and ignored.

## Sources (Microsoft Learn)

- *Troubleshoot common issues with email in flows* — `learn.microsoft.com/power-automate/email-troubleshooting`
- *Troubleshoot known issues with forms in flows* — `learn.microsoft.com/power-automate/forms/troubleshoot-issues`
- *Exchange Online limits* — `learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits`
- *Create flows for popular email scenarios* (shared mailbox) — `learn.microsoft.com/power-automate/email-top-scenarios`
- *Known issues and limitations for connectors* (size in base64) — `learn.microsoft.com/connectors/common/known-issues`
