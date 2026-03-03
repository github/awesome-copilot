# OAuth 2.0 Flows

This document provides an illustration of OAuth 2.0 authentication flows supported by Microsoft Entra ID.

**Note:** All the following implementation steps are for illustration purposes. It's always recommended to use a library to handle the authentication flow.

## Authorization Code Flow

### Flow Steps

```
1. User → App: Navigate to app's web UI
2. App → User: Redirect to Microsoft login
3. User → Entra ID: Authenticate & consent
4. Entra ID → App: Authorization code (via redirect URI)
5. App → Entra ID: Exchange code for tokens (with client secret)
6. Entra ID → App: Access token + refresh token + ID token
7. App → API: Call API with access token
```

### Implementation Steps

#### 1. Build Authorization URL

```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?
  client_id={application_id}
  &response_type=code
  &redirect_uri={redirect_uri}
  &response_mode=query
  &scope={scopes}
  &state={random_state}
```

**Parameters:**
- `tenant`: Your tenant ID or `common` for multi-tenant
- `client_id`: Application (client) ID from app registration
- `redirect_uri`: Must match exactly what's registered
- `scope`: Space-separated permissions (e.g., `openid profile User.Read`)
- `state`: Random value to prevent CSRF attacks

#### 2. User Authenticates

User is redirected to Microsoft login page, authenticates, and grants consent.

#### 3. Receive Authorization Code

App receives callback at redirect URI:
```
https://your-app.com/callback?
  code={authorization_code}
  &state={state_value}
```

**Validation:**
- Verify `state` matches what you sent
- Extract `code` parameter

#### 4. Exchange Code for Tokens

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&scope={scopes}
&code={authorization_code}
&redirect_uri={redirect_uri}
&grant_type=authorization_code
&client_secret={client_secret}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "M.R3_BAY...",
  "id_token": "eyJ0eXAi..."
}
```

#### 5. Use Access Token

```http
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer {access_token}
```

## Authorization Code Flow with PKCE

PKCE (Proof Key for Code Exchange) adds security for public clients that cannot securely store a client secret.

### Flow Steps

```
1. App: Generate code verifier (random string)
2. App: Generate code challenge (SHA256 hash of verifier)
3. App → Entra ID: Authorization request with code challenge
4. User → Entra ID: Authenticate & consent
5. Entra ID → App: Authorization code
6. App → Entra ID: Exchange code + code verifier for token
7. Entra ID: Validates verifier matches challenge
8. Entra ID → App: Access token + ID token
```

### Implementation Steps

#### 1. Generate PKCE Values

**Code Verifier:** 43-128 character random string
```javascript
// JavaScript example
const codeVerifier = generateRandomString(128);
```

**Code Challenge:** Base64URL-encoded SHA256 hash of verifier
```javascript
const codeChallenge = base64URLEncode(sha256(codeVerifier));
```

#### 2. Build Authorization URL

```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?
  client_id={application_id}
  &response_type=code
  &redirect_uri={redirect_uri}
  &scope={scopes}
  &state={state}
  &code_challenge={code_challenge}
  &code_challenge_method=S256
```

#### 3. Exchange Code for Tokens (No Secret)

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&scope={scopes}
&code={authorization_code}
&redirect_uri={redirect_uri}
&grant_type=authorization_code
&code_verifier={code_verifier}
```

## Client Credentials Flow

### Flow Steps

```
1. App → Entra ID: Request token with client ID + secret
2. Entra ID: Validate credentials
3. Entra ID → App: Access token (application permissions)
4. App → API: Call API with token
```

### Implementation Steps

#### 1. Configure Application Permissions

In app registration:
1. Go to "API permissions"
2. Add **Application** permissions (not delegated)
3. Grant admin consent (required for app permissions)

**Example permissions:**
- `User.Read.All` (application) - Read all users
- `Directory.Read.All` (application) - Read directory

#### 2. Request Access Token

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&scope=https://graph.microsoft.com/.default
&client_secret={client_secret}
&grant_type=client_credentials
```

**Parameters:**
- `scope`: Use `{resource}/.default` format
  - For Microsoft Graph: `https://graph.microsoft.com/.default`
  - For your API: `api://{api_app_id}/.default`

**Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "token_type": "Bearer",
  "expires_in": 3599
}
```

#### 3. Use Access Token

```http
GET https://graph.microsoft.com/v1.0/users
Authorization: Bearer {access_token}
```

## Device Code Flow

**Use for:** Devices without browsers (IoT, CLIs), headless environments

### Flow Steps

```
1. App → Entra ID: Request device code
2. Entra ID → App: Device code + user code + verification URL
3. App → User: Display code and URL
4. User: Opens URL on another device, enters code
5. User → Entra ID: Authenticates & consents
6. App → Entra ID: Poll for token
7. Entra ID → App: Access token (after user completes auth)
```

### Implementation Steps

#### 1. Request Device Code

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&scope={scopes}
```

**Response:**
```json
{
  "user_code": "GTHK-QPMN",
  "device_code": "GMMhmHCXhWEzkobqIHGG_EnNYYsAkukHspeYUk9E8",
  "verification_uri": "https://microsoft.com/devicelogin",
  "expires_in": 900,
  "interval": 5,
  "message": "To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code GTHK-QPMN to authenticate."
}
```

#### 2. Display Instructions to User

```
To sign in, open https://microsoft.com/devicelogin
and enter code: GTHK-QPMN
```

#### 3. Poll for Token

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code={device_code}
```

**Poll every 5 seconds (use `interval` from response)**

**Pending Response (user hasn't completed auth yet):**
```json
{
  "error": "authorization_pending",
  "error_description": "AADSTS70016: Pending end-user authorization..."
}
```

**Success Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "M.R3_BAY...",
  "id_token": "eyJ0eXAi..."
}
```

## Refresh Token Flow

**Use for:** Refreshing expired access tokens without re-authentication

### When to Refresh

- Access tokens typically expire in 1 hour
- Refresh tokens are long-lived (14-90 days)
- Refresh before access token expires for seamless UX

### Implementation

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={application_id}
&scope={scopes}
&refresh_token={refresh_token}
&grant_type=refresh_token
&client_secret={client_secret}
```

**Note:** `client_secret` only required for confidential clients

**Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "M.R3_BAY...",
  "id_token": "eyJ0eXAi..."
}
```

**Important:** New refresh token is returned; use it for next refresh

## Token Types

### Access Token

- Used to call APIs
- Contains claims (user ID, permissions, etc.)
- Short-lived (typically 1 hour)
- Format: JWT (JSON Web Token)

**Sample claims:**
```json
{
  "aud": "https://graph.microsoft.com",
  "iss": "https://sts.windows.net/{tenant}/",
  "sub": "{user_object_id}",
  "scp": "User.Read Mail.Read",
  "exp": 1680000000
}
```

### Refresh Token

- Used to get new access tokens
- Long-lived (days to months)
- Opaque string (not JWT)
- Single-use (new one issued with each refresh)

### ID Token

- Contains user identity information
- Used by the app to authenticate user
- Format: JWT

**Sample claims:**
```json
{
  "sub": "{user_object_id}",
  "name": "Jane Doe",
  "preferred_username": "jane@contoso.com",
  "email": "jane@contoso.com",
  "oid": "{object_id}"
}
```

## Scopes and Permissions

### Scope Format

**Microsoft Graph:**
```
https://graph.microsoft.com/User.Read
https://graph.microsoft.com/Mail.Send
```

**Custom API:**
```
api://{api_application_id}/access_as_user
```

## Security Considerations

| Practice | Why |
|----------|-----|
| **Use state parameter** | Prevents CSRF attacks |
| **Use PKCE for public clients** | Prevents authorization code interception |
| **Validate tokens** | Verify signature, issuer, audience, expiration |
| **Use HTTPS only** | Protect tokens in transit |
| **Store tokens securely** | Use secure storage, never in localStorage for sensitive apps |
| **Implement token refresh** | Seamless UX without repeated logins |
| **Handle token expiration** | Gracefully refresh or re-authenticate |
| **Minimal scope principle** | Request only necessary permissions |

## Additional Resources

[OAuth 2.0 spec](https://www.rfc-editor.org/rfc/rfc6749)