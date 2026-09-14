from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from urllib.parse import urlsplit

from audit_types import Audit, Question, Relationship, Run, RunStatus


@dataclass(frozen=True, slots=True)
class QuestionSummary:
    question: Question
    valid_runs: int
    named_runs: int
    failed_runs: int
    median_position: int | None
    competitors: tuple[str, ...]
    evidence_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class CompetitorSummary:
    name: str
    answer_count: int


@dataclass(frozen=True, slots=True)
class DomainSummary:
    domain: str
    answer_count: int
    relationship: Relationship


@dataclass(frozen=True, slots=True)
class AuditSummary:
    valid_runs: int
    named_runs: int
    failed_runs: int
    named_rate: float
    valid_questions: int
    named_questions: int
    question_coverage: float
    questions: tuple[QuestionSummary, ...]
    competitors: tuple[CompetitorSummary, ...]
    domains: tuple[DomainSummary, ...]


def normalize_domain(url: str) -> str:
    hostname = urlsplit(url).hostname or ""
    normalized = hostname.lower()
    if normalized.startswith("www."):
        return normalized[4:]
    return normalized


def _median_position(runs: tuple[Run, ...]) -> int | None:
    positions = sorted(
        run.brand_position
        for run in runs
        if run.brand_position is not None
    )
    if not positions:
        return None
    return positions[(len(positions) - 1) // 2]


def _question_summary(question: Question, runs: tuple[Run, ...]) -> QuestionSummary:
    completed = tuple(run for run in runs if run.status is RunStatus.COMPLETED)
    failed = tuple(run for run in runs if run.status is RunStatus.FAILED)
    named = tuple(run for run in completed if run.brand_mentioned)
    competitors = sorted(
        {
            competitor
            for run in completed
            for competitor in run.competitors
        }
    )
    return QuestionSummary(
        question=question,
        valid_runs=len(completed),
        named_runs=len(named),
        failed_runs=len(failed),
        median_position=_median_position(named),
        competitors=tuple(competitors),
        evidence_ids=tuple(run.id for run in runs),
    )


def aggregate(audit: Audit) -> AuditSummary:
    completed = tuple(
        run for run in audit.runs if run.status is RunStatus.COMPLETED
    )
    failed = tuple(run for run in audit.runs if run.status is RunStatus.FAILED)
    named = tuple(run for run in completed if run.brand_mentioned)

    question_summaries = tuple(
        _question_summary(
            question,
            tuple(run for run in audit.runs if run.question_id == question.id),
        )
        for question in audit.questions
    )
    valid_questions = sum(
        1 for summary in question_summaries if summary.valid_runs > 0
    )
    named_questions = sum(
        1 for summary in question_summaries if summary.named_runs > 0
    )

    competitor_counts = Counter(
        competitor
        for run in completed
        for competitor in set(run.competitors)
    )
    competitors = tuple(
        CompetitorSummary(name=name, answer_count=count)
        for name, count in sorted(
            competitor_counts.items(),
            key=lambda item: (-item[1], item[0].lower()),
        )
    )

    domain_counts: Counter[str] = Counter()
    relationships: dict[str, Relationship] = {}
    for run in completed:
        domains_in_run: set[str] = set()
        for citation in run.citations:
            domain = normalize_domain(citation.url)
            if not domain:
                continue
            domains_in_run.add(domain)
            relationships.setdefault(domain, citation.relationship)
        domain_counts.update(domains_in_run)

    domains = tuple(
        DomainSummary(
            domain=domain,
            answer_count=count,
            relationship=relationships[domain],
        )
        for domain, count in sorted(
            domain_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )
    )

    return AuditSummary(
        valid_runs=len(completed),
        named_runs=len(named),
        failed_runs=len(failed),
        named_rate=len(named) / len(completed) if completed else 0.0,
        valid_questions=valid_questions,
        named_questions=named_questions,
        question_coverage=(
            named_questions / valid_questions if valid_questions else 0.0
        ),
        questions=question_summaries,
        competitors=competitors,
        domains=domains,
    )
