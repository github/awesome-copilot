# React 18.3.1 Audit - Complete Scan Commands

Run in this order. Each section maps to a phase in the react18-auditor.

---

## Phase 0 - Codebase Profile

```bash
# Total source files (excluding tests)
find src/ \( -name "*.js" -o -name "*.jsx" \) \
  | grep -v "\.test\.\|\.spec\.\|__tests__\|node_modules" \
  | wc -l

# Class component count
grep -rl "extends React\.Component\|extends Component\|extends PureComponent" \
  src/ --include="*.js" --include="*.jsx" \
  | grep -v "\.test\." | wc -l

# Function component rough count
grep -rl "const [A-Z][a-zA-Z]* = \|function [A-Z][a-zA-Z]*(" \
  src/ --include="*.js" --include="*.jsx" \
  | grep -v "\.test\." | wc -l

# Current React version
node -e "console.log(require('./node_modules/react/package.json').version)" 2>/dev/null

# StrictMode in use? (affects how many lifecycle warnings were already seen)
grep -rn "StrictMode\|React\.StrictMode" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

---

## Phase 1 - Unsafe Lifecycle Methods

```bash
# componentWillMount (without UNSAFE_ prefix)
grep -rn "componentWillMount\b" \
  src/ --include="*.js" --include="*.jsx" \
  | grep -v "UNSAFE_componentWillMount\|\.test\."

# componentWillReceiveProps (without UNSAFE_ prefix)
grep -rn "componentWillReceiveProps\b" \
  src/ --include="*.js" --include="*.jsx" \
  | grep -v "UNSAFE_componentWillReceiveProps\|\.test\."

# componentWillUpdate (without UNSAFE_ prefix)
grep -rn "componentWillUpdate\b" \
  src/ --include="*.js" --include="*.jsx" \
  | grep -v "UNSAFE_componentWillUpdate\|\.test\."

# Already partially migrated with UNSAFE_ prefix? (check if team already did partial work)
grep -rn "UNSAFE_component" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# Quick count summary:
echo "=== Lifecycle Issue Summary ==="
echo "componentWillMount: $(grep -rn "componentWillMount\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l)"
echo "componentWillReceiveProps: $(grep -rn "componentWillReceiveProps\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l)"
echo "componentWillUpdate: $(grep -rn "componentWillUpdate\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l)"
```

---

## Phase 2 - Automatic Batching Vulnerabilities

```bash
# Async class methods (primary risk zone)
grep -rn "^\s*async [a-zA-Z]" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# Arrow function async methods
grep -rn "=\s*async\s*(" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# setState inside .then() callbacks
grep -rn "\.then\s*(" \
  src/ --include="*.js" --include="*.jsx" -A 3 \
  | grep "setState" | grep -v "\.test\."

# setState inside .catch() callbacks
grep -rn "\.catch\s*(" \
  src/ --include="*.js" --include="*.jsx" -A 3 \
  | grep "setState" | grep -v "\.test\."

# setState inside setTimeout
grep -rn "setTimeout" \
  src/ --include="*.js" --include="*.jsx" -A 5 \
  | grep "setState" | grep -v "\.test\."

# this.state reads that follow an await (most dangerous pattern)
grep -rn "this\.state\." \
  src/ --include="*.js" --include="*.jsx" -B 3 \
  | grep "await" | grep -v "\.test\."

# document/window event handlers with setState
grep -rn "addEventListener" \
  src/ --include="*.js" --include="*.jsx" -A 5 \
  | grep "setState" | grep -v "\.test\."
```

---

## Phase 3 - Legacy Context API

```bash
# Provider side
grep -rn "childContextTypes\s*=" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

grep -rn "getChildContext\s*(" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# Consumer side
grep -rn "contextTypes\s*=" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# this.context usage (may indicate legacy or modern - verify per hit)
grep -rn "this\.context\." \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# Count of distinct legacy contexts (by counting childContextTypes blocks)
grep -rn "childContextTypes" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l
```

---

## Phase 4 - String Refs

```bash
# String ref assignments in JSX
grep -rn 'ref="[^"]*"' \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# Alternative quote style
grep -rn "ref='[^']*'" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# this.refs accessor usage
grep -rn "this\.refs\." \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

---

## Phase 5 - findDOMNode

```bash
grep -rn "findDOMNode\|ReactDOM\.findDOMNode" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

---

## Phase 6 - Root API (ReactDOM.render)

```bash
grep -rn "ReactDOM\.render\s*(" \
  src/ --include="*.js" --include="*.jsx"

grep -rn "ReactDOM\.hydrate\s*(" \
  src/ --include="*.js" --include="*.jsx"

grep -rn "unmountComponentAtNode" \
  src/ --include="*.js" --include="*.jsx"
```

---

## Phase 7 - Event Delegation (React 16 Carry-Over)

```bash
# document-level event listeners (may miss React events after React 17 delegation change)
grep -rn "document\.addEventListener\|document\.removeEventListener" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."

# window event listeners
grep -rn "window\.addEventListener" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

---

## Phase 8 - Enzyme Detection (Hard Blocker)

```bash
# Enzyme in package.json
cat package.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
enzyme_pkgs = [k for k in deps if 'enzyme' in k.lower()]
print('Enzyme packages found:', enzyme_pkgs if enzyme_pkgs else 'NONE')
"

# Enzyme imports in test files
grep -rn "from 'enzyme'\|require.*enzyme" \
  src/ --include="*.test.*" --include="*.spec.*" 2>/dev/null | wc -l
```

---

## Full Summary Script

Run this for a quick overview before detailed scanning:

```bash
#!/bin/bash
echo "=============================="
echo "React 18 Migration Audit Summary"
echo "=============================="
echo ""
echo "LIFECYCLE METHODS:"
echo "  componentWillMount:          $(grep -rn "componentWillMount\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l | tr -d ' ') hits"
echo "  componentWillReceiveProps:   $(grep -rn "componentWillReceiveProps\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l | tr -d ' ') hits"
echo "  componentWillUpdate:         $(grep -rn "componentWillUpdate\b" src/ --include="*.js" --include="*.jsx" | grep -v "UNSAFE_\|\.test\." | wc -l | tr -d ' ') hits"
echo ""
echo "LEGACY APIS:"
echo "  Legacy context (providers):  $(grep -rn "childContextTypes" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l | tr -d ' ') hits"
echo "  String refs (this.refs):     $(grep -rn "this\.refs\." src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l | tr -d ' ') hits"
echo "  findDOMNode:                 $(grep -rn "findDOMNode" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l | tr -d ' ') hits"
echo "  ReactDOM.render:             $(grep -rn "ReactDOM\.render\s*(" src/ --include="*.js" --include="*.jsx" | wc -l | tr -d ' ') hits"
echo ""
echo "ENZYME (BLOCKER):"
echo "  Enzyme test files:           $(grep -rl "from 'enzyme'" src/ --include="*.test.*" 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "ASYNC BATCHING RISK:"
echo "  Async class methods:         $(grep -rn "^\s*async [a-zA-Z]" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l | tr -d ' ') hits"
```
