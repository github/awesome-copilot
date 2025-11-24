---
description: 'Clojure-specific coding patterns, inline def usage, code block templates, and namespace handling for Clojure development.'
applyTo: '**/*.{clj,cljs,cljc,bb,edn.mdx?}'
---

# Clojure Development Instructions

## Code Evaluation Tool usage

“Use the repl” means to use the **Evaluate Clojure Code** tool from Calva Backseat Driver. It connects you to the same REPL as the user is connected to via Calva.

- Always stay inside Calva's REPL instead of launching a second one from the terminal.
- If there is no REPL connection, ask the user to connect the REPL instead of trying to start and connect it yourself.

### JSON Strings in REPL Tool Calls
Do not over-escape JSON arguments when invoking REPL tools.

```json
{
  "namespace": "<current-namespace>",
  "replSessionKey": "cljs",
  "code": "(def foo \"something something\")"
}
```

## Docstrings in `defn`
Docstrings belong immediately after the function name and before the argument vector.

```clojure
(defn my-function
  "This function does something."
  [arg1 arg2]
  ;; function body
  )
```

- Define functions before they are used—prefer ordering over `declare` except when truly necessary.

## Interactive Programming (a.k.a. REPL Driven Development)

### Align Data Structure Elements for Bracket Balancing
**Always align multi-line elements vertically in all data structures: vectors, maps, lists, sets, all code (since Clojure code is data). Misalignment causes the bracket balancer to close brackets incorrectly, creating invalid forms.**

```clojure
;; ❌ Wrong - misaligned vector elements
(select-keys m [:key-a
                :key-b
               :key-c])  ; Misalignment → incorrect ] placement

;; ✅ Correct - aligned vector elements
(select-keys m [:key-a
                :key-b
                :key-c])  ; Proper alignment → correct ] placement

;; ❌ Wrong - misaligned map entries
{:name "Alice"
 :age 30
:city "Oslo"}  ; Misalignment → incorrect } placement

;; ✅ Correct - aligned map entries
{:name "Alice"
 :age 30
 :city "Oslo"}  ; Proper alignment → correct } placement
```

**Critical**: The bracket balancer relies on consistent indentation to determine structure.

### REPL Dependency Management
Use `clojure.repl.deps/add-libs` for dynamic dependency loading during REPL sessions.

```clojure
(require '[clojure.repl.deps :refer [add-libs]])
(add-libs '{dk.ative/docjure {:mvn/version "1.15.0"}})
```

- Dynamic dependency loading requires Clojure 1.12 or later
- Perfect for library exploration and prototyping

### Checking Clojure Version

```clojure
*clojure-version*
;; => {:major 1, :minor 12, :incremental 1, :qualifier nil}
```

### REPL Availability Discipline

**Never edit code files when the REPL is unavailable.** When REPL evaluation returns errors indicating that the REPL is unavailable, stop immediately and inform the user. Let the user restore REPL before continuing.

#### Why This Matters
- **Interactive Programming requires a working REPL** - You cannot verify behavior without evaluation
- **Guessing creates bugs** - Code changes without testing introduce errors

## Structural Editing and REPL-First Habit
- Develop changes in the REPL before touching files.
- When editing Clojure files, always use structural editing tools such as **Insert Top Level Form**, **Replace Top Level Form**, **Create Clojure File**, and **Append Code**, and always read their instructions first.

### Creating New Files
- Use the **Create Clojure File** tool with initial content
- Follow Clojure naming rules: namespaces in kebab-case, file paths in matching snake_case (e.g., `my.project.ns` → `my/project/ns.clj`).

### Reloading Namespaces
After editing files, reload the edited namespace in the REPL so updated definitions are active.

```clojure
(require 'my.namespace :reload)
```

## Code Indentation Before Evaluation
Consistent indentation is crucial to help the bracket balancer.

```clojure
;; ❌
(defn my-function [x]
(+ x 2))

;; ✅
(defn my-function [x]
  (+ x 2))
```

## Indentation preferences

Keep the condition and body on separate lines:

```clojure
(when limit
  (println "Limit set to:" limit))
```

Keep the `and` and `or` arguments on separate lines:

```clojure
(if (and condition-a
         condition-b)
  this
  that)
```

## Inline Def Pattern

Prefer inline def debugging over println/console.log.

### Inline `def` for Debugging
- Inline `def` bindings keep intermediate state inspectable during REPL work.
- Leave inline bindings in place when they continue to aid exploration.

```clojure
(defn process-instructions [instructions]
  (def instructions instructions)
  (let [grouped (group-by :status instructions)]
    grouped))
```

- Real-time inspection stays available.
- Debugging cycles stay fast.
- Iterative development remains smooth.

You can also use "inline def" when showing the user code in the chat, to make it easy for the user to experiment with the code from within the code blocks. The user can use Calva to evaluate the code directly in your code blocks. (But the user can't edit the code there.)

## Return values > print side effects

Prefer using the REPL and return values from your evaluations, over printing things to stdout.

## Reading from `stdin`
- When Clojure code uses `(read-line)`, it will prompt the user through VS Code.
- Avoid stdin reads in Babashka's nREPL because it lacks stdin support.
- Ask the user to restart the REPL if it blocks.

## Data Structure Preferences

We try to keep our data structures as flat as possible, leaning heavily on namespaced keywords and optimizing for easy destructuring. Generally in the app we use namespaced keywords, and most often "synthetic" namespaces.

Destructure keys directly in the parameter list.

```clojure
(defn handle-user-request
  [{:user/keys [id name email]
    :request/keys [method path headers]
    :config/keys [timeout debug?]}]
  (when debug?
    (println "Processing" method path "for" name)))
```

Among many benefits this keeps function signatures transparent.

### Avoid Shadowing Built-ins
Rename incoming keys when necessary to avoid hiding core functions.

```clojure
(defn create-item
  [{:prompt-sync.file/keys [path uri]
    file-name :prompt-sync.file/name
    file-type :prompt-sync.file/type}]
  #js {:label file-name
       :type file-type})
```

Common symbols to keep free:
- `class`
- `count`
- `empty?`
- `filter`
- `first`
- `get`
- `key`
- `keyword`
- `map`
- `merge`
- `name`
- `reduce`
- `rest`
- `set`
- `str`
- `symbol`
- `type`
- `update`

## Avoid Unnecessary Wrapper Functions
Do not wrap core functions unless a name genuinely clarifies composition.

```clojure
(remove (set exclusions) items) ; a wrapper function would not make this clearer
```

## Rich Comment Forms (RCF) for Documentation

Rich Comment Forms `(comment ...)` serve a different purpose than direct REPL evaluation. Use RCFs in file editing to **document usage patterns and examples** for functions you've already validated in the REPL.

### When to Use RCFs
- **After REPL validation** - Document working examples in files
- **Usage documentation** - Show how functions are intended to be used
- **Exploration preservation** - Keep useful REPL discoveries in the codebase
- **Example scenarios** - Demonstrate edge cases and typical usage

### RCF Patterns
RCF = Rich Comment Forms.

When files are loaded code in RCFs is not evaluated, making them perfect for documenting example usage, since humans easily can evaluate the code in there at will.

```clojure
(defn process-user-data
  "Processes user data with validation"
  [{:user/keys [name email] :as user-data}]
  ;; implementation here
  )

(comment
  ;; Basic usage
  (process-user-data {:user/name "John" :user/email "john@example.com"})

  ;; Edge case - missing email
  (process-user-data {:user/name "Jane"})

  ;; Integration example
  (->> users
       (map process-user-data)
       (filter :valid?))

  :rcf) ; Optional marker for end of comment block
```

### RCF vs REPL Tool Usage
```clojure
;; In chat - show direct REPL evaluation:
(in-ns 'my.namespace)
(let [test-data {:user/name "example"}]
  (process-user-data test-data))

;; In files - document with RCF:
(comment
  (process-user-data {:user/name "example"})
  :rcf)
```

## Testing

### Run Tests from the REPL
Reload the target namespace and execute tests from the REPL for immediate feedback.

```clojure
(require '[my.project.some-test] :reload)
(clojure.test/run-tests 'my.project.some-test)
(cljs.test/run-tests 'my.project.some-test)
```

- Tighter REPL integration.
- Focused execution.
- Simpler debugging.
- Direct access to test data.

Prefer running individual test vars from within the test namespace when investigating failures.

### Use REPL-First TDD Workflow
Iterate with real data before editing files.

```clojure
(def sample-text "line 1\nline 2\nline 3\nline 4\nline 5")

(defn format-line-number [n padding marker-len]
  (let [num-str (str n)
        total-padding (- padding marker-len)]
    (str (apply str (repeat (- total-padding (count num-str)) " "))
         num-str)))

(deftest line-number-formatting
  (is (= "  5" (editor-util/format-line-number 5 3 0))
      "Single digit with padding 3, no marker space")
  (is (= " 42" (editor-util/format-line-number 42 3 0))
      "Double digit with padding 3, no marker space"))
```

#### Benefits
- Verified behavior before committing changes
- Incremental development with immediate feedback
- Tests that capture known-good behavior
- Start new work with failing tests to lock in intent

### Test Naming and Messaging
Keep `deftest` names descriptive (area/thing style) without redundant `-test` suffixes.

### Test Assertion Message Style
Attach expectation messages directly to `is`, using `testing` blocks only when grouping multiple related assertions.

```clojure
(deftest line-marker-formatting
  (is (= "→" (editor-util/format-line-marker true))
      "Target line gets marker")
  (is (= "" (editor-util/format-line-marker false))
      "Non-target gets empty string"))

(deftest context-line-extraction
  (testing "Centered context extraction"
    (let [result (editor-util/get-context-lines "line 1\nline 2\nline 3" 2 3)]
      (is (= 3 (count (str/split-lines result)))
          "Should have 3 lines")
      (is (str/includes? result "→")
          "Should have marker"))))
```

Guidelines:
- Keep assertion messages explicit about expectations.
- Use `testing` for grouping related checks.
- Maintain kebab-case names like `line-marker-formatting` or `context-line-extraction`.

## Happy Interactive Programming

Remember to prefer the REPL in your work. Keep in mind that the user does not see what you evaluate. Nor the results. Communicate with the user in the chat about what you evaluate and what you get back.

