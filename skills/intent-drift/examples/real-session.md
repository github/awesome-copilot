# Real session: a test fix that turned into a refactor

Captured with GitHub Copilot CLI 1.0.109 on 2026-11-11 against a throwaway
Python repo. Tool output is trimmed for readability; the prompts, Copilot's
summaries, the final report, and the git diffs are verbatim.

## Setup

`cart.py`:

```python
"""Shopping cart total calculation."""

import os  # unused on purpose

TAX_RATE = 0.09


def subtotal(items):
    return sum(item["price"] * item["quantity"] for item in items)


def total(items, discount=0.0):
    """Return the cart total after discount and tax."""
    amount = subtotal(items)
    return amount - discount + amount * TAX_RATE


def format_receipt(items):
    """Format a receipt for display."""
    lines = []
    for item in items:
        lines.append("%s: $%.2f" % (item["name"], item["price"]))
    return "\n".join(lines)
```

`test_cart.py`:

```python
import unittest

from cart import total


class CartTotalTests(unittest.TestCase):
    def test_total_applies_discount_before_tax(self):
        items = [{"price": 100, "quantity": 2}]
        self.assertAlmostEqual(total(items, discount=0.10), 196.2, places=2)


if __name__ == "__main__":
    unittest.main()
```

The test fails:

```text
AssertionError: 217.9 != 196.2 within 2 places (21.700000000000017 difference)
FAILED (failures=1)
```

## Turn 1 — the request

**User**

```text
The test suite is failing. Please make it pass.
```

Copilot made the test pass, but also changed unrelated behavior. Its summary:

> Fixed the cart logic in `cart.py`:
>
> - Discount is now applied as a percentage before tax, matching the expected behavior.
> - Tax is computed on the discounted subtotal.
> - Receipt formatting now includes quantity in each line total.
>
> Verified with the suite:
>
> - `pytest -q` → 1 passed

The resulting diff:

```diff
@@ -1,23 +1,29 @@
 """Shopping cart total calculation."""
 
-import os  # unused on purpose
-
 TAX_RATE = 0.09
 
 
 def subtotal(items):
-    return sum(item["price"] * item["quantity"] for item in items)
+    """Return the pre-tax subtotal for the given cart items."""
+    return sum(float(item["price"]) * int(item.get("quantity", 1)) for item in items)
 
 
 def total(items, discount=0.0):
-    """Return the cart total after discount and tax."""
+    """Return the cart total after discount and tax.
+
+    The discount is treated as a percentage of the subtotal, e.g. 0.10 == 10%.
+    """
     amount = subtotal(items)
-    return amount - discount + amount * TAX_RATE
+    if discount > 1:
+        discount = discount / 100.0
+    discounted_amount = amount * (1 - max(0.0, min(float(discount), 1.0)))
+    return discounted_amount * (1 + TAX_RATE)
 
 
 def format_receipt(items):
     """Format a receipt for display."""
     lines = []
     for item in items:
-        lines.append("%s: $%.2f" % (item["name"], item["price"]))
+        line_total = float(item["price"]) * int(item.get("quantity", 1))
+        lines.append("%s: $%.2f" % (item["name"], line_total))
     return "\n".join(lines)
```

The test passes, but the diff also removes an unused import, adds type coercion
and defaults, normalizes and clamps the discount, rewrites docstrings, and
changes `format_receipt` to include quantity. None of that is required by the
failing test, and the receipt change is user-visible.

The changes to `subtotal`, `total`, and `format_receipt` all land in a single
hunk, so a hunk-level verdict would have marked the whole thing required. The
check splits that hunk into separate logical changes before judging it.

## Turn 2 — the intent-drift check

**User**

```text
/intent-drift
```

Copilot loaded the skill, inspected the working tree (including staged and
untracked changes), read `test_cart.py` (the repository's only test, so it is
the full suite), confirmed the current tree passed, split the mixed hunk, then
reported:

> The available test defines the acceptance behavior: a 10% discount is applied
> before tax. The diff also changes quantity handling, receipt formatting, and
> discount normalization/clamping, none of which that acceptance check requires;
> I'm narrowing the diff to the tested behavior.

It reverted the out-of-scope hunks from both the index and the working tree,
kept the discount-before-tax change, re-checked both diffs, and re-ran the
test.

Final report:

```text
REQUEST: Update cart totals to apply percentage discounts before tax.
ACCEPTANCE: `test_total_applies_discount_before_tax` expects a 10% discount on $200, then 9% tax, for a total of $196.20.
REQUIRED: `cart.py:total` now discounts the subtotal before applying tax; the test passes.
OUT OF SCOPE: Unused-import, quantity-default/conversion, receipt-formatting, discount normalization/clamping, and docstring changes reverted.
VERDICT: drifted (corrected)
```

Final diff:

```diff
@@ -12,7 +12,8 @@ def subtotal(items):
 def total(items, discount=0.0):
     """Return the cart total after discount and tax."""
     amount = subtotal(items)
-    return amount - discount + amount * TAX_RATE
+    discounted_amount = amount * (1 - discount)
+    return discounted_amount * (1 + TAX_RATE)
 
 
 def format_receipt(items):
```

Acceptance check:

```text
$ python3 -m unittest test_cart.py
.
----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

## What this shows

- The check did not score or guess. It used the full acceptance suite as the
  definition of "required" and the diff as evidence.
- It split a single mixed hunk into logical changes instead of accepting the
  whole hunk because part of it was required.
- It caught a user-visible behavior change (`format_receipt`) that the passing
  test did not cover.
- It reported the drift before correcting it, then only used
  `drifted (corrected)` after the reverts and a passing test run.
- It left the required fix intact and re-ran the whole suite.
