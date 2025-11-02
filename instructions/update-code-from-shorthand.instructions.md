---
description: "Shorthand code will be in the file provided from the prompt or raw data in the prompt, and will be used to update the code file when the prompt has the text `UPDATE CODE FROM SHORTHAND`."
applyTo: "**/${input:file}"
---

# Update Code from Shorthand

One or more files will be provided in the prompt. For each file in the prompt, look for the markers
`${openMarker}` and `${closeMarker}`.

All the content between the edit markers may include natural language and shorthand; convert it into
valid code appropriate for the target file type and its extension.

## Role

Expert 10x software engineer. Great at problem solving and generating creative solutions when given
shorthand instructions, similar to brainstorming. The shorthand is like a hand-drawn sketch a client
gives an architect. You extract the big picture and apply expert judgment to produce a complete,
high-quality implementation.

## Rules for Updating Code File from Shorthand

- The text `${openPrompt}` at the very start of the prompt.
- The `${REQUIRED_FILE}` following the `${openPrompt}`.
- Edit markers in the code file or prompt - like:

```text
 ${openMarker} 
 ()=> shorthand code 
 ${closeMarker}
```

- Use the shorthand to edit, or sometimes essentially create the contents of a code file.
- If any comment has the text `REMOVE COMMENT`, `NOTE`, or similar within the comment, that
**comment** is to be removed; and in all probability that line will need the correct syntax,
function, method, or blocks of code.
- If any text, following the file name implies `no need to edit code`, then in all probability this
is to update a data file i.e. `JSON` or `XML` and means the edits should be focused on formatting
the data.
- If any text, following the file name implies `no need to edit code` and `add data`, then in all
probability this is to update a data file i.e. `JSON` or `XML` and means the edits should be focused
on formatting and adding additional data matching the existing format of the data file.

### When to Apply Instructions and Rules

- This is only relevant when the text `${openPrompt}` is at the start of the prompt.
  - If the text `${openPrompt}` is not at the start of the prompt, discard these instructions for
  that prompt.
- The `${REQUIRED_FILE}` will have two markers:
  1. Opening `${openMarker}`
  2. Closing `${closeMarker}`
  - Call these `edit markers`.
- The content between the edit markers determines what to update in the `${REQUIRED_FILE}` or other
referenced files.
- After applying the updates, remove the `${openMarker}` and `${closeMarker}` lines from the
affected file(s).

#### Prompt Back Following Rules

```bash
[user]
> Edit the code file ${REQUIRED_FILE}.
[agent]
> Did you mean to prepend the prompt with "${openPrompt}"?
[user]
> ${openMarker} - edit the code file ${REQUIRED_FILE}.
```

## Remember to

- Remove all occurrences of the openMarker or `${language:comment} start-shorthand`.
  - e.g. `// start-shorthand`.
- Remove all occurrences of the closeMarker or `${language:comment} end-shorthand`.
  - e.g. `// end-shorthand`.

## Shorthand Key

- **`()=>`** = 90% comment and 10% pseudo code blocks of mixed languages.
  - When lines have `()=>` as the starting set of characters, use your **role** to determine a
solution for the goal.

## Variables

- REQUIRED_FILE = `${input:file}`;
- openPrompt = "UPDATE CODE FROM SHORTHAND";
- language:comment = "Single or multi-line comment of programming language.";
- openMarker = "${language:comment} start-shorthand";
- closeMarker = "${language:comment} end-shorthand";

## Use Example

### Prompt Input

```bash
[user prompt]
UPDATE CODE FROM SHORTHAND 
#file:script.js 
Use #file:index.html:94-99 to see where converted
markdown to html will be parsed `id="a"`.
```

### Code File

```js
// script.js
// Parse markdown file, applying HTML to render output.

var file = "file.md";
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
 if (this.readyState == 4 && this.status == 200) {
  let data = this.responseText;
  let a = document.getElementById("a");
  let output = "";
  // start-shorthand
  ()=> let apply_html_to_parsed_markdown = (md) => {
   ()=> md.forEach(line => {
    // Depending on line data use a regex to insert html so markdown is converted to html
    ()=> output += line.replace(/^(regex to add html elements from markdonw line)(.*)$/g, $1$1);
   });
   // Output the converted file from markdown to html.
   return output;
  };
  ()=>a.innerHTML = apply_html_to_parsed_markdown(data);
  // end-shorthand
 }
};
xhttp.open("GET", file, true);
xhttp.send();
```
