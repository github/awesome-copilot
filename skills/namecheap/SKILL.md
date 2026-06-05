---
name: namecheap
description: 'Manage DNS records for domains registered with Namecheap via their API. List domains, view/add/update/remove DNS host entries (A, AAAA, CNAME, MX, TXT, etc.), and guide users through API setup including public IP detection and credential configuration. Use when the user mentions Namecheap, DNS records, domain management, or wants to add/change/remove A records, CNAME records, MX records, or TXT records for their domains.'
---

# Namecheap DNS Management

**UTILITY SKILL** — manages DNS records via the Namecheap API.
USE FOR: "add DNS record", "update A record", "manage Namecheap domains", "set CNAME", "add MX record", "add TXT record", "list my domains", "show DNS records", "namecheap setup", "configure namecheap API", "what is my public IP"
DO NOT USE FOR: domain registration/purchase, SSL certificate management, hosting configuration, non-Namecheap DNS providers

## Workflow

### First-time Setup

Before executing any API commands, verify credentials are configured:

1. **Check for existing config** — look for `~/.namecheap-api`
2. If not configured, guide the user through setup:
   a. **Show public IP** — run `python3 namecheap.py public-ip` to display the user's public IP
   b. **Instruct IP whitelisting** — tell the user to go to https://ap.www.namecheap.com/settings/tools/apiaccess/, enable API (select ON), and whitelist the displayed IP
   c. **Have the user run setup themselves** — ask the user to run `python3 namecheap.py setup` directly **in their own terminal**. The script prompts for the username and reads the API key with a hidden prompt (`getpass`), writes `~/.namecheap-api` with `chmod 600`, and validates the connection. **Never ask the user to paste their API key into the chat, and never log, echo, or display the API key value.** If you cannot run an interactive terminal for the user, instruct them to run `setup` themselves, or to export `NAMECHEAP_API_USER` and `NAMECHEAP_API_KEY` as environment variables in their own shell — rather than collecting the secret via `ask_user`.
   d. **Confirm** — once the user reports setup succeeded, proceed with DNS operations.

### DNS Operations

Use the `namecheap.py` script (bundled in this skill's directory) for all API interactions. It requires only Python 3 (standard library only — no `pip install` needed) and works the same on macOS, Linux, and Windows:

```bash
# Show public IP (for setup)
python3 namecheap.py public-ip

# Run setup flow
python3 namecheap.py setup

# List domains
python3 namecheap.py domains.getList

# Get nameservers for a domain (shows if using Namecheap DNS or custom)
python3 namecheap.py domains.dns.getList --domain example.com

# Get DNS records for a domain
python3 namecheap.py domains.dns.getHosts --domain example.com

# Add a single record (preserves existing records)
python3 namecheap.py dns.addHost --domain example.com --type A --name www --address 1.2.3.4 --ttl 1800

# Remove a single record
python3 namecheap.py dns.removeHost --domain example.com --type A --name www --address 1.2.3.4

# Replace all records from a JSON file
python3 namecheap.py domains.dns.setHosts --domain example.com --hosts records.json

# Switch to Namecheap default DNS
python3 namecheap.py domains.dns.setDefault --domain example.com

# Switch to custom nameservers
python3 namecheap.py domains.dns.setCustom --domain example.com --nameservers ns1.cloudflare.com,ns2.cloudflare.com

# Get email forwarding rules
python3 namecheap.py domains.dns.getEmailForwarding --domain example.com

# Set email forwarding (single rule)
python3 namecheap.py domains.dns.setEmailForwarding --domain example.com --mailbox info --forward-to user@gmail.com

# Set email forwarding (from JSON file)
python3 namecheap.py domains.dns.setEmailForwarding --domain example.com --forwards forwards.json

# Create a child nameserver (glue record)
python3 namecheap.py domains.ns.create --domain example.com --nameserver ns1.example.com --ip 1.2.3.4

# Delete a child nameserver
python3 namecheap.py domains.ns.delete --domain example.com --nameserver ns1.example.com

# Get nameserver info
python3 namecheap.py domains.ns.getInfo --domain example.com --nameserver ns1.example.com

# Update nameserver IP
python3 namecheap.py domains.ns.update --domain example.com --nameserver ns1.example.com --old-ip 1.2.3.4 --ip 5.6.7.8
```

### JSON file formats

`domains.dns.setHosts --hosts records.json` expects an array of objects with Namecheap API field names:

```json
[
  { "HostName": "@", "RecordType": "A", "Address": "1.2.3.4", "TTL": 1800 },
  { "HostName": "www", "RecordType": "CNAME", "Address": "@", "TTL": 1800 },
  { "HostName": "@", "RecordType": "MX", "Address": "mail.example.com.", "TTL": 1800, "MXPref": 10 }
]
```

`domains.dns.setEmailForwarding --forwards forwards.json` expects an array of mailbox rules:

```json
[
  { "MailBox": "info", "ForwardTo": "team@example.net" },
  { "MailBox": "sales", "ForwardTo": "owner@example.net" }
]
```

## Behavior

- **Always check credentials first.** Before any API operation, verify `~/.namecheap-api` exists and is readable. If not, run the setup flow.
- **Show current records before modifying.** Before adding or removing records, always fetch and display the current DNS records so the user can confirm the change.
- **Use `ask_user` to confirm destructive changes.** Before removing records or replacing all records with `setHosts`, confirm with the user.
- **The Namecheap `setHosts` API replaces ALL records.** Never call `domains.dns.setHosts` directly unless you have fetched all existing records first. Use `dns.addHost` and `dns.removeHost` for safe single-record operations — they handle the fetch-modify-write cycle internally.
- **Explain TTL in human terms.** When the user asks about TTL, explain that 1800 = 30 minutes, 3600 = 1 hour, etc.
- **Handle multi-part TLDs.** Domains like `example.co.uk` have SLD=example and TLD=co.uk. The script recognizes a built-in list of common second-level suffixes (e.g. `co.uk`, `com.au`, `co.jp`, `com.br`). This list is best-effort and not a full public-suffix database — if a domain with an unlisted multi-part suffix returns a `2019166` ("Domain not found") error, the SLD/TLD split was likely wrong. In that case, confirm the registered domain with the user and report the limitation.

## Credential Storage

Credentials are stored in `~/.namecheap-api`:

```bash
NAMECHEAP_API_USER="username"
NAMECHEAP_API_KEY="api-key-here"
```

This file must have `600` permissions (owner read/write only). Alternatively, the script reads credentials from the `NAMECHEAP_API_USER` and `NAMECHEAP_API_KEY` environment variables, which take precedence over the file when both are set.

## Supported Record Types

A, AAAA, CNAME, MX, MXE, TXT, URL, URL301, FRAME

## References

See `references/namecheap-api.md` for full API documentation including request/response formats.
