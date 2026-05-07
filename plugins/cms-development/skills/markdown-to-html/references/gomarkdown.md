# gomarkdown/markdown Reference

Go library for parsing Markdown and rendering HTML. Fast, extensible, and thread-safe.

## Installation

```bash
# Add to your Go project
go get github.com/gomarkdown/markdown

# Install CLI tool
go install github.com/gomarkdown/mdtohtml@latest
```

## Basic Usage

### Simple Conversion

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

### Using CLI Tool

```bash
# Convert file to HTML
mdtohtml input.md output.html

# Output to stdout
mdtohtml input.md
```

## Parser Configuration

### Common Extensions

```go
import (
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/parser"
)

// Create parser with extensions
extensions := parser.CommonExtensions | parser.AutoHeadingIDs
p := parser.NewWithExtensions(extensions)

// Parse markdown
doc := p.Parse(md)
```

### Available Parser Extensions

| Extension | Description |
|-----------|-------------|
| `parser.CommonExtensions` | Tables, fenced code, autolinks, strikethrough |
| `parser.Tables` | Pipe tables support |
| `parser.FencedCode` | Fenced code blocks with language |
| `parser.Autolink` | Auto-detect URLs |
| `parser.Strikethrough` | ~~strikethrough~~ text |
| `parser.SpaceHeadings` | Require space after # in headings |
| `parser.HeadingIDs` | Custom heading IDs {#id} |
| `parser.AutoHeadingIDs` | Auto-generate heading IDs |
| `parser.Footnotes` | Footnote support |
| `parser.NoEmptyLineBeforeBlock` | No blank line required before blocks |
| `parser.HardLineBreak` | Newlines become `<br>` |
| `parser.MathJax` | MathJax support |
| `parser.SuperSubscript` | Super^script^ and sub~script~ |
| `parser.Mmark` | Mmark syntax support |

## HTML Renderer Configuration

### Common Flags

```go
import (
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/html"
    "github.com/gomarkdown/markdown/parser"
)

// Parser
p := parser.NewWithExtensions(parser.CommonExtensions)

// Renderer
htmlFlags := html.CommonFlags | html.HrefTargetBlank
opts := html.RendererOptions{
    Flags: htmlFlags,
    Title: "My Document",
    CSS: "style.css",
}
renderer := html.NewRenderer(opts)

// Convert
html := markdown.ToHTML(md, p, renderer)
```

### Available HTML Flags

| Flag | Description |
|------|-------------|
| `html.CommonFlags` | Common sensible defaults |
| `html.HrefTargetBlank` | Add `target="_blank"` to links |
| `html.CompletePage` | Generate complete HTML document |
| `html.UseXHTML` | Use XHTML output |
| `html.FootnoteReturnLinks` | Add return links in footnotes |
| `html.FootnoteNoHRTag` | No `<hr>` before footnotes |
| `html.Smartypants` | Smart punctuation |
| `html.SmartypantsFractions` | Smart fractions (1/2 → ½) |
| `html.SmartypantsDashes` | Smart dashes (-- → –) |
| `html.SmartypantsLatexDashes` | LaTeX-style dashes |

### Renderer Options

```go
opts := html.RendererOptions{
    Flags:          htmlFlags,
    Title:          "Document Title",
    CSS:            "path/to/style.css",
    Icon:           "favicon.ico",
    Head:           []byte("<meta name='author' content='...'>"),
    RenderNodeHook: customRenderHook,
}
```

## Complete Example

```go
package main

import (
    "os"
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/html"
    "github.com/gomarkdown/markdown/parser"
)

func mdToHTML(md []byte) []byte {
    // Parser with extensions
    extensions := parser.CommonExtensions | 
                  parser.AutoHeadingIDs | 
                  parser.NoEmptyLineBeforeBlock
    p := parser.NewWithExtensions(extensions)
    doc := p.Parse(md)

    // HTML renderer with options
    htmlFlags := html.CommonFlags | html.HrefTargetBlank
    opts := html.RendererOptions{Flags: htmlFlags}
    renderer := html.NewRenderer(opts)

    return markdown.Render(doc, renderer)
}

func main() {
    md, _ := os.ReadFile("input.md")
    html := mdToHTML(md)
    os.WriteFile("output.html", html, 0644)
}
```

## Security: Sanitizing Output

**Important:** gomarkdown does not sanitize HTML output. Use Bluemonday for untrusted input:

```go
import (
    "github.com/microcosm-cc/bluemonday"
    "github.com/gomarkdown/markdown"
)

// Convert markdown to potentially unsafe HTML
unsafeHTML := markdown.ToHTML(md, nil, nil)

// Sanitize using Bluemonday
p := bluemonday.UGCPolicy()
safeHTML := p.SanitizeBytes(unsafeHTML)
```

### Bluemonday Policies

| Policy | Description |
|--------|-------------|
| `UGCPolicy()` | User-generated content (most common) |
| `StrictPolicy()` | Strip all HTML |
| `StripTagsPolicy()` | Strip tags, keep text |
| `NewPolicy()` | Build custom policy |

## Working with AST

### Accessing the AST

```go
import (
    "github.com/gomarkdown/markdown/ast"
    "github.com/gomarkdown/markdown/parser"
)

p := parser.NewWithExtensions(parser.CommonExtensions)
doc := p.Parse(md)

// Walk the AST
ast.WalkFunc(doc, func(node ast.Node, entering bool) ast.WalkStatus {
    if heading, ok := node.(*ast.Heading); ok && entering {
        fmt.Printf("Found heading level %d\n", heading.Level)
    }
    return ast.GoToNext
})
```

### Custom Renderer

```go
type MyRenderer struct {
    *html.Renderer
}

func (r *MyRenderer) RenderNode(w io.Writer, node ast.Node, entering bool) ast.WalkStatus {
    // Custom rendering logic
    if heading, ok := node.(*ast.Heading); ok && entering {
        fmt.Fprintf(w, "<h%d class='custom'>", heading.Level)
        return ast.GoToNext
    }
    return r.Renderer.RenderNode(w, node, entering)
}
```

## Handling Newlines

Windows and Mac newlines need normalization:

```go
// Normalize newlines before parsing
normalized := parser.NormalizeNewlines(input)
html := markdown.ToHTML(normalized, nil, nil)
```

## Resources

- [Package Documentation](https://pkg.go.dev/github.com/gomarkdown/markdown)
- [Advanced Processing Guide](https://blog.kowalczyk.info/article/cxn3/advanced-markdown-processing-in-go.html)
- [GitHub Repository](https://github.com/gomarkdown/markdown)
- [CLI Tool](https://github.com/gomarkdown/mdtohtml)
- [Bluemonday Sanitizer](https://github.com/microcosm-cc/bluemonday)
