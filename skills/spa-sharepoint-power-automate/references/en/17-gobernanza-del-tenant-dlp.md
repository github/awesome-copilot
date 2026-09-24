<!-- spa-sharepoint-power-automate · references/17-gobernanza-del-tenant-dlp.md · section §29 · English translation of the Spanish original -->
<!-- New (2026-09-24). Verified against Microsoft Learn (DLP, IP firewall, conditional access, domains to allow). Anything not verified is marked. Index: ../SKILL.md -->

# 29 · Tenant governance: DLP, IP firewall, conditional access and corporate network

In a company, the SPA → HTTP trigger → SharePoint pipeline does not depend only on what you build: **IT can block it with tenant policies**, and the symptoms look like bugs in your flow. This chapter helps you recognize each case and know **what to ask IT for**.

## 29.1 Data policies (DLP): the HTTP trigger can be blocked

Data policies classify each connector as **Business**, **Non-Business** or **Blocked**. A *Business* connector can only be combined with other *Business* connectors within the same flow.

Verified in Microsoft Learn:

- The **`HTTP`**, **`HTTP Webhook`** and **`When an HTTP request is received`** connectors can be classified (and blocked) in a policy, just like any other.
- Microsoft's guidance recommends **blocking high-risk operations such as HTTP** in environments with many makers, and limiting non-business connectors, especially in the **default environment**.
- **Child flows share an internal dependency with the HTTP connector**: how HTTP is classified can prevent child flows from running in that environment.
- Microsoft's recommendation to balance security and usage: **dedicated environments** where makers can use HTTP, with a restricted list of makers.

### Symptoms

| Symptom | Probable cause |
|---|---|
| When creating or saving the flow: *"Looks like this workflow is disabled by your organization"* | A data policy blocks the connector (or a combination of connectors) |
| The flow existed and **stopped triggering**; when you edit and save it, the flow checker says it violates a policy | The flow was **suspended** by a new or modified policy |
| The HTTP trigger works in your test environment but not in the company's | The policy of the tenant or of the target environment is different |

### How to diagnose it

1. Open the flow → **Edit** → **Save**: the **flow checker** reports whether it violates a policy.
2. Ask an administrator to check in the **Power Platform admin center** which policy (tenant or environment) is blocking it.
3. Compare the classification of the three HTTP connectors between your environment and the production one.

## 29.2 IP firewall: it protects Dataverse, not necessarily your trigger

The Power Platform **IP firewall** limits **which addresses can access Dataverse** and evaluates each request in real time. Verified facts:

- It is a feature of **managed environments** and is **not enabled by default**.
- It covers "any Power Platform environment that includes Dataverse".
- It has an **audit-only mode**: it identifies the IPs but allows everything. Microsoft recommends keeping it that way **for at least one week** before enforcing it.
- Changes take about **5-10 minutes** to apply; it supports up to **200** CIDR ranges.
- Official warning: if *"Allow access for Microsoft trusted services"* and *"Allow access for all application users"* are disabled, **some services that use Dataverse, such as Power Automate flows, may stop working**. To keep flows running, you have to allow the *service tags* for the **outbound IPs of the managed connectors**.
- It requires specific licenses for the users of the environment (Microsoft 365 E5/A5/G5 family or Compliance/Information Protection equivalents): confirm this with whoever administers the licenses.

> **NOT VERIFIED:** a Microsoft guide on exfiltration prevention recommends *"defining the allowed IP addresses that can access the HTTP trigger"*, but the documented IP firewall article talks about **Dataverse**. There is no evidence in what was consulted that this firewall filters anonymous calls to the URL of an HTTP trigger. Try it in a test before assuming either thing, and ask IT which control they actually have configured.

## 29.3 Conditional access and devices

Microsoft Entra conditional access affects **when a connection is created or used** (connectors authenticate with an account), **not** an anonymous visitor calling the trigger. Typical messages verified when repairing a connection:

- *Access has been blocked by Conditional Access policies. The access policy does not allow token issuance.*
- *Device is not in required device state: domain_joined / compliant.*
- *Device object was not found in the tenant directory* / *Device used during the authentication is disabled.*

This is not a problem with the flow: it is with **the account and the device used to authorize the connection**. Solution: contact the tenant administrator and **reauthorize** the connection (§9, §28.5). A **service account** whose access conditions are defined in advance prevents it from breaking every time a person's device changes.

## 29.4 Corporate network: which domains IT has to allow

If the people using the SPA are **behind a corporate proxy or firewall**, the browser has to be able to reach the trigger. Microsoft documents the domains required for the `When an HTTP request is received` trigger:

| Outbound domains (HTTPS) | Use |
|---|---|
| `*.api.powerplatform.com` and `*.logic.azure.com` | Commercial cloud |
| `*.api.gov.powerplatform.microsoft.us` and `*.logic.azure.us` | GCC (US government) |
| `*.api.high.powerplatform.microsoft.us` and `*.logic.azure.us` | GCC High |
| `*.api.appsplatform.us` and `*.logic.azure.us` | DoD |
| `*.api.powerplatform.partner.microsoftonline.cn` and `*.logic.azure.cn` | 21Vianet (China) |

Typical symptom when the permission is missing: the SPA shows **"Failed to fetch"** / a network error **only from the company network**, while it works from mobile data. Check this before touching the flow.

This error from the flow itself also appears when it cannot register its trigger: *"There is a problem with the flow's trigger"*; Microsoft states that a common cause is that the service endpoints are **not on the allow list** of the network.

## 29.5 What to ask IT for (short script)

A specific, scoped request is approved more easily than a vague one:

1. A **dedicated environment** for field apps (not the default one), with a **restricted list of makers**.
2. In that environment, a data policy that allows the three **HTTP** connectors together with **SharePoint** and **Outlook** (all in the same group), and **endpoint filtering** if they want to limit which URLs HTTP can call.
3. **Allow the domains in §29.4** for the network where the users are.
4. **A service account** that owns the flow and the connections, with the appropriate license (§21.2).
5. For API access to SharePoint: `Sites.Selected` on a single site (§32) instead of permissions over the whole tenant.

## 29.6 Threat model: what IT sees

Having a policy and complying with it helps both sides. Keep in mind that: connections and connector usage are recorded in the Power Platform and Entra **audit logs**; a flow **outside the governed environment** or with connectors classified differently can be **suspended** at any time; and a **written** exception from IT protects whoever maintains the app.

## Sources (Microsoft Learn)

- *Connector classification* (the 3 HTTP connectors, child flows, dedicated environments) — `learn.microsoft.com/power-platform/admin/dlp-connector-classification`
- *Prevent unauthorized transfer of data* (DLP best practices, firewall, conditional access) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/prevent-data-exfiltration`
- *IP firewall in Power Platform environments* — `learn.microsoft.com/power-platform/admin/ip-firewall`
- *Troubleshoot Power Automate trigger problems and errors* / *Troubleshoot broken connections in Microsoft Power Platform* — `learn.microsoft.com/troubleshoot/power-platform/power-automate/`
- *IP address configuration for Power Automate* (HTTP trigger domains) — `learn.microsoft.com/power-automate/ip-address-configuration`
