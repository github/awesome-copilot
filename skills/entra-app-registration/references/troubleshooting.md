# Troubleshooting Microsoft Entra App Registration

This guide helps you diagnose and fix common issues with app registrations and authentication.

## Table of Contents

- [Authentication Errors](#authentication-errors)
- [Token Issues](#token-issues)
- [Permission Problems](#permission-problems)
- [Redirect URI Issues](#redirect-uri-issues)
- [Application Configuration](#application-configuration)
- [Debugging Tools](#debugging-tools)

## Authentication Errors

### Redirect URI Mismatch

**Error message:**
```
AADSTS50011: The redirect URI 'http://localhost:3000' specified in the request 
does not match the redirect URIs configured for the application.
```

**Cause:** The redirect URI in your authentication request doesn't exactly match what's registered.

**Solutions:**

1. **Check exact match** (case-sensitive, trailing slash matters):
   ```
   Registered: https://myapp.com/callback
   Request:    https://myapp.com/callback/  ❌ (trailing slash)
   Request:    https://MyApp.com/callback   ❌ (case difference)
   Request:    https://myapp.com/callback   ✅
   ```

2. **Add URI to app registration:**
   ```bash
   # Portal: Authentication → Add redirect URI
   # CLI:
   az ad app update --id $APP_ID \
     --web-redirect-uris "http://localhost:3000" "https://myapp.com/callback"
   ```

3. **Check platform type:**
   - Web URIs go in "Web" platform
   - SPA URIs go in "Single-page application"
   - Desktop/mobile URIs go in "Public client/native"

### Invalid Client Secret

**Error message:**
```
AADSTS7000215: Invalid client secret provided. 
Ensure the secret being sent in the request is the client secret value, not the client secret ID.
```

**Causes:**
- Client secret expired
- Wrong secret value (copied secret ID instead of value)
- Secret doesn't match app registration

**Solutions:**

1. **Check expiration:**
   ```bash
   az ad app credential list --id $APP_ID
   ```
2. **Create new secret:**
   ```bash
   az ad app credential reset --id $APP_ID --years 1
   ```
   Copy the `password` value (not the `keyId`)

### User Consent Required

**Error message:**
```
AADSTS65001: The user or administrator has not consented to use the application
```

**Causes:**
- Application permissions require admin consent
- User hasn't consented to delegated permissions
- Consent was revoked

**Solutions:**

1. **Grant admin consent (if admin):**
   ```bash
   az ad app permission admin-consent --id $APP_ID
   ```

2. **Request user consent (interactive flow):**
   This requires the client app to have access to UI such as browser, terminal window, etc. Follow the best practices of your client app to implement the interactive flow.

3. **Check API permissions in portal:**
   - Ensure permissions are added
   - Look for green checkmarks (granted)
   - Yellow warning means not granted

### Grant Declined

**Error message:**
```
AADSTS70000: The request was denied because one or more permissions have been declined
```

**Cause:** User or admin explicitly denied consent.

**Solutions:**

1. **Re-request with explanation:**
   - Explain why permissions are needed
   - Request only necessary permissions

2. **Check if admin consent is required:**
   - Some organizations disable user consent
   - Contact your admin to grant consent

3. **Reduce permission scope:**
   - Request minimal permissions initially
   - Use incremental consent for additional features

### Application Not Found

**Error message:**
```
AADSTS700016: Application with identifier '{app-id}' was not found in the directory
```

**Causes:**
- Wrong application ID
- Wrong tenant ID
- Service principal not created
- App in different tenant

**Solutions:**

1. **Verify application ID:**
   ```bash
   az ad app list --display-name "MyApp" --query "[].{Name:displayName, AppId:appId}"
   ```

2. **Verify tenant ID:**
   ```bash
   az account show --query tenantId -o tsv
   ```

### Application Doesn't have a Service Principal

**Error message:**
```
The app is trying to access a service 'your_app_id'(your_app_name) that your organization 'your_tenant_id' lacks a service principal for
```

**Causes:**
- Your tenant is not configured to automatically provision the service principal for app registrations in it.

**Solutions:**

1. **Create service principal:**
   ```bash
   az ad sp create --id $APP_ID
   ```

### Missing Required Field

**Error message:**
```
AADSTS90014: The required field 'client_id' is missing from the request
```

This can happen if the client you are using isn't compatible with Entra. Consult the owner of your client app to see if it supports Entra.

## Token Issues

Unless the the access token is encrypted, you can decode and view its claims securely at https://jwt.ms. **Don't** use any other website to decode an access token. Compare the claims in the token with the app registration's configuration to identify issues.

## Debugging Tools

### JWT Token Decoder

**Tool:** https://jwt.ms

**How to use:**
1. Copy your access token
2. Paste into jwt.ms
3. Review claims:
   - `aud` - Audience (should match your API)
   - `iss` - Issuer (should be login.microsoftonline.com)
   - `scp` - Delegated permissions
   - `roles` - Application permissions
   - `exp` - Expiration timestamp
   - `oid` - User object ID

---

### Fiddler

**Use for:** Inspecting HTTP requests/responses

**What to check:**
- Authorization header format: `Bearer {token}`
- Token is being sent
- Response status codes and error messages

### Entra Sign-in Logs

**Access:** Azure Portal → Microsoft Entra ID → Sign-in logs

**What to check:**
- Failed sign-in attempts
- Error codes and messages
- User consent status
- Conditional Access policy failures

## Common Error Codes Reference

| Error Code | Meaning | Common Cause |
|------------|---------|--------------|
| AADSTS50011 | Redirect URI mismatch | URI not registered or doesn't match |
| AADSTS50020 | Invalid tenant | Wrong tenant in authority URL |
| AADSTS50034 | User not found | User doesn't exist in tenant |
| AADSTS50053 | Account locked | Too many failed attempts |
| AADSTS50055 | Password expired | User needs to reset password |
| AADSTS50057 | Account disabled | User account disabled |
| AADSTS50058 | Silent sign-in failed | Interactive auth required |
| AADSTS50059 | Tenant not found | Invalid tenant ID |
| AADSTS65001 | Consent required | User/admin hasn't consented |
| AADSTS70000 | Grant declined | User denied consent |
| AADSTS70001 | App disabled | App registration disabled |
| AADSTS700016 | App not found | Invalid app ID or wrong tenant |
| AADSTS7000215 | Invalid client secret | Wrong/expired secret |
| AADSTS90014 | Missing field | Required parameter not sent |
| AADSTS90072 | Consent needed | Admin consent required |

## Best Practices for Troubleshooting

### Systematic Approach

1. **Collect information:**
   - Exact error message and code
   - When it started happening
   - What changed recently
   - Environment (dev/test/prod)

2. **Check basics first:**
   - App ID and tenant ID correct
   - Permissions added and consented
   - Redirect URIs configured
   - Secrets/certificates valid

3. **Use debugging tools:**
   - Decode tokens (jwt.ms)
   - Check sign-in logs
   - Enable MSAL logging
   - Use network inspector

4. **Test incrementally:**
   - Test with minimal permissions
   - Add permissions one at a time
   - Test different flows separately

## Getting Help

### Microsoft Resources

- [Microsoft Q&A](https://learn.microsoft.com/answers/)
- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/entra/identity-platform/)
