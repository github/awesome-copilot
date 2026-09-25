---
name: make-blog-post
description: 'Turn code from the current session into a blog post written in the voice of its author. Covers one function, script, class, or tool as a focused walkthrough with a generalized sample and a usage example, learns tone and structure from existing posts or writing samples by the same author, takes the destination from what the user names or the blog repository in use instead of assumed folders, and writes nothing until the draft is approved. Use when asked to write, draft, or turn code into a blog post, article, tutorial, or gist, or when invoked as /make-blog-post at the end of a turn.'
argument-hint: "Optional: code or topic to cover, where the post goes, and links or files of your past posts"
---

# Make Blog Post

Turn code from the current session into a blog post that reads as if its author wrote it: one walkthrough of one function, script, class, or tool, built around a generalized sample and a usage example.

This skill runs only when the user asks for a post. The natural moment is the end of a turn, once the code works: `/make-blog-post`, optionally followed by what to cover, where the post goes, and links or files of the author's past posts.

## When to Use This Skill

- The user asks to write, draft, or turn code into a blog post, article, tutorial, walkthrough, or gist.
- The user invokes `/make-blog-post`, with or without naming the subject, the destination, or writing samples.

Do not use it for API reference, READMEs, changelogs, or release notes, or for a post that needs several unrelated examples or a multi-file walkthrough.

## Examples

```text
/make-blog-post
/make-blog-post the retry helper in src/http.ts
/make-blog-post the slugify function, as a gist
/make-blog-post put it in the blog, match https://example.com/posts/one and https://example.com/posts/two
```

## Workflow

Work through the steps in order. Nothing is written to disk until the draft is approved in step 5.

### 1. Pick the subject

- Use what the user named: a function, file, selection, snippet, or topic. Code pasted into the conversation is in scope too.
- Otherwise, take the code written or changed in this session. When more than one piece qualifies, list up to three, each with a one-line purpose, and ask which one to write up.
- Check that the subject works as a standalone post. It should:
  - Solve one clear, general-purpose problem.
  - Fit in one self-contained example.
  - Not depend on project-specific state, services, or configuration that cannot be replaced with a stand-in.
  - Not be trivial. A one-line wrapper or a lone standard-library call does not qualify.
- When a check fails, say which one and suggest an angle that works, such as the technique behind the code. Proceed with the original subject if the user still wants it.

### 2. Learn the author's voice

A post that reads like generic documentation is not the author's post. Before drafting, collect three to five samples of the author's own writing, from these sources in order:

1. Samples named in the request: files, folders, URLs, or pasted text.
2. A saved voice profile the user points to, in the request or in their custom instructions.
3. When the destination is a blog repository, the most recent posts there by this author.

When these sources give fewer than three samples, ask once for enough links or files to reach three, unless the user has already said there are no more. Then work with what there is:

- **Three or more**: build the full profile.
- **One or two**: build a thin profile from only the patterns those samples confirm, and offer the three quick questions in the reference to fill the gaps.
- **None**: offer the three quick questions, or write in a plain, neutral voice.

A saved profile counts as the number of samples it records. Say at the plan check which case applies and how many samples the profile rests on. Never present a thin or neutral draft as a full match.

Build a short profile with [references/voice-profile.md](references/voice-profile.md): person and address, formality, rhythm, openings, headings, how code is introduced and explained, closings, and mechanics such as spelling and punctuation habits. The samples are evidence of style only. Nothing from their content (sentences, anecdotes, names, links) goes into the new post, and no personal experience is invented to fit a pattern.

### 3. Resolve the destination

Consider only what the user said, the current workspace, and paths the user provides. Do not assume any folder exists, and do not walk parent or sibling directories looking for one.

1. **The user named a destination** (a path, a repository, a venue such as a gist, or "just show me"): use it, and do not move the post elsewhere because another place fits conventions better. A partial name such as "the blog" resolves against the current workspace only. If the workspace is not that blog, ask for the path.
2. **The workspace is a blog or site**: take the posts folder from the generator's own configuration, and match an existing post's folder, extension, file naming, and front matter. See [references/blog-platforms.md](references/blog-platforms.md) for detection and each generator's contract.
3. **Otherwise**: write no file. Deliver the post in chat and offer to save it to a path the user names.

A default destination or voice profile recorded in the user's custom instructions counts as named by the user. That is the place for a personal workflow, such as a folder where every post is archived.

When writing to a named path:

- Create missing subfolders under a root that exists. If the root itself does not exist, ask instead of building a tree that may be a typo.
- If the path breaks the detected generator's contract (the wrong folder for the collection, a missing date prefix), state in one line what would break, offer the compatible path, and ask which to use.
- If the request conflicts with the site's conventions, say so once, then follow the request. The security rules and the approval gate still apply.

### 4. Check the plan

Before drafting, present these in a few lines and wait for a yes:

- The subject and the single purpose the post covers.
- The voice source (which samples or profile, and how many samples it rests on) and three to five bullets summarizing it. Call a thin profile or one built from answers a partial match, and a neutral voice no match.
- The destination as a full path, with the config file it was resolved from when a generator was involved, or "chat only".
- The working title, the slug, and the SEO level.
- Any open question, when there is one, such as the real story behind a personal opening, or an existing post at the destination on the same subject (update it, take a new angle, or stop).

On a decline, stop and write nothing. When the post will be delivered in chat, nothing is written, so skip the extra round trip: put the plan at the top of the reply that carries the draft, and let one approval cover both.

### 5. Draft and get approval

Write the post per **Building the post**, show it in full, and invite edits. Revise and show it again until the user approves. Silence or an ambiguous reply is not approval. Nothing is written, published, committed, or pushed before an explicit yes.

### 6. Deliver

- **File**: write to the confirmed path in the site's format, using the host's path separators and the repository's line endings. Name a standalone file after the slug (`slugify-text.md`), which describes what the code does, not the project. Approval was the gate, so write the post ready to publish. If the user asks for a draft instead, use the platform's draft mechanism (see [references/blog-platforms.md](references/blog-platforms.md)) and name it in the report.
- **Chat**: follow the copy-paste rules in [references/delivery.md](references/delivery.md).
- **A gist, discussion, wiki page, or hosted platform the user posts to by hand**: shape the post and list its field values per [references/delivery.md](references/delivery.md).

Report what was written and where. Committing, pushing, uploading, or publishing is a separate action that needs its own request.

Close with up to two one-line offers:

- **Link the post from the docs**, when the post has a published URL or a path inside this repository to point to, and the repository already documents this code. That means a README section, a docs page, or a doc comment such as a docstring or JSDoc block that explains what the code does. A plain inline comment, or one that only gives internal context, does not count, and internal-only code gets no offer. The link goes next to that documentation in one line, such as `Walkthrough: <post URL or path>`. Do not create a docs file just to hold it.
- **Save the voice profile**, when it came from samples, with [assets/voice-profile-template.md](assets/voice-profile-template.md) at a location the user chooses, so the next post can reuse it.

## Building the post

The post explains one specific purpose of the code as an informational walkthrough. It contains:

- A title naming the problem the code solves.
- A short opening stating what the code does and the single use case covered.
- The generalized function, method, or tool in one code block.
- A minimal usage example with cliche sample data and the expected output.
- A closing note on limits or edge cases, when there is something worth saying.

The implementation and its usage count as one worked example, and can share a block where the language makes that natural. A second, unrelated example, or a walkthrough that needs several files, is out of scope.

The voice profile decides how these parts are worded, ordered, and headed. It never drops a required part and never overrides the security rules.

Apply SEO at the level that fits the destination, per [references/seo.md](references/seo.md): `full` for a published blog, `light` for a plain file or a chat draft with no destination yet, `venue` for a gist-style page, `internal` for a documentation set. A level the user asks for, including none, wins. Where the site's own conventions or the author's voice clearly differ from an SEO default (title style, tagging, linking habits), the site and the author win.

### Default post layout

Use this layout only where YAML front matter is read as metadata and no site defines its own fields, such as a standalone Markdown file saved at a path the user names, or a platform that accepts front matter on paste:

```markdown
---
title: <Post title>
description: <One sentence, 140 to 160 characters, leading with what the reader gets>
slug: <lowercase-hyphenated-slug>
category: <domain, such as string-utils or file-io>
tags: <tag>, <tag>, <tag>
date: <YYYY-MM-DD>
---

<post body in Markdown>
```

- A site's own front matter wins over this layout: map these values onto the fields it already uses and drop any it does not read.
- A destination that does not parse front matter never gets this block. That covers a gist, a Discussions post, a wiki page, most hosted editors, and a chat draft whose target is still unknown. Use the shape in **Venues with no front matter** in [references/delivery.md](references/delivery.md) instead, which moves the title into the first heading and the description into the opening line.

## Security and content rules

These rules apply to everything that goes into a post, whatever the destination or voice.

1. **No credentials or secure data.** No API keys, tokens, passwords, secrets, connection strings, private URLs, internal hostnames or IPs, account IDs, environment variable values, file paths that reveal user or machine names, or personal information. Replace anything the code needs with an obvious placeholder such as `YOUR_API_KEY` or `https://api.example.com`.
2. **Cliche sample data only.** For example `"Hello, World!"`, `Jane Smith`, `user@example.com`, `foo` / `bar` / `baz`, `123 Main St`, `42`, `Acme Corp`. When the code needs data the list lacks, such as accented text or a date, choose something equally generic (`Café`, `2026-01-01`), never a value from the working context.
3. **No incidental detail from the working context or the samples.** Real names, project, client, and product names, business terms, internal file names, and values from the conversation stay out, and so does content from the voice samples. Code or a topic the user supplies directly is the subject rather than incidental detail: use it, generalized under rule 4 and held to rule 1.
4. **Rewrite, don't copy.** Generalize the code into a clean demonstration: rename project-specific identifiers, strip unrelated logic, and remove internal dependencies.
5. **Paths in samples follow the sample.** A PowerShell or batch sample shows Windows paths, a shell sample shows POSIX paths, and a cross-platform sample shows both or a token such as `<config-dir>`.

## Limitations

- One post, one purpose, one worked example.
- A full voice match needs at least three samples. With fewer, the profile is thin or neutral, and the plan check says so.
- The skill writes files. It does not publish, upload, commit, or push.
