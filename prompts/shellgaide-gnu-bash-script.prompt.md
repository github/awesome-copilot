---
mode: agent
agent: shellgaide-gnu-bash
description: 'Generate or refactor GNU-first Bash >= 5 scripts with strict safety, Google Shell Style Guide structure, and zero ShellCheck warnings (shellgAIde)'
tools: ['createFile', 'editFiles', 'search', 'testFailure']
---

# shellgAIde — GNU-first Bash Script Prompt

Repository: https://github.com/fragolinux/shellgAIde

Follow these instructions:
- [instructions/shellgaide-gnu-bash.instructions.md](../instructions/shellgaide-gnu-bash.instructions.md)

Output requirements:
- Output ONLY working Bash code unless the user explicitly asks for explanation.
- Ensure the result would pass `shellcheck -s bash` and `shfmt -i 2 -bn -ci -sr -d`.
- Preserve behavior unless the user explicitly requests changes.

If requirements are ambiguous, ask up to 3 clarifying questions.


