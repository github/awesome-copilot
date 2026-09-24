# Delivery

How to shape the post for where it is going. The content is the same everywhere; only the wrapping changes.

## Chat

When no file is written, the reply is the deliverable, so it has to survive one copy with no cleanup.

- **One fenced block.** The post contains its own three-backtick fences, so fence the outer block with four backticks.
- **Nothing interleaved.** Do not split the post across several blocks with commentary between them. Notes go after the block.
- **Front matter only if the target parses it.** For a hosted editor or a venue with no front matter, deliver the shape in **Venues with no front matter** instead.
- **List separate fields separately.** When the target has its own title, description, or tag fields, list those values after the block.
- **No file.** Do not save a copy unless asked. Offer one in a single line.

## Venues with no front matter

A gist, a Discussions post, a wiki page, or a snippet on a hosted git service publishes a standalone, readable page without being a blog: there is no generator, no front matter, and no feed.

- **Never leave a front matter block at the top.** A venue that does not parse it shows the raw `title:` and `description:` lines as body text.
- **The title becomes the first heading**, or the venue's own title field where it has one.
- **The description becomes the opening line** of the body, or the venue's description field.
- **Tags have nowhere to live.** Drop them, or work the one or two that matter into the opening sentence as ordinary words.

### Example: a gist

A gist has two pieces of discoverable text and no front matter at all.

- **Gist description**: carries the post description. It is the line readers see in listings and search results, so it holds the primary search phrase. One sentence, no project details.
- **File name**: carries the slug and sets syntax highlighting. `slugify-text.md` renders as Markdown and keeps the primary phrase in the URL.
- **File body**: an `H1` matching the title, then the walkthrough.

Keep it to one file. A gist with several files reads as a project, not a post.

## Hosted platforms

When the user posts by hand to a hosted blog platform or any account-bound site, only the user can reach the final venue.

- **Shape the post for that platform.** Some accept a front matter block on paste; most do not.
- **Stage a file only at a path the user named.** A venue name, such as a platform, publication, or account, is never a path. Without a named path, deliver in chat.
- **Follow the post with a hand-off summary**: the venue, the file written if any, and the title, description, slug, and tags, with the field each one goes in.
- **Name any manual step that remains**, such as clearing a draft flag, choosing a canonical URL, or picking tags from a fixed list.

## Never

Do not create the gist, open the discussion, edit the wiki, upload, post, commit, or push. Each is a separate action that needs its own request from the user.
