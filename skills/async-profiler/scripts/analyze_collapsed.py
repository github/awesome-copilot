#!/usr/bin/env python3
"""
analyze_collapsed.py — Quick analysis of async-profiler collapsed stack output.

Collapsed stack format: each line is a semicolon-separated call stack
(bottom frame first) followed by a sample count:
  com/example/App.main;com/example/Service.process;java/util/HashMap.get 42

Usage:
  python3 analyze_collapsed.py <profile.collapsed> [options]

Options:
  --top N           Show top N frames (default: 20)
  --grep PATTERN    Filter: only include stacks matching PATTERN
  --exclude PATTERN Filter: exclude stacks matching PATTERN
  --packages        Group results by top-level package instead of method
  --self-time       Show only leaf (self-time) frames, not inclusive time
  --csv             Output as CSV instead of table
"""

from __future__ import annotations

import csv
import sys
import re
from collections import defaultdict
from pathlib import Path
from typing import Optional, Pattern


def parse_collapsed(path: str) -> list[tuple[list[str], int]]:
    """Parse a collapsed stack file into (frames, count) tuples."""
    stacks = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Last token is the count; everything before is the stack
            parts = line.rsplit(None, 1)
            if len(parts) != 2:
                continue
            try:
                count = int(parts[1])
            except ValueError:
                continue
            frames = parts[0].split(";")
            stacks.append((frames, count))
    return stacks


def compile_pattern(name: str, pattern: Optional[str]) -> Optional[Pattern[str]]:
    if not pattern:
        return None
    try:
        return re.compile(pattern, re.IGNORECASE)
    except re.error as exc:
        print(f"❌ Invalid regex for --{name}: {exc}", file=sys.stderr)
        sys.exit(1)


def matches_filters(frames, grep_re=None, exclude_re=None):
    stack_str = ";".join(frames)
    if grep_re and not grep_re.search(stack_str):
        return False
    if exclude_re and exclude_re.search(stack_str):
        return False
    return True


def top_leaf_frames(stacks, n=20, grep_re=None, exclude_re=None):
    """Count samples where each frame is the leaf (top of stack = actual work)."""
    counts = defaultdict(int)
    for frames, count in stacks:
        if not frames:
            continue
        if not matches_filters(frames, grep_re, exclude_re):
            continue
        leaf = frames[-1]
        counts[leaf] += count
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]


def top_inclusive_frames(stacks, n=20, grep_re=None, exclude_re=None):
    """Count samples where each frame appears anywhere in the stack (inclusive time)."""
    counts = defaultdict(int)
    for frames, count in stacks:
        if not matches_filters(frames, grep_re, exclude_re):
            continue
        seen = set()
        for frame in frames:
            if frame not in seen:
                counts[frame] += count
                seen.add(frame)
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]


def top_packages(stacks, n=20, grep_re=None, exclude_re=None):
    """Group inclusive time by top-level Java package."""
    counts = defaultdict(int)
    for frames, count in stacks:
        if not matches_filters(frames, grep_re, exclude_re):
            continue
        seen_pkgs = set()
        for frame in frames:
            # Extract package: everything up to the last '/' before the class name
            # e.g. "com/example/Service.process" → "com/example"
            # e.g. "[vmlinux]" → "[kernel]"
            if frame.startswith("["):
                pkg = "[kernel]" if frame == "[vmlinux]" else frame
            elif "/" in frame:
                pkg = frame.rsplit("/", 1)[0].replace("/", ".")
            elif "." in frame:
                pkg = frame.rsplit(".", 1)[0]
            else:
                pkg = frame
            if pkg not in seen_pkgs:
                counts[pkg] += count
                seen_pkgs.add(pkg)
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]


def print_table(rows, total, header_left, header_right="Samples", csv_mode=False):
    if csv_mode:
        writer = csv.writer(sys.stdout)
        writer.writerow([header_left, header_right, "Pct"])
        for name, count in rows:
            pct = 100.0 * count / total if total else 0
            writer.writerow([name, count, f"{pct:.1f}"])
        return

    if not rows:
        print("  (no data)")
        return

    max_name = max(len(r[0]) for r in rows)
    max_name = max(max_name, len(header_left))
    col_w = min(max_name, 80)

    bar_total = rows[0][1] if rows else 1
    print(f"  {'─' * (col_w + 32)}")
    print(f"  {header_left:<{col_w}}  {header_right:>8}  {'%':>6}  {'bar'}")
    print(f"  {'─' * (col_w + 32)}")

    for name, count in rows:
        pct = 100.0 * count / total if total else 0
        bar_len = int(30 * count / bar_total) if bar_total else 0
        bar = "█" * bar_len
        display = name if len(name) <= col_w else "…" + name[-(col_w - 1) :]
        print(f"  {display:<{col_w}}  {count:>8,}  {pct:>5.1f}%  {bar}")

    print(f"  {'─' * (col_w + 32)}")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Analyze async-profiler collapsed stack output",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("file", help="Path to .collapsed stack file")
    parser.add_argument(
        "--top", type=int, default=20, help="Number of top frames to show"
    )
    parser.add_argument(
        "--grep", metavar="PATTERN", help="Only include stacks matching this regex"
    )
    parser.add_argument(
        "--exclude", metavar="PATTERN", help="Exclude stacks matching this regex"
    )
    parser.add_argument(
        "--packages", action="store_true", help="Group by package instead of method"
    )
    parser.add_argument(
        "--self-time",
        action="store_true",
        dest="self_time",
        help="Show only leaf frames (self-time), not inclusive",
    )
    parser.add_argument("--csv", action="store_true", help="Output as CSV")
    args = parser.parse_args()
    grep_re = compile_pattern("grep", args.grep)
    exclude_re = compile_pattern("exclude", args.exclude)

    path = args.file
    if not Path(path).exists():
        print(f"❌ File not found: {path}", file=sys.stderr)
        sys.exit(1)

    print("\n📊 async-profiler collapsed stack analysis")
    print(f"   File: {path}\n")

    stacks = parse_collapsed(path)
    if not stacks:
        print("❌ No stack data found. Is this a valid .collapsed file?")
        sys.exit(1)

    total_samples = sum(c for _, c in stacks)
    total_stacks = len(stacks)

    filters = ""
    if args.grep:
        filters += f"  grep={args.grep}"
    if args.exclude:
        filters += f"  exclude={args.exclude}"
    if filters:
        # count how many survive the filter
        surviving = sum(
            c
            for frames, c in stacks
            if matches_filters(frames, grep_re, exclude_re)
        )
        matching_pct = 0.0 if total_samples == 0 else 100 * surviving / total_samples
        print(f"  Filters applied:{filters}")
        print(
            f"  Matching samples: {surviving:,} / {total_samples:,} "
            f"({matching_pct:.1f}%)\n"
        )

    print(f"  Total samples : {total_samples:,}")
    print(f"  Unique stacks : {total_stacks:,}\n")

    if args.packages:
        rows = top_packages(stacks, args.top, grep_re, exclude_re)
        print(f"  Top {args.top} packages by inclusive time:\n")
        print_table(rows, total_samples, "Package", csv_mode=args.csv)
    elif args.self_time:
        rows = top_leaf_frames(stacks, args.top, grep_re, exclude_re)
        print(f"  Top {args.top} methods by self-time (leaf frames):\n")
        print_table(rows, total_samples, "Method (leaf / self-time)", csv_mode=args.csv)
    else:
        # Default: show both self-time and inclusive for context
        leaf_rows = top_leaf_frames(stacks, args.top, grep_re, exclude_re)
        incl_rows = top_inclusive_frames(stacks, args.top, grep_re, exclude_re)

        print(f"  Top {args.top} by self-time (leaf frames — actual CPU consumers):\n")
        print_table(leaf_rows, total_samples, "Method (self-time)", csv_mode=args.csv)
        print()
        print(f"  Top {args.top} by inclusive time (appears anywhere in stack):\n")
        print_table(incl_rows, total_samples, "Method (inclusive)", csv_mode=args.csv)

    print()
    print("  Tips:")
    print("  • High self-time → direct optimization target")
    print("  • High inclusive but low self-time → dispatcher/framework overhead")
    print("  • Filter to your code: --grep 'com/yourcompany'")
    print("  • Exclude noise:      --exclude 'sun/reflect|\\$\\$Lambda'")
    print("  • Group by package:   --packages")
    print()


if __name__ == "__main__":
    main()
