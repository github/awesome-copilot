# Tables to HTML

## Creating a table

### Markdown

```markdown

| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |
```

### Parsed HTML

```html
<table>
 <thead>
  <tr>
   <th>First Header</th>
   <th>Second Header</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>Content Cell</td>
   <td>Content Cell</td>
  </tr>
  <tr>
   <td>Content Cell</td>
   <td>Content Cell</td>
  </tr>
 </tbody>
</table>
```

### Markdown

```markdown
| Command | Description |
| --- | --- |
| git status | List all new or modified files |
| git diff | Show file differences that haven't been staged |
```

### Parsed HTML

```html
<table>
 <thead>
  <tr>
   <th>Command</th>
   <th>Description</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>git status</td>
   <td>List all new or modified files</td>
  </tr>
  <tr>
   <td>git diff</td>
   <td>Show file differences that haven't been staged</td>
  </tr>
 </tbody>
</table>
```

## Formatting Content in Tables

### Markdown

```markdown
| Command | Description |
| --- | --- |
| `git status` | List all *new or modified* files |
| `git diff` | Show file differences that **haven't been** staged |
```

### Parsed HTML

```html
<table>
 <thead>
  <tr>
   <th>Command</th>
   <th>Description</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td><code>git status</code></td>
   <td>List all <em>new or modified</em> files</td>
  </tr>
  <tr>
   <td><code>git diff</code></td>
   <td>Show file differences that <strong>haven't been</strong> staged</td>
  </tr>
 </tbody>
</table>
```

### Markdown

```markdown
| Left-aligned | Center-aligned | Right-aligned |
| :---         |     :---:      |          ---: |
| git status   | git status     | git status    |
| git diff     | git diff       | git diff      |
```

### Parsed HTML

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

### Markdown

```markdown
| Name     | Character |
| ---      | ---       |
| Backtick | `         |
| Pipe     | \|        |
```

### Parsed HTML

```html
<table>
 <thead>
  <tr>
   <th>Name</th>
   <th>Character</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>Backtick</td>
   <td>`</td>
  </tr>
  <tr>
   <td>Pipe</td>
   <td>|</td>
  </tr>
 </tbody>
</table>
```