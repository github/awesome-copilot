#!/usr/bin/env python3
"""
copilot_matcher.py — Community Copilot Instruction Matcher & Prompt Injector
"""
import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="GitHub Copilot Instruction Matcher")
    parser.add_argument("query", nargs="*", help="Language or framework query (e.g. python, react, docker)")
    args = parser.parse_args()

    q = " ".join(args.query).lower() if args.query else ""
    print(f"Matching Copilot instructions for: '{q}'")
    for p in Path(".").rglob("*.md"):
        if q in p.name.lower():
            print(f"  - Matched: {p}")

if __name__ == "__main__":
    main()
