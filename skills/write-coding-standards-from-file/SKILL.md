---
name: write-coding-standards-from-file
description: 'Write a coding standards document for a project using the coding styles from the file(s) and/or folder(s) passed as arguments in the prompt.'
---

# Write Coding Standards From File

Use the existing syntax of the file(s) to establish the standards and style guides for the project. If more than one file or a folder is passed, loop through each file or files in the folder, appending the file's data to temporary memory or a file, then when complete use temporary data as a single instance; as if it were the file name to base the standards and style guideline on.

## Rules and Configuration

Below is a set of quasi-configuration `boolean` and `string[]` variables. Conditions for handling `true`, or other values for each variable are under the level two heading `## Variable and Parameter Configuration Conditions`.

Parameters for the prompt have a text definition. There is one required parameter **`${fileName}`**, and several optional parameters **`${folderName}`**, **`${instructions}`**, and any **`[configVariableAsParameter]`**.

### Configuration Variables

* addStandardsTest = false;
* addToREADME = false;
* addToREADMEInsertions = ["atBegin", "middle", "beforeEnd", "bestFitUsingContext"];
  - Default to **beforeEnd**.
* createNewFile = true;
* fetchStyleURL = true;
* findInconsistencies = true;
* fixInconsistencies = true;
* newFileName = ["CONTRIBUTING.md", "STYLE.md", "CODE_OF_CONDUCT.md", "CODING_STANDARDS.md", "DEVELOPING.md", "CONTRIBUTION_GUIDE.md", "GUIDELINES.md", "PROJECT_STANDARDS.md", "BEST_PRACTICES.md", "HACKING.md"];
  - For each file in `${newFileName}`, if file does not exist, use that file name and `break`, else continue to next file name of `${newFileName}`.
* outputSpecToPrompt = false;
* useTemplate = "verbose"; // or "v"
  - Possible values are `[["v", "verbose"], ["m", "minimal"], ["b", "best fit"], ["custom"]]`.
  - Selects one of the two example templates at the bottom of prompt file under the level two heading `## Coding Standards Templates`, or use another composition that is a better fit.
  - If **custom**, then apply per request.

### Configuration Variables as Prompt Parameters

If any of the variable names are passed to prompt as-is, or as a similar but clearly related text value, then override the default variable value with the value passed to prompt.

### Prompt Parameters

* **fileName** = The name of the file that will be analyzed in terms of: indentation, variable naming, commenting, conditional procedures, functional procedures, and other syntax related data for the coding language of the file.
* folderName = The name of the folder that will be used to extract data from multiple files into one aggregated dataset that will be analyzed in terms of: indentation, variable naming, commenting, conditional procedures, functional procedures, and other syntax related data for the coding language of the files.
* instructions = Additional instructions, rules, and procedures that will be provided for unique cases.
* [configVariableAsParameter] = If passed will override the default state of the configuration variable. Example:
  - useTemplate = If passed will override the configuration `${useTemplate}` default. Values are `[["v", "verbose"], ["m", "minimal"], ["b", "best fit"]]`.

#### Required and Optional Parameters

* **fileName** - required
* folderName - *optional*
* instructions - *optional*
* [configVariableAsParameter] - *optional*

## Variable and Parameter Configuration Conditions

### `${fileName}.length > 1 || ${folderName} != undefined`

* If true, toggle `${fixInconsistencies}` to false.

### `${addToREADME} == true`

* Insert the coding standards into the `README.md` instead of outputting to the prompt or creating a new file.
* If true, toggle both `${createNewFile}` and `${outputSpecToPrompt}` to false.

### `${addToREADMEInsertions} == "atBegin"`

* If `${addToREADME}` is true, then insert the coding standards data at the **beginning** of the `README.md` file after the title.

### `${addToREADMEInsertions} == "middle"`

* If `${addToREADME}` is true, then insert the coding standards data at the **middle** of the `README.md` file, changing the standards title heading to match that of the `README.md` composition.

### `${addToREADMEInsertions} == "beforeEnd"`

* If `${addToREADME}` is true, then insert the coding standards data at the **end** of the `README.md` file, inserting a new line after the last character, then inserting the data on a new line.

### `${addToREADMEInsertions} == "bestFitUsingContext"`

* If `${addToREADME}` is true, then insert the coding standards data at the **best fitting line** of the `README.md` file in regards to the context of the `README.md` composition and flow of data.

### `${addStandardsTest} == true`

* Once the coding standards file is complete, write a test file to ensure the file or files passed to it adhere to the coding standards.

### `${createNewFile} == true`

* Create a new file using the value, or one of the possible values, from `${newFileName}`.
* If true, toggle both `${outputSpecToPrompt}` and `${addToREADME}` to false.

### `${fetchStyleURL} == true`

* Additionally use the data fetched from the links nested under level three heading `### Fetch Links` as context for creating standards, specifications, and styling data for the new file, prompt, or `README.md`.
* For each relevant item in `### Fetch Links`, run `#fetch ${item}`.

### `${findInconsistencies} == true`

* Evaluate syntax related to indentations, line-breaks, comments, conditional and function nesting, quotation wrappers i.e. `'` or `"` for strings, etc., and categorize.
* For each category, make a count, and if one item does not match the majority of the count, then commit to temporary memory.
* Depending on the status of `${fixInconsistencies}`, either edit and fix the low count categories to match the majority, or output to prompt inconsistencies stored in temporary memory.

### `${fixInconsistencies} == true`

* Edit and fix the low count categories of syntax data to match the majority of corresponding syntax data using inconsistencies stored in temporary memory.

### `typeof ${newFileName} == "string"`

* If specifically defined as a `string`, create a new file using the value from `${newFileName}`.

### `typeof ${newFileName} != "string"`

* If **NOT** specifically defined as a `string`, but instead an `object` or an array, create a new file using a value from `${newFileName}` by applying this rule:
  - For each file name in `${newFileName}`, if file does not exist, use that file name and `break`, else continue to the next.

### `${outputSpecToPrompt} == true`

* Output the coding standards to the prompt instead of creating a file or adding to README.
* If true, toggle both `${createNewFile}` and `${addToREADME}` to false.

### `${useTemplate} == "v" || ${useTemplate} == "verbose"`

* Use data under the level three heading `### "v", "verbose"` as guiding template when composing the data for coding standards.

### `${useTemplate} == "m" || ${useTemplate} == "minimal"`

* Use data under the level three heading `### "m", "minimal"` as guiding template when composing the data for coding standards.

### `${useTemplate} == "b" || ${useTemplate} == "best"`

* Use either the data under the level three heading `### "v", "verbose"` or `### "m", "minimal"`, depending on the data extracted from `${fileName}`, and use the best fit as guiding template when composing the data for coding standards.

### `${useTemplate} == "custom" || ${useTemplate} == "<ANY_NAME>"`

* Use the custom prompt, instructions, template, or other data passed as guiding template when composing the data for coding standards.

## **if** `${fetchStyleURL} == true`

Depending on the programming language, for each link in list below, run `#fetch (URL)`, if programming language is `${fileName} == [<Language> Style Guide]`.

### Fetch Links

- [C Style Guide](https://users.ece.cmu.edu/~eno/coding/CCodingStandard.html)
- [C# Style Guide](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- [C++ Style Guide](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Go Style Guide](https://github.com/golang-standards/project-layout)
- [Java Style Guide](https://coderanch.com/wiki/718799/Style)
- [AngularJS App Style Guide](https://github.com/mgechev/angularjs-style-guide)
- [jQuery Style Guide](https://contribute.jquery.org/style-guide/js/)
- [JavaScript Style Guide](https://www.w3schools.com/js/js_conventions.asp)
- [JSON Style Guide](https://google.github.io/styleguide/jsoncstyleguide.xml)
- [Kotlin Style Guide](https://kotlinlang.org/docs/coding-conventions.html)
- [Markdown Style Guide](https://cirosantilli.com/markdown-style-guide/)
- [Perl Style Guide](https://perldoc.perl.org/perlstyle)
- [PHP Style Guide](https://phptherightway.com/)
- [Python Style Guide](https://peps.python.org/pep-0008/)
- [Ruby Style Guide](https://rubystyle.guide/)
- [Rust Style Guide](https://github.com/rust-lang/rust/tree/HEAD/src/doc/style-guide/src)
- [Swift Style Guide](https://www.swift.org/documentation/api-design-guidelines/)
- [TypeScript Style Guide](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Visual Basic Style Guide](https://en.wikibooks.org/wiki/Visual_Basic/Coding_Standards)
- [Shell Script Style Guide](https://google.github.io/styleguide/shellguide.html)
- [Git Usage Style Guide](https://github.com/agis/git-style-guide)
- [PowerShell Style Guide](https://github.com/PoshCode/PowerShellPracticeAndStyle)
- [CSS](https://cssguidelin.es/)
- [Sass Style Guide](https://sass-guidelin.es/)
- [HTML Style Guide](https://github.com/marcobiedermann/html-style-guide)
- [Linux kernel Style Guide](https://www.kernel.org/doc/html/latest/process/coding-style.html)
- [Node.js Style Guide](https://github.com/felixge/node-style-guide)
- [SQL Style Guide](https://www.sqlstyle.guide/)
- [Angular Style Guide](https://angular.dev/style-guide)
- [Vue Style Guide](https://vuejs.org/style-guide/rules-strongly-recommended.html)
- [Django Style Guide](https://docs.djangoproject.com/en/dev/internals/contributing/writing-code/coding-style/)
- [SystemVerilog Style Guide](https://github.com/lowRISC/style-guides/blob/master/VerilogCodingStyle.md)

## Coding Standards Templates

### `"m", "minimal"`

```text
    ```markdown
    ## 1. Introduction
    *   **Purpose:** Briefly explain why the coding standards are being established (e.g., to improve code quality, maintainability, and team collaboration).
    *   **Scope:** Define which languages, projects, or modules this specification applies to.

    ## 2. Naming Conventions
    *   **Variables:** `camelCase`
    *   **Functions/Methods:** `PascalCase` or `camelCase`.
    *   **Classes/Structs:** `PascalCase`.
    *   **Constants:** `UPPER_SNAKE_CASE`.

    ## 3. Formatting and Style
    *   **Indentation:** Use 4 spaces per indent (or tabs).
    *   **Line Length:** Limit lines to a maximum of 80 or 120 characters.
    *   **Braces:** Use the "K&R" style (opening brace on the same line) or the "Allman" style (opening brace on a new line).
    *   **Blank Lines:** Specify how many blank lines to use for separating logical blocks of code.

    ## 4. Commenting
    *   **Docstrings/Function Comments:** Describe the function's purpose, parameters, and return values.
    *   **Inline Comments:** Explain complex or non-obvious logic.
    *   **File Headers:** Specify what information should be included in a file header, such as author, date, and file description.

    ## 5. Error Handling
    *   **General:** How to handle and log errors.
    *   **Specifics:** Which exception types to use, and what information to include in error messages.

    ## 6. Best Practices and Anti-Patterns
    *   **General:** List common anti-patterns to avoid (e.g., global variables, magic numbers).
    *   **Language-specific:** Specific recommendations based on the project's programming language.

    ## 7. Examples
    *   Provide a small code example demonstrating the correct application of the rules.
    *   Provide a small code example of an incorrect implementation and how to fix it.

    ## 8. Contribution and Enforcement
    *   Explain how the standards are to be enforced (e.g., via code reviews).
    *   Provide a guide for contributing to the standards document itself.
    ```
```

### `"v", verbose"`

```text
    ```markdown

    # Style Guide

    This document defines the style and conventions used in this project.
    All contributions should follow these rules unless otherwise noted.

    ## 1. General Code Style

    - Favor clarity over brevity.
    - Keep functions and methods small and focused.
    - Avoid repeating logic; prefer shared helpers/utilities.
    - Remove unused variables, imports, code paths, and files.

    ## 2. Naming Conventions

    Use descriptive names. Avoid abbreviations unless well-known.

    | Item            | Convention           | Example            |
    |-----------------|----------------------|--------------------|
    | Variables       | `lower_snake_case`   | `buffer_size`      |
    | Functions       | `lower_snake_case()` | `read_file()`      |
    | Constants       | `UPPER_SNAKE_CASE`   | `MAX_RETRIES`      |
    | Types/Structs   | `PascalCase`         | `FileHeader`       |
    | File Names      | `lower_snake_case`   | `file_reader.c`    |

    ## 3. Formatting Rules

    - Indentation: **4 spaces**
    - Line length: **max 100 characters**
    - Encoding: **UTF-8**, no BOM
    - End files with a newline

    ### Braces (example in C, adjust for your language)

        ```c
        if (condition) {
            do_something();
        } else {
            do_something_else();
        }
        ```

    ### Spacing

    - One space after keywords: `if (x)`, not `if(x)`
    - One blank line between top-level functions

    ## 4. Comments & Documentation

    - Explain *why*, not *what*, unless intent is unclear.
    - Keep comments up-to-date as code changes.
    - Public functions should include a short description of purpose and parameters.

    Recommended tags:

        ```text
        TODO: follow-up work
        FIXME: known incorrect behavior
        NOTE: non-obvious design decision
        ```

    ## 5. Error Handling

    - Handle error conditions explicitly.
    - Avoid silent failures; either return errors or log them appropriately.
    - Clean up resources (files, memory, handles) before returning on failure.

    ## 6. Commit & Review Practices

    ### Commits
    - One logical change per commit.
    - Write clear commit messages:

        ```text
        Short summary (max ~50 chars)
        Optional longer explanation of context and rationale.
        ```

    ### Reviews
    - Keep pull requests reasonably small.
    - Be respectful and constructive in review discussions.
    - Address requested changes or explain if you disagree.

    ## 7. Tests

    - Write tests for new functionality.
    - Tests should be deterministic (no randomness without seeding).
    - Prefer readable test cases over complex test abstraction.

    ## 8. Changes to This Guide

    Style evolves.
    Propose improvements by opening an issue or sending a patch updating this document.
    ```
```
