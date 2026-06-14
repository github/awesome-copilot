#!/usr/bin/env python3
"""Phase 2 technology detection — PURE functions, unit-tested against fixtures.

Detection rule (BUILD-PLAN Section 7): a manifest dependency is HIGH confidence; we never
emit a technology without evidence. README-mention (low-confidence) detection is deliberately
out of scope for v0.2.0 to keep precision high.

Scope: root-level manifests only (reuses Phase 1 `top_level` — no extra discovery calls).
Only manifests whose *contents* we parse for dependencies are fetched; the rest are detected
by presence alone.
"""
from __future__ import annotations

import json
import re
import tomllib
from typing import Any

# --- Manifests (BUILD-PLAN Section 7) -------------------------------------------------
EXACT_MANIFESTS = {
    "package.json", "pnpm-lock.yaml", "yarn.lock", "package-lock.json",
    "pyproject.toml", "requirements.txt", "Pipfile", "poetry.lock",
    "go.mod", "Cargo.toml", "pom.xml", "build.gradle", "composer.json",
    "Gemfile", "Dockerfile", "docker-compose.yml", "compose.yaml",
    "vercel.json", "tsconfig.json",
}
# Versioned config files matched by prefix (e.g. next.config.js / .mjs / .ts).
GLOB_PREFIXES = ("next.config.", "vite.config.")

# Manifests whose CONTENTS we fetch + parse for dependency names.
PARSE_TARGETS = {
    "package.json", "pyproject.toml", "requirements.txt", "Pipfile",
    "go.mod", "Cargo.toml", "composer.json", "Gemfile",
}

# Ecosystem implied by a manifest's mere presence (HIGH — direct evidence).
ECOSYSTEM_BY_MANIFEST = {
    "package.json": "Node.js",
    "pyproject.toml": "Python",
    "requirements.txt": "Python",
    "Pipfile": "Python",
    "poetry.lock": "Python",
    "go.mod": "Go",
    "Cargo.toml": "Rust",
    "composer.json": "PHP",
    "Gemfile": "Ruby",
    "pom.xml": "Java",
    "build.gradle": "Java",
    "Dockerfile": "Docker",
    "docker-compose.yml": "Docker",
    "compose.yaml": "Docker",
    "vercel.json": "Vercel",
    "tsconfig.json": "TypeScript",
}

# Dependency name -> canonical technology name.
JS_DEP_MAP = {
    "next": "Next.js", "react": "React", "react-dom": "React", "vue": "Vue.js",
    "@angular/core": "Angular", "svelte": "Svelte", "@sveltejs/kit": "SvelteKit",
    "express": "Express", "@nestjs/core": "NestJS", "vite": "Vite",
    "tailwindcss": "Tailwind CSS", "typescript": "TypeScript",
    "react-native": "React Native", "electron": "Electron", "astro": "Astro",
}
PY_DEP_MAP = {
    "fastapi": "FastAPI", "flask": "Flask", "django": "Django", "starlette": "Starlette",
    "pandas": "pandas", "numpy": "NumPy", "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn", "torch": "PyTorch", "tensorflow": "TensorFlow",
    "streamlit": "Streamlit", "jupyter": "Jupyter", "notebook": "Jupyter",
    "pydantic": "Pydantic", "sqlalchemy": "SQLAlchemy",
}

# Classification signal sets.
WEB_TECHS = {"Next.js", "React", "Vue.js", "Angular", "Svelte", "SvelteKit", "Vite", "Astro"}
API_TECHS = {"FastAPI", "Flask", "Django", "Express", "NestJS", "Starlette"}
DATA_TECHS = {"pandas", "NumPy", "scikit-learn", "PyTorch", "TensorFlow", "Jupyter", "Streamlit"}
MOBILE_TECHS = {"React Native", "Flutter"}

_CONFIDENCE_ORDER = {"low": 0, "medium": 1, "high": 2}


# --- Manifest discovery (pure) --------------------------------------------------------
def detect_manifests(top_level: list[dict[str, Any]]) -> list[str]:
    """Root-level manifest filenames present, sorted for determinism."""
    files = {e["name"] for e in top_level if e.get("type") == "file"}
    found = {f for f in files if f in EXACT_MANIFESTS}
    found |= {f for f in files if f.startswith(GLOB_PREFIXES)}
    return sorted(found)


def manifests_to_fetch(manifests: list[str]) -> list[str]:
    """Subset of manifests whose contents must be fetched + parsed for dependencies."""
    return [m for m in manifests if m in PARSE_TARGETS]


# --- Dependency parsers (pure, defensive — return empty on malformed input) -----------
def _norm_py(name: str) -> str:
    return re.split(r"[\[<>=!~;\s]", name.strip(), maxsplit=1)[0].strip().lower()


def parse_package_json(text: str) -> tuple[set[str], dict[str, bool]]:
    """Return (lowercased dep names, flags{cli, library})."""
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return set(), {}
    deps: set[str] = set()
    for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        section = data.get(key)
        if isinstance(section, dict):
            deps |= {d.lower() for d in section}
    flags = {
        "cli": bool(data.get("bin")),
        "library": bool(data.get("main") or data.get("exports") or data.get("module"))
        and not data.get("bin"),
    }
    return deps, flags


def parse_pyproject(text: str) -> tuple[set[str], dict[str, bool]]:
    try:
        data = tomllib.loads(text)
    except (tomllib.TOMLDecodeError, TypeError):
        return set(), {}
    deps: set[str] = set()
    project = data.get("project", {})
    for dep in project.get("dependencies", []) or []:
        deps.add(_norm_py(dep))
    for group in (project.get("optional-dependencies", {}) or {}).values():
        for dep in group or []:
            deps.add(_norm_py(dep))
    poetry = data.get("tool", {}).get("poetry", {})
    for dep in (poetry.get("dependencies", {}) or {}):
        if dep.lower() != "python":
            deps.add(dep.lower())
    flags = {
        "cli": bool(project.get("scripts") or poetry.get("scripts")),
        "library": "build-system" in data and not project.get("scripts"),
    }
    return deps, flags


def parse_requirements(text: str) -> set[str]:
    deps: set[str] = set()
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-") or "://" in line:
            continue
        name = _norm_py(line)
        if name:
            deps.add(name)
    return deps


# --- Core analysis (pure) -------------------------------------------------------------
def _add(techs: dict[str, dict[str, str]], name: str, evidence: str, confidence: str) -> None:
    existing = techs.get(name)
    if existing is None or _CONFIDENCE_ORDER[confidence] > _CONFIDENCE_ORDER[existing["confidence"]]:
        techs[name] = {"name": name, "evidence": evidence, "confidence": confidence}


def detect_technologies(
    manifests: list[str], contents: dict[str, str], language: str | None
) -> tuple[list[dict[str, str]], dict[str, bool]]:
    """Return (sorted technologies, classification flags). Every tech carries evidence."""
    techs: dict[str, dict[str, str]] = {}
    flags = {"cli": False, "library": False}

    # Primary language is medium-confidence evidence (GitHub-detected).
    if language:
        _add(techs, language, "primary language reported by GitHub", "medium")

    for m in manifests:
        eco = ECOSYSTEM_BY_MANIFEST.get(m)
        if eco:
            _add(techs, eco, f"{m} present", "high")
        if m.startswith("next.config."):
            _add(techs, "Next.js", f"{m} present", "high")
        if m.startswith("vite.config."):
            _add(techs, "Vite", f"{m} present", "high")

    # Dependency-level frameworks (HIGH).
    if "package.json" in contents:
        deps, f = parse_package_json(contents["package.json"])
        flags.update({k: flags[k] or v for k, v in f.items() if k in flags})
        for dep in sorted(deps):  # sorted -> deterministic evidence when deps share a tech
            if dep in JS_DEP_MAP:
                _add(techs, JS_DEP_MAP[dep], f"package.json dependency '{dep}'", "high")
    py_deps: set[str] = set()
    if "pyproject.toml" in contents:
        deps, f = parse_pyproject(contents["pyproject.toml"])
        flags.update({k: flags[k] or v for k, v in f.items() if k in flags})
        py_deps |= deps
    if "requirements.txt" in contents:
        py_deps |= parse_requirements(contents["requirements.txt"])
    if "Pipfile" in contents:
        py_deps |= parse_requirements(contents["Pipfile"])
    for dep in sorted(py_deps):  # sorted -> deterministic evidence when deps share a tech
        if dep in PY_DEP_MAP:
            _add(techs, PY_DEP_MAP[dep], f"Python dependency '{dep}'", "high")

    ordered = sorted(techs.values(), key=lambda t: t["name"])
    return ordered, flags


def classify_project_type(
    technologies: list[dict[str, str]],
    manifests: list[str],
    language: str | None,
    flags: dict[str, bool],
) -> str:
    """Classify into the Section 4 enum from detected signals (honest 'unknown' default)."""
    names = {t["name"] for t in technologies}

    if (names & MOBILE_TECHS) or language == "Swift" or (
        "build.gradle" in manifests and language in {"Kotlin", "Java"}
    ):
        return "mobile-application"
    if names & WEB_TECHS:
        return "web-application"
    if names & API_TECHS:
        return "api-service"
    if language == "Jupyter Notebook" or (names & DATA_TECHS):
        return "data-project"
    if flags.get("cli"):
        return "cli-tool"
    if flags.get("library"):
        return "library"

    # Documentation needs a POSITIVE signal (a docs-oriented primary language), not just the
    # absence of manifests — an empty repo is honestly 'unknown', not 'documentation'.
    code_manifests = [m for m in manifests if m in ECOSYSTEM_BY_MANIFEST and m != "tsconfig.json"]
    if not code_manifests and language in {"Markdown", "Text", "reStructuredText"}:
        return "documentation"
    return "unknown"


def apply_detection(record: dict[str, Any], manifest_contents: dict[str, str]) -> dict[str, Any]:
    """Return a copy of record enriched with manifests, technologies, project_type."""
    enriched = dict(record)
    manifests = detect_manifests(record.get("top_level", []))
    technologies, flags = detect_technologies(
        manifests, manifest_contents, record.get("language")
    )
    enriched["manifests"] = manifests
    enriched["technologies"] = technologies
    enriched["project_type"] = classify_project_type(
        technologies, manifests, record.get("language"), flags
    )
    return enriched
