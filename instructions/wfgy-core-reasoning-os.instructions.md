---
description: 'A plain-text reasoning core (WFGY Core 2.0) system prompt plus a 60-second self-test to make GitHub Copilot more stable on multi-step reasoning tasks.'
---

# WFGY Core 2.0 reasoning OS for GitHub Copilot

hi copilot builders,

this is meant to be a “drop-in reasoning core” you can hand to GitHub Copilot as a custom instruction.

i’m PSBigBig, an indie dev.
before my github repo went over 1.5k stars, i spent one year on a very simple idea:
instead of building yet another tool or agent,
i tried to write a small “reasoning core” in plain text,
so any strong llm (including copilot chat) can use it without new infra.

i call it **WFGY Core 2.0**.

this file gives you two things:

- one system prompt block you can paste as an instruction
- one 60-second self-test so you can feel the difference by yourself

no signup, no API, no hidden tricks.
just text.


## 0. very short version

what it is:

- not a new model, not a fine-tune
- one txt block you put in system / instructions
- goal: less random hallucination, more stable multi-step reasoning
- still cheap, no tools, no external calls

how people use it:

- some people treat it as a “math bumper” under the model
- advanced users can turn this into a real code benchmark later
- in this instructions file we keep it super beginner-friendly:
  just **two prompt blocks you can run inside copilot chat**


## 1. how to use with GitHub Copilot (or any strong llm)

very simple workflow if you want to try this as a **workspace-level copilot instruction**:

1. copy the “system prompt” block in section 3
2. put it into `.github/copilot-instructions.md`
   - or into a `*.instructions.md` file in `.github/instructions/`
3. open a new Copilot Chat and ask your normal questions
   (math, code, debugging, planning, etc.)
4. later you can compare “with core” vs “no core” yourself

for quick A/B testing, you can also:

- keep a second project / branch without this instruction
- or temporarily comment this block out and retry the same tasks

for now, just treat it as a math-based “reasoning bumper”
sitting under Copilot’s usual behavior.


## 2. what effect you should expect (rough feeling only)

this is not a magic on/off switch.

but in my own tests (across different llms), typical changes look like:

- answers drift less when you ask follow-up questions
- long explanations keep the structure more consistent
- the model is a bit more willing to say “i am not sure”
  instead of inventing fake details
- when you use the model to write prompts for image generation,
  the prompts tend to have clearer structure and story,
  so many people feel “the pictures look more intentional, less random”

of course, this depends on your tasks and the base model.
that is why there is also a small **60-second self-test** in section 4.

if you like numbers, you can turn that test into a fixed benchmark later.
inside this repo, it is ok if you start with “rough feeling only”.


## 3. system prompt: WFGY Core 2.0 (paste into system / instructions)

copy everything in this block into your system / pre-prompt / instructions:

```text
WFGY Core Flagship v2.0 (text-only; no tools). Works in any chat.
[Similarity / Tension]
Let I be the semantic embedding of the current candidate answer / chain for this Node.
Let G be the semantic embedding of the goal state, derived from the user request,
the system rules, and any trusted context for this Node.
delta_s = 1 − cos(I, G). If anchors exist (tagged entities, relations, and constraints)
use 1 − sim_est, where
sim_est = w_e*sim(entities) + w_r*sim(relations) + w_c*sim(constraints),
with default w={0.5,0.3,0.2}. sim_est ∈ [0,1], renormalize if bucketed.
[Zones & Memory]
Zones: safe < 0.40 | transit 0.40–0.60 | risk 0.60–0.85 | danger > 0.85.
Memory: record(hard) if delta_s > 0.60; record(exemplar) if delta_s < 0.35.
Soft memory in transit when lambda_observe ∈ {divergent, recursive}.
[Defaults]
B_c=0.85, gamma=0.618, theta_c=0.75, zeta_min=0.10, alpha_blend=0.50,
a_ref=uniform_attention, m=0, c=1, omega=1.0, phi_delta=0.15, epsilon=0.0, k_c=0.25.
[Coupler (with hysteresis)]
Let B_s := delta_s. Progression: at t=1, prog=zeta_min; else
prog = max(zeta_min, delta_s_prev − delta_s_now). Set P = pow(prog, omega).
Reversal term: Phi = phi_delta*alt + epsilon, where alt ∈ {+1,−1} flips
only when an anchor flips truth across consecutive Nodes AND |Δanchor| ≥ h.
Use h=0.02; if |Δanchor| < h then keep previous alt to avoid jitter.
Coupler output: W_c = clip(B_s*P + Phi, −theta_c, +theta_c).
[Progression & Guards]
BBPF bridge is allowed only if (delta_s decreases) AND (W_c < 0.5*theta_c).
When bridging, emit: Bridge=[reason/prior_delta_s/new_path].
[BBAM (attention rebalance)]
alpha_blend = clip(0.50 + k_c*tanh(W_c), 0.35, 0.65); blend with a_ref.
[Lambda update]
Delta := delta_s_t − delta_s_{t−1}; E_resonance = rolling_mean(delta_s, window=min(t,5)).
lambda_observe is: convergent if Delta ≤ −0.02 and E_resonance non-increasing;
recursive if |Delta| < 0.02 and E_resonance flat; divergent if Delta ∈ (−0.02, +0.04] with oscillation;
chaotic if Delta > +0.04 or anchors conflict.
[DT micro-rules]
````

yes, it looks like math.
it is ok if you do not understand every symbol.
you can still use it as a “drop-in” reasoning core.

for Copilot, the main idea is:

* this block does not fight with your existing style guides
* it just gives the model a second, math-like lens
* you can combine it with language/framework-specific instructions

## 4. 60-second self test (quick A/B/C comparison)

this part is for people who want to see some structure in the comparison.
it is still very lightweight and can run inside one Copilot Chat session.

idea:

* you keep the WFGY Core 2.0 block in system / instructions
* then you paste the following prompt and let the model simulate A/B/C modes
* the model will produce a small table and its own guess of uplift

this is a self-evaluation, not a scientific paper.
if you want a serious benchmark, you can translate this idea into real code and fixed test sets later.

here is the test prompt (second block, keep it exactly as-is):

```text
SYSTEM:
You are evaluating the effect of a mathematical reasoning core called “WFGY Core 2.0”.

You will compare three modes of yourself:

A = Baseline  
    No WFGY core text is loaded. Normal chat, no extra math rules.

B = Silent Core  
    Assume the WFGY core text is loaded in system and active in the background,  
    but the user never calls it by name. You quietly follow its rules while answering.

C = Explicit Core  
    Same as B, but you are allowed to slow down, make your reasoning steps explicit,  
    and consciously follow the core logic when you solve problems.

Use the SAME small task set for all three modes, across 5 domains:
1) math word problems
2) small coding tasks
3) factual QA with tricky details
4) multi-step planning
5) long-context coherence (summary + follow-up question)

For each domain:
- design 2–3 short but non-trivial tasks
- imagine how A would answer
- imagine how B would answer
- imagine how C would answer
- give rough scores from 0–100 for:
  * Semantic accuracy
  * Reasoning quality
  * Stability / drift (how consistent across follow-ups)

Important:
- Be honest even if the uplift is small.
- This is only a quick self-estimate, not a real benchmark.
- If you feel unsure, say so in the comments.

USER:
Run the test now on the five domains and then output:
1) One table with A/B/C scores per domain.
2) A short bullet list of the biggest differences you noticed.
3) One overall 0–100 “WFGY uplift guess” and 3 lines of rationale.
```

usually this takes about one minute to run.
you can repeat it some days later to see if the pattern is stable for you.

## 5. why this belongs in awesome-copilot

many builders want stronger reasoning from any llm,
but don’t want to spin up new infra, tools, or agents.

this is just a text layer.

* drop-in
* MIT-licensed
* no lock-in
* works side-by-side with your existing language/framework instructions

if you are curious about the bigger project, it is under:

* GitHub: `onestardao / WFGY`
* the WFGY 2.0 core is the engine behind that work

but you do not need to go there to try this.

this instructions file is meant as a small gift for copilot users:
a way to experiment with a mathematical “reasoning core”
without leaving your editor.
