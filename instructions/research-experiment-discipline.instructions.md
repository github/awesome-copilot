---
description: 'Discipline for research and experiment code: score null models first, keep calibration and held-out data physically separate, reproduce a published baseline before claiming improvements, report gains with paired error bars, and verify every guard by deliberately breaking it. Apply when writing evaluation harnesses, benchmark sweeps, or any code that reports a performance number.'
applyTo: '**'
---

# Research Experiment Discipline

In research code the failure mode is rarely a crash; it is a number that
looks great and is wrong. These instructions make evaluation code hard to
fool - starting with its own author.

## Scoring and evaluation

- Route all method scoring through a single evaluation entry point module;
  never compute metrics inline in experiment scripts.
- Score null-model baselines first (constant output, untrained model, input
  copy). A well-scoring null model means the harness is broken: stop and fix
  it before evaluating anything else.
- Keep one positive control - a signal the pipeline must detect. If it stops
  detecting it, freeze conclusions; every null result since is unusable.
- Pin the metric convention (data range, averaging order, aggregation) in
  one place. If a published convention differs from yours, report both,
  labelled.

## Data separation

- Calibration/tuning data and evaluation data live in different files and
  are loaded by different code paths; hyperparameter tuning reads
  calibration data only.
- Split on the unit of independence (patient, user, site, time period), not
  on files - two records from the same entity in different splits is group
  leakage, and it inflates cross-validated gains.
- Budget accesses to the evaluation set; keep one final untouched split that
  is scored exactly once for the headline number.

## Baselines and claims

- Reproduce at least one published baseline number before trusting your own.
  A baseline you cannot match means the recipe has unread layers (optimizer,
  loss, metric convention, operator) - do not "improve" an unmatched
  baseline.
- A gain that does not reproduce on held-out data is not reported.
- Report confirmed gains as paired differences with an interval across
  instances or seeds; a sub-point gain whose interval crosses zero is noise,
  not a result.
- Persist numbers to files and commit them before quoting them in text.

## Guards and tests

- Algorithm implementations exist exactly once, in a module; experiment
  scripts import them, never re-implement inline.
- Every new check or test must be demonstrated to fail on a deliberately
  broken input before it counts - and fail for the right reason, not because
  an unrelated assertion tripped first.
- When a hyperparameter sweep looks flat, measure the gradient force balance
  between loss terms before concluding the parameter is inert; a flat sweep
  often means every tested value sat on one side of the balance point.
