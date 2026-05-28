#!/usr/bin/env python3
"""Render an Okahu eval result JSON into a self-contained HTML report.

Usage:
    python3 .claude/scripts/ok_eval_report.py <path-to-eval-json>

Input JSON shape (produced by /ok-eval):
{
  "mode": "trace-sync" | "batch-async",
  "job": {
    "job_id": "<optional, batch only>",
    "template_name": "sentiment",
    "target": {"app": "...", "workflow": "...", "trace_id": "..."},
    "window": {"start": "ISO", "end": "ISO"} | null,
    "submitted_at": "ISO",
    "duration_s": 12.5,
    "status": "SUCCEEDED" | "FAILED" | "PARTIAL" | "INLINE",
    "shadow_eval": false,
    "fact_name": "traces"
  },
  "results": [
    {
      "fact_id": "<trace_id>",
      "eval_name": "sentiment",
      "eval_found": true,
      "label": "positive",
      "explanation": "...",
      "score": 0.92,
      "extras": {"any": "additional fields"},
      "eval_timestamp": "ISO",
      "workflow_name": "claude-cli-hoc"
    }
  ]
}

Writes <input>.html next to the JSON.
"""
from __future__ import annotations

import html
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

LABEL_PALETTE = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
    "#0891b2", "#db2777", "#65a30d", "#9333ea", "#0d9488",
]


def _coerce_result(raw: dict) -> dict:
    """Flatten MCP- or REST-shaped result into a single dict.

    MCP shape nests verdict under `eval_result`; the skill flattens it but
    older payloads may still be nested. Handle both.
    """
    er = raw.get("eval_result") or {}
    label = raw.get("label") or er.get("label")
    explanation = raw.get("explanation") or er.get("explanation") or ""
    score = raw.get("score")
    if score is None:
        for k in ("score", "confidence", "probability"):
            if k in er:
                score = er[k]
                break
    extras = {k: v for k, v in {**er, **raw.get("extras", {})}.items()
              if k not in {"label", "explanation", "score", "confidence", "probability"}}
    return {
        "fact_id": raw.get("fact_id") or raw.get("trace_id") or "",
        "eval_name": raw.get("eval_name") or "",
        "eval_found": raw.get("eval_found", True),
        "label": label or "—",
        "explanation": explanation,
        "score": score,
        "extras": extras,
        "eval_timestamp": raw.get("eval_timestamp") or "",
        "workflow_name": raw.get("workflow_name") or "",
    }


def _palette_for(labels: list[str]) -> dict[str, str]:
    ordered = sorted({l for l in labels if l})
    return {l: LABEL_PALETTE[i % len(LABEL_PALETTE)] for i, l in enumerate(ordered)}


def _fmt_score(s) -> str:
    if s is None:
        return ""
    try:
        return f"{float(s):.3f}"
    except (TypeError, ValueError):
        return html.escape(str(s))


def _summary_card(job: dict, n_results: int, label_counts: Counter) -> str:
    tgt = job.get("target") or {}
    target_bits = []
    if tgt.get("app"):
        target_bits.append(f"app=<b>{html.escape(tgt['app'])}</b>")
    if tgt.get("workflow"):
        target_bits.append(f"workflow=<b>{html.escape(tgt['workflow'])}</b>")
    if tgt.get("trace_id"):
        tid = tgt["trace_id"]
        short = tid if len(tid) <= 20 else tid[:10] + "…" + tid[-6:]
        target_bits.append(f"trace=<b title=\"{html.escape(tid)}\">{html.escape(short)}</b>")

    window = job.get("window")
    if window:
        window_str = f"{html.escape(window.get('start',''))} → {html.escape(window.get('end',''))}"
    else:
        window_str = "<i>n/a</i>"

    return f"""
<div class="card">
  <div class="card-grid">
    <div><span class="muted">Template</span><div class="big">{html.escape(job.get('template_name',''))}</div></div>
    <div><span class="muted">Target</span><div>{' · '.join(target_bits) or '<i>—</i>'}</div></div>
    <div><span class="muted">Window</span><div>{window_str}</div></div>
    <div><span class="muted">Status</span><div class="status-{html.escape((job.get('status') or '').lower())}">{html.escape(job.get('status','—'))}</div></div>
    <div><span class="muted">Facts evaluated</span><div class="big">{n_results}</div></div>
    <div><span class="muted">Wall time</span><div>{job.get('duration_s', '?')}s</div></div>
    <div><span class="muted">Mode</span><div>{html.escape(job.get('mode','—'))}</div></div>
    <div><span class="muted">Shadow</span><div>{'yes' if job.get('shadow_eval') else 'no'}</div></div>
  </div>
</div>
"""


def _distribution(label_counts: Counter, palette: dict[str, str]) -> str:
    if not label_counts:
        return ""
    total = sum(label_counts.values())
    rows = []
    for lbl, n in label_counts.most_common():
        pct = (n / total) * 100 if total else 0
        color = palette.get(lbl, "#94a3b8")
        rows.append(
            f'<div class="bar-row">'
            f'  <div class="bar-label"><span class="dot" style="background:{color}"></span>{html.escape(lbl)}</div>'
            f'  <div class="bar-track"><div class="bar-fill" style="width:{pct:.1f}%;background:{color}"></div></div>'
            f'  <div class="bar-count">{n} <span class="muted">({pct:.0f}%)</span></div>'
            f'</div>'
        )
    return f'<div class="card"><h2>Label distribution</h2>{"".join(rows)}</div>'


def _results_table(results: list[dict], palette: dict[str, str]) -> str:
    if not results:
        return (
            '<div class="card empty">'
            '<h2>No facts matched</h2>'
            '<p>The eval submitted, but zero facts passed the filters. Double-check the '
            'target / time window / fact_name / eval_filters in the summary above.</p>'
            '</div>'
        )

    def _sort_key(r: dict):
        s = r.get("score")
        try:
            return (-float(s),) if s is not None else (1.0, r.get("fact_id", ""))
        except (TypeError, ValueError):
            return (1.0, r.get("fact_id", ""))

    rows = []
    for i, r in enumerate(sorted(results, key=_sort_key)):
        color = palette.get(r["label"], "#94a3b8")
        tid = r["fact_id"]
        tid_short = tid if len(tid) <= 28 else tid[:14] + "…" + tid[-8:]
        extras_html = ""
        if r["extras"]:
            extras_html = (
                f'<div class="extras"><b>Extras:</b> '
                f'<code>{html.escape(json.dumps(r["extras"], ensure_ascii=False))}</code></div>'
            )
        rows.append(f"""
<details class="row">
  <summary>
    <span class="cell tid" title="{html.escape(tid)}"><code>{html.escape(tid_short)}</code></span>
    <span class="cell label"><span class="pill" style="background:{color}">{html.escape(r['label'])}</span></span>
    <span class="cell score">{_fmt_score(r['score'])}</span>
    <span class="cell wf">{html.escape(r['workflow_name'])}</span>
    <span class="cell ts muted">{html.escape(r['eval_timestamp'])}</span>
  </summary>
  <div class="row-body">
    <div class="explanation"><b>Explanation:</b> {html.escape(r['explanation']) or '<i>none provided</i>'}</div>
    {extras_html}
  </div>
</details>
""")

    return f"""
<div class="card">
  <h2>Results <span class="muted">({len(results)})</span></h2>
  <div class="row head">
    <span class="cell tid">trace_id</span>
    <span class="cell label">label</span>
    <span class="cell score">score</span>
    <span class="cell wf">workflow</span>
    <span class="cell ts">timestamp</span>
  </div>
  {''.join(rows)}
</div>
"""


CSS = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
@media (prefers-color-scheme: dark) { body { background: #0b1220; color: #e2e8f0; } .card { background: #111827; border-color: #1f2937; } .row.head { background: #0f172a; color: #94a3b8; } details.row > summary { background: #111827; } details.row[open] > summary { background: #1f2937; } code, .extras code { background: #0f172a; } }
h1 { margin: 0 0 16px; font-size: 22px; }
h2 { margin: 0 0 12px; font-size: 16px; }
.muted { color: #64748b; font-size: 12px; }
.big { font-size: 18px; font-weight: 600; margin-top: 2px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px 24px; }
.status-succeeded { color: #16a34a; font-weight: 600; }
.status-failed { color: #dc2626; font-weight: 600; }
.status-stopped, .status-partial { color: #d97706; font-weight: 600; }
.status-inline { color: #2563eb; font-weight: 600; }
.bar-row { display: grid; grid-template-columns: 160px 1fr 110px; align-items: center; gap: 12px; padding: 4px 0; }
.bar-label { display: flex; align-items: center; gap: 8px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.bar-track { background: #e2e8f0; border-radius: 6px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; }
.bar-count { font-variant-numeric: tabular-nums; text-align: right; }
.row { display: block; border-top: 1px solid #e2e8f0; }
.row.head { display: grid; grid-template-columns: 240px 140px 80px 160px 1fr; gap: 12px; padding: 8px 12px; background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-radius: 8px 8px 0 0; }
details.row { border: 1px solid transparent; border-top-color: #e2e8f0; }
details.row > summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 240px 140px 80px 160px 1fr; gap: 12px; padding: 10px 12px; background: #fff; align-items: center; }
details.row > summary::-webkit-details-marker { display: none; }
details.row[open] > summary { background: #f8fafc; }
.cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.cell.tid code { background: rgba(148, 163, 184, 0.15); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.cell.score { font-variant-numeric: tabular-nums; text-align: right; padding-right: 12px; }
.pill { display: inline-block; padding: 2px 10px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 600; }
.row-body { padding: 12px 16px 16px; background: #f8fafc; border-top: 1px dashed #e2e8f0; font-size: 13px; }
.explanation { margin-bottom: 8px; }
.extras code { background: rgba(148, 163, 184, 0.15); padding: 2px 6px; border-radius: 4px; font-size: 12px; display: inline-block; word-break: break-all; }
.empty { text-align: center; padding: 40px; color: #64748b; }
footer { color: #64748b; font-size: 12px; text-align: center; margin-top: 16px; }
"""


def render(input_path: Path) -> Path:
    data = json.loads(input_path.read_text(encoding="utf-8"))
    job = dict(data.get("job") or {})
    job.setdefault("mode", data.get("mode", "—"))
    job.setdefault("status", "INLINE" if job["mode"] == "trace-sync" else "SUCCEEDED")

    results_raw = data.get("results") or []
    # Some payloads wrap results in {"results": [...]} once more; unwrap if so.
    if isinstance(results_raw, dict) and "results" in results_raw:
        results_raw = results_raw["results"]
    results = [_coerce_result(r) for r in results_raw]

    labels = [r["label"] for r in results]
    label_counts = Counter(labels)
    palette = _palette_for(labels)

    title = f"Okahu eval · {job.get('template_name','—')}"
    generated = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z")

    body = (
        f"<h1>{html.escape(title)}</h1>"
        + _summary_card(job, len(results), label_counts)
        + _distribution(label_counts, palette)
        + _results_table(results, palette)
        + f'<footer>Generated {html.escape(generated)} · source: <code>{html.escape(input_path.name)}</code></footer>'
    )

    doc = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>{body}</body></html>
"""

    out = input_path.with_suffix(".html")
    out.write_text(doc, encoding="utf-8")
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: ok_eval_report.py <eval-json-path>", file=sys.stderr)
        return 2
    in_path = Path(argv[1]).expanduser().resolve()
    if not in_path.is_file():
        print(f"not a file: {in_path}", file=sys.stderr)
        return 1
    out = render(in_path)
    print(str(out))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
