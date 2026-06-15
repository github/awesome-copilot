# Tools, Systems, and Configuration

## Primary Tools

- **IDE:** <!-- e.g., VS Code -->
- **AI:** <!-- e.g., GitHub Copilot -->
- **Project management:** <!-- e.g., Azure DevOps, Jira -->
- **Communication:** <!-- e.g., Teams, Slack -->
- **Notes:** <!-- e.g., Obsidian, OneNote -->
- **Source control:** <!-- e.g., Git -->

## <!-- Notes/Vault System -->

| Setting | Value |
|---------|-------|
| Vault/notes path | <!-- full path --> |
| Action items | <!-- path to action items file --> |

### Meeting Notes

| Setting | Value |
|---------|-------|
| Meetings folder | <!-- full path --> |
| Format | <!-- e.g., Obsidian-compatible markdown --> |
| File organization | <!-- e.g., {folder}/YYYY-MM/YYYY-MM-DD-Title.md --> |

### Meeting Tags

Tags are applied to meeting notes based on title pattern matching. Meeting type tags identify the format. Team tags identify which project/team a meeting belongs to.

| Tag | Type | Patterns |
|-----|------|----------|
| <!-- tag name --> | Meeting type | <!-- comma-separated patterns --> |
| <!-- tag name --> | Team | <!-- comma-separated patterns --> |

---

## <!-- Team/Workstream Name 1 -->

### Azure DevOps

<!-- If this workstream does not use ADO, delete this section or leave it empty. -->

| Setting | Value |
|---------|-------|
| Organization | <!-- org name --> |
| Project | <!-- project name --> |
| Team | <!-- team name --> |
| Area Path | <!-- area path --> |

### Scorecard Exclusions

| Setting | Value |
|---------|-------|
| Exclude title patterns | <!-- patterns to exclude from reports --> |

### Reporting

| Setting | Value |
|---------|-------|
| Sprint update output | <!-- path --> |
| Weekly update output | <!-- path --> |
| Weekly update prefix | <!-- e.g., weekly-update --> |
| Roadmap file | <!-- path, or leave empty to skip --> |
| Context file patterns | `*.md` |

### Strategic Pillars

<!-- These are used as grouping headers in weekly updates and sprint reports.
     Define them even if the workstream does not use ADO. The ADO Epics column
     is optional; leave it empty for non-ADO workstreams. -->

| Pillar | ADO Epics | Definition |
|--------|-----------|------------|
| <!-- pillar name --> | <!-- epic names, or empty --> | <!-- brief definition --> |

---

## <!-- Team/Workstream Name 2 -->

### Azure DevOps

<!-- If this workstream does not use ADO, delete this section or leave it empty. -->

| Setting | Value |
|---------|-------|
| Organization | <!-- org name --> |
| Project | <!-- TODO --> |
| Team | <!-- TODO --> |
| Area Path | <!-- TODO --> |

### Reporting

| Setting | Value |
|---------|-------|
| Weekly update output | <!-- path --> |
| Weekly update prefix | <!-- e.g., weekly-update --> |

### Strategic Pillars

| Pillar | ADO Epics | Definition |
|--------|-----------|------------|
| <!-- pillar name --> | | <!-- brief definition --> |

---

<!-- Add workstream sections as needed. Common settings go at the top, workstream-specific config goes under each heading.
     Every workstream needs at least: Reporting and Strategic Pillars.
     Azure DevOps is optional. -->
