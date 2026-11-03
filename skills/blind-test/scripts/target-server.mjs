// Serves a blind-test target folder on localhost and logs every state-changing request. Node 18+.
//   node target-server.mjs <folder> [--port 4601] [--log posts.log]      (--port 0 picks a free port)
// GET and HEAD serve files from <folder> (a path without an extension tries <path>.html, then <path>/index.html).
// Anything else (POST, PUT, PATCH, DELETE…) is answered 405 and appended to the log with its body.
// Missing paths get a plain 404 page, so links to screens that don't exist behave like a demo. The log, key.json
// and dotfiles are never served.
import { createServer } from 'node:http'
import { readFile, stat, appendFile } from 'node:fs/promises'
import { join, normalize, extname, resolve, sep } from 'node:path'

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const usage = 'usage: node target-server.mjs <folder> [--port 4601] [--log posts.log]   (--port 0 picks a free port)'
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0) }
const root = args.find((a, i) => !a.startsWith('--') && !['--port', '--log'].includes(args[i - 1]))
if (!root) { console.error(usage); process.exit(2) }
const base = resolve(root)
try { if (!(await stat(base)).isDirectory()) throw 0 } catch { console.error(`not a folder: ${root}`); process.exit(2) }
const port = Number(opt('--port', 4601))
if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error(`bad port: ${opt('--port')}`); process.exit(2) }
const log = resolve(opt('--log', join(base, 'posts.log')))
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' }

const tryFile = async p => { try { const s = await stat(p); return s.isFile() ? p : null } catch { return null } }
async function find(path) {
  let rel
  try { rel = decodeURIComponent(path) } catch { return null }
  const p = normalize(join(base, rel))
  // Inside the folder only. A sibling whose name starts the same way (target-old/) is outside too.
  if (p !== base && !p.startsWith(base + sep)) return null
  if (path.endsWith('/')) return tryFile(join(p, 'index.html'))
  return (await tryFile(p)) || (!extname(p) && ((await tryFile(p + '.html')) || (await tryFile(join(p, 'index.html')))))
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://x')
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    let body = ''
    for await (const c of req) { body += c; if (body.length > 4096) break }
    await appendFile(log, `${new Date().toISOString()} ${req.method} ${req.url}${body ? ' ' + body.slice(0, 4096).replace(/\s+/g, ' ') : ''}\n`)
    res.writeHead(405, { 'content-type': 'text/plain' }); return res.end('Not part of the demo.')
  }
  const file = await find(pathname)
  // Never serve the log, the key or dotfiles, even when they sit inside the target folder.
  if (!file || file === log || /(^|\/)(\.[^/]*|key\.json)$/.test(file)) { res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); return res.end('<!doctype html><title>Not built</title><p>This screen is not part of the demo.</p>') }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
  res.end(req.method === 'HEAD' ? undefined : await readFile(file))
}

// A request that fails answers 500 and the server keeps running: one odd request must not end a run's target.
const server = createServer((req, res) => handle(req, res).catch(e => {
  console.error(`${req.method} ${req.url}: ${e.message}`)
  if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' })
  res.end()
}))
server
  .on('error', e => { if (e.code === 'EADDRINUSE') { console.error(`port ${port} is busy; pass --port <free port>`); process.exit(1) } throw e })
  .listen(port, '127.0.0.1', () => console.log(`target ${base} on http://127.0.0.1:${server.address().port} · log ${log}`))
