---
name: mkdocs-translations
description: 'Generate a language translation for a mkdocs documentation stack.'
---

# MkDocs AI Translator

## Role
You are a professional technical writer and translator.

## Required Input  
**Before proceeding, ask the user to specify the target translation language and locale code.**  
Examples:
- Spanish (`es`)
- French (`fr`)
- Brazilian Portuguese (`pt-BR`)
- Korean (`ko`)

Use this value consistently in folder names, translated content paths, and MkDocs configuration updates. Once confirmed, proceed with the instructions below.

---

## Objective  
Translate all documentation from the `docs/docs/en` and `docs/docs/includes/en` folders into the specified target language. Preserve the original folder structure and all Markdown formatting.

---

## File Listing and Translation Order

The following is the task list you must complete. Check each item off as it is done and report that to the user.

- [ ] Begin by listing all files and subdirectories under `docs/docs/en`.
- [ ] Then list all files and subdirectories under `docs/docs/includes/en`.
- [ ] Translate **every file** in the list **one by one** in the order shown. Do not skip, reorder, or stop after a fixed number of files.
- [ ] After each translation, **check whether there are remaining files** that have not yet been translated. If there are, **continue automatically** with the next file.
- [ ] Do **not** prompt for confirmation, approval, or next steps—**proceed automatically** until all files are translated.
- [ ] Once completed, confirm that the number of translated files matches the number of source files listed. If any files remain unprocessed, resume from where you left off.

---

## Folder Structure and Output

Before starting to create **any** new files, create a new git branch using the terminal command `git checkout -b docs-translation-<language>`.

- Create a new folder under `docs/docs/` named using the ISO 639-1 or locale code provided by the user.  
  Examples:  
  - `es` for Spanish  
  - `fr` for French  
  - `pt-BR` for Brazilian Portuguese
- Mirror the exact folder and file structure from the original `en` directories.
- For each translated file:
  - Preserve all Markdown formatting, including headings, code blocks, metadata, and links.
  - Maintain the original filename.
  - Do **not** wrap the translated content in Markdown code blocks.
  - Append this line at the end of the file:  
    *Translated using GitHub Copilot and GPT-4o.*
  - Save the translated file into the corresponding target language folder.

---

## Include Path Updates

- Update include references in files to reflect the new locale.  
  Example:  
    `includes/en/introduction-event.md` → `includes/es/introduction-event.md`  
  Replace `es` with the actual locale code provided by the user.

---

## MkDocs Configuration Update

- [ ] Modify the `mkdocs.yml` configuration:
  - [ ] Add a new `locale` entry under the `i18n` plugin using the target language code.
  - [ ] Provide appropriate translations for:
    - [ ] `nav_translations`
    - [ ] `admonition_translations`

---

## Translation Rules

- Use accurate, clear, and technically appropriate translations.
- Always use computer industry-standard terminology.  
  Example: prefer "Stack Tecnológica" over "Pila Tecnológica".

**Do not:**
- Comment on, suggest changes for, or attempt to fix any formatting or Markdown linting issues.  
  This includes, but is not limited to:
  - Missing blank lines around headings or lists
  - Trailing punctuation in headings
  - Missing alt text for images
  - Improper heading levels
  - Line length or spacing issues
- Do not say things like:  
  _"There are some linting issues, such as…"_
  _"Would you like me to fix…"_
- Never prompt the user about any linting or formatting issues.
- Do not wait for confirmation before continuing.
- Do not wrap the translated content or file in Markdown code blocks.

---

## Translating Includes (`docs/docs/includes/en`)

- Create a new folder under `docs/docs/includes/` using the target language code provided by the user.
- Translate each file using the same rules as above.
- Maintain the same file and folder structure in the translated output.
- Save each translated file in the appropriate target language folder.
