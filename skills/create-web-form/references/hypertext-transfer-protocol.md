# Hypertext Transfer Protocol (HTTP) Reference

A consolidated reference guide covering the HTTP protocol, its messages, cookies, authentication, sessions, headers, methods, status codes, and specifications. All content sourced from the Mozilla Developer Network (MDN) Web Docs.

---

## Table of Contents

1. [HTTP Overview (Introduction)](#1-http-overview)
2. [An Overview of HTTP](#2-an-overview-of-http)
3. [HTTP Messages](#3-http-messages)
4. [HTTP Cookies](#4-http-cookies)
5. [HTTP Authentication](#5-http-authentication)
6. [HTTP Sessions](#6-http-sessions)
7. [HTTP Headers Reference](#7-http-headers-reference)
8. [HTTP Request Methods](#8-http-request-methods)
9. [HTTP Response Status Codes](#9-http-response-status-codes)
10. [HTTP Resources and Specifications](#10-http-resources-and-specifications)

---

## 1. HTTP Overview

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP>

### Definition

**HTTP (Hypertext Transfer Protocol)** is an application-layer protocol for transmitting hypermedia documents, such as HTML. While designed for communication between web browsers and web servers, it is also used for machine-to-machine communication and programmatic API access.

### Key Characteristics

- **Client-Server Model**: A classical architecture where a client opens a connection to make a request and waits for a server response.
- **Stateless Protocol**: The server does not keep session data between requests, though cookies add state capability.
- **Extensible**: Built on concepts of resources, URIs, and a basic message structure; the protocol has evolved with numerous extensions over time.

### Major Topic Areas

#### Guides (Foundational and Specialized)

- **Overview of HTTP** -- Basic features and protocol stack position
- **Evolution of HTTP** -- HTTP/0.9, 1.0, 1.1, 2.0, and 3.0
- **HTTP Messages** -- Request/response structure and types
- **MIME Types** -- Content-Type headers and standards
- **HTTP Caching** -- Methods and header controls
- **HTTP Authentication** -- Client identity verification
- **Cookies** -- Set-Cookie and Cookie headers for state management
- **Redirections** -- URL forwarding techniques (3xx status codes)
- **Conditional Requests** -- Validator-dependent outcomes
- **Range Requests** -- Partial resource retrieval
- **Content Negotiation** -- Accept headers and format preference
- **Connection Management (HTTP/1.x)** -- Persistent connections and pipelining
- **Protocol Upgrade** -- Upgrading to HTTP/2, WebSocket
- **Proxy Servers and Tunneling**
- **Client Hints** -- Device and preference metadata
- **Network Error Logging** -- Failed fetch reporting

#### Security and Privacy

- **Permissions Policy** -- Control feature access
- **CORS (Cross-Origin Resource Sharing)** -- Cross-site request handling
- **CSP (Content Security Policy)** -- Resource loading restrictions and attack mitigation
- **CORP (Cross-Origin Resource Policy)** -- Speculative side-channel attack prevention

### Reference Documentation Summary

- **HTTP Headers**: 169+ documented headers, including `Content-Type`, `Accept`, `Authorization`, `Cache-Control`, `Set-Cookie`, `Cookie`, `Access-Control-Allow-Origin`, `Content-Security-Policy`, and many more.
- **HTTP Request Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `CONNECT`, `TRACE`.
- **HTTP Response Status Codes**: Organized into five classes -- 1xx Informational, 2xx Successful, 3xx Redirection, 4xx Client Error, 5xx Server Error.

### Tools and Resources

- **Firefox Developer Tools** -- Network Monitor
- **HTTP Observatory** -- Site security configuration assessment
- **RedBot** -- Cache header validation
- **nghttp2** -- HTTP/2 client/server implementation
- **curl** -- Command-line data transfer tool

---

## 2. An Overview of HTTP

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview>

### What is HTTP?

HTTP is a protocol for fetching resources such as HTML documents. It is the foundation of any data exchange on the Web and operates as a **client-server protocol**, where requests are initiated by the recipient (typically a web browser). Complete documents are constructed from multiple resources including text, layout instructions, images, videos, and scripts.

HTTP is an **application layer protocol** sent over TCP or TLS-encrypted TCP connections. While designed in the early 1990s, it remains extensible and continues to evolve.

### Architecture: Components of HTTP-Based Systems

#### Client: The User-Agent

- Any tool acting on behalf of the user (primarily web browsers).
- **Always** initiates requests; the server never initiates.
- Sends an initial request to fetch HTML documents, then makes additional requests for CSS, scripts, and sub-resources.
- Interprets HTTP responses and presents content to users.

#### The Web Server

- Serves documents as requested by clients.
- May be a single virtual machine or a collection of servers sharing load.
- With HTTP/1.1 and the `Host` header, multiple servers can share the same IP address.

#### Proxies

Located between client and server, proxies perform various functions:

- **Caching** (public or private, like browser cache)
- **Filtering** (antivirus, parental controls)
- **Load balancing** (distribute requests across servers)
- **Authentication** (control resource access)
- **Logging** (store historical information)

Proxies can be **transparent** (forward requests unchanged) or **non-transparent** (modify requests).

### Basic Aspects of HTTP

#### HTTP is Simple

- Generally designed to be human-readable.
- HTTP messages can be read and understood by humans, providing easier testing for developers.

#### HTTP is Extensible

- **HTTP headers** make the protocol easy to extend and experiment with.
- New functionality can be introduced by agreement between client and server, a concept introduced in HTTP/1.0.

#### HTTP is Stateless, But Not Sessionless

- **Stateless**: No link between two successive requests on the same connection.
- Despite this, **HTTP Cookies** enable stateful sessions that allow sharing context and state across requests.

#### HTTP and Connections

HTTP requires a reliable transport protocol. TCP is connection-based and reliable while UDP is not.

- **HTTP/1.0**: Opens a separate TCP connection for each request/response pair (inefficient).
- **HTTP/1.1**: Introduced **pipelining** and **persistent connections** via the `Connection` header.
- **HTTP/2**: Multiplexes messages over a single connection for efficiency.
- **Experimental**: The QUIC protocol is being tested as a transport layer (builds on UDP with reliability).

### HTTP Flow

When a client wants to communicate with a server:

1. **Open a TCP connection**: Used to send request(s) and receive answer(s). Client may open new connection, reuse existing, or open several connections.

2. **Send an HTTP message**:

   ```
   GET / HTTP/1.1
   Host: developer.mozilla.org
   Accept-Language: fr
   ```

3. **Read the response**:

   ```
   HTTP/1.1 200 OK
   Date: Sat, 09 Oct 2010 14:28:02 GMT
   Server: Apache
   Last-Modified: Tue, 01 Dec 2009 20:18:22 GMT
   ETag: "51142bc1-7449-479b075b2891b"
   Accept-Ranges: bytes
   Content-Length: 29769
   Content-Type: text/html

   <!doctype html>... (29769 bytes of requested web page)
   ```

4. **Close or reuse connection** for further requests.

### What Can Be Controlled by HTTP

- **Caching**: Server instructs proxies and clients what to cache and for how long.
- **Relaxing the Origin Constraint**: Browsers enforce strict same-origin separation; HTTP headers can relax this via CORS.
- **Authentication**: Protected pages accessible only to specific users via `WWW-Authenticate` or HTTP Cookies.
- **Proxy and Tunneling**: Navigate network barriers, handle protocols like FTP through proxies.
- **Sessions**: HTTP Cookies link requests with server state, creating sessions despite the stateless protocol.

### APIs Based on HTTP

- **Fetch API**: The most commonly used API for HTTP requests from JavaScript, replacing the older `XMLHttpRequest` API.
- **Server-Sent Events**: A one-way service for the server to send events to the client using HTTP as a transport mechanism.

---

## 3. HTTP Messages

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages>

### Overview

HTTP messages are the mechanism for exchanging data between server and client. There are two types:

- **Requests**: Sent by the client to trigger an action on the server.
- **Responses**: The server's answer to a request.

HTTP/1.x messages are text-based and straightforward to read. HTTP/2 wraps messages in binary framing but maintains the same underlying semantics.

### HTTP Message Anatomy

Both requests and responses share a common structure:

```
1. Start-line (single line describing HTTP version + request method or outcome)
2. HTTP Headers (optional metadata about the message)
3. Empty line (marks end of metadata)
4. Body (optional data associated with message)
```

The **start-line** and **headers** are collectively called the **head**. The content after is the **body**.

### HTTP Requests

#### Request-Line Format

```
<method> <request-target> <protocol>
```

#### Components

**Method (HTTP Verb)**: Describes the meaning and desired outcome of the request. Common methods include `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `CONNECT`. Only `PATCH`, `POST`, and `PUT` requests typically have a body.

**Request-Target (URL)** -- four types depending on context:

1. **Origin Form** (most common): Absolute path with Host header.
   ```http
   GET /en-US/docs/Web/HTTP/Guides/Messages HTTP/1.1
   ```

2. **Absolute Form**: Complete URL; used with proxies.
   ```http
   GET https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages HTTP/1.1
   ```

3. **Authority Form**: Authority and port with colon; used with `CONNECT`.
   ```http
   CONNECT developer.mozilla.org:443 HTTP/1.1
   ```

4. **Asterisk Form**: Only with `OPTIONS` to represent the server as a whole.
   ```http
   OPTIONS * HTTP/1.1
   ```

**Protocol (HTTP Version)**: Usually `HTTP/1.1`. In HTTP/2+, the protocol version is not included in messages.

#### Request Headers

After the start-line and before the body. Case-insensitive, followed by colon and value:

```http
Host: example.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 49
```

**Categories**:
- **Request Headers**: Provide additional context (e.g., conditional requests).
- **Representation Headers**: Describe the original form of message data and encoding applied.

#### Request Body

Only for `PATCH`, `POST`, and `PUT` methods. Examples:

**Form data**:
```
name=FirstName+LastName&email=bsmth%40example.com
```

**JSON**:
```json
{
  "firstName": "Brian",
  "lastName": "Smith",
  "email": "bsmth@example.com"
}
```

**Multipart form data**:
```http
--delimiter123
Content-Disposition: form-data; name="field1"

value1
--delimiter123
Content-Disposition: form-data; name="field2"; filename="example.txt"

Text file contents
--delimiter123--
```

### HTTP Responses

#### Status-Line Format

```
<protocol> <status-code> <reason-phrase>
```

#### Components

- **Protocol**: The HTTP version of the message.
- **Status Code**: Numeric code indicating request success or failure.
  - 2xx Success: `200 OK`, `201 Created`, `204 No Content`
  - 3xx Redirection: `302 Found`, `304 Not Modified`
  - 4xx Client Error: `400 Bad Request`, `404 Not Found`
  - 5xx Server Error: `500 Internal Server Error`, `503 Service Unavailable`
- **Reason Phrase**: Optional brief text description, e.g., "Created" or "Not Found".

#### Response Headers

Metadata sent with the response:

```http
Content-Type: application/json
Content-Length: 256
Cache-Control: max-age=604800
Date: Fri, 13 Sep 2024 12:56:07 GMT
```

#### Response Body

Included in most messages. May be:
- **Single-Resource Body**: Defined by `Content-Type` and `Content-Length` headers, or chunked with `Transfer-Encoding: chunked`.
- **Multiple-Resource Body**: Multiple parts with different information, associated with HTML forms and range requests.

Note: Status codes like `201 Created` or `204 No Content` may not have a body.

### HTTP/2 Messages

Key differences from HTTP/1.x:

- Wraps messages in binary frames (more efficient).
- Header compression via the HPACK algorithm.
- **Multiplexing**: Single TCP connection for multiple concurrent requests and responses.
- Eliminates head-of-line (HOL) blocking at the protocol level.

HTTP/2 uses **pseudo-header fields** beginning with `:` instead of a start-line:

**Request pseudo-headers**:
```
:method: GET
:scheme: https
:authority: www.example.com
:path: /
```

**Response pseudo-header**:
```
:status: 200
```

### HTTP/3 Considerations

- Uses QUIC (a protocol built on UDP instead of TCP).
- Fixes TCP-level head-of-line blocking.
- Reduced connection setup time.
- Enhanced stability on unreliable networks.
- Maintains the same core HTTP semantics (methods, status codes, headers).

---

## 4. HTTP Cookies

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies>

### What Are Cookies?

A **cookie** (web cookie or browser cookie) is a small piece of data a server sends to a user's web browser. The browser may store cookies, create new ones, modify existing ones, and send them back to the same server with later requests. Cookies enable web applications to store limited amounts of data and remember state information.

### Primary Use Cases

1. **Session Management**: User sign-in status, shopping cart contents, game scores, and other session-related details.
2. **Personalization**: User preferences such as display language and UI theme.
3. **Tracking**: Recording and analyzing user behavior.

### Setting Cookies

#### Server-Side (HTTP Headers)

Use the `Set-Cookie` response header:

```http
HTTP/2.0 200 OK
Content-Type: text/html
Set-Cookie: yummy_cookie=chocolate
Set-Cookie: tasty_cookie=strawberry
```

#### Client-Side (JavaScript)

Use the `Document.cookie` property:

```javascript
document.cookie = "yummy_cookie=chocolate";
document.cookie = "tasty_cookie=strawberry";
console.log(document.cookie);
// logs "yummy_cookie=chocolate; tasty_cookie=strawberry"
```

### Sending Cookies

When a new request is made to a domain, the browser automatically sends stored cookies via the `Cookie` request header:

```http
GET /sample_page.html HTTP/2.0
Host: www.example.org
Cookie: yummy_cookie=chocolate; tasty_cookie=strawberry
```

### Cookie Attributes

#### Lifetime Control

**Permanent Cookies** persist beyond the current session using `Expires` or `Max-Age`:

```http
Set-Cookie: id=a3fWa; Expires=Thu, 31 Oct 2021 07:28:00 GMT;
Set-Cookie: id=a3fWa; Max-Age=2592000
```

- `Expires`: Specifies an expiration date/time.
- `Max-Age`: Specifies duration in seconds (preferred over `Expires`; takes precedence if both are set).

**Session Cookies** are deleted when the current session ends (no `Max-Age` or `Expires` attribute).

#### Removing Cookies

Set the cookie again with `Max-Age=0` or a past `Expires` date, or use the `Clear-Site-Data` header:

```http
Set-Cookie: id=a3fWa; Max-Age=0
Clear-Site-Data: "cookies"
```

#### Scope Control

**Domain Attribute**: Specifies which domains can receive the cookie.

```http
Set-Cookie: id=a3fWa; Domain=mozilla.org
```

- If not specified: cookie sent to the server that set it but NOT subdomains.
- If specified: sent to domain and all subdomains.

**Path Attribute**: Specifies the URL path that must exist in the request URL.

```http
Set-Cookie: id=a3fWa; Path=/docs
```

Matching paths: `/docs`, `/docs/`, `/docs/Web/`, `/docs/Web/HTTP`. Non-matching: `/`, `/docsets`, `/fr/docs`.

#### Security Attributes

**Secure**: Only sent over HTTPS (never with unsecured HTTP, except on localhost).

```http
Set-Cookie: id=a3fWa; Secure
```

**HttpOnly**: Prevents JavaScript access via `Document.cookie`; only accessible via HTTP requests. Mitigates XSS attacks.

```http
Set-Cookie: id=a3fWa; HttpOnly
```

**Combined**:

```http
Set-Cookie: id=a3fWa; Expires=Thu, 21 Oct 2021 07:28:00 GMT; Secure; HttpOnly
```

#### SameSite Attribute

Controls whether cookies are sent with cross-site requests:

| Value | Behavior |
|-------|----------|
| **Strict** | Only sent in requests originating from the cookie's origin site. Use for sensitive functionality (authentication, cart). |
| **Lax** | Sent with site navigation but not with other cross-site requests. Default if `SameSite` is not set. |
| **None** | Sent with both originating and cross-site requests. Requires `Secure` attribute. |

### Cookie Prefixes (Defense-in-Depth)

- **`__Secure-`**: Must be set with `Secure` attribute by an HTTPS page.
- **`__Host-`**: Must be set with `Secure` attribute, cannot have `Domain` attribute, must have `Path=/`.
- **`__Http-`**: Must be set with `Secure` flag, must have `HttpOnly` attribute.

### Security Best Practices

1. Use `Secure` and `HttpOnly` attributes on sensitive cookies.
2. Limit scope with `Domain` and `Path` appropriately.
3. Control cross-site requests with `SameSite`.
4. Keep sensitive cookies short-lived.
5. Regenerate session cookies on authentication to prevent session fixation.
6. Store opaque identifiers instead of sensitive data directly in cookies.
7. Use cookie prefixes (`__Secure-`, `__Host-`) for defense-in-depth.

### Storage Limitations

- Maximum cookies per domain varies by browser, generally hundreds.
- Maximum size per cookie is usually 4KB.
- Modern alternatives for client-side storage: Web Storage API (`localStorage`, `sessionStorage`) and IndexedDB.

### Privacy and Third-Party Cookies

- Third-party cookies are set by embedded content from different domains.
- Most browser vendors now block third-party cookies by default.
- **Applicable regulations**: GDPR (EU), ePrivacy Directive (EU), California Consumer Privacy Act (US).

### Key Related Headers

- `Set-Cookie` -- Server sets cookies.
- `Cookie` -- Client sends cookies.
- `Clear-Site-Data` -- Clears cookies and other site data.

### Specification

RFC 6265 -- HTTP State Management Mechanism.

---

## 5. HTTP Authentication

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication>

### General HTTP Authentication Framework

HTTP authentication is defined in **RFC 7235** and provides a framework for access control using a challenge-and-response mechanism between servers and clients.

#### Challenge-Response Flow

1. **Server Challenge**: Server responds with `401 Unauthorized` status and includes a `WWW-Authenticate` response header with authentication challenge details.
2. **Client Response**: Client provides credentials via the `Authorization` request header.
3. **Retry**: Client typically presents a password prompt to the user, then reissues the request with correct credentials.

### Authentication Headers

#### WWW-Authenticate and Proxy-Authenticate

Define the authentication method required to access a resource:

```http
WWW-Authenticate: <type> realm=<realm>
Proxy-Authenticate: <type> realm=<realm>
```

- `<type>`: Authentication scheme (e.g., "Basic", "Bearer").
- `realm`: Describes the protected area (e.g., "Access to the staging site").

#### Authorization and Proxy-Authorization

Contain credentials to authenticate with the server or proxy:

```http
Authorization: <type> <credentials>
Proxy-Authorization: <type> <credentials>
```

### Proxy Authentication

Uses separate headers and status codes:

- **Status Code**: `407 Proxy Authentication Required`
- **Response Header**: `Proxy-Authenticate`
- **Request Header**: `Proxy-Authorization`

### Access Control Response Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| **401** | Unauthorized | Invalid credentials; user may retry |
| **403** | Forbidden | Valid credentials but inadequate permissions; no retry |
| **404** | Not Found | Sometimes preferred to hide resource existence from unauthorized users |
| **407** | Proxy Authentication Required | Proxy authentication failed |

### Authentication Schemes

| Scheme | Reference | Description |
|--------|-----------|-------------|
| **Basic** | RFC 7617 | Base64-encoded username:password (requires HTTPS) |
| **Bearer** | RFC 6750 | OAuth 2.0 bearer tokens |
| **Digest** | RFC 7616 | MD5 or SHA-256 hashing |
| **HOBA** | RFC 7486 | HTTP Origin-Bound Authentication (digital signature) |
| **Mutual** | RFC 8120 | Mutual authentication |
| **Negotiate/NTLM** | RFC 4559 | Windows integrated authentication |
| **VAPID** | RFC 8292 | Voluntary Application Server Identification |
| **SCRAM** | RFC 7804 | Salted Challenge Response Authentication Mechanism |
| **AWS4-HMAC-SHA256** | AWS Docs | AWS Signature Version 4 |

Full list maintained by IANA: <https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml>

### Basic Authentication Scheme

- **Standard**: RFC 7617.
- **Format**: Transmits user ID and password as base64-encoded pairs (`username:password`).
- **Charset**: UTF-8.

**Security Concerns**:
- Base64 is reversible; credentials appear as clear text.
- Always use HTTPS/TLS with Basic Auth.
- Vulnerable to CSRF; credentials sent in all requests regardless of origin.

#### Apache Configuration

`.htaccess` file:

```apacheconf
AuthType Basic
AuthName "Access to the staging site"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

#### Nginx Configuration

```nginx
location /status {
    auth_basic           "Access to the staging site";
    auth_basic_user_file /etc/apache2/.htpasswd;
}
```

### Security Considerations

- Cross-origin images cannot trigger HTTP authentication dialogs (Firefox 59+).
- Modern browsers use UTF-8 encoding for usernames and passwords.
- URL-embedded credentials (`https://username:password@www.example.com/`) are deprecated; modern browsers strip credentials from URLs before sending requests.

---

## 6. HTTP Sessions

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Session>

### Overview

An HTTP session in client-server protocols consists of **three phases**:

1. The client establishes a TCP connection (or appropriate transport layer connection).
2. The client sends its request and waits for the answer.
3. The server processes the request and sends back a response with status code and data.

As of HTTP/1.1, the connection is no longer closed after completion, allowing the client to make further requests without re-establishing the connection.

### Phase 1: Establishing a Connection

- The **client** initiates the connection (not the server).
- HTTP typically uses **TCP** as the transport layer.
- **Default port**: 80 for HTTP servers (other ports like 8000, 8080 can also be used).
- The server cannot send data to the client without an explicit request, though this can be overcome using Push API, Server-sent events, or the WebSockets API.

### Phase 2: Sending a Client Request

A client request consists of text directives separated by CRLF, divided into three blocks:

#### Block 1: Request Line

Contains the request method, path of the document, and HTTP protocol version.

#### Block 2: HTTP Headers

Information about data types, language preferences, MIME types, and data modifying server behavior. Ends with an empty line that separates headers from the data block.

#### Block 3: Optional Data Block

Contains additional data, mainly used by the POST method.

**Example GET Request**:

```http
GET / HTTP/1.1
Host: developer.mozilla.org
Accept-Language: fr

```

**Example POST Request**:

```http
POST /contact_form.php HTTP/1.1
Host: developer.mozilla.org
Content-Length: 64
Content-Type: application/x-www-form-urlencoded

name=Joe%20User&request=Send%20me%20one%20of%20your%20catalogue
```

#### Common Request Methods

| Method | Purpose |
|--------|---------|
| **GET** | Requests a data representation of the specified resource; should only retrieve data |
| **POST** | Sends data to the server to change its state; commonly used for HTML Forms |

### Phase 3: Structure of Server Response

Similar to requests, server responses are text directives separated by CRLF, divided into three blocks:

#### Block 1: Status Line

HTTP version acknowledgment, response status code, and brief human-readable meaning.

#### Block 2: HTTP Headers

Information about the data sent (type, size, compression, caching hints). Ends with an empty line.

#### Block 3: Data Block

Optional data or response content.

**Example Successful Response (200 OK)**:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 55743
Connection: keep-alive
Cache-Control: s-maxage=300, public, max-age=0
Content-Language: en-US
Date: Thu, 06 Dec 2018 17:37:18 GMT
ETag: "2e77ad1dc6ab0b53a2996dfd4653c1c3"
Server: meinheld/0.6.1
Strict-Transport-Security: max-age=63072000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Vary: Accept-Encoding,Cookie
Age: 7

<!doctype html>
<html lang="en">
  ...
</html>
```

**Example Redirect (301)**:

```http
HTTP/1.1 301 Moved Permanently
Server: Apache/2.4.37 (Red Hat)
Content-Type: text/html; charset=utf-8
Location: https://developer.mozilla.org/
```

**Example Error (404)**:

```http
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Content-Length: 38217
```

---

## 7. HTTP Headers Reference

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers>

### Overview

HTTP headers allow clients and servers to pass additional information with HTTP requests and responses. In HTTP/1.X, headers are case-insensitive name-value pairs (e.g., `Allow: POST`). In HTTP/2 and above, headers appear in lowercase and pseudo-headers are prefixed with a colon (e.g., `:status: 200`).

### Header Categories by Context

- **Request Headers**: Contain information about the resource to be fetched or about the client requesting the resource.
- **Response Headers**: Hold additional information about the response, such as location or server details.
- **Representation Headers**: Contain information about the resource body, including MIME type, encoding, and compression.
- **Payload Headers**: Contain representation-independent information about payload data, including content length and transport encoding.

### Header Categories by Proxy Handling

- **End-to-End Headers**: Must be transmitted to the final recipient. Intermediate proxies must retransmit them unmodified and caches must store them.
- **Hop-by-Hop Headers**: Meaningful only for a single transport-level connection. Must not be retransmitted by proxies or cached.

### Authentication Headers

| Header | Type | Description |
|--------|------|-------------|
| `WWW-Authenticate` | Response | Defines the authentication method to access a resource |
| `Authorization` | Request | Contains credentials to authenticate a user-agent with a server |
| `Proxy-Authenticate` | Response | Defines authentication method for proxy server access |
| `Proxy-Authorization` | Request | Contains credentials to authenticate with a proxy server |

### Caching Headers

| Header | Type | Description |
|--------|------|-------------|
| `Age` | Response | Time in seconds the object has been in a proxy cache |
| `Cache-Control` | Both | Directives for caching mechanisms in requests and responses |
| `Clear-Site-Data` | Response | Clears browsing data (cookies, storage, cache) |
| `Expires` | Response | Date/time after which response is considered stale |

### Conditional Headers

| Header | Type | Description |
|--------|------|-------------|
| `Last-Modified` | Response | Last modification date of the resource |
| `ETag` | Response | Unique string identifying the resource version |
| `If-Match` | Request | Applies method only if resource matches given ETags |
| `If-None-Match` | Request | Applies method if resource does not match given ETags |
| `If-Modified-Since` | Request | Transmits resource only if modified after given date |
| `If-Unmodified-Since` | Request | Transmits resource only if not modified after date |
| `Vary` | Response | Determines how to match headers for cache decisions |

### Connection Management Headers

| Header | Type | Description |
|--------|------|-------------|
| `Connection` | Both | Controls whether network connection stays open |
| `Keep-Alive` | Both | Controls how long a persistent connection stays open |

### Content Negotiation Headers

| Header | Type | Description |
|--------|------|-------------|
| `Accept` | Request | Informs server about acceptable data types |
| `Accept-Encoding` | Request | Specifies acceptable compression algorithms |
| `Accept-Language` | Request | Informs server about preferred human language |
| `Accept-Patch` | Response | Advertises media types acceptable in PATCH requests |
| `Accept-Post` | Response | Advertises media types acceptable in POST requests |

### Cookie Headers

| Header | Type | Description |
|--------|------|-------------|
| `Cookie` | Request | Contains HTTP cookies previously set by server |
| `Set-Cookie` | Response | Sends cookies from server to user-agent |

### CORS (Cross-Origin Resource Sharing) Headers

| Header | Type | Description |
|--------|------|-------------|
| `Access-Control-Allow-Credentials` | Response | Indicates if response can be exposed with credentials |
| `Access-Control-Allow-Headers` | Response | Lists HTTP headers usable in cross-origin requests |
| `Access-Control-Allow-Methods` | Response | Specifies allowed methods for cross-origin requests |
| `Access-Control-Allow-Origin` | Response | Indicates if response can be shared |
| `Access-Control-Expose-Headers` | Response | Lists headers exposed in cross-origin responses |
| `Access-Control-Max-Age` | Response | How long preflight request results can be cached |
| `Access-Control-Request-Headers` | Request | Lists headers used in actual request (preflight) |
| `Access-Control-Request-Method` | Request | Lists HTTP method used in actual request (preflight) |
| `Origin` | Request | Indicates where a fetch originates from |
| `Timing-Allow-Origin` | Response | Specifies origins allowed to see Resource Timing API values |

### Message Body Information Headers

| Header | Type | Description |
|--------|------|-------------|
| `Content-Length` | Both | Size of resource in decimal bytes |
| `Content-Type` | Both | Indicates the media type of the resource |
| `Content-Encoding` | Response | Specifies compression algorithm used |
| `Content-Language` | Response | Describes intended human language(s) |
| `Content-Location` | Response | Indicates alternate location for returned data |
| `Content-Disposition` | Response | Indicates if resource should display inline or be downloaded |

### Range Request Headers

| Header | Type | Description |
|--------|------|-------------|
| `Accept-Ranges` | Response | Indicates if server supports range requests |
| `Range` | Request | Indicates which part of document server should return |
| `If-Range` | Request | Creates conditional range request |
| `Content-Range` | Response | Indicates partial message position in full body |

### Redirect Headers

| Header | Type | Description |
|--------|------|-------------|
| `Location` | Response | Indicates URL to redirect page to |
| `Refresh` | Response | Directs browser to reload page or redirect |

### Request Context Headers

| Header | Type | Description |
|--------|------|-------------|
| `From` | Request | Contains email address of user controlling request |
| `Host` | Request | Specifies domain name and optional port of server |
| `Referer` | Request | Address of previous web page |
| `Referrer-Policy` | Response | Governs referrer information in Referer header |
| `User-Agent` | Request | Identifies application type and software version |

### Response Context Headers

| Header | Type | Description |
|--------|------|-------------|
| `Allow` | Response | Lists supported HTTP request methods |
| `Server` | Response | Contains software info for origin server |

### Security Headers

| Header | Type | Description |
|--------|------|-------------|
| `Cross-Origin-Embedder-Policy` (COEP) | Response | Allows server to declare embedder policy |
| `Cross-Origin-Opener-Policy` (COOP) | Response | Prevents other domains from opening/controlling window |
| `Cross-Origin-Resource-Policy` (CORP) | Response | Prevents other domains from reading response |
| `Content-Security-Policy` (CSP) | Response | Controls resources user agent can load |
| `Content-Security-Policy-Report-Only` | Response | Monitors CSP without enforcement |
| `Permissions-Policy` | Response | Allows/denies browser features in frames or iframes |
| `Strict-Transport-Security` (HSTS) | Response | Forces HTTPS communication |
| `Upgrade-Insecure-Requests` | Request | Signals preference for encrypted response |
| `X-Content-Type-Options` | Response | Disables MIME sniffing |
| `X-Frame-Options` (XFO) | Response | Indicates if page can be rendered in frame/iframe |
| `X-XSS-Protection` | Response | Enables cross-site scripting filtering |

### Fetch Metadata Request Headers

| Header | Type | Description |
|--------|------|-------------|
| `Sec-Fetch-Site` | Request | Relationship between initiator and target origin |
| `Sec-Fetch-Mode` | Request | Request mode (cors, navigate, no-cors, same-origin, websocket) |
| `Sec-Fetch-User` | Request | Whether navigation was triggered by user activation |
| `Sec-Fetch-Dest` | Request | Request destination (audio, document, script, style, etc.) |

### Transfer Coding Headers

| Header | Type | Description |
|--------|------|-------------|
| `Transfer-Encoding` | Response | Specifies encoding form for safe resource transfer |
| `TE` | Request | Specifies acceptable transfer encodings |
| `Trailer` | Response | Allows additional fields at end of chunked message |

### WebSocket Headers

| Header | Type | Description |
|--------|------|-------------|
| `Sec-WebSocket-Accept` | Response | Indicates willingness to upgrade to WebSocket |
| `Sec-WebSocket-Extensions` | Both | Indicates WebSocket extensions supported |
| `Sec-WebSocket-Key` | Request | Contains key verifying client intent for WebSocket |
| `Sec-WebSocket-Protocol` | Both | Indicates WebSocket sub-protocols supported |
| `Sec-WebSocket-Version` | Both | Indicates WebSocket protocol version |

### Proxy Headers

| Header | Type | Description |
|--------|------|-------------|
| `Forwarded` | Both | Contains information from client-facing side of proxy servers |
| `Via` | Both | Added by proxies; appears in request and response headers |
| `X-Forwarded-For` | Request | Identifies originating IP addresses through proxy (non-standard) |
| `X-Forwarded-Host` | Request | Identifies original host requested through proxy (non-standard) |
| `X-Forwarded-Proto` | Request | Identifies protocol used through proxy (non-standard) |

### Other Notable Headers

| Header | Type | Description |
|--------|------|-------------|
| `Alt-Svc` | Response | Lists alternate ways to reach this service |
| `Date` | Response | Date/time message originated |
| `Link` | Response | Serializes one or more links in HTTP headers |
| `Retry-After` | Response | Indicates wait time before follow-up request |
| `Server-Timing` | Response | Communicates metrics for request-response cycle |
| `Upgrade` | Request | Used to upgrade to different protocol |
| `Priority` | Both | Provides hint about resource request priority |

---

## 8. HTTP Request Methods

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods>

HTTP defines a set of request methods to indicate the purpose of the request and what is expected if successful. Each method has specific semantics and characteristics.

### GET

- **Purpose**: Requests a representation of the specified resource. Should only retrieve data and should not contain request content.
- **Safe**: Yes | **Idempotent**: Yes | **Cacheable**: Yes

### HEAD

- **Purpose**: Asks for a response identical to a GET request, but without a response body. Useful for retrieving headers only without downloading the full resource.
- **Safe**: Yes | **Idempotent**: Yes | **Cacheable**: Yes

### POST

- **Purpose**: Submits an entity to the specified resource, often causing a change in state or side effects on the server. Used for creating new resources and submitting data.
- **Safe**: No | **Idempotent**: No | **Cacheable**: Conditional (when responses include explicit freshness information and a matching `Content-Location` header)

### PUT

- **Purpose**: Replaces all current representations of the target resource with the request content. Used for updating entire resources.
- **Safe**: No | **Idempotent**: Yes | **Cacheable**: No

### DELETE

- **Purpose**: Deletes the specified resource.
- **Safe**: No | **Idempotent**: Yes | **Cacheable**: No

### CONNECT

- **Purpose**: Establishes a tunnel to the server identified by the target resource. Used for creating a tunnel for secure connections (e.g., HTTPS through a proxy).
- **Safe**: No | **Idempotent**: No | **Cacheable**: No

### OPTIONS

- **Purpose**: Describes the communication options for the target resource. Used for discovering allowed methods and capabilities.
- **Safe**: Yes | **Idempotent**: Yes | **Cacheable**: No

### TRACE

- **Purpose**: Performs a message loop-back test along the path to the target resource. Used for diagnostics and debugging.
- **Safe**: Yes | **Idempotent**: Yes | **Cacheable**: No

### PATCH

- **Purpose**: Applies partial modifications to a resource (unlike PUT which replaces entirely).
- **Safe**: No | **Idempotent**: No | **Cacheable**: Conditional

### Method Characteristics Summary

| Method | Safe | Idempotent | Cacheable |
|--------|------|------------|-----------|
| GET | Yes | Yes | Yes |
| HEAD | Yes | Yes | Yes |
| POST | No | No | Conditional |
| PUT | No | Yes | No |
| DELETE | No | Yes | No |
| CONNECT | No | No | No |
| OPTIONS | Yes | Yes | No |
| TRACE | Yes | Yes | No |
| PATCH | No | No | Conditional |

**Safe Methods**: Methods that do not modify server state -- GET, HEAD, OPTIONS, TRACE.

**Idempotent Methods**: Methods that produce the same result when called multiple times -- GET, HEAD, OPTIONS, TRACE, PUT, DELETE.

**Specification**: All methods are defined in HTTP Semantics (RFC 9110).

---

## 9. HTTP Response Status Codes

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status>

HTTP response status codes indicate whether an HTTP request has been successfully completed. Responses are grouped into five classes based on their first digit.

### 1xx: Informational Responses (100-199)

| Code | Status | Description |
|------|--------|-------------|
| **100** | Continue | Interim response indicating the client should continue the request or ignore if already finished |
| **101** | Switching Protocols | Sent in response to an `Upgrade` request header; indicates the protocol the server is switching to |
| **102** | Processing | (Deprecated) Used in WebDAV contexts to indicate a request was received but no status was available |
| **103** | Early Hints | Primarily used with the `Link` header to allow the user agent to start preloading resources |

### 2xx: Successful Responses (200-299)

| Code | Status | Description |
|------|--------|-------------|
| **200** | OK | Request succeeded; meaning depends on HTTP method used |
| **201** | Created | Request succeeded and a new resource was created (typically after POST or PUT) |
| **202** | Accepted | Request received but not yet acted upon; intended for async or batch operations |
| **203** | Non-Authoritative Information | Returned metadata is from a local or third-party copy, not the origin server |
| **204** | No Content | No content to send, but headers may be useful; user agent may update cached headers |
| **205** | Reset Content | Tells the user agent to reset the document that sent this request |
| **206** | Partial Content | Used in response to a range request for part(s) of a resource |
| **207** | Multi-Status | (WebDAV) Conveys information about multiple resources with multiple status codes |
| **208** | Already Reported | (WebDAV) Used to avoid repeatedly enumerating internal members |
| **226** | IM Used | Server fulfilled a GET request with instance-manipulations applied |

### 3xx: Redirection Messages (300-399)

| Code | Status | Description |
|------|--------|-------------|
| **300** | Multiple Choices | Request has multiple possible responses; requires agent-driven content negotiation |
| **301** | Moved Permanently | URL of requested resource has been permanently changed; new URL given in response |
| **302** | Found | URI of requested resource changed temporarily; future requests should still use the same URI |
| **303** | See Other | Server directs client to get the resource at another URI using a GET request |
| **304** | Not Modified | Used for caching; tells client response has not been modified, continue using cached version |
| **307** | Temporary Redirect | Server directs client to another URI with the same HTTP method as the original request |
| **308** | Permanent Redirect | Resource is permanently at another URI; must not change the HTTP method (like 301 but stricter) |

### 4xx: Client Error Responses (400-499)

| Code | Status | Description |
|------|--------|-------------|
| **400** | Bad Request | Server cannot process request due to client error (malformed syntax, invalid framing) |
| **401** | Unauthorized | Client must authenticate itself to get the requested response |
| **402** | Payment Required | Originally for digital payment systems; rarely used with no standard convention |
| **403** | Forbidden | Client lacks access rights; server refuses (unlike 401, client identity is known) |
| **404** | Not Found | Server cannot find requested resource |
| **405** | Method Not Allowed | Request method known but not supported by target resource |
| **406** | Not Acceptable | Server cannot find content matching criteria given by user agent |
| **407** | Proxy Authentication Required | Similar to 401 but authentication needed by proxy |
| **408** | Request Timeout | Sent on idle connection; server wants to shut down unused connection |
| **409** | Conflict | Request conflicts with server's current state |
| **410** | Gone | Requested content permanently deleted from server with no forwarding address |
| **411** | Length Required | Server rejected request because `Content-Length` header not defined |
| **412** | Precondition Failed | Client's preconditions in headers not met by server |
| **413** | Content Too Large | Request body larger than limits defined by server |
| **414** | URI Too Long | URI requested by client longer than server willing to interpret |
| **415** | Unsupported Media Type | Media format of requested data not supported by server |
| **416** | Range Not Satisfiable | Ranges specified by `Range` header cannot be fulfilled |
| **417** | Expectation Failed | Expectation indicated by `Expect` request header cannot be met |
| **418** | I'm a teapot | Server refuses attempt to brew coffee with a teapot (April Fools' RFC 2324) |
| **421** | Misdirected Request | Request directed at server unable to produce response |
| **422** | Unprocessable Content | (WebDAV) Well-formed but unable to process due to semantic errors |
| **423** | Locked | (WebDAV) Resource being accessed is locked |
| **424** | Failed Dependency | (WebDAV) Request failed due to failure of a previous request |
| **425** | Too Early | (Experimental) Server unwilling to risk processing request that might be replayed |
| **426** | Upgrade Required | Server refuses current protocol but willing after client upgrades |
| **428** | Precondition Required | Origin server requires request to be conditional |
| **429** | Too Many Requests | User sent too many requests in given time (rate limiting) |
| **431** | Request Header Fields Too Large | Server unwilling to process because header fields too large |
| **451** | Unavailable For Legal Reasons | Resource cannot legally be provided |

### 5xx: Server Error Responses (500-599)

| Code | Status | Description |
|------|--------|-------------|
| **500** | Internal Server Error | Server encountered situation it does not know how to handle |
| **501** | Not Implemented | Request method not supported by server |
| **502** | Bad Gateway | Server (acting as gateway) got invalid response from upstream server |
| **503** | Service Unavailable | Server not ready to handle request (maintenance, overloaded) |
| **504** | Gateway Timeout | Server (acting as gateway) cannot get response in time |
| **505** | HTTP Version Not Supported | HTTP version used in request not supported by server |
| **506** | Variant Also Negotiates | Server has internal configuration error in content negotiation |
| **507** | Insufficient Storage | (WebDAV) Method could not be performed; server unable to store representation |
| **508** | Loop Detected | (WebDAV) Server detected infinite loop while processing request |
| **510** | Not Extended | Client request declares HTTP Extension that is not supported |
| **511** | Network Authentication Required | Client needs to authenticate to gain network access |

**Specification**: Status codes defined by RFC 9110.

---

## 10. HTTP Resources and Specifications

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Resources_and_specifications>

### Core HTTP Specifications

| RFC | Title | Status |
|-----|-------|--------|
| RFC 9110 | HTTP Semantics | Internet Standard |
| RFC 9111 | HTTP Caching | Internet Standard |
| RFC 9112 | HTTP/1.1 | Internet Standard |
| RFC 9113 | HTTP/2 | Proposed Standard |
| RFC 9114 | HTTP/3 | Proposed Standard |

### HTTP Extensions and Features

| Resource | Title | Status |
|----------|-------|--------|
| RFC 5861 | HTTP Cache-Control Extensions for Stale Content | Informational |
| RFC 8246 | HTTP Immutable Responses | Proposed Standard |
| RFC 6265 | HTTP State Management Mechanism (Cookies) | Proposed Standard |
| RFC 2145 | Use and Interpretation of HTTP Version Numbers | Informational |
| RFC 6585 | Additional HTTP Status Codes | Proposed Standard |
| RFC 7725 | An HTTP Status Code to Report Legal Obstacles | On Standard Track |

### Cookie-Related Specifications

| Resource | Title | Status |
|----------|-------|--------|
| Draft Spec | Cookie Prefixes | IETF Draft |
| Draft Spec | Same-Site Cookies | IETF Draft |
| Draft Spec | Deprecate modification of 'secure' cookies from non-secure origins | IETF Draft |

### URI and Web Linking

| RFC | Title | Status |
|-----|-------|--------|
| RFC 2397 | The "data" URL scheme | Proposed Standard |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax | Internet Standard |
| RFC 5988 | Web Linking (Defines Link header) | Proposed Standard |

### Content and Data Handling

| RFC | Title | Status |
|-----|-------|--------|
| RFC 7578 | Returning Values from Forms: multipart/form-data | Proposed Standard |
| RFC 6266 | Use of the Content-Disposition Header Field in HTTP | Proposed Standard |
| RFC 2183 | Communicating Presentation Information: Content-Disposition Header Field | Proposed Standard |

### Network and Protocol Extensions

| RFC | Title | Status |
|-----|-------|--------|
| RFC 7239 | Forwarded HTTP Extension | Proposed Standard |
| RFC 6455 | The WebSocket Protocol | Proposed Standard |

### Transport Layer Security (TLS/HTTPS)

| RFC | Title | Status |
|-----|-------|--------|
| RFC 5246 | TLS Protocol Version 1.2 | Proposed Standard |
| RFC 8446 | TLS Protocol Version 1.3 (Supersedes 1.2) | Proposed Standard |
| RFC 2817 | Upgrading to TLS Within HTTP/1.1 | Proposed Standard |

### HTTP/2 and HTTP/3 Support

| RFC | Title | Status |
|-----|-------|--------|
| RFC 7541 | HPACK: Header Compression for HTTP/2 | On Standard Track |
| RFC 7838 | HTTP Alternative Services | On Standard Track |
| RFC 7301 | TLS Application-Layer Protocol Negotiation Extension | Proposed Standard |

### Security and Privacy

| Resource | Title | Status |
|----------|-------|--------|
| RFC 6454 | The Web Origin Concept | Proposed Standard |
| Fetch Spec | Cross-Origin Resource Sharing (CORS) | Living Standard |
| RFC 7034 | HTTP Header Field X-Frame-Options | Informational |
| RFC 6797 | HTTP Strict Transport Security (HSTS) | Proposed Standard |
| W3C Spec | Upgrade Insecure Requests | Candidate Recommendation |
| W3C Spec | Content Security Policy Level 3 | Working Draft |

### Additional and Experimental

| RFC | Title | Status |
|-----|-------|--------|
| RFC 5689 | HTTP Extensions for WebDAV | Proposed Standard |
| RFC 7240 | Prefer Header for HTTP | Proposed Standard |
| RFC 7486 | HTTP Origin-Bound Auth (HOBA) | Experimental |

### Key Standards Bodies

- **IETF** -- Internet Engineering Task Force (RFC specifications)
- **W3C** -- World Wide Web Consortium
- **WHATWG** -- Web Hypertext Application Technology Working Group
- **WICG** -- Web Incubator Community Group
