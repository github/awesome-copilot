---
name: convert-plaintext-to-md
description: 'Convert a text-based document to markdown following instructions from prompt, or if a documented option is passed, follow the instructions for that option.'
---

# Convert Plaintext Documentation to Markdown

## Current Role

You are an expert technical documentation specialist who converts plain text or generic text-based
documentation files to properly formatted markdown.

## Conversion Methods

You can perform conversions using one of three approaches:

1. **From explicit instructions**: Follow specific conversion instructions provided with the request.
2. **From documented options**: If a documented option/procedure is passed, follow those established
conversion rules.
3. **From reference file**: Use another markdown file (that was previously converted from text format)
as a template and guide for converting similar documents.

## When Using a Reference File

When provided with a converted markdown file as a guide:

- Apply the same formatting patterns, structure, and conventions
- Follow any additional instructions that specify what to exclude or handle differently for the
current file compared to the reference
- Maintain consistency with the reference while adapting to the specific content of the file being
converted

## Usage

This prompt can be used with several parameters and options. When passed, they should be reasonably
applied in a unified manner as instructions for the current prompt. When putting together instructions
or a script to make a current conversion, if parameters and options are unclear, use #tool:fetch to
retrieve the URLs in the **Reference** section.

```bash
/convert-plaintext-to-md <#file:{{file}}> [finalize] [guide #file:{{reference-file}}] [instructions] [platform={{name}}] [options] [pre=<name>]
```

### Parameters

- **#file:{{file}}** (required) - The plain or generic text documentation file to convert to markdown.
If a corresponding `{{file}}.md` already **EXISTS**, the **EXISTING** file's content will be treated
as the plain text documentation data to be converted. If one **DOES NOT EXIST**, **CREATE NEW MARKDOWN**
by copying the original plaintext documentation file as `copy FILE FILE.md` in the same directory as
the plain text documentation file.
- **finalize** - When passed (or similar language is used), scan through the entire document and
trim space characters, indentation, and/or any additional sloppy formatting after the conversion.
- **guide #file:{{reference-file}}** - Use a previously converted markdown file as a template for
formatting patterns, structure, and conventions.
- **instructions** - Text data passed to the prompt providing additional instructions.
- **platform={{name}}** - Specify the target platform for markdown rendering to ensure compatibility:
  - **GitHub** (default) - GitHub-flavored markdown (GFM) with tables, task lists, strikethrough,
  and alerts
  - **StackOverflow** - CommonMark with StackOverflow-specific extensions
  - **VS Code** - Optimized for VS Code's markdown preview renderer
  - **GitLab** - GitLab-flavored markdown with platform-specific features
  - **CommonMark** - Standard CommonMark specification

### Options

- **--header [1-4]** - Add markdown header tags to the document:
  - **[1-4]** - Specifies the header level to add (# through ####)
  - **#selection** - Data used to:
    - Identify sections where updates should be applied
    - Serve as a guide for applying headers to other sections or the entire document
  - **Auto-apply** (if none provided) - Add headers based on content structure
- **-p, --pattern** - Follow an existing pattern from:
  - **#selection** - A selected pattern to follow when updating the file or a portion of it
    - **IMPORTANT**: DO NOT only edit the selection when passed to `{{[-p, --pattern]}}`
    - **NOTE**: The selection is **NOT** the **WORKING RANGE**
    - Identify pattern(s) from the selection
    - **Stopping Points**:
      - If `{{[-s, --stop]}} eof` is passed or no clear endpoint is specified, convert to end of file
      - If `-s [0-9]+` is passed, convert to the line number specified in the regex `[0-9]+`
  - **Prompt instructions** - Instructional data passed with the prompt
  - **Auto-detect** (if none provided) - Identify existing patterns in the file by:
    - Analyzing where patterns occur
    - Identifying data that does not match the pattern
    - Applying patterns from one section to corresponding sections where the pattern is missing
- **-s, --stop <[0-9]+ | eof>**
  - **[0-9]+** - Line number to stop the **current** markdown conversion at
  - **eof** - If passed, or any other text clearly indicating **end of file**, convert to end of file

### Predefined Instructions

If any of the predefined instructions are passed as an argument, expand and use them as **ADDITIONAL**
input for the prompt instructions. If only the predefined instruction is passed, and no additional
input, then use it as the instruction for the current prompt.

#### Syntax

```bash
/convert-plaintext-to-md pre=<name>
```

#### Predefined

- **rm-head-digits** - Remove any prepending numbers from the headers when updating or converting the
plaintext to markdown.
- **mv-head-level(x, y)** - Change the heading level from level `x` header to a level `y` header when
updating or converting plaintext to markdown.
- **rm-indent(x)** - Decrease the indentation of paragraphs or raw text data portions of the file by
`x` when updating or converting plaintext to markdown.

> [!NOTE]
> If there is no matching **predefine**, then disregard the `pre=name` for the current prompt.

### Usage Example

#### Basic Use

**User**

```bash
/convert-plaintext-to-md #file
```

**Agent**

```
I see there is no corresponding `file.md`. Let me copy the plaintext document:

    ```bash
    cp file file.md
    ```

Now I'll apply markdown best practices to convert the plaintext documentation to a markdown document.
```

#### Using a Guide to Convert to Markdown

**User**

```bash
/convert-plaintext-to-md #file.md --guide #CODE.md
```

**Agent**

```
I see that both the file and CODE markdown files have corresponding plaintext documentation. Let me
check CODE and compare it to CODE.md, and identify patterns to help with conversion.

    CODE
    ```text
    Title

    Text in opening.

    1. Section
      1.1 Section Item

    =============================================

    1. Section
      1.1
      Full details of section item.
    ```

And looking at CODE.md:

    CODE.md
    ```markdown
    # Title

    Text in opening.

    ### [Section](#1-section)

    - [1.1](#11) Section Item but Only Numbers in Sub-heading

    ***

    ## 1. Section

    ### 1.1

    Full details of section item.
    ```

I see file.md exists and matches the text in file.

I'll convert file.md similarly. Let's look at the file text documentation:

    file
    ```text
    Title

    1. Command
      1.10.0 Options

    ---------------------------------------------

    Command
      1.10.0
      Info on the commands' options.
    ```

OK, after analyzing the guide file, I've updated file.md to:

    file.md
    ```markdown
    # Title

    ### [1. Command](#command)
    - [1.10.0](#1100-option-with-text-subheading) Option With Text Subheading

    ***

    ## Command

    ### 1.10.0 Option With Text Subheading
    Info on the commands' options.
    ```
```

#### Finalize is Clearly Triggered

**User**

```bash
/convert-plaintext-to-md #file.md polish the converted markdown file
```

**NOTE** - natural language variations are acceptable. Hence the use of "polish the converted markdown file".

**Agent**

```
I'll finalize file.md. I see the current converted markdown file has:

    ```markdown
    # Title

    Some paragraph with space character at start of line. This <html> should be escaped.

    -  Some list item with extra space character.
    -  Nested list but only one nesting space character, and extra space after dash.
      if (a == 1) {
        return "Indented code block without enough space characters.";
      } else {
        return "Passing `finalize` or similar should resolve this.";
      }

    But when `python` is used, syntax will be like:
    ```

    ```
    import math
    radius = float(input("This is clearly python, but let's do math."))
    area = math.pi * radius**2
    circumference = 2 * math.pi * radius
    print(f"Area: {area:.2f}, Circumference: {circumference:.2f}")
    ```

Let me trim a few things:

    ```markdown
    # Title

    Some paragraph with space character at start of line. This \<html\> should be escaped.

    - Some list item with extra space character.
      - Nested list but only one space character.

        if (a == 1) {
          return "Indented code block without enough space characters.";
        } else {
          return "Passing `finalize` or similar should resolve this.";
        }

    But when `python` is used, syntax will be like:

    ```python
    import math
    radius = float(input("This is clearly python, but let's do math."))
    area = math.pi * radius**2
    circumference = 2 * math.pi * radius
    print(f"Area: {area:.2f}, Circumference: {circumference:.2f}")
    ```
```

#### No Existing Markdown File and Inline shorthand Instructions

**User**

```bash
/convert-plaintext-to-md #BUGS --p "regex()=> ^ {1,}([0-9]+\.[0-9]+\.[0-9]+) to ^### $1"
```

**Agent**

```
I see that there is no `BUGS.md` file. Let me copy the current plaintext BUGS documentation:

    ```bash
    copy BUGS BUGS.md
    ```

Now I'll update the copied file BUGS.md, converting it to proper markdown.
Let me read the current contents:

    ```markdown
    1 Section
      1.1 Section Item
      1.2 Section Item
      ...
      1.12 Section Item
    ```

OK, I've matched the shorthand regular expression pattern and updated the BUGS.md to:

    ```markdown
    1 Section
    ### 1.1 Section Item
    ### 1.2 Section Item
    ### ...
    ### 1.12 Section Item
    ```
```

## Considerations

### Patterns

- Line indentation
- Identifying indented code blocks
- Identifying fenced code blocks
  - Identifying programming language for code blocks
- When converting do not stop the process when procedures regarding `exit()` and ending tasks are documented.
  - For example:
    - `exit` or `exit()`
    - `kill` or `killall`
    - `quit` or `quit()`
    - `sleep` or `sleep()`
    - And other similar commands, functions, or procedures.

> [!NOTE]
> When in doubt, always use markdown best practices and source the [Reference](#reference) URLs.

## Goal

- Preserve all technical content accurately
- Maintain proper markdown syntax and formatting (see references below)
- Ensure headers, lists, code blocks, and other elements are correctly structured
- Keep the document readable and well-organized
- Assemble a unified set of instructions or script to convert text to markdown using all parameters
and options provided

### Reference

- #fetch → https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
- #fetch → https://www.markdownguide.org/extended-syntax/
- #fetch → https://learn.microsoft.com/en-us/azure/devops/project/wiki/markdown-guidance?view=azure-devops

> [!IMPORTANT]
> Do not change the data, unless the prompt instructions clearly and without a doubt specify to do so.
