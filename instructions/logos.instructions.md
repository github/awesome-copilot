---
description: 'Write, type-check and run Logos — a small compiled language where every allocation, fallible call and release is visible in the source'
applyTo: '**/*.logos'
---

# Logos

Logos is a prefix-form language (`(fn name :type (args) body…)`) that compiles to
native Linux binaries through `logosc`, a self-hosted compiler. It is designed
for code an AI agent writes and a human still has to trust: nothing is allocated
or released implicitly, a call that can fail says so in its type, an unhandled
result is a compile error, and diagnostics are JSON carrying a stable `code` and
a `node_path`.

A frontier model has never seen Logos in training. Write it from these
instructions, not from analogy with Lisp or Scheme — the resemblance is
syntactic only, and the checker refuses most of what the analogy suggests.

## Get the compiler and use the loop

```sh
gh release download --repo abaddon/logos --pattern 'logos-*-x86_64-linux.tar.gz' --pattern SHA256SUMS
sha256sum -c SHA256SUMS && tar -xzf logos-*-x86_64-linux.tar.gz
cd logos-*-x86_64-linux && ./bin/logosc version      # logos 0.2.2
```

Then, from that directory, run `export PATH="$PWD/bin:$PATH"` once; for every change: `logosc check` (cheapest — no codegen) → `logosc build` → `logosc test`.

```sh
logosc check prog.logos                 # exit 0 clean, 2 source error, 1 I/O or toolchain
logosc check --json prog.logos          # same, diagnostics as JSON on stderr
logosc build prog.logos -o prog && ./prog
logosc test prog.logos                  # runs every (test …) node at -O0 and -O2
logosc fmt prog.logos                   # canonical formatting, in place
logosc guide --json                     # the language manifest: 96 forms, 36 codes
```

Branch on the code, never on the English:

```json
{"schema_version":1,"diagnostics":[{"severity":"error","code":"E0100","message":"let 'x' has type :i64, found :str","node_path":"bad/main/2","file":"bad.logos","line":0,"col":0}]}
```

## The shape of a file

One file is one module. `(mod name)` first, then `type` declarations,
`fn` definitions and `(test …)` nodes. There are no comments: a line starting
with `;` is `E0001 form outside parentheses`. Code explains itself or it does
not ship.

```logos
(mod hello)

(fn add :i64 ((a :i64) (b :i64))
  (ret (+ a b)))

(fn main :void ()
  (println (add 1 2)))
```

A function body is a sequence of forms. `(ret e)` returns; a function with a
`:void` return needs no `ret`. A `(test name (expect (out "…") (code 0)) body…)`
node is part of the language, not a framework — it declares the exact stdout the
body must produce, and `logosc test` runs it at both optimisation levels.

## The rules that refuse instinctive code

| Instinct | What Logos does instead |
|---|---|
| Rely on implicit conversion between widths or kinds | `E0100` — every conversion is written: `(cast :u8 n)`. `cast` truncates silently (`(cast :u8 300)` is `44`), so range-check first if truncation is not what you meant. |
| Bind a value and not use it | `E0107 unused binding` — every `let` must be read. There is no `_` for bindings; `_` is a match arm only. |
| Allocate and let the runtime reclaim it | `(make (vec :i64))` … `(vec-free v)`. You free it, exactly once. The leak report is part of the test expectations: `(leaks 0)`. |
| Pass a binding by reference with `&` or `(ref x)` at the call site | `(ref T)` is spelled **only in the signature**; the caller passes the binding itself (`(sum v)`), and it must be a `letmut` or it is `E0304`. |
| Copy a vector or a struct that owns one | It moves. A second use is `E0300 use after move`. |
| Ignore a result and move on | `E0602 unhandled result` — match it, `try` it, return it, or pass it on. |
| Assume `:str` is NUL-terminated and freely copyable | It is a pointer plus a byte count. Byte indexing only: `(str-len "é")` is `2`. `(str-concat …)` allocates memory that cannot be freed and does not appear in the leak report. |
| Sort or order strings with `<` | `E0100` — `<`/`>` are numeric. `=` and `!=` work on `:str`; ordering needs a hand-written byte comparison. |
| Return from inside an `if` branch without saying so | Every early exit is `(ret e)`; a `:T` function whose body can fall off the end is `E0105 missing return`. |

## Idioms that compile

Vectors: allocate, mutate through a `(ref …)` parameter, free in the owner.

```logos
(mod vectors)

(fn total :i64 ((v (ref (vec :i64))))
  (letmut i :i64 0)
  (letmut sum :i64 0)
  (while (< i (vec-len v))
    (set sum (+ sum (vec-get v i)))
    (set i (+ i 1)))
  (ret sum))

(fn main :void ()
  (letmut v (vec :i64) (make (vec :i64)))
  (vec-push v 10)
  (vec-push v 32)
  (println (total v))
  (vec-free v))
```

Results: the error type is an enum you declare, and `try` unwraps or returns.

```logos
(mod results)

(type parse-error (enum (bad :i64) (empty)))

(fn checked :(res :i64 parse-error) ((n :i64))
  (if (> n 0)
    (ret (ok n))
    (ret (err (bad n)))))

(fn doubled :(res :i64 parse-error) ((n :i64))
  (ret (ok (* 2 (try (checked n))))))

(fn main :void ()
  (match (doubled 21)
    ((ok v) (println v))
    ((err _) (println 0))))
```

Optionals, structs and tests, in one program with the expectations it carries.

```logos
(mod account)

(type account
  (struct
    (id :i64)
    (name :str)))

(fn find :(opt :i64) ((a account) (wanted :str))
  (if (str-eq (get a name) wanted)
    (ret (some (get a id)))
    (ret (none))))

(fn main :void ()
  (let a account (make account 7 "ada"))
  (match (find a "ada")
    ((some id) (println id))
    ((none) (println 0))))

(test account
  (expect (out "7\n0\n") (code 0) (leaks 0))
  (let a account (make account 7 "ada"))
  (match (find a "ada")
    ((some id) (println id))
    ((none) (println 0)))
  (match (find a "grace")
    ((some id) (println id))
    ((none) (println 0))))
```

Read files and arguments with the stdlib: `(args)` returns `(vec :str)`,
`(io-read path)` returns the whole file as `:str` and panics `R0007` if it cannot
be read, `(io-create path)`/`(io-write fd s)`/`(io-close fd)` write one, and
`string-split`/`string-join`/`string-find` are in `str`. Map, spawn, mutex and
atomics exist too; `logosc guide --json` is the complete list, and the compiler
refuses anything that is not in it.

## Working on a codebase written in Logos

- Run `logosc check` before reasoning about a failure; it is the cheapest
  signal and it never links.
- A diagnostic is a `code`, a `message` and a `node_path` such as
  `account/main/2` — the path is `module/function/index-of-form-in-body`, so it
  points at a form, not a line. `logosc show FILE PATH` prints that node
  canonically, which is usually all you need to see what the parser saw.
- `E0100` covers a family of mismatch errors; read the `message` for which two
  types met, then fix the type — do not cast to silence it.
- Before writing a loop that sorts or searches strings, check
  [`docs/reference/limits.md`](https://github.com/abaddon/logos/blob/main/docs/reference/limits.md):
  several conveniences do not exist yet, and inventing them produces `E0103
  unknown function` rather than a hint.
- Determinism is a guarantee, not a hope: two builds of one source are
  byte-identical, and a program's output must be identical at `-O0` and `-O2`.
  A change that behaves differently under optimisation is a bug, not a tuning
  opportunity.

## Where the truth is

- [`docs/quickstart.md`](https://github.com/abaddon/logos/blob/main/docs/quickstart.md) — five commands, both install routes, every output verified.
- [`docs/LOGOS.md`](https://github.com/abaddon/logos/blob/main/docs/LOGOS.md) — the generated manual: cheat sheet and 20 executable chapters.
- [`docs/reference/language.md`](https://github.com/abaddon/logos/blob/main/docs/reference/language.md) — the subset, the ten rules mapped to the checker, one verified idiom per feature.
- [`docs/reference/diagnostics.md`](https://github.com/abaddon/logos/blob/main/docs/reference/diagnostics.md) — every code and its node path.
- [`examples/agent-gate/`](https://github.com/abaddon/logos/tree/main/examples/agent-gate) — a 174-line program an agent wrote, with the rough edges it hit.
