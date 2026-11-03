// Copies each run's result under a random label, so grading doesn't know which arm wrote it. Node 18+.
//   node blind-labels.mjs <runs-folder> <graded-folder> [--file review.md]
// <runs-folder> holds one folder per run (baseline-1, treatment-1…). From each, the result file (--file, or the
// single .md/.html/.json it contains) is copied to <graded-folder>/<label><ext>. The label → run map goes to
// <graded-folder>/.labels.json; open it only after every grade is written.
import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomInt } from 'node:crypto'

const args = process.argv.slice(2)
const fi = args.indexOf('--file'), file = fi >= 0 ? args[fi + 1] : null
const [runs, out] = args.filter((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1))
const usage = 'usage: node blind-labels.mjs <runs-folder> <graded-folder> [--file review.md]'
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0) }
if (!runs || !out) { console.error(usage); process.exit(2) }
if (!existsSync(runs)) { console.error(`not found: ${runs}`); process.exit(2) }
if (existsSync(join(out, '.labels.json'))) { console.error(`${out} already has .labels.json; use a new folder`); process.exit(2) }

const pick = dir => {
  if (file) return existsSync(join(dir, file)) ? join(dir, file) : null
  const c = readdirSync(dir).filter(f => /\.(md|html|json|txt)$/.test(f) && statSync(join(dir, f)).isFile())
  return c.length === 1 ? join(dir, c[0]) : null
}
const found = [], skipped = []
for (const d of readdirSync(runs)) {
  const dir = join(runs, d)
  if (d.startsWith('.') || !statSync(dir).isDirectory()) continue
  const r = pick(dir)
  r ? found.push([d, r]) : skipped.push(d)
}
if (!found.length) { console.error('no results found; pass --file <name> if runs hold several files'); process.exit(1) }
for (let i = found.length - 1; i > 0; i--) { const j = randomInt(i + 1); [found[i], found[j]] = [found[j], found[i]] }
mkdirSync(out, { recursive: true })
// A, B … Z, then AA, AB …
const name = n => (n >= 26 ? name(Math.floor(n / 26) - 1) : '') + String.fromCharCode(65 + (n % 26))
const map = {}
found.forEach(([run, src], i) => {
  const label = name(i)
  copyFileSync(src, join(out, label + extname(src)))
  map[label] = run
})
writeFileSync(join(out, '.labels.json'), JSON.stringify(map, null, 2) + '\n')
console.log(`${found.length} results labelled ${Object.keys(map).join(', ')} in ${out}`)
if (skipped.length) console.log(`skipped (no single result file): ${skipped.join(', ')} — rerun into a new folder with --file <name>, or every arm isn't graded`)
