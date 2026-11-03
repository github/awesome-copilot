---
name: faber-language
description: 'Write, check and run Faber (.fab) programs. Faber is an experimental, statically typed language for coding agents and human authors that compiles to Rust, TypeScript, Go and more. Use when the user asks for Faber code, mentions .fab files or the faber CLI, or needs a faber check diagnostic explained. Defers to the live faberlang.dev agent docs because syntax can change between minor releases.'
---

# Faber Language

Faber (full name Faber Romanus) is a statically typed language for coding agents and human authors. It has a clear mechanical grammar, explicit static and generic types, and math-oriented operators. The same program can be read in eight human languages, and it compiles to Rust, TypeScript, Go, Swift and more.

Faber is experimental through version 1.x. Breaking changes ship in minor releases, and a model's training data will not contain current Faber, so this skill points at the live docs instead of restating rules that may change.

## When to Use This Skill

- The user asks you to write, review or fix `.fab` source.
- A `faber check` or `faber run` diagnostic needs explaining.
- The user wants Faber code emitted to another language (for example Rust or TypeScript).

## Workflow

### 1. Load the current rules

Fetch https://faberlang.dev/llms.txt, then the writing guide it names (https://faberlang.dev/agents/index.md), and follow only the links that page lists. Do not write Faber from memory of other languages.

### 2. Confirm the CLI is installed

Run `faber --version`. If it is missing, tell the user and point them to https://faberlang.dev/install.md, which installs a checksum-verified release binary (macOS arm64 and Linux x64 only). Do not install software without the user's consent.

### 3. Write in the English reader spelling

Key signals of the English spelling:

- Types come before names: `string name`, `int n`.
- Functions: `fn name(int a) → int`.
- `←` binds a value; `≡` tests equality; `=` is not assignment.
- Absence is a type: `int ∪ none`, and the missing value is `null`.
- A function's error channel is declared with `⇥` and raised with `throw`; `⊥` supplies a fallback value.
- Comments are a `#` line on its own.

### 4. Check, then run

Run `faber check file.fab` until it prints `ok`, then `faber run file.fab` to execute it on the reference interpreter. Use `faber explain <CODE>` for any diagnostic code. To see the program in another language, run `faber emit -t rust file.fab` (or `ts`, `go`). Run `faber targets` to see which targets the installed binary supports.

## Examples

### Error channel and fallback

```text
fn divide(int a, int b) → int ⇥ string {
    if b ≡ 0 then throw "division by zero"
    return a / b
}

main {
    let list<string> names ← ["Ana", "Ben"]
    for from names let name {
        print "Salve, §!"(name)
    }
    print divide(7, 0) ⊥ -1
}
```

`faber run` prints `Salve, Ana!`, `Salve, Ben!`, then `-1`.

### Generics and absence

```text
fn first<T>(list<T> items, T fallback) → T {
    return items.get(0) coalesce fallback
}

main {
    let int ∪ none maybe ← null
    print first([3, 4], 0)
    print maybe coalesce 42
}
```

`faber run` prints `3`, then `42`.

## Rules of Thumb

- Fetch the live writing guide before writing non-trivial code.
- Run `faber check` after every edit and fix diagnostics before running.
- Keep one reader locale per source file.
- Don't write `name: T`, `int?`, `//` comments, or a `#` comment after code on the same line.
- Don't assume a construct is supported on every emit target; unsupported constructs are rejected at emit time.

## Limitations

- Faber is experimental through 1.x; syntax and standard library names change between minor releases.
- Release binaries exist for macOS arm64 and Linux x64 only.
- The front end, runner, standard library and grammar are open source (MIT OR Apache-2.0) at https://github.com/faberlang/faber; some code generators ship only in the official release binary.

## Safety

- Installing the CLI downloads a binary from GitHub releases; https://faberlang.dev/install.md verifies its SHA-256 before use. Ask the user before installing anything.
- `faber check`, `faber run` and `faber emit` read local files, and `faber run` executes the program on the local interpreter; only run programs you have read.
