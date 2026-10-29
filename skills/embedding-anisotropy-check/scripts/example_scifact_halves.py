"""The SKILL.md example: bge-small-en-v1.5 on the first 100 documents of mteb/scifact's corpus, each split into its first
and second half at the middle sentence boundary, checked by the skill's script with one shared mean. Needs datasets and
sentence-transformers besides numpy; the inputs are pinned to revisions, and the output records the library versions.

  python example_scifact_halves.py OUTDIR

Sentences are split after '.', '!' or '?' followed by whitespace; the first half is the first len(sentences) // 2 of
them (at least one), and the second half is the rest.
"""
import json
import os
import re
import subprocess
import sys

import datasets
import numpy as np
import sentence_transformers
import torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

DATASET, DATASET_REV = "mteb/scifact", "cf10ab6856b15b0e670ef8ae5dae4e266c12d035"
MODEL, MODEL_REV = "BAAI/bge-small-en-v1.5", "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
docs = load_dataset(DATASET, "corpus", split="corpus", revision=DATASET_REV).select(range(100))
halves = []
for text in list(docs["text"]):
    s = re.split(r"(?<=[.!?])\s+", text.strip())
    k = max(1, len(s) // 2)
    halves.append((" ".join(s[:k]), " ".join(s[k:]) or s[-1]))
m = SentenceTransformer(MODEL, revision=MODEL_REV, device="cpu")
np.save(os.path.join(out, "A.npy"), m.encode([h[0] for h in halves], normalize_embeddings=True))
np.save(os.path.join(out, "B.npy"), m.encode([h[1] for h in halves], normalize_embeddings=True))
here = os.path.dirname(os.path.abspath(__file__))
script = next(p for p in (os.path.join(here, "anisotropy_check.py"), os.path.join(here, "embedding-anisotropy-check", "scripts", "anisotropy_check.py")) if os.path.exists(p))
res = subprocess.run([sys.executable, script, os.path.join(out, "A.npy"), os.path.join(out, "B.npy"), "--shared"],
                     capture_output=True, text=True, check=True).stdout
res = json.loads(res)
res["data"] = {"corpus": f"{DATASET}@{DATASET_REV} corpus, rows 0-99", "ids": list(docs["_id"]), "model": f"{MODEL}@{MODEL_REV}",
               "versions": {"datasets": datasets.__version__, "sentence_transformers": sentence_transformers.__version__,
                            "torch": torch.__version__, "numpy": np.__version__}}
json.dump(res, open(os.path.join(out, "example_scifact_halves.json"), "w"), indent=1)
print(json.dumps({k: res[k] for k in ("anisotropy", "raw", "centred")}))
