#!/usr/bin/env node
// Scan Cypress specs, support files, and config for flake-prone anti-patterns
// and for APIs removed in Cypress 12 through 16.
//
// Zero dependencies. Requires Node.js 18 or later.
// The scan is heuristic (text based, no AST). Treat findings as leads to
// confirm in the code, not as proof.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const HELP = `Usage: node scan-cypress.mjs [paths...] [options]

Scans Cypress test code for flake-prone anti-patterns and removed APIs.
With no path, scans the current directory.

Options:
  --json               Print machine-readable JSON instead of text
  --strict             Also report low-confidence rules (CY1xx)
  --rule <ids>         Only report these rule ids, comma separated (CY001,CY005)
  --max-per-rule <n>   Findings listed per rule in text output (default 20, 0 = all)
  --fail-on <level>    Exit 1 if a finding at this level or above exists:
                       error | warn | info | never (default never)
  --cypress-major <n>  Override the Cypress major version detected from package.json
  --list-rules         Print the rule catalog and exit
  -h, --help           Show this help

Suppress a finding with a comment on the same or the previous line:
  // cy-scan-ignore            (all rules)
  // cy-scan-ignore CY001      (one or more rule ids)

Exit codes: 0 ok, 1 threshold from --fail-on reached, 2 usage or I/O error.`

const RULES = {
  CY001: ['fixed-wait', 'warn', 'cy.wait(<number>) waits on time. Wait on a cy.intercept() alias or a retrying assertion.'],
  CY002: ['assigned-return-value', 'error', 'A cy command return value is assigned. Commands are queued and yield later; use .then(), .should(), or an alias.'],
  CY003: ['async-await', 'error', 'async/await is used with Cypress commands. Commands are not promises; remove async and await.'],
  CY004: ['force-true', 'warn', '{ force: true } skips actionability checks. Find what covers or disables the element.'],
  CY005: ['chain-after-action', 'warn', 'A command is chained after an action. Safe only if the element cannot re-render; otherwise start a new cy.get().'],
  CY006: ['one-shot-assertion', 'warn', 'expect() inside .then() runs once and does not retry. Use .should() or .should(callback).'],
  CY007: ['removed-api', 'error', 'API removed or changed in a newer Cypress major.'],
  CY008: ['conditional-on-dom', 'warn', 'Test branches on DOM state. Make the state deterministic, then assert it.'],
  CY009: ['exclusive-or-debug', 'warn', '.only, cy.pause(), or cy.debug() left in the code.'],
  CY010: ['cleanup-in-after-hook', 'info', 'State is cleaned in after/afterEach. Reset state in before/beforeEach so interrupted runs do not leak.'],
  CY011: ['absolute-local-visit', 'info', 'cy.visit() uses an absolute local URL. Set baseUrl and visit a relative path.'],
  CY012: ['ui-login-without-session', 'info', 'Password is typed through the UI in several files and cy.session() is never used.'],
  CY013: ['positional-selector', 'info', 'Selector depends on element position. Prefer a data-* attribute.'],
  CY101: ['brittle-selector', 'info', 'Selector relies on a CSS class or id. Prefer a data-* attribute.'],
  CY102: ['negative-assertion-as-wait', 'info', 'A negative assertion passes before the element has rendered. Confirm a positive state was asserted first.'],
  CY103: ['variable-wait', 'info', 'cy.wait() is called with an identifier. Confirm it is an alias, not a number of milliseconds.'],
}

const LEVELS = { info: 1, warn: 2, error: 3 }

const REMOVED = [
  [/\bCypress\s*\.\s*env\s*\(/g, 16, 'Cypress.env() was removed in 16.0 (deprecated 15.10). Use cy.env([...]) for secrets or Cypress.expose() for public values.'],
  [/\bcy\s*\.\s*exec\s*\(/g, 16, 'cy.exec() was removed in 16.0. Register a task in setupNodeEvents and call cy.task().'],
  [/\)\s*\.\s*end\s*\(\s*\)/g, 16, '.end() was removed in 16.0. Delete the call.'],
  [/\bexecTimeout\b/g, 16, 'execTimeout was removed in 16.0 with cy.exec(). Use taskTimeout.'],
  [/\bexperimentalMemoryManagement\b/g, 16, 'experimentalMemoryManagement was removed in 16.0. Delete it, or set manageBrowserMemory: false to opt out.'],
  [/\bexperimentalFastVisibility\b/g, 16, 'experimentalFastVisibility was removed in 16.0. visibilityStrategy defaults to "modern".'],
  [/\bexperimentalSourceRewriting\b/g, 16, 'experimentalSourceRewriting was removed in 16.0. Delete it; use removeSRIAttributes for SRI errors.'],
  [/\ballowCypressEnv\b/g, 16, 'allowCypressEnv was removed in 16.0. Delete it.'],
  [/\bCypress\s*\.\s*config\s*\(\s*['"`](?:viewportWidth|viewportHeight|blockHosts)['"`]\s*,/g, 16, 'Setting this through Cypress.config() during a test throws in 16.0. Use cy.viewport() or the test config object.'],
  [/\bCypress\s*\.\s*Commands\s*\.\s*overwrite\s*\(\s*['"`](?:getCookie|getCookies|getAllCookies|getAllLocalStorage|getAllSessionStorage)['"`]/g, 16, 'This command is a query in 16.0. Use Cypress.Commands.overwriteQuery().'],
  [/\bCypress\s*\.\s*SelectorPlayground\b/g, 15, 'Cypress.SelectorPlayground was renamed Cypress.ElementSelector in 15.0.'],
  [/\bexperimentalSkipDomainInjection\b/g, 14, 'experimentalSkipDomainInjection was removed in 14.0. Use cy.origin() for subdomains.'],
  [/\bexperimentalJustInTimeCompile\b/g, 14, 'experimentalJustInTimeCompile became justInTimeCompile in 14.0.'],
  [/\bvideoUploadOnPasses\b/g, 13, 'videoUploadOnPasses was removed in 13.0.'],
  [/\bcy\s*\.\s*(?:server|route)\s*\(/g, 12, 'cy.server() and cy.route() were removed in 12.0. Use cy.intercept().'],
  [/\bCypress\s*\.\s*Cookies\s*\.\s*(?:preserveOnce|defaults)\b/g, 12, 'Cypress.Cookies.preserveOnce() and .defaults() were removed in 12.0. Use cy.session().'],
  [/\bexperimentalSessionAndOrigin\b/g, 12, 'experimentalSessionAndOrigin was removed in 12.0. cy.session() and cy.origin() are stable.'],
  [/\bcy\s*\.\s*route2\s*\(/g, 7, 'cy.route2() was renamed cy.intercept() in 7.0.'],
  [/\bcy\s*\.\s*xpath\s*\(/g, null, 'cy.xpath() comes from the deprecated cypress-xpath plugin. Use cy.get() or cy.contains().'],
]

const ACTIONS = 'click|dblclick|rightclick|type|clear|check|uncheck|select|selectFile|trigger|focus|blur|submit|scrollIntoView|scrollTo'
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', 'out', 'screenshots', 'videos', 'downloads'])
const CODE_EXT = /\.(?:[cm]?[jt]sx?)$/

function rel(file) {
  const relative = path.relative(process.cwd(), file)
  const shown = relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : file
  return shown.split(path.sep).join('/')
}

function fail(message) {
  process.stderr.write(`scan-cypress: ${message}\n`)
  process.exit(2)
}

function parseArgs(argv) {
  const opts = { paths: [], json: false, strict: false, rules: null, maxPerRule: 20, failOn: 'never', major: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      if (i + 1 >= argv.length) fail(`${arg} needs a value`)
      return argv[++i]
    }
    if (arg === '-h' || arg === '--help') { process.stdout.write(`${HELP}\n`); process.exit(0) }
    else if (arg === '--list-rules') {
      for (const [id, [name, level, text]] of Object.entries(RULES)) process.stdout.write(`${id}  ${name.padEnd(28)} ${level.padEnd(5)} ${text}\n`)
      process.exit(0)
    }
    else if (arg === '--json') opts.json = true
    else if (arg === '--strict') opts.strict = true
    else if (arg === '--rule') opts.rules = new Set(next().split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    else if (arg === '--max-per-rule') {
      opts.maxPerRule = Number(next())
      if (!Number.isInteger(opts.maxPerRule) || opts.maxPerRule < 0) fail('--max-per-rule needs a non-negative integer')
    }
    else if (arg === '--fail-on') {
      opts.failOn = next()
      if (!['error', 'warn', 'info', 'never'].includes(opts.failOn)) fail('--fail-on must be error, warn, info, or never')
    }
    else if (arg === '--cypress-major') {
      opts.major = Number(next())
      if (!Number.isInteger(opts.major) || opts.major < 1) fail('--cypress-major needs a positive integer')
    }
    else if (arg.startsWith('-')) fail(`unknown option ${arg} (try --help)`)
    else opts.paths.push(arg)
  }
  if (opts.paths.length === 0) opts.paths.push('.')
  if (opts.rules) for (const id of opts.rules) if (!RULES[id]) fail(`unknown rule ${id} (try --list-rules)`)
  return opts
}

function isCypressFile(file) {
  const normalized = rel(file)
  const base = path.basename(normalized)
  if (/^cypress\.config\.[cm]?[jt]s$/.test(base)) return true
  if (!CODE_EXT.test(base)) return false
  if (/\.cy\.[cm]?[jt]sx?$/.test(base)) return true
  return /(?:^|\/)cypress\//.test(normalized)
}

function walk(target, files, coffee) {
  let stat
  try { stat = fs.statSync(target) } catch { fail(`cannot read ${target}`) }
  if (stat.isFile()) {
    if (isCypressFile(target) || CODE_EXT.test(target)) files.push(target)
    return
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files, coffee)
    } else if (entry.isFile()) {
      if (isCypressFile(full)) files.push(full)
      else if (/\.coffee$/.test(entry.name) && /(?:^|\/)cypress\//.test(full.split(path.sep).join('/'))) coffee.push(full)
    }
  }
}

function detectCypress(startDir) {
  let dir = path.resolve(startDir)
  for (let depth = 0; depth < 8; depth++) {
    const file = path.join(dir, 'package.json')
    if (fs.existsSync(file)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
        const range = pkg.devDependencies?.cypress ?? pkg.dependencies?.cypress
        if (range) {
          const match = String(range).match(/\d+/)
          return { range: String(range), major: match ? Number(match[0]) : null, source: file }
        }
      } catch { /* unreadable package.json: keep walking up */ }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return { range: null, major: null, source: null }
}

// Replace comments with spaces so offsets and line numbers stay valid.
function blankComments(src) {
  let out = ''
  let state = 'code'
  for (let i = 0; i < src.length;) {
    const c = src[i]
    const d = src[i + 1]
    if (state === 'code') {
      if (c === '\\') { out += c + (d ?? ''); i += 2; continue }
      if (c === '/' && d === '/') { state = 'line'; out += '  '; i += 2; continue }
      if (c === '/' && d === '*') { state = 'block'; out += '  '; i += 2; continue }
      if (c === "'") state = 'sq'
      else if (c === '"') state = 'dq'
      else if (c === '`') state = 'tpl'
      out += c; i++; continue
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c } else out += ' '
      i++; continue
    }
    if (state === 'block') {
      if (c === '*' && d === '/') { state = 'code'; out += '  '; i += 2; continue }
      out += c === '\n' ? '\n' : ' '
      i++; continue
    }
    if (c === '\\') { out += c + (d ?? ''); i += 2; continue }
    if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"') || (state === 'tpl' && c === '`')) state = 'code'
    else if ((state === 'sq' || state === 'dq') && c === '\n') state = 'code'
    out += c; i++
  }
  return out
}

// Index of the parenthesis that closes the one at `open`, or -1.
function matchParen(src, open) {
  let depth = 0
  let quote = null
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue }
    if (c === '(') depth++
    else if (c === ')') { depth--; if (depth === 0) return i }
  }
  return -1
}

// Start offset of the statement whose chain contains offset `idx`.
function chainStart(src, idx) {
  let depth = 0
  for (let j = idx - 1; j >= 0; j--) {
    const c = src[j]
    if (c === ')' || c === ']' || c === '}') depth++
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) return j + 1
      depth--
    } else if (depth === 0) {
      if (c === ';') return j + 1
      if (c === '\n') {
        const rest = src.slice(j + 1, idx).trimStart()
        if (rest && rest[0] !== '.') return j + 1
      }
    }
  }
  return 0
}

function countTopLevelCommas(args) {
  let depth = 0
  let quote = null
  let commas = 0
  for (let i = 0; i < args.length; i++) {
    const c = args[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    else if (c === ',' && depth === 0 && args.slice(i + 1).trim()) commas++
  }
  return commas
}

function scanFile(file, opts, major, findings) {
  const raw = fs.readFileSync(file, 'utf8')
  const rawLines = raw.split('\n')
  const src = blankComments(raw)
  const lineStarts = [0]
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1)

  const lineOf = (offset) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }

  const suppressed = (line, rule) => {
    for (const text of [rawLines[line - 1], rawLines[line - 2]]) {
      const match = text?.match(/cy-scan-ignore\b([^\n]*)/)
      if (!match) continue
      const ids = match[1].match(/CY\d{3}/g)
      if (!ids || ids.includes(rule)) return true
    }
    return false
  }

  const add = (rule, offset, message, level) => {
    if (opts.rules && !opts.rules.has(rule)) return
    if (!opts.strict && /^CY1\d\d$/.test(rule) && !(opts.rules && opts.rules.has(rule))) return
    const line = lineOf(offset)
    if (suppressed(line, rule)) return
    const snippet = (rawLines[line - 1] ?? '').trim()
    findings.push({
      rule,
      name: RULES[rule][0],
      level: level ?? RULES[rule][1],
      file: rel(file),
      line,
      message: message ?? RULES[rule][2],
      snippet: snippet.length > 140 ? `${snippet.slice(0, 137)}...` : snippet,
    })
  }

  const each = (regex, fn) => {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(src)) !== null) {
      fn(match)
      if (match[0].length === 0) regex.lastIndex++
    }
  }

  // CY001 fixed waits
  each(/(?:\bcy|\))\s*\.\s*wait\s*\(\s*\d[\d_.]*\s*[,)]/g, (m) => add('CY001', m.index + m[0].indexOf('wait')))

  // CY103 wait on an identifier (strict)
  each(/\bcy\s*\.\s*wait\s*\(\s*[A-Za-z_$][\w$.]*\s*\)/g, (m) => add('CY103', m.index))

  // CY002 assigned return values. cy.stub() and cy.spy() are synchronous and exempt.
  each(/\b(?:const|let|var)\s+[^=;\n]+=\s*cy\s*\.\s*(\w+)/g, (m) => {
    if (!['stub', 'spy', 'state'].includes(m[1])) add('CY002', m.index)
  })

  // CY003 async tests and awaited commands
  each(/\b(?:it|specify|before|beforeEach|after|afterEach)(?:\s*\.\s*(?:only|skip))?\s*\(\s*(?:(['"`])(?:\\.|(?!\1)[^\\])*\1\s*,\s*)?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*,\s*)?async\b/g, (m) => add('CY003', m.index))
  each(/\bawait\s+cy\s*\./g, (m) => add('CY003', m.index, 'A cy command is awaited. Commands are not promises; use .then().'))

  // CY004 force
  each(/\bforce\s*:\s*true\b/g, (m) => add('CY004', m.index))

  // CY005 chaining after an action
  each(new RegExp(`\\.\\s*(${ACTIONS})\\s*\\(`, 'g'), (m) => {
    const open = m.index + m[0].length - 1
    const close = matchParen(src, open)
    if (close === -1) return
    const tail = src.slice(close + 1).match(/^\s*\.\s*([A-Za-z_$][\w$]*)/)
    if (!tail) return
    const next = tail[1]
    if (['then', 'as', 'catch', 'finally', 'end'].includes(next)) return
    const start = chainStart(src, m.index)
    if (!/^\s*(?:return\s+)?cy\b/.test(src.slice(start, m.index))) return
    const soft = next === 'should' || next === 'and'
    add(
      'CY005',
      m.index,
      soft
        ? `.${next}() is chained after .${m[1]}(). If the action re-renders the element the subject is stale; re-query before asserting.`
        : `.${next}() is chained after .${m[1]}(). Start a new cy.get() unless the element cannot re-render.`,
      soft ? 'info' : 'warn',
    )
  })

  // CY006 expect() inside .then() after a DOM or page query
  each(/\.\s*then\s*\(/g, (m) => {
    const open = m.index + m[0].length - 1
    const close = matchParen(src, open)
    if (close === -1) return
    const body = src.slice(open + 1, close)
    if (!/\bexpect\s*\(|\bassert\s*[.(]/.test(body) || /\bcy\s*\./.test(body)) return
    const chain = src.slice(chainStart(src, m.index), m.index)
    if (!/^\s*(?:return\s+)?cy\b/.test(chain)) return
    if (/\bcy\s*\.\s*(?:request|task|wait|env|fixture|readFile|wrap|window|exec|origin|session)\s*\(/.test(chain)) return
    if (/\bcy\s*\.\s*get\s*\(\s*['"`]@/.test(chain)) return
    if (!/\bcy\s*\.\s*(?:get|contains|url|title|location|hash|focused|getCookie|getCookies|getAllCookies|getAllLocalStorage|getAllSessionStorage)\s*\(/.test(chain)) return
    add('CY006', m.index)
  })

  // CY007 removed APIs
  for (const [regex, removedIn, text] of REMOVED) {
    each(regex, (m) => {
      const broken = removedIn === null ? false : major === null ? null : major >= removedIn
      const level = broken === true ? 'error' : 'warn'
      const suffix = removedIn === null || major === null ? '' : broken ? ` Installed major is ${major}: this already fails.` : ` Installed major is ${major}: fix before upgrading.`
      add('CY007', m.index, `${text}${suffix}`, level)
    })
  }
  each(/\bcy\s*\.\s*stub\s*\(/g, (m) => {
    const open = m.index + m[0].length - 1
    const close = matchParen(src, open)
    if (close === -1) return
    if (countTopLevelCommas(src.slice(open + 1, close)) >= 2) {
      const broken = major !== null && major >= 15
      add('CY007', m.index, 'cy.stub(obj, name, fn) was removed in 15.0. Use cy.stub(obj, name).callsFake(fn).', broken ? 'error' : 'warn')
    }
  })

  // CY008 conditional testing
  each(/\bif\s*\(\s*!?\s*\$\w+\s*\.\s*(?:find|is|hasClass|children|text|length)\b/g, (m) => add('CY008', m.index))

  // CY009 exclusive tests and debug commands
  each(/\b(?:it|describe|context|specify)\s*\.\s*only\s*\(/g, (m) => add('CY009', m.index, '.only is committed: the rest of the suite does not run.'))
  each(/(?:\bcy|\))\s*\.\s*(?:pause|debug)\s*\(\s*\)/g, (m) => add('CY009', m.index, 'cy.pause() or cy.debug() left in the code.'))

  // CY010 cleanup hooks
  each(/(?:^|\n)[ \t]*(?:after|afterEach)\s*\(/g, (m) => add('CY010', m.index + m[0].search(/a/)))

  // CY011 absolute local visit
  each(/\bcy\s*\.\s*visit\s*\(\s*['"`]https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/g, (m) => add('CY011', m.index))

  // CY013 and CY101 selectors
  each(/(?:\bcy\s*\.\s*get|\.\s*find)\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g, (m) => {
    const selector = m[2]
    if (selector.startsWith('@') || selector.includes('${')) return
    if (/:nth-(?:child|of-type|last-child)\(|:eq\(|:first\b|:last\b/.test(selector)) add('CY013', m.index)
    else if (!/\[data-|\[aria-|\[role=|\[name=/.test(selector) && /(?:^|[\s>+~])[.#][\w-]+/.test(selector)) add('CY101', m.index)
  })

  // CY102 negative assertions
  each(/\.\s*should\s*\(\s*['"`]not\.(?:exist|be\.visible)['"`]\s*\)/g, (m) => add('CY102', m.index))

  return {
    typesPassword: /(?:password|passwd|pwd)[^\n]{0,80}\.\s*type\s*\(|type\s*=\s*["']?password/i.test(src),
    usesSession: /\bcy\s*\.\s*session\s*\(/.test(src),
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const files = []
  const coffee = []
  for (const target of opts.paths) walk(target, files, coffee)
  const unique = [...new Set(files)].sort()

  const firstPath = opts.paths[0]
  const startDir = fs.statSync(firstPath).isDirectory() ? firstPath : path.dirname(firstPath)
  const detected = detectCypress(startDir)
  const major = opts.major ?? detected.major

  const findings = []
  const passwordFiles = []
  let sessionUsed = false
  for (const file of unique) {
    const facts = scanFile(file, opts, major, findings)
    if (facts.typesPassword) passwordFiles.push(rel(file))
    if (facts.usesSession) sessionUsed = true
  }

  const wants = (rule) => !opts.rules || opts.rules.has(rule)
  if (wants('CY012') && !sessionUsed && passwordFiles.length >= 2) {
    findings.push({
      rule: 'CY012', name: RULES.CY012[0], level: RULES.CY012[1], file: passwordFiles[0], line: 1,
      message: `${RULES.CY012[2]} Files: ${passwordFiles.slice(0, 8).join(', ')}${passwordFiles.length > 8 ? ', ...' : ''}`,
      snippet: '',
    })
  }
  if (wants('CY007')) {
    for (const file of coffee) {
      findings.push({
        rule: 'CY007', name: RULES.CY007[0], level: major !== null && major >= 16 ? 'error' : 'warn',
        file: rel(file), line: 1,
        message: 'Built-in CoffeeScript support was removed in 16.0. Convert the file to JavaScript or TypeScript.', snippet: '',
      })
    }
  }

  findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.line - b.line)
  const summary = {}
  for (const f of findings) summary[f.rule] = (summary[f.rule] ?? 0) + 1

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({
      cypress: { range: detected.range, major, source: detected.source },
      filesScanned: unique.length,
      strict: opts.strict,
      summary,
      findings,
    }, null, 2)}\n`)
  } else {
    const lines = ['Cypress anti-pattern scan', '']
    lines.push(major === null
      ? 'Cypress version: not detected (pass --cypress-major <n> to grade removed APIs)'
      : `Cypress version: major ${major}${detected.range && opts.major === undefined ? ` (range ${detected.range} in ${detected.source})` : ' (from --cypress-major)'}`)
    lines.push(`Files scanned:   ${unique.length}`)
    lines.push(`Findings:        ${findings.length}`, '')
    if (unique.length === 0) lines.push('No Cypress files found. Pass the folder that contains cypress/ or *.cy.* files.')
    for (const rule of Object.keys(summary)) {
      const group = findings.filter((f) => f.rule === rule)
      lines.push(`${rule} ${RULES[rule][0]}  (${group.length})`)
      lines.push(`  ${RULES[rule][2]}`)
      const shown = opts.maxPerRule === 0 ? group : group.slice(0, opts.maxPerRule)
      for (const f of shown) {
        lines.push(`  [${f.level}] ${f.file}:${f.line}  ${f.snippet}`)
        if (f.message !== RULES[rule][2]) lines.push(`         ${f.message}`)
      }
      if (shown.length < group.length) lines.push(`  ... ${group.length - shown.length} more (use --max-per-rule 0 or --json)`)
      lines.push('')
    }
    if (!opts.strict && findings.length > 0) lines.push('Run with --strict to include low-confidence rules (CY1xx).')
    process.stdout.write(`${lines.join('\n')}\n`)
  }

  if (opts.failOn !== 'never') {
    const threshold = LEVELS[opts.failOn]
    if (findings.some((f) => LEVELS[f.level] >= threshold)) process.exit(1)
  }
}

main()
