---
description: 'When a function, method, tool, or other code in a workspace can be used independently, create a blog post that presents it as an informational walkthrough for one specific purpose'
applyTo: '**'
---

# Make Blog Post

## When this applies

While working in a workspace or repository, evaluate whether any function, method, class, script, or tool you are writing or touching can be **used independently** - that is, it works outside this project with little or no modification.

It qualifies when **all** of these are true:

- It solves one clear, general-purpose problem.
- It can be demonstrated in a single self-contained example.
- It does not depend on project-specific state, services, or configuration that can't be replaced with a stand-in.
- It is not trivial (a one-line wrapper or a standard-library call on its own does not qualify).

If any condition is false, do nothing and do not mention this instruction.

Before drafting a post, check the post store (see **Where the post is stored**) for an existing post covering the same code. If one exists, skip.

## Instruction Configuration

This section configures how the rest of this file is applied. It is relevant only to this instruction file.

- **automation-mode** : false
  - `true` when this instruction runs inside an agent-driven flow with an interactive approver.
  - `false` when a person is present for the exchange.
- **post-store-root** : the entry for the host OS listed under **Where the post is stored**.
  - Windows: `C:\Users\<user>\Documents\blogPosts\`
  - macOS: `/Users/<user>/Documents/blogPosts/`
  - Linux: `/home/<user>/Documents/blogPosts/`
  - Resolve the home portion from the environment rather than hardcoding it: `%USERPROFILE%` on Windows, `$HOME` on macOS and Linux. Replace with the real root for this machine on first use.
- **allow-in-workspace-storage** : true
  - When `true`, the post may be stored inside the current workspace instead of the post store, if the workspace is a fitting home for it.
- **delivery-mode** : auto
  - `auto` picks the mode from what the user asked for, per **Delivery modes**.
  - `direct`, `staged`, or `paste` pins one mode regardless.
- **seo-optimization** : auto
  - `auto` picks the level from where the post lands, per **SEO optimization**.
  - `full`, `light`, `venue`, or `internal` pins one level regardless of destination.
  - `off` skips the SEO section entirely.

Confirmation (see **Confirmation gates**) is not configurable. It applies in both modes.

## Deciding where the post belongs

### An instruction from the user wins

If the user names a destination, use it. Everything below is inference, and inference loses to an instruction.

- **A named path, folder, repository, or venue is the destination.** Do not re-derive it, and do not relocate the post to a different project or venue because another location would fit the conventions better.
- **Resolve a partial name through the generator.** An instruction that names a project, repository, or site without naming the exact folder ("put it in the blog") fixes which project receives the post and leaves the folder open. Settle that folder from the generator's own configuration per **Common blog platforms** rather than from a guess, then echo what it resolved to.
- **Echo the resolved destination at Gate 1** as a full path, or as the venue plus file name. A short instruction such as "put it in the blog" is still an instruction; resolve it against the workspace, then show what it resolved to so a wrong reading is caught before anything is written.
- **Create missing category folders** under a root that already exists. If the named root itself does not exist, stop and ask rather than building a tree that may be a typo.
- **Ask before writing a file the generator cannot read.** When the user names an exact file path and that path breaks the detected generator's contract - the wrong folder for the collection, or a file name missing a required date prefix - neither write it silently nor relocate it silently. State in one line what will break, give the compatible path beside it, and ask which to use. This is the one case where a named destination waits on an answer, because the alternative is a file that fails the build or never appears.
- **Say so once if the instruction conflicts** with the site's conventions or with a rule in this file, then follow the instruction anyway. The exceptions are **Security and content rules**, **Confirmation gates**, and the generator-compatibility question above: strip offending data, always obtain the required confirmations, and ask before writing a post the site cannot publish.

When no destination was named, infer one as follows.

Before drafting, read the working context and decide what kind of work is being done. The answer determines whether the post becomes a file in this workspace, a file in the post store, or both.

Look at:

- **Is this a repository or a loose folder?** A folder with no version control is scratch work; its posts go to the post store.
- **Is the workspace a blog or site?** Signs include a posts folder (`_posts/`, `content/posts/`, `src/content/blog/` are conventional names, not the only ones), a static site generator config (`_config.yml`, `hugo.toml`, `astro.config.mjs`, `src/content.config.ts`), or an existing body of dated articles. If so, the workspace is the natural home for the post, and **Common blog platforms** says how to read the generator's own configuration for the folder it actually uses.
- **Is there a pseudo-blog venue in play?** The user may publish standalone posts somewhere that is not a blog at all, such as a gist. That is a valid destination with its own shape; see **Pseudo-blog venues**.
- **Is the workspace a documentation set?** A `docs/` tree or a documentation-only repository. A walkthrough may belong there as a new doc file.
- **Is the workspace an application or library?** The code lives here but the writing does not. Store the post in the post store and consider only a link back (see **Linking in documentation**).
- **Does the repository sit in an organization folder?** If the repository's parent folder is `GitHub` (`...\GitHub\repoName` on Windows, `.../GitHub/repoName` on macOS and Linux), use the `blogPosts` / `<category>` form. If it sits inside an organization folder (`...\GitHub\<organization>\repoName`, or `.../GitHub/<organization>/repoName`), use the `blogPosts` / `<organization>` / `<category>` form. Build the actual path with the host OS's separators (see **OS handling**).

From that reading, settle two questions and state both answers in the write confirmation:

1. **Does this create a new doc file in the workspace?** Only when the workspace is a blog or documentation set, `allow-in-workspace-storage` is `true`, and the post fits the existing structure. Never create a new documentation area just to hold a post.
2. **Where is the post stored?** The workspace path chosen above, the post store path, both (a workspace copy for publication and a post store copy for the archive), or the post store plus a copy shaped for a pseudo-blog venue (see **Pseudo-blog venues**).

When the workspace is a blog or site, match its existing posts: same folder, same file extension, same front matter fields, same naming convention. The layout in **Post file layout** is the fallback for the post store, not an override of a site's own format.

## Common blog platforms

When the workspace is a blog, identify the generator before writing anything. Each one has its own posts folder, file naming rule, and front matter contract, and a post that ignores the contract either fails the build or silently never appears.

The **Default posts folder** column records each generator's convention, not a guarantee. Every one of these projects can move that folder, and several declare it in code rather than in a settings file. Read the column as where to look first, and the project's own configuration as the answer.

| Platform | Detect by | Default posts folder | Contract to honor |
| --- | --- | --- | --- |
| Jekyll | `_config.yml`, `Gemfile` with `jekyll` | `_posts/` | File name must be `YYYY-MM-DD-slug.md`. YAML front matter with `layout`, `title`, `date`, `categories`, `tags`. A `source` or `collections_dir` setting in `_config.yml` moves the folder. |
| Hugo | `hugo.toml`, `hugo.yaml`, `config.toml` | `content/posts/` | TOML or YAML front matter matching the theme. `draft: true` keeps it out of the build. `contentDir` moves the content root, and the section folder is whichever one the theme lists. |
| Astro | `astro.config.mjs` | Whatever the content collection declares, commonly `src/content/blog/` | Read the collection config first: `src/content.config.ts` on Astro 5, `src/content/config.ts` on Astro 4. A collection's `loader` chooses the directory, so `glob({ base: './src/data/blog' })` puts posts there and not under `src/content/`. Front matter must satisfy that collection's `schema`, and a required field left out fails the build. |
| Eleventy | `.eleventy.js`, `eleventy.config.js` | `posts/`, or the folder named in the config | Front matter plus the directory data file. A `tags` value is what puts the post in the feed. |
| Next.js | `next.config.*` with an MDX or content pipeline | `content/`, `posts/`, `app/blog/`, or wherever the content pipeline reads from | MDX rules apply: components must be imported or provided, and raw `<` in prose breaks the parse. |
| Gatsby | `gatsby-config.js` | `content/blog/` | Front matter fields must exist in the GraphQL schema the templates query. The `path` given to `gatsby-source-filesystem` is the folder actually sourced. |
| Docusaurus | `docusaurus.config.js` | `blog/` | Date from the file name prefix or a `date` field. `<!--truncate-->` marks where the excerpt ends. The blog plugin's `path` option moves the folder. |
| Hexo | `_config.yml` with `hexo` dependencies | `source/_posts/` | YAML front matter. `<!-- more -->` marks the excerpt break. `source_dir` in `_config.yml` moves the source root. |
| Zola | `config.toml` with `base_url` | `content/` | TOML front matter fenced by `+++`, not `---`. The post belongs to a section, which is a subfolder of `content/` carrying its own `_index.md`. |
| VitePress | `.vitepress/` | the folder the theme configures | Front matter plus whatever index page lists the posts. |
| Hosted platforms | No repository present | Composed locally, entered by the user | The post is written to the post store and handed over. Some accept a front matter block on paste; most do not. |

Rules that apply to all of them:

- **The project's configuration outranks this table.** Open the generator's config before choosing a path. Where a project declares its content in code - an Astro `loader`, an Eleventy directory setting, a Gatsby filesystem source, a Docusaurus plugin `path` - that declaration is both the destination and the schema, and the default above applies only when no such setting exists.
- **Read a neighbor first.** Open an existing post in the resolved folder and copy its field set exactly. The live posts are more reliable than any general rule here.
- **Settle a disagreement before writing, not after.** When the config and the existing posts point at different folders, stop and ask which one is current. When the config names a folder that holds no posts yet, the config wins.
- **Satisfy the schema, then stop.** Match the schema the config actually declares, and do not invent front matter fields the site does not read.
- **Prepare a draft where the platform supports it.** After Gate 1 confirmation, include `draft: true`, `published: false`, or the platform's equivalent in the in-memory draft shown for Gate 2, using the flag the resolved schema declares rather than assuming one exists. Do not write the file until Gate 2 approval; when writing after approval, clear the draft flag. On a platform with no draft flag, likewise keep the file unwritten until Gate 2 approval.
- **Respect the file naming rule.** A date-prefixed name is required on some platforms and wrong on others.

## Pseudo-blog venues

A pseudo-blog venue publishes a standalone readable post without being a blog: there is no generator, no front matter, and no feed, but the result is a public page that serves the same purpose. Common examples are a gist on GitHub, a Discussions post, a wiki page, a snippet on a hosted git service, a standalone page on a project site, or an entry in a notes repository.

Treat these as a valid destination. The post is built the same way and held to the same **Security and content rules**, but its shape changes.

### Shaping the post for a venue with no front matter

- **Never leave a front matter block at the top.** A venue that does not parse it renders the raw `title:` and `description:` lines as body text. Move those values into the post instead.
- **The title becomes the first heading**, or the venue's own title field where it has one.
- **The description becomes the opening line** of the body, or the venue's description field.
- **Tags have nowhere to live.** Drop them, or work the one or two that matter into the opening sentence as ordinary words.
- **Keep the archive copy intact.** The post store copy keeps its full front matter per **Post file layout**. The venue copy is derived from it, so the metadata is never lost.

### Worked example: a gist post on GitHub

A gist has two pieces of discoverable text and no front matter at all.

- **Gist description** - carries the post description. This is the line readers see in listings and search results, so it holds the primary search phrase. One sentence, no project details.
- **File name** - carries the slug and sets syntax highlighting. `slugify-text.md` renders as Markdown and keeps the primary phrase in the URL.
- **File body** - the post itself, opening with an `H1` matching the title, then the walkthrough exactly as built.

Keep it to one file. A gist with several files reads as a project, not a post.

### SEO for pseudo-blog venues

These pages are indexed but have no tag system, no internal link graph, and no structured data. Apply the **SEO optimization** rules selectively:

- **At full strength**: title, description, slug, and the primary phrase in the first 100 words. These are the only signals the venue carries.
- **Skipped**: tags, internal linking, and structured data. There is nothing to attach them to.
- **External links still apply.** Link to official documentation for anything the sample depends on.

### Publishing to a pseudo-blog venue

Writing the file is this instruction's job. Uploading it is not.

1. Write the post to the post store under the chosen category, with full front matter.
2. Write the venue-shaped copy in a venue-specific subdirectory (for example, `gist/slugify-text.md`), using the file name the venue needs without overwriting the archive copy.
3. Report both paths, and state the venue description and file name to use.
4. Stop there. Creating the gist, opening the discussion, or editing the wiki is a separate action and needs its own request from the user, exactly as committing and pushing do.

Before building a venue copy, check the post store for an existing post on the same code that already went out to that venue. If one exists, skip.

## Delivery modes

Where the post belongs and how it reaches the user are separate questions. Settle this one before Gate 1, because it decides whether a file is written at all.

| Mode | What is produced | When to use it |
| --- | --- | --- |
| `direct` | The post file, written to the resolved destination. | The destination is a path this session can write to, and the user wants it written. |
| `staged` | The post file, written to a staging path, plus a hand-off summary for the user to post manually. | The final destination is one only the user can reach: a hosted platform, an account-bound venue, or any site the user posts to by hand. |
| `paste` | The post rendered in the reply, ready to copy. No file is written. | The user asked to see it, to be given something to paste, or for a draft to read before deciding. |

With **delivery-mode** set to `auto`, read the request:

- A named path, or a plain instruction to write or save the post, means `direct`.
- "I will post it myself", "let me review it first", or a destination that needs an account or a browser means `staged`.
- "Show me", "give me something I can paste", "just draft it", or any request that never mentions a file means `paste`.
- When the request is genuinely ambiguous, ask at Gate 1 rather than guessing. Writing an unwanted file is the more annoying error of the two.

### Copy-paste mode

The reply is the deliverable, so it has to survive a single copy with no cleanup.

- **Render the post in one fenced block.** The post contains its own fenced code sample, so fence the outer block with four backticks so the inner three-backtick fence survives intact.
- **One block, nothing interleaved.** Do not split the post across several blocks with commentary between them. Notes go after the block.
- **Include front matter only if the target parses it.** For a hosted editor or a venue with no front matter, deliver the venue shape from **Pseudo-blog venues** instead.
- **List field values separately when the target has separate fields.** For a hosted editor, provide only the fields it actually exposes. For a gist, list the description and file name; put the title in the body's `H1`, use the file name as the slug, and omit tags.
- **Write no file.** Do not save a copy for safekeeping unless asked. Offer the archive copy in one line and let the user decide.

### Staged mode

The post is written, but the user does the posting. Staged mode has two destinations and they are not the same thing: the **staging path**, a real writable location on this machine, and the **final venue**, where the user posts it by hand. Settle them separately.

- **The staging path is always a filesystem path this session can write.** Use the path the user named when they named a real writable one. Otherwise use the post store under the chosen category. A venue name such as a hosted platform, a publication, an account, or a site title is not a path and is never written to, so it never becomes the staging path.
- **The final venue is a name, not a location to write.** Record it for the hand-off and keep it out of the write. Because the staging path falls back to the post store, Gate 1 always has a real path to report even when the user named only a venue.
- **Shape the file for its final venue**, not for the staging folder. A post staged for a hosted platform carries what that platform expects, per **Common blog platforms**.
- **Follow the file with a hand-off summary**: the final venue, the staging path written, the title, description, slug, and tags, and which of those go in which field at the venue.
- **Name any manual step that remains**, such as clearing a draft flag, choosing a canonical URL, or selecting the tags from a fixed list.
- **Do not post, upload, commit, or push.** Staged mode ends at the hand-off.

Mode does not weaken the gates. Confirmation still comes first, and nothing reaches a public venue without approval.

## Where the post is stored

The default post store is **post-store-root**, organized by category. Determine the host OS first, then use only that OS's forms below. Never mix forms from two OS blocks in one path.

**Windows OS**:

```
C:\Users\<user>\<blogSite>\<category>\
C:\Users\<user>\Documents\blogPosts\<category>\
C:\Users\<user>\Documents\blogPosts\<organization>\<category>\
```

**Mac OS**:

```
/Users/<user>/<blogSite>/<category>/
/Users/<user>/Documents/blogPosts/<category>/
/Users/<user>/Documents/blogPosts/<organization>/<category>/
```

**Linux OS**:

```
/home/<user>/<blogSite>/<category>/
/home/<user>/Documents/blogPosts/<category>/
/home/<user>/Documents/blogPosts/<organization>/<category>/
```

`<blogSite>` is a local checkout of a blog or site the user publishes to. Use that form only when the post is going into an existing site, and place the file where the site keeps its posts rather than at the site root.

`<category>` is a short, lowercase, hyphenated name for the code's domain (e.g. `string-utils`, `file-io`, `powershell`, `date-time`). Reuse an existing category folder when one fits. Name the post file after what the code does (e.g. `slugify-text.md`), not after the project.

### OS handling

- **Detect, don't assume.** Read the host OS from the environment before building any path. Drive letters and backslashes are Windows only; a leading `/` is macOS and Linux only.
- **Separators follow the host.** Use `\` on Windows and `/` on macOS and Linux, in every path this instruction writes or reports.
- **Home directories differ.** `C:\Users\<user>\` on Windows, `/Users/<user>/` on macOS, `/home/<user>/` on Linux. Prefer the environment variable (`%USERPROFILE%` or `$HOME`) over a literal home path.
- **Case sensitivity differs.** macOS is usually case-insensitive and Linux is case-sensitive. Keep category folders and file names lowercase and hyphenated so the same name resolves on every OS.
- **Line endings.** Write post files with the host's convention, or with `LF` when the target is a site repository that normalizes line endings.
- **Paths inside the post follow the post, not the host.** When a code sample shows a path, use the form matching the OS that sample targets. A batch or PowerShell sample shows Windows paths; a shell sample shows POSIX paths; a cross-platform sample shows both or an abstract token such as `<config-dir>`.

## Security and content rules

These rules are absolute and apply to everything that goes into a post.

1. **Never include credentials or secure data.** This covers API keys, tokens, passwords, secrets, connection strings, private URLs, internal hostnames or IPs, account IDs, environment variable values, file paths revealing user or machine names, and any personal information. If the code needs one of these, replace it with an obvious placeholder such as `YOUR_API_KEY` or `https://api.example.com`.
2. **Use cliche sample data only.** Examples: `"Hello, World!"`, `John Doe`, `Jane Smith`, `user@example.com`, `foo` / `bar` / `baz`, `123 Main St`, `Lorem ipsum`, `42`, `widgets`, `Acme Corp`.
3. **Never use prompt data.** Do not copy, paraphrase, or recycle anything from the conversation, the user's request, or the repository's real data into the post. No real names, project names, business terms, file names, or values from the working context.
4. **Rewrite, don't copy.** Generalize the code into a clean demonstration: rename project-specific identifiers to generic ones, strip unrelated logic, and remove internal dependencies.

## Building the post

The post explains **one specific purpose** of the code, framed as an informational walkthrough of how to use it. Include:

- A title naming the problem the code solves.
- A short opening stating what the code does and the single use case covered.
- The generalized function, method, or tool in one code block.
- A minimal usage example with cliche data and the expected output.
- A closing note on limits or edge cases, when there is something worth saying.

Keep it to one post file with one code sample. A walkthrough that needs several files is not a fit for this instruction.

### Post file layout

```
---
title: <Post title>
description: <One sentence stating what the post demonstrates>
slug: <lowercase-hyphenated-slug>
category: <category>
tags: <tag>, <tag>, <tag>
date: <YYYY-MM-DD>
---
<post body in Markdown>
```

The description is one sentence, written with no project or prompt details. It doubles as the meta description, so keep it between 140 and 160 characters and lead with what the reader gets.

When the workspace is a blog or site, its own front matter fields win over this layout. Map these values onto the fields that site already uses and drop any it does not read.

## SEO optimization

Optimize the post for the way readers actually search for the problem it solves. How far to take that depends on where the post lands, so settle the destination first (see **Deciding where the post belongs**), then apply the matching level.

### Level, relative to workspace context

- **full** - the post is going into a published blog or site (the `<blogSite>` form, or a workspace that builds to a public URL). Apply every rule below.
- **light** - the post is going only to the post store. There is no public URL yet, so apply title, description, slug, and tags, and skip internal linking and structured data. The post stays portable if it is published later.
- **venue** - the post is going to a pseudo-blog venue such as a gist. Apply title, description, slug, and opening paragraph at full strength, and skip the rest. See **SEO for pseudo-blog venues**.
- **internal** - the post is going into a documentation set. Optimize for the reader searching the repository, not for a search engine: plain descriptive headings, terms that match the code's own identifiers, and a title that reads well in a file listing. Skip keyword phrasing that would look out of place in docs.

With **seo-optimization** set to `auto`, pick the level from that list. With it pinned, use the pinned level.

### Keywords come from the technology, not the project

The **Security and content rules** still hold. Derive search terms from the generalized subject of the post: the language, runtime, library, and task the code performs. Never use a project, client, organization, repository, or internal product name as a keyword, tag, or slug, even when the workspace is full of them.

Read the workspace for the technical vocabulary, not the proprietary vocabulary:

- The language and runtime in use (e.g. `powershell`, `node`, `python`).
- The problem domain the code sits in (e.g. `file-io`, `date-time`, `string-utils`), which is usually the `<category>` already chosen.
- The terms the code's own API uses, where they are standard rather than invented for this project.

Choose one primary search phrase and at most two secondary phrases. Write the phrase a reader would type, not the phrase the codebase uses internally.

### Title

- Lead with the primary phrase. A reader scanning results should see the problem in the first three or four words.
- Keep it under 60 characters so it is not truncated in results.
- State the task, not the cleverness. `Slugify Text in PowerShell` beats `A Neat Trick for Tidy URLs`.
- One `H1` per post, and it matches the title.

### Slug

- Lowercase, hyphenated, three to six words, derived from the primary phrase.
- No dates, no numbering, no stop words that carry no search weight.
- Match the slug to the semantic part of the file name (`slugify-text.md` uses `slugify-text`). Keep platform-required filename prefixes, such as Jekyll's date, out of the slug unless the site's own convention requires them.
- When the workspace is a site with an established slug convention, follow the site.

### Headings and body

- Put the primary phrase in the first 100 words, once, in a sentence that would read the same without it.
- Use `H2` headings phrased the way readers search: what the code does, how to use it, what it returns, when not to use it.
- Use natural variants rather than repeating one phrase. Repetition past a couple of natural uses reads as padding and works against the post.
- Tag every code block with its language so it renders correctly and can be picked up as a code result.
- Give any image real alt text describing what it shows. Skip decorative images entirely.

### Tags and taxonomy

- When the workspace is a blog or site, reuse tags that site already uses. A new tag with one post behind it helps no one.
- Otherwise derive two to four tags from the category and the language.
- Keep tags lowercase and hyphenated, matching the `<category>` convention.

### Linking

- **Internal**: at `full` level, link to one or two existing posts in the same category when a genuine connection exists. No link is better than a forced one.
- **External**: link to the official documentation for any language feature or library the sample depends on. Do not link to private, internal, or authenticated URLs.
- Write descriptive link text. Never `click here`.

### Structured data

At `full` level, if the site already emits article metadata (JSON-LD, OpenGraph, or equivalent), fill the fields it expects from the front matter values rather than adding a separate block. Do not introduce a structured data mechanism the site does not already have.

## Confirmation gates

Never write a post file and never publish one without confirming with the user first. Two gates apply, in order.

### Gate 1 - before writing

Do not create or modify any file until the user confirms. Present, in a few lines:

- The code being written up and the single purpose the post covers.
- Whether this creates a new doc file in the workspace, and the exact path the post will be written to.
- When the destination came from a generator's configuration, the config file that was read and the folder it resolved to.
- The category and file name.
- The working title, the slug, and the SEO level in effect.
- The delivery mode, and the destination as it resolved. In `staged` mode, report both the staging path to be written and the final venue the file is shaped for.

Wait for confirmation. On a decline, stop and write nothing.

In `paste` mode there is no file to guard, so this gate does not need its own round trip. State the subject, the destination shape, and the mode in the same reply that carries the post, so a wrong reading is still visible before the user acts on it.

### Gate 2 - before posting

After Gate 1 confirmation, draft the post without writing it to disk, show the full content, and get approval before any file is written, published, committed, or pushed.

- If **automation-mode** is `true`: show the full post content, then ask a direct yes or no for posting. Take no publishing action on silence or on anything short of an explicit yes.
- If **automation-mode** is `false`: show the full post content and ask for approval, inviting edits. Apply any requested changes, show the revised post, and ask again. Publish only on approval.

Both modes reach the same guarantee: nothing is written without confirmation, and nothing is posted without approval.

In `paste` mode the rendered block is this gate. Present it, invite edits, and revise on request. The user does the posting, so approval governs their action rather than any action taken here.

In `staged` mode, this gate closes when the user approves the full draft. Then write the staged file and provide the hand-off summary; do not treat approval as permission to post on the user's behalf.

## Publishing

Publishing is a file operation. Do not call an external upload or CLI publishing tool from this instruction.

After Gate 2 approval:

1. Write the post file to the path agreed at Gate 1.
2. When the workspace is a blog or site, place the file where that site expects posts and in its front matter format, so the site's own build picks it up. Clear the draft flag at this point if the platform has one.
3. When the destination is a pseudo-blog venue, write the venue-shaped copy as described in **Publishing to a pseudo-blog venue**, and report the venue description and file name to use.
4. When the post is archived to the post store as well, write the same content there under the chosen category.
5. Report the path or paths written.

Committing or pushing the post is a separate action and needs its own request from the user, as is uploading it to a pseudo-blog venue.

## Linking in documentation

Before Gate 1, decide whether to add a link to the post from the repository's documentation. Include the exact documentation file and proposed link in Gate 1, and modify it only after Gate 2 approval.

Add the link when:

- The repository already documents the code (README, a `docs/` folder, or a doc comment on the function), **and**
- The post gives readers a useful standalone walkthrough.

Do not add the link when:

- No documentation exists for that code. Do not create a new docs file just to hold the link.
- The code is internal or private-only and is not meant for outside use.

When adding it, place it next to the existing documentation for that code, in one line such as `Walkthrough: <post URL or path>`.

## Completion

Only if the post was approved and delivered successfully, end the response with exactly:

```
BLOG POST MADE
```

Delivered means the file was written in `direct` mode, the file and hand-off summary were given in `staged` mode, or the post was rendered in `paste` mode.

If the user declines at either gate, say so in one sentence and do not print that line. If writing fails, report the failure in one sentence and do not print that line.
