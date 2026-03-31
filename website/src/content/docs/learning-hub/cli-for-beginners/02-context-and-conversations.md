---
title: '02 · Context and Conversations'
description: 'Learn how to give Copilot CLI richer context and build stronger multi-turn conversations.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-20
---

![Chapter 02: Context and Conversations](/images/learning-hub/copilot-cli-for-beginners/02/chapter-header.png)

> **What if AI could see your entire codebase, not just one file at a time?**

In this chapter, you'll unlock the real power of GitHub Copilot CLI: context. You'll learn to use the `@` syntax to reference files and directories, giving Copilot CLI deep understanding of your codebase. You'll discover how to maintain conversations across sessions, resume work days later exactly where you left off, and see how cross-file analysis catches bugs that single-file reviews miss entirely.

## 🎯 Learning Objectives

By the end of this chapter, you'll be able to:

- Use the `@` syntax to reference files, directories, and images
- Resume previous sessions with `--resume` and `--continue`
- Understand how [context windows](https://github.com/github/copilot-cli-for-beginners/blob/main/GLOSSARY.md#context-window) work
- Write effective multi-turn conversations
- Manage directory permissions for multi-project workflows

> ⏱️ **Estimated Time**: ~50 minutes (20 min reading + 30 min hands-on)

---

## 🧩 Real-World Analogy: Working with a Colleague

<img src="/images/learning-hub/copilot-cli-for-beginners/02/colleague-context-analogy.png" alt="Context Makes the Difference - Without vs With Context" width="800"/>

*Just like your colleagues, Copilot CLI isn't a mind reader. Providing more information helps humans and Copilot alike provide targeted support!*

Imagine explaining a bug to a colleague:

> **Without context**: "The book app doesn't work."

> **With context**: "Look at `books.py`, especially the `find_book_by_title` function. It's not doing case-insensitive matching."

To provide context to Copilot CLI use *the `@` syntax* to point Copilot CLI at specific files.

---

# Essential: Basic Context

<img src="/images/learning-hub/copilot-cli-for-beginners/02/essential-basic-context.png" alt="Glowing code blocks connected by light trails representing how context flows through Copilot CLI conversations" width="800"/>

This section covers everything you need to work effectively with context. Master these basics first.

---

## The @ Syntax

The `@` symbol references files and directories in your prompts. It's how you tell Copilot CLI "look at this file."

> 💡 **Note**: All examples in this course use the `samples/` folder included in this repository, so you can try every command directly.

### Try It Now (No Setup Required)

You can try this with any file on your computer:

```bash
copilot

# Point at any file you have
> Explain what @package.json does
> Summarize @README.md
> What's in @.gitignore and why?
```

> 💡 **Don't have a project handy?** Create a quick test file:
> ```bash
> echo "def greet(name): return 'Hello ' + name" > test.py
> copilot
> > What does @test.py do?
> ```

### Basic @ Patterns

| Pattern | What It Does | Example Use |
|---------|--------------|-------------|
| `@file.py` | Reference a single file | `Review @samples/book-app-project/books.py` |
| `@folder/` | Reference all files in a directory | `Review @samples/book-app-project/` |
| `@file1.py @file2.py` | Reference multiple files | `Compare @samples/book-app-project/book_app.py @samples/book-app-project/books.py` |

### Reference a Single File

```bash
copilot

> Explain what @samples/book-app-project/utils.py does
```

---

<details>
<summary>🎬 See it in action!</summary>

![File Context Demo](/images/learning-hub/copilot-cli-for-beginners/02/file-context-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### Reference Multiple Files

```bash
copilot

> Compare @samples/book-app-project/book_app.py and @samples/book-app-project/books.py for consistency
```

### Reference an Entire Directory

```bash
copilot

> Review all files in @samples/book-app-project/ for error handling
```

---

## Cross-File Intelligence

This is where context becomes a superpower. Single-file analysis is useful. Cross-file analysis is transformative.

<img src="/images/learning-hub/copilot-cli-for-beginners/02/cross-file-intelligence.png" alt="Cross-File Intelligence - comparing single-file vs cross-file analysis showing how analyzing files together reveals bugs, data flow, and patterns invisible in isolation" width="800"/>

### Demo: Find Bugs That Span Multiple Files

```bash
copilot

> @samples/book-app-project/book_app.py @samples/book-app-project/books.py
>
> How do these files work together? What's the data flow?
```

> 💡 **Advanced Option**: For security-focused cross-file analysis, try the Python security examples:
> ```bash
> > @samples/buggy-code/python/user_service.py @samples/buggy-code/python/payment_processor.py
> > Find security vulnerabilities that span BOTH files
> ```

---

<details>
<summary>🎬 See it in action!</summary>

![Multi-File Demo](/images/learning-hub/copilot-cli-for-beginners/02/multi-file-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

**What Copilot CLI discovers**:

```
Cross-Module Analysis
=====================

1. DATA FLOW PATTERN
   book_app.py creates BookCollection instance and calls methods
   books.py defines BookCollection class and manages data persistence

   Flow: book_app.py (UI) → books.py (business logic) → data.json (storage)

2. DUPLICATE DISPLAY FUNCTIONS
   book_app.py:9-21    show_books() function
   utils.py:28-36      print_books() function

   Impact: Two nearly identical functions doing the same thing. If you update
   one (like changing the format), you must remember to update the other.

3. INCONSISTENT ERROR HANDLING
   book_app.py handles ValueError from year conversion
   books.py silently returns None/False on errors

   Pattern: No unified approach to error handling across modules
```

**Why this matters**: A single-file review would miss the bigger picture. Only cross-file analysis reveals:
- **Duplicate code** that should be consolidated
- **Data flow patterns** showing how components interact
- **Architectural issues** that affect maintainability

---

### Demo: Understand a Codebase in 60 Seconds

<img src="/images/learning-hub/copilot-cli-for-beginners/02/codebase-understanding.png" alt="Split-screen comparison showing manual code review taking 1 hour versus AI-assisted analysis taking 10 seconds" width="800" />

New to a project? Learn about it quickly using Copilot CLI.

```bash
copilot

> @samples/book-app-project/
>
> In one paragraph, what does this app do and what are its biggest quality issues?
```

**What you get**:
```
This is a CLI book collection manager that lets users add, list, remove, and
search books stored in a JSON file. The biggest quality issues are:

1. Duplicate display logic - show_books() and print_books() do the same thing
2. Inconsistent error handling - some errors raise exceptions, others return False
3. No input validation - year can be 0, empty strings accepted for title/author
4. Missing tests - no test coverage for critical functions like find_book_by_title

Priority fix: Consolidate duplicate display functions and add input validation.
```

**Result**: What takes an hour of code reading compressed into 10 seconds. You know exactly where to focus.

---

## Practical Examples

### Example 1: Code Review with Context

```bash
copilot

> @samples/book-app-project/books.py Review this file for potential bugs

# Copilot CLI now has the full file content and can give specific feedback:
# "Line 49: Case-sensitive comparison may miss books..."
# "Line 29: JSON decode errors are caught but data corruption isn't logged..."

> What about @samples/book-app-project/book_app.py?

# Now reviewing book_app.py, but still aware of books.py context
```

### Example 2: Understanding a Codebase

```bash
copilot

> @samples/book-app-project/books.py What does this module do?

# Copilot CLI reads books.py and understands the BookCollection class

> @samples/book-app-project/ Give me an overview of the code structure

# Copilot CLI scans the directory and summarizes

> How does the app save and load books?

# Copilot CLI can trace through the code it's already seen
```

<details>
<summary>🎬 See a multi-turn conversation in action!</summary>

![Multi-Turn Demo](/images/learning-hub/copilot-cli-for-beginners/02/multi-turn-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

### Example 3: Multi-File Refactoring

```bash
copilot

> @samples/book-app-project/book_app.py @samples/book-app-project/utils.py
> I see duplicate display functions: show_books() and print_books(). Help me consolidate these.

# Copilot CLI sees both files and can suggest how to merge the duplicate code
```

---

## Session Management

Sessions are automatically saved as you work. You can resume previous sessions to continue where you left off.

### Sessions Auto-Save

Every conversation is automatically saved. Just exit normally:

```bash
copilot

> @samples/book-app-project/ Let's improve error handling across all modules

[... do some work ...]

> /exit
```

### Resume the Most Recent Session

```bash
# Continue where you left off
copilot --continue
```

### Resume a Specific Session

```bash
# Pick from a list of sessions interactively
copilot --resume

# Or resume a specific session by ID
copilot --resume abc123
```

> 💡 **How do I find a session ID?** You don't need to memorize them. Running `copilot --resume` without an ID shows an interactive list of your previous sessions, their names, IDs, and when they were last active. Just pick the one you want.
>
> **What about multiple terminals?** Each terminal window is its own session with its own context. If you have Copilot CLI open in three terminals, that's three separate sessions. Running `--resume` from any terminal lets you browse all of them. The `--continue` flag grabs whichever session was closed most recently, no matter which terminal it was in.
>
> **Can I switch sessions without restarting?** Yes. Use the `/resume` slash command from inside an active session:
> ```
> > /resume
> # Shows a list of sessions to switch to
> ```

### Organize Your Sessions

Give sessions meaningful names so you can find them later:

```bash
copilot

> /rename book-app-review
# Session renamed for easier identification
```

### Check and Manage Context

As you add files and conversation, Copilot CLI's [context window](https://github.com/github/copilot-cli-for-beginners/blob/main/GLOSSARY.md#context-window) fills up. Two commands help you stay in control:

```bash
copilot

> /context
Context usage: 45,000 / 128,000 tokens (35%)

> /clear
# Wipes context and starts fresh. Use when switching topics
```

> 💡 **When to use `/clear`**: If you've been reviewing `books.py` and want to switch to discussing `utils.py`, run `/clear` first. Otherwise stale context from the old topic may confuse responses.

---

### Pick Up Where You Left Off

<img src="/images/learning-hub/copilot-cli-for-beginners/02/session-persistence-timeline.png" alt="Timeline showing how GitHub Copilot CLI sessions persist across days - start on Monday, resume on Wednesday with full context restored" width="800"/>

*Sessions auto-save when you exit. Resume days later with full context: files, issues, and progress all remembered.*

Imagine this workflow across multiple days:

```bash
# Monday: Start book app review
copilot

> /rename book-app-review
> @samples/book-app-project/books.py
> Review and number all code quality issues

Quality Issues Found:
1. Duplicate display functions (book_app.py & utils.py) - MEDIUM
2. No input validation for empty strings - MEDIUM
3. Year can be 0 or negative - LOW
4. No type hints on all functions - LOW
5. Missing error logging - LOW

> Fix issue #1 (duplicate functions)
# Work on the fix...

> /exit
```

```bash
# Wednesday: Resume exactly where you left off
copilot --continue

> What issues remain unfixed from our book app review?

Remaining issues from our book-app-review session:
2. No input validation for empty strings - MEDIUM
3. Year can be 0 or negative - LOW
4. No type hints on all functions - LOW
5. Missing error logging - LOW

Issue #1 (duplicate functions) was fixed on Monday.

> Let's tackle issue #2 next
```

**What makes this powerful**: Days later, Copilot CLI remembers:
- The exact file you were working on
- The numbered list of issues
- Which ones you've already addressed
- The context of your conversation

No re-explaining. No re-reading files. Just continue working.

---

**🎉 You now know the essentials!** The `@` syntax, session management (`--continue`/`--resume`/`/rename`), and context commands (`/context`/`/clear`) are enough to be highly productive. Everything below is optional. Return to it when you're ready.

---

# Optional: Going Deeper

<img src="/images/learning-hub/copilot-cli-for-beginners/02/optional-going-deeper.png" alt="Abstract crystal cave in blue and purple tones representing deeper exploration of context concepts" width="800"/>

These topics build on the essentials above. **Pick what interests you, or skip ahead to [Practice](#practice).**

| I want to learn about... | Jump to |
|---|---|
| Wildcard patterns and advanced session commands | [Additional @ Patterns & Session Commands](#additional-patterns) |
| Building on context across multiple prompts | [Context-Aware Conversations](#context-aware-conversations) |
| Token limits and `/compact` | [Understanding Context Windows](#understanding-context-windows) |
| How to pick the right files to reference | [Choosing What to Reference](#choosing-what-to-reference) |
| Analyzing screenshots and mockups | [Working with Images](#working-with-images) |

<details>
<summary><strong>Additional @ Patterns & Session Commands</strong></summary>
<a id="additional-patterns"></a>

### Additional @ Patterns

For power users, Copilot CLI supports wildcard patterns and image references:

| Pattern | What It Does |
|---------|--------------|
| `@folder/*.py` | All .py files in folder |
| `@**/test_*.py` | Recursive wildcard: find all test files anywhere |
| `@image.png` | Image file for UI review |

```bash
copilot

> Find all TODO comments in @samples/book-app-project/**/*.py
```

### View Session Info

```bash
copilot

> /session
# Shows current session details and workspace summary

> /usage
# Shows session metrics and statistics
```

### Share Your Session

```bash
copilot

> /share file ./my-session.md
# Exports session as a markdown file

> /share gist
# Creates a GitHub gist with the session
```

</details>

<details>
<summary><strong>Context-Aware Conversations</strong></summary>
<a id="context-aware-conversations"></a>

### Context-Aware Conversations

The magic happens when you have multi-turn conversations that build on each other.

#### Example: Progressive Enhancement

```bash
copilot

> @samples/book-app-project/books.py Review the BookCollection class

Copilot CLI: "The class looks functional, but I notice:
1. Missing type hints on some methods
2. No validation for empty title/author
3. Could benefit from better error handling"

> Add type hints to all methods

Copilot CLI: "Here's the class with complete type hints..."
[Shows typed version]

> Now improve error handling

Copilot CLI: "Building on the typed version, here's improved error handling..."
[Adds validation and proper exceptions]

> Generate tests for this final version

Copilot CLI: "Based on the class with types and error handling..."
[Generates comprehensive tests]
```

Notice how each prompt builds on the previous work. This is the power of context.

</details>

<details>
<summary><strong>Understanding Context Windows</strong></summary>
<a id="understanding-context-windows"></a>

### Understanding Context Windows

You already know `/context` and `/clear` from the essentials. Here's the deeper picture of how context windows work.

Every AI has a "context window," which is the amount of text it can consider at once.

<img src="/images/learning-hub/copilot-cli-for-beginners/02/context-window-visualization.png" alt="Context Window Visualization" width="800"/>

*The context window is like a desk: it can only hold so much at once. Files, conversation history, and system prompts all take space.*

#### What Happens at the Limit

```bash
copilot

> /context

Context usage: 45,000 / 128,000 tokens (35%)

# As you add more files and conversation, this grows

> @large-codebase/

Context usage: 120,000 / 128,000 tokens (94%)

# Warning: Approaching context limit

> @another-large-file.py

Context limit reached. Older context will be summarized.
```

#### The `/compact` Command

When your context is getting full but you don't want to lose the conversation, `/compact` summarizes your history to free up tokens:

```bash
copilot

> /compact
# Summarizes conversation history, freeing up context space
# Your key findings and decisions are preserved
```

#### Context Efficiency Tips

| Situation | Action | Why |
|-----------|--------|-----|
| Starting new topic | `/clear` | Removes irrelevant context |
| Long conversation | `/compact` | Summarizes history, frees tokens |
| Need specific file | `@file.py` not `@folder/` | Loads only what you need |
| Hitting limits | Start new session | Fresh 128K context |
| Multiple topics | Use `/rename` per topic | Easy to resume right session |

#### Best Practices for Large Codebases

1. **Be specific**: `@samples/book-app-project/books.py` instead of `@samples/book-app-project/`
2. **Clear between topics**: Use `/clear` when switching focus
3. **Use `/compact`**: Summarize conversation to free up context
4. **Use multiple sessions**: One session per feature or topic

</details>

<details>
<summary><strong>Choosing What to Reference</strong></summary>
<a id="choosing-what-to-reference"></a>

### Choosing What to Reference

Not all files are equal when it comes to context. Here's how to choose wisely:

#### File Size Considerations

| File Size | Approximate [Tokens](https://github.com/github/copilot-cli-for-beginners/blob/main/GLOSSARY.md#token) | Strategy |
|-----------|-------------------|----------|
| Small (<100 lines) | ~500-1,500 tokens | Reference freely |
| Medium (100-500 lines) | ~1,500-7,500 tokens | Reference specific files |
| Large (500+ lines) | 7,500+ tokens | Be selective, use specific files |
| Very Large (1000+ lines) | 15,000+ tokens | Consider splitting or targeting sections |

**Concrete examples:**
- The book app's 4 Python files combined ≈ 2,000-3,000 tokens
- A typical Python module (200 lines) ≈ 3,000 tokens
- A Flask API file (400 lines) ≈ 6,000 tokens
- Your package.json ≈ 200-500 tokens
- A short prompt + response ≈ 500-1,500 tokens

> 💡 **Quick estimate for code:** Multiply lines of code by ~15 to get approximate tokens. Keep in mind this is only an estimate.

#### What to Include vs. Exclude

**High value** (include these):
- Entry points (`book_app.py`, `main.py`, `app.py`)
- The specific files you're asking about
- Files directly imported by your target file
- Configuration files (`requirements.txt`, `pyproject.toml`)
- Data models or dataclasses

**Lower value** (consider excluding):
- Generated files (compiled output, bundled assets)
- Node modules or vendor directories
- Large data files or fixtures
- Files unrelated to your question

#### The Specificity Spectrum

```
Less specific ────────────────────────► More specific
@samples/book-app-project/                      @samples/book-app-project/books.py:47-52
     │                                       │
     └─ Scans everything                     └─ Just what you need
        (uses more context)                      (preserves context)
```

**When to go broad** (`@samples/book-app-project/`):
- Initial codebase exploration
- Finding patterns across many files
- Architecture reviews

**When to go specific** (`@samples/book-app-project/books.py`):
- Debugging a particular issue
- Code review of a specific file
- Asking about a single function

#### Practical Example: Staged Context Loading

```bash
copilot

# Step 1: Start with structure
> @package.json What frameworks does this project use?

# Step 2: Narrow based on answer
> @samples/book-app-project/ Show me the project structure

# Step 3: Focus on what matters
> @samples/book-app-project/books.py Review the BookCollection class

# Step 4: Add related files only as needed
> @samples/book-app-project/book_app.py @samples/book-app-project/books.py How does the CLI use the BookCollection?
```

This staged approach keeps context focused and efficient.

</details>

<details>
<summary><strong>Working with Images</strong></summary>
<a id="working-with-images"></a>

### Working with Images

You can include images in your conversations using the `@` syntax, or simply **paste from your clipboard** (Cmd+V / Ctrl+V). Copilot CLI can analyze screenshots, mockups, and diagrams to help with UI debugging, design implementation, and error analysis.

```bash
copilot

> @images/screenshot.png What is happening in this image?

> @images/mockup.png Write the HTML and CSS to match this design. Place it in a new file called index.html and put the CSS in styles.css.
```

> 📖 **Learn more**: See [Additional Context Features](https://github.com/github/copilot-cli-for-beginners/blob/main/appendices/additional-context.md#working-with-images) for supported formats, practical use cases, and tips for combining images with code.

</details>

---

# Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/02/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800"/>

Time to apply your context and session management skills.

---

## ▶️ Try It Yourself

### Full Project Review

The course includes sample files you can review directly. Start copilot and run the prompt shown next:

```bash
copilot

> @samples/book-app-project/ Give me a code quality review of this project

# Copilot CLI will identify issues like:
# - Duplicate display functions
# - Missing input validation
# - Inconsistent error handling
```

> 💡 **Want to try with your own files?** Create a small Python project (`mkdir -p my-project/src`), add some .py files, then use `@my-project/src/` to review them. You can ask copilot to create sample code for you if you'd like!

### Session Workflow

```bash
copilot

> /rename book-app-review
> @samples/book-app-project/books.py Let's add input validation for empty titles

[Copilot CLI suggests validation approach]

> Implement that fix
> Now consolidate the duplicate display functions in @samples/book-app-project/
> /exit

# Later - resume where you left off
copilot --continue

> Generate tests for the changes we made
```

---

After completing the demos, try these variations:

1. **Cross-File Challenge**: Analyze how book_app.py and books.py work together:
   ```bash
   copilot
   > @samples/book-app-project/book_app.py @samples/book-app-project/books.py
   > What's the relationship between these files? Are there any code smells?
   ```

2. **Session Challenge**: Start a session, name it with `/rename my-first-session`, work on something, exit with `/exit`, then run `copilot --continue`. Does it remember what you were doing?

3. **Context Challenge**: Run `/context` mid-session. How many tokens are you using? Try `/compact` and check again. (See [Understanding Context Windows](#understanding-context-windows) in Going Deeper for more on `/compact`.)

**Self-Check**: You understand context when you can explain why `@folder/` is more powerful than opening each file individually.

---

## 📝 Assignment

### Main Challenge: Trace the Data Flow

The hands-on examples focused on code quality reviews and input validation. Now practice the same context skills on a different task, tracing how data moves through the app:

1. Start an interactive session: `copilot`
2. Reference `books.py` and `book_app.py` together:
   `@samples/book-app-project/books.py @samples/book-app-project/book_app.py Trace how a book goes from user input to being saved in data.json. What functions are involved at each step?`
3. Bring in the data file for additional context:
   `@samples/book-app-project/data.json What happens if this JSON file is missing or corrupted? Which functions would fail?`
4. Ask for a cross-file improvement:
   `@samples/book-app-project/books.py @samples/book-app-project/utils.py Suggest a consistent error-handling strategy that works across both files.`
5. Rename the session: `/rename data-flow-analysis`
6. Exit with `/exit`, then resume with `copilot --continue` and ask a follow-up question about the data flow

**Success criteria**: You can trace data across multiple files, resume a named session, and get cross-file suggestions.

<details>
<summary>💡 Hints (click to expand)</summary>

**Getting started:**
```bash
cd /path/to/copilot-cli-for-beginners
copilot
> @samples/book-app-project/books.py @samples/book-app-project/book_app.py Trace how a book goes from user input to being saved in data.json.
> @samples/book-app-project/data.json What happens if this file is missing or corrupted?
> /rename data-flow-analysis
> /exit
```

Then resume with: `copilot --continue`

**Useful commands:**
- `@file.py` - Reference a single file
- `@folder/` - Reference all files in a folder (note the trailing `/`)
- `/context` - Check how much context you're using
- `/rename <name>` - Name your session for easy resuming

</details>

### Bonus Challenge: Context Limits

1. Reference all the book app files at once with `@samples/book-app-project/`
2. Ask several detailed questions about different files (`books.py`, `utils.py`, `book_app.py`, `data.json`)
3. Run `/context` to see usage. How quickly does it fill up?
4. Practice using `/compact` to reclaim space, then continue the conversation
5. Try being more specific with file references (e.g., `@samples/book-app-project/books.py` instead of the whole folder) and see how it affects context usage

---

<details>
<summary>🔧 <strong>Common Mistakes & Troubleshooting</strong> (click to expand)</summary>

### Common Mistakes

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Forgetting `@` before filenames | Copilot CLI treats "books.py" as plain text | Use `@samples/book-app-project/books.py` to reference files |
| Expecting sessions to persist automatically | Starting `copilot` fresh loses all previous context | Use `--continue` (last session) or `--resume` (pick a session) |
| Referencing files outside current directory | "Permission denied" or "File not found" errors | Use `/add-dir /path/to/directory` to grant access |
| Not using `/clear` when switching topics | Old context confuses responses about the new topic | Run `/clear` before starting a different task |

### Troubleshooting

**"File not found" errors** - Make sure you're in the correct directory:

```bash
pwd  # Check current directory
ls   # List files

# Then start copilot and use relative paths
copilot

> Review @samples/book-app-project/books.py
```

**"Permission denied"** - Add the directory to your allowed list:

```bash
copilot --add-dir /path/to/directory

# Or in a session:
> /add-dir /path/to/directory
```

**Context fills up too quickly**:
- Be more specific with file references
- Use `/clear` between different topics
- Split work across multiple sessions

</details>

---

# Summary

## 🔑 Key Takeaways

1. **`@` syntax** gives Copilot CLI context about files, directories, and images
2. **Multi-turn conversations** build on each other as context accumulates
3. **Sessions auto-save**: use `--continue` or `--resume` to pick up where you left off
4. **Context windows** have limits: manage them with `/context`, `/clear`, and `/compact`
5. **Permission flags** (`--add-dir`, `--allow-all`) control multi-directory access. Use them wisely!
6. **Image references** (`@screenshot.png`) help debug UI issues visually

> 📚 **Official Documentation**: [Use Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli) for the complete reference on context, sessions, and working with files.

> 📋 **Quick Reference**: See the [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) for a complete list of commands and shortcuts.

---

## ➡️ What's Next

Now that you can give Copilot CLI context, let's put it to work on real development tasks. The context techniques you just learned (file references, cross-file analysis, and session management) are the foundation for the powerful workflows in the next chapter.

In **[Chapter 03: Development Workflows](../03-development-workflows/)**, you'll learn:

- Code review workflows
- Refactoring patterns
- Debugging assistance
- Test generation
- Git integration

---
