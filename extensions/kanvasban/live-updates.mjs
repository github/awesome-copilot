import { readStories } from './backlog-store.mjs'

export function streamStories(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  response.flushHeaders()
  response.write('retry: 1000\n\n')
  let previous
  let running = false
  let closed = false

  async function sendSnapshot() {
    if (running || closed) return
    running = true
    try {
      const { stories, projects } = await readStories()
      const data = JSON.stringify({ stories, projects })
      if (!closed && data !== previous) {
        response.write(`event: stories\ndata: ${data}\n\n`)
        previous = data
      }
    } catch (error) {
      if (!closed) {
        response.write(`event: storage-error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
        previous = undefined
      }
    } finally {
      running = false
    }
  }

  // Reading the canonical file also detects atomic writes from other agent processes.
  const updates = setInterval(() => void sendSnapshot(), 500)
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000)
  response.on('close', () => {
    closed = true
    clearInterval(updates)
    clearInterval(heartbeat)
  })
  void sendSnapshot()
}
