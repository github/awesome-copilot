---
agent: 'agent'
description: 'Update a markdown file section with an index/table of files from a specified folder.'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'extensions', 'fetch', 'findTestFiles', 'githubRepo', 'openSimpleBrowser', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'search/searchResults', 'runCommands/terminalLastCommand', 'runCommands/terminalSelection', 'testFailure', 'usages', 'vscodeAPI']
---
# Update Markdown File Index

Update markdown file `${file}` with an index/table of files from folder `${input:folder}`.

## Process

1. **Scan**: Read the target markdown file `${file}` to understand existing structure
2. **Discover**: List all files in the specified folder `${input:folder}` matching pattern `${input:pattern}`
3. **Analyze**: Identify if an existing table/index section exists to update, or create new structure
4. **Structure**: Generate appropriate table/list format based on file types and existing content
5. **Update**: Replace existing section or add new section with file index
6. **Validate**: Ensure markdown syntax is valid and formatting is consistent

## File Analysis

For each discovered file, extract:

- **Name**: Filename with or without extension based on context
- **Type**: File extension and category (e.g., `.md`, `.js`, `.py`)
- **Description**: First line comment, header, or inferred purpose
- **Size**: File size for reference (optional)
- **Modified**: Last modified date (optional)

## Table Structure Options

Choose format based on file types and existing content:

### Option 1: Simple List

```markdown
## Files in ${folder}

- [filename.ext](path/to/filename.ext) - Description
- [filename2.ext](path/to/filename2.ext) - Description
```

### Option 2: Detailed Table

| File | Type | Description |
|------|------|-------------|
| [filename.ext](path/to/filename.ext) | Extension | Description |
| [filename2.ext](path/to/filename2.ext) | Extension | Description |

### Option 3: Categorized Sections

Group files by type/category with separate sections or sub-tables.

## Update Strategy

- 🔄 **Update existing**: If table/index section exists, replace content while preserving structure
- ➕ **Add new**: If no existing section, create new section using best-fit format
- 📋 **Preserve**: Maintain existing markdown formatting, heading levels, and document flow
- 🔗 **Links**: Use relative paths for file links within the repository

## Section Identification

Look for existing sections with these patterns:

- Headings containing: "index", "files", "contents", "directory", "list"
- Tables with file-related columns
- Lists with file links
- HTML comments marking file index sections

## Requirements

- Preserve existing markdown structure and formatting
- Use relative paths for file links
- Include file descriptions when available
- Sort files alphabetically by default
- Handle special characters in filenames
- Validate all generated markdown syntax
