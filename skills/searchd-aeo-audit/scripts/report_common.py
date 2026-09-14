from __future__ import annotations

import html
from pathlib import Path
from string import Template
from typing import Final

from aggregate import AuditSummary
from audit_types import Audit, Relationship, assert_unreachable
from report_locale import ReportLocale, localized

SKILL_ROOT: Final = Path(__file__).resolve().parents[1]
CSS_PATH: Final = SKILL_ROOT / "templates" / "report.css"

REPORT_TEMPLATE: Final = Template(
    """<!doctype html>
<html lang="$lang">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="$description">
<title>$title</title>
<style>$css</style>
</head>
<body>
<main class="report">
$body
</main>
<script type="application/json" id="audit-data">$audit_json</script>
</body>
</html>
"""
)


def escape(value: str) -> str:
    return html.escape(value, quote=True)


def percent(rate: float) -> str:
    return f"{round(rate * 100)}%"


def powered_by(locale: ReportLocale) -> str:
    label = localized(
        locale,
        "Open-source SearchD AEO Audit Skill",
        "오픈소스 SearchD AEO Audit Skill",
    )
    return f"""
<a class="powered-by" data-attribution="source"
   href="https://github.com/runbear-io/searchd-skills" target="_blank"
   rel="noopener noreferrer"
   aria-label="{label}">
  <svg aria-hidden="true" viewBox="0 0 64 64" width="20" height="20">
    <rect width="64" height="64" rx="14" fill="#0d1117"/>
    <g transform="translate(6.4 6.4) scale(2.1)">
      <path d="M8.5 2.5H4.2A1.7 1.7 0 0 0 2.5 4.2v15.6A1.7
        1.7 0 0 0 4.2 21.5h4.3" fill="none" stroke="#f7f8f9"
        stroke-width="3.2" stroke-linecap="round"/>
      <path d="M15.5 2.5h4.3a1.7 1.7 0 0 1 1.7 1.7v15.6a1.7
        1.7 0 0 1-1.7 1.7h-4.3" fill="none" stroke="#f7f8f9"
        stroke-width="3.2" stroke-linecap="round"/>
      <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.7"
        fill="#2348c8"/>
    </g>
  </svg>
  <span>{label}</span>
</a>
"""


def relationship_label(
    relationship: Relationship,
    locale: ReportLocale,
) -> str:
    match relationship:
        case Relationship.FIRST_PARTY:
            return localized(locale, "First party", "자사")
        case Relationship.COMPETITOR_OWNED:
            return localized(locale, "Competitor-owned", "경쟁사 소유")
        case Relationship.EDITORIAL:
            return localized(locale, "Independent editorial", "독립 편집 매체")
        case Relationship.DIRECTORY:
            return localized(locale, "Directory or review", "디렉터리·리뷰")
        case Relationship.COMMUNITY:
            return localized(locale, "Community", "커뮤니티")
        case Relationship.OTHER:
            return localized(locale, "Other", "기타")
        case unreachable:
            assert_unreachable(unreachable)


def masthead(audit: Audit, locale: ReportLocale) -> str:
    metadata = audit.metadata
    overline = localized(
        locale,
        "Answer-engine exposure audit",
        "답변 엔진 노출 감사",
    )
    title = localized(
        locale,
        f"{metadata.brand} visibility across buyer questions",
        f"{metadata.brand} 구매 질문 노출 현황",
    )
    return f"""
<header class="masthead">
  <div class="brand-row">
    <span class="overline">{overline}</span>
    {powered_by(locale)}
  </div>
  <h1>{escape(title)}</h1>
  <p class="scope">{escape(metadata.scope_note)}</p>
</header>
"""


def metadata(
    audit: Audit,
    summary: AuditSummary,
    locale: ReportLocale,
) -> str:
    report = audit.metadata
    return f"""
<dl class="metadata">
  <div><dt>{localized(locale, "Domain", "도메인")}</dt>
    <dd>{escape(report.domain)}</dd></div>
  <div><dt>{localized(locale, "Market", "대상 시장")}</dt>
    <dd>{escape(report.market)}</dd></div>
  <div><dt>{localized(locale, "Language", "측정 언어")}</dt>
    <dd>{escape(report.language)}</dd></div>
  <div><dt>{localized(locale, "Measured", "측정 시각")}</dt>
    <dd>{escape(report.measured_at)}</dd></div>
  <div><dt>{localized(locale, "Method", "측정 방식")}</dt>
    <dd>{escape(report.measurement_method)}</dd></div>
  <div><dt>{localized(locale, "Questions", "질문")}</dt>
    <dd>{len(audit.questions)}</dd></div>
  <div><dt>{localized(locale, "Valid answers", "유효 답변")}</dt>
    <dd>{summary.valid_runs}</dd></div>
  <div><dt>{localized(locale, "Report schema", "리포트 스키마")}</dt>
    <dd>searchd-aeo-audit-v1</dd></div>
</dl>
"""


def executive(summary: AuditSummary, locale: ReportLocale) -> str:
    run_word = "run" if summary.failed_runs == 1 else "runs"
    sentence = localized(
        locale,
        (
            f"{summary.named_runs} of {summary.valid_runs} valid measured "
            f"answers named the target brand; {summary.failed_runs} failed "
            f"{run_word} excluded."
        ),
        (
            f"유효 답변 {summary.valid_runs}개 중 {summary.named_runs}개가 "
            f"대상 브랜드를 언급했습니다. 실패한 실행 "
            f"{summary.failed_runs}건은 제외했습니다."
        ),
    )
    return f"""
<section class="executive" aria-labelledby="executive-title">
  <div>
    <span class="overline" id="executive-title">
      {localized(locale, "Executive finding", "핵심 결과")}
    </span>
    <strong class="metric-value">{percent(summary.named_rate)}</strong>
    <span class="metric-label">{sentence}</span>
  </div>
  <dl class="supporting">
    <div><dt>{localized(locale, "Question coverage", "노출된 질문")}</dt>
      <dd>{summary.named_questions} / {summary.valid_questions}</dd></div>
    <div><dt>{localized(locale, "Competitors observed", "관찰된 경쟁사")}</dt>
      <dd>{len(summary.competitors)}</dd></div>
    <div><dt>{localized(locale, "Cited domains", "인용 도메인")}</dt>
      <dd>{len(summary.domains)}</dd></div>
  </dl>
</section>
"""


def boundary(audit: Audit, locale: ReportLocale) -> str:
    return f"""
<aside class="boundary">
  <span class="overline">
    {localized(locale, "Measurement boundary", "측정 범위")}
  </span>
  <p>{escape(audit.metadata.scope_note)}</p>
</aside>
"""


def footer(locale: ReportLocale) -> str:
    text = localized(
        locale,
        (
            "Generated by the open Searchd AEO Audit Skill. Review the embedded "
            "audit data and source URLs before treating any finding as a decision."
        ),
        (
            "공개 Searchd AEO Audit Skill로 생성했습니다. 결론을 의사결정에 "
            "사용하기 전에 포함된 감사 데이터와 출처 URL을 확인하세요."
        ),
    )
    return f"""
<footer class="report-footer">
  {text}
</footer>
"""
