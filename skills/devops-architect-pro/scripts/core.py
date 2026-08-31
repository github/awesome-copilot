#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps Architect Pro - BM25 search core over local CSV knowledge bases.
Stdlib only: no pip install, no network calls.
"""

import csv
import re
from collections import defaultdict
from math import log
from pathlib import Path

# ============ CONFIGURATION ============
DATA_DIR = Path(__file__).parent.parent / "data"
MAX_RESULTS = 5

# domain -> csv filename under data/. Every domain shares the same schema
# (see SEARCH_COLS / OUTPUT_COLS) so one BM25 config works for all of them.
DOMAINS = {
    "aws": "aws.csv",
    "azure": "azure.csv",
    "kubernetes": "kubernetes.csv",
    "docker": "docker.csv",
    "terraform": "terraform.csv",
    "cloudformation": "cloudformation.csv",
    "ansible": "ansible.csv",
    "jenkins": "jenkins.csv",
    "github-actions": "github-actions.csv",
    "python": "python.csv",
    "java": "java.csv",
    "spring-boot": "spring-boot.csv",
    "postgresql": "postgresql.csv",
    "patroni": "patroni.csv",
    "kafka": "kafka.csv",
    "snowflake": "snowflake.csv",
    "databricks": "databricks.csv",
    "ai-agents": "ai-agents.csv",
    "langchain": "langchain.csv",
    "mcp": "mcp.csv",
    "ci-cd": "ci-cd.csv",
    "linux": "linux.csv",
    "cloudflare": "cloudflare.csv",
}

SEARCH_COLS = ["Category", "Topic", "Keywords", "Guidance"]
OUTPUT_COLS = ["Category", "Topic", "Keywords", "Guidance", "Do", "Don't", "Example", "Severity", "Reference"]

# Columns whose content (commands, code, config snippets) must never be
# hard-truncated for display -- truncating mid-snippet destroys the value.
UNTRUNCATED_COLS = {"Example", "Do", "Don't"}

# ============ TOKENIZATION ============
_STOPWORDS = {
    "to", "in", "on", "at", "is", "of", "by", "or", "an", "if", "no", "so",
    "do", "be", "we", "it", "as", "the", "and", "for", "are", "was",
}

_SYNONYMS = {
    "k8s": "kubernetes",
    "postgres": "postgresql",
    "ci/cd": "ci cd",
    "iac": "infrastructure as code",
    "gha": "github actions",
    "tf": "terraform",
    "colour": "color",
}


def _normalize(text):
    for variant, canonical in _SYNONYMS.items():
        text = text.replace(variant, canonical)
    return text


# ============ BM25 ============
class BM25:
    """BM25 ranking over a small in-memory corpus (one CSV's worth of rows)."""

    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.N = 0
        self.doc_lengths = []
        self.avgdl = 0
        self.idf = {}
        self.doc_freqs = defaultdict(int)
        self._term_freqs = []

    def tokenize(self, text):
        text = _normalize(str(text).lower())
        text = re.sub(r"[^\w\s/]", " ", text)
        return [w for w in text.split() if len(w) >= 2 and w not in _STOPWORDS]

    def fit(self, documents):
        corpus = [self.tokenize(doc) for doc in documents]
        self.N = len(corpus)
        if self.N == 0:
            return
        self.doc_lengths = [len(doc) for doc in corpus]
        self.avgdl = sum(self.doc_lengths) / self.N

        for doc in corpus:
            tf = defaultdict(int)
            for word in doc:
                tf[word] += 1
            self._term_freqs.append(tf)
            for word in tf:
                self.doc_freqs[word] += 1

        for word, freq in self.doc_freqs.items():
            self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query):
        query_tokens = self.tokenize(query)
        scores = []
        for idx in range(self.N):
            score = 0.0
            doc_len = self.doc_lengths[idx]
            term_freqs = self._term_freqs[idx]
            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs.get(token, 0)
                    idf = self.idf[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    score += idf * numerator / denominator
            scores.append((idx, score))
        return sorted(scores, key=lambda x: x[1], reverse=True)

    def vocabulary(self):
        return list(self.idf.keys())


# ============ CSV / INDEX CACHE ============
# Data files are small and get re-hit repeatedly within a single process
# (e.g. an agent running several searches back to back); cache by mtime so
# edits to the CSVs are picked up without a restart.
_csv_cache = {}
_bm25_cache = {}


def _load_csv(filepath):
    mtime = filepath.stat().st_mtime
    cached = _csv_cache.get(filepath)
    if cached and cached[0] == mtime:
        return cached[1]
    with open(filepath, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    _csv_cache[filepath] = (mtime, rows)
    return rows


def _get_bm25(filepath, search_cols, data):
    key = (filepath, tuple(search_cols))
    mtime = filepath.stat().st_mtime
    cached = _bm25_cache.get(key)
    if cached and cached[0] == mtime:
        return cached[1]
    documents = [" ".join(str(row.get(col, "")) for col in search_cols) for row in data]
    bm25 = BM25()
    bm25.fit(documents)
    _bm25_cache[key] = (mtime, bm25)
    return bm25


def _suggest_terms(bm25, query, limit=6):
    """Nearest known vocabulary terms for a 0-hit query, so the caller can
    retry with a real term instead of silently reporting nothing."""
    if bm25 is None:
        return []
    query_tokens = set(bm25.tokenize(query))
    if not query_tokens:
        return []
    candidates = []
    for term in bm25.vocabulary():
        for qt in query_tokens:
            if term.startswith(qt[:3]) or qt.startswith(term[:3]):
                candidates.append(term)
                break
    seen, ordered = set(), []
    for term in candidates:
        if term not in seen:
            seen.add(term)
            ordered.append(term)
    return ordered[:limit]


# ============ DOMAIN AUTO-DETECTION ============
DOMAIN_KEYWORDS = {
    "aws": ["aws", "ec2", "s3 bucket", "lambda", "iam role", "vpc", "cloudwatch", "rds", "eks", "cloudfront", "route53", "dynamodb", "sqs", "sns", "ecs", "fargate", "amazon web services"],
    "azure": ["azure", "aks", "arm template", "azure devops", "blob storage", "azure functions", "entra id", "azure ad", "resource group", "bicep", "azure pipeline"],
    "kubernetes": ["kubernetes", "k8s", "pod", "deployment yaml", "helm", "kubectl", "ingress", "namespace", "statefulset", "hpa", "crd", "kustomize", "cluster"],
    "docker": ["docker", "dockerfile", "container image", "docker-compose", "docker compose", "image layer", "buildkit", "docker build"],
    "terraform": ["terraform", "hcl", "tfstate", "terraform plan", "terraform apply", "provider block", "terraform module", "tfvars", "terraform state"],
    "cloudformation": ["cloudformation", "cfn", "cfn-lint", "nested stack", "change set", "stack template"],
    "ansible": ["ansible", "playbook", "ansible role", "inventory", "ansible-vault", "jinja2", "idempotent", "handler"],
    "jenkins": ["jenkins", "jenkinsfile", "jenkins pipeline", "groovy", "jenkins agent", "declarative pipeline"],
    "github-actions": ["github actions", "github workflow", "workflows/", "runner", "action.yml", "reusable workflow", "gha"],
    "python": ["python", "pip", "virtualenv", "pytest", "asyncio", "type hint", "poetry", "django", "flask", "fastapi"],
    "java": ["java", "jvm", "maven", "gradle", "garbage collection", "thread pool", "classloader", "java heap"],
    "spring-boot": ["spring boot", "spring", "autowired", "application.yml", "spring security", "spring bean", "actuator"],
    "postgresql": ["postgres", "postgresql", "psql", "pg_stat", "vacuum", "index scan", "wal", "replication slot", "postgres query"],
    "patroni": ["patroni", "postgres ha", "leader election", "patronictl", "postgres failover", "postgres cluster", "dcs"],
    "kafka": ["kafka", "kafka broker", "kafka topic", "partition", "consumer group", "zookeeper", "kraft", "kafka offset"],
    "snowflake": ["snowflake", "snowflake warehouse", "snowpipe", "snowsql", "clustering key", "time travel", "snowflake stage"],
    "databricks": ["databricks", "spark", "delta lake", "databricks notebook", "dbfs", "unity catalog", "cluster pool"],
    "ai-agents": ["ai agent", "agentic", "tool use", "autonomous agent", "agent loop", "multi-agent", "react agent"],
    "langchain": ["langchain", "langgraph", "langchain chain", "retriever", "vectorstore", "langsmith", "prompt template"],
    "mcp": ["mcp", "model context protocol", "mcp server", "mcp tool", "stdio transport", "mcp client"],
    "ci-cd": ["ci/cd", "ci cd", "continuous integration", "continuous deployment", "pipeline stage", "build artifact", "deployment gate", "release pipeline"],
    "linux": ["linux", "systemd", "journalctl", "iptables", "cron", "bash script", "filesystem permissions", "ssh", "linux kernel"],
    "cloudflare": ["cloudflare", "cloudflare tunnel", "cloudflare workers", "cloudflare dns", "wrangler", "cloudflare pages", "waf rule"],
}
_DOMAIN_TIEBREAK_ORDER = list(DOMAINS.keys())


def detect_domain(query, return_scores=False):
    """Auto-detect the most relevant domain from a free-text query. Matches
    are weighted by keyword phrase length (more specific phrases outrank
    single generic words); ties break by a fixed domain order."""
    query_lower = query.lower()
    scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        total = 0.0
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", query_lower):
                total += max(1, len(kw.split()))
        scores[domain] = total

    ranked = sorted(
        scores.items(),
        key=lambda item: (
            item[1],
            -_DOMAIN_TIEBREAK_ORDER.index(item[0]) if item[0] in _DOMAIN_TIEBREAK_ORDER else -999,
        ),
        reverse=True,
    )
    best_domain, best_score = ranked[0]
    result = best_domain if best_score > 0 else "linux"

    if return_scores:
        runner_up = ranked[1][0] if len(ranked) > 1 and ranked[1][1] > 0 else None
        return result, runner_up
    return result


# ============ SEARCH ============
def search(query, domain=None, max_results=MAX_RESULTS):
    auto_detected = domain is None
    runner_up = None
    if domain is None:
        domain, runner_up = detect_domain(query, return_scores=True)

    filename = DOMAINS.get(domain)
    if filename is None:
        return {"error": f"Unknown domain: {domain}. Available: {', '.join(DOMAINS)}"}

    filepath = DATA_DIR / filename
    if not filepath.exists():
        return {"error": f"File not found: {filepath}", "domain": domain}

    try:
        data = _load_csv(filepath)
    except (csv.Error, OSError, UnicodeDecodeError) as e:
        return {"error": f"Failed to read {filepath.name}: {e}", "domain": domain}

    bm25 = _get_bm25(filepath, SEARCH_COLS, data) if data else None
    ranked = bm25.score(query) if bm25 else []

    results = []
    for idx, score in ranked[:max_results]:
        if score > 0:
            row = data[idx]
            results.append({col: row.get(col, "") for col in OUTPUT_COLS if col in row})

    out = {
        "domain": domain,
        "query": query,
        "file": filename,
        "count": len(results),
        "results": results,
    }
    if auto_detected:
        out["auto_detected"] = True
        if runner_up:
            out["runner_up_domain"] = runner_up
    if not results:
        out["suggestions"] = _suggest_terms(bm25, query)
    return out
