// Scores graded runs against the key and prints a Markdown table per arm. Node 18+.
//   node score.mjs <key.json> <grades.json> [--labels graded/.labels.json] [--json]
// grades.json: { "<label or run>": { "K1": "found|partial|missed", "T1": "flagged|ok", "F1": "corrected|repeated|silent",
//   "beyond": [...], "false_alarms": [...], "side_effects": 0, "tokens": 0 } }. Key items with "role": "discriminating"
// get their own column. With --labels, labels become run names; runs named
// <arm>-<n> are grouped by arm and shown as ranges. Exit 1 when a grade is missing, misspelt or not in the key.
import { readFileSync, existsSync } from 'node:fs'

const args = process.argv.slice(2)
const li = args.indexOf('--labels'), labelsPath = li >= 0 ? args[li + 1] : null
const [keyPath, gradesPath] = args.filter((a, i) => !a.startsWith('--') && (li < 0 || i !== li + 1))
const usage = 'usage: node score.mjs <key.json> <grades.json> [--labels .labels.json] [--json]'
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0) }
if (!keyPath || !gradesPath) { console.error(usage); process.exit(2) }
const read = p => { if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`not JSON: ${p} (${e.message})`); process.exit(2) } }
const key = read(keyPath), grades = read(gradesPath), labels = labelsPath ? read(labelsPath) : {}

const items = key.items || []
const K = items.filter(i => i.type === 'K' || i.type === 'R'), T = items.filter(i => i.type === 'T'), F = items.filter(i => i.type === 'F')
const unknown = new Set(), odd = []
const allowed = { K: ['found', 'partial', 'missed'], R: ['found', 'partial', 'missed'], T: ['flagged', 'ok'], F: ['corrected', 'repeated', 'silent'] }
const runs = Object.entries(grades).map(([label, g]) => {
  for (const k of Object.keys(g)) if (!['beyond', 'false_alarms', 'unverifiable', 'side_effects', 'tokens', 'notes'].includes(k) && !items.some(i => i.id === k)) unknown.add(k)
  for (const i of items) if (g[i.id] !== undefined && allowed[i.type] && !allowed[i.type].includes(g[i.id])) odd.push(`${label} ${i.id} "${g[i.id]}"`)
  const val = { found: 1, partial: 0.5, missed: 0 }
  const missing = [...K, ...T].filter(i => g[i.id] === undefined).map(i => i.id)
  return {
    run: labels[label] || label,
    planted: K.reduce((s, i) => s + (val[g[i.id]] ?? 0), 0),
    partial: K.filter(i => g[i.id] === 'partial').length,
    found: new Set(K.filter(i => g[i.id] === 'found').map(i => i.id)),
    traps: T.filter(i => g[i.id] === 'flagged').map(i => i.id),
    folklore: F.map(i => g[i.id] || 'silent'),
    alarms: Array.isArray(g.false_alarms) ? g.false_alarms.length : (g.false_alarms || 0),
    beyond: (g.beyond || []).length, side: g.side_effects ?? null, tokens: g.tokens ?? null, missing,
  }
})
const D = K.filter(i => i.role === 'discriminating')
const arm = r => r.run.replace(/[-_ ]?\d+$/, '')
const arms = [...new Set(runs.map(arm))]
const range = xs => { const v = xs.filter(x => x !== null && x !== undefined); if (!v.length) return '—'; const lo = Math.min(...v), hi = Math.max(...v); return lo === hi ? String(lo) : `${lo}–${hi}` }
const rows = arms.map(a => {
  const rs = runs.filter(r => arm(r) === a)
  const part = rs.map(r => r.partial)
  return { arm: a, runs: rs.length, planted: range(rs.map(r => r.found.size)) + (part.some(Boolean) ? ` + ${range(part)} partial` : ''), score: range(rs.map(r => r.planted)), traps: range(rs.map(r => r.traps.length)), alarms: range(rs.map(r => r.alarms)), disc: range(rs.map(r => D.filter(i => r.found.has(i.id)).length)),
    folklore: [...new Set(rs.flatMap(r => r.folklore))].join(', ') || '—', beyond: range(rs.map(r => r.beyond)),
    side: range(rs.map(r => r.side)), tokens: range(rs.map(r => r.tokens)), found: rs.map(r => r.found), trapIds: [...new Set(rs.flatMap(r => r.traps))] }
})

const gaps = runs.filter(r => r.missing.length)
process.exitCode = gaps.length || odd.length || unknown.size ? 1 : 0
if (args.includes('--json')) {
  const problems = { not_graded: Object.fromEntries(gaps.map(r => [r.run, r.missing])), not_understood: odd, not_in_key: [...unknown] }
  console.log(JSON.stringify({ planted: K.length, traps: T.length, runs, arms: rows.map(({ found, ...r }) => r), problems }, (k, v) => v instanceof Set ? [...v] : v, 2))
  process.exit()
}

const dh = D.length ? ` Discriminating (of ${D.length}) |` : ''
console.log(`| Arm | Runs | Planted found (of ${K.length}) |${dh} Traps flagged (of ${T.length}) | Other false alarms | Folklore | Beyond the key | Side effects | Tokens |`)
console.log('|---|---|---|' + (D.length ? '---|' : '') + '---|---|---|---|---|---|')
for (const r of rows) console.log(`| ${r.arm} | ${r.runs} | ${r.planted} |${D.length ? ` ${r.disc} |` : ''} ${r.traps}${r.trapIds.length ? ' (' + r.trapIds.join(', ') + ')' : ''} | ${r.alarms} | ${r.folklore} | ${r.beyond} | ${r.side} | ${r.tokens} |`)

// Planted items every run of one arm found and no run of any other arm did.
if (rows.length > 1) {
  console.log('')
  for (const r of rows) {
    const always = K.filter(i => r.found.every(s => s.has(i.id)))
    const only = always.filter(i => rows.every(o => o === r || o.found.every(s => !s.has(i.id))))
    if (only.length) console.log(`Only ${r.arm}: ${only.map(i => `${i.id} ${i.class || ''}`.trim()).join('; ')}`)
  }
  const none = K.filter(i => rows.every(r => r.found.every(s => !s.has(i.id))))
  if (none.length) console.log(`Found by no run: ${none.map(i => i.id).join(', ')}`)
}
if (gaps.length || odd.length || unknown.size) console.log('')
if (gaps.length) console.log(`Not graded: ${gaps.map(r => `${r.run} (${r.missing.join(', ')})`).join('; ')}`)
if (odd.length) console.log(`Grades not understood: ${odd.join('; ')}. K and R take found, partial or missed; T flagged or ok; F corrected, repeated or silent.`)
if (unknown.size) console.log(`Ids not in the key: ${[...unknown].join(', ')}`)
