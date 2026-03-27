---
description: 'Ensure documentation and examples use only generic, cliche placeholder data — never real or sensitive data sourced from local scripts, configuration, task files, or prompt context.'
applyTo: '**/*.{md,js,mjs,cjs,ts,tsx,jsx,py,json}'
---

# Use Cliche Data in Documentation

When updating or writing documentation for a tool, **never include real data** that was provided in prompts, local configuration, scripts, task files, or any other implementation-specific source. Documentation must use only generic, commonly recognized placeholder data that cannot expose sensitive information.

## Why This Matters

A tool's source code and local configuration often contain real names, real email addresses, real organization details, and real domain names. These values are necessary for the tool to function, but they have **no place in public-facing documentation**. Leaking real data into docs can expose:

- Internal business names and contacts
- Email addresses and domain names
- Client or customer identifiers
- Account names and credentials
- Organization-specific terminology that reveals private operations

## Core Rule

> **If data came from a prompt, a local file, a script, a config, or a task — it does NOT go into documentation.**
>
> Documentation examples use only well-known, fictional, or obviously placeholder data.

## What Counts as Real Data

Any value that originates from:

- **Local configuration files** (e.g., `config.json`, `.env`, account modules)
- **Scripts and task files** (e.g., batch scripts, shell scripts, task runners)
- **Prompt context** (e.g., data the user supplies when asking an agent to build or update the tool)
- **Map or filter files** (e.g., JSON mappings, data extraction rules)
- **Git-ignored files** (e.g., files excluded from version control that contain environment-specific values)

## Approved Placeholder Data for Documentation

Use these generic, cliche substitutes in all documentation and examples:

| Category | Approved Placeholder Examples |
| --- | --- |
| **People** | Jane Doe, John Smith, Alice, Bob |
| **Email addresses** | `jane.doe@example.com`, `admin@example.org` |
| **Organizations** | Acme Corp, Contoso, Northwind Traders |
| **Domains** | `example.com`, `example.org`, `example.net` |
| **Addresses** | 123 Main Street, Suite 100, Springfield |
| **Phone numbers** | `(555) 123-4567` |
| **Accounts / usernames** | `demo-user`, `test-account` |
| **File paths** | `accounts/acme.mjs`, `config/reports.json` |
| **Project names** | My Project, Sample App, Demo Tool |

## How to Apply This Rule

### When Adding a Feature

If you add a feature using real account data (e.g., a script named after a real client), document the feature using a fictional account name instead.

**Real implementation file:** an account module configured for a specific business

**Documentation example:**

```javascript
// accounts/acme.mjs — Example account configuration
export default {
  name: 'Acme Corp',
  email: 'reports@example.com',
  folder: 'INBOX',
};
```

### When Updating Configuration Docs

If a config file references real domains, real paths, or real credentials, replace every real value with a placeholder before including it in documentation.

**Documentation example:**

```json
{
  "host": "imap.example.com",
  "user": "admin@example.com",
  "folder": "INBOX/Reports",
  "outputDir": "./downloads"
}
```

### When Writing Script Examples

If a script automates a task for a specific organization, the documentation example must use a generic organization name and generic parameters.

**Documentation example:**

```batch
@echo off
REM Example: Run the extraction task for Acme Corp
node extractEmail.mjs --account acme --task download
```

## The Boundary Between Code and Docs

| Context | Real Data Allowed? |
| --- | --- |
| Local scripts and config files used at runtime | Yes |
| Git-ignored files with environment-specific values | Yes |
| Prompt data provided to build or configure the tool | Yes (in code only) |
| README.md, docs/ folder, and example templates | **No — use placeholders only** |
| CHANGELOG.md entries | **No — describe changes generically** |
| Code comments in committed source files | **No — keep generic** |

## One Exception

A word from real data may appear in documentation **only** if it is a common English word used in its ordinary sense and **not** in the context of an example. For instance, the word "development" is acceptable in a sentence like "This tool is under active development" even if it also appears in a real organization name.

## Summary

Documentation is public. Implementation data is private. Keep them separate. Every example in every doc file should pass a simple test: *could a stranger read this and learn nothing about the real users, clients, or organizations behind this tool?* If the answer is no, replace the data with cliche placeholders.
