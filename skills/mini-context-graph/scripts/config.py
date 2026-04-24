"""
config.py — Global configuration constants for the Context Graph Skill.

Data directories are resolved from environment variables so the skill can be
used from any project without writing data inside the skill package itself.

  MINI_CONTEXT_GRAPH_DATA_DIR  — where graph.json, index.json, etc. live
  MINI_CONTEXT_GRAPH_WIKI_DIR  — where wiki pages, index.md, and log.md live

Both default to subdirectories of the current working directory when the env
vars are not set, so data ends up in the consuming project's directory.
"""

import os
from pathlib import Path

_BASE = Path(os.environ.get("MINI_CONTEXT_GRAPH_BASE", str(Path.cwd())))
DATA_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_DATA_DIR", str(_BASE / "data")))
WIKI_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_WIKI_DIR", str(_BASE / "wiki")))

MAX_GRAPH_DEPTH: int = 2
MIN_CONFIDENCE: float = 0.6
MAX_NODES: int = 50
