# Ontology Instructions

This file defines the rules for maintaining and evolving the dynamic ontology used by the Context Graph.

---

## Core Principle

The ontology is **NOT fixed**. Types and relations emerge from documents as they are ingested.
However, the ontology must remain **compact, consistent, and reusable**.

---

## Entity Type Rules

### Normalization

When assigning an entity type, apply these transformations:
1. Convert to **lowercase**
2. Strip leading/trailing whitespace
3. Replace underscores and hyphens with spaces
4. Merge synonymous types using the mapping table below

### Synonym Mapping (Entity Types)

| Variant | Canonical Type |
|---------|---------------|
| component, module, class, function | component |
| bug, defect, fault, error, failure | issue |
| server, host, machine, node | infrastructure |
| user, person, operator, admin, actor | actor |
| app, application, service, program, software | software |
| database, datastore, db, storage | storage |
| api, endpoint, interface, connection | interface |
| event, incident, occurrence, trigger | event |
| concept, idea, principle, theory | concept |
| process, thread, task, job, workflow | process |

### Adding New Types

If an entity does not match any existing type:
- Create a **new type** if it is genuinely distinct
- Keep the label short (1–3 words, lowercase)
- Consider whether an existing type is close enough before creating a new one

### Constraint

- Maximum ~50 distinct entity types across the entire ontology
- If the limit is approached, merge similar types rather than creating new ones

---

## Relation Type Rules

### Normalization

When assigning a relation type:
1. Convert to **lowercase**
2. Strip whitespace
3. Use verb phrases in **present tense** (e.g., "causes", "contains", "uses")
4. Merge synonyms using the mapping table below

### Synonym Mapping (Relation Types)

| Variant | Canonical Relation |
|---------|-------------------|
| triggers, leads to, results in, produces | causes |
| is part of, belongs to, lives in, sits in | contains |
| depends on, requires, needs | depends on |
| uses, calls, invokes, consumes | uses |
| affects, impacts, influences | affects |
| creates, instantiates, spawns | creates |
| connects to, links to, references | connects to |
| inherits from, extends, subclasses | extends |
| reads from, queries, fetches | reads from |
| writes to, stores in, persists to | writes to |

### Adding New Relations

- Only add new relation types if no existing type accurately describes the relationship
- Prefer canonical relations over creating new ones

---

## Ontology Update Protocol

When processing extracted entities/relations from `ingestion.md`:

1. For each entity type:
   - Run through the synonym mapping
   - Call `ontology_store.normalize_type(type_name)` to get the canonical form
   - Call `ontology_store.add_type(canonical_type)` to register it

2. For each relation type:
   - Run through the synonym mapping
   - Call `ontology_store.normalize_relation(relation_name)` to get the canonical form
   - Call `ontology_store.add_relation(canonical_relation)` to register it

3. Use the **canonical** type/relation names when creating nodes and edges in the graph.
