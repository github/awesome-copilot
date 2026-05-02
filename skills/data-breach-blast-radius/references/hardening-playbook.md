# Hardening Playbook

Prioritized controls to reduce data breach blast radius. Controls are organized by **impact category** and include tech-stack-specific implementation patterns. Each control includes a **blast radius reduction estimate**.

> **How to use:** After identifying exposure vectors, match each to a control below. Sort your hardening roadmap by `(Blast_Radius_Reduction × Severity) / Effort`.

---

## Control Priority Matrix

| Priority | Control | Blast Radius Reduction | Effort | Category |
|----------|---------|----------------------|--------|---------|
| P0 | Fix IDOR/BOLA — add ownership checks | 90% for affected vector | Low | Authorization |
| P0 | Remove sensitive fields from API responses | 85% for affected fields | Low | Data Minimization |
| P0 | Revoke publicly accessible storage (S3/Blob) | 100% for affected store | Low | Access Control |
| P0 | Remove plaintext credentials from code/logs | 100% for affected secret | Low | Secrets |
| P1 | Add field-level encryption for T1 data | 80% for encrypted fields | Medium | Encryption |
| P1 | Mask/tokenize PCI card data | 95% for card exposure | Medium | Tokenization |
| P1 | Remove PII from log statements | 70% for log exposure | Medium | Logging |
| P1 | Add authentication to unauthenticated endpoints | 95% for exposed endpoints | Low | Authentication |
| P2 | Implement data access audit logging | -50% detection time | Medium | Monitoring |
| P2 | Enable database activity monitoring | -60% detection time | Medium | Monitoring |
| P2 | Add rate limiting to sensitive endpoints | 60% reduction in data harvesting | Low | Rate Limiting |
| P2 | Column-level encryption for T2 sensitive data | 70% for encrypted columns | Medium | Encryption |
| P3 | Implement data retention + auto-deletion | 40% reduction in stale data exposure | High | Data Lifecycle |
| P3 | Separate analytics store from production PII | 60% for analytics breach | High | Architecture |
| P3 | Pseudonymize behavioral tracking data | 70% for behavioral data | Medium | Pseudonymization |

---

## P0 — Fix Immediately (< 1 day)

### 1. Fix Authorization: IDOR / BOLA

**What it fixes:** Broken Object Level Authorization — users can access other users' data by changing an ID.

**Detection pattern in code:**
```python
# VULNERABLE — no ownership check
@app.get("/api/orders/{order_id}")
def get_order(order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()

# SECURE — ownership check
@app.get("/api/orders/{order_id}")
def get_order(order_id: int, current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id  # ownership check
    ).first()
    if not order:
        raise HTTPException(status_code=404)
    return order
```

```typescript
// VULNERABLE
app.get('/api/users/:id/profile', authenticate, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// SECURE
app.get('/api/users/:id/profile', authenticate, async (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

```csharp
// VULNERABLE
[HttpGet("orders/{orderId}")]
public async Task<IActionResult> GetOrder(int orderId)
{
    var order = await _db.Orders.FindAsync(orderId);
    return Ok(order);
}

// SECURE
[HttpGet("orders/{orderId}")]
[Authorize]
public async Task<IActionResult> GetOrder(int orderId)
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var order = await _db.Orders
        .Where(o => o.Id == orderId && o.UserId == userId)
        .FirstOrDefaultAsync();
    if (order == null) return NotFound();
    return Ok(order);
}
```

---

### 2. Remove Sensitive Fields from API Responses

**What it fixes:** Over-fetching — APIs return more data than the client needs.

**Pattern:**
```typescript
// VULNERABLE — returns all fields including passwordHash, ssn
const user = await User.findById(id);
res.json(user);

// SECURE — explicit projection
const user = await User.findById(id).select('id name email createdAt');
res.json(user);
```

```python
# SECURE — Pydantic response model (FastAPI)
class UserPublicResponse(BaseModel):
    id: int
    name: str
    email: str
    # NOTE: password_hash, ssn, date_of_birth NOT included

@app.get("/api/users/{id}", response_model=UserPublicResponse)
def get_user(id: int):
    return db.query(User).filter(User.id == id).first()
```

```java
// SECURE — DTO with @JsonIgnore
public class UserResponse {
    public String id;
    public String name;
    public String email;
    // passwordHash, ssn not included in DTO
}
```

---

### 3. Remove Plaintext Credentials from Code

**Detection patterns:**
```
# Patterns to search for in all files:
password\s*=\s*["'][^"']+["']
api_key\s*=\s*["'][^"']+["']
secret\s*=\s*["'][^"']+["']
token\s*=\s*["'][^"']+["']
connectionString\s*=\s*["'][^"']+["']
```

**Fix pattern:**
```python
# VULNERABLE
DATABASE_URL = "postgresql://user:p@ssw0rd@prod-db.example.com/mydb"

# SECURE
import os
DATABASE_URL = os.environ.get("DATABASE_URL")
# In production: use Azure Key Vault, AWS Secrets Manager, or GCP Secret Manager
```

---

## P1 — Fix This Week

### 4. Field-Level Encryption for Tier 1 Data

Encrypt sensitive fields **before** storing them. The encryption key lives in a KMS, not in the database.

**Python / SQLAlchemy + Azure Key Vault:**
```python
from azure.keyvault.secrets import SecretClient
from cryptography.fernet import Fernet

# Encrypt at write time
def encrypt_field(value: str, key: bytes) -> str:
    f = Fernet(key)
    return f.encrypt(value.encode()).decode()

# Decrypt at read time (only when authorized)
def decrypt_field(encrypted_value: str, key: bytes) -> str:
    f = Fernet(key)
    return f.decrypt(encrypted_value.encode()).decode()
```

**Node.js / Prisma + AWS KMS:**
```typescript
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

async function encryptField(plaintext: string): Promise<string> {
  const { CiphertextBlob } = await kms.send(new EncryptCommand({
    KeyId: process.env.KMS_KEY_ARN,
    Plaintext: Buffer.from(plaintext),
  }));
  return Buffer.from(CiphertextBlob!).toString('base64');
}
```

**C# / EF Core + Azure Key Vault:**
```csharp
// Use Always Encrypted for SQL Server / Azure SQL
// Or manually encrypt with Azure Key Vault
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
        sqlOptions.EnableSensitiveDataLogging(false)));

// In entity:
[Column(TypeName = "nvarchar(500)")]
public string EncryptedSsn { get; set; } // store Base64 ciphertext
```

**Fields that MUST be field-encrypted (Tier 1):**
- SSN / national ID numbers
- Passport numbers
- Full payment card numbers (better: use tokenization, see below)
- Medical record data / diagnoses
- Biometric templates

---

### 5. Tokenize Payment Card Data

**Never store full card numbers.** Use a PCI-compliant vault instead.

**Recommended providers:**
- Stripe (tokenizes via Elements/PaymentIntents — you never touch card numbers)
- Braintree / PayPal
- Adyen
- Square

**Pattern:**
```typescript
// CORRECT — use Stripe's tokenization
const paymentMethod = await stripe.paymentMethods.create({
  type: 'card',
  card: { token: cardToken }, // token from client-side Stripe.js
});
// Store: paymentMethod.id (token) — never the card number

// WRONG — never do this
const cardNumber = req.body.cardNumber; // Tier 2 PCI-DSS violation
await db.save({ userId, cardNumber });   // DO NOT store raw card data
```

---

### 6. Remove PII from Log Statements

**Pattern to search for and fix:**
```python
# VULNERABLE
logger.info(f"User {user.email} logged in")
logger.debug(f"Payment by {user.full_name}, card ending {card_last4}")

# SECURE — log opaque identifiers, not PII
logger.info(f"User {user.id} authenticated", extra={"user_id": user.id})
logger.debug(f"Payment processed", extra={"user_id": user.id, "payment_id": payment_id})
```

```typescript
// VULNERABLE
console.log(`Processing order for ${user.email} at ${user.address}`);

// SECURE
logger.info('Processing order', { userId: user.id, orderId: order.id });
```

**Structured logging fields that are SAFE to log:**
- Internal user ID (UUID/opaque)
- Session ID (if short-lived and not externally shared)
- Transaction/correlation IDs
- Error codes and error types
- Timestamps
- HTTP status codes
- Duration/latency

**Structured logging fields that are UNSAFE:**
- Email addresses
- IP addresses (must be masked — last octet)
- Full names
- Phone numbers
- Any Tier 1–3 sensitive fields

---

## P2 — Fix This Sprint

### 7. Implement Data Access Audit Logging

Every read/write of Tier 1 and Tier 2 data must be logged to an immutable audit log.

**What to log:**
```
{
  timestamp: ISO8601,
  actor_id: "user UUID",
  actor_role: "admin|user|service",
  action: "READ|WRITE|DELETE|EXPORT",
  resource_type: "User|HealthRecord|PaymentMethod",
  resource_id: "UUID of accessed record",
  fields_accessed: ["email", "phone"],  // NOT the values
  ip_address: "masked IP",
  result: "success|denied",
  correlation_id: "request trace ID"
}
```

**Do NOT log the actual sensitive field values in the audit log.**

**Separation:** Store audit logs in a **separate** database/storage account with stricter access controls than the application database.

---

### 8. Rate Limit Sensitive Endpoints

Prevents automated bulk data harvesting even if an auth vulnerability exists.

```typescript
// Express + express-rate-limit
import rateLimit from 'express-rate-limit';

// Aggressive limit for data export endpoint
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 exports per hour per IP
  message: 'Too many export requests'
});

// Standard limit for data lookup
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

app.get('/api/export', exportLimiter, authMiddleware, exportController);
app.get('/api/users/:id', lookupLimiter, authMiddleware, userController);
```

---

## P3 — Fix This Quarter

### 9. Implement Data Retention and Auto-Deletion

**Every table with personal data must have a defined retention policy.**

```sql
-- Add retention column to all PII tables
ALTER TABLE users ADD COLUMN retention_expires_at TIMESTAMP;
ALTER TABLE health_records ADD COLUMN retention_expires_at TIMESTAMP;

-- Set retention at insert time
INSERT INTO users (email, retention_expires_at) 
VALUES ($1, NOW() + INTERVAL '7 years');

-- Scheduled job to hard-delete expired records (or anonymize)
DELETE FROM users 
WHERE retention_expires_at < NOW() 
AND deletion_notified_at IS NOT NULL; -- ensure user was notified
```

**Python scheduled cleanup:**
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

async def purge_expired_records():
    await db.execute(
        "DELETE FROM user_sessions WHERE expires_at < NOW()"
    )
    # Anonymize users (don't delete if financial records must be retained)
    await db.execute("""
        UPDATE users SET 
            email = CONCAT('deleted_', id, '@redacted.invalid'),
            phone = NULL,
            address = NULL,
            date_of_birth = NULL
        WHERE retention_expires_at < NOW() AND deleted_at IS NULL
    """)

scheduler = AsyncIOScheduler()
scheduler.add_job(purge_expired_records, 'cron', hour=2)  # 2 AM daily
scheduler.start()
```

---

### 10. Pseudonymize Behavioral and Analytics Data

Replace direct user identifiers in analytics with pseudonymous tokens.

```python
import hashlib
import hmac

PSEUDONYM_SALT = os.environ.get("PSEUDONYM_SALT")  # stored in Key Vault

def pseudonymize_user_id(real_user_id: str) -> str:
    """
    One-way: analyst can track behavior across sessions 
    but cannot identify the real user without the salt.
    """
    return hmac.new(
        PSEUDONYM_SALT.encode(), 
        real_user_id.encode(), 
        hashlib.sha256
    ).hexdigest()

# In analytics event
analytics.track({
    "user_id": pseudonymize_user_id(user.id),  # NOT real user ID
    "event": "page_viewed",
    "page": request.path,
    "timestamp": datetime.utcnow().isoformat()
})
```

---

## Quick Win Checklist (Complete in < 1 day)

- [ ] Search all files for hardcoded secrets → move to env vars / Key Vault
- [ ] Check all `SELECT *` queries → add explicit column list excluding sensitive fields
- [ ] Verify storage buckets/containers → block public access
- [ ] Remove `console.log` / `logger.debug` calls that print request bodies
- [ ] Add `HttpOnly; Secure; SameSite=Strict` to all session cookies
- [ ] Verify that `/api/admin/*` routes require admin role check
- [ ] Confirm password reset tokens expire in < 15 minutes
- [ ] Check that 500 error responses don't include stack traces in production
- [ ] Verify `.env` and secret files are in `.gitignore`
- [ ] Run `git log --all --full-history -- "*.env"` to check for historical secret commits

---

## Blast Radius Reduction by Control Applied

When reporting the hardening roadmap, use these estimates:

| Control Applied | Blast Radius Reduction | Justification |
|----------------|----------------------|---------------|
| Fix all IDOR vulnerabilities | 80–90% | Most breach scenarios exploit authorization flaws |
| Field encryption for T1 data | 75–85% | Encrypted data is useless without KMS key |
| Remove PII from logs | 40–60% | Log access is often less controlled than DB access |
| Tokenize payment data | 95% for card data | Standard PCI-DSS compliance eliminates card data scope |
| Rate limit data endpoints | 30–50% | Limits scale of automated harvesting attacks |
| Data retention enforcement | 20–40% | Reduces "data lake" effect — less data to steal |
| Audit logging + anomaly detection | 0% prevention, but -60% detection time | Breaches are caught faster |
| Pseudonymization of analytics | 60–70% for analytics data | Analytics data decoupled from identity |
| Architecture: separate analytics from PII | 50–70% | Breach of analytics store has no PII value |
