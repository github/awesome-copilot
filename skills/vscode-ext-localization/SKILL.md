---
name: vscode-ext-localization
description: 'Guidelines for proper localization of VS Code extensions, following VS Code extension development guidelines, libraries and good practices'
---

# VS Code extension localization

This skill helps you localize every aspect of VS Code extensions

## When to use this skill

Use this skill when you need to:
- Localize new or existing contributed configurations (settings), commands, menus, views or walkthroughs
- Localize new or existing messages or other string resources contained in extension source code that are displayed to the end user

# Instructions

VS Code localization is composed by three different approaches, depending on the resource that is being localized. When a new localizable resource is created or updated, the corresponding localization for all currently available languages must be created/updated.

1. Configurations like Settings, Commands, Menus, Views, ViewsWelcome, Walkthrough Titles and Descriptions, defined in `package.json`
  -> An exclusive `package.nls.LANGID.json` file, like `package.nls.pt-br.json` of Brazilian Portuguese (`pt-br`) localization
2. Walkthrough content (defined in its own `Markdown` files)
  -> An exclusive `Markdown` file like `walkthrough/someStep.pt-br.md` for Brazilian Portuguese localization
3. Messages and string located in extension source code (JavaScript or TypeScript files)
  -> An exclusive `bundle.l10n.pt-br.json` for Brazilian Portuguese localization
