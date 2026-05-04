# Jekyll Reference

Jekyll is a static site generator that transforms Markdown content into complete websites. It's blog-aware and powers GitHub Pages.

## Installation

### Prerequisites

- Ruby 2.7.0 or higher
- RubyGems
- GCC and Make

### Install Jekyll

```bash
# Install Jekyll and Bundler
gem install jekyll bundler
```

### Platform-Specific Installation

```bash
# macOS (install Xcode CLI tools first)
xcode-select --install
gem install jekyll bundler

# Ubuntu/Debian
sudo apt-get install ruby-full build-essential zlib1g-dev
gem install jekyll bundler

# Windows (use RubyInstaller)
# Download from https://rubyinstaller.org/
gem install jekyll bundler
```

## Quick Start

### Create New Site

```bash
# Create new Jekyll site
jekyll new myblog

# Navigate to site
cd myblog

# Build and serve
bundle exec jekyll serve

# Open http://localhost:4000
```

### Directory Structure

```
myblog/
├── _config.yml      # Site configuration
├── _posts/          # Blog posts
│   └── 2025-01-28-welcome.md
├── _layouts/        # Page templates
├── _includes/       # Reusable components
├── _data/           # Data files (YAML, JSON, CSV)
├── _sass/           # Sass partials
├── assets/          # CSS, JS, images
├── index.md         # Home page
└── Gemfile          # Ruby dependencies
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `jekyll new <name>` | Create new site |
| `jekyll build` | Build to `_site/` |
| `jekyll serve` | Build and serve locally |
| `jekyll clean` | Remove generated files |
| `jekyll doctor` | Check for issues |

### Build Options

```bash
# Build site
bundle exec jekyll build

# Build with production environment
JEKYLL_ENV=production bundle exec jekyll build

# Build to custom directory
bundle exec jekyll build --destination ./public

# Build with incremental regeneration
bundle exec jekyll build --incremental
```

### Serve Options

```bash
# Serve with live reload
bundle exec jekyll serve --livereload

# Include draft posts
bundle exec jekyll serve --drafts

# Specify port
bundle exec jekyll serve --port 8080

# Bind to all interfaces
bundle exec jekyll serve --host 0.0.0.0
```

## Configuration (_config.yml)

```yaml
# Site settings
title: My Blog
description: A great blog
baseurl: ""
url: "https://example.com"

# Build settings
markdown: kramdown
theme: minima
plugins:
  - jekyll-feed
  - jekyll-seo-tag

# Kramdown settings
kramdown:
  input: GFM
  syntax_highlighter: rouge
  hard_wrap: false

# Collections
collections:
  docs:
    output: true
    permalink: /docs/:name/

# Defaults
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"

# Exclude from processing
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
```

## Front Matter

Every content file needs YAML front matter:

```markdown
---
layout: post
title: "My First Post"
date: 2025-01-28 12:00:00 -0500
categories: blog tutorial
tags: [jekyll, markdown]
author: John Doe
excerpt: "A brief introduction..."
published: true
---

Your content here...
```

## Markdown Processors

### Kramdown (Default)

```yaml
# _config.yml
markdown: kramdown
kramdown:
  input: GFM                    # GitHub Flavored Markdown
  syntax_highlighter: rouge
  syntax_highlighter_opts:
    block:
      line_numbers: true
```

### CommonMark

```ruby
# Gemfile
gem 'jekyll-commonmark-ghpages'
```

```yaml
# _config.yml
markdown: CommonMarkGhPages
commonmark:
  options: ["SMART", "FOOTNOTES"]
  extensions: ["strikethrough", "autolink", "table"]
```

## Liquid Templating

### Variables

```liquid
{{ page.title }}
{{ site.title }}
{{ content }}
{{ page.date | date: "%B %d, %Y" }}
```

### Loops

```liquid
{% for post in site.posts %}
  <article>
    <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
    <p>{{ post.excerpt }}</p>
  </article>
{% endfor %}
```

### Conditionals

```liquid
{% if page.title %}
  <h1>{{ page.title }}</h1>
{% endif %}

{% unless page.draft %}
  {{ content }}
{% endunless %}
```

### Includes

```liquid
{% include header.html %}
{% include footer.html param="value" %}
```

## Layouts

### Basic Layout (_layouts/default.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ page.title }} | {{ site.title }}</title>
  <link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
</head>
<body>
  {% include header.html %}
  <main>
    {{ content }}
  </main>
  {% include footer.html %}
</body>
</html>
```

### Post Layout (_layouts/post.html)

```html
---
layout: default
---
<article>
  <h1>{{ page.title }}</h1>
  <time>{{ page.date | date: "%B %d, %Y" }}</time>
  {{ content }}
</article>
```

## Plugins

### Common Plugins

```ruby
# Gemfile
group :jekyll_plugins do
  gem 'jekyll-feed'        # RSS feed
  gem 'jekyll-seo-tag'     # SEO meta tags
  gem 'jekyll-sitemap'     # XML sitemap
  gem 'jekyll-paginate'    # Pagination
  gem 'jekyll-archives'    # Archive pages
end
```

### Using Plugins

```yaml
# _config.yml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ruby 3.0+ webrick error | `bundle add webrick` |
| Permission denied | Use `--user-install` or rbenv |
| Slow builds | Use `--incremental` |
| Liquid errors | Check for unescaped `{` `}` |
| Encoding issues | Add `encoding: utf-8` to config |
| Plugin not loading | Add to both Gemfile and _config.yml |

## Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Liquid Template Language](https://shopify.github.io/liquid/)
- [Kramdown Documentation](https://kramdown.gettalong.org/)
- [GitHub Repository](https://github.com/jekyll/jekyll)
- [Jekyll Themes](https://jekyllthemes.io/)
