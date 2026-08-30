#!/usr/bin/env python3
"""Validate source provenance offline for curated official docs."""

import sys
from pathlib import Path

# Ensure scripts directory is on sys.path for direct invocation
sys.path.insert(0, str(Path(__file__).resolve().parent))
from doc_freshness import main

if __name__ == "__main__":
    raise SystemExit(main())
