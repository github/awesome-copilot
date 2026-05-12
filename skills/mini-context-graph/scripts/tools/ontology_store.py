"""
ontology_store.py — Tracks entity types and relation types.

Handles:
- Registering types and relations with usage counts
- Normalizing types and relations via synonym mapping
- Persisting to ontology.json

NOTE: No LLM logic here. Normalization is rule-based (lowercase + synonym map).
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config

_DATA_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_DATA_DIR", str(config.DATA_DIR)))
_ONTOLOGY_FILE = _DATA_DIR / "ontology.json"

# Synonym maps — lowercase variants map to canonical forms
_ENTITY_TYPE_MAP: dict[str, str] = {
    "component": "component",
    "module": "component",
    "class": "component",
    "function": "component",
    "method": "component",
    "bug": "issue",
    "defect": "issue",
    "fault": "issue",
    "error": "issue",
    "failure": "issue",
    "problem": "issue",
    "crash": "issue",
    "server": "infrastructure",
    "host": "infrastructure",
    "machine": "infrastructure",
    "node": "infrastructure",
    "user": "actor",
    "person": "actor",
    "operator": "actor",
    "admin": "actor",
    "administrator": "actor",
    "actor": "actor",
    "app": "software",
    "application": "software",
    "service": "software",
    "program": "software",
    "software": "software",
    "database": "storage",
    "datastore": "storage",
    "db": "storage",
    "storage": "storage",
    "api": "interface",
    "endpoint": "interface",
    "interface": "interface",
    "connection": "interface",
    "event": "event",
    "incident": "event",
    "occurrence": "event",
    "trigger": "event",
    "concept": "concept",
    "idea": "concept",
    "principle": "concept",
    "theory": "concept",
    "process": "process",
    "thread": "process",
    "task": "process",
    "job": "process",
    "workflow": "process",
    "object": "component",
    "resource": "component",
    "memory": "resource",
    "cpu": "resource",
    "system": "system",
    "platform": "system",
    "framework": "system",
    "library": "software",
    "package": "software",
}

_RELATION_TYPE_MAP: dict[str, str] = {
    "causes": "causes",
    "triggers": "causes",
    "leads to": "causes",
    "results in": "causes",
    "produces": "causes",
    "is part of": "contains",
    "belongs to": "contains",
    "lives in": "contains",
    "sits in": "contains",
    "contains": "contains",
    "depends on": "depends on",
    "requires": "depends on",
    "needs": "depends on",
    "uses": "uses",
    "calls": "uses",
    "invokes": "uses",
    "consumes": "uses",
    "affects": "affects",
    "impacts": "affects",
    "influences": "affects",
    "creates": "creates",
    "instantiates": "creates",
    "spawns": "creates",
    "connects to": "connects to",
    "links to": "connects to",
    "references": "connects to",
    "inherits from": "extends",
    "extends": "extends",
    "subclasses": "extends",
    "reads from": "reads from",
    "queries": "reads from",
    "fetches": "reads from",
    "writes to": "writes to",
    "stores in": "writes to",
    "persists to": "writes to",
    "contributes to": "contributes to",
    "allocated by": "allocated by",
    "released by": "released by",
    "not released": "not released",
}


def _load() -> dict:
    if _ONTOLOGY_FILE.exists():
        with open(_ONTOLOGY_FILE, "r") as f:
            return json.load(f)
    return {"entity_types": {}, "relation_types": {}}


def _save(ontology: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_ONTOLOGY_FILE, "w") as f:
        json.dump(ontology, f, indent=2)


def normalize_type(type_name: str) -> str:
    """Return the canonical form of an entity type."""
    key = type_name.strip().lower().replace("-", " ").replace("_", " ")
    return _ENTITY_TYPE_MAP.get(key, key)


def normalize_relation(relation_name: str) -> str:
    """Return the canonical form of a relation type."""
    key = relation_name.strip().lower().replace("-", " ").replace("_", " ")
    return _RELATION_TYPE_MAP.get(key, key)


def add_type(type_name: str) -> None:
    """Register an entity type, incrementing its usage count."""
    ontology = _load()
    canonical = normalize_type(type_name)
    ontology["entity_types"][canonical] = ontology["entity_types"].get(canonical, 0) + 1
    _save(ontology)


def add_relation(relation_name: str) -> None:
    """Register a relation type, incrementing its usage count."""
    ontology = _load()
    canonical = normalize_relation(relation_name)
    ontology["relation_types"][canonical] = ontology["relation_types"].get(canonical, 0) + 1
    _save(ontology)


def get_all_types() -> dict[str, int]:
    """Return all registered entity types with counts."""
    return _load()["entity_types"]


def get_all_relations() -> dict[str, int]:
    """Return all registered relation types with counts."""
    return _load()["relation_types"]
