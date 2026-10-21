# Code examples for Python 3

- Use Python 3's built-in [`ipaddress` package](https://docs.python.org/3/library/ipaddress.html), with `strict=True` passed to constructors where available.
- Be intentional about IPv4 vs IPv6 address parsing—they are not the same for professional network engineers. Use the strongest type/class available.
- Remember that a subnet can contain a single host: use `/128` for IPv6 and `/32` for IPv4.

## IP address and subnet parsing

- Use the [convenience factory functions in `ipaddress`](https://docs.python.org/3/library/ipaddress.html#convenience-factory-functions).

    The following `ipaddress.ip_address(textAddress)` examples parse text into `IPv4Address` and `IPv6Address` objects, respectively:

    ```python
    ipaddress.ip_address('192.168.0.1')
    ipaddress.ip_address('2001:db8::')
    ```

    The following `ipaddress.ip_network(address, strict=True)` example parses a subnet string and returns an `IPv4Network` or `IPv6Network` object, failing on invalid input:

    ```python
    ipaddress.ip_network('192.168.0.0/28', strict=True)
    ```

    The following strict-mode call fails (correctly) with `ValueError: 192.168.0.1/30 has host bits set`. Ask the user to fix such errors; do not guess corrections:

    ```python
    ipaddress.ip_network('192.168.0.1/30', strict=True)
    ```

- Use the strict-form parser [`ipaddress.ip_network(address, strict=True)`](https://docs.python.org/3/library/ipaddress.html#ipaddress.ip_network).

## Dictionary of IP subnets

Use a Python dictionary to track subnets and their associated geolocation properties. `IPv4Network`, `IPv6Network`, `IPv4Address`, and `IPv6Address` are all hashable and can be used as dictionary keys.

## Detecting non-public IP ranges

The SKILL.md references `is_private` for detecting non-public ranges. Use the network's properties:

```python
import ipaddress

def is_non_public(network):
    """Check if a network is non-public (private, loopback, link-local, multicast, or reserved).
    
    Note: In Python < 3.11, is_private may incorrectly flag some ranges
    (e.g., 100.64.0.0/10 CGNAT space). Use is_global as the primary check
    when available, with fallbacks for edge cases.
    """
    addr = network.network_address
    return (
        network.is_private
        or network.is_loopback
        or network.is_link_local
        or network.is_multicast
        or network.is_reserved
        or not network.is_global  # catches most non-routable space
    )
```

**Caution with `is_private` on Python < 3.11:** The `100.64.0.0/10` (Carrier-Grade NAT) range returns `is_private=True` but `is_global=False` in older Python versions. Since CGNAT space is not globally routable, flagging it as non-public is correct for RFC 8805 purposes.

## ISO 3166-1 country code validation

Read the valid ISO 2-letter country codes from [assets/iso3166-1.json](../assets/iso3166-1.json), specifically the `alpha_2` attribute:

```python
import json

with open('assets/iso3166-1.json') as f:
    data = json.load(f)
    valid_countries = {c['alpha_2'] for c in data['3166-1']}
```

## ISO 3166-2 region code validation

Read the valid region codes from [assets/iso3166-2.json](../assets/iso3166-2.json), specifically the `code` attribute. The top-level key is `3166-2` (matching the iso3166-1 pattern):

```python
import json

with open('assets/iso3166-2.json') as f:
    data = json.load(f)
    valid_regions = {r['code'] for r in data['3166-2']}
```
