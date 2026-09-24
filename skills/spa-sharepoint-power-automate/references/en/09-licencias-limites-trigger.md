<!-- spa-sharepoint-power-automate · references/09-licencias-limites-trigger.md · section §21 · English translation of the Spanish original -->
<!-- New (2026-09-24). Data verified against Microsoft Learn that day; quota figures change, check the source before citing them. Index: ../SKILL.md -->

# 21 · HTTP trigger, licenses, limits and automatic suspension

What makes a flow that "was working fine" stop responding **without anyone touching the code**: trigger authentication, license, platform limits and automatic shutdown.

## 21.1 · "Who can trigger the flow": the new default breaks a public SPA

The `When an HTTP request is received` trigger has **three modes**:

| Mode | What it requires from the caller | Does it work for the public SPA? |
|---|---|---|
| **Any user in my tenant** | Microsoft Entra ID OAuth token from the same tenant | No: an anonymous visitor's browser has no token |
| **Specific users in my tenant** | Entra token from specific users or service principals (*Allowed users* field) | No |
| **Anyone** | Nothing: the URL with its signature is the credential (legacy mode) | **Yes, it is the only one** |

Microsoft documents that **"Any user in my tenant" is the default for new flows**. Practical consequence: if you build a new flow from scratch and do not change that field, the SPA receives an authentication rejection (401/403) and in general the request is rejected before a run is generated, so **Run history stays empty** while the browser shows the error (the latter is what you would expect given how authentication works, but **we did not verify it in our own tenant**: confirm it the first time it happens). It is the first place to look when "the new flow receives nothing".

- For the public SPA: **Anyone**, always. It is already in the template in §9 (`Who can trigger the flow | Anyone`) and the package in §20.1 sets it with `"triggerAuthenticationType": "All"`.
- With Anyone, whoever has the URL and knows the JSON shape can trigger it. That is what the model in §1 assumes: the mitigations are `x-app-key` validation, the payload shape, the size and the guards **on the flow side** (§19.4). Never "the URL is secret".
- For **internal** callers (Power Apps, another flow, your own service) the Entra mode is the better choice: it trades "obscurity" for real authentication. Guide: *Add OAuth authentication for HTTP request triggers* (see Sources).
- A flow with "Any user in my tenant" is **not** an alternative for an SPA without login; there is no way to give the visitor that token without authenticating them.

## 21.2 · License: the HTTP trigger is Premium

`When an HTTP request is received` and the `HTTP` action are **Premium** connectors. A flow that uses them without the right license fails with:

> `DirectApiAuthorizationRequired` — *The flow uses a premium connector but the caller doesn't have a premium license.*

and on import / save / activate / edit this appears: *"The user does not have a service plan adequate for the non-Standard connection."*

Microsoft rules that matter here:

- **Automated and scheduled** flows run with the **owner's** license. **Instant** flows (button, HTTP request, Power Apps) run with the license of the **invoking user**.
- A "seeded" Microsoft 365 license is **not enough** for a flow with a Premium connector. You need **Power Automate Premium** (per user) or a **Process** license (per flow) assigned to the flow.
- A child flow with a Premium connector can carry its own Process license; the parent's does **not** automatically cover the child. A *flow group* shares one Process entitlement across up to 25 solution flows.
- When the caller is an anonymous visitor (public SPA) there is no "invoking user" to license. **The clean way out is a Process license assigned to the flow** (or having the owner hold Premium): confirm it with whoever manages the licenses before going to production. Do not assume "it works because it runs fine for me in testing": the test runs with your license.

> If the flow was working and suddenly returns `DirectApiAuthorizationRequired`: someone lost the license (owner who changed it, expired 90-day trial, reassigned license).

## 21.3 · Automatic shutdown: a rarely used flow turns itself off

Microsoft retention rules (verify they are still current at the source):

| Situation | What happens |
|---|---|
| Trigger or actions failing continuously | The flow is turned off after **14 days** |
| No trigger activity | It may be turned off after **90 days**. **Does not apply** if the owner has a Premium license or the flow has a Process license. The owner is notified 30 days before |
| Consistent throttling | It is turned off after **14 days**; the Process license gives it dedicated capacity |

Applied to the pipeline: an inspections SPA that is rarely used (or a contingency flow) can end up turned off just when it is needed. Mitigation: an owner with a license that exempts the 90-day rule, or a monthly check of the flow's status (§13, §20.2), and **the owner's failure email going to a mailbox that gets read** (§13).

After any shutdown: reactivate and **test end to end** (§20.7). Reactivating does not reauthorize expired connections (§9, "Connector authorization expires").

## 21.4 · Request and response limits

| Limit | Value | What it implies |
|---|---|---|
| Incoming request (HTTP trigger) | **120 s** | If the flow takes longer to reach the `Response` action, the client gets a gateway error (502/504) even though the flow keeps running and finishes fine |
| Actions **after** `Response` | Keep executing | That is why `Respuesta` goes **before** the loops (§9). The run duration limit is 30 days |
| Message size | **100 MB** total, not just the file | The payload is JSON with the photos in base64, which weighs ~33% more than the binary. Compress on the client (§5) and limit the count (§8) |
| With *chunking* enabled | Up to 1 GB | Only on actions that support it; does not apply to the HTTP trigger |
| Apply to each: items | 5,000 (Low profile) / 100,000 | Filter before iterating, not after (§23) |
| Apply to each: concurrency | 1 (default) to 50 | An inner nested loop always runs in sequence |

The "502 NoResponse" in the error catalog (§17) is exactly the 120 s limit: the fix is the same, respond early and reduce what weighs.

## 21.5 · Throttling: the SharePoint connector has its own ceiling

- The SharePoint connector has a limit per **connection**: ~**600 actions per minute**, shared among all flows that use that connection. It is independent of the daily action quota.
- When exceeded, the action fails with **HTTP 429**: *"Rate limit is exceeded. Try again in N seconds."*
- There is also a ceiling of **100,000 actions in 5 minutes** per flow, independent of the license.
- Lowering the loop's concurrency (§22.3) is the immediate remedy. For sustained volume: Process license (dedicated capacity) and spread the work across connections/flows.
- Outside the designer (scripts in §18/§20) the handling of 429/503 and `Retry-After` is in §23.4.

## 21.6 · Health checklist before saying "the flow is ready"

1. Trigger set to **Anyone** (new flow ≠ old default).
2. Flow owner with **Premium** or flow with **Process** assigned (§21.2).
3. `Respuesta` before the loops and every branch ends in `Response` (§9, §20.4).
4. The largest real payload production expects, tested against the 120 s and 100 MB limits.
5. Connections authorized by the right account (not a personal one that will be rotated).
6. Owner's failure email → monitored mailbox (§13).
7. `.zip` package re-exported and committed (§9, "Flow backup").
8. Recorded in the repo: **who the owner is and which license covers it**.

## Sources (Microsoft Learn)

- *Add OAuth authentication for HTTP request triggers* — `learn.microsoft.com/power-automate/oauth-authentication`
- *Limits of automated, scheduled, and instant flows* — `learn.microsoft.com/power-automate/limits-and-config`
- *Cloud flow error code reference* (`DirectApiAuthorizationRequired`) — `learn.microsoft.com/power-automate/error-reference`
- *Power Automate licensing FAQ* — `learn.microsoft.com/power-platform/admin/power-automate-licensing/faqs`
- *Understand platform limits and avoid throttling* — `learn.microsoft.com/power-automate/guidance/coding-guidelines/understand-limits`
