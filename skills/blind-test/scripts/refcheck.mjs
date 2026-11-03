// Checks that a rewritten output kept every place the original named, so normalizing loses no finding. Node 18+.
//   node refcheck.mjs <original> <rewrite>
//   node refcheck.mjs <graded-folder> <normalized-folder>
// A place is a file name with a line: app.ts:14, app.ts, line 14, app.ts#L14 (compared by file name and line, so
// a rewrite may shorten the path). With folders, each result in the first (A.md, B.md…) is paired with
// A.normalized.md, A/A.normalized.md or A.md in the second. Prints every place the rewrite lacks, with the heading
// it sat under in the original. Exit 1 when a place is missing, 2 on a usage error.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, basename, resolve } from 'node:path'

const args = process.argv.slice(2)
const usage = 'usage: node refcheck.mjs <original> <rewrite>   or   node refcheck.mjs <graded-folder> <normalized-folder>'
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0) }
const [a, b] = args.filter(x => !x.startsWith('--'))
if (!a || !b) { console.error(usage); process.exit(2) }
for (const p of [a, b]) if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(2) }

const EXT = 'ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|kts|swift|php|cs|c|h|cpp|hpp|sql|md|mdx|json|ya?ml|toml|html?|css|scss|vue|svelte|sh|diff|txt|xml|graphql|proto'
const place = new RegExp(`([\\w.-]+\\.(?:${EXT}))[\`'"]?\\s*(?::|,?\\s*line\\s+|#L)(\\d+)`, 'gi')

// Every place in a text, in order of first appearance, with the Markdown heading above it.
function places(text) {
  const out = new Map()
  let heading = '(before any heading)'
  for (const line of text.split('\n')) {
    if (/^#{1,6}\s/.test(line)) heading = line.trim()
    for (const m of line.matchAll(place)) {
      const ref = `${basename(m[1])}:${m[2]}`
      if (!out.has(ref)) out.set(ref, heading)
    }
  }
  return out
}

function check(label, original, rewrite) {
  const want = places(readFileSync(original, 'utf8')), have = places(readFileSync(rewrite, 'utf8'))
  const lost = [...want].filter(([ref]) => !have.has(ref))
  console.log(`${label}: ${want.size} places in the original, ${lost.length} missing from the rewrite`)
  for (const [ref, heading] of lost) console.log(`  ${ref}  under ${heading}`)
  return lost.length
}

const isDir = p => statSync(p).isDirectory()
let missing = 0
if (!isDir(a) && !isDir(b)) {
  missing = check(basename(a), a, b)
} else if (isDir(a) && isDir(b)) {
  const results = readdirSync(a).filter(f => !f.startsWith('.') && /\.(md|html|txt)$/.test(f) && statSync(join(a, f)).isFile())
  if (!results.length) { console.error(`no results in ${a}`); process.exit(2) }
  const unpaired = []
  for (const f of results) {
    const name = basename(f, extname(f))
    const candidates = [join(b, `${name}.normalized.md`), join(b, name, `${name}.normalized.md`), join(b, f)]
    const rewrite = candidates.find(p => existsSync(p) && resolve(p) !== resolve(join(a, f)))
    if (rewrite) missing += check(name, join(a, f), rewrite)
    else unpaired.push(name)
  }
  if (unpaired.length) { console.log(`no rewrite found for: ${unpaired.join(', ')}`); missing += unpaired.length }
} else {
  console.error('pass two files or two folders'); process.exit(2)
}
process.exitCode = missing ? 1 : 0
