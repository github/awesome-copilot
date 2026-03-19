---
title: "MCP Servers"
description: "Learn how MCP servers let Copilot CLI reach trusted tools and live data, then practice beginner-friendly workflows with GitHub, filesystem, and documentation servers."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "14 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - mcp
prerequisites:
  - Complete 05 · Skills.
relatedArticles:
  - ./index.md
  - ./05-skills.md
  - ./07-putting-it-all-together.md
  - ./understanding-mcp-servers.md
  - ./installing-and-using-plugins.md
---

> **What if Copilot CLI could check your GitHub repo, browse your files, and pull in current docs without you copy-pasting everything first?**

This is the chapter where Copilot CLI starts reaching beyond the chat window. Up to now, most of your prompts depended on files you attached with `@`, the conversation so far, and the model's built-in knowledge. **MCP servers change that** by letting Copilot connect to trusted tools and live systems.

> **Hands-on note:** this chapter uses **two repo lanes**. The quick demos work well in this repository (`awesome-copilot`) because you can ask about folders like `agents/`, `skills/`, or `website/`. The longer practice assignment uses the companion repo [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners), because that repo includes the book app project used throughout the original course.

## Learning objectives

By the end of this chapter, you should be able to:

- explain what MCP is in practical, beginner-friendly terms
- check whether MCP is working in your Copilot CLI session
- configure a few high-value MCP servers such as filesystem and documentation lookup
- use MCP to gather live context before asking Copilot to analyze or change something
- recognize when a custom MCP server is worth exploring later

## Real-world analogy: browser extensions

<img src="/images/learning-hub/copilot-cli-for-beginners/06/browser-extensions-analogy.png" alt="Browser extensions analogy showing how MCP servers connect Copilot CLI to GitHub, files, and documentation" width="800" />

Think of MCP servers like browser extensions:

| Browser extension | What it connects to      | MCP equivalent                                           |
| ----------------- | ------------------------ | -------------------------------------------------------- |
| Password manager  | Your password vault      | **GitHub MCP** → repos, issues, pull requests, workflows |
| Grammarly         | Writing analysis service | **Context7** or docs-focused MCP → current library docs  |
| File manager      | Cloud or local storage   | **Filesystem MCP** → local files and folders             |

Without extensions, your browser still works. With the right extensions, it becomes much more useful. MCP does the same for Copilot CLI. It gives Copilot carefully scoped access to the outside world so it can answer with **live context**, not just pasted snippets.

> **Key insight:** without MCP, Copilot mostly waits for you to provide the missing context. With MCP, it can often go fetch that context itself.

## Quick start: see MCP in action first

<img src="/images/learning-hub/copilot-cli-for-beginners/06/quick-start-mcp.png" alt="Power cable connecting with a bright spark to represent turning on MCP" width="800" />

The fastest way to make MCP feel real is to use the built-in GitHub server before configuring anything else.

```bash
copilot
```

```text
> /mcp show
> List the last 5 commits in this repository
```

If Copilot returns real repository activity, you have already seen MCP working.

### Why this matters

That small demo proves an important idea: **Copilot can inspect a system outside the chat window**. Once that clicks, the rest of the chapter makes more sense.

<details>
<summary>🎬 See the MCP status flow in action</summary>

![MCP Status Demo](/images/learning-hub/copilot-cli-for-beginners/06/mcp-status-demo.gif)

_Demo output varies. Your model, permissions, and configured tools may differ from what is shown here._

</details>

## What changes when MCP is available?

| Without MCP                                          | With MCP                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| “I can't see your GitHub issue unless you paste it.” | “Issue #42 is open, labeled `bug`, and mentions login failures.”                 |
| “I don't know what files are in that folder.”        | “There are multiple Markdown files in `website/src/content/docs/learning-hub/`.” |
| “My docs knowledge may be outdated.”                 | “Here is the current pattern from the latest documentation.”                     |

That is why MCP matters so much in real work. It reduces manual context gathering.

## Where MCP is configured

<img src="/images/learning-hub/copilot-cli-for-beginners/06/configuring-mcp-servers.png" alt="Audio mixing board representing MCP server configuration" width="800" />

Most beginners only need to remember two configuration locations:

- `~/.copilot/mcp-config.json` for **your personal setup** across projects
- `.vscode/mcp.json` for **repo-specific setup** shared with a workspace

A small starter config often looks like this:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "tools": ["*"]
    },
    "context7": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "tools": ["*"]
    }
  }
}
```

<details>
<summary>What do these JSON fields mean?</summary>

| Field        | Meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `mcpServers` | The collection of configured servers                         |
| `type`       | How the server is hosted; beginners will usually see `local` |
| `command`    | The command Copilot runs to start the server                 |
| `args`       | Extra arguments passed to that command                       |
| `tools`      | Which tools Copilot can use from that server                 |

**Helpful JSON reminders:**

- strings use double quotes
- trailing commas are not allowed
- invalid JSON can stop the server from loading
</details>

## The three most useful beginner servers

If the source chapter feels wide, narrow it to these first wins:

### 1. GitHub MCP (built in)

The GitHub server is the easiest place to start because it already ships with Copilot CLI.

Use it for questions like:

- “List the last 5 commits in this repository”
- “Show open pull requests”
- “Search this repo for files that mention `MCP`”
- “Summarize issue #123”

> **Tip:** if GitHub results are missing, try `/login` and then `/mcp show` again.

### 2. Filesystem MCP

Filesystem MCP helps when you want Copilot to browse local folders or inspect files without manually attaching each one.

Example prompts in this repository:

```text
> Summarize the purpose of the folders in website/src/content/docs/learning-hub/
> Find all files under skills/ that include a SKILL.md file
> Which learning-hub chapters mention MCP?
```

### 3. Documentation lookup MCP

A docs-focused server such as Context7 becomes useful when you want current guidance, not stale memory.

Example prompts:

```text
> What is the current recommended pytest fixture pattern?
> Look up the latest Astro content collection guidance and summarize it simply
```

If you want a broader overview, see [Understanding MCP Servers](../understanding-mcp-servers/) after this chapter.

## Web fetch and plugins: useful extras, not day-one requirements

The original course also introduces a few optional paths that are worth knowing about:

- **`web_fetch`** for one-off URL lookups without installing a full MCP server
- **plugin-based installs** when a server and its related skills are packaged together
- **remote MCP servers** when the service is hosted elsewhere and you only point Copilot to a URL

That is helpful later, but you do not need all of it on day one. Keep your first setup simple.

For more on packaged experiences, see [Installing and Using Plugins](../installing-and-using-plugins/).

## What a multi-server workflow feels like

<img src="/images/learning-hub/copilot-cli-for-beginners/06/using-mcp-servers.png" alt="Hub-and-spoke illustration showing Copilot CLI connected to GitHub, filesystem, documentation, and other tools" width="800" />

The real payoff appears when MCP servers work together in one session.

### Example: this repository

```bash
copilot
```

```text
> /mcp show
> Summarize the purpose of the folders in this repository
> Which recent commits changed files under website/src/content/docs/learning-hub/?
> Look up current Astro guidance for content pages and tell me whether our structure fits the pattern
```

One session can now combine:

- **filesystem context** for folders and file structure
- **GitHub context** for history and activity
- **documentation context** for current best practices

### Example: the companion repo's book app

```text
> List the Python files in samples/book-app-project/ and summarize each one
> What were the last 3 commits that touched that folder?
> What are current Python best practices for JSON file persistence?
> Based on the code and those best practices, what would you improve first?
```

That mirrors the source chapter's main lesson: **use live context first, then ask for analysis**.

<img src="/images/learning-hub/copilot-cli-for-beginners/06/multi-server-workflow.png" alt="Multi-server workflow illustration showing filesystem, GitHub, and documentation servers contributing to one recommendation" width="800" />

## Optional peek: when a custom MCP server becomes worthwhile

You do **not** need to build a custom server to benefit from MCP. Still, it helps to understand what that path eventually unlocks.

A custom server starts to make sense when you want Copilot to work with:

- an internal API
- a private knowledge base
- a team-specific database or dashboard
- a repeated workflow that public servers do not cover well

<details>
<summary>What a custom server looks like at a glance</summary>

The companion repo's optional guide shows a small Python server built with `FastMCP`:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("book-lookup")

@mcp.tool()
def lookup_book(isbn: str) -> str:
    """Look up a book by ISBN."""
    ...
```

The important beginner takeaway is not the full implementation. It is that:

1. you define a server name
2. you register functions as tools
3. Copilot can call those tools when the task matches

If that sounds useful later, the source course's [custom MCP server guide](https://github.com/github/copilot-cli-for-beginners/blob/main/06-mcp-servers/mcp-custom-server.md) is a good next read.

</details>

## Practice

## ▶️ Try it yourself

### Exercise 1: check your MCP status

```bash
copilot
```

```text
> /mcp show
```

You should at least see the built-in GitHub server. If not, use `/login` and try again.

### Exercise 2: explore this repository with live context

If filesystem MCP is enabled, try these prompts in `awesome-copilot`:

```text
> Summarize the purpose of agents/, skills/, hooks/, and website/
> Which learning-hub pages mention MCP?
> Show me recent commits that touched website/src/content/docs/learning-hub/
```

**Expected result:** you should see Copilot combine repository structure with live GitHub history.

### Exercise 3: try documentation lookup

If you have a docs-focused MCP server available, ask:

```text
> Find the current documentation for Astro content collections and summarize the key ideas for a beginner
```

Then ask Copilot to connect that guidance back to this repo.

### Exercise 4: combine multiple servers in one prompt

```text
> Read the learning-hub course files, check the recent commit history for those files, and tell me what part of the course looks most actively maintained
```

**Self-check:** you understand MCP when you can explain **which server supplied which part of the answer**.

## 📝 Assignment

### Main challenge: book app MCP exploration

For the fuller hands-on lab, switch to the companion repo and complete these steps in a single Copilot session:

1. Verify MCP is working with `/mcp show`
2. If needed, configure filesystem MCP in `~/.copilot/mcp-config.json`
3. Ask Copilot to inspect `samples/book-app-project/books.py`, `utils.py`, and `data.json`
4. Ask GitHub MCP for recent activity affecting `samples/book-app-project/`
5. In one prompt, compare the tests in `samples/book-app-project/tests/test_books.py` with the functions in `books.py` and summarize missing coverage

**Success criteria:** you can clearly explain what GitHub MCP contributed, what filesystem MCP contributed, and how the two together made the answer better.

### Optional alternative: stay in this repository

If you want to practice without leaving `awesome-copilot`, do a similar investigation here:

1. ask Copilot to summarize the `website/src/content/docs/learning-hub/` course files
2. ask GitHub MCP for the latest commits touching those files
3. ask a docs server for current guidance related to Astro or markdown content structure
4. request one recommendation backed by all three inputs

<details>
<summary>💡 Hints</summary>

**Starter prompts for the companion repo:**

```text
> /mcp show
> List all functions in samples/book-app-project/books.py
> Which functions in samples/book-app-project/utils.py are missing type hints?
> Read samples/book-app-project/data.json and point out any data quality issues
> Compare samples/book-app-project/tests/test_books.py with books.py and summarize missing test coverage
```

**What to look for:**

- filesystem MCP is best at reading files and folder structure
- GitHub MCP is best at issues, pull requests, commits, and branches
- docs-focused MCP is best when you need current patterns or official guidance
</details>

<details>
<summary>🔧 Common mistakes and troubleshooting</summary>

### Common mistakes

| Mistake                                        | What happens                                   | Fix                                                                                           |
| ---------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Assuming GitHub MCP must be installed manually | You waste time configuring the built-in server | Start with `/mcp show` and `/login`                                                           |
| Editing the wrong config file                  | Your server never appears where you expect it  | Use `~/.copilot/mcp-config.json` for personal setup or `.vscode/mcp.json` for workspace setup |
| Invalid JSON in the config                     | MCP servers fail to load                       | Validate the JSON carefully and remove trailing commas                                        |
| Expecting one server to do everything          | Copilot gives incomplete answers               | Use the right server for the job: GitHub, filesystem, docs, or web                            |

### Troubleshooting

- **"GitHub results are missing"** → run `/login`, then try `/mcp show` again.
- **"The server does not appear"** → restart Copilot after editing the config file.
- **"The answer still feels generic"** → ask Copilot to explicitly use repo history, files, or documentation in the same prompt.
</details>

## Key takeaways

1. **MCP** connects Copilot to trusted external systems and live data.
2. **GitHub MCP is built in**, so it is the easiest place to start.
3. **Filesystem and docs servers** become valuable as soon as you want broader context without manually attaching every file.
4. **The best MCP workflows gather context first and ask for analysis second.**
5. **Custom servers are optional** and only worth it when existing servers no longer fit your workflow.
