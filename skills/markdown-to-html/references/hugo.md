# Hugo Reference

Hugo is the world's fastest static site generator. It builds sites in milliseconds and supports advanced content management features.

## Installation

### Windows

```powershell
# Using Chocolatey
choco install hugo-extended

# Using Scoop
scoop install hugo-extended

# Using Winget
winget install Hugo.Hugo.Extended
```

### macOS

```bash
# Using Homebrew
brew install hugo
```

### Linux

```bash
# Debian/Ubuntu (snap)
snap install hugo --channel=extended

# Using package manager (may not be latest)
sudo apt-get install hugo

# Or download from https://gohugo.io/installation/
```

## Quick Start

### Create New Site

```bash
# Create site
hugo new site mysite
cd mysite

# Initialize git and add theme
git init
git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke themes/ananke
echo "theme = 'ananke'" >> hugo.toml

# Create first post
hugo new content posts/my-first-post.md

# Start development server
hugo server -D
```

### Directory Structure

```
mysite/
├── archetypes/      # Content templates
│   └── default.md
├── assets/          # Assets to process (SCSS, JS)
├── content/         # Markdown content
│   └── posts/
├── data/            # Data files (YAML, JSON, TOML)
├── i18n/            # Internationalization
├── layouts/         # Templates
│   ├── _default/
│   ├── partials/
│   └── shortcodes/
├── static/          # Static files (copied as-is)
├── themes/          # Themes
└── hugo.toml        # Configuration
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `hugo new site <name>` | Create new site |
| `hugo new content <path>` | Create content file |
| `hugo` | Build to `public/` |
| `hugo server` | Start dev server |
| `hugo mod init` | Initialize Hugo Modules |
| `hugo mod tidy` | Clean up modules |

### Build Options

```bash
# Basic build
hugo

# Build with minification
hugo --minify

# Build with drafts
hugo -D

# Build for specific environment
hugo --environment production

# Build to custom directory
hugo -d ./dist

# Verbose output
hugo -v
```

### Server Options

```bash
# Start with drafts
hugo server -D

# Bind to all interfaces
hugo server --bind 0.0.0.0

# Custom port
hugo server --port 8080

# Disable live reload
hugo server --disableLiveReload

# Navigate to changed content
hugo server --navigateToChanged
```

## Configuration (hugo.toml)

```toml
# Basic settings
baseURL = 'https://example.com/'
languageCode = 'en-us'
title = 'My Hugo Site'
theme = 'ananke'

# Build settings
[build]
  writeStats = true

# Markdown configuration
[markup]
  [markup.goldmark]
    [markup.goldmark.extensions]
      definitionList = true
      footnote = true
      linkify = true
      strikethrough = true
      table = true
      taskList = true
    [markup.goldmark.parser]
      autoHeadingID = true
      autoHeadingIDType = 'github'
    [markup.goldmark.renderer]
      unsafe = false
  [markup.highlight]
    style = 'monokai'
    lineNos = true

# Taxonomies
[taxonomies]
  category = 'categories'
  tag = 'tags'
  author = 'authors'

# Menus
[menus]
  [[menus.main]]
    name = 'Home'
    pageRef = '/'
    weight = 10
  [[menus.main]]
    name = 'Posts'
    pageRef = '/posts'
    weight = 20

# Parameters
[params]
  description = 'My awesome site'
  author = 'John Doe'
```

## Front Matter

Hugo supports TOML, YAML, and JSON front matter:

### TOML (default)

```markdown
+++
title = 'My First Post'
date = 2025-01-28T12:00:00-05:00
draft = false
tags = ['hugo', 'tutorial']
categories = ['blog']
author = 'John Doe'
+++

Content here...
```

### YAML

```markdown
---
title: "My First Post"
date: 2025-01-28T12:00:00-05:00
draft: false
tags: ["hugo", "tutorial"]
---

Content here...
```

## Templates

### Base Template (_default/baseof.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ .Title }} | {{ .Site.Title }}</title>
  {{ partial "head.html" . }}
</head>
<body>
  {{ partial "header.html" . }}
  <main>
    {{ block "main" . }}{{ end }}
  </main>
  {{ partial "footer.html" . }}
</body>
</html>
```

### Single Page (_default/single.html)

```html
{{ define "main" }}
<article>
  <h1>{{ .Title }}</h1>
  <time>{{ .Date.Format "January 2, 2006" }}</time>
  {{ .Content }}
</article>
{{ end }}
```

### List Page (_default/list.html)

```html
{{ define "main" }}
<h1>{{ .Title }}</h1>
{{ range .Pages }}
  <article>
    <h2><a href="{{ .Permalink }}">{{ .Title }}</a></h2>
    <p>{{ .Summary }}</p>
  </article>
{{ end }}
{{ end }}
```

## Shortcodes

### Built-in Shortcodes

```markdown
{{< figure src="/images/photo.jpg" title="My Photo" >}}

{{< youtube dQw4w9WgXcQ >}}

{{< gist user 12345 >}}

{{< highlight go >}}
fmt.Println("Hello")
{{< /highlight >}}
```

### Custom Shortcode (layouts/shortcodes/alert.html)

```html
<div class="alert alert-{{ .Get "type" | default "info" }}">
  {{ .Inner | markdownify }}
</div>
```

Usage:

```markdown
{{< alert type="warning" >}}
**Warning:** This is important!
{{< /alert >}}
```

## Content Organization

### Page Bundles

```
content/
├── posts/
│   └── my-post/           # Page bundle
│       ├── index.md       # Content
│       └── image.jpg      # Resources
└── _index.md              # Section page
```

### Accessing Resources

```html
{{ $image := .Resources.GetMatch "image.jpg" }}
{{ with $image }}
  <img src="{{ .RelPermalink }}" alt="...">
{{ end }}
```

## Hugo Pipes (Asset Processing)

### SCSS Compilation

```html
{{ $styles := resources.Get "scss/main.scss" | toCSS | minify }}
<link rel="stylesheet" href="{{ $styles.RelPermalink }}">
```

### JavaScript Bundling

```html
{{ $js := resources.Get "js/main.js" | js.Build | minify }}
<script src="{{ $js.RelPermalink }}"></script>
```

## Taxonomies

### Configure

```toml
[taxonomies]
  tag = 'tags'
  category = 'categories'
```

### Use in Front Matter

```markdown
+++
tags = ['go', 'hugo']
categories = ['tutorials']
+++
```

### List Taxonomy Terms

```html
{{ range .Site.Taxonomies.tags }}
  <a href="{{ .Page.Permalink }}">{{ .Page.Title }} ({{ .Count }})</a>
{{ end }}
```

## Multilingual Sites

```toml
defaultContentLanguage = 'en'

[languages]
  [languages.en]
    title = 'My Site'
    weight = 1
  [languages.es]
    title = 'Mi Sitio'
    weight = 2
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not found | Check `baseURL` configuration |
| Theme not loading | Verify theme path in config |
| Raw HTML not showing | Set `unsafe = true` in goldmark config |
| Slow builds | Use `--templateMetrics` to debug |
| Module errors | Run `hugo mod tidy` |
| CSS not updating | Clear browser cache or use fingerprinting |

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Hugo Themes](https://themes.gohugo.io/)
- [Hugo Discourse](https://discourse.gohugo.io/)
- [GitHub Repository](https://github.com/gohugoio/hugo)
- [Quick Reference](https://gohugo.io/quick-reference/)
