# Blog Platforms

Use this reference when the destination is a blog or site repository. Identify the generator before writing anything. Each one has its own posts folder, file naming rule, and front matter contract, and a post that ignores the contract either fails the build or never appears.

## Detecting the generator

Look in the current workspace only.

The **Default posts folder** column records each generator's convention, not a guarantee. Every one of these projects can move that folder, and several declare it in code rather than in a settings file. Read the column as where to look first, and the project's own configuration as the answer.

| Platform | Detect by | Default posts folder | Contract to honor |
| --- | --- | --- | --- |
| Jekyll | `_config.yml`, `Gemfile` with `jekyll` | `_posts/` | File name must follow `YYYY-MM-DD-slug.<markup-extension>` (for example, `.md` or `.markdown`). Use YAML front matter matching the site's existing posts. A `source` or `collections_dir` setting in `_config.yml` moves the folder. |
| Hugo | `hugo.toml`, `hugo.yaml`, `hugo.json`, `config.toml`, or a `config/` directory | `content/posts/` | TOML or YAML front matter matching the theme. `draft: true` keeps it out of the build. `contentDir` moves the content root, and the section folder is whichever one the theme lists. |
| Astro | `astro.config.*` | Whatever the content collection declares, commonly `src/content/blog/` | Read the collection config: `src/content.config.*` on Astro 5, `src/content/config.*` on Astro 4. A collection's `loader` chooses the directory, so `glob({ base: './src/data/blog' })` puts posts there and not under `src/content/`. Front matter must satisfy that collection's `schema`, and a required field left out fails the build. |
| Eleventy | `.eleventy.js`, `eleventy.config.*` | `posts/`, or the folder named in the config | Front matter plus the directory data file. A `tags` value adds the post to a collection, which is usually what the feed and index read. |
| Next.js | `next.config.*` with an MDX or content pipeline | `content/`, `posts/`, `app/blog/`, or wherever the pipeline reads from | MDX rules apply: components must be imported or provided, and a raw `<` or `{` in prose breaks the parse. |
| Gatsby | `gatsby-config.*` | `content/blog/` | Front matter fields must exist in the GraphQL schema the templates query. The `path` given to `gatsby-source-filesystem` is the folder actually sourced. |
| Docusaurus | `docusaurus.config.*` | `blog/` | Date from the file name prefix or a `date` field. `<!-- truncate -->` marks where the excerpt ends in `.md`, and `{/* truncate */}` in `.mdx`. The blog plugin's `path` option moves the folder. |
| Hexo | `_config.yml` plus `hexo` in `package.json` | `source/_posts/` | YAML front matter. `<!-- more -->` marks the excerpt break. `source_dir` in `_config.yml` moves the source root. |
| Zola | `config.toml` with `base_url` | `content/` | TOML front matter fenced by `+++`, not `---`. The post belongs to a section, which is a subfolder of `content/` carrying its own `_index.md`. |
| VitePress | `.vitepress/` | The folder the theme configures | Front matter plus whatever index page lists the posts. |

A site found only in a subfolder of an application repository, such as a project website, belongs to that project and is not necessarily the author's blog. Offer it at the plan check instead of assuming it.

## Rules for every generator

- **Match a config file by its basename, not by one extension.** Every entry written with `.*` stands for a family, and a project may spell it `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, or `.cts`. Glob the basename before concluding a generator is absent, because detecting only one spelling misreads a real blog as a plain repository.
- **The project's configuration outranks the table.** Open the generator's config before choosing a path. Where a project declares its content in code (an Astro `loader`, an Eleventy directory setting, a Gatsby filesystem source, a Docusaurus plugin `path`), that declaration is both the destination and the schema.
- **Resolve a partial name through the config.** "Put it in the blog" fixes which project receives the post and leaves the folder open. Settle the folder from the generator's configuration, then echo the full path at the plan check.
- **Read a neighbor first.** Open an existing post in the resolved folder and copy its field set exactly. The live posts are more reliable than any general rule here, and they double as voice samples when written by the same author.
- **Settle a disagreement before writing.** When the config and the existing posts point at different folders, ask which one is current. When the config names a folder that holds no posts yet, the config wins.
- **Satisfy the schema, then stop.** Match the schema the config actually declares, and do not invent front matter fields the site does not read.
- **Drafts on request.** Approval is the gate, so write the post ready to publish. When the user asks for a draft, use the platform's own mechanism: Hugo's `draft: true`, Jekyll's `published: false` or its `_drafts` folder, or the flag the site's schema declares. Do not add a flag the platform ignores.
- **Respect the file naming rule.** A date-prefixed name is required on some platforms and wrong on others.
- **Reuse the site's taxonomy.** Take tags and categories from the ones the site already uses.
- **Follow the repository's line endings.** Match its `.gitattributes` or its existing posts.

The same rules apply when the user sends the post to a documentation set: match a neighboring doc's front matter and naming, and do not create a new documentation area to hold it.
