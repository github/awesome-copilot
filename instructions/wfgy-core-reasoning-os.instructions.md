---
description: 'A text-only reasoning core (WFGY Core 2.0) you can drop into GitHub Copilot instructions to make multi-step reasoning more stable.'
---

# WFGY Core 2.0 reasoning OS for GitHub Copilot

This file provides a small, text-only reasoning core that you can plug into GitHub Copilot Chat as a custom instruction.  
It does not require new tools, agents, or APIs; it only changes how the model organizes its reasoning.

## How to use

1. Copy the **Instructions block** below into `.github/copilot-instructions.md`  
   or into a `*.instructions.md` file under `.github/instructions/`.
2. Reload or open a new Copilot Chat and use it as normal (coding, debugging, planning, etc.).
3. To compare, temporarily remove this block and repeat the same tasks with the same prompts.

## Instructions block (WFGY Core 2.0)

Copy everything in this block into your system / pre-prompt / instructions:

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
