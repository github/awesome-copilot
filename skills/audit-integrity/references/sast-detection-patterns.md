# SAST Detection Patterns

This reference document provides static analysis detection patterns and taint sinks across core flaw categories and language ecosystems.

## Flaw Categories and CWE Mappings

### Injection Flaws

- **SQL Injection (CWE-89)**: String concatenation or string interpolation in database queries, unsanitized ORM raw queries, and dynamic SQL in utilities or repositories.
- **LDAP Injection (CWE-90)**: Unsanitized input in directory lookups.
- **XML External Entity (XXE) (CWE-611)**: XML parsers without secure processing or external entity resolution disabled.
- **Command Injection (CWE-77)**: Unsanitized input passed to system commands.
- **OS Command Injection (CWE-78)**: User data executed directly in shell interpreters.
- **Code Injection (CWE-94)**: User data executed in dynamic script evaluation.
- **Log Injection (CWE-117)**: Unsanitized user data written directly to log streams.
- **HTTP Response Splitting (CWE-113)**: User-controlled data in HTTP response headers.

### Cryptographic Weaknesses

- **Broken Cryptographic Algorithm (CWE-327)**: Use of MD5, SHA1, DES, or RC4 for security operations.
- **Insufficient Key Size (CWE-326)**: RSA keys smaller than 2048 bits or AES keys smaller than 128 bits.
- **Hardcoded Cryptographic Key (CWE-321)**: Embedded cryptographic keys, certificates, or private key files in repositories.
- **Predictable Random Value (CWE-338)**: Pseudo-random number generators used for security tokens or session IDs.
- **Cleartext Storage of Sensitive Information (CWE-312)**: Plaintext secrets stored in files or databases.
- **Cleartext Transmission of Sensitive Information (CWE-319)**: Insecure HTTP connections for sensitive data transfer.

### Authentication and Session Management

- **Improper Authentication (CWE-287)**: Missing or bypassable authentication controls.
- **Use of Hardcoded Credentials (CWE-798)**: Passwords, API tokens, or secrets embedded in source code.
- **Session Fixation (CWE-384)**: Session identifiers not renewed after user login.
- **Sensitive Cookie Without HttpOnly Flag (CWE-1004)**: Authentication cookies accessible via JavaScript.
- **Sensitive Cookie Without Secure Attribute (CWE-614)**: Cookies transmitted over unencrypted HTTP.
- **Weak Password Policy (CWE-521)**: Absence of complexity or length validation for user passwords.

### Authorization Flaws

- **Improper Authorization (CWE-285)**: Missing role or privilege checks on protected operations.
- **Insecure Direct Object References (IDOR/BOLA) (CWE-639)**: Record access based on user-controlled keys without ownership validation.
- **Path Traversal (CWE-22)**: File access using unsanitized user-supplied paths.

### Input Handling

- **Cross-Site Scripting (XSS) (CWE-79)**: Unsanitized input rendered in web browsers.
- **Cross-Site Request Forgery (CSRF) (CWE-352)**: State-changing requests lacking validation tokens.
- **Server-Side Request Forgery (SSRF) (CWE-918)**: Server requests initiated to untrusted external or internal network destinations.
- **Open Redirect (CWE-601)**: User-controlled target URLs in HTTP redirects.
- **Permissive CORS Policy (CWE-942)**: Overly permissive Cross-Origin Resource Sharing headers.
- **Improper Input Validation (CWE-20)**: Missing type, boundary, or format verification at trust boundaries.

### Resource Management and Denial of Service

- **Improper Resource Shutdown (CWE-404)**: Unreleased database connections, memory, or file handles.
- **Allocation Without Limits (CWE-770)**: Missing rate limiting or unrestricted file upload sizes.
- **Race Condition (TOCTOU) (CWE-367)**: File status verification separated from file operation.
- **Regular Expression Denial of Service (ReDoS) (CWE-1333)**: Catastrophic backtracking in regex patterns.

### Deserialization

- **Deserialization of Untrusted Data (CWE-502)**: Insecure object serialization libraries processing unvalidated input.

### AI and Large Language Model Security

- **Prompt Injection (CWE-1427)**: Unsanitized user inputs concatenated into LLM system prompts.
- **Improper Output Validation (CWE-1426)**: LLM generated content executed directly in dangerous sinks.
- **Insecure Inference Parameters (CWE-1434)**: Excessive temperature settings causing uncontrolled model output.

---

## Language-Specific Detection Patterns

### C# and .NET

- `SqlCommand` with concatenated text -> SQL Injection (CWE-89)
- `Process.Start` with user arguments -> OS Command Injection (CWE-78)
- `BinaryFormatter.Deserialize` -> Insecure Deserialization (CWE-502)
- `XmlReader` without secure settings -> XML External Entity Reference (CWE-611)
- `MD5.Create()` or `SHA1.Create()` -> Broken Cryptographic Algorithm (CWE-327)
- `new Random()` for security tokens -> Predictable Random Value (CWE-338)
- Embedded `.pem` or `.pfx` files -> Hardcoded Cryptographic Key (CWE-321)
- Cookie options missing `HttpOnly` -> Missing HttpOnly Flag (CWE-1004)
- Cookie options missing `Secure` -> Missing Secure Attribute (CWE-614)
- `Response.Redirect` with untrusted parameter -> Open Redirect (CWE-601)
- Controller actions missing `[Authorize]` attribute -> Improper Authorization (CWE-285)
- Plaintext secrets in `appsettings.json` -> Hardcoded Credentials (CWE-798)

### JavaScript and TypeScript

- Template literals in SQL query functions -> SQL Injection (CWE-89)
- `eval()` or `new Function()` with input -> Code Injection (CWE-94)
- `res.redirect()` with input parameter -> Open Redirect (CWE-601)
- Assigning untrusted input to `innerHTML` -> Cross-Site Scripting (CWE-79)
- `Math.random()` used for security tokens -> Predictable Random Value (CWE-338)
- Missing Content Security Policy or helmet headers -> Security Misconfiguration
- Dynamic `require(userInput)` statements -> Inclusion of Untrusted Functionality (CWE-829)
- Hardcoded API keys or secrets in `.env` -> Hardcoded Credentials (CWE-798)

### Python

- `cursor.execute()` with formatted strings -> SQL Injection (CWE-89)
- `subprocess.call()` with `shell=True` -> OS Command Injection (CWE-78)
- `pickle.loads()` or `yaml.load()` -> Insecure Deserialization (CWE-502)
- `hashlib.md5()` for passwords -> Broken Cryptographic Algorithm (CWE-327)
- `random.random()` used for tokens -> Predictable Random Value (CWE-338)
- `app.debug = True` in production configurations -> Sensitive Information Leakage (CWE-215)
- High `temperature` inference settings -> Insecure Inference Parameters (CWE-1434)
- String formatting in LLM prompt templates -> Prompt Injection (CWE-1427)

### Java and Kotlin

- `Statement.executeQuery()` with string concatenation -> SQL Injection (CWE-89)
- `Runtime.getRuntime().exec()` with user input -> OS Command Injection (CWE-78)
- `ObjectInputStream.readObject()` -> Insecure Deserialization (CWE-502)
- `MessageDigest.getInstance("MD5")` -> Broken Cryptographic Algorithm (CWE-327)
- Endpoints missing `@PreAuthorize` or `@Secured` -> Improper Authorization (CWE-285)
- `DocumentBuilderFactory` without `FEATURE_SECURE_PROCESSING` -> XML External Entity Reference (CWE-611)

### PowerShell

- `Invoke-Expression` with user arguments -> Code Injection (CWE-94)
- `Invoke-SqlCmd` with concatenated query -> SQL Injection (CWE-89)
- Embedded credentials in `.ps1` files -> Hardcoded Credentials (CWE-798)
- `DownloadFile` without certificate verification -> Insecure Certificate Validation (CWE-295)
- `Start-Process` with user input -> OS Command Injection (CWE-78)
