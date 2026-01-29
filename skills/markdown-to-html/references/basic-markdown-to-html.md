# Basic Markdown to HTML

## Headings

### Markdown

```md
# Basic writing and formatting syntax
```

### Parsed HTML

```html
<h1>Basic writing and formatting syntax</h1>
```

```md
## Headings
```

```html
<h2>Headings</h2>
```

```md
### A third-level heading
```

```html
<h3>A third-level heading</h3>
```

### Markdown

```md
Heading 2
---
```

### Parsed HTML

```html
<h2>Heading 2</h2>
```

---

## Paragraphs

### Markdown

```md
Create sophisticated formatting for your prose and code on GitHub with simple syntax.
```

### Parsed HTML

```html
<p>Create sophisticated formatting for your prose and code on GitHub with simple syntax.</p>
```

---

## Inline Formatting

### Bold

```md
**This is bold text**
```

```html
<strong>This is bold text</strong>
```

---

### Italic

```md
_This text is italicized_
```

```html
<em>This text is italicized</em>
```

---

### Bold + Italic

```md
***All this text is important***
```

```html
<strong><em>All this text is important</em></strong>
```

---

### Strikethrough (GFM)

```md
~~This was mistaken text~~
```

```html
<del>This was mistaken text</del>
```

---

### Subscript / Superscript (raw HTML passthrough)

```md
This is a <sub>subscript</sub> text
```

```html
<p>This is a <sub>subscript</sub> text</p>
```

```md
This is a <sup>superscript</sup> text
```

```html
<p>This is a <sup>superscript</sup> text</p>
```

---

## Blockquotes

### Markdown

```md
> Text that is a quote
```

### Parsed HTML

```html
<blockquote>
  <p>Text that is a quote</p>
</blockquote>
```

---

### GitHub Alert (NOTE)

```md
> [!NOTE]
> Useful information.
```

```html
<blockquote class="markdown-alert markdown-alert-note">
  <p><strong>Note</strong></p>
  <p>Useful information.</p>
</blockquote>
```

> ⚠️ The `markdown-alert-*` classes are GitHub-specific, not standard Markdown.

---

## Inline Code

```md
Use `git status` to list files.
```

```html
<p>Use <code>git status</code> to list files.</p>
```

---

## Code Blocks

### Markdown

````md
```markdown
git status
git add
```
````

### Parsed HTML

```html
<pre><code class="language-markdown">
git status
git add
</code></pre>
```

---

## Tables

### Markdown

```md
| Style | Syntax |
|------|--------|
| Bold | ** ** |
```

### Parsed HTML

```html
<table>
  <thead>
    <tr>
      <th>Style</th>
      <th>Syntax</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Bold</td>
      <td><strong> </strong></td>
    </tr>
  </tbody>
</table>
```

---

## Links

### Markdown

```md
[GitHub Pages](https://pages.github.com/)
```

### Parsed HTML

```html
<a href="https://pages.github.com/">GitHub Pages</a>
```

---

## Images

### Markdown

```md
![Alt text](image.png)
```

### Parsed HTML

```html
<img src="image.png" alt="Alt text">
```

---

## Lists

### Unordered List

```md
- George Washington
- John Adams
```

```html
<ul>
  <li>George Washington</li>
  <li>John Adams</li>
</ul>
```

---

### Ordered List

```md
1. James Madison
2. James Monroe
```

```html
<ol>
  <li>James Madison</li>
  <li>James Monroe</li>
</ol>
```

---

### Nested Lists

```md
1. First item
   - Nested item
```

```html
<ol>
  <li>
    First item
    <ul>
      <li>Nested item</li>
    </ul>
  </li>
</ol>
```

---

## Task Lists (GitHub Flavored Markdown)

```md
- [x] Done
- [ ] Pending
```

```html
<ul>
  <li>
    <input type="checkbox" checked disabled> Done
  </li>
  <li>
    <input type="checkbox" disabled> Pending
  </li>
</ul>
```

---

## Mentions

```md
@github/support
```

```html
<a href="https://github.com/github/support" class="user-mention">@github/support</a>
```

---

## Footnotes

### Markdown

```md
Here is a footnote[^1].

[^1]: My reference.
```

### Parsed HTML

```html
<p>
  Here is a footnote
  <sup id="fnref-1">
    <a href="#fn-1">1</a>
  </sup>.
</p>

<section class="footnotes">
  <ol>
    <li id="fn-1">
      <p>My reference.</p>
    </li>
  </ol>
</section>
```

---

## HTML Comments (Hidden Content)

```md
<!-- This content will not appear -->
```

```html
<!-- This content will not appear -->
```

---

## Escaped Markdown Characters

```md
\*not italic\*
```

```html
<p>*not italic*</p>
```

---

## Emoji

```md
:+1:
```

```html
<img class="emoji" alt="👍" src="...">
```

(GitHub replaces emoji with `<img>` tags.)

---
