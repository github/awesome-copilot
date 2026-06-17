---
description: "Write only the resulting content into files. Never echo prompt instructions, rationale, or meta-commentary into documentation, comments, or code being produced from a prompt."
applyTo: '**'
---

# Exclude Prompt Data

When a prompt contains instructional or contextual data used to guide a change,
that data must not appear in the file being updated. The output must reflect
only the *result* of the instruction — not the instruction itself, the
reasoning behind it, or any acknowledgment that it was applied.

## Core Rule

> **Never echo prompt content into the file being changed.**
>
> Only write the outcome. Strip any meta-commentary, rationale, or framing that
> originated in the prompt.

## What Counts as Prompt Data

Prompt data is any content the user provides as instruction or context rather
than as intended file content:

- Descriptions of what to add or change (`"add a --verbose flag that..."`)
- Inline rationale or motivation (`"because the old behavior caused..."`)
- References to the prompt itself (`"as requested"`, `"per the prompt"`,
 `"the new feature has been added as"`)
- Meta-commentary about the update
 (`"This section has been updated to reflect..."`)
- Code comments that narrate a change rather than describe the code
 (`"// Added email validation as requested"`,
 `"// Now validates the input per the new requirement"`)
- Structural scaffold labels used as section markers or template slots
 (the word `this` in `## this Title` is scaffolding, not heading text)

## What Belongs in the Output

The output file should contain only:

- The feature, fix, or content the prompt requested — written as if it always
 belonged there
- Documentation or code that a reader would find useful independent of how the
 change was requested
- Generic, cliche placeholder data in examples (e.g., `Jane Doe`,
 `jane.doe@example.com`, `Acme Corp`, `example.com`) — never real names,
 emails, domains, or organization identifiers pulled from the prompt or local
 configuration
- Language formatting applied to terms in the prompt carries through to the
 output — if the prompt wraps a term in backticks or uses a specific syntax
 convention, follow that same convention in the output

## Output Quality

The prompt's writing quality does not set the bar for the output. Regardless
of how a prompt is phrased, the result must be polished and production-ready:

- Correct grammar, capitalization, and punctuation throughout
- No draft-quality prose or casually written sections
- Informal or sloppy phrasing in the prompt must not carry into the output

## Use Cases

### Adding a Feature Flag to Documentation

**Prompt**

```text
Update file.ext with new feature --new-opt <argument>, documenting the new
feature in features.md
```

**Acceptable result — `features.md`**

```text
### --new-opt

Enables extended output. Requires a value argument. Example:

    ```bash
    file --new-opt foo
    ```
```

**Unacceptable result — `features.md`**

```text
### --new-opt

The new feature `--new-opt` requiring an argument has now been added as
requested. The feature is documented as such.

Enables extended output. Requires a value argument. Example:

    ```bash
    file --new-opt foo
    ```
```

The unacceptable version echoes the prompt's framing
(`"has now been added as requested"`, `"The feature is documented as such"`).
That language belongs in the prompt, not the file.

---

### Updating a Code File

**Prompt**

```text
Add input validation to the createUser function — email must be a valid format.
```

**Acceptable result**

```js
function createUser(name, email) {
  // Rejects addresses missing a local part, @ sign, or domain
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address.');
  }
  // ...
}
```

**Unacceptable result**

```js
// Added email validation as requested in the prompt
function createUser(name, email) {
  // Per the instruction, we now validate that email must be a valid format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address.');
  }
  // ...
}
```

The unacceptable version leaks prompt phrasing into code comments. Code
comments and documentation updates are appropriate and encouraged — they should
describe what the code does, its constraints, or its intent. What they must
never do is narrate the change, reference the prompt, or report back as if
responding to the user who requested it.

## Exceptions

A small number of cases legitimately require prompt content to appear in the
file. Treat these as exceptions, not loopholes:

- **Verbatim transcription requested.** The user explicitly asks for prompt
 text to be inserted as-is (e.g., "paste this block into the README under
 `## Notice`"). Insert exactly what was requested and nothing more.
- **The file *is* a prompt or instruction artifact.** When editing prompt
 files, skill definitions, or instruction files, instructional content is the
 intended payload. The rule still applies one level up: do not add
 meta-commentary about *this* edit into those files.
- **Changelog or release-note entries.** A short, factual line describing the
 change is appropriate. Keep it about the change, not about the request
 (`Added --verbose flag` ✓ / `Added --verbose flag as requested by user` ✗).

## Self-Check Before Saving

Before committing an edit produced from a prompt, scan the diff for any of the
following and remove what you find:

- [ ] Phrases like "as requested", "per the prompt", "per your instruction",
 "as you asked"
- [ ] Sentences that announce a change rather than describe the subject
 ("This section now covers...", "Updated to include...")
- [ ] Comments that explain why code was written instead of what it does
- [ ] Verbatim restatement of the user's request inside the file
- [ ] Acknowledgments of the prompt's existence at all

If any of these appear, rewrite the affected section so a fresh reader — with
no knowledge of the prompt — would find the content natural and self-contained.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Output contains "as requested" or "per the prompt" | Remove it |
| Docs announce a change instead of documenting it | Rewrite directly |
| Code comments narrate the change | Describe the code's behavior |
| Prompt scaffold labels appear in output headings | Replace with original |

## Summary

Write the result, not the story of how you got there. A reader of the
output file should see clean, useful content — with no trace of the prompt
that produced it.
