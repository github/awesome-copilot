from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Final, NoReturn

SCHEMA_VERSION: Final = "searchd-aeo-audit-v1"

JsonScalar = str | int | float | bool | None
JsonValue = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
JsonObject = dict[str, JsonValue]


@dataclass(frozen=True, slots=True)
class AuditInputError(Exception):
    path: str
    detail: str

    def __str__(self) -> str:
        return f"{self.path}: {self.detail}"


class StringEnum(str, Enum):
    pass


class Intent(StringEnum):
    COMMERCIAL = "commercial"
    COMPARISON = "comparison"
    INFORMATIONAL = "informational"
    TRUST = "trust"
    MARKET_FIT = "market_fit"


class RunStatus(StringEnum):
    COMPLETED = "completed"
    FAILED = "failed"


class Relationship(StringEnum):
    FIRST_PARTY = "first_party"
    COMPETITOR_OWNED = "competitor_owned"
    EDITORIAL = "editorial"
    DIRECTORY = "directory"
    COMMUNITY = "community"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class AuditMetadata:
    brand: str
    domain: str
    market: str
    language: str
    measured_at: str
    measurement_method: str
    scope_note: str


@dataclass(frozen=True, slots=True)
class Question:
    id: str
    text: str
    intent: Intent


@dataclass(frozen=True, slots=True)
class Citation:
    url: str
    title: str
    relationship: Relationship


@dataclass(frozen=True, slots=True)
class Run:
    id: str
    question_id: str
    agent: str
    agent_version: str
    searched_at: str
    search_queries: tuple[str, ...]
    status: RunStatus
    brand_mentioned: bool
    brand_position: int | None
    competitors: tuple[str, ...]
    citations: tuple[Citation, ...]
    answer_text: str
    answer_excerpt: str
    analyst_note: str


@dataclass(frozen=True, slots=True)
class Insight:
    priority: int
    observation: str
    action: str
    evidence_ids: tuple[str, ...]
    remeasure: str


@dataclass(frozen=True, slots=True)
class Audit:
    metadata: AuditMetadata
    questions: tuple[Question, ...]
    runs: tuple[Run, ...]
    insights: tuple[Insight, ...]
    raw_json: str


def assert_unreachable(value: NoReturn) -> NoReturn:
    raise AssertionError(f"Unhandled value: {value!r}")
