#!/usr/bin/env python3
"""rsi-skill: evaluate a prompt against test cases and hill-climb it with any open model.

Standard library only. Works with any OpenAI-compatible chat endpoint.

    rsi.py backend                      which model endpoint will be used, and why
    rsi.py init DIR                     scaffold DIR/prompt.md, DIR/cases.jsonl
    rsi.py eval DIR [--prompt FILE]     score a prompt on every case
    rsi.py run DIR [--rounds N]         baseline, then improve the prompt round by round

Backend order (first that works): --base-url; OptiQ Cloud when OPTIQ_CLOUD_KEY is set;
a local `optiq serve` on 127.0.0.1:8080; OPENAI_BASE_URL + OPENAI_API_KEY.

A case is one JSON object per line in cases.jsonl:
    {"input": "...", "expect": "...", "check": "contains"}
check is one of: exact, contains, regex, number, json:<field>, judge (expect is then a rubric).
number compares the last number in the answer with expect (commas, $ and % ignored).
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

OPTIQ_CLOUD = "https://cloud.mlx-optiq.com/api/v1"
OPTIQ_LOCAL = "http://127.0.0.1:8080/v1"
START, END = "<<<PROMPT", "PROMPT>>>"


# ---------- backend

def _get(url: str, key: str | None, timeout: float = 5.0):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"} if key else {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _models(base: str, key: str | None) -> list[str]:
    try:
        return [m["id"] for m in _get(base.rstrip("/") + "/models", key).get("data", [])]
    except Exception:
        return []


def resolve_backend(args) -> dict:
    """Return {base, key, model, why, extra, max_tokens}. Raises SystemExit with setup help if nothing works."""
    be = _resolve(args)
    be["extra"] = {"chat_template_kwargs": {"enable_thinking": False}} if args.no_think else {}
    if args.reasoning_effort:
        be["extra"]["reasoning_effort"] = args.reasoning_effort
    be["max_tokens"] = args.max_tokens
    return be


def _resolve(args) -> dict:
    if args.base_url:
        key = os.environ.get(args.api_key_env) if args.api_key_env else None
        return {"base": args.base_url.rstrip("/"), "key": key, "model": args.model or (_models(args.base_url, key) or [None])[0],
                "why": "--base-url"}
    key = os.environ.get("OPTIQ_CLOUD_KEY")
    if key:
        ms = _models(OPTIQ_CLOUD, key)
        return {"base": OPTIQ_CLOUD, "key": key, "model": args.model or (ms[0] if ms else None), "why": "OPTIQ_CLOUD_KEY is set"}
    ms = _models(OPTIQ_LOCAL, None)
    if ms:
        return {"base": OPTIQ_LOCAL, "key": None, "model": args.model or ms[0], "why": "local optiq serve is running"}
    if os.environ.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_API_KEY"):
        base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        key = os.environ.get("OPENAI_API_KEY")
        return {"base": base, "key": key, "model": args.model or (_models(base, key) or [None])[0], "why": "OPENAI_BASE_URL/OPENAI_API_KEY"}
    sys.exit("No model endpoint found. Pick one:\n"
             "  - OptiQ Cloud: get a key at https://cloud.mlx-optiq.com and export OPTIQ_CLOUD_KEY=...\n"
             "  - Local on a Mac: pip install mlx-optiq && optiq serve  (listens on 127.0.0.1:8080)\n"
             "  - Any OpenAI-compatible API: export OPENAI_BASE_URL=... OPENAI_API_KEY=...")


def chat(be: dict, messages: list[dict], max_tokens: int = 1024, temperature: float = 0.2) -> str:
    if not be.get("model"):
        sys.exit(f"No model selected for {be['base']}; pass --model.")
    body = json.dumps({"model": be["model"], "messages": messages, "max_tokens": max_tokens,
                       "temperature": temperature, **be.get("extra", {})}).encode()
    headers = {"Content-Type": "application/json"}
    if be.get("key"):
        headers["Authorization"] = f"Bearer {be['key']}"
    delay = 2.0
    for attempt in range(6):
        try:
            req = urllib.request.Request(be["base"] + "/chat/completions", data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=300) as r:
                return (json.load(r)["choices"][0]["message"].get("content") or "").strip()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(delay + random.random()); delay = min(delay * 2, 30); continue
            raise SystemExit(f"{be['base']} returned {e.code}: {e.read()[:300].decode(errors='replace')}")
        except urllib.error.URLError as e:
            if attempt < 5:
                time.sleep(delay); delay = min(delay * 2, 30); continue
            raise SystemExit(f"cannot reach {be['base']}: {e.reason}")
    return ""


# ---------- scoring

def strip_think(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()


def score_case(be: dict, case: dict, output: str) -> tuple[bool, str]:
    check = case.get("check", "contains")
    expect = str(case.get("expect", ""))
    out = strip_think(output)
    if check == "exact":
        norm = lambda t: re.sub(r"^[\s\"'`*]+|[\s\"'`*.!,;:]+$", "", t).lower()
        ok = norm(out) == norm(expect)
        return ok, "exact match" if ok else f"answer {out[:60]!r} is not exactly {expect!r}"
    if check == "number":
        nums = re.findall(r"-?\d[\d,]*\.?\d*", out.replace("$", ""))
        try:
            got = float(nums[-1].replace(",", "").rstrip(".")) if nums else None
            ok = got is not None and abs(got - float(expect.replace(",", ""))) < 1e-6
        except ValueError:
            got, ok = None, False
        return ok, f"final number {got}" + ("" if ok else f", expected {expect}")
    if check == "contains":
        ok = expect.lower() in out.lower()
        return ok, "contains expected text" if ok else f"missing {expect!r}"
    if check == "regex":
        ok = re.search(expect, out, re.S) is not None
        return ok, "regex matched" if ok else f"no match for /{expect}/"
    if check.startswith("json:"):
        field = check.split(":", 1)[1]
        m = re.search(r"\{.*\}", out, re.S)
        try:
            val = json.loads(m.group(0)).get(field) if m else None
        except ValueError:
            val = None
        ok = str(val).strip().lower() == expect.strip().lower()
        return ok, f"{field}={val!r}" + ("" if ok else f", expected {expect!r}")
    if check == "judge":
        verdict = chat(be, [
            {"role": "system", "content": "You grade an answer against a rubric. Reply with PASS or FAIL on the first line, then one short reason."},
            {"role": "user", "content": f"Rubric:\n{expect}\n\nTask input:\n{case.get('input','')}\n\nAnswer:\n{out}"}],
            max_tokens=120, temperature=0.0)
        v = strip_think(verdict)
        ok = v.upper().startswith("PASS")
        return ok, v.splitlines()[0][:200] if v else "no verdict"
    raise SystemExit(f"unknown check {check!r}")


def evaluate(be: dict, prompt: str, cases: list[dict], workers: int = 4) -> dict:
    def one(case):
        out = chat(be, [{"role": "system", "content": prompt}, {"role": "user", "content": str(case.get("input", ""))}],
                   max_tokens=case.get("max_tokens", be.get("max_tokens", 1024)))
        if not strip_think(out):
            ok, why = False, "empty answer (a reasoning model may have spent the budget thinking: try --no-think or a larger --max-tokens)"
        else:
            ok, why = score_case(be, case, out)
        return {"input": case.get("input"), "expect": case.get("expect"), "check": case.get("check", "contains"),
                "output": strip_think(out)[:2000], "pass": ok, "why": why}
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        rows = list(ex.map(one, cases))
    passed = sum(r["pass"] for r in rows)
    return {"score": passed / max(len(rows), 1), "passed": passed, "total": len(rows), "rows": rows}


# ---------- climbing

def propose(be: dict, prompt: str, result: dict, max_failures: int = 6) -> str | None:
    fails = [r for r in result["rows"] if not r["pass"]][:max_failures]
    if not fails:
        return None
    shown = "\n\n".join(f"Input: {f['input']}\nExpected ({f['check']}): {f['expect']}\nGot: {f['output'][:600]}\nWhy it failed: {f['why']}"
                        for f in fails)
    msg = (f"Here is a prompt and the cases it fails.\n\nCURRENT PROMPT:\n{prompt}\n\nFAILURES:\n{shown}\n\n"
           "Rewrite the prompt so these cases pass without breaking the ones that already pass. "
           "Make general instructions. Do not quote or paraphrase these specific inputs; revisions that copy test inputs are rejected. "
           f"Return only the new prompt between {START} and {END}.")
    out = strip_think(chat(be, [{"role": "user", "content": msg}], max_tokens=2048, temperature=0.7))
    m = re.search(re.escape(START) + r"\s*(.*?)\s*(?:" + re.escape(END) + r"|$)", out, re.S)
    if m and m.group(1).strip():
        return _clean(m.group(1))
    m = re.search(r"```(?:\w+)?\n(.*?)```", out, re.S)
    return _clean(m.group(1)) if m and m.group(1).strip() else None


def _clean(text: str) -> str:
    """Drop stray halves of the <<<PROMPT / PROMPT>>> markers a model sometimes leaves behind."""
    text = re.sub(r"(PROMPT)?\s*>{2,}\s*$", "", text.strip())
    text = re.sub(r"^\s*<{2,}\s*(PROMPT)?", "", text)
    return text.strip()


def split_cases(cases: list[dict], holdout: float, seed: int) -> tuple[list[dict], list[dict]]:
    if len(cases) < 6 or holdout <= 0:
        return cases, []
    idx = list(range(len(cases)))
    random.Random(seed).shuffle(idx)
    k = max(1, int(round(len(cases) * holdout)))
    hold = {i for i in idx[:k]}
    return [c for i, c in enumerate(cases) if i not in hold], [c for i, c in enumerate(cases) if i in hold]


# ---------- commands

def load(dirp: Path) -> tuple[str, list[dict]]:
    prompt = (dirp / "prompt.md").read_text().strip()
    cases = [json.loads(l) for l in (dirp / "cases.jsonl").read_text().splitlines() if l.strip()]
    if not cases:
        sys.exit("cases.jsonl is empty")
    return prompt, cases


def cmd_init(a):
    d = Path(a.dir); d.mkdir(parents=True, exist_ok=True)
    if not (d / "prompt.md").exists():
        (d / "prompt.md").write_text("Classify the sentiment of the user's message. Reply with one word: positive, negative or neutral.\n")
    if not (d / "cases.jsonl").exists():
        rows = [{"input": "I love this, works perfectly", "expect": "positive", "check": "contains"},
                {"input": "Broke after two days. Refund please.", "expect": "negative", "check": "contains"},
                {"input": "It arrived on Tuesday.", "expect": "neutral", "check": "contains"}]
        (d / "cases.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
    print(f"wrote {d}/prompt.md and {d}/cases.jsonl; replace them with your task, then: rsi.py run {d}")


def cmd_backend(a):
    be = resolve_backend(a)
    print(json.dumps({"base": be["base"], "model": be["model"], "why": be["why"], "key": "set" if be.get("key") else None}, indent=1))


def cmd_eval(a):
    be = resolve_backend(a); d = Path(a.dir)
    prompt, cases = load(d)
    if a.prompt:
        prompt = Path(a.prompt).read_text().strip()
    r = evaluate(be, prompt, cases, a.workers)
    (d / "results").mkdir(exist_ok=True)
    (d / "results" / "eval.json").write_text(json.dumps(r, indent=1))
    print(f"{be['model']} @ {be['base']}: {r['passed']}/{r['total']} passed ({r['score']:.0%})")
    for row in r["rows"]:
        if not row["pass"]:
            print(f"  FAIL  {str(row['input'])[:70]!r}: {row['why']}")


def cmd_run(a):
    be = resolve_backend(a); d = Path(a.dir)
    prompt, cases = load(d)
    train, hold = split_cases(cases, a.holdout, a.seed)
    print(f"backend: {be['model']} @ {be['base']} ({be['why']})")
    print(f"cases: {len(train)} train, {len(hold)} held out")
    best = prompt
    bt = evaluate(be, best, train, a.workers); bh = evaluate(be, best, hold, a.workers) if hold else None
    hist = [{"round": 0, "train": bt["score"], "holdout": bh["score"] if bh else None, "kept": True}]
    print(f"round 0  train {bt['score']:.0%}" + (f"  holdout {bh['score']:.0%}" if bh else ""))
    for rnd in range(1, a.rounds + 1):
        if bt["score"] >= 1.0:
            print("all training cases pass; stopping"); break
        cand = propose(dict(be, model=a.propose_model) if a.propose_model else be, best, bt)
        if not cand:
            print(f"round {rnd}  no usable proposal"); hist.append({"round": rnd, "kept": False}); continue
        copied = [c["input"] for c in cases if len(str(c.get("input", ""))) >= 12 and str(c["input"]).lower() in cand.lower()]
        if copied and not a.allow_copied_cases:
            print(f"round {rnd}  rejected: revision quotes {len(copied)} test input(s) verbatim (overfits)")
            hist.append({"round": rnd, "kept": False, "rejected": "copied test inputs", "prompt": cand}); continue
        ct = evaluate(be, cand, train, a.workers); ch = evaluate(be, cand, hold, a.workers) if hold else None
        better = ct["score"] > bt["score"] and (not hold or ch["score"] >= bh["score"])
        print(f"round {rnd}  train {ct['score']:.0%}" + (f"  holdout {ch['score']:.0%}" if ch else "") + ("  kept" if better else "  discarded"))
        hist.append({"round": rnd, "train": ct["score"], "holdout": ch["score"] if ch else None, "kept": better, "prompt": cand})
        if better:
            best, bt, bh = cand, ct, ch
    out = d / "results"; out.mkdir(exist_ok=True)
    (out / "best_prompt.md").write_text(best + "\n")
    (out / "history.json").write_text(json.dumps({"backend": {k: be[k] for k in ("base", "model", "why")}, "rounds": hist,
                                                   "best_train": bt["score"], "best_holdout": bh["score"] if bh else None}, indent=1))
    print(f"best: train {bt['score']:.0%}" + (f", holdout {bh['score']:.0%}" if bh else "") + f"  ->  {out}/best_prompt.md")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url"); ap.add_argument("--api-key-env", help="env var holding the key for --base-url")
    ap.add_argument("--model")
    ap.add_argument("--no-think", action="store_true", help="ask the server to skip reasoning (chat_template_kwargs.enable_thinking=false)")
    ap.add_argument("--reasoning-effort", help="OpenAI-style reasoning_effort to send (e.g. none, low, high) where the API supports it")
    ap.add_argument("--max-tokens", type=int, default=1024, help="answer budget per case (default 1024)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("backend")
    s = sub.add_parser("init"); s.add_argument("dir")
    s = sub.add_parser("eval"); s.add_argument("dir"); s.add_argument("--prompt"); s.add_argument("--workers", type=int, default=4)
    s = sub.add_parser("run"); s.add_argument("dir"); s.add_argument("--rounds", type=int, default=5)
    s.add_argument("--allow-copied-cases", action="store_true", help="keep revisions that quote test inputs verbatim")
    s.add_argument("--propose-model", help="model that writes revisions (default: same as --model)")
    s.add_argument("--holdout", type=float, default=0.3); s.add_argument("--seed", type=int, default=0); s.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    {"backend": cmd_backend, "init": cmd_init, "eval": cmd_eval, "run": cmd_run}[a.cmd](a)


if __name__ == "__main__":
    main()
