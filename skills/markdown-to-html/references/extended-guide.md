# Markdown to HTML Conversion: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Working with [`markedJS/marked`](../references/marked.md)

### Prerequisites

- Node.js installed (for CLI or programmatic usage)
- Install marked globally for CLI: `npm install -g marked`
- Or install locally: `npm install marked`

### Quick Conversion Methods

See [marked.md](../references/marked.md) **Quick Conversion Methods**

### Step-by-Step Workflows

See [marked.md](../references/marked.md) **Step-by-Step Workflows**

### CLI Configuration

### Using Config Files

Create `~/.marked.json` for persistent options:

```json
{
  "gfm": true,
  "breaks": true
}
```

Or use a custom config:

```bash
marked -i input.md -o output.html -c config.json
```

### CLI Options Reference

| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input Markdown file |
| `-o, --output <file>` | Output HTML file |
| `-s, --string <string>` | Parse string instead of file |
| `-c, --config <file>` | Use custom config file |
| `--gfm` | Enable GitHub Flavored Markdown |
| `--breaks` | Convert newlines to `<br>` |
| `--help` | Show all options |

### Security Warning

⚠️ **Marked does NOT sanitize output HTML.** For untrusted input, use a sanitizer:

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const unsafeHtml = marked.parse(untrustedMarkdown);
const safeHtml = DOMPurify.sanitize(unsafeHtml);
```

Recommended sanitizers:

- [DOMPurify](https://github.com/cure53/DOMPurify) (recommended)
- [sanitize-html](https://github.com/apostrophecms/sanitize-html)
- [js-xss](https://github.com/leizongmin/js-xss)

### Supported Markdown Flavors

| Flavor | Support |
|--------|---------|
| Original Markdown | 100% |
| CommonMark 0.31 | 98% |
| GitHub Flavored Markdown | 97% |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Special characters at file start | Strip zero-width chars: `content.replace(/^[\u200B\u200C\u200D\uFEFF]/,"")` |
| Code blocks not highlighting | Add a syntax highlighter like highlight.js |
| Tables not rendering | Ensure `gfm: true` option is set |
| Line breaks ignored | Set `breaks: true` in options |
| XSS vulnerability concerns | Use DOMPurify to sanitize output |

## Working with [`pandoc`](../references/pandoc.md)

### Prerequisites

- Pandoc installed (download from <https://pandoc.org/installing.html>)
- For PDF output: LaTeX installation (MacTeX on macOS, MiKTeX on Windows, texlive on Linux)
- Terminal/command prompt access

### Quick Conversion Methods

#### Method 1: CLI Basic Conversion

```bash
# Convert markdown to HTML
pandoc input.md -o output.html

# Convert with standalone document (includes header/footer)
pandoc input.md -s -o output.html

# Explicit format specification
pandoc input.md -f markdown -t html -s -o output.html
```

#### Method 2: Filter Mode (Interactive)

```bash
# Start pandoc as a filter
pandoc

# Type markdown, then Ctrl-D (Linux/macOS) or Ctrl-Z+Enter (Windows)
Hello *pandoc*!
# Output: <p>Hello <em>pandoc</em>!</p>
```

#### Method 3: Format Conversion

```bash
# HTML to Markdown
pandoc -f html -t markdown input.html -o output.md

# Markdown to LaTeX
pandoc input.md -s -o output.tex

# Markdown to PDF (requires LaTeX)
pandoc input.md -s -o output.pdf

# Markdown to Word
pandoc input.md -s -o output.docx
```

### CLI Configuration

| Option | Description |
|--------|-------------|
| `-f, --from <format>` | Input format (markdown, html, latex, etc.) |
| `-t, --to <format>` | Output format (html, latex, pdf, docx, etc.) |
| `-s, --standalone` | Produce standalone document with header/footer |
| `-o, --output <file>` | Output file (inferred from extension) |
| `--mathml` | Convert TeX math to MathML |
| `--metadata title="Title"` | Set document metadata |
| `--toc` | Include table of contents |
| `--template <file>` | Use custom template |
| `--help` | Show all options |

### Security Warning

⚠️ **Pandoc processes input faithfully.** When converting untrusted markdown:

- Use `--sandbox` mode to disable external file access
- Validate input before processing
- Sanitize HTML output if displayed in browsers

```bash
# Run in sandbox mode for untrusted input
pandoc --sandbox input.md -o output.html
```

### Supported Markdown Flavors

| Flavor | Support |
|--------|---------|
| Pandoc Markdown | 100% (native) |
| CommonMark | Full (use `-f commonmark`) |
| GitHub Flavored Markdown | Full (use `-f gfm`) |
| MultiMarkdown | Partial |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| PDF generation fails | Install LaTeX (MacTeX, MiKTeX, or texlive) |
| Encoding issues on Windows | Run `chcp 65001` before using pandoc |
| Missing standalone headers | Add `-s` flag for complete documents |
| Math not rendering | Use `--mathml` or `--mathjax` option |
| Tables not rendering | Ensure proper table syntax with pipes and dashes |

## Working with [`gomarkdown/markdown`](../references/gomarkdown.md)

### Prerequisites

- Go 1.18 or higher installed
- Install the library: `go get github.com/gomarkdown/markdown`
- For CLI tool: `go install github.com/gomarkdown/mdtohtml@latest`

### Quick Conversion Methods

#### Method 1: Simple Conversion (Go)

```go
package main

import (
    "fmt"
    "github.com/gomarkdown/markdown"
)

func main() {
    md := []byte("# Hello World\n\nThis is **bold** text.")
    html := markdown.ToHTML(md, nil, nil)
    fmt.Println(string(html))
}
```

#### Method 2: CLI Tool

```bash
# Install mdtohtml
go install github.com/gomarkdown/mdtohtml@latest

# Convert file
mdtohtml input.md output.html

# Convert file (output to stdout)
mdtohtml input.md
```

#### Method 3: Custom Parser and Renderer

```go
package main

import (
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/html"
    "github.com/gomarkdown/markdown/parser"
)

func mdToHTML(md []byte) []byte {
    // Create parser with extensions
    extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.NoEmptyLineBeforeBlock
    p := parser.NewWithExtensions(extensions)
    doc := p.Parse(md)

    // Create HTML renderer with extensions
    htmlFlags := html.CommonFlags | html.HrefTargetBlank
    opts := html.RendererOptions{Flags: htmlFlags}
    renderer := html.NewRenderer(opts)

    return markdown.Render(doc, renderer)
}
```

### CLI Configuration

The `mdtohtml` CLI tool has minimal options:

```bash
mdtohtml input-file [output-file]
```

For advanced configuration, use the Go library programmatically with parser and renderer options:

| Parser Extension | Description |
|------------------|-------------|
| `parser.CommonExtensions` | Tables, fenced code, autolinks, strikethrough, etc. |
| `parser.AutoHeadingIDs` | Generate IDs for headings |
| `parser.NoEmptyLineBeforeBlock` | No blank line needed before blocks |
| `parser.MathJax` | MathJax support for LaTeX math |

| HTML Flag | Description |
|-----------|-------------|
| `html.CommonFlags` | Common HTML output flags |
| `html.HrefTargetBlank` | Add `target="_blank"` to links |
| `html.CompletePage` | Generate complete HTML page |
| `html.UseXHTML` | Generate XHTML output |

### Security Warning

⚠️ **gomarkdown does NOT sanitize output HTML.** For untrusted input, use Bluemonday:

```go
import (
    "github.com/microcosm-cc/bluemonday"
    "github.com/gomarkdown/markdown"
)

maybeUnsafeHTML := markdown.ToHTML(md, nil, nil)
html := bluemonday.UGCPolicy().SanitizeBytes(maybeUnsafeHTML)
```

Recommended sanitizer: [Bluemonday](https://github.com/microcosm-cc/bluemonday)

### Supported Markdown Flavors

| Flavor | Support |
|--------|---------|
| Original Markdown | 100% |
| CommonMark | High (with extensions) |
| GitHub Flavored Markdown | High (tables, fenced code, strikethrough) |
| MathJax/LaTeX Math | Supported via extension |
| Mmark | Supported |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Windows/Mac newlines not parsed | Use `parser.NormalizeNewlines(input)` |
| Tables not rendering | Enable `parser.Tables` extension |
| Code blocks without highlighting | Integrate with syntax highlighter like Chroma |
| Math not rendering | Enable `parser.MathJax` extension |
| XSS vulnerabilities | Use Bluemonday to sanitize output |

## Working with [`hugo`](../references/hugo.md)

### Prerequisites

- Hugo installed (download from <https://gohugo.io/installation/>)
- Git (recommended for themes and modules)
- Go (optional, for Hugo Modules)

### Quick Conversion Methods

#### Method 1: Create New Site

```bash
# Create a new Hugo site
hugo new site mysite

# Change to site directory
cd mysite

# Add a theme
git init
git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke themes/ananke
echo "theme = 'ananke'" >> hugo.toml

# Create content
hugo new content posts/my-first-post.md

# Start development server
hugo server -D
```

#### Method 2: Build Static Site

```bash
# Build site to public directory
hugo

# Build with minification
hugo --minify

# Build for specific environment
hugo --environment production
```

#### Method 3: Development Server

```bash
# Start server with drafts
hugo server -D

# Start with live reload and bind to all interfaces
hugo server --bind 0.0.0.0 --baseURL http://localhost:1313/

# Start with specific port
hugo server --port 8080
```

### CLI Configuration

| Command | Description |
|---------|-------------|
| `hugo new site <name>` | Create new Hugo site |
| `hugo new content <path>` | Create new content file |
| `hugo` | Build site to `public` directory |
| `hugo server` | Start development server |
| `hugo mod init` | Initialize Hugo Modules |

| Build Options | Description |
|---------------|-------------|
| `-D, --buildDrafts` | Include draft content |
| `-E, --buildExpired` | Include expired content |
| `-F, --buildFuture` | Include future-dated content |
| `--minify` | Minify output |
| `--gc` | Run garbage collection after build |
| `-d, --destination <path>` | Output directory |

| Server Options | Description |
|----------------|-------------|
| `--bind <ip>` | Interface to bind to |
| `-p, --port <port>` | Port number (default: 1313) |
| `--liveReloadPort <port>` | Live reload port |
| `--disableLiveReload` | Disable live reload |
| `--navigateToChanged` | Navigate to changed content |

### Security Warning

⚠️ **Hugo security considerations:**

- Configure security policy in `hugo.toml` for external commands
- Use `--enableGitInfo` carefully with public repositories
- Validate shortcode parameters for user-generated content

```toml
# hugo.toml security settings
[security]
  enableInlineShortcodes = false
  [security.exec]
    allow = ['^go$', '^npx$', '^postcss$']
  [security.funcs]
    getenv = ['^HUGO_', '^CI$']
  [security.http]
    methods = ['(?i)GET|POST']
    urls = ['.*']
```

### Supported Markdown Flavors

| Flavor | Support |
|--------|---------|
| Goldmark (default) | 100% (CommonMark compliant) |
| GitHub Flavored Markdown | Full (tables, strikethrough, autolinks) |
| CommonMark | 100% |
| Blackfriday (legacy) | Deprecated, not recommended |

Configure markdown in `hugo.toml`:

```toml
[markup]
  [markup.goldmark]
    [markup.goldmark.extensions]
      definitionList = true
      footnote = true
      linkify = true
      strikethrough = true
      table = true
      taskList = true
    [markup.goldmark.renderer]
      unsafe = false  # Set true to allow raw HTML
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Page not found" on paths | Check `baseURL` in config |
| Theme not loading | Verify theme in `themes/` or Hugo Modules |
| Slow builds | Use `--templateMetrics` to identify bottlenecks |
| Raw HTML not rendering | Set `unsafe = true` in goldmark config |
| Images not loading | Check `static/` folder structure |
| Module errors | Run `hugo mod tidy` |
