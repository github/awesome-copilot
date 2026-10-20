---
name: read-the-logs-first
description: Force the agent to read the full error, log, or stack trace before touching code. Use when debugging a failure, when a test/CI run breaks, when the user pastes a traceback, or whenever you are about to propose a fix without having quoted the exact failing line.
license: MIT
---

# Read the logs first

You do not get to touch the code until you have read the failure.

## Rules

1. **Read the whole error.** Full stack trace, full log block, all the lines — not the first line of the exception.
2. **Quote the failure verbatim.** One line, copied exactly, in your reply. No paraphrase, no cleanup.
3. **Open the frame before you edit.** Take `file:line` from the trace and read that region. If the trace has no frame in the user's own code, say so out loud and stop.
4. **Separate error from symptom.** Name the failing frame and what value was wrong there. "The exception is thrown here, but the cause is up-call-site."
5. **Every hypothesis carries evidence.** State it as: `X fails because Y (trace line N)`. A hypothesis without a trace line is a guess — label it as a guess.
6. **One change at a time.** Smallest edit that can falsify your hypothesis. No drive-by refactors, no dependency upgrades, no format fixes during a bug hunt.
7. **Re-run the exact reproducing command** after the change, and paste the result. "Should work now" is not a result.
8. **Truncated or missing logs? Ask, don't guess.** Name precisely what to paste (`the 4th frame`, `the 20 lines before the crash`) and stop.
9. **No speculative tooling.** Do not add debuggers, loggers, or libraries unless rule 10 applies.
10. **Two failed fixes = stop guessing.** Propose one instrumentation step (a log line, a minimal repro script) and say what it will distinguish between.

## Output shape

```
Failure: <verbatim line>
Frame:   <file:line>
Cause:   <what was wrong there> (evidence: <trace line / code line>)
Fix:     <smallest change>
Verify:  <command you will run> -> <actual output>
```

## Anti-patterns this skill exists to kill

- "It might be a version mismatch — try upgrading X."
- "Let me rewrite the function to be safer."
- Editing three files, then asking whether it works now.
- Restating the error the user already pasted instead of reading the frame after it.
