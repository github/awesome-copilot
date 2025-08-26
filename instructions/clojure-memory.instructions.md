---
description: 'Things agents tend to forget or get wrong when they are working with Clojure projects.'
applyTo: '**/*.clj*,**/*.bb'
---

# Clojure Memory

## Docstring placement in function definitions (`defn`)

The docstring goes after the symbol/function name, and before the argument vector.

### ❌ Incorrect:
```clojure
(defn my-function
  [arg1 arg2]
  "This function does something."
  ;; function body
  )
```

### ✅ Correct:
```clojure
(defn my-function
  "This function does something."
  [arg1 arg2]
  ;; function body
  )
```

## Editing Clojure files

Remember to develop solutions in the repl before editing files. However, even as an interactive programmer, now and then you do edit files. And when you do, you use structural editing tools, like `replace_top_level_form`, and `insert_top_level_form`. **Always read the instructions for these tools before using them**. If you are appending to a file, use the built in editing tool.

### Define functions before using them

The Clojure compiler needs functions to be defined before they are used. Prefer placing functions in the correct order over using `declare` (which is sometimes necessary, but most often `declare` is just cheating).

## Creating Clojure files

Use the `create_file` tool to create files with empty content `""`.

#### Clojure Namespace and Filename Convention:

**Important**: In Clojure,  namespace names use kebab-case while filenames use snake_case. For example:
- Namespace: `my.project.multi-word-namespace`
- Filename: `my/project/multi_word_namespace.clj(s|c)`

Always convert dashes in namespace names to underscores in the corresponding filename.

### Create empty files, then add content

For you to create files and add content safely/predictably, follow this process:

1. **Always create empty files first** - Use `create_file` with empty content `""`
2. Read the content of the file created (default content may have been added)
3. **Use structural editing tools** to edit the file

## Namespace Reloading in the REPL

When working in the REPL after editing files, you need to reload namespaces to ensure your changes are reflected in the REPL.

```clojure
;; Reload just the specified namespace
(require 'my.namespace :reload)
```

## When the bracket balance is off

When you have a situation where e.g. the problem tool or Clojure compiler complains about missing brackets or anything suggesting the bracket balance is off:
* Instead of going ahead trying to fix it, **use the tool for requesting human input to ask for guidance/help.**

## Reading from stdin

Reading from stdin (e.g. `(read-line)`) will prompt the user with a VS Code input box. Be aware of this when evaluating code that may read from stdin.

### With Babashka, reading from stdin blocks the repl

Babashka's nrepl server does not yet support the stdin protocol. Avoid evaluating code that reads from stdin with the Babashka repl.

**If REPL hangs**: Ask user to restart REPL.

## Happy Interactive Programming

Remember to prefer the REPL in your work. Keep in mind that the user does not see what you evaluate. Nor the results. Communicate with the user in the chat about what you evaluate and what you get back.
