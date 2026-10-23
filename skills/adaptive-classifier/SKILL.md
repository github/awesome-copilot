---
name: adaptive-classifier
description: Build, update and honestly evaluate text classifiers with the open-source adaptive-classifier library, which learns new examples and new classes without retraining from scratch. Use for small labeled sets, label sets that change over time, and routing, intent or moderation tasks; not for large static datasets where standard fine-tuning is better.
license: Apache-2.0
---

Use this skill when the user wants a text classifier (https://github.com/codelion/adaptive-classifier) that starts from a few labeled examples and keeps learning. Everything runs locally. Do not call `push_to_hub` or any publish step unless the user explicitly asks.

Ask before anything downloads model weights or datasets. Creating `AdaptiveClassifier(...)` with a model name, `from_pretrained(...)` and ONNX export all fetch or write model files. Say which model and roughly why, and wait for a yes.

## 1. Is it a fit?

Good fit:
- Small labeled sets (tens to a few hundred examples per class).
- Labels that appear or change over time: new intents, new routing tiers, new policy categories.
- Routing, intent detection, moderation triage, ticket tagging, where you want to add examples without a retraining job.

Poor fit:
- A large, static, well-labeled dataset. Standard fine-tuning of an encoder will usually do better and is simpler to reason about.
- Tasks that need long-document understanding, generation, or labels that depend on subtle reasoning rather than text similarity.

Mechanism (from the source): texts are embedded by a pretrained encoder, per-class prototypes are kept in memory, and a small trainable head is blended with prototype similarity. Adding examples retrains the head briefly (10 epochs by default) with EWC protection for old classes.

## 2. Check the install

```bash
python -c "import adaptive_classifier; print(adaptive_classifier.__version__)"
```

If this fails, tell the user the library is missing and point them to the Installation section of the README. Do not run install commands or fetch code for them. The checks below were made against version 0.2.0; if the printed version differs, inspect signatures before relying on this skill:

```bash
python -c "import inspect, adaptive_classifier as a; print(inspect.signature(a.AdaptiveClassifier.__init__))"
```

## 3. Quickstart

```python
from adaptive_classifier import AdaptiveClassifier

clf = AdaptiveClassifier("sentence-transformers/all-MiniLM-L6-v2")  # downloads weights: ask first
clf.add_examples(texts, labels)          # parallel lists of str; labels are str
print(clf.predict("some text", k=3))     # [(label, score), ...] sorted, top k (default 5)
batch = clf.predict_batch(list_of_texts, k=3, batch_size=32)
```

Notes verified in the source:
- `add_examples` raises `ValueError` on empty lists or mismatched lengths. `predict` raises on empty text.
- Encoder choice matters. The README says some models give poor embeddings for short inputs and suggests `bert-base-uncased` or `sentence-transformers/all-MiniLM-L6-v2`. Prefer an encoder trained for sentence similarity.
- Pooling: since 0.2.0 the default `pooling` is `auto` (the model's own sentence-transformers pooling if published, else mean). Options: `"auto"`, `"mean"`, `"cls"`. Classifiers saved before 0.2.0 keep CLS pooling when reloaded.
- Config is a plain dict: `AdaptiveClassifier(name, config={...})`. Defaults checked: `prototype_weight` 0.7, `neural_weight` 0.3, `new_class_example_threshold` 10, `new_class_prototype_weight` 0.3, `new_class_neural_weight` 0.7, `max_examples_per_class` 1000, `epochs` 10. Other constructor args: `device`, `seed=42`, `use_onnx="auto"`, `trust_remote_code=False` (leave it False).

## 4. Add examples and new classes later

```python
clf.add_examples(["Error 404 on login"], ["technical"])   # unseen label = new class
clf.add_examples(more_texts, more_labels)                 # more data for existing classes
print(clf.get_example_statistics()["examples_per_class"])
```

A label that has not been seen creates a new class: the head is expanded and trained with attention to the new class. A class with fewer than `new_class_example_threshold` trained examples leans on the head (0.3 prototype / 0.7 neural by default), so give new classes at least 10 examples before trusting them.

After any addition, re-run your held-out evaluation, because old classes can drift. Other tools: `clear_memory(labels=None)` drops stored examples (all, or the listed labels); `merge_classifiers(other)` merges another classifier with the same embedding size and retrains the head.

Order dependence: the README says example order can change predictions. For strict order independence set `config={"prototype_weight": 1.0, "neural_weight": 0.0}`, at some possible cost in accuracy (the README says "slightly lower"). Treat that as a claim to test on your data.

## 5. Multi-label

```python
from adaptive_classifier import MultiLabelAdaptiveClassifier
m = MultiLabelAdaptiveClassifier(name, default_threshold=0.5, min_predictions=1, max_predictions=5)
m.add_examples(texts, [["a", "b"], ["b"]])            # list of label lists
m.predict_multilabel(text, threshold=None, max_labels=None)
m.get_label_statistics()
```

Thresholds are lowered automatically as the label count grows (README table: 0.5 for 2-4 labels down to 0.1 for 30+). Check precision per label after that adjustment.

## 6. Strategic (anti-gaming) mode

Only for settings where users may rewrite text to game the classifier (spam, review scoring). Enable with `config={"enable_strategic_mode": True}`. Then `predict` blends regular and strategic outputs (0.6 / 0.4 by default); `predict_strategic` and `predict_robust` are the pure variants; `evaluate_strategic_robustness(test_texts, test_labels, gaming_levels=[0.0, 0.5, 1.0])` measures it. README reports 80.00% vs 82.22% clean accuracy and 60.00% vs 82.22% on adversarial examples (regular vs strategic, AI-Secure/adv_glue). The README does not state the sample size; treat it as one benchmark, and run the evaluator on your own data.

## 7. Evaluate honestly

1. Split before training: stratified train / validation / test. Never evaluate on texts that were added with `add_examples`. Remove near-duplicates across splits.
2. Baselines: majority class, and a TF-IDF plus logistic regression model on the same split. If the baseline is close, the encoder is not buying you much.
3. Report per-class precision, recall and F1, plus macro-F1 and the confusion matrix, not only accuracy. Small classes hide in the average.
4. Calibration: bin top-1 scores and compare to observed accuracy; scores are blended similarity and head outputs, not guaranteed probabilities. Pick a rejection threshold on validation data and report coverage against accuracy.
5. Learning curve: re-evaluate at 5, 10, 20, 50 examples per class to show how much data the task needs.
6. After adding a new class, report the change in old-class scores, and test the order sensitivity by shuffling the example order with a few seeds.
7. Compare `prototype_weight` / `neural_weight` and `pooling` settings on the validation split only, then touch the test split once.

State the sample sizes with every number. The README figures for hallucination detection (51.54% F1) and LLM routing (32.40% cost savings on 500 queries) come from the project's own benchmarks on specific datasets; do not present them as expected results on the user's task.

## 8. Save and load

```python
clf.save("./my_classifier")                                  # include_onnx=True by default
clf2 = AdaptiveClassifier.load("./my_classifier")            # use_onnx="auto", prefer_quantized=True
clf3 = AdaptiveClassifier.load("./my_classifier", use_onnx=False)  # force PyTorch
```

`save(save_dir, include_onnx=True, quantize_onnx=True)`. Use `include_onnx=False` to skip the ONNX export. `load(save_dir, device=None, use_onnx="auto", prefer_quantized=True, trust_remote_code=False)`. Loading a hub model with `from_pretrained("owner/name")` downloads files: ask first, and only for names the user gave. The README lists pretrained classifiers on the hub; check what each was trained on before use.

## 9. Standard vs ONNX path

`use_onnx="auto"` uses ONNX on CPU and PyTorch on GPU. The README claims 2-4x faster CPU inference with ONNX (its example: 8.3 ms vs 2.1 ms per query for one model) and a quantized default that is smaller; use `prefer_quantized=False` when accuracy matters more. If the ONNX extras are missing, the library logs a warning and falls back to PyTorch. Compare predictions from both paths on your validation set before switching.

## 10. Limits

- Quality depends on the encoder and on how separable the classes are in embedding space.
- Each `add_examples` call retrains the head, so many tiny calls cost more than one batch.
- Order of updates can change results; retrain from the full set periodically if consistency matters.
- Per-class memory is capped by `max_examples_per_class` (1000), so old examples can be evicted.
- Labels are plain strings. Inconsistent spelling makes accidental new classes: check `get_example_statistics()["num_classes"]` after each update.
- Not an LLM and does not explain its decisions. For moderation or other high-stakes use, keep a human review path.

A minimal complete example is in `references/minimal_example.md`.

## What was verified

Signatures, defaults and config keys above were checked with `inspect` and `ModelConfig` on version 0.2.0. Behavior that needs model weights (training, predictions, save/load, ONNX, strategic evaluation) was read from source and README, not run.
