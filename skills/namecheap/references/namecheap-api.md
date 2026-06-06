# Namecheap API Reference

## Base URL

```
https://api.namecheap.com/xml.response
```

## Authentication

All requests require these common parameters:

| Parameter | Description |
|-----------|-------------|
| `ApiUser` | Namecheap username |
| `ApiKey` | API key from https://ap.www.namecheap.com/settings/tools/apiaccess/ |
| `UserName` | Same as ApiUser |
| `ClientIp` | The whitelisted public IP address of the client |
| `Command` | The API command prefixed with `namecheap.` |

## Setup Requirements

1. Log in to Namecheap
2. Go to https://ap.www.namecheap.com/settings/tools/apiaccess/
3. Enable API Access (toggle to ON)
4. Add the client's public IP address to the whitelist
5. Copy the generated API key

## Commands

---

### namecheap.domains.getList

Lists all domains in the account.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ListType` | No | `ALL` (default), `EXPIRING`, or `EXPIRED` |
| `SearchTerm` | No | Keyword to filter domains |
| `Page` | No | Page number (default: 1) |
| `PageSize` | No | Results per page, 10-100 (default: 20) |
| `SortBy` | No | `NAME`, `NAME_DESC`, `EXPIREDATE`, `EXPIREDATE_DESC`, `CREATEDATE`, `CREATEDATE_DESC` |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.getList">
    <DomainGetListResult>
      <Domain ID="123" Name="example.com" User="user" Created="01/01/2020"
        Expires="01/01/2025" IsExpired="false" IsLocked="true" AutoRenew="true"
        WhoisGuard="ENABLED" />
    </DomainGetListResult>
    <Paging><TotalItems>5</TotalItems><CurrentPage>1</CurrentPage><PageSize>20</PageSize></Paging>
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.getList

Gets the list of DNS servers associated with a domain (shows whether it uses Namecheap DNS or custom nameservers).

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain (e.g., `example` for `example.com`) |
| `TLD` | Yes | Top-level domain (e.g., `com` for `example.com`) |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.getList">
    <DomainDNSGetListResult Domain="example.com" IsUsingOurDNS="true">
      <Nameserver>dns1.registrar-servers.com</Nameserver>
      <Nameserver>dns2.registrar-servers.com</Nameserver>
    </DomainDNSGetListResult>
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.getHosts

Gets DNS host records for a domain.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain (e.g., `example` for `example.com`) |
| `TLD` | Yes | Top-level domain (e.g., `com` for `example.com`) |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.getHosts">
    <DomainDNSGetHostsResult Domain="example.com" IsUsingOurDNS="true">
      <host HostId="1" Name="@" Type="A" Address="1.2.3.4" MXPref="0" TTL="1800" />
      <host HostId="2" Name="www" Type="CNAME" Address="example.com." MXPref="0" TTL="1800" />
      <host HostId="3" Name="@" Type="MX" Address="mail.example.com." MXPref="10" TTL="1800" />
      <host HostId="4" Name="@" Type="TXT" Address="v=spf1 include:_spf.google.com ~all" MXPref="0" TTL="1800" />
    </DomainDNSGetHostsResult>
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.setHosts

Sets (replaces) all DNS host records for a domain.

**IMPORTANT:** This command replaces ALL existing records. Always fetch existing records first.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `HostNameN` | Yes | Host name for record N (e.g., `@`, `www`, `mail`) |
| `RecordTypeN` | Yes | Record type for record N (A, AAAA, CNAME, MX, TXT, etc.) |
| `AddressN` | Yes | Value for record N (IP address or target hostname) |
| `MXPrefN` | No | MX priority for record N (required for MX records) |
| `TTLN` | No | TTL in seconds for record N (default: 1800) |

Records are numbered starting from 1: `HostName1`, `RecordType1`, `Address1`, `HostName2`, `RecordType2`, `Address2`, etc.

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.setHosts">
    <DomainDNSSetHostsResult Domain="example.com" IsSuccess="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.setDefault

Sets a domain to use Namecheap's default DNS servers.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.setDefault">
    <DomainDNSSetDefaultResult Domain="example.com" Updated="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.setCustom

Sets a domain to use custom nameservers (e.g., Cloudflare, Route53).

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `Nameservers` | Yes | Comma-separated list of nameservers (max 12, no spaces) |

**Example:** `Nameservers=ns1.cloudflare.com,ns2.cloudflare.com`

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.setCustom">
    <DomainDNSSetCustomResult Domain="example.com" Updated="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.getEmailForwarding

Gets email forwarding settings for a domain.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `DomainName` | Yes | Full domain name (e.g., `example.com`) |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.getEmailForwarding">
    <DomainDNSGetEmailForwardingResult Domain="example.com">
      <Forward mailboxid="1" mailbox="info" ForwardTo="user@gmail.com" />
      <Forward mailboxid="2" mailbox="support" ForwardTo="help@company.com" />
    </DomainDNSGetEmailForwardingResult>
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.dns.setEmailForwarding

Sets email forwarding for a domain. Replaces all existing forwarding rules.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `DomainName` | Yes | Full domain name (e.g., `example.com`) |
| `MailBoxN` | Yes | Mailbox name for rule N (e.g., `info`, `support`) |
| `ForwardToN` | Yes | Destination email for rule N |

Rules are numbered starting from 1: `MailBox1`, `ForwardTo1`, `MailBox2`, `ForwardTo2`, etc.
Omitting all MailBox/ForwardTo parameters deletes all forwarding rules.

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.dns.setEmailForwarding">
    <DomainDNSSetEmailForwardingResult Domain="example.com" IsSuccess="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.ns.create

Creates a child nameserver (glue record) for a domain.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `Nameserver` | Yes | Nameserver hostname to create (e.g., `ns1.example.com`) |
| `IP` | Yes | IP address for the nameserver |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.ns.create">
    <DomainNSCreateResult Domain="example.com" Nameserver="ns1.example.com" IP="1.2.3.4" IsSuccess="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.ns.delete

Deletes a child nameserver.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `Nameserver` | Yes | Nameserver hostname to delete |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.ns.delete">
    <DomainNSDeleteResult Domain="example.com" Nameserver="ns1.example.com" IsSuccess="true" />
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.ns.getInfo

Gets information about a child nameserver.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `Nameserver` | Yes | Nameserver hostname to query |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.ns.getInfo">
    <DomainNSInfoResult Domain="example.com" Nameserver="ns1.example.com" IP="1.2.3.4">
      <NameserverStatuses>
        <Status>OK</Status>
      </NameserverStatuses>
    </DomainNSInfoResult>
  </CommandResponse>
</ApiResponse>
```

---

### namecheap.domains.ns.update

Updates the IP address of a child nameserver.

**Additional Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `SLD` | Yes | Second-level domain |
| `TLD` | Yes | Top-level domain |
| `Nameserver` | Yes | Nameserver hostname to update |
| `OldIP` | Yes | Current IP address of the nameserver |
| `IP` | Yes | New IP address for the nameserver |

**Response XML:**

```xml
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.ns.update">
    <DomainNSUpdateResult Domain="example.com" Nameserver="ns1.example.com" IsSuccess="true" />
  </CommandResponse>
</ApiResponse>
```

## Error Responses

```xml
<ApiResponse Status="ERROR">
  <Errors>
    <Err Code="2019166">Domain not found</Err>
  </Errors>
</ApiResponse>
```

Common error codes:
- `1011102` — Invalid API key
- `1011148` — IP not whitelisted
- `2019166` — Domain not found
- `2016166` — Domain not using Namecheap DNS

## Record Types

| Type | Description | Address Format |
|------|-------------|---------------|
| `A` | IPv4 address | `1.2.3.4` |
| `AAAA` | IPv6 address | `2001:db8::1` |
| `CNAME` | Canonical name | `target.example.com.` |
| `MX` | Mail exchange | `mail.example.com.` (requires MXPref) |
| `MXE` | MX equivalent (IP) | `1.2.3.4` |
| `TXT` | Text record | Any text value |
| `URL` | URL redirect (unmasked) | `http://example.com` |
| `URL301` | Permanent redirect | `http://example.com` |
| `FRAME` | URL redirect (masked) | `http://example.com` |

## TTL Values

| Seconds | Human Readable |
|---------|---------------|
| 60 | 1 minute |
| 300 | 5 minutes |
| 1800 | 30 minutes (default) |
| 3600 | 1 hour |
| 14400 | 4 hours |
| 43200 | 12 hours |
| 86400 | 1 day |
