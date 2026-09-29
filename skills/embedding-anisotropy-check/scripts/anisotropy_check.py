#!/usr/bin/env python3
"""Check a cosine-similarity comparison for anisotropy before trusting it.

Row i of A is paired with row i of B: a query and its gold passage, an image and its caption, or the same input under
one model at two precisions, layers or runtimes. A and B must live in one coordinate space: two independently trained
models do not, and a row-wise cosine between them is meaningless until an explicit map between the spaces has been
fitted. For the same pairs the script reports raw and centred cosine for matched pairs and for a permuted floor (each A
row against a B row that is not its partner, the same derangements for both readings), and how often the partner
ranks first among all B rows.

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

BLOCK = 2048


def load_rows(path, what):
    x = np.load(path).astype(np.float64)
    if x.ndim != 2:
        sys.exit(f"{what} must be an (n, d) array, got shape {x.shape}")
    bad = ~np.isfinite(x).all(axis=1)
    if bad.any():
        sys.exit(f"{what} has {int(bad.sum())} row(s) with NaN or infinite values; drop or fix them first")
    zero = np.linalg.norm(x, axis=1) < 1e-12
    if zero.any():
        sys.exit(f"{what} has {int(zero.sum())} zero-length row(s), which have no direction; drop them first")
    return x


def unit(x):
    return x / np.linalg.norm(x, axis=1, keepdims=True)


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


def partner_first(ua, ub):
    """Share of A rows whose own partner is the nearest B row, in blocks of both sides so memory stays bounded."""
    hits = 0
    for i in range(0, len(ua), BLOCK):
        qa = ua[i:i + BLOCK]
        best, arg = np.full(len(qa), -np.inf), np.zeros(len(qa), dtype=np.int64)
        for j in range(0, len(ub), BLOCK):
            s = qa @ ub[j:j + BLOCK].T
            k = s.argmax(axis=1)
            v = s[np.arange(len(qa)), k]
            better = v > best
            best[better], arg[better] = v[better], k[better] + j
        hits += int(np.sum(arg == np.arange(i, i + len(qa))))
    return hits / len(ua)


def compare(ua, ub, perms):
    matched = np.sum(ua * ub, axis=1)
    floor = np.concatenate([np.sum(ua * ub[p], axis=1) for p in perms])
    gap, sd = float(matched.mean() - floor.mean()), float(floor.std())
    pooled = float(np.sqrt((matched.var() + floor.var()) / 2))
    return {"matched": round(float(matched.mean()), 4), "floor": round(float(floor.mean()), 4), "gap": round(gap, 4),
            "floor_sd": round(sd, 4), "gap_over_floor_sd": round(gap / sd, 2) if sd > 0 else None,
            "cohens_d": round(gap / pooled, 2) if pooled > 0 else None,
            "partner_ranked_first": round(partner_first(ua, ub), 4)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("a", help="(n, d) .npy, row i paired with row i of B")
    ap.add_argument("b", help="(n, d) .npy in the same coordinate space as A")
    ap.add_argument("--fit-a", help="rows to fit A's mean on; default A itself")
    ap.add_argument("--fit-b", help="rows to fit B's mean on; default B itself")
    ap.add_argument("--shared", action="store_true", help="one mean over both sides' fit rows")
    ap.add_argument("--perms", type=int, default=20, help="derangements for the floor (default 20)")
    ap.add_argument("--seed", type=int, default=0)
    o = ap.parse_args()
    if o.perms < 1:
        ap.error("--perms must be at least 1")
    a, b = load_rows(o.a, "A"), load_rows(o.b, "B")
    if a.shape != b.shape or len(a) < 3:
        sys.exit(f"A and B must be paired arrays of one shape with n >= 3, got {a.shape} and {b.shape}")
    rng = np.random.default_rng(o.seed)
    perms = [derangement(len(b), rng) for _ in range(o.perms)]
    ua, ub = unit(a), unit(b)
    fa = unit(load_rows(o.fit_a, "--fit-a")) if o.fit_a else ua
    fb = unit(load_rows(o.fit_b, "--fit-b")) if o.fit_b else ub
    for f, what in ((fa, "--fit-a"), (fb, "--fit-b")):
        if f.shape[1] != a.shape[1]:
            sys.exit(f"{what} has dimension {f.shape[1]}, the compared rows {a.shape[1]}")
    if o.shared:
        mu_a = mu_b = np.vstack([fa, fb]).mean(0)
    else:
        mu_a, mu_b = fa.mean(0), fb.mean(0)
    raw = compare(ua, ub, perms)
    cen = compare(unit(ua - mu_a), unit(ub - mu_b), perms)
    an = {"a": round(anisotropy(ua), 4), "b": round(anisotropy(ub), 4)}
    share = raw["floor"] / raw["matched"] if raw["matched"] > 0 else None
    source = {"a": f"--fit-a, {len(fa)} rows" if o.fit_a else f"the compared rows, {len(a)}",
              "b": f"--fit-b, {len(fb)} rows" if o.fit_b else f"the compared rows, {len(b)}"}
    means = ({"shared": f"one mean over both sides' fit rows ({source['a']}; {source['b']})"} if o.shared
             else {"a": f"fitted on {source['a']}", "b": f"fitted on {source['b']}"})
    out = {"n": len(a), "dim": a.shape[1], "means": means,
           "anisotropy": an, "raw": raw, "centred": cen, "partner_first_by_chance": round(1 / len(a), 4),
           "reading": (f"Unrelated pairs score {raw['floor']} raw" + (f", {share:.0%} of the matched {raw['matched']}" if share is not None else "")
                       + f"; centred, matched {cen['matched']} against a floor of {cen['floor']}, "
                       f"{cen['gap_over_floor_sd']} floor sd apart. Report the centred pair and the floor, not the raw matched cosine.")}
    if max(an.values()) > 0.3:
        out["warning"] = "anisotropy above 0.3 on at least one side: raw cosines and raw gaps are dominated by the shared direction"
    notes = [f"{side}'s mean is fitted on {len(x)} compared rows; fit it on a train split of the same population when you have one"
             for side, given, x in (("A", o.fit_a, a), ("B", o.fit_b, b)) if not given and len(x) < 1000]
    if notes:
        out["note"] = notes
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
