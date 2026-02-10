# Web Security Reference

> Source: <https://developer.mozilla.org/en-US/docs/Web/Security>

## Overview

Web security focuses on protecting sensitive information (customer data, passwords, banking info, internal algorithms) from unauthorized access that could lead to competitive disadvantage, service disruption, or customer privacy violations.

## Security vs. Privacy

- **Security**: Protecting private data and systems against unauthorized access (internal and external data).
- **Privacy**: Giving users control over data collection, storage, and usage with transparency and consent.

## Security Features Provided by Browsers

### Same-Origin Policy (SOP) and CORS

- **Same-Origin Policy**: Restricts documents or scripts from one origin interacting with resources from another origin.
- **CORS** (Cross-Origin Resource Sharing): An HTTP-header mechanism allowing servers to permit cross-origin resource requests when needed.

### HTTP Communication Security

- **HTTPS/TLS**: Encrypts data during transport, preventing third-party interception.
- **Certificate Transparency (CT)**: An open framework protecting against certificate misissuance through public logging.

### Secure Contexts and Feature Permissions

Browsers restrict "powerful features" (notifications, webcam, GPU, payments) to:

- Secure contexts (HTTPS/TLS delivery via `window` or `worker`).
- Explicit user permission via the Permissions API.
- User activation (transient activation -- requires user action like clicking).

## High-Level Security Considerations

### 1. Store Client-Side Data Responsibly

- Limit third-party cookie usage.
- Prepare for removal of cross-site cookies.
- Implement alternative persistence methods.

### 2. Protect User Identity and Manage Logins

- Use reputable frameworks with built-in security.
- Implement **Multi-Factor Authentication (MFA)**.
- Use dedicated APIs:
  - Web Authentication API
  - Federated Credential Management (FedCM) API

**Login Security Tips:**

- Enforce strong passwords.
- Educate users about **phishing** attacks.
- Implement **rate limiting** on login pages.
- Use **CAPTCHA** challenges.
- Manage sessions with unique session IDs.
- Auto-logout after inactivity.

### 3. Do Not Include Sensitive Data in URL Query Strings

- Avoid GET requests with sensitive data (can be intercepted via the Referer header).
- Use POST requests instead.
- Protects against CSRF and replay attacks.

### 4. Enforce Usage Policies

- **Content Security Policy (CSP)**: Controls where images and scripts can be loaded from; mitigates XSS and data injection attacks.
- **Permissions Policy**: Blocks access to specific "powerful features."

### 5. Maintain Data Integrity

- **Subresource Integrity (SRI)**: Crypto hash verification for fetched resources (from CDNs).
- **MIME Type Verification**: Use the `X-Content-Type-Options` header to prevent MIME sniffing.
- **Access-Control-Allow-Origin**: Manage cross-origin resource sharing.

### 6. Sanitize Form Input

- **Client-side validation**: Provide instant feedback using HTML form validation.
- **Output encoding**: Safely display user input without executing it as code.
- **Server-side validation**: Essential; client-side is easily bypassed.
- **Escape special characters**: Prevent executable code injection (SQL injection, JavaScript execution).

### 7. Protect Against Clickjacking

- **X-Frame-Options**: HTTP header preventing page rendering in `<frame>`, `<iframe>`, `<embed>`, or `<object>`.
- **CSP frame-ancestors**: Specifies valid parents that may embed a page.

## Common Security Attacks

| Attack | Description |
|---|---|
| Clickjacking | Tricks users into clicking hidden UI elements |
| Cross-Site Scripting (XSS) | Injects malicious scripts into trusted websites |
| Cross-Site Request Forgery (CSRF) | Forces authenticated users to perform unwanted actions |
| Cross-Site Leaks (XS-Leaks) | Infers information about users from side channels |
| SQL Injection | Inserts malicious SQL via user input |
| Phishing | Impersonates trusted entities to steal credentials |
| Man-in-the-Middle (MITM) | Intercepts communication between two parties |
| Server-Side Request Forgery (SSRF) | Manipulates server into making unintended requests |
| Subdomain Takeover | Exploits dangling DNS records |
| Supply Chain Attacks | Compromises third-party dependencies |
| Prototype Pollution | Injects properties into JavaScript object prototypes |

## Key HTTP Security Headers

| Header | Purpose |
|---|---|
| `Strict-Transport-Security` | Enforce HTTPS-only access |
| `X-Frame-Options` | Prevent clickjacking |
| `X-Content-Type-Options` | Prevent MIME sniffing |
| `Content-Security-Policy` | Control resource loading and XSS prevention |
| `Access-Control-Allow-Origin` | Manage CORS |

## Practical Implementation Guides

1. Content Security Policy (CSP)
2. Cross-Origin Resource Sharing (CORS)
3. Subresource Integrity (SRI)
4. Transport Layer Security (TLS)
5. Secure Cookie Configuration
6. MIME Type Verification
7. Referrer Policy
8. Cross-Origin Resource Policy (CORP)

## Authentication Methods

- Passkeys
- One-Time Passwords (OTP)
- Federated identity
- Password authentication

## Related Resources

- [Privacy on the Web](https://developer.mozilla.org/en-US/docs/Web/Privacy)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Mozilla Security Blog](https://blog.mozilla.org/security/)
