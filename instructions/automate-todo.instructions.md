---
description: 'Complete TODO.md items nested under the level 2 header "Current".'
---

# Automate TODO

Complete all items listed under the level 2 header **Current** in the
[TODO.md](../../TODO.md) file at the root of the workspace or repository.

- If level 2 header **Current** does not exist:
  - Create level 2 header in `TODO.md`
  - Resolve to `Else if no TODO` condition of `CHANGELOG.md Updating` section
    of this document

Once completed, update:

- Relevant documentation files
- The repository or workspace [CHANGELOG.md](../../CHANGELOG.md) according to
  the nested **From** list item of a **current** `TODO` item
- If **manifest** file exists (e.g., `package.json`, `tsconfig.json`, etc.), then:
  - Update **manifest** file according to:
    - Version update applied
    - Any newly introduced items from the update
- **Testing**: Write and test the updates, and:
  - If pass, then:
    - Resolve to `Closing` section of this document as **applied**
  - Else:
    - While update and test attempts are less than 3, then:
      - Debug failing items from test, and resolve back to **Testing** parent
        list item (*recurse*)
    - Else if update and test attempts are 3 or more, then:
      - Undo failing updates, and add the corresponding `TODO` items back to
        the **Current** `TODO.md` section as incomplete, then:
        - Note completed `TODO` items and resolve to `CHANGELOG.md Updating`
          section of this document
        - Resolve to `Closing` section of this document as either:
          - Updates **partially applied**, and:
            - Revert relevant files according to failing and passing updates
          - Updates **not applied**, and:
            - Restore all relevant files, so essentially:
              - In the terminal run: `git restore .`

## Nested **From** List Items or Property

A **current** `TODO` item should have a nested **From** list item, which will
be followed by text that either fully or **partially** matches another level 2
header in the `TODO.md` file. In regards to the **matching level 2 header**:

### Applying Next Version Update

- The text of the level 2 header that matches the nested **From** list item
  of a `TODO` in the **Current** section will include instructions or
  specific text specifying the next version update to apply
- If the `TODO` item in the **Current** section does not have a corresponding
  nested list item starting with **From**, then apply the next version update
  accordingly

### `CHANGELOG.md` Updating

Resolve to the `Applying Next Version Update` section of this document, then:

- If 1 list item is in the **Current** section of the `TODO`, then:
  - Resolve to `Constant CHANGELOG Conditions` section of this document
- Else if multiple `TODO` items are in the **Current** section, then:
  - If nested **From** exists in all **Current** `TODO` items:
    - Resolve to the **Priority Version Updates** section of this document
    - Resolve to `Constant CHANGELOG Conditions` section of this document
  - Else if nested **From** does not exist in any **Current** `TODO` items:
    - Indicate the next version update accordingly for each
    - Resolve to the **Priority Version Updates** section of this document
    - Resolve to `Constant CHANGELOG Conditions` section of this document
  - Else if nested **From** exists in some of the **Current** `TODO` items:
    - Indicate the next version update accordingly for each list item missing
      the nested **From** property
    - Resolve to the **Priority Version Updates** section of this document
    - Resolve to `Constant CHANGELOG Conditions` section of this document
- Else if no `TODO` items are in the **Current** section, then:
  - Do not update the current workspace or repository
  - Instead:
    - Resolve to `Current Road Map Document` section of this document with
      *no updates applied*

### Priority Version Updates

1. **Highest**: Major version update indicated
   - Example: `1.0.0` to `2.0.0`
2. **Moderate**: Minor version update indicated
   - Example: `1.1.0` to `1.2.0`
3. **Lowest**: Patch version update indicated
   - Example: `1.0.0` to `1.0.1`

### Constant `CHANGELOG` Conditions

- If `CHANGELOG.md` current version is using append text like `alpha`,
  `beta`, etc., then:
  - Continue to use the appended version text
- For each `TODO` list item in the **Current** section:
  - Resolve next version priority
  - Next version remains the same
- Once all **Current** `TODO` items have been completed, then:
  - Resolve to `Current Road Map Document` section of this document with
    *updates applied*

## Current Road Map Document

1. Read the `CHANGELOG.md` at the latest version, then read the
   workspace or repository source code
2. Add a set of existing `TODO` items to the **Current** section of the
   `TODO` in regards to:
   - Relative to the current source code state, determine the best order of
     `TODO` items to apply in sequential order
     - If the file [current.roadmap.md](../current.roadmap.md) does not exist
       in the workspace or repository `.github` (*create if not exist*) folder,
       then:
       - Create [current.roadmap.md](../current.roadmap.md) in the workspace
         or repository `.github` folder (*create if not exist*)
       - Write the determined sequence of updates to
         [current.roadmap.md](../current.roadmap.md)
     - Else:
       - Update and write the determined sequence of updates to
         [current.roadmap.md](../current.roadmap.md)
   - If *updates applied*, then:
     - Resolve to top-level **Testing** list item
   - Add a sequence of `TODO` items to the **Current** section
     - Max Items: 5 (*initial last item value*)
     - **Evaluate compatibility**: use the next sequence of `TODO` items
       compatibility to each other, then:
       - If next 5 determined `TODO` items are not compatible, then:
         - From sequentially 1st item to sequentially last item, remove the
           sequentially last item
         - Re-evaluate compatibility: resolve back to
           **Evaluate compatibility** parent list item (*recurse*)

## Move Completed `TODO` items

Run a script that would evaluate to `node todo.mjs`:

### `todo.mjs`

```mjs
#!/usr/bin/env node
/**
 * TODO.md maintenance.
 *
 * Moves every checked top-level item (`- [x] ...`, together with its wrapped
 * continuation lines and nested sub-items) out of its roadmap section and
 * into a `## Complete` section, which is created on first use and always
 * kept at the bottom of the file. Each archived item gains a nested
 * `- From: <section>` line recording which roadmap section it came from -
 * unless the item already carries a `- From:` note (an item worked on under
 * Current keeps the section it originally came from), which is preserved.
 * Items already under `## Complete` stay where they are, so running the
 * script repeatedly is a no-op.
 *
 * Nested checked items under an unchecked parent are left in place - the
 * parent keeps its context until it is checked off as a whole.
 *
 *   npm run todo
 *   node scripts/todo.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'TODO.md');
const lines = readFileSync(path, 'utf8').split(/\r?\n/);

// Split the file into the preamble (before the first `## `) and one entry
// per level-two section.
const sections = [];
let current = { header: null, lines: [] };
for (const line of lines) {
  if (/^## /.test(line)) {
    sections.push(current);
    current = { header: line, lines: [] };
  } else {
    current.lines.push(line);
  }
}
sections.push(current);

const isComplete = (s) => s.header !== null && /^## Complete\b/.test(s.header);

// Pull each checked top-level item out of every section except Complete
// itself. A block is the `- [x]` line plus every following indented line
// (wrapped text or nested children), so items move whole.
const moved = [];
for (const section of sections) {
  if (section.header === null || isComplete(section)) continue;
  const kept = [];
  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    if (/^- \[x\]/i.test(line)) {
      const start = moved.length;
      moved.push(line);
      while (i + 1 < section.lines.length && /^\s+\S/.test(section.lines[i + 1])) {
        moved.push(section.lines[++i]);
      }
      // Nested provenance line: which section the finished item came from.
      // An item that already carries its own "- From:" note (e.g. it was
      // pulled into Current from another roadmap section) keeps that origin
      // instead of being stamped with the section it was completed in.
      const hasFrom = moved.slice(start + 1).some((l) => /^\s+- From:/i.test(l));
      if (!hasFrom) moved.push(`  - From: ${section.header.replace(/^## /, '')}`);
    } else {
      kept.push(line);
    }
  }
  section.lines = kept;
}

// Collapses blank-line runs the moves leave behind (and trims the edges).
const tidy = (list) => {
  const out = [];
  for (const line of list) {
    if (line.trim() === '' && (out.length === 0 || out[out.length - 1].trim() === '')) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
};

// Reassemble with Complete last - moving the header to the bottom and
// appending the checked items under it in one pass.
let complete = sections.find(isComplete);
if (!complete && moved.length > 0) {
  complete = { header: '## Complete', lines: [] };
}

const out = [];
for (const section of sections) {
  if (section === complete) continue;
  if (section.header !== null) out.push(section.header, '');
  const body = tidy(section.lines);
  if (body.length > 0) out.push(...body, '');
}
if (complete) {
  out.push(complete.header, '');
  const body = tidy(complete.lines);
  if (body.length > 0) out.push(...body);
  out.push(...moved);
  if (out[out.length - 1] !== '') out.push('');
}

writeFileSync(path, out.join('\n').replace(/\n+$/, '\n'));
console.log(
  moved.length > 0
    ? `todo: moved ${moved.filter((l) => /^- \[x\]/i.test(l)).length} item(s) to ## Complete.`
    : 'todo: nothing to move.',
);

```

## Closing

Before finishing, ensure that:

1. Changes have been tested and applied correctly
2. Based on the status of applied changes, ensure that:
   - **Relevant Files**:
     - [ ] Relevant documentation files have been updated
     - [ ] `CHANGELOG.md` has been updated
     - [ ] **Manifest** file has been updated
3. If closing was called after testing as:
   - **applied**: then resolve to `Move Completed TODO items` section of this
     document
   - **partially applied**: then ensure:
     - Failing **Current** `TODO` items have been moved back, and are unchecked
     - Resolve to `Move Completed TODO items` section of this document
   - **not applied**: then restore all changes, reverting workspace or
     repository back to its prior state
