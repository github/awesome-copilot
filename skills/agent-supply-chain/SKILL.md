---
name: agent-supply-chain
description: |
  Verify supply chain integrity for AI agent plugins, tools, and dependencies. Use this skill when:
  - Generating SHA-256 integrity manifests for agent plugins or tool packages
  - Verifying that installed plugins match their published manifests
  - Detecting tampered, modified, or untracked files in agent tool directories
  - Auditing dependency pinning and version policies for agent components
  - Building provenance chains for agent plugin promotion (dev → staging → production)
  - Any request like "verify plugin integrity", "generate manifest", "check supply chain", or "sign this plugin"
---

# Agent Supply Chain Integrity

Generate and verify integrity manifests for AI agent plugins and tools. Detect tampering, enforce version pinning, and establish supply chain provenance.

## Overview

Agent plugins and MCP servers have the same supply chain risks as npm packages or container images — except the ecosystem has no equivalent of npm provenance, Sigstore, or SLSA. This skill fills that gap.

```
Plugin Directory → Hash All Files (SHA-256) → Generate INTEGRITY.json
                                                    ↓
Later: Plugin Directory → Re-Hash Files → Compare Against INTEGRITY.json
                                                    ↓
                                          Match? VERIFIED : TAMPERED
```

## When to Use

- Before promoting a plugin from development to production
- During code review of plugin PRs
- As a CI step to verify no files were modified after review
- When auditing third-party agent tools or MCP servers
- Building a plugin marketplace with integrity requirements

---

## Pattern 1: Generate Integrity Manifest

Create a deterministic `INTEGRITY.json` with SHA-256 hashes of all plugin files.

```python
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

EXCLUDE_DIRS = {".git", "__pycache__", "node_modules", ".venv", ".pytest_cache"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "INTEGRITY.json"}

def hash_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def generate_manifest(plugin_dir: str) -> dict:
    """Generate an integrity manifest for a plugin directory."""
    root = Path(plugin_dir)
    files = {}

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.name in EXCLUDE_FILES:
            continue
        if any(part in EXCLUDE_DIRS for part in path.relative_to(root).parts):
            continue
        rel = path.relative_to(root).as_posix()
        files[rel] = hash_file(path)

    # Chain hash: SHA-256 of all file hashes concatenated in sorted order
    chain = hashlib.sha256()
    for key in sorted(files.keys()):
        chain.update(files[key].encode("ascii"))

    manifest = {
        "plugin_name": root.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "sha256",
        "file_count": len(files),
        "files": files,
        "manifest_hash": chain.hexdigest(),
    }
    return manifest

# Generate and save
manifest = generate_manifest("my-plugin/")
Path("my-plugin/INTEGRITY.json").write_text(
    json.dumps(manifest, indent=2) + "\n"
)
print(f"Generated manifest: {manifest['file_count']} files, "
      f"hash: {manifest['manifest_hash'][:16]}...")
```

**Output (`INTEGRITY.json`):**
```json
{
  "plugin_name": "my-plugin",
  "generated_at": "2026-04-01T03:00:00+00:00",
  "algorithm": "sha256",
  "file_count": 12,
  "files": {
    ".claude-plugin/plugin.json": "a1b2c3d4...",
    "README.md": "e5f6a7b8...",
    "skills/search/SKILL.md": "c9d0e1f2...",
    "agency.json": "3a4b5c6d..."
  },
  "manifest_hash": "7e8f9a0b1c2d3e4f..."
}
```

---

## Pattern 2: Verify Integrity

Check that current files match the manifest.

```python
# Requires: hash_file() and generate_manifest() from Pattern 1 above
import json
from pathlib import Path

def verify_manifest(plugin_dir: str) -> tuple[bool, list[str]]:
    """Verify plugin files against INTEGRITY.json."""
    root = Path(plugin_dir)
    manifest_path = root / "INTEGRITY.json"

    if not manifest_path.exists():
        return False, ["INTEGRITY.json not found"]

    manifest = json.loads(manifest_path.read_text())
    recorded = manifest.get("files", {})
    errors = []

    # Check recorded files
    for rel_path, expected_hash in recorded.items():
        full = root / rel_path
        if not full.exists():
            errors.append(f"MISSING: {rel_path}")
            continue
        actual = hash_file(full)
        if actual != expected_hash:
            errors.append(f"MODIFIED: {rel_path}")

    # Check for new untracked files
    current = generate_manifest(plugin_dir)
    for rel_path in current["files"]:
        if rel_path not in recorded:
            errors.append(f"UNTRACKED: {rel_path}")

    return len(errors) == 0, errors

# Verify
passed, errors = verify_manifest("my-plugin/")
if passed:
    print("VERIFIED: All files match manifest")
else:
    print(f"FAILED: {len(errors)} issue(s)")
    for e in errors:
        print(f"  {e}")
```

**Output on tampered plugin:**
```
FAILED: 3 issue(s)
  MODIFIED: skills/search/SKILL.md
  MISSING: agency.json
  UNTRACKED: backdoor.py
```

---

## Pattern 3: Dependency Version Audit

Check that agent dependencies use pinned versions.

```python
import re

def audit_versions(config_path: str) -> list[dict]:
    """Audit dependency version pinning in a config file."""
    findings = []
    path = Path(config_path)
    content = path.read_text()

    if path.name == "package.json":
        data = json.loads(content)
        for section in ("dependencies", "devDependencies"):
            for pkg, ver in data.get(section, {}).items():
                if ver.startswith("^") or ver.startswith("~") or ver == "*" or ver == "latest":
                    findings.append({
                        "package": pkg,
                        "version": ver,
                        "severity": "HIGH" if ver in ("*", "latest") else "MEDIUM",
                        "fix": f'Pin to exact: "{pkg}": "{ver.lstrip("^~")}"'
                    })

    elif path.name in ("requirements.txt", "pyproject.toml"):
        for line in content.splitlines():
            line = line.strip()
            if ">=" in line and "<" not in line:
                findings.append({
                    "package": line.split(">=")[0].strip(),
                    "version": line,
                    "severity": "MEDIUM",
                    "fix": f"Add upper bound: {line},<next_major"
                })

    return findings
```

---

## Pattern 4: Promotion Gate

Use integrity verification as a gate before promoting plugins.

```python
def promotion_check(plugin_dir: str) -> dict:
    """Check if a plugin is ready for production promotion."""
    checks = {}

    # 1. Integrity manifest exists and verifies
    passed, errors = verify_manifest(plugin_dir)
    checks["integrity"] = {
        "passed": passed,
        "errors": errors
    }

    # 2. Required files exist
    root = Path(plugin_dir)
    required = ["README.md"]
    missing = [f for f in required if not (root / f).exists()]

    # Require at least one plugin manifest (supports both layouts)
    manifest_paths = [
        root / ".github/plugin/plugin.json",
        root / ".claude-plugin/plugin.json",
    ]
    if not any(p.exists() for p in manifest_paths):
        missing.append(".github/plugin/plugin.json (or .claude-plugin/plugin.json)")

    checks["required_files"] = {
        "passed": len(missing) == 0,
        "missing": missing
    }

    # 3. No unpinned dependencies
    mcp_path = root / ".mcp.json"
    if mcp_path.exists():
        config = json.loads(mcp_path.read_text())
        unpinned = []
        for server in config.get("mcpServers", {}).values():
            if isinstance(server, dict):
                for arg in server.get("args", []):
                    if isinstance(arg, str) and "@latest" in arg:
                        unpinned.append(arg)
        checks["pinned_deps"] = {
            "passed": len(unpinned) == 0,
            "unpinned": unpinned
        }

    # Overall
    all_passed = all(c["passed"] for c in checks.values())
    return {"ready": all_passed, "checks": checks}

result = promotion_check("my-plugin/")
if result["ready"]:
    print("Plugin is ready for production promotion")
else:
    print("Plugin NOT ready:")
    for name, check in result["checks"].items():
        if not check["passed"]:
            print(f"  FAILED: {name}")
```

---

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Verify plugin integrity
  run: |
    PLUGIN_DIR="${{ matrix.plugin || '.' }}"
    cd "$PLUGIN_DIR"
    python -c "
    from pathlib import Path
    import json, hashlib, sys

    def hash_file(p):
        h = hashlib.sha256()
        with open(p, 'rb') as f:
            for c in iter(lambda: f.read(8192), b''):
                h.update(c)
        return h.hexdigest()

    manifest = json.loads(Path('INTEGRITY.json').read_text())
    errors = []
    for rel, expected in manifest['files'].items():
        p = Path(rel)
        if not p.exists():
            errors.append(f'MISSING: {rel}')
        elif hash_file(p) != expected:
            errors.append(f'MODIFIED: {rel}')
    if errors:
        for e in errors:
            print(f'::error::{e}')
        sys.exit(1)
    print(f'Verified {len(manifest[\"files\"])} files')
    "
```

---

## Best Practices

| Practice | Rationale |
|----------|-----------|
| **Generate manifest after code review** | Ensures reviewed code matches production code |
| **Include manifest in the PR** | Reviewers can verify what was hashed |
| **Verify in CI before deploy** | Catches post-review modifications |
| **Chain hash for tamper evidence** | Single hash represents entire plugin state |
| **Exclude build artifacts** | Only hash source files — .git, __pycache__, node_modules excluded |
| **Pin all dependency versions** | Unpinned deps = different code on every install |

---

## Related Resources

- [OpenSSF SLSA](https://slsa.dev/) — Supply-chain Levels for Software Artifacts
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements) — Sigstore-based package provenance
- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — Includes integrity verification and plugin signing
- [OWASP ASI-09: Supply Chain Integrity](https://owasp.org/www-project-agentic-ai-threats/)
