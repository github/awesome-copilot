# SEO

Optimize the post for the way readers search for the problem it solves. How far to go depends on where the post lands, so settle the destination first.

These rules are defaults. Where the site's own conventions or the author's voice clearly differ (title style, tagging, linking habits), follow the site and the author, and apply these rules only where they fit.

## Levels

| Level | When | Apply |
| --- | --- | --- |
| `full` | A published blog or site | Everything below |
| `light` | A plain file, or a chat draft with no known destination | Title, description, slug, and tags. Skip internal links and structured data, so the post stays portable if it is published later. |
| `venue` | A gist or other page with no front matter | Title, description, slug, and the opening paragraph at full strength. Skip tags, internal links, and structured data. External links still apply. |
| `internal` | A documentation set | Plain descriptive headings, the code's own identifiers, and a title that reads well in a file listing. Skip keyword phrasing that would look out of place in docs. |

Pick the level from the destination. A level the user asks for, including none at all, wins.

## Keywords come from the technology, not the project

Derive search terms from the generalized subject of the post: the language, runtime, library, and task the code performs. Never use a project, client, organization, repository, or internal product name as a keyword, tag, or slug.

- The language and runtime in use, such as `powershell`, `node`, or `python`.
- The problem domain, such as `file-io`, `date-time`, or `string-utils`.
- Terms from the code's own API, where they are standard rather than invented for the project.

Choose one primary search phrase and at most two secondary phrases, written the way a reader would type them.

## Title

- Lead with the primary phrase, so the problem shows in the first three or four words.
- Keep it under 60 characters so it is not truncated in results.
- State the task, not the cleverness: `Slugify Text in PowerShell` beats `A Neat Trick for Tidy URLs`.
- Use one `H1` per post, matching the title.
- When the author's titles follow a clear pattern (see `references/voice-profile.md`), keep it and fit the primary phrase in where it reads naturally.

## Description

One sentence of 140 to 160 characters that leads with what the reader gets. It doubles as the meta description, so it carries no project or working-context details.

## Slug

- Lowercase, hyphenated, three to six words, derived from the primary phrase.
- No dates, no numbering, and no stop words that carry no search weight.
- Choose the slug first, then build any file name from it: `slugify-text` becomes `slugify-text.md`, or `YYYY-MM-DD-slugify-text.md` on Jekyll. A platform-required prefix such as that date belongs to the file name, not the slug, unless the site's own convention puts it in the slug.
- On a site with an established slug convention, follow the site.

## Headings and body

- Put the primary phrase in the first 100 words, once, in a sentence that would read the same without it.
- Build `H2` headings around what readers search for (what the code does, how to use it, what it returns, when not to use it), worded in the author's heading style.
- Use natural variants rather than repeating one phrase. Repetition past a couple of natural uses reads as padding.
- Tag every code block with its language so it renders correctly and can surface as a code result.
- Give any image alt text that describes what it shows. Skip decorative images entirely.

## Tags

- On a blog or site, follow the site's tagging pattern. Reuse existing tags where they fit, and add a new one only the way the site's own posts do.
- Otherwise, derive two to four tags from the domain and the language.
- Keep tags lowercase and hyphenated.

## Links

- **Internal**: at `full` only, link to one or two existing posts on the same site when a genuine connection exists. No link is better than a forced one.
- **External**: link to the official documentation for any language feature or library the sample depends on. Never link to private, internal, or authenticated URLs.
- Write descriptive link text. Never "click here".

## Structured data

At `full`, if the site already emits article metadata (JSON-LD, Open Graph, or equivalent), fill the fields it expects from the front matter values. Do not add a structured data mechanism the site does not already have.
