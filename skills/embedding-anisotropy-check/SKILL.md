---
name: embedding-anisotropy-check
description: 'Check a cosine similarity over embeddings or transformer hidden states before reporting it. Measures the anisotropy of each side, centres by the population mean, and scores matched pairs against a permuted floor taken from the same comparison. Use when comparing one model''s embeddings across precisions, runtimes or layers, when evaluating retrieval, probes or adapters, or before calling a similarity high, two conditions in agreement, or a small gap a null.'
license: MIT
compatibility: Python 3.9+ with numpy
---

# Embedding anisotropy check

Raw cosine between embeddings is rarely centred on zero. Most sentence encoders and most hidden-state layers place
every vector near one shared direction, so two unrelated inputs can score 0.6, 0.9 or 0.99. A matched pair at 0.9 is
then not evidence of anything by itself, and a gap of 0.01 between two conditions can be the whole signal or none of
it. This skill makes every such comparison carry its own floor.

## When to use this skill

- The same inputs under one model at two precisions (bf16 against 4-bit), in two runtimes, or at two nearby layers,
  which share one coordinate space.
- Query and passage, image and caption, or any other paired evaluation inside one embedding space.
- Any sentence claiming that a similarity is high, that two conditions agree, or that a small difference is a null.

Not for two independently trained models as they stand. A rotation of one model's space keeps its geometry and changes
every cosine against the other model, and centring does not align the two bases. Fit an explicit map first, for
example orthogonal Procrustes on a train split of paired rows, and compare the mapped rows; or compare each model's
own within-space similarities instead.

## Procedure

1. Save the compared rows as two `.npy` arrays of shape `(n, d)`, row `i` of A paired with row `i` of B.
2. Choose where the means come from. The best source is a train split from the same domain, model and modality as the
   compared rows. A mean fitted on another domain mis-centres: it can leave part of the shared direction in place,
   remove too much of it, or add a direction of its own, and what it leaves then looks like an effect of whatever
   differs between the domains.
3. Run the bundled script:

   ```bash
   python scripts/anisotropy_check.py A.npy B.npy --fit-a trainA.npy --fit-b trainB.npy
   ```

   Pass `--shared` when A and B come from one model and one population, so that both sides are centred by one mean.
   Without `--fit-a` and `--fit-b` the means are fitted on the compared rows themselves, and the output's `means`
   field says, for each side, which rows its mean came from.
4. Report, side by side: the anisotropy of each side, matched against floor before centring, matched against floor
   after centring, and `partner_ranked_first` against its chance rate `1/n`.

## Reading the output

- `anisotropy` is the mean cosine between different rows of one side. Near 0, raw cosine can be read directly. Above
  about 0.3, read only the centred figures; the script adds a warning.
- `raw.floor` is what an unrelated pair scores in this comparison. A matched cosine means something only through its
  distance from this floor.
- `centred.gap_over_floor_sd` and `centred.cohens_d` say whether matched pairs separate from unrelated ones at all.
- `partner_ranked_first` is the retrieval view of the same pairs. Centring can move a ranking either way, so report it
  both ways rather than assuming it transfers.

## Rules that go with the numbers

- Average the signed difference across seeds or items, then take its absolute value. Averaging absolute differences
  is biased upward, and the bias is greatest when the gap is small relative to its noise.
- Give a gap with its spread and the smallest effect the test could have detected. An underpowered comparison is not
  a refutation, and the report should say which of the two it is.
- Put the floor from the same comparison beside every result. A floor copied from another run, model or domain does
  not correct this one.

## Example

bge-small-en-v1.5 on the first 100 documents of `mteb/scifact`'s corpus, each split into its first and second half at
the middle sentence boundary, with the halves of one abstract as the matched pair and one mean shared by both sides
(`--shared`). `scripts/example_scifact_halves.py` rebuilds it: it pins the corpus at revision `cf10ab6` and the model
at `5c38ec7`, states the sentence split, and needs `datasets` and `sentence-transformers` besides numpy. With datasets
5.0.1, sentence-transformers 6.0.1, torch 2.13.0 and numpy 2.5.1 it gives:

| | matched | floor (unrelated halves) | gap over floor sd |
| --- | ---: | ---: | ---: |
| raw cosine | 0.8636 | 0.6024 | 4.38 |
| centred cosine | 0.6487 | -0.0131 | 5.87 |

The anisotropy is 0.5956 and 0.6148, so before centring an unrelated half already scores 70% of what the matching
half scores. Both readings put the partner first for most abstracts (97 and 98 of 100), but only the centred one says
how far a match stands from an unrelated pair.
