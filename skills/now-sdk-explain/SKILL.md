---
name: now-sdk-explain
description: Use whenever the user mentions fluent, ServiceNow, or the now-sdk, OR when the user prompts for edits within a fluent application (identified by a now.config.json at the project root). Fetches SDK documentation via now-sdk explain — covers API types, metadata conventions, skills, and project structure. Pass a topic to read it directly, or omit to browse available topics.
argument-hint: "[topic]"
---


## Usage

IMPORTANT: _Never_ open a full topic without first viewing the summary via the `--peek` option! This will prevent you from accidentally opening the wrong topic and wasting context space.

To show all available topics with their related tags:
```bash
npx @servicenow/sdk explain --list --format=raw
```

To search for topics, showing the descriptions of all matches:
```bash
npx @servicenow/sdk explain <topic> --list --peek --format=raw
```

To preview topics using the `--peek` option:
```bash
npx @servicenow/sdk explain <topic> --peek --format=raw
```

Once you are certain you want to read the full topic, open it like this:
```bash
npx @servicenow/sdk explain <topic> --format=raw
```

## What to Search for

- **Metadata types** — `BusinessRule`, `Table`, `Acl`, `Flow`, `ScriptInclude`, `ClientScript`
- **Skills** — workflows like `build`, `transform`, `deploy`, `auth`
- **Conventions** — `naming`, `structure`, `scoping`, `file-layout`

## Prerequisite knowledge and guidelines

- The first time this skill is invoked in a session, please familiarize yourself with general fluent development by reading everything under `npx @servicenow/sdk explain quickstart --list --format=raw`. 
- Always use the `npx @servicenow/sdk` cli commands whenever possible to create, build, and deploy fluent projects. 

## For any task — always start here

- Start by searching for topics using `npx @servicenow/sdk explain <search-term> --list --format=raw`. 
- Continue by reading the relevant topics, always using `npx @servicenow/sdk explain <topic> --peek --format=raw`, to preview the description before committing to read the full topic. 
- Provided the description is relevant, continue to read the full topic using `npx @servicenow/sdk explain <topic> --format=raw`.
- Many items are spread out across multiple topics. As such, it is very important to read all relevant topics before making any changes.

## If a now-sdk command fails

Invoke `/now-sdk-setup` if the error indicates an environment configuration problem:

- `@servicenow/sdk is not in this registry` — `@servicenow/sdk` is not installed
- Node.js version errors (e.g. `The engine "node" is incompatible`)

Do **not** invoke `/now-sdk-setup` for other errors — these are not environment problems and that skill will not help:

- `No documentation found for "<topic>"` — wrong topic name, try `--list`
- `No match for "<topic>"` — use a different search term
