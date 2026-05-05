# Lint Instructions

This file defines the wiki health-check workflow.

Run this periodically (or after a large batch of ingests) to keep the wiki
clean and accurate. The pattern is from Karpathy's LLM Wiki: detect contradictions,
orphans, broken links, stale claims, and data gaps.

---

## When to Run

- After ingesting 5+ documents
- When the user asks "check the wiki" or "health check"
- When answers seem inconsistent or contradictory
- Before a major synthesis or presentation

---

## Step 1: Run the Automated Health Check

```python
from scripts.tools import wiki_store

issues = wiki_store.lint_wiki()
# Returns:
# {
#   "orphan_pages": [list of slugs in files but not in index],
#   "missing_pages": [list of slugs in index but file deleted],
#   "broken_wikilinks": {slug: [broken link targets]},
#   "isolated_pages": [slugs with no wikilinks at all],
# }
```

---

## Step 2: Triage Each Issue Type

### Orphan Pages
Pages exist on disk but are not in the index. They are invisible to search.
**Fix**: Add them to the index or delete if stale.

```python
# To add to index, re-write the page (this auto-updates the index):
wiki_store.write_page(category="...", title="...", content=existing_content)

# To delete (manual step — confirm with user first):
# rm wiki/{category}/{slug}.md
```

### Missing Pages
In the index but the file was deleted. Dangling references.
**Fix**: Either recreate the page from knowledge or remove from index.

### Broken Wikilinks
`[[slug]]` references that point to pages that don't exist.
**Fix**: Create the missing page, or correct the link.

### Isolated Pages
Pages with no `[[wikilinks]]` — they are unreachable via link traversal.
**Fix**: Add links from/to related pages.

---

## Step 3: Check for Contradictions

Read the wiki index and scan for pages that might contradict each other:

```python
pages = wiki_store.list_pages()
# Returns [{slug, category, summary, date}, ...]
```

Look for:
- Same entity with conflicting `type` in different pages
- Same relation with different direction in different pages
- Newer ingests that update/supersede older claims

**When you find a contradiction:**
- Add a `## Contradictions` section to the relevant entity/topic pages:
  ```markdown
  ## Contradictions
  - doc_001 says X; doc_003 says not-X — unresolved
  ```
- Flag it in the log:
  ```python
  # Handled by wiki_store.write_page which auto-appends to log.md
  ```

---

## Step 4: Check for Stale Claims

Review pages ingested more than N days ago (use the `date` field from the index).
Ask: "Has any newer document superseded this claim?"

**When a claim is stale:**
- Update the page: add a `## Superseded` section or update the body.
- Mark the old claim with _(superseded by [[newer-doc-summary]])_.

---

## Step 5: Check for Missing Cross-References

For each entity page, check: does it link back to all summary pages that mention it?
For each summary page, check: does it link to all entity pages it extracted?

**Fix**: Read the page and add missing `[[slug]]` links.

---

## Step 6: Identify Data Gaps

Review entity pages that lack:
- A proper description (just a stub)
- Any `## Relations` section
- Any `## Mentioned in` links

These are candidates for deeper research or new ingests.

---

## Step 7: Log the Lint Pass

```python
# wiki_store.write_page automatically logs the activity.
# For a manual lint summary, append to log.md via write_page on a topic:
wiki_store.write_page(
    category="topic",
    title="Lint Pass YYYY-MM-DD",
    content="# Lint Pass\n\n## Issues Found\n\n...\n\n## Fixed\n\n...",
    summary="Lint pass results",
)
```

---

## Quick Lint Commands

```python
from scripts.tools import wiki_store

# Full health check
issues = wiki_store.lint_wiki()

# Get recent history
log = wiki_store.get_log(last_n=10)

# List all pages
all_pages = wiki_store.list_pages()

# Search for a concept across wiki
results = wiki_store.search_wiki("memory leak")
```

---

## Rules

- NEVER delete pages without user confirmation
- NEVER auto-resolve a contradiction — flag it for human review
- File all lint results as a topic page in the wiki (so the history is visible)
- Prefer adding cross-references over rewriting existing content
