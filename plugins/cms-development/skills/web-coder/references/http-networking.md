# HTTP & Networking Reference

Comprehensive reference for HTTP protocol, networking concepts, and web communication.

## HTTP (HyperText Transfer Protocol)

Protocol for transferring hypertext between client and server. Foundation of data communication on the web.

### HTTP Versions

- **HTTP/1.1** (1997): Text-based, persistent connections, pipelining
- **HTTP/2** (2015): Binary protocol, multiplexing, server push, header compression
- **HTTP/3** (2022): Based on QUIC (UDP), improved performance, better handling of packet loss

## Request Methods

| Method | Purpose | Idempotent | Safe | Cacheable |
|--------|---------|------------|------|-----------|
| GET | Retrieve resource | Yes | Yes | Yes |
| POST | Create resource | No | No | Rarely |
| PUT | Update/replace resource | Yes | No | No |
| PATCH | Partial update | No | No | No |
| DELETE | Delete resource | Yes | No | No |
| HEAD | Like GET but no body | Yes | Yes | Yes |
| OPTIONS | Get allowed methods | Yes | Yes | No |
| CONNECT | Establish tunnel | No | No | No |
| TRACE | Echo request | Yes | Yes | No |

**Safe**: Doesn't modify server state  
**Idempotent**: Multiple identical requests have same effect as single request

## Status Codes

### 1xx Informational

| Code | Message | Meaning |
|------|---------|---------|
| 100 | Continue | Client should continue request |
| 101 | Switching Protocols | Server switching protocols |

### 2xx Success

| Code | Message | Meaning |
|------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 202 | Accepted | Accepted but not processed |
| 204 | No Content | Success but no content to return |
| 206 | Partial Content | Partial resource (range request) |

### 3xx Redirection

| Code | Message | Meaning |
|------|---------|---------|
| 301 | Moved Permanently | Resource permanently moved |
| 302 | Found | Temporary redirect |
| 303 | See Other | Response at different URI |
| 304 | Not Modified | Resource not modified (cache) |
| 307 | Temporary Redirect | Like 302 but keep method |
| 308 | Permanent Redirect | Like 301 but keep method |

### 4xx Client Errors

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Bad Request | Invalid syntax |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | Method not supported |
| 408 | Request Timeout | Request took too long |
| 409 | Conflict | Request conflicts with state |
| 410 | Gone | Resource permanently gone |
| 413 | Payload Too Large | Request body too large |
| 414 | URI Too Long | URI too long |
| 415 | Unsupported Media Type | Media type not supported |
| 422 | Unprocessable Entity | Semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Message | Meaning |
|------|---------|---------|
| 500 | Internal Server Error | Generic server error |
| 501 | Not Implemented | Method not supported |
| 502 | Bad Gateway | Invalid response from upstream |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream timeout |
| 505 | HTTP Version Not Supported | HTTP version not supported |

## HTTP Headers

### Request Headers

```http
GET /api/users HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: application/json, text/plain
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate, br
Authorization: Bearer token123
Cookie: sessionId=abc123
If-None-Match: "etag-value"
If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT
Origin: https://example.com
Referer: https://example.com/page
```

**Common Request Headers**:
- `Accept`: Media types client accepts
- `Accept-Encoding`: Encoding formats (compression)
- `Accept-Language`: Preferred languages
- `Authorization`: Authentication credentials
- `Cache-Control`: Caching directives
- `Cookie`: Cookies sent to server
- `Content-Type`: Type of request body
- `Host`: Target host and port
- `If-Modified-Since`: Conditional request
- `If-None-Match`: Conditional request (ETag)
- `Origin`: Origin of request (CORS)
- `Referer`: Previous page URL
- `User-Agent`: Client information

### Response Headers

```http
HTTP/1.1 200 OK
Date: Mon, 04 Mar 2026 12:00:00 GMT
Server: nginx/1.18.0
Content-Type: application/json; charset=utf-8
Content-Length: 348
Content-Encoding: gzip
Cache-Control: public, max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Mon, 04 Mar 2026 11:00:00 GMT
Access-Control-Allow-Origin: *
Set-Cookie: sessionId=xyz789; HttpOnly; Secure; SameSite=Strict
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

**Common Response Headers**:
- `Access-Control-*`: CORS headers
- `Cache-Control`: Caching directives
- `Content-Encoding`: Content compression
- `Content-Length`: Body size in bytes
- `Content-Type`: Media type of body
- `Date`: Response date/time
- `ETag`: Resource version identifier
- `Expires`: Expiration date
- `Last-Modified`: Last modification date
- `Location`: Redirect URL
- `Server`: Server software
- `Set-Cookie`: Set cookies
- `Strict-Transport-Security`: HSTS
- `X-Content-Type-Options`: MIME type sniffing
- `X-Frame-Options`: Clickjacking protection

## CORS (Cross-Origin Resource Sharing)

Mechanism to allow cross-origin requests.

### Simple Requests

Automatically allowed if:
- Method: GET, HEAD, or POST
- Safe headers only
- Content-Type: `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

### Preflight Requests

For complex requests, browser sends OPTIONS request first:

```http
OPTIONS /api/users HTTP/1.1
Origin: https://example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### CORS Headers

**Request**:
- `Origin`: Request origin
- `Access-Control-Request-Method`: Intended method
- `Access-Control-Request-Headers`: Intended headers

**Response**:
- `Access-Control-Allow-Origin`: Allowed origins (* or specific)
- `Access-Control-Allow-Methods`: Allowed methods
- `Access-Control-Allow-Headers`: Allowed headers
- `Access-Control-Allow-Credentials`: Allow credentials
- `Access-Control-Max-Age`: Preflight cache duration
- `Access-Control-Expose-Headers`: Headers accessible to client

## Caching

### Cache-Control Directives

**Request Directives**:
- `no-cache`: Validate with server before using cache
- `no-store`: Don't cache at all
- `max-age=N`: Max age in seconds
- `max-stale=N`: Accept stale response up to N seconds
- `min-fresh=N`: Fresh for at least N seconds
- `only-if-cached`: Use only cached response

**Response Directives**:
- `public`: Cacheable by any cache
- `private`: Cacheable by browser only
- `no-cache`: Must validate before use
- `no-store`: Don't cache
- `max-age=N`: Fresh for N seconds
- `s-maxage=N`: Max age for shared caches
- `must-revalidate`: Must validate when stale
- `immutable`: Content won't change

### Examples

```http
# Cache for 1 hour
Cache-Control: public, max-age=3600

# Don't cache
Cache-Control: no-store

# Cache in browser only, revalidate after 1 hour
Cache-Control: private, max-age=3600, must-revalidate

# Cache forever (with versioned URLs)
Cache-Control: public, max-age=31536000, immutable
```

### Conditional Requests

Use ETags or Last-Modified for efficient caching:

```http
GET /resource HTTP/1.1
If-None-Match: "etag-value"
If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT
```

If not modified:
```http
HTTP/1.1 304 Not Modified
ETag: "etag-value"
```

## Cookies

```http
# Server sets cookie
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

# Client sends cookie
Cookie: sessionId=abc123; userId=456
```

### Cookie Attributes

- `Path=/`: Cookie path scope
- `Domain=example.com`: Cookie domain scope
- `Max-Age=N`: Expire after N seconds
- `Expires=date`: Expire at specific date
- `Secure`: Only sent over HTTPS
- `HttpOnly`: Not accessible via JavaScript
- `SameSite=Strict|Lax|None`: CSRF protection

## REST (Representational State Transfer)

Architectural style for web services.

### REST Principles

1. **Client-Server**: Separation of concerns
2. **Stateless**: Each request contains all needed info
3. **Cacheable**: Responses must define cacheability
4. **Uniform Interface**: Standardized communication
5. **Layered System**: Client doesn't know if connected to end server
6. **Code on Demand** (optional): Server can send executable code

### RESTful API Design

```
GET    /users           # List users
GET    /users/123       # Get user 123
POST   /users           # Create user
PUT    /users/123       # Update user 123 (full)
PATCH  /users/123       # Update user 123 (partial)
DELETE /users/123       # Delete user 123

GET    /users/123/posts # List posts by user 123
GET    /posts?author=123 # Alternative: filter posts
```

### HTTP Content Negotiation

```http
# Client requests JSON
Accept: application/json

# Server responds with JSON
Content-Type: application/json

# Client can accept multiple formats
Accept: application/json, application/xml;q=0.9, text/plain;q=0.8
```

## Networking Fundamentals

### TCP (Transmission Control Protocol)

Connection-oriented protocol ensuring reliable data delivery.

**TCP Handshake** (3-way):
1. Client → Server: SYN
2. Server → Client: SYN-ACK
3. Client → Server: ACK

**Features**:
- Reliable delivery (retransmission)
- Ordered data
- Error checking
- Flow control
- Connection-oriented

### UDP (User Datagram Protocol)

Connectionless protocol for fast data transmission.

**Features**:
- Fast (no handshake)
- No guaranteed delivery
- No ordering
- Lower overhead
- Used for streaming, gaming, DNS

### DNS (Domain Name System)

Translates domain names to IP addresses.

```
example.com → 93.184.216.34
```

**DNS Record Types**:
- `A`: IPv4 address
- `AAAA`: IPv6 address
- `CNAME`: Canonical name (alias)
- `MX`: Mail exchange
- `TXT`: Text record
- `NS`: Name server

### IP Addressing

**IPv4**: `192.168.1.1` (32-bit)  
**IPv6**: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` (128-bit)

### Ports

- **Well-known ports** (0-1023):
  - 80: HTTP
  - 443: HTTPS
  - 21: FTP
  - 22: SSH
  - 25: SMTP
  - 53: DNS
- **Registered ports** (1024-49151)
- **Dynamic ports** (49152-65535)

### Bandwidth & Latency

**Bandwidth**: Amount of data transferred per unit time (Mbps, Gbps)  
**Latency**: Time delay in data transmission (milliseconds)

**Round Trip Time (RTT)**: Time for request to reach server and response to return

## WebSockets

Full-duplex communication over single TCP connection.

```javascript
// Client
const ws = new WebSocket('wss://example.com/socket');

ws.onopen = () => {
  console.log('Connected');
  ws.send('Hello server!');
};

ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

ws.onerror = (error) => {
  console.error('Error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};

// Close connection
ws.close();
```

**Use Cases**: Chat, real-time updates, gaming, collaborative editing

## Server-Sent Events (SSE)

Server pushes updates to client over HTTP.

```javascript
// Client
const eventSource = new EventSource('/events');

eventSource.onmessage = (event) => {
  console.log('New message:', event.data);
};

eventSource.addEventListener('custom-event', (event) => {
  console.log('Custom event:', event.data);
});

eventSource.onerror = (error) => {
  console.error('Error:', error);
};

// Close connection
eventSource.close();
```

```http
// Server response
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: First message

data: Second message

event: custom-event
data: Custom message data
```

## Best Practices

### Do's
- ✅ Use HTTPS everywhere
- ✅ Implement proper caching strategies
- ✅ Use appropriate HTTP methods
- ✅ Return meaningful status codes
- ✅ Implement rate limiting
- ✅ Use compression (gzip, brotli)
- ✅ Set proper CORS headers
- ✅ Implement proper error handling
- ✅ Use connection pooling
- ✅ Monitor network performance

### Don'ts
- ❌ Use HTTP for sensitive data
- ❌ Ignore CORS security
- ❌ Return wrong status codes (200 for errors)
- ❌ Cache sensitive data
- ❌ Send large uncompressed responses
- ❌ Skip SSL/TLS certificate validation
- ❌ Store credentials in URLs
- ❌ Expose internal server details in errors
- ❌ Use synchronous requests

## Glossary Terms

**Key Terms Covered**:
- Ajax
- ALPN
- Bandwidth
- Cacheable
- Cookie
- CORS
- CORS-safelisted request header
- CORS-safelisted response header
- Crawler
- Effective connection type
- Fetch directive
- Fetch metadata request header
- Forbidden request header
- Forbidden response header name
- FTP
- General header
- HOL blocking
- HTTP
- HTTP content
- HTTP header
- HTTP/2
- HTTP/3
- HTTPS
- HTTPS RR
- Idempotent
- IMAP
- Latency
- Packet
- POP3
- Proxy server
- QUIC
- Rate limit
- Request header
- Response header
- REST
- Round Trip Time (RTT)
- RTCP
- RTP
- Safe (HTTP Methods)
- SMTP
- TCP
- TCP handshake
- TCP slow start
- UDP
- WebSockets

## Additional Resources

- [MDN HTTP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [HTTP/2 Spec](https://http2.github.io/)
- [HTTP/3 Explained](https://http3-explained.haxx.se/)
- [REST API Tutorial](https://restfulapi.net/)
