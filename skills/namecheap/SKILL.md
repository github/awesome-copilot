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
   a. **Show public IP** — run `curl -s https://api.ipify.org` to display the user's public IP
   b. **Instruct IP whitelisting** — tell the user to go to https://ap.www.namecheap.com/settings/tools/apiaccess/, enable API (select ON), and whitelist the displayed IP
   c. **Collect credentials** — use `ask_user` to get their Namecheap username, then their API key
   d. **Save config** — write credentials to `~/.namecheap-api` with `chmod 600`
   e. **Validate** — run a test API call to confirm access works

### DNS Operations

Use the `namecheap.sh` script (bundled in this skill's directory) for all API interactions:

```bash
# Show public IP (for setup)
bash namecheap.sh public-ip

# Run setup flow
bash namecheap.sh setup

# List domains
bash namecheap.sh domains.getList

# Get nameservers for a domain (shows if using Namecheap DNS or custom)
bash namecheap.sh domains.dns.getList --domain example.com

# Get DNS records for a domain
bash namecheap.sh domains.dns.getHosts --domain example.com

# Add a single record (preserves existing records)
bash namecheap.sh dns.addHost --domain example.com --type A --name www --address 1.2.3.4 --ttl 1800

# Remove a single record
bash namecheap.sh dns.removeHost --domain example.com --type A --name www --address 1.2.3.4

# Replace all records from a JSON file
bash namecheap.sh domains.dns.setHosts --domain example.com --hosts records.json

# Switch to Namecheap default DNS
bash namecheap.sh domains.dns.setDefault --domain example.com

# Switch to custom nameservers
bash namecheap.sh domains.dns.setCustom --domain example.com --nameservers ns1.cloudflare.com,ns2.cloudflare.com

# Get email forwarding rules
bash namecheap.sh domains.dns.getEmailForwarding --domain example.com

# Set email forwarding (single rule)
bash namecheap.sh domains.dns.setEmailForwarding --domain example.com --mailbox info --forward-to user@gmail.com

# Set email forwarding (from JSON file)
bash namecheap.sh domains.dns.setEmailForwarding --domain example.com --forwards forwards.json

# Create a child nameserver (glue record)
bash namecheap.sh domains.ns.create --domain example.com --nameserver ns1.example.com --ip 1.2.3.4

# Delete a child nameserver
bash namecheap.sh domains.ns.delete --domain example.com --nameserver ns1.example.com

# Get nameserver info
bash namecheap.sh domains.ns.getInfo --domain example.com --nameserver ns1.example.com

# Update nameserver IP
bash namecheap.sh domains.ns.update --domain example.com --nameserver ns1.example.com --old-ip 1.2.3.4 --ip 5.6.7.8
```

## Behavior

- **Always check credentials first.** Before any API operation, verify `~/.namecheap-api` exists and is readable. If not, run the setup flow.
- **Show current records before modifying.** Before adding or removing records, always fetch and display the current DNS records so the user can confirm the change.
- **Use `ask_user` to confirm destructive changes.** Before removing records or replacing all records with `setHosts`, confirm with the user.
- **The Namecheap `setHosts` API replaces ALL records.** Never call `domains.dns.setHosts` directly unless you have fetched all existing records first. Use `dns.addHost` and `dns.removeHost` for safe single-record operations — they handle the fetch-modify-write cycle internally.
- **Explain TTL in human terms.** When the user asks about TTL, explain that 1800 = 30 minutes, 3600 = 1 hour, etc.
- **Handle multi-part TLDs.** Domains like `example.co.uk` have SLD=example and TLD=co.uk. The script handles this automatically.

## Credential Storage

Credentials are stored in `~/.namecheap-api`:

```bash
NAMECHEAP_API_USER="username"
NAMECHEAP_API_KEY="api-key-here"
```

This file must have `600` permissions (owner read/write only).

## Supported Record Types

A, AAAA, CNAME, MX, MXE, TXT, URL, URL301, FRAME

## References

See `references/namecheap-api.md` for full API documentation including request/response formats.
