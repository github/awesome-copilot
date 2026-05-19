# Dependency Scans - Both Auditors

Scans for dependency compatibility and peer conflicts. Run during both R18 and R19 audits.

---

## Current Versions

```bash
# All react-related package versions in one shot
cat package.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
keys = ['react', 'react-dom', 'react-router', 'react-router-dom',
        '@testing-library/react', '@testing-library/jest-dom',
        '@testing-library/user-event', '@apollo/client', 'graphql',
        '@emotion/react', '@emotion/styled', 'jest', 'enzyme',
        'react-redux', '@reduxjs/toolkit', 'prop-types']
for k in keys:
    if k in deps:
        print(f'{k}: {deps[k]}')
" 2>/dev/null
```

---

## Peer Dependency Conflicts

```bash
# All peer dep warnings (must be 0 before migration completes)
npm ls 2>&1 | grep -E "WARN|ERR|peer|invalid|unmet"

# Count of peer errors
npm ls 2>&1 | grep -E "WARN|ERR|peer|invalid|unmet" | wc -l

# Specific package peer dep requirements
npm info @testing-library/react peerDependencies 2>/dev/null
npm info @apollo/client peerDependencies 2>/dev/null
npm info @emotion/react peerDependencies 2>/dev/null
npm info react-router-dom peerDependencies 2>/dev/null
```

---

## Enzyme Detection (R18 Blocker)

```bash
# In package.json
cat package.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
deps = {**d.get('dependencies',{}), **d.get('devDependencies',{})}
enzyme = {k: v for k, v in deps.items() if 'enzyme' in k.lower()}
if enzyme:
    print('BLOCKER - Enzyme found:', enzyme)
else:
    print('No Enzyme - OK')
" 2>/dev/null

# Enzyme adapter files
find . -name "enzyme-adapter*" -not -path "*/node_modules/*" 2>/dev/null
```

---

## React Router Version Check

```bash
ROUTER=$(node -e "console.log(require('./node_modules/react-router-dom/package.json').version)" 2>/dev/null)
echo "react-router-dom version: $ROUTER"

# If v5 - flag for assessment
if [[ $ROUTER == 5* ]]; then
  echo "WARNING: react-router v5 found - requires scope assessment before upgrade"
  echo "Run router migration scope scan:"
  echo "  Routes: $(grep -rn "<Route\|<Switch\|<Redirect" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l) hits"
  echo "  useHistory: $(grep -rn "useHistory()" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l) hits"
fi
```

---

## Lock File Consistency

```bash
# Check lockfile is in sync with package.json
npm ls --depth=0 2>&1 | head -20

# Check for duplicate react installs (can cause hooks errors)
find node_modules -name "package.json" -path "*/react/package.json" 2>/dev/null \
  | grep -v "node_modules/node_modules" \
  | xargs grep '"version"' | sort -u
```
