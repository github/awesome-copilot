# Minimal example: intent routing with held-out evaluation

Signatures were checked against adaptive-classifier 0.2.0. This script was not run here because it needs encoder weights; ask the user before the first run, since it downloads them.

```python
import random
from collections import Counter, defaultdict
from adaptive_classifier import AdaptiveClassifier

# data: list of (text, label); load your own labeled file
data = [...]
random.Random(0).shuffle(data)

# per-label split: 70% train, 30% test (add a validation split if you tune settings)
by_label = defaultdict(list)
for t, l in data:
    by_label[l].append((t, l))
train, test = [], []
for items in by_label.values():
    cut = max(1, int(0.7 * len(items)))
    train += items[:cut]
    test += items[cut:]

clf = AdaptiveClassifier("sentence-transformers/all-MiniLM-L6-v2")
clf.add_examples([t for t, _ in train], [l for _, l in train])

preds = [clf.predict(t, k=1)[0][0] for t, _ in test]
gold = [l for _, l in test]

acc = sum(p == g for p, g in zip(preds, gold)) / len(gold)
majority = Counter(l for _, l in train).most_common(1)[0][0]
base = sum(g == majority for g in gold) / len(gold)
print(f"accuracy {acc:.3f} vs majority baseline {base:.3f} on n={len(gold)}")

for label in sorted(set(gold)):
    tp = sum(p == g == label for p, g in zip(preds, gold))
    fp = sum(p == label != g for p, g in zip(preds, gold))
    fn = sum(g == label != p for p, g in zip(preds, gold))
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    print(f"{label:20s} P={prec:.2f} R={rec:.2f} n={gold.count(label)}")

clf.save("./intent_classifier")
```

To add a class later: call `clf.add_examples(new_texts, ["new_label"] * len(new_texts))` with at least 10 examples, then re-run the evaluation above, including the old classes.
