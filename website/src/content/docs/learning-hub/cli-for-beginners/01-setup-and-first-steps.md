---
title: "Setup and First Steps"
description: "Experience your first real Copilot CLI wins, learn the three main modes, and work through hands-on practice and assignment tasks."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "14 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - setup
prerequisites:
  - Complete 00 · Quick Start or review the course overview.
relatedArticles:
  - ./index.md
  - ./00-quick-start.md
  - ./02-context-and-conversations.md
---

> **Watch AI find bugs instantly, explain confusing code, and generate working scripts. Then learn three different ways to use GitHub Copilot CLI.**

This chapter is where Copilot CLI starts to feel less like a novelty and more like a practical teammate. The goal is not to memorize every feature. It is to get a few immediate wins, understand the main ways to interact with the CLI, and leave with enough confidence to keep experimenting.

> **Hands-on note:** The practice tasks in this chapter assume you are using the companion repo: [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). If you are only reading in the Learning Hub, you can still follow the concepts, but the assignments are designed for that sample repo.

## Learning objectives

By the end of this chapter, you should be able to:

- experience the productivity boost Copilot CLI provides through hands-on demos
- choose the right mode for a task: Interactive, Plan, or Programmatic
- use beginner-friendly slash commands to control your sessions
- complete a small assignment that builds on a multi-turn conversation

<img src="/images/learning-hub/copilot-cli-for-beginners/01/first-copilot-experience.png" alt="Developer sitting at a desk with code on the monitor and glowing particles representing AI assistance" width="800" />

## Getting comfortable: your first prompts

Before jumping into repo-aware examples, start with a few easy prompts that need no project context at all:

```bash
copilot
```

```text
> Explain what a dataclass is in Python in simple terms

> Write a function that sorts a list of dictionaries by a specific key

> What's the difference between a list and a tuple in Python?

> Give me 5 best practices for writing clean Python code
```

If you do not use Python, swap in your language of choice. The important lesson is that Copilot CLI is conversational. You do not need special syntax to get started. Just ask naturally.

## See it in action

> **Reading the examples:** lines starting with `>` are prompts typed inside an interactive Copilot CLI session. Lines without a `>` prefix are shell commands you run in your terminal.

> **About demo output:** your wording and formatting will differ. Focus on the kind of help Copilot CLI gives, not on matching the examples exactly.

### Demo 1: Code review in seconds

If you are using the companion repo locally, start from its root:

```bash
git clone https://github.com/github/copilot-cli-for-beginners.git
cd copilot-cli-for-beginners
copilot
```

Then ask Copilot CLI to review one of the sample files:

```text
> Review @samples/book-app-project/book_app.py for code quality issues and suggest improvements
```

> **What does `@` do?** It tells Copilot CLI to read a file or directory. Chapter 02 goes deeper on that. For now, copy the prompt exactly and see what happens.

<details>
<summary>🎬 See it in action!</summary>

![Code Review Demo](/images/learning-hub/copilot-cli-for-beginners/01/code-review-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what's shown here._

</details>

**Takeaway:** A focused code review can happen in seconds, and you never had to leave the terminal.

### Demo 2: Explain confusing code

Still in the same session, try:

```text
> Explain what @samples/book-app-project/books.py does in simple terms
```

<details>
<summary>🎬 See it in action!</summary>

![Explain Code Demo](/images/learning-hub/copilot-cli-for-beginners/01/explain-code-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what's shown here._

</details>

A strong answer will not just paraphrase the file. It will explain the structure and intent in plain language, which is why this is such a good workflow for onboarding or learning a new codebase.

### Demo 3: Generate working code

Now ask for a small piece of useful code:

```text
> Write a Python function that takes a list of books and returns statistics:
  total count, number read, number unread, oldest and newest book
```

<details>
<summary>🎬 See it in action!</summary>

![Generate Code Demo](/images/learning-hub/copilot-cli-for-beginners/01/generate-code-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what's shown here._

</details>

When you are done exploring, exit with:

```text
> /exit
```

**Takeaway:** One session can move from review to explanation to code generation without starting over.

## Modes and commands

<img src="/images/learning-hub/copilot-cli-for-beginners/01/modes-and-commands.png" alt="Futuristic control panel with glowing screens, dials, and equalizers representing Copilot CLI modes and commands" width="800" />

The next beginner skill is knowing **how** to ask for help. Copilot CLI supports multiple interaction styles, and each one works best for different tasks.

## Real-world analogy: dining out

Think of Copilot CLI like going out to eat:

| Mode             | Dining analogy              | Best when...                                               |
| ---------------- | --------------------------- | ---------------------------------------------------------- |
| **Plan**         | GPS route to the restaurant | You want to map out a bigger task before changing code     |
| **Interactive**  | Talking to the waiter       | You want back-and-forth discussion and follow-up questions |
| **Programmatic** | Drive-through ordering      | You want one quick answer in the shell or a script         |

<img src="/images/learning-hub/copilot-cli-for-beginners/01/ordering-food-analogy.png" alt="Three ways to use GitHub Copilot CLI: Plan Mode, Interactive Mode, and Programmatic Mode" width="800" />

### Which mode should you start with?

Start with **Interactive mode**.

- You can experiment and ask follow-up questions
- Context builds naturally through conversation
- Mistakes are easy to correct with `/clear`

Once that feels natural, add Programmatic mode for one-shot tasks and Plan mode when you want a proposed approach before implementation.

## The three modes

### Mode 1: Interactive mode

<img src="/images/learning-hub/copilot-cli-for-beginners/01/interactive-mode.png" alt="Interactive Mode - like talking to a waiter who can answer questions and adjust the order" width="250" />

**Best for:** exploration, iteration, and multi-turn conversations.

Start an interactive session:

```bash
copilot
```

Then ask for help naturally, or use a command like:

```text
> /help
```

**Key insight:** Interactive mode maintains context. Each message builds on the previous answer.

#### Interactive example

```text
> Review @samples/book-app-project/utils.py and suggest improvements

> Add type hints to all functions

> Make the error handling more robust

> /exit
```

### Mode 2: Plan mode

<img src="/images/learning-hub/copilot-cli-for-beginners/01/plan-mode.png" alt="Plan Mode - like planning a route before a trip using GPS" width="250" />

**Best for:** tasks where you want to review the approach before any edits happen.

Use `/plan` inside a session:

```text
> /plan Add a "mark as read" command to the book app
```

A good plan usually breaks the work into steps like implementation, help text, and testing. The point is not to get a perfect plan on the first try. The point is to slow down enough to inspect the approach before you commit to it.

> **Tip:** In interactive mode, `Shift+Tab` can cycle between Interactive, Plan, and Autopilot modes.

### Mode 3: Programmatic mode

<img src="/images/learning-hub/copilot-cli-for-beginners/01/programmatic-mode.png" alt="Programmatic Mode - like using a drive-through for a quick order" width="250" />

**Best for:** automation, scripts, CI tasks, and one-shot shell output.

```bash
copilot -p "Summarize the purpose of this repository in two sentences"
```

Programmatic mode gives you one result and exits. That makes it useful for scripts, shell pipelines, and quick checks where you do not need a full conversation.

<details>
<summary>Mode rule of thumb</summary>

- Use **Interactive** when you expect follow-up questions
- Use **Plan** when you want a proposed approach before edits happen
- Use **Programmatic** when you want one answer and then move on

Autopilot exists too, but it makes more sense after you are comfortable reviewing plans and verifying results yourself.

</details>

## Essential slash commands

Start with these commands first:

| Command     | What it does                     | When to use it                            |
| ----------- | -------------------------------- | ----------------------------------------- |
| `/help`     | Shows available commands         | When you forget a command                 |
| `/clear`    | Clears the conversation          | When you switch topics                    |
| `/plan`     | Builds a step-by-step plan       | For larger features or edits              |
| `/research` | Investigates a topic more deeply | When you need background before coding    |
| `/model`    | Shows or changes model selection | When you want to inspect or switch models |
| `/exit`     | Ends the session                 | When you are done                         |

<details>
<summary>Two more commands to remember later</summary>

- `/review` runs the built-in code-review agent on current changes
- `!<command>` runs a shell command directly from inside Copilot CLI, like `!git status`

They are powerful, but they are easier to appreciate once you are already working in a repository.

</details>

## Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/01/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800" />

## ▶️ Try it yourself

### Interactive exploration

Use follow-up prompts to iteratively improve the book app:

```text
> Review @samples/book-app-project/book_app.py - what could be improved?

> Refactor the if/elif chain into a more maintainable structure

> Add type hints to all the handler functions
```

### Plan a feature

Use `/plan` to map out a feature before writing code:

```text
> /plan Add a search feature to the book app that can find books by title or author
```

Read the plan before you accept it. Does it cover the command handler, the search logic, the user prompts, and testing?

### Automate with programmatic mode

From the companion repo root, try a batch review:

```bash
for file in samples/book-app-project/*.py; do
  echo "Reviewing $file..."
  copilot --allow-all -p "Quick code quality review of @$file - critical issues only"
done
```

**PowerShell (Windows):**

```powershell
Get-ChildItem samples/book-app-project/*.py | ForEach-Object {
  $relativePath = "samples/book-app-project/$($_.Name)"
  Write-Host "Reviewing $relativePath..."
  copilot --allow-all -p "Quick code quality review of @$relativePath - critical issues only"
}
```

After the demos, try these variations:

1. **Interactive challenge:** start `copilot`, ask about `@samples/book-app-project/books.py`, then request improvements three times in a row.
2. **Plan mode challenge:** run `/plan Add rating and review features to the book app` and decide whether the plan feels complete.
3. **Programmatic challenge:** run `copilot --allow-all -p "List all functions in @samples/book-app-project/book_app.py and describe what each does"`.

## 📝 Assignment

### Main challenge: improve the book app utilities

The earlier examples focused on `book_app.py`. Now practice the same skills on a different file: `utils.py`.

1. Start a session with `copilot`
2. Ask Copilot CLI to summarize the file:
   `@samples/book-app-project/utils.py What does each function in this file do?`
3. Ask it to add input validation:
   `Add validation to get_user_choice() so it handles empty input and non-numeric entries`
4. Ask it to improve error handling:
   `What happens if get_book_details() receives an empty string for the title? Add guards for that.`
5. Ask for a docstring:
   `Add a comprehensive docstring to get_book_details() with parameter descriptions and return values`
6. Observe how context carries between prompts. Each improvement should build on the previous one.
7. Exit with `/exit`

**Success criteria:** you should end with an improved `utils.py` that has stronger input validation, clearer error handling, and a useful docstring, all built through a multi-turn conversation.

<details>
<summary>💡 Hints</summary>

**Sample prompts to try:**

```text
> @samples/book-app-project/utils.py What does each function in this file do?
> Add validation to get_user_choice() so it handles empty input and non-numeric entries
> What happens if get_book_details() receives an empty string for the title? Add guards for that.
> Add a comprehensive docstring to get_book_details() with parameter descriptions and return values
```

**Common issues:**

- If Copilot CLI asks clarifying questions, answer them naturally
- The context carries forward, so each prompt builds on the previous one
- Use `/clear` if you want to restart from a clean slate
</details>

### Bonus challenge: compare the modes

Try the same new task three ways: adding a `list_by_year()` method to the `BookCollection` class.

1. **Interactive:** ask Copilot to design and build it step by step
2. **Plan:** `/plan Add a list_by_year(start, end) method to BookCollection that filters books by publication year range`
3. **Programmatic:** `copilot --allow-all -p "@samples/book-app-project/books.py Add a list_by_year(start, end) method that returns books published between start and end year inclusive"`

**Reflection:** which mode felt most natural? When would you use each?

<details>
<summary>🔧 Common mistakes and troubleshooting</summary>

### Common mistakes

| Mistake                                          | What happens                                   | Fix                                     |
| ------------------------------------------------ | ---------------------------------------------- | --------------------------------------- |
| Typing `exit` instead of `/exit`                 | Copilot treats it as a prompt, not a command   | Start slash commands with `/`           |
| Using `-p` for a multi-turn conversation         | Each call starts fresh with no memory          | Use interactive mode for iterative work |
| Forgetting quotes around prompts with `$` or `!` | Your shell interprets special characters first | Wrap programmatic prompts in quotes     |

### Troubleshooting

**"Model not available"** — use `/model` to see what is available on your account.

**"Context too long"** — use `/clear` or start a fresh session.

**"Rate limit exceeded"** — wait a bit and try again, especially for repeated programmatic calls.

</details>

## Key takeaways

1. **Interactive mode** is for exploration and iteration. Context carries forward.
2. **Plan mode** is for reviewing an approach before implementation.
3. **Programmatic mode** is for automation and one-shot shell output.
4. A small set of slash commands gets you a long way: `/help`, `/clear`, `/plan`, and `/exit`.
