#!/usr/bin/env python3
"""Namecheap API CLI wrapper for DNS management.

Uses only the Python standard library (no third-party dependencies). Credentials
are read from ``~/.namecheap-api`` (or env vars) and are never passed on the
command line, so they cannot leak via ``ps``/shell history.
"""

import argparse
import getpass
import json
import os
import re
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

API_URL = "https://api.namecheap.com/xml.response"
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".namecheap-api")

# Known multi-part (second-level) public suffixes. Best-effort list, not a full
# public-suffix database. For unlisted suffixes the domain is split on the last
# dot, which is correct for single-label TLDs (.com, .io, .dev, ...).
MULTI_PART_SUFFIXES = {
    "co.uk", "org.uk", "me.uk", "ac.uk", "gov.uk", "net.uk", "ltd.uk", "plc.uk",
    "com.au", "net.au", "org.au", "id.au",
    "co.nz", "net.nz", "org.nz",
    "co.za", "org.za",
    "co.jp", "ne.jp", "or.jp", "ac.jp", "go.jp",
    "co.kr", "or.kr", "ne.kr",
    "com.br", "net.br", "org.br",
    "com.cn", "net.cn", "org.cn",
    "co.in", "net.in", "org.in",
    "com.mx", "org.mx",
    "com.sg", "edu.sg",
    "com.tr",
    "co.il", "org.il",
}

# Cached public IP for the lifetime of the process.
_public_ip = None


# --- Output helpers -------------------------------------------------------

_USE_COLOR = sys.stdout.isatty()


def _c(code, text):
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text


def err(msg):
    print(_c("0;31", "Error:") + " " + msg, file=sys.stderr)


def success(msg):
    print(_c("0;32", "\u2713") + " " + msg)


def info(msg):
    print(_c("0;36", "\u2139") + " " + msg)


def warn(msg):
    print(_c("1;33", "\u26a0") + " " + msg)


class NamecheapError(Exception):
    """Raised when the API returns a Status="ERROR" response."""


# --- Configuration --------------------------------------------------------

def load_config():
    """Return (api_user, api_key), preferring env vars then the config file."""
    api_user = os.environ.get("NAMECHEAP_API_USER")
    api_key = os.environ.get("NAMECHEAP_API_KEY")
    if api_user and api_key:
        return api_user, api_key

    if os.path.isfile(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as fh:
            content = fh.read()
        # File uses shell-style KEY="value" lines for backward compatibility.
        pattern = re.compile(r'^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$', re.MULTILINE)
        values = {m.group(1): m.group(2) for m in pattern.finditer(content)}
        api_user = api_user or values.get("NAMECHEAP_API_USER")
        api_key = api_key or values.get("NAMECHEAP_API_KEY")

    return api_user, api_key


def check_credentials():
    api_user, api_key = load_config()
    if not api_user or not api_key:
        err("Namecheap API credentials not configured.")
        print()
        print("Run 'python3 namecheap.py setup' to configure your credentials.")
        print()
        print("You need:")
        print("  1. Your Namecheap username")
        print("  2. An API key from: https://ap.www.namecheap.com/settings/tools/apiaccess/")
        print("  3. Your public IP whitelisted in the API settings")
        sys.exit(1)
    return api_user, api_key


def save_config(api_user, api_key):
    with open(CONFIG_FILE, "w", encoding="utf-8") as fh:
        fh.write(f'NAMECHEAP_API_USER="{api_user}"\n')
        fh.write(f'NAMECHEAP_API_KEY="{api_key}"\n')
    os.chmod(CONFIG_FILE, stat.S_IRUSR | stat.S_IWUSR)  # 600


# --- Networking -----------------------------------------------------------

def _http_get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "namecheap-skill/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (https only)
        return resp.read().decode("utf-8", errors="replace")


def get_public_ip():
    """Resolve the public IP once and cache it for subsequent calls."""
    global _public_ip
    if _public_ip:
        return _public_ip
    for url in ("https://api.ipify.org", "https://ifconfig.me"):
        try:
            ip = _http_get(url, timeout=10).strip()
            if ip:
                _public_ip = ip
                return ip
        except Exception:
            continue
    _public_ip = "unknown"
    return _public_ip


def _strip_namespaces(root):
    for elem in root.iter():
        if isinstance(elem.tag, str) and "}" in elem.tag:
            elem.tag = elem.tag.split("}", 1)[1]
    return root


def _check_error(root):
    if (root.attrib.get("Status") or "").upper() == "ERROR":
        messages = []
        for e in root.iter("Err"):
            code = e.attrib.get("Number") or e.attrib.get("Code") or ""
            text = (e.text or "").strip()
            messages.append(f"[{code}] {text}" if code else text)
        raise NamecheapError("; ".join(m for m in messages if m) or "Unknown API error")


def api_request(command, params=None):
    """Issue a Namecheap API GET request and return the parsed (ns-stripped) root.

    The API key is encoded into the request URL inside this process; it is never
    passed as a command-line argument, so it cannot leak via ``ps`` or shell
    history. Values are URL-encoded by ``urllib``.
    """
    api_user, api_key = check_credentials()
    query = {
        "ApiUser": api_user,
        "ApiKey": api_key,
        "UserName": api_user,
        "Command": f"namecheap.{command}",
        "ClientIp": get_public_ip(),
    }
    for key, value in (params or {}).items():
        if value is not None and value != "":
            query[key] = value

    url = f"{API_URL}?{urllib.parse.urlencode(query)}"
    body = _http_get(url, timeout=30)
    root = _strip_namespaces(ET.fromstring(body))
    _check_error(root)
    return root


def _attr(root, tag, name, default=""):
    for elem in root.iter(tag):
        return elem.attrib.get(name, default)
    return default


# --- Domain parsing -------------------------------------------------------

def parse_domain(domain):
    """Split a registered domain into (SLD, TLD), handling multi-part TLDs."""
    domain = domain.strip().rstrip(".").lower()
    labels = domain.split(".")
    if len(labels) >= 3 and ".".join(labels[-2:]) in MULTI_PART_SUFFIXES:
        tld = ".".join(labels[-2:])
        sld = ".".join(labels[:-2])
    elif len(labels) >= 2:
        tld = labels[-1]
        sld = ".".join(labels[:-1])
    else:
        tld = ""
        sld = domain
    return sld, tld


# --- Commands -------------------------------------------------------------

def cmd_public_ip(_args):
    print(get_public_ip())


def cmd_setup(_args):
    print("=== Namecheap API Setup ===\n")
    public_ip = get_public_ip()
    info("Your public IP address is: " + _c("0;36", public_ip))
    print()
    print("Make sure this IP is whitelisted at:")
    print("  https://ap.www.namecheap.com/settings/tools/apiaccess/")
    print()

    existing_user, existing_key = load_config()
    if existing_user and existing_key:
        info(f"Existing configuration found for user: {existing_user}")
        print("\nTesting API connection...")
        try:
            api_request("domains.getList", {"PageSize": "1"})
            success("API connection successful!")
        except Exception as exc:  # noqa: BLE001
            err(f"API connection failed: {exc}")
        print()
        answer = input("Update stored credentials? [y/N]: ").strip().lower()
        if answer not in ("y", "yes"):
            info("Keeping existing credentials.")
            return
        print()

    print("Enter your Namecheap credentials:\n")
    api_user = input("  API Username: ").strip()
    api_key = getpass.getpass("  API Key (hidden): ").strip()
    print()

    if not api_user or not api_key:
        err("Both username and API key are required.")
        sys.exit(1)

    save_config(api_user, api_key)
    success(f"Credentials saved to {CONFIG_FILE}")
    print("\nTesting API connection...")
    try:
        # Use the just-entered credentials directly for the validation call.
        os.environ["NAMECHEAP_API_USER"] = api_user
        os.environ["NAMECHEAP_API_KEY"] = api_key
        api_request("domains.getList", {"PageSize": "1"})
        success("API connection successful!")
    except Exception as exc:  # noqa: BLE001
        warn("API connection failed. Please verify:")
        print("  1. API access is enabled (ON) at the Namecheap settings page")
        print(f"  2. IP address {public_ip} is whitelisted")
        print("  3. Your API key is correct")
        print(f"  (details: {exc})")


def cmd_domains_list(args):
    params = {"ListType": args.type, "Page": str(args.page), "PageSize": str(args.page_size)}
    if args.search:
        params["SearchTerm"] = args.search
    info("Fetching domain list...")
    root = api_request("domains.getList", params)

    print()
    print(f"{'DOMAIN':<30} {'EXPIRES':<12} {'LOCKED':<12} {'AUTO-RENEW':<10}")
    print(f"{'------':<30} {'-------':<12} {'------':<12} {'----------':<10}")
    for d in root.iter("Domain"):
        print("{:<30} {:<12} {:<12} {:<10}".format(
            d.attrib.get("Name", ""),
            d.attrib.get("Expires", ""),
            d.attrib.get("IsLocked", ""),
            d.attrib.get("AutoRenew", ""),
        ))
    print()


def _print_hosts(root):
    print()
    print(f"{'HOST':<20} {'TYPE':<8} {'ADDRESS':<40} {'TTL':<8} {'MXPREF':<6}")
    print(f"{'----':<20} {'----':<8} {'-------':<40} {'---':<8} {'------':<6}")
    for h in root.iter("host"):
        print("{:<20} {:<8} {:<40} {:<8} {:<6}".format(
            h.attrib.get("Name", ""),
            h.attrib.get("Type", ""),
            h.attrib.get("Address", ""),
            h.attrib.get("TTL", "1800"),
            h.attrib.get("MXPref", "-"),
        ))
    print()


def cmd_dns_get_hosts(args):
    sld, tld = parse_domain(args.domain)
    info(f"Fetching DNS records for {args.domain} (SLD={sld}, TLD={tld})...")
    root = api_request("domains.dns.getHosts", {"SLD": sld, "TLD": tld})
    _print_hosts(root)


def _existing_hosts(root):
    """Return existing host records as a list of dicts."""
    records = []
    for h in root.iter("host"):
        records.append({
            "name": h.attrib.get("Name", ""),
            "type": h.attrib.get("Type", ""),
            "address": h.attrib.get("Address", ""),
            "ttl": h.attrib.get("TTL", "1800"),
            "mxpref": h.attrib.get("MXPref", ""),
        })
    return records


def _hosts_to_params(sld, tld, records):
    params = {"SLD": sld, "TLD": tld}
    i = 1
    for r in records:
        if not (r["name"] and r["type"] and r["address"]):
            continue
        params[f"HostName{i}"] = r["name"]
        params[f"RecordType{i}"] = r["type"]
        params[f"Address{i}"] = r["address"]
        params[f"TTL{i}"] = r.get("ttl") or "1800"
        mxpref = r.get("mxpref")
        if mxpref not in (None, ""):
            # MX priority 0 is valid, so always send MXPref for MX records;
            # for other record types only forward a non-zero value.
            if r["type"].upper() == "MX" or mxpref != "0":
                params[f"MXPref{i}"] = mxpref
        i += 1
    return params, i - 1


def cmd_dns_set_hosts(args):
    if not os.path.isfile(args.hosts):
        err(f"Hosts file not found: {args.hosts}")
        sys.exit(1)
    with open(args.hosts, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    records = []
    for r in raw:
        records.append({
            "name": r.get("HostName", ""),
            "type": r.get("RecordType", ""),
            "address": r.get("Address", ""),
            "ttl": str(r.get("TTL", "") or ""),
            "mxpref": str(r.get("MXPref", "") or ""),
        })

    sld, tld = parse_domain(args.domain)
    params, count = _hosts_to_params(sld, tld, records)
    if count == 0:
        err(f"No valid host records found in {args.hosts}")
        sys.exit(1)

    info(f"Setting {count} DNS records for {args.domain}...")
    root = api_request("domains.dns.setHosts", params)
    if _attr(root, "DomainDNSSetHostsResult", "IsSuccess").lower() == "true":
        success(f"DNS records updated successfully for {args.domain}!")
    else:
        err("Failed to update DNS records.")
        sys.exit(1)


def cmd_dns_add_host(args):
    sld, tld = parse_domain(args.domain)
    info(f"Fetching existing DNS records for {args.domain}...")
    root = api_request("domains.dns.getHosts", {"SLD": sld, "TLD": tld})
    records = _existing_hosts(root)
    records.append({
        "name": args.name,
        "type": args.type.upper(),
        "address": args.address,
        "ttl": args.ttl,
        "mxpref": args.mxpref or "",
    })
    params, _ = _hosts_to_params(sld, tld, records)

    info(f"Adding {args.type.upper()} record: {args.name} -> {args.address}")
    result = api_request("domains.dns.setHosts", params)
    if _attr(result, "DomainDNSSetHostsResult", "IsSuccess").lower() == "true":
        success(f"DNS record added: {args.name} {args.type} {args.address}")
    else:
        err("Failed to add DNS record.")
        sys.exit(1)


def cmd_dns_remove_host(args):
    sld, tld = parse_domain(args.domain)
    info(f"Fetching existing DNS records for {args.domain}...")
    root = api_request("domains.dns.getHosts", {"SLD": sld, "TLD": tld})

    kept = []
    removed = False
    for r in _existing_hosts(root):
        if (not removed and r["name"] == args.name
                and r["type"].upper() == args.type.upper()
                and (not args.address or r["address"] == args.address)):
            removed = True
            info(f"Removing record: {r['name']} {r['type']} {r['address']}")
            continue
        kept.append(r)

    if not removed:
        err("No matching record found to remove.")
        sys.exit(1)

    params, count = _hosts_to_params(sld, tld, kept)
    if count == 0:
        err("Cannot remove the last DNS record. Namecheap requires at least one record.")
        sys.exit(1)

    info(f"Updating DNS records for {args.domain}...")
    result = api_request("domains.dns.setHosts", params)
    if _attr(result, "DomainDNSSetHostsResult", "IsSuccess").lower() == "true":
        success("DNS record removed successfully!")
    else:
        err("Failed to remove DNS record.")
        sys.exit(1)


def cmd_dns_get_list(args):
    sld, tld = parse_domain(args.domain)
    info(f"Fetching nameservers for {args.domain}...")
    root = api_request("domains.dns.getList", {"SLD": sld, "TLD": tld})

    using = _attr(root, "DomainDNSGetListResult", "IsUsingOurDNS", "unknown")
    print()
    info(f"Using Namecheap DNS: {using}")
    print("\nNameservers:")
    for ns in root.iter("Nameserver"):
        if ns.text:
            print(f"  - {ns.text.strip()}")
    print()


def cmd_dns_set_default(args):
    sld, tld = parse_domain(args.domain)
    info(f"Setting {args.domain} to use Namecheap default DNS...")
    root = api_request("domains.dns.setDefault", {"SLD": sld, "TLD": tld})
    if _attr(root, "DomainDNSSetDefaultResult", "Updated").lower() == "true":
        success(f"Domain {args.domain} now uses Namecheap default DNS!")
    else:
        err("Failed to set default DNS.")
        sys.exit(1)


def cmd_dns_set_custom(args):
    sld, tld = parse_domain(args.domain)
    info(f"Setting {args.domain} to use custom nameservers: {args.nameservers}")
    root = api_request(
        "domains.dns.setCustom",
        {"SLD": sld, "TLD": tld, "Nameservers": args.nameservers},
    )
    if _attr(root, "DomainDNSSetCustomResult", "Updated").lower() == "true":
        success(f"Domain {args.domain} now uses custom nameservers!")
    else:
        err("Failed to set custom nameservers.")
        sys.exit(1)


def cmd_dns_get_email_forwarding(args):
    info(f"Fetching email forwarding for {args.domain}...")
    root = api_request("domains.dns.getEmailForwarding", {"DomainName": args.domain})

    print()
    print(f"{'MAILBOX':<20} {'FORWARDS TO':<40}")
    print(f"{'-------':<20} {'-----------':<40}")
    for fwd in root.iter("Forward"):
        mailbox = (fwd.attrib.get("mailbox") or fwd.attrib.get("MailBox")
                   or fwd.attrib.get("Mailbox") or "")
        forward_to = (fwd.attrib.get("ForwardTo") or fwd.attrib.get("forwardto")
                      or (fwd.text or "").strip())
        print(f"{mailbox + '@' + args.domain:<20} {forward_to:<40}")
    print()


def cmd_dns_set_email_forwarding(args):
    params = {"DomainName": args.domain}

    if args.mailbox and args.forward_to:
        params["MailBox1"] = args.mailbox
        params["ForwardTo1"] = args.forward_to
    elif args.forwards:
        if not os.path.isfile(args.forwards):
            err(f"Forwards file not found: {args.forwards}")
            sys.exit(1)
        with open(args.forwards, "r", encoding="utf-8") as fh:
            rules = json.load(fh)
        i = 1
        for rule in rules:
            mailbox = rule.get("MailBox") or rule.get("mailbox") or ""
            forward_to = rule.get("ForwardTo") or rule.get("forwardto") or ""
            if mailbox and forward_to:
                params[f"MailBox{i}"] = mailbox
                params[f"ForwardTo{i}"] = forward_to
                i += 1
    else:
        err("Provide either --mailbox/--forward-to or --forwards <file.json>")
        sys.exit(1)

    info(f"Setting email forwarding for {args.domain}...")
    root = api_request("domains.dns.setEmailForwarding", params)
    if _attr(root, "DomainDNSSetEmailForwardingResult", "IsSuccess").lower() == "true":
        success(f"Email forwarding updated for {args.domain}!")
    else:
        err("Failed to set email forwarding.")
        sys.exit(1)


def cmd_ns_create(args):
    sld, tld = parse_domain(args.domain)
    info(f"Creating nameserver {args.nameserver} -> {args.ip}...")
    root = api_request(
        "domains.ns.create",
        {"SLD": sld, "TLD": tld, "Nameserver": args.nameserver, "IP": args.ip},
    )
    if _attr(root, "DomainNSCreateResult", "IsSuccess").lower() == "true":
        success(f"Nameserver {args.nameserver} created!")
    else:
        err("Failed to create nameserver.")
        sys.exit(1)


def cmd_ns_delete(args):
    sld, tld = parse_domain(args.domain)
    info(f"Deleting nameserver {args.nameserver}...")
    root = api_request(
        "domains.ns.delete",
        {"SLD": sld, "TLD": tld, "Nameserver": args.nameserver},
    )
    if _attr(root, "DomainNSDeleteResult", "IsSuccess").lower() == "true":
        success(f"Nameserver {args.nameserver} deleted!")
    else:
        err("Failed to delete nameserver.")
        sys.exit(1)


def cmd_ns_get_info(args):
    sld, tld = parse_domain(args.domain)
    info(f"Fetching info for nameserver {args.nameserver}...")
    root = api_request(
        "domains.ns.getInfo",
        {"SLD": sld, "TLD": tld, "Nameserver": args.nameserver},
    )
    ns_ip = _attr(root, "DomainNSInfoResult", "IP", "unknown")
    print()
    print(f"Nameserver: {args.nameserver}")
    print(f"IP Address: {ns_ip}")
    statuses = [s.text.strip() for s in root.iter("Status") if s.text and s.text.strip()]
    if statuses:
        print(f"Status:     {', '.join(statuses)}")
    print()


def cmd_ns_update(args):
    sld, tld = parse_domain(args.domain)
    info(f"Updating nameserver {args.nameserver}: {args.old_ip} -> {args.ip}...")
    root = api_request(
        "domains.ns.update",
        {"SLD": sld, "TLD": tld, "Nameserver": args.nameserver,
         "OldIP": args.old_ip, "IP": args.ip},
    )
    if _attr(root, "DomainNSUpdateResult", "IsSuccess").lower() == "true":
        success(f"Nameserver {args.nameserver} updated to {args.ip}!")
    else:
        err("Failed to update nameserver.")
        sys.exit(1)


# --- Argument parsing -----------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(
        prog="namecheap.py",
        description="Namecheap DNS Management CLI",
    )
    sub = parser.add_subparsers(dest="command", metavar="<command>")

    sub.add_parser("setup", help="Configure API credentials and test connection").set_defaults(func=cmd_setup)
    sub.add_parser("public-ip", help="Show your public IP address").set_defaults(func=cmd_public_ip)

    p = sub.add_parser("domains.getList", help="List your Namecheap domains")
    p.add_argument("--type", default="ALL")
    p.add_argument("--search", default="")
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--page-size", type=int, default=20)
    p.set_defaults(func=cmd_domains_list)

    p = sub.add_parser("domains.dns.getList", help="Get nameservers for a domain")
    p.add_argument("--domain", required=True)
    p.set_defaults(func=cmd_dns_get_list)

    p = sub.add_parser("domains.dns.getHosts", help="Get DNS records for a domain")
    p.add_argument("--domain", required=True)
    p.set_defaults(func=cmd_dns_get_hosts)

    p = sub.add_parser("domains.dns.setHosts", help="Set all DNS records (from JSON file)")
    p.add_argument("--domain", required=True)
    p.add_argument("--hosts", required=True)
    p.set_defaults(func=cmd_dns_set_hosts)

    p = sub.add_parser("domains.dns.setDefault", help="Use Namecheap default DNS")
    p.add_argument("--domain", required=True)
    p.set_defaults(func=cmd_dns_set_default)

    p = sub.add_parser("domains.dns.setCustom", help="Use custom nameservers")
    p.add_argument("--domain", required=True)
    p.add_argument("--nameservers", required=True)
    p.set_defaults(func=cmd_dns_set_custom)

    p = sub.add_parser("domains.dns.getEmailForwarding", help="Get email forwarding rules")
    p.add_argument("--domain", required=True)
    p.set_defaults(func=cmd_dns_get_email_forwarding)

    p = sub.add_parser("domains.dns.setEmailForwarding", help="Set email forwarding rules")
    p.add_argument("--domain", required=True)
    p.add_argument("--mailbox", default="")
    p.add_argument("--forward-to", default="")
    p.add_argument("--forwards", default="")
    p.set_defaults(func=cmd_dns_set_email_forwarding)

    p = sub.add_parser("domains.ns.create", help="Create a child nameserver (glue record)")
    p.add_argument("--domain", required=True)
    p.add_argument("--nameserver", required=True)
    p.add_argument("--ip", required=True)
    p.set_defaults(func=cmd_ns_create)

    p = sub.add_parser("domains.ns.delete", help="Delete a child nameserver")
    p.add_argument("--domain", required=True)
    p.add_argument("--nameserver", required=True)
    p.set_defaults(func=cmd_ns_delete)

    p = sub.add_parser("domains.ns.getInfo", help="Get nameserver info")
    p.add_argument("--domain", required=True)
    p.add_argument("--nameserver", required=True)
    p.set_defaults(func=cmd_ns_get_info)

    p = sub.add_parser("domains.ns.update", help="Update nameserver IP")
    p.add_argument("--domain", required=True)
    p.add_argument("--nameserver", required=True)
    p.add_argument("--old-ip", required=True)
    p.add_argument("--ip", required=True)
    p.set_defaults(func=cmd_ns_update)

    p = sub.add_parser("dns.addHost", help="Add a single DNS record (preserves existing)")
    p.add_argument("--domain", required=True)
    p.add_argument("--type", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--address", required=True)
    p.add_argument("--ttl", default="1800")
    p.add_argument("--mxpref", default="")
    p.set_defaults(func=cmd_dns_add_host)

    p = sub.add_parser("dns.removeHost", help="Remove a single DNS record")
    p.add_argument("--domain", required=True)
    p.add_argument("--type", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--address", default="")
    p.set_defaults(func=cmd_dns_remove_host)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "command", None):
        parser.print_help()
        return 1
    try:
        args.func(args)
    except NamecheapError as exc:
        err(f"API returned error: {exc}")
        return 1
    except urllib.error.URLError as exc:
        err(f"Network error: {exc}")
        return 1
    except (OSError, ET.ParseError, json.JSONDecodeError) as exc:
        err(str(exc))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
