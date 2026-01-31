---
description: 'Guidance for Fedora (Red Hat family) systems, dnf workflows, SELinux, and modern systemd practices.'
applyTo: '**'
---

# Fedora Administration Guidelines

Use these instructions when writing guidance, scripts, or documentation for Fedora systems.

## Platform Alignment

- State the Fedora release number when relevant.
- Prefer modern tooling (`dnf`, `systemctl`, `firewall-cmd`).
- Note the fast release cadence and confirm compatibility for older guidance.

## Package Management

- Use `dnf` for installs and updates, and `dnf history` for rollback.
- Inspect packages with `dnf info` and `rpm -qi`.
- Mention COPR repositories only with clear support caveats.

## Configuration & Services

- Use systemd drop-ins in `/etc/systemd/system/<unit>.d/`.
- Use `journalctl` for logs and `systemctl status` for service health.
- Prefer `firewalld` unless using `nftables` explicitly.

## Security

- Keep SELinux enforcing unless the user requests permissive mode.
- Use `semanage`, `setsebool`, and `restorecon` for policy changes.
- Recommend targeted fixes instead of broad `audit2allow` rules.

## Deliverables

- Provide commands in copy-paste-ready blocks.
- Include verification steps after changes.
- Offer rollback steps for risky operations.
