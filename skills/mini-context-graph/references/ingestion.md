# Ingestion Instructions

This file defines how the agent extracts entities and relations from a raw document.

---

## Step 1: Read the Document

Read the provided text carefully. Identify:
- **Entities**: noun phrases that refer to real-world objects, systems, components, actors, concepts, or events.
- **Relations**: verb phrases that describe how one entity affects, contains, causes, uses, or is related to another.

---

## Step 2: Extract Entities

For each entity:
- Record its **name** (normalized: lowercase, strip leading/trailing whitespace)
- Assign a **type**: a short label (1–3 words) that categorizes the entity

### Entity Type Examples

| Entity Name | Suggested Type |
|-------------|---------------|
| Python interpreter | software |
| memory leak | issue |
| operating system | system |
| database | infrastructure |
| user | actor |
| API endpoint | interface |
| server | infrastructure |

**Rules:**
- Types must be general enough to reuse across documents
- Do NOT create unique types per entity (e.g., avoid `python-interpreter-type`)
- Use `ontology.md` normalization rules to canonicalize types

---

## Step 3: Extract Relations

For each pair of entities with an explicit connection in the text:
- Record the **source** entity name
- Record the **target** entity name
- Record the **relation type**: a verb or verb phrase (normalized: lowercase)
- Assign a **confidence** score between 0 and 1:
  - 1.0 = stated explicitly ("A causes B")
  - 0.8 = strongly implied ("A is linked to B")
  - 0.6 = weakly implied ("A may affect B")
  - < 0.6 = do NOT include

---

## Step 4: Output Format

Produce a JSON object in this exact format:

```json
{
  "entities": [
    { "name": "entity name", "type": "entity type", "supporting_text": "exact quote mentioning this entity" }
  ],
  "relations": [
    {
      "source": "source entity name",
      "target": "target entity name",
      "type": "relation type",
      "confidence": 0.9,
      "supporting_text": "exact quote that justifies this relation"
    }
  ]
}
```

The `supporting_text` field is **required for provenance**. It must be a verbatim or near-verbatim quote from the document that mentions or supports the entity/relation. This is what links graph nodes and edges back to their source.

---

## Rules

- All names and types must be **lowercase**
- Only include relations where **both entities** are present in the entities list
- Do NOT invent entities or relations not supported by the text
- Prefer **reusing existing entity and relation types** from the ontology over creating new ones
- One entity can appear in multiple relations (as source or target)
- Always include `supporting_text` — this enables evidence retrieval and audit trails

---

## Step 5: Write Wiki Pages (Required)

After calling `skill.ingest_with_content(...)`, you MUST write wiki pages:

### 5a. Write a summary page for the document

```python
from scripts.tools import wiki_store

wiki_store.write_page(
    category="summary",
    title=f"{title} Summary",
    content=f"""---
title: {title}
source_document: {doc_id}
tags: [summary]
---

# {title}

**Source:** {source}

## Key Claims

{chr(10).join(f'- [[{r["source"].replace(" ", "-")}]] {r["type"]} [[{r["target"].replace(" ", "-")}]] (confidence: {r["confidence"]})' for r in relations)}

## Entities

{chr(10).join(f'- [[{e["name"].replace(" ", "-")}]] ({e["type"]})' for e in entities)}

## Open Questions

- (Add questions from reading the document here)
""",
    summary=f"Summary of {title}",
)
```

### 5b. Write or update entity pages

For each **new** entity not already in the wiki, write an entity page:

```python
wiki_store.write_page(
    category="entity",
    title=entity_name,
    content=f"""---
title: {entity_name}
type: {entity_type}
source_document: {doc_id}
tags: [{entity_type}]
---

# {entity_name}

(Description from the document or prior knowledge.)

## Relations

(List any wikilinks to related entities extracted from relations.)

## Mentioned in

- [[{doc_id}-summary]]
""",
    summary=f"{entity_name}: {entity_type}",
)
```

For **existing** entity pages, read the current page and append new information, updated relations, or flag contradictions.

---

## Example

**Input document:**
```
System crashes due to memory leaks.
Memory leaks occur when objects are not released.
```

**Expected extraction output:**
```json
{
  "entities": [
    { "name": "system crash", "type": "issue",     "supporting_text": "system crashes due to memory leaks" },
    { "name": "memory leak",  "type": "issue",     "supporting_text": "memory leaks occur when objects are not released" },
    { "name": "object",       "type": "component", "supporting_text": "objects are not released" }
  ],
  "relations": [
    {
      "source": "memory leak",
      "target": "system crash",
      "type": "causes",
      "confidence": 1.0,
      "supporting_text": "System crashes due to memory leaks."
    },
    {
      "source": "object",
      "target": "memory leak",
      "type": "contributes to",
      "confidence": 0.9,
      "supporting_text": "Memory leaks occur when objects are not released."
    }
  ]
}
```
