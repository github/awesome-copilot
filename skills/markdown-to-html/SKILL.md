---
name: markdown-to-html
description: 'Convert Markdown files to HTML similar to `marked.js`, `pandoc`, `gomarkdown/markdown`, or similar tools; or writing custom script to convert markdown to html and/or working on web template systems like `jekyll/jekyll`, `gohugoio/hugo`, or similar web templating systems that utilize markdown documents, converting them to html. Use when asked to "convert markdown to html", "transform md to html", "render markdown", "generate html from markdown", or when working with .md files and/or web a templating system that converts markdown to HTML output. Supports CLI and Node.js workflows with GFM, CommonMark, and standard Markdown flavors.'
---

# Markdown to HTML Conversion

Expert skill for converting Markdown documents to HTML using the marked.js library, or writing data conversion scripts; in this case scripts similar to [markedJS/marked](https://github.com/markedjs/marked) repository. For custom scripts knowledge is not confined to `marked.js`, but data conversion methods are utilized from tools like [pandoc](https://github.com/jgm/pandoc) and [gomarkdown/markdown](https://github.com/gomarkdown/markdown) for data conversion; [jekyll/jekyll](https://github.com/jekyll/jekyll) and [gohugoio/hugo](https://github.com/gohugoio/hugo) for templating systems.

The conversion script or tool should handle single files, batch conversions, and advanced configurations.

## When to Use This Skill

- User asks to "convert markdown to html" or "transform md files"
- User wants to "render markdown" as HTML output
- User needs to generate HTML documentation from .md files
- User is building static sites from Markdown content
- User is building template system that converts markdown to html
- User is working on a tool, widget, or custom template for an existing templating system
- User wants to preview Markdown as rendered HTML

## Converting Markdown to HTML

### Essential Basic Conversions

For more see [basic-markdown-to-html.md](references/basic-markdown-to-html.md)

```text
    ```markdown
    # Level 1
    ## Level 2

    One sentence with a [link](https://example.com), and a HTML snippet like `<p>paragraph tag</p>`.

    - `ul` list item 1
    - `ul` list item 2

    1. `ol` list item 1
    2. `ol` list item 1

    | Table Item | Description |
    | One | One is the spelling of the number `1`. |
    | Two | Two is the spelling of the number `2`. |

    ```js
    var one = 1;
    var two = 2;

    function simpleMath(x, y) {
     return x + y;
    }
    console.log(simpleMath(one, two));
    ```
    ```

    ```html
    <h1>Level 1</h1>
    <h2>Level 2</h2>

    <p>One sentence with a <a href="https://example.com">link</a>, and a HTML snippet like <code>&lt;p&gt;paragraph tag&lt;/p&gt;</code>.</p>

    <ul>
     <li>`ul` list item 1</li>
     <li>`ul` list item 2</li>
    </ul>

    <ol>
     <li>`ol` list item 1</li>
     <li>`ol` list item 2</li>
    </ol>

    <table>
     <thead>
      <tr>
       <th>Table Item</th>
       <th>Description</th>
      </tr>
     </thead>
     <tbody>
      <tr>
       <td>One</td>
       <td>One is the spelling of the number `1`.</td>
      </tr>
      <tr>
       <td>Two</td>
       <td>Two is the spelling of the number `2`.</td>
      </tr>
     </tbody>
    </table>

    <pre>
     <code>var one = 1;
     var two = 2;

     function simpleMath(x, y) {
      return x + y;
     }
     console.log(simpleMath(one, two));</code>
    </pre>
    ```
```

### Code Block Conversions

For more see [code-blocks-to-html.md](references/code-blocks-to-html.md)

```text

    ```markdown
    your code here
    ```

    ```html
    <pre><code class="language-md">
    your code here
    </code></pre>
    ```

    ```js
    console.log("Hello world");
    ```

    ```html
    <pre><code class="language-js">
    console.log("Hello world");
    </code></pre>
    ```

    ```markdown
      ```

      ```
      visible backticks
      ```

      ```
    ```

    ```html
      <pre><code>
      ```

      visible backticks

      ```
      </code></pre>
    ```
```

### Collapsed Section Conversions

For more see [collapsed-sections-to-html.md](references/collapsed-sections-to-html.md)

```text
    ```markdown
    <details>
    <summary>More info</summary>

    ### Header inside

    - Lists
    - **Formatting**
    - Code blocks

        ```js
        console.log("Hello");
        ```

    </details>
    ```

    ```html
    <details>
    <summary>More info</summary>

    <h3>Header inside</h3>

    <ul>
     <li>Lists</li>
     <li><strong>Formatting</strong></li>
     <li>Code blocks</li>
    </ul>

    <pre>
     <code class="language-js">console.log("Hello");</code>
    </pre>

    </details>
    ```
```

### Mathematical Expression Conversions

For more see [writing-mathematical-expressions-to-html.md](references/writing-mathematical-expressions-to-html.md)

```text
    ```markdown
    This sentence uses `$` delimiters to show math inline: $\sqrt{3x-1}+(1+x)^2$
    ```

    ```html
    <p>This sentence uses <code>$</code> delimiters to show math inline:
     <math-renderer><math xmlns="http://www.w3.org/1998/Math/MathML">
      <msqrt><mn>3</mn><mi>x</mi><mo>−</mo><mn>1</mn></msqrt>
      <mo>+</mo><mo>(</mo><mn>1</mn><mo>+</mo><mi>x</mi>
      <msup><mo>)</mo><mn>2</mn></msup>
     </math>
    </math-renderer>
    </p>
    ```

    ```markdown
    **The Cauchy-Schwarz Inequality**\
    $$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$
    ```

    ```html
    <p><strong>The Cauchy-Schwarz Inequality</strong><br>
     <math-renderer>
      <math xmlns="http://www.w3.org/1998/Math/MathML">
       <msup>
        <mrow><mo>(</mo>
         <munderover><mo data-mjx-texclass="OP">∑</mo>
          <mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi>
         </munderover>
         <msub><mi>a</mi><mi>k</mi></msub>
         <msub><mi>b</mi><mi>k</mi></msub>
         <mo>)</mo>
        </mrow>
        <mn>2</mn>
       </msup>
       <mo>≤</mo>
       <mrow><mo>(</mo>
        <munderover><mo>∑</mo>
         <mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow>
         <mi>n</mi>
        </munderover>
        <msubsup><mi>a</mi><mi>k</mi><mn>2</mn></msubsup>
        <mo>)</mo>
       </mrow>
       <mrow><mo>(</mo>
         <munderover><mo>∑</mo>
          <mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow>
          <mi>n</mi>
         </munderover>
         <msubsup><mi>b</mi><mi>k</mi><mn>2</mn></msubsup>
         <mo>)</mo>
       </mrow>
      </math>
     </math-renderer></p>
    ```
```

### Table Conversions

For more see [tables-to-html.md](references/tables-to-html.md)

```text
    ```markdown
    | First Header  | Second Header |
    | ------------- | ------------- |
    | Content Cell  | Content Cell  |
    | Content Cell  | Content Cell  |
    ```

    ```html
    <table>
     <thead><tr><th>First Header</th><th>Second Header</th></tr></thead>
     <tbody>
      <tr><td>Content Cell</td><td>Content Cell</td></tr>
      <tr><td>Content Cell</td><td>Content Cell</td></tr>
     </tbody>
    </table>
    ```

    ```markdown
    | Left-aligned | Center-aligned | Right-aligned |
    | :---         |     :---:      |          ---: |
    | git status   | git status     | git status    |
    | git diff     | git diff       | git diff      |
    ```

    ```html
    <table>
      <thead>
       <tr>
        <th align="left">Left-aligned</th>
        <th align="center">Center-aligned</th>
        <th align="right">Right-aligned</th>
       </tr>
      </thead>
      <tbody>
       <tr>
        <td align="left">git status</td>
        <td align="center">git status</td>
        <td align="right">git status</td>
       </tr>
       <tr>
        <td align="left">git diff</td>
        <td align="center">git diff</td>
        <td align="right">git diff</td>
       </tr>
      </tbody>
    </table>
    ```
```

## Working with [`markedJS/marked`](references/marked.md)

### Prerequisites

- Node.js installed (for CLI or programmatic usage)
- Install marked globally for CLI: `npm install -g marked`
- Or install locally: `npm install marked`

### Quick Conversion Methods

See [marked.md](references/marked.md) **Quick Conversion Methods**

### Step-by-Step Workflows

See [marked.md](references/marked.md) **Step-by-Step Workflows**

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

## Working with [`pandoc`](references/pandoc.md)

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

## Working with [`gomarkdown/markdown`](references/gomarkdown.md)

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

## Working with [`jekyll`](references/jekyll.md)

### Prerequisites

- Ruby version 2.7.0 or higher
- RubyGems
- GCC and Make (for native extensions)
- Install Jekyll and Bundler: `gem install jekyll bundler`

### Quick Conversion Methods

#### Method 1: Create New Site

```bash
# Create a new Jekyll site
jekyll new myblog

# Change to site directory
cd myblog

# Build and serve locally
bundle exec jekyll serve

# Access at http://localhost:4000
```

#### Method 2: Build Static Site

```bash
# Build site to _site directory
bundle exec jekyll build

# Build with production environment
JEKYLL_ENV=production bundle exec jekyll build
```

#### Method 3: Live Reload Development

```bash
# Serve with live reload
bundle exec jekyll serve --livereload

# Serve with drafts
bundle exec jekyll serve --drafts
```

### CLI Configuration

| Command | Description |
|---------|-------------|
| `jekyll new <path>` | Create new Jekyll site |
| `jekyll build` | Build site to `_site` directory |
| `jekyll serve` | Build and serve locally |
| `jekyll clean` | Remove generated files |
| `jekyll doctor` | Check for configuration issues |

| Serve Options | Description |
|---------------|-------------|
| `--livereload` | Reload browser on changes |
| `--drafts` | Include draft posts |
| `--port <port>` | Set server port (default: 4000) |
| `--host <host>` | Set server host (default: localhost) |
| `--baseurl <url>` | Set base URL |

### Security Warning

⚠️ **Jekyll security considerations:**

- Avoid using `safe: false` in production
- Use `exclude` in `_config.yml` to prevent sensitive files from being published
- Sanitize user-generated content if accepting external input
- Keep Jekyll and plugins updated

```yaml
# _config.yml security settings
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
```

### Supported Markdown Flavors

| Flavor | Support |
|--------|---------|
| Kramdown (default) | 100% |
| CommonMark | Via plugin (jekyll-commonmark) |
| GitHub Flavored Markdown | Via plugin (jekyll-commonmark-ghpages) |
| RedCarpet | Via plugin (deprecated) |

Configure markdown processor in `_config.yml`:

```yaml
markdown: kramdown
kramdown:
  input: GFM
  syntax_highlighter: rouge
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Ruby 3.0+ fails to serve | Run `bundle add webrick` |
| Gem dependency errors | Run `bundle install` |
| Slow builds | Use `--incremental` flag |
| Liquid syntax errors | Check for unescaped `{` in content |
| Plugin not loading | Add to `_config.yml` plugins list |

## Working with [`hugo`](references/hugo.md)

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

## References

### Writing and Styling Markdown

- [basic-markdown.md](references/basic-markdown.md)
- [code-blocks.md](references/code-blocks.md)
- [collapsed-sections.md](references/collapsed-sections.md)
- [tables.md](references/tables.md)
- [writing-mathematical-expressions.md](references/writing-mathematical-expressions.md)
- Markdown Guide: <https://www.markdownguide.org/basic-syntax/>
- Styling Markdown: <https://github.com/sindresorhus/github-markdown-css>

### [`markedJS/marked`](references/marked.md)

- Official documentation: <https://marked.js.org/>
- Advanced options: <https://marked.js.org/using_advanced>
- Extensibility: <https://marked.js.org/using_pro>
- GitHub repository: <https://github.com/markedjs/marked>

### [`pandoc`](references/pandoc.md)

- Getting started: <https://pandoc.org/getting-started.html>
- Official documentation: <https://pandoc.org/MANUAL.html>
- Extensibility: <https://pandoc.org/extras.html>
- GitHub repository: <https://github.com/jgm/pandoc>

### [`gomarkdown/markdown`](references/gomarkdown.md)

- Official documentation: <https://pkg.go.dev/github.com/gomarkdown/markdown>
- Advanced configuration: <https://pkg.go.dev/github.com/gomarkdown/markdown@v0.0.0-20250810172220-2e2c11897d1a/html>
- Markdown processing: <https://blog.kowalczyk.info/article/cxn3/advanced-markdown-processing-in-go.html>
- GitHub repository: <https://github.com/gomarkdown/markdown>

### [`jekyll`](references/jekyll.md)

- Official documentation: <https://jekyllrb.com/docs/>
- Configuration options: <https://jekyllrb.com/docs/configuration/options/>
- Plugins: <https://jekyllrb.com/docs/plugins/>
  - [Installation](https://jekyllrb.com/docs/plugins/installation/)
  - [Generators](https://jekyllrb.com/docs/plugins/generators/)
  - [Converters](https://jekyllrb.com/docs/plugins/converters/)
  - [Commands](https://jekyllrb.com/docs/plugins/commands/)
  - [Tags](https://jekyllrb.com/docs/plugins/tags/)
  - [Filters](https://jekyllrb.com/docs/plugins/filters/)
  - [Hooks](https://jekyllrb.com/docs/plugins/hooks/)
- GitHub repository: <https://github.com/jekyll/jekyll>

### [`hugo`](references/hugo.md)

- Official documentation: <https://gohugo.io/documentation/>
- All Settings: <https://gohugo.io/configuration/all/>
- Editor Plugins: <https://gohugo.io/tools/editors/>
- GitHub repository: <https://github.com/gohugoio/hugo>
