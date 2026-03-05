# Security & Authentication Reference

Comprehensive reference for web security, authentication, encryption, and secure coding practices.

## Web Security Fundamentals

### CIA Triad

Core principles of information security:
- **Confidentiality**: Data accessible only to authorized parties
- **Integrity**: Data remains accurate and unmodified
- **Availability**: Systems and data accessible when needed

### Security Headers

```http
# Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; style-src 'self' 'unsafe-inline'

# HTTP Strict Transport Security
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# X-Frame-Options (clickjacking protection)
X-Frame-Options: DENY

# X-Content-Type-Options (MIME sniffing)
X-Content-Type-Options: nosniff

# X-XSS-Protection (legacy, use CSP instead)
X-XSS-Protection: 1; mode=block

# Referrer-Policy
Referrer-Policy: strict-origin-when-cross-origin

# Permissions-Policy
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### CSP (Content Security Policy)

Mitigates XSS and data injection attacks.

**Directives**:
- `default-src`: Fallback for other directives
- `script-src`: JavaScript sources
- `style-src`: CSS sources
- `img-src`: Image sources
- `font-src`: Font sources
- `connect-src`: Fetch/XMLHttpRequest destinations
- `frame-src`: iframe sources
- `object-src`: Plugin sources

**Values**:
- `'self'`: Same origin
- `'none'`: Block all
- `'unsafe-inline'`: Allow inline scripts/styles (avoid)
- `'unsafe-eval'`: Allow eval() (avoid)
- `https:`: HTTPS sources only
- `https://example.com`: Specific domain

## HTTPS & TLS

### TLS (Transport Layer Security)

Encrypts data in transit between client and server.

**TLS Handshake**:
1. Client Hello (supported versions, cipher suites)
2. Server Hello (chosen version, cipher suite)
3. Server Certificate
4. Key Exchange
5. Finished (connection established)

**Versions**:
- TLS 1.0, 1.1 (deprecated)
- TLS 1.2 (current standard)
- TLS 1.3 (latest, faster)

### SSL Certificates

**Types**:
- **Domain Validated (DV)**: Basic validation
- **Organization Validated (OV)**: Business verification
- **Extended Validation (EV)**: Rigorous verification

**Certificate Authority**: Trusted entity that issues certificates

**Self-Signed**: Not trusted by browsers (dev/testing only)

### HSTS (HTTP Strict Transport Security)

Forces browsers to use HTTPS:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age`: Duration in seconds
- `includeSubDomains`: Apply to all subdomains
- `preload`: Submit to browser preload list

## Authentication

### Authentication vs Authorization

- **Authentication**: Verify identity ("Who are you?")
- **Authorization**: Verify permissions ("What can you do?")

### Common Authentication Methods

#### 1. Session-Based Authentication

```javascript
// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Verify credentials
  if (verifyCredentials(username, password)) {
    req.session.userId = user.id;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected route
app.get('/profile', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  res.json(user);
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
```

**Pros**: Simple, server controls sessions  
**Cons**: Stateful, scalability issues, CSRF vulnerable

#### 2. Token-Based Authentication (JWT)

```javascript
// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (verifyCredentials(username, password)) {
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected route
app.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = getUserById(decoded.userId);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

**Pros**: Stateless, scalable, works across domains  
**Cons**: Can't revoke before expiry, size overhead

#### 3. OAuth 2.0

Authorization framework for delegated access.

**Roles**:
- **Resource Owner**: End user
- **Client**: Application requesting access
- **Authorization Server**: Issues tokens
- **Resource Server**: Hosts protected resources

**Flow Example** (Authorization Code):
1. Client redirects to auth server
2. User authenticates and grants permission
3. Auth server redirects back with code
4. Client exchanges code for access token
5. Client uses token to access resources

#### 4. Multi-Factor Authentication (MFA)

Requires multiple verification factors:
- **Something you know**: Password
- **Something you have**: Phone, hardware token
- **Something you are**: Biometric

### Password Security

```javascript
const bcrypt = require('bcrypt');

// Hash password
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

**Best Practices**:
- ✅ Use bcrypt, scrypt, or Argon2
- ✅ Minimum 8 characters (12+ recommended)
- ✅ Require mix of characters
- ✅ Implement rate limiting
- ✅ Use account lockout after failures
- ❌ Never store plain text passwords
- ❌ Never limit password length (within reason)
- ❌ Never email passwords

## Common Vulnerabilities

### XSS (Cross-Site Scripting)

Injecting malicious scripts into web pages.

**Types**:
1. **Stored XSS**: Malicious script stored in database
2. **Reflected XSS**: Script in URL reflected in response
3. **DOM-based XSS**: Client-side script manipulation

**Prevention**:
```javascript
// ❌ Vulnerable
element.innerHTML = userInput;

// ✅ Safe
element.textContent = userInput;

// ✅ Escape HTML
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (match) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[match];
  });
}

// ✅ Use DOMPurify for rich content
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### CSRF (Cross-Site Request Forgery)

Tricks user into executing unwanted actions.

**Prevention**:
```javascript
// CSRF token
app.get('/form', (req, res) => {
  const csrfToken = generateToken();
  req.session.csrfToken = csrfToken;
  res.render('form', { csrfToken });
});

app.post('/transfer', (req, res) => {
  if (req.body.csrfToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Process request
});

// SameSite cookie attribute
Set-Cookie: sessionId=abc; SameSite=Strict; Secure; HttpOnly
```

### SQL Injection

Injecting malicious SQL code.

**Prevention**:
```javascript
// ❌ Vulnerable
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ Parameterized queries
const query = 'SELECT * FROM users WHERE username = ?';
db.execute(query, [username]);

// ✅ ORM/Query builder
const user = await User.findOne({ where: { username } });
```

### CORS Misconfiguration

```javascript
// ❌ Vulnerable (allows any origin)
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// ✅ Whitelist specific origins
const allowedOrigins = ['https://example.com'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
```

### Clickjacking

Tricking users into clicking hidden elements.

**Prevention**:
```http
X-Frame-Options: DENY
X-Frame-Options: SAMEORIGIN

# Or with CSP
Content-Security-Policy: frame-ancestors 'none'
Content-Security-Policy: frame-ancestors 'self'
```

### File Upload Vulnerabilities

```javascript
// Validate file type
const allowedTypes = ['image/jpeg', 'image/png'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(400).json({ error: 'Invalid file type' });
}

// Check file size
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  return res.status(400).json({ error: 'File too large' });
}

// Sanitize filename
const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, '_');

// Store outside web root
const uploadPath = '/secure/uploads/' + sanitizedName;

// Use random filenames
const filename = crypto.randomBytes(16).toString('hex') + path.extname(file.name);
```

## Cryptography

### Encryption vs Hashing

- **Encryption**: Reversible (decrypt with key)
- **Hashing**: One-way transformation

### Symmetric Encryption

Same key for encryption and decryption.

```javascript
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text, key) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Public-Key Cryptography

Different keys for encryption (public) and decryption (private).

**Use Cases**:
- TLS/SSL certificates
- Digital signatures
- SSH keys

### Hash Functions

```javascript
const crypto = require('crypto');

// SHA-256
const hash = crypto.createHash('sha256').update(data).digest('hex');

// HMAC (keyed hash)
const hmac = crypto.createHmac('sha256', secretKey).update(data).digest('hex');
```

### Digital Signatures

Verify authenticity and integrity.

```javascript
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});

// Sign
const sign = crypto.createSign('SHA256');
sign.update(data);
const signature = sign.sign(privateKey, 'hex');

// Verify
const verify = crypto.createVerify('SHA256');
verify.update(data);
const isValid = verify.verify(publicKey, signature, 'hex');
```

## Secure Coding Practices

### Input Validation

```javascript
// Validate email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validate and sanitize
function sanitizeInput(input) {
  // Remove dangerous characters
  return input.replace(/[<>\"']/g, '');
}

// Whitelist approach
function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}
```

### Output Encoding

Encode data based on context:
- **HTML context**: Escape `< > & " '`
- **JavaScript context**: Use JSON.stringify()
- **URL context**: Use encodeURIComponent()
- **CSS context**: Escape special characters

### Secure Storage

```javascript
// ❌ Don't store sensitive data in localStorage
localStorage.setItem('token', token); // XSS can access

// ✅ Use HttpOnly cookies
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});

// ✅ For sensitive client-side data, encrypt first
const encrypted = encrypt(sensitiveData, encryptionKey);
sessionStorage.setItem('data', encrypted);
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/login', authLimiter);
```

### Error Handling

```javascript
// ❌ Expose internal details
catch (error) {
  res.status(500).json({ error: error.message });
}

// ✅ Generic error message
catch (error) {
  console.error(error); // Log internally
  res.status(500).json({ error: 'Internal server error' });
}
```

## Security Testing

### Tools
- **OWASP ZAP**: Security scanner
- **Burp Suite**: Web vulnerability scanner
- **nmap**: Network scanner
- **SQLMap**: SQL injection testing
- **Nikto**: Web server scanner

### Checklist
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Authentication implemented securely
- [ ] Authorization checked on all endpoints
- [ ] Input validation and sanitization
- [ ] Output encoding
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting
- [ ] Secure session management
- [ ] Secure password storage
- [ ] File upload security
- [ ] Error handling doesn't leak info
- [ ] Dependencies up to date
- [ ] Security logging and monitoring

## Glossary Terms

**Key Terms Covered**:
- Authentication
- Authenticator
- Certificate authority
- Challenge-response authentication
- CIA
- Cipher
- Cipher suite
- Ciphertext
- Credential
- Cross-site request forgery (CSRF)
- Cross-site scripting (XSS)
- Cryptanalysis
- Cryptography
- Decryption
- Denial of Service (DoS)
- Digital certificate
- Digital signature
- Distributed Denial of Service (DDoS)
- Encryption
- Federated identity
- Fingerprinting
- Firewall
- HSTS
- Identity provider (IdP)
- MitM
- Multi-factor authentication
- Nonce
- OWASP
- Plaintext
- Principle of least privilege
- Privileged
- Public-key cryptography
- Relying party
- Replay attack
- Salt
- Secure context
- Secure Sockets Layer (SSL)
- Session hijacking
- Signature (security)
- SQL injection
- Symmetric-key cryptography
- Transport Layer Security (TLS)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/)
