# Validating Evaluators (Python)

Validate LLM evaluators against human-labeled examples. Target >80% TPR/TNR/Accuracy.

## Calculate Metrics

```python
from sklearn.metrics import classification_report, confusion_matrix

print(classification_report(human_labels, evaluator_predictions))

cm = confusion_matrix(human_labels, evaluator_predictions)
tn, fp, fn, tp = cm.ravel()
tpr = tp / (tp + fn)
tnr = tn / (tn + fp)
print(f"TPR: {tpr:.2f}, TNR: {tnr:.2f}")
```

## Correct Production Estimates

```python
def correct_estimate(observed, tpr, tnr):
    """Adjust observed pass rate using known TPR/TNR."""
    return (observed - (1 - tnr)) / (tpr - (1 - tnr))
```

## Find Misclassified

```python
# False Positives: Evaluator pass, human fail
fp_mask = (evaluator_predictions == 1) & (human_labels == 0)
false_positives = dataset[fp_mask]

# False Negatives: Evaluator fail, human pass
fn_mask = (evaluator_predictions == 0) & (human_labels == 1)
false_negatives = dataset[fn_mask]
```

## Red Flags

- TPR or TNR < 70%
- Large gap between TPR and TNR
- Kappa < 0.6
