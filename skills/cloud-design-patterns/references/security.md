# Security Patterns

## Federated Identity Pattern

**Problem**: Applications must manage user authentication and authorization.

**Solution**: Delegate authentication to an external identity provider.

**When to Use**:
- Implementing single sign-on (SSO)
- Reducing authentication complexity
- Supporting social identity providers

**Implementation Considerations**:
- Use Azure AD, Auth0, or other identity providers
- Implement OAuth 2.0, OpenID Connect, or SAML
- Store minimal user data locally
- Handle identity provider outages gracefully
- Implement proper token validation

## Quarantine Pattern

**Problem**: External assets may contain malicious content or vulnerabilities.

**Solution**: Ensure that external assets meet a team-agreed quality level before the workload consumes them.

**When to Use**:
- Processing user-uploaded files
- Consuming external data or packages
- Implementing zero-trust architectures

**Implementation Considerations**:
- Scan all external content before use (malware, vulnerabilities)
- Isolate quarantine environment from production
- Define clear quality gates for release
- Implement automated scanning and validation
- Log all quarantine activities for audit

## Valet Key Pattern

**Problem**: Applications shouldn't proxy all client data access.

**Solution**: Use a token or key that provides clients with restricted direct access to a specific resource or service.

**When to Use**:
- Providing direct access to storage without proxying
- Minimizing data transfer through application tier
- Implementing time-limited or constrained access

**Implementation Considerations**:
- Generate SAS tokens or pre-signed URLs
- Set appropriate expiration times
- Limit permissions (read-only, write-only, specific operations)
- Implement token revocation if needed
- Monitor usage of valet keys
