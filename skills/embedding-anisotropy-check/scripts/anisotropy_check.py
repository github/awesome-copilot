#!/usr/bin/env python3
"""Check a cosine-similarity comparison for anisotropy before trusting it.

Row i of A is paired with row i of B: a query and its gold passage, an image and its caption, or the same input under
two models, precisions, layers or runtimes. For the same pairs the script reports raw and centred cosine for matched
pairs and for a permuted floor (each A row against a B row that is not its partner), and how often the partner ranks
first among all B rows.

  python anisotropy_check.py A.npy B.npy
  python anisotropy_check.py A.npy B.npy --fit-a trainA.npy --fit-b trainB.npy
  python anisotropy_check.py A.npy B.npy --shared

Centring subtracts the mean of the unit-normalised rows of the fit population and normalises again. By default each
side is centred by its own mean, fitted on the compared rows themselves; pass --fit-a and --fit-b to fit on a train
split of the same domain, model and modality instead, and --shared when A and B come from one space and one
population. Needs numpy only; prints one JSON object.
"""
import argparse
import json
import sys

import numpy as np


def unit(x):
    return x / np.maximum(np.linalg.norm(x, axis=1, keepdims=True), 1e-12)


def anisotropy(u):
    """Mean cosine over all pairs of different rows of unit rows u: 0 for an isotropic cloud, near 1 for one direction."""
    n = len(u)
    s = u.sum(0)
    return float((s @ s - n) / (n * (n - 1)))


def derangement(n, rng):
    while True:
        p = rng.permutation(n)
        if not np.any(p == np.arange(n)):
            return p


def compare(ua, ub, perms, rng):
    matched = np.sum(ua * ub, axis=1)
    floor = np.concatenate([np.sum(ua * ub[derangement(len(ub), rng)], axis=1) for _ in range(perms)])
    first = np.concatenate([np.argmax(ua[i:i + 2048] @ ub.T, axis=1) == np.arange(i, min(i + 2048, len(ua)))
                            for i in range(0, len(ua), 2048)])
    gap, sd = float(matched.mean() - floor.mean()), float(floor.std())
    pooled = float(np.sqrt((matched.var() + floor.var()) / 2))
    return {"matched": round(float(matched.mean()), 4), "floor": round(float(floor.mean()), 4), "gap": round(gap, 4),
            "floor_sd": round(sd, 4), "gap_over_floor_sd": round(gap / sd, 2) if sd > 0 else None,
            "cohens_d": round(gap / pooled, 2) if pooled > 0 else None,
            "partner_ranked_first": round(float(first.mean()), 4)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("a", help="(n, d) .npy, row i paired with row i of B")
    ap.add_argument("b", help="(n, d) .npy")
    ap.add_argument("--fit-a", help="rows to fit A's mean on; default A itself")
    ap.add_argument("--fit-b", help="rows to fit B's mean on; default B itself")
    ap.add_argument("--shared", action="store_true", help="one mean over both sides' fit rows")
    ap.add_argument("--perms", type=int, default=20, help="derangements for the floor (default 20)")
    ap.add_argument("--seed", type=int, default=0)
    o = ap.parse_args()
    a, b = np.load(o.a).astype(np.float64), np.load(o.b).astype(np.float64)
    if a.ndim != 2 or a.shape != b.shape or len(a) < 3:
        sys.exit(f"A and B must be paired (n, d) arrays of one shape with n >= 3, got {a.shape} and {b.shape}")
    rng = np.random.default_rng(o.seed)
    ua, ub = unit(a), unit(b)
    fa = unit(np.load(o.fit_a).astype(np.float64)) if o.fit_a else ua
    fb = unit(np.load(o.fit_b).astype(np.float64)) if o.fit_b else ub
    if o.shared:
        mu_a = mu_b = np.vstack([fa, fb]).mean(0)
    else:
        mu_a, mu_b = fa.mean(0), fb.mean(0)
    raw = compare(ua, ub, o.perms, rng)
    cen = compare(unit(ua - mu_a), unit(ub - mu_b), o.perms, rng)
    an = {"a": round(anisotropy(ua), 4), "b": round(anisotropy(ub), 4)}
    share = raw["floor"] / raw["matched"] if raw["matched"] > 0 else None
    out = {"n": len(a), "dim": a.shape[1],
           "means": ("shared" if o.shared else "per side") + (", fitted on the compared rows" if not (o.fit_a or o.fit_b) else ", fitted on the given rows"),
           "anisotropy": an, "raw": raw, "centred": cen, "partner_first_by_chance": round(1 / len(a), 4),
           "reading": (f"Unrelated pairs score {raw['floor']} raw" + (f", {share:.0%} of the matched {raw['matched']}" if share is not None else "")
                       + f"; centred, matched {cen['matched']} against a floor of {cen['floor']}, "
                       f"{cen['gap_over_floor_sd']} floor sd apart. Report the centred pair and the floor, not the raw matched cosine.")}
    if max(an.values()) > 0.3:
        out["warning"] = "anisotropy above 0.3 on at least one side: raw cosines and raw gaps are dominated by the shared direction"
    if not (o.fit_a or o.fit_b) and len(a) < 1000:
        out["note"] = "means fitted on fewer than 1,000 compared rows; fit them on a train split of the same population when you have one"
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
