---
name: create-llms
description: 'Create an llms.txt file from scratch based on repository structure following the llms.txt specification at https://llmstxt.org/'
---

# Create LLMs.txt File from Repository Structure

Create a new `llms.txt` file from scratch in the root of the repository following the official llms.txt specification at https://llmstxt.org/. This file provides high-level guidance to large language models (LLMs) on where to find relevant content for understanding the repository's purpose and specifications.

## Primary Directive

Create a comprehensive `llms.txt` file that serves as an entry point for LLMs to understand and navigate the repository effectively. The file must comply with the llms.txt specification and be optimized for LLM consumption while remaining human-readable.

## Analysis and Planning Phase

Before creating the `llms.txt` file, you must complete a thorough analysis:

### Step 1: Review llms.txt Specification

- Review the official specification at https://llmstxt.org/ to ensure full compliance
- Understand the required format structure and guidelines
- Note the specific markdown structure requirements

### Step 2: Repository Structure Analysis

- Examine the complete repository structure using appropriate tools
- Identify the primary purpose and scope of the repository
- Catalog all important directories and their purposes
- List key files that would be valuable for LLM understanding

### Step 3: Content Discovery

- Identify README files and their locations
- Find documentation files (`.md` files in `/docs/`, `/spec/`, etc.)
- Locate specification files and their purposes
- Discover configuration files and their relevance
- Find example files and code samples
- Identify any existing documentation structure

### Step 4: Create Implementation Plan

Based on your analysis, create a structured plan that includes:

- Repository purpose and scope summary
- Priority-ordered list of essential files for LLM understanding
- Secondary files that provide additional context
- Organizational structure for the llms.txt file

## Implementation Requirements

### Format Compliance

The `llms.txt` file must follow this exact structure per the specification:

1. **H1 Header**: Single line with repository/project name (required)
2. **Blockquote Summary**: Brief description in blockquote format (optional but recommended)
3. **Additional Details**: Zero or more markdown sections without headings for context
4. **File List Sections**: Zero or more H2 sections containing markdown lists of links

### Content Requirements

#### Required Elements

- **Project Name**: Clear, descriptive title as H1
- **Summary**: Concise blockquote explaining the repository's purpose
- **Key Files**: Essential files organized by category (H2 sections)

#### File Link Format

Each file link must follow: `[descriptive-name](relative-url): optional description`

#### Section Organization

Organize files into logical H2 sections such as:

- **Documentation**: Core documentation files
- **Specifications**: Technical specifications and requirements
- **Examples**: Sample code and usage examples
- **Configuration**: Setup and configuration files
- **Optional**: Secondary files (special meaning - can be skipped for shorter context)

### Content Guidelines

#### Language and Style

- Use concise, clear, unambiguous language
- Avoid jargon without explanation
- Write for both human and LLM readers
- Be specific and informative in descriptions

#### File Selection Criteria

Include files that:
- Explain the repository's purpose and scope
- Provide essential technical documentation
- Show usage examples and patterns
- Define interfaces and specifications
- Contain configuration and setup instructions

Exclude files that:
- Are purely implementation details
- Contain redundant information
- Are build artifacts or generated content
- Are not relevant to understanding the project

## Execution Steps

### Step 1: Repository Analysis

1. Examine the repository structure completely
2. Read the main README.md to understand the project
3. Identify all documentation directories and files
4. Catalog specification files and their purposes
5. Find example files and configuration files

### Step 2: Content Planning

1. Determine the primary purpose statement
2. Write a concise summary for the blockquote
3. Group identified files into logical categories
4. Prioritize files by importance for LLM understanding
5. Create descriptions for each file link

### Step 3: File Creation

1. Create the `llms.txt` file in the repository root
2. Follow the exact format specification
3. Include all required sections
4. Use proper markdown formatting
5. Ensure all links are valid relative paths

### Step 4: Validation
1. Verify compliance with https://llmstxt.org/ specification
2. Check that all links are valid and accessible
3. Ensure the file serves as an effective LLM navigation tool
4. Confirm the file is both human and machine readable

## Quality Assurance

### Format Validation

- ✅ H1 header with project name
- ✅ Blockquote summary (if included)
- ✅ H2 sections for file lists
- ✅ Proper markdown link format
- ✅ No broken or invalid links
- ✅ Consistent formatting throughout

### Content Validation

- ✅ Clear, unambiguous language
- ✅ Comprehensive coverage of essential files
- ✅ Logical organization of content
- ✅ Appropriate file descriptions
- ✅ Serves as effective LLM navigation tool

### Specification Compliance

- ✅ Follows https://llmstxt.org/ format exactly
- ✅ Uses required markdown structure
- ✅ Implements optional sections appropriately
- ✅ File located at repository root (`/llms.txt`)

## Example Structure Template

```txt
# [Repository Name]

> [Concise description of the repository's purpose and scope]

[Optional additional context paragraphs without headings]

## Documentation

- [Main README](README.md): Primary project documentation and getting started guide
- [Contributing Guide](CONTRIBUTING.md): Guidelines for contributing to the project
- [Code of Conduct](CODE_OF_CONDUCT.md): Community guidelines and expectations

## Specifications

- [Technical Specification](spec/technical-spec.md): Detailed technical requirements and constraints
- [API Specification](spec/api-spec.md): Interface definitions and data contracts

## Examples

- [Basic Example](examples/basic-usage.md): Simple usage demonstration
- [Advanced Example](examples/advanced-usage.md): Complex implementation patterns

## Configuration

- [Setup Guide](docs/setup.md): Installation and configuration instructions
- [Deployment Guide](docs/deployment.md): Production deployment guidelines

## Optional

- [Architecture Documentation](docs/architecture.md): Detailed system architecture
- [Design Decisions](docs/decisions.md): Historical design decision records
```

## Success Criteria

The created `llms.txt` file should:
1. Enable LLMs to quickly understand the repository's purpose
2. Provide clear navigation to essential documentation
3. Follow the official llms.txt specification exactly
4. Be comprehensive yet concise
5. Serve both human and machine readers effectively
6. Include all critical files for project understanding
7. Use clear, unambiguous language throughout
8. Organize content logically for easy consumption
