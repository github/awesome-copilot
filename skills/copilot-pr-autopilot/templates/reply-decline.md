# Reply: declined with rationale

Use when triage decided `decline`. The reply must explain WHY
declining is the right call — not just that you considered it. Always
resolve the thread after replying; an open thread with no reply
signals avoidance.

```
Considered this, but declining: <concrete reason rooted in code or
design>. <Optional: the interleaving / scenario you ruled out, or
the alternative cost>. Happy to revisit if <specific trigger>.
```

Example (domain-neutral):

> Considered extending the lock into the initialization path, but
> declining: initialization runs to completion before any concurrent
> caller can reach this code, so the race window only opens after
> the init callback has returned. Sharing the lock across modules
> costs more in coupling than the actual exposure justifies. Happy
> to revisit if telemetry shows a real interleaving.
