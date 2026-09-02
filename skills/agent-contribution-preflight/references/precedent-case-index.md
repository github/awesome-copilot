# Precedent case index

Use these as examples of failure modes, not as claims about the identity of any contributor.

- [Matplotlib PR #31132](https://github.com/matplotlib/matplotlib/pull/31132): work reserved for human learning was selected despite policy; the dispute escalated into personal accusations and a locked thread. Control: stop on human-only or AI-prohibited tasks and freeze public replies after moderation.
- [Deskflow PR #8780](https://github.com/deskflow/deskflow/pull/8780): a large patch carried readiness claims that review did not support, followed by repeated resolution claims. Control: bind every claim to evidence and never resolve review comments without fixing them.
- [collective/icalendar discussion #1508](https://github.com/collective/icalendar/discussions/1508): contribution throughput became unsustainable review work and warnings did not change behavior. Control: one active unsolicited PR in an unfamiliar repository until maintainers invite more.
- [curl bug-bounty postmortem](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/): unreproduced security narratives increased triage cost. Control: require a minimal reproducer, affected revision, observed output, impact boundary, and falsification attempt.
- [Apache Log4j discussion #4052](https://github.com/apache/logging-log4j2/discussions/4052): questionable security-report volume slowed real security work. Control: model output is a research lead, not a report.

For a new target, search that target's own recent Issues, PRs, Discussions, labels, and policy history. Record a `LEARNING_DELTA`: the concrete way the current plan avoids repeating the observed failure.
