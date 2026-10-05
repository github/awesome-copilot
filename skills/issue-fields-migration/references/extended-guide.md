# Issue Fields Migration: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Workflow

### Step 0: Migration Source

Ask the user what they are migrating:

1. **"Are you migrating labels or project fields?"**
   - **Labels**: proceed to the [Label Migration Flow](#label-migration-flow) below.
   - **Project fields**: proceed to the [Project Field Migration Flow](#project-field-migration-flow) below.

2. If the user says **labels**:
   - Ask: "Which org and repo(s) contain the labels?"
   - Ask: "Which labels do you want to migrate?" (they can name them or say "show me the labels first")

3. If the user says **project fields**:
   - Ask: "Can you share the link to your project or tell me the org name and project number?"
   - Ask: "Which field do you want to migrate?"

---

## Examples

### Example 1: Full Migration

**User**: "I need to migrate Priority values from our project to the new org Priority issue field"

**Action**: Follow Phases P1-P6. Discover fields, map options, check permissions, scan items, preview, execute.

### Example 2: Dry-Run Only

**User**: "Show me what would happen if I migrated fields from project #42, but don't actually do it"

**Action**: Follow Phases P1-P5 only. Present the full dry-run report with every item listed. Do not execute.

### Example 3: Multiple Fields

**User**: "Migrate Priority and Due Date from project #15 to issue fields"

**Action**: Same workflow, but process both fields in a single pass. During the data scan, collect values for all mapped fields per item. Write all field values in a single API call per issue.

### Example 4: Single Label to Issue Field

**User**: "I want to migrate the 'bug' label to the Type issue field"

**Action**: Route to Label Migration Flow. Ask for org/repo, list labels, confirm mapping: label "bug" → Type field "Bug" option. Scan issues with that label, preview, execute. Ask whether to remove the label after migration.

### Example 5: Multiple Labels to One Field (Bulk)

**User**: "We have p0, p1, p2, p3 labels and want to convert them to the Priority issue field"

**Action**: Route to Label Migration Flow. Map all four labels to Priority field options (p0→P0, p1→P1, p2→P2, p3→P3). Check for conflicts (issues with multiple priority labels). Preview all changes in one summary. Execute in one pass. Optionally remove all four labels from migrated issues.

### Example 6: Cross-Repo Label Migration with Label Removal

**User**: "Migrate the 'frontend' and 'backend' labels to the Team issue field across github/issues, github/memex, and github/mobile, then remove the old labels"

**Action**: Route to Label Migration Flow. Confirm repos and label mappings: "frontend"→Team "Frontend", "backend"→Team "Backend". Scan all three repos for issues with these labels. Detect conflicts (issues with both labels). Preview across repos. Execute field writes, then remove labels from migrated issues. Report per-repo stats.
