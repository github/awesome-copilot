# Identity & Auth

## User IDs

| Aspect | Slack | Teams |
|---|---|---|
| Format | Prefixed strings: `U...` (user), `C...` (channel), `T...` (team), `B...` (bot) | GUIDs: AAD object IDs, opaque conversation IDs |
| User identity | `message.user` → Slack user ID | `activity.from.id` → AAD object ID |
| Cross-reference | `users.info({ user })` → email, display name | `userGraph.me()` → email, display name |
| Channel identity | `channel_id` (flat namespace) | `conversation.id` (scoped to team) |

**Rating:** RED — IDs are completely incompatible. No conversion formula exists.

### Impact

Any stored data keyed by Slack user/channel IDs (preferences, history, permissions) cannot be directly used with Teams IDs. A mapping layer is required.

### Mitigation Strategy

Use **email** as the common identity attribute:

1. Build a mapping table: `Slack user ID → email → AAD Object ID`
2. Populate from Slack's `users.info()` and Teams' Graph API `users/{id}`
3. Re-key stored data during migration
4. For new dual-platform bots, key data by email from the start

Effort: 8–16 hrs depending on data volume.

---

## Authentication & Signing

| Aspect | Slack | Teams |
|---|---|---|
| Request verification | `signingSecret` — HMAC-SHA256 of `v0:{timestamp}:{body}` | Bot Framework JWT — automatic validation by SDK |
| Manual verification | Required if using raw HTTP | Required only without SDK (REST-only integration) |
| Bot credentials | `SLACK_BOT_TOKEN` (xoxb-...) | `CLIENT_ID` + `CLIENT_SECRET` + `TENANT_ID` |
| App-level token | `SLACK_APP_TOKEN` (xapp-..., Socket Mode only) | Not applicable |

**Rating:** GREEN — both SDKs handle verification automatically.

**Mitigation:** No code changes needed when using SDKs. Both handle signing/verification internally. For REST-only integrations, see the verification patterns below.

### REST-Only Verification

**Slack (manual HMAC):**
```
signature = HMAC-SHA256(signingSecret, "v0:{timestamp}:{rawBody}")
compare with X-Slack-Signature header
reject if timestamp > 5 minutes old
```

**Teams (manual JWT):**
```
fetch OpenID config from https://login.botframework.com/v1/.well-known/openidconfiguration
validate JWT from Authorization header
verify audience = your bot's CLIENT_ID
verify issuer = https://api.botframework.com
```

---

## OAuth & Tokens

| Aspect | Slack | Teams |
|---|---|---|
| User OAuth | `users:read`, `chat:write`, etc. scopes | Azure AD Graph permissions (delegated) |
| Bot token | `xoxb-...` (per-workspace) | Bot Framework token (per-tenant, auto-managed) |
| Token storage | `InstallationStore` (per-workspace bot+user tokens) | Not needed — SDK handles token lifecycle |
| SSO | Not native — redirect flow | Built-in with `oauth: { defaultConnectionName }` |
| Sign-in flow | OAuth redirect to Slack authorize URL | `ctx.signin()` sends OAuth card in chat |
| Sign-out | Revoke token via API | `ctx.signout()` |
| Multi-tenant | `InstallationStore` with per-workspace tokens | `signInAudience: "AzureADMultipleOrgs"` in Azure AD |

**Rating:** YELLOW — both support OAuth but the flows and storage models differ significantly.

### Key Difference

Slack requires per-workspace token management via `InstallationStore`. Teams SDK manages tokens automatically — you just configure `clientId`, `clientSecret`, `tenantId`, and `oauth.defaultConnectionName`.

### Mitigation (Slack → Teams)

1. Remove `InstallationStore` (not needed)
2. Register an OAuth connection in Azure Bot resource settings
3. Add `oauth: { defaultConnectionName: "graph" }` to App constructor
4. Guard handlers with `ctx.isSignedIn` check
5. Call `ctx.signin()` when authentication is needed

### Mitigation (Teams → Slack)

1. Implement `InstallationStore` for per-workspace token storage
2. Configure OAuth scopes in Slack app settings
3. Set up `InstallProvider` for the OAuth install flow
4. Store bot and user tokens per workspace
5. Use stored tokens for API calls via `WebClient`

### Slack OAuth Scopes → Teams Graph Permissions

| Slack Scope | Teams Graph Permission | Notes |
|---|---|---|
| `users:read` | `User.Read` (delegated) | |
| `users:read.email` | `User.Read` (delegated) | Email included by default |
| `chat:write` | Bot sends via SDK (no permission) | |
| `channels:read` | `Channel.ReadBasic.All` | |
| `channels:history` | `ChannelMessage.Read.All` | |
| `files:read` | `Files.Read` | |
| `files:write` | `Files.ReadWrite` | |
