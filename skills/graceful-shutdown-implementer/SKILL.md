---
name: graceful-shutdown-implementer
description: 'Implement graceful shutdown handling so services drain in-flight work before exiting on SIGTERM. Use when the user asks to handle SIGTERM/SIGINT, avoid dropped requests during deploys or scale-down, close database connections and consumers cleanly, or fix containers that are killed abruptly in Docker or Kubernetes.'
license: MIT
---

# Graceful Shutdown Implementer

Add correct shutdown handling to services so rolling deploys, autoscaling, and container restarts never drop in-flight requests or leave half-finished jobs.

## When to Use This Skill

Use this skill when you need to:
- Handle `SIGTERM`/`SIGINT` in an application that currently exits abruptly
- Stop dropped requests / 502s during rolling deploys or pod eviction
- Close DB pools, message consumers, and background workers in the right order
- Fix Dockerized apps that ignore signals (shell-form CMD, missing init)

## Shutdown Sequence

Implement this order on `SIGTERM`:

1. **Stop accepting new work**: close the listener / fail readiness probe, stop pulling queue messages.
2. **Finish in-flight work** with a deadline (shorter than the orchestrator's grace period).
3. **Close outbound resources**: flush logs/telemetry, close DB pools, commit/nack consumer offsets.
4. **Exit 0**. If the deadline passes, exit non-zero so the abort is visible.

Key timing rule: application drain timeout < `stop_grace_period` (compose) / `terminationGracePeriodSeconds` (K8s), otherwise SIGKILL wins.

## Usage Examples

### Example 1: Node.js HTTP server

```javascript
const server = app.listen(3000);

async function shutdown(signal) {
  console.log(`${signal} received, draining...`);
  const deadline = setTimeout(() => process.exit(1), 25_000); // < grace period
  server.close(async () => {            // stops new conns, waits for in-flight
    await db.end();                     // close pools after requests finish
    clearTimeout(deadline);
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### Example 2: Python worker draining a queue

```python
import signal

stop = False
def handle_sigterm(signum, frame):
    global stop
    stop = True                       # finish current message, then exit loop
signal.signal(signal.SIGTERM, handle_sigterm)

while not stop:
    msg = queue.get(timeout=1)
    if msg:
        process(msg)
        msg.ack()
```

### Example 3: Making containers actually receive SIGTERM

```dockerfile
# BAD: shell form - PID 1 is /bin/sh, signals never reach node
CMD npm start

# GOOD: exec form running the app directly
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose: give the app time to drain
services:
  api:
    init: true                # tiny init forwards signals, reaps zombies
    stop_grace_period: 30s
```

## Guidelines

1. **Exec-form CMD/ENTRYPOINT always** - shell form swallows signals; alternatively use `exec` in entrypoint scripts.
2. **Fail readiness before stopping the listener (K8s)** - traffic may still arrive for a few seconds after SIGTERM; a small pre-stop sleep plus failing readiness closes the race.
3. **Drain order matters** - stop intake → finish work → close dependencies; closing the DB pool first turns in-flight requests into errors.
4. **Test it** - `docker stop` (or `kill -TERM`) under load should produce zero failed requests; make this a CI or staging check.
5. **Idempotent handlers** - guard against double signals; second SIGTERM should not restart the drain.

## Limitations

- Cannot make non-interruptible work (long single transactions, sync FFI calls) drain faster; those need job checkpointing.
- Windows containers use different stop signals; the patterns here target Linux runtimes.
