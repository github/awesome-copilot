# Tag Detection

## Purpose

Resolve the 42Crunch platform tag associated with the OAS file, then announce
the result. Use the resolved tag in audit and scan command flags.

**Freemium mode**: skip this entire document — tag detection requires platform
access. Freemium mode handling is described in `audit-workflow.md` and
`scan-workflow.md`.

---

## Step 1 — Check the tags file (local fast path)

Resolve the tags file path for the current OS:

| OS            | Path                                   |
|---------------|----------------------------------------|
| macOS / Linux | `~/.42crunch/conf/tags`                |
| Windows       | `%APPDATA%\42Crunch\conf\tags`         |

If the file exists, parse it as YAML and look for an entry whose key matches
the **absolute path** of the current OAS file.

- **Entry found** → jump directly to **Announce: tag found**. No user-facing
  announcement before this; it is instant.
- **File missing or no entry for this OAS file** → proceed to Step 2.

---

## Step 2 — Ask the user how to proceed

Call `AskUserQuestion`:

- **question**: `"This API doesn't have a platform tag assigned yet. Tags apply your organisation's Security Quality Gates, customisations, and data dictionaries. How would you like to proceed?"`
- **options**:
  - `"Assign a tag"` — fetch tags from the platform and let the user pick one
  - `"Proceed without a tag"` — continue without tag flags

**If "Proceed without a tag"**: return to the calling workflow and continue
without `--tag`. `--report-sqg` is still passed — the platform will apply
the organisation's default SQG. No further steps in this document.

**If "Assign a tag"**: proceed to Step 3.

---

## Step 3 — Fetch tags from the platform API

Announce:
> "Fetching available tags from the 42Crunch platform..."

Make an HTTP GET request:

```
GET <PLATFORM_HOST>/api/v2/tags
Headers:
  X-API-KEY: <API_KEY>
  X-42C-IDE: true
```

Parse `response.list[]`. The fields of interest per tag object are:
`categoryName`, `categoryDescription`, `tagName`, `tagDescription`.

**On HTTP error or network failure:**
> "Couldn't reach the 42Crunch platform to fetch tags (HTTP `<status>` /
> `<error>`). Check that your `API_KEY` and `PLATFORM_HOST` are correct,
> then try again."

Stop. Do not run audit or scan.

**On success but `response.list` is empty:**
> "No tags have been created on your 42Crunch platform yet. Ask your platform
> administrator to create a tag, then run this skill again."

Stop. Do not run audit or scan.

**On success with tags returned** → proceed to Step 4.

---

## Step 4 — Present tags and ask the user to pick one

Group the tags by `categoryName`. For each category:
- Show `categoryName` as the group heading
- Show `categoryDescription` as a subtitle when non-empty

For each tag within the group:
- Show `tagName` as the option label
- Show `tagDescription` as a description when non-empty

Call `AskUserQuestion`:
- **question**: `"Which tag should be applied to <filename>?"`
- **options**: one option per tag, labelled `<categoryName> — <tagName>`,
  with `tagDescription` as the option description (omit if empty)

After the user selects a tag:

1. The `~/.42crunch/conf/` directory already exists (created during setup) —
   no need to create it.
2. Write or update the tags file. Add or update the entry for this OAS file:
   ```yaml
   <absolute-path-to-oas-file>: <categoryName>:<tagName>
   ```
   Preserve all other existing entries in the file.
3. Announce:
   > "`<categoryName>:<tagName>` saved. The audit will use this tag going forward."
4. Proceed to **Announce: tag found**.

---

## Announce: tag found

> "This API is tagged on the 42Crunch platform as **`<categoryName>:<tagName>`**.
> The audit will run against this tag, which means platform SQGs,
> customisations, and data dictionaries associated with it will be applied
> automatically."

Set the following flags for the audit or scan command:
`--tag <categoryName>:<tagName>`, `--report-sqg`.
