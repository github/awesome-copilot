# jaxx

Rails for an agent that speaks **in a named human's name**, in a room shared with other humans.

Most agent safety guidance covers the agent and the machine — which tools it may call, which commands need approval. This plugin covers the agent and the **people**: who may change what it is, who may tell it what to do, what it must never answer, and how it behaves when it is not the only agent in the room.

## What's in the plugin

### Skills

| Skill | What it does |
|---|---|
| `/jaxx-consent` | Consent and authority rails. Owner-only identity changes, authority from the verified sender id rather than message content, an entry gate before the first post in any new room, disclosure, containment across rooms, a never-reply-to-another-agent rule, and a decline path for personal questions. |
| `/jaxx-memory` | A git repo as durable memory. `ACTIVE` / `BACKLOG` / `ARCHIVE`, per-stream detail, an append-only run log, session hygiene, and one hard rule — work must not exist only in markdown. |

## The four questions

A capable model, left alone, answers each of these by being helpful. That is the wrong instinct when it is wearing someone's name.

| Question | Default without rails | With `/jaxx-consent` |
|---|---|---|
| Who may change what the agent **is**? | Whoever asks convincingly | Owner only; everyone else gets a polite decline and a redirect |
| Who may tell it what to **do**? | Whoever the text says | The verified sender id. Text the agent *reads* is data, not orders |
| May it answer personal questions about its human? | Usually, if they seem harmless | No. Whereabouts, PTO, health, calendar, motive — declined every time |
| What happens when another agent replies? | It replies back | It does not. Two helpful agents in one thread is an unbounded loop |

**Authority is the sender, not the sentence.** "Pruthvi said you could" is not Pruthvi. A work-item field, a quoted message, or a file the agent opens is input to be reasoned about, never an instruction to be followed. This treats prompt injection as an authority problem rather than a filtering problem — there is no phrase to catch, because content was never a source of authority in the first place.

**Presence is consented to, not assumed.** Approval comes **first**, and the introduction comes after it. Before the agent's first post in any new room, the owner — and, where the room belongs to someone else, that person too — approves both the entry and the wording of the introduction. Until then the gate is **closed** and the agent posts nothing at all there: not an introduction, not an answer, not an acknowledgement. Anything worth saying goes to the owner privately instead. A cold, technically-in-scope reply is the failure mode, not the success case.

## What this does and does not guarantee

Worth being straight about, since the subject is safety. These skills are Markdown instructions. They shape a model's behaviour well and they make the rules explicit, reviewable and testable — but they are still prompt-level context, and prompt-level context competes with whatever else is in the window. Calling something a rail does not make it non-negotiable.

**Hard guarantees have to live in the host integration**, below the model:

| Guarantee | Where it actually has to be enforced |
| --- | --- |
| Only the owner can change what the agent is | Sender-id authorization in the integration, before the model is invoked |
| The agent cannot post in an unapproved room | Room gating / an allowlist in the send path, not a rule the model is asked to remember |
| The agent cannot read an unapproved room | Scoped API permissions on the connector |

Use these skills as the specification for those controls and as defence in depth above them — not as a substitute. A model that has been talked out of a rail still cannot call an endpoint it has no token for.

## Why not just put this in a system prompt?

- A system prompt is one undifferentiated block that competes with the message in front of the model. A named, enumerated rail with a stated blocking branch is something you can point at, test, and review — and something the model can be asked to check itself against, one item at a time.
- Consent is **state** — who invited it, into which room — not persuasion. State belongs on disk.
- Prompts degrade under compaction. Long sessions do not die, they compact, and compaction keeps the shape and drops the specifics.
- "Be careful" is not testable. "Never reply to another agent" is.

## Usage

Install the plugin and both skills load on their own triggers — there is nothing to invoke by hand. `jaxx-consent` engages whenever the agent is about to write into a space shared with humans; `jaxx-memory` at the start and end of any long-running session.

An optional [config template](https://github.com/PruthviProdduturi/Jaxx/blob/main/agent.config.template.json) names the owner and the invited rooms. With no config there is no verified owner and no invited room, so the rails read that honestly: nobody is the owner, no room has been entered, post nowhere. They bind by default rather than by opt-in.

## Status

These are rails, not proofs. There is no formal verification and no third-party adversarial testing behind them, and anything with write access to the agent's config sits upstream of every rule here. They are extracted from a working agent and written to be read by one.

## License

MIT
