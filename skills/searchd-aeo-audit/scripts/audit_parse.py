from __future__ import annotations

import json

from audit_fields import (
    as_array,
    as_object,
    boolean,
    enum_value,
    optional_position,
    optional_string,
    positive_integer,
    required,
    string,
    string_tuple,
    web_url,
)
from audit_types import (
    SCHEMA_VERSION,
    Audit,
    AuditInputError,
    AuditMetadata,
    Citation,
    Insight,
    Intent,
    JsonObject,
    JsonValue,
    Question,
    Relationship,
    Run,
    RunStatus,
    assert_unreachable,
)


def _parse_metadata(root: JsonObject) -> AuditMetadata:
    path = "$.audit"
    mapping = as_object(required(root, "audit", "$"), path)
    return AuditMetadata(
        brand=string(mapping, "brand", path),
        domain=string(mapping, "domain", path),
        market=string(mapping, "market", path),
        language=string(mapping, "language", path),
        measured_at=string(mapping, "measured_at", path),
        measurement_method=string(mapping, "measurement_method", path),
        scope_note=string(mapping, "scope_note", path),
    )


def _parse_questions(root: JsonObject) -> tuple[Question, ...]:
    raw_questions = as_array(required(root, "questions", "$"), "$.questions")
    questions: list[Question] = []
    for index, raw_question in enumerate(raw_questions):
        path = f"$.questions[{index}]"
        mapping = as_object(raw_question, path)
        questions.append(
            Question(
                id=string(mapping, "id", path),
                text=string(mapping, "text", path),
                intent=enum_value(Intent, mapping, "intent", path),
            )
        )
    if not questions:
        raise AuditInputError(path="$.questions", detail="at least one is required")
    return tuple(questions)


def _parse_citations(mapping: JsonObject, path: str) -> tuple[Citation, ...]:
    raw_citations = as_array(
        required(mapping, "citations", path),
        f"{path}.citations",
    )
    citations: list[Citation] = []
    for index, raw_citation in enumerate(raw_citations):
        citation_path = f"{path}.citations[{index}]"
        citation = as_object(raw_citation, citation_path)
        citations.append(
            Citation(
                url=web_url(citation, "url", citation_path),
                title=string(citation, "title", citation_path),
                relationship=enum_value(
                    Relationship,
                    citation,
                    "relationship",
                    citation_path,
                ),
            )
        )
    return tuple(citations)


def _parse_runs(root: JsonObject) -> tuple[Run, ...]:
    raw_runs = as_array(required(root, "runs", "$"), "$.runs")
    runs: list[Run] = []
    for index, raw_run in enumerate(raw_runs):
        path = f"$.runs[{index}]"
        mapping = as_object(raw_run, path)
        runs.append(
            Run(
                id=string(mapping, "id", path),
                question_id=string(mapping, "question_id", path),
                agent=string(mapping, "agent", path),
                agent_version=string(mapping, "agent_version", path),
                searched_at=string(mapping, "searched_at", path),
                search_queries=string_tuple(mapping, "search_queries", path),
                status=enum_value(RunStatus, mapping, "status", path),
                brand_mentioned=boolean(mapping, "brand_mentioned", path),
                brand_position=optional_position(mapping, path),
                competitors=string_tuple(mapping, "competitors", path),
                citations=_parse_citations(mapping, path),
                answer_text=optional_string(mapping, "answer_text", path),
                answer_excerpt=optional_string(mapping, "answer_excerpt", path),
                analyst_note=optional_string(mapping, "analyst_note", path),
            )
        )
    return tuple(runs)


def _parse_insights(root: JsonObject) -> tuple[Insight, ...]:
    raw_insights = as_array(required(root, "insights", "$"), "$.insights")
    insights: list[Insight] = []
    for index, raw_insight in enumerate(raw_insights):
        path = f"$.insights[{index}]"
        mapping = as_object(raw_insight, path)
        insights.append(
            Insight(
                priority=positive_integer(mapping, "priority", path),
                observation=string(mapping, "observation", path),
                action=string(mapping, "action", path),
                evidence_ids=string_tuple(mapping, "evidence_ids", path),
                remeasure=string(mapping, "remeasure", path),
            )
        )
    return tuple(insights)


def _validate_references(audit: Audit) -> None:
    question_ids = {question.id for question in audit.questions}
    run_ids = {run.id for run in audit.runs}

    for run in audit.runs:
        if run.question_id not in question_ids:
            raise AuditInputError(
                path=f"$.runs[{run.id}].question_id",
                detail=f"unknown question {run.question_id}",
            )
        match run.status:
            case RunStatus.COMPLETED:
                continue
            case RunStatus.FAILED:
                if run.answer_excerpt or run.answer_text:
                    raise AuditInputError(
                        path=f"$.runs[{run.id}]",
                        detail="failed runs must have empty answer fields",
                    )
            case unreachable:
                assert_unreachable(unreachable)

    for insight in audit.insights:
        missing = set(insight.evidence_ids) - run_ids
        if missing:
            missing_ids = ", ".join(sorted(missing))
            raise AuditInputError(
                path=f"$.insights[{insight.priority}].evidence_ids",
                detail=f"unknown runs: {missing_ids}",
            )


def parse_audit(text: str) -> Audit:
    try:
        raw: JsonValue = json.loads(text)
    except json.JSONDecodeError as error:
        raise AuditInputError(path="$", detail=error.msg) from error

    root = as_object(raw, "$")
    version = string(root, "schema_version", "$")
    if version != SCHEMA_VERSION:
        raise AuditInputError(
            path="$.schema_version",
            detail=f"expected {SCHEMA_VERSION}",
        )

    audit = Audit(
        metadata=_parse_metadata(root),
        questions=_parse_questions(root),
        runs=_parse_runs(root),
        insights=_parse_insights(root),
        raw_json=text,
    )
    _validate_references(audit)
    return audit
