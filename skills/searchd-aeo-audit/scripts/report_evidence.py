from __future__ import annotations

from aggregate import AuditSummary
from audit_types import Audit, Run, RunStatus, assert_unreachable
from report_common import escape
from report_locale import ReportLocale, localized


def _run_status(run: Run, locale: ReportLocale) -> tuple[str, str]:
    match run.status:
        case RunStatus.FAILED:
            return localized(locale, "Failed", "실패"), "status-failed"
        case RunStatus.COMPLETED:
            if run.brand_mentioned:
                return localized(locale, "Named", "노출"), "status-named"
            return localized(locale, "Not named", "노출 안 됨"), "status-missing"
        case unreachable:
            assert_unreachable(unreachable)


def _source_list(run: Run, locale: ReportLocale) -> str:
    if not run.citations:
        return f"<p>{localized(locale, 'No source URLs were returned.', '반환된 출처 URL이 없습니다.')}</p>"
    items = "".join(
        f"""
<li>
  {escape(citation.title)}
  <a class="source-url" href="{escape(citation.url)}"
     target="_blank" rel="noopener noreferrer">{escape(citation.url)}</a>
</li>
"""
        for citation in run.citations
    )
    return f'<ol class="source-list">{items}</ol>'


def _evidence_record(
    run: Run,
    audit: Audit,
    locale: ReportLocale,
) -> str:
    question = next(
        question for question in audit.questions if question.id == run.question_id
    )
    label, class_name = _run_status(run, locale)
    excerpt = (
        f"<blockquote>{escape(run.answer_excerpt)}</blockquote>"
        if run.answer_excerpt
        else f"<p>{localized(locale, 'No answer excerpt was available.', '표시할 답변 요약이 없습니다.')}</p>"
    )
    competitors = ", ".join(run.competitors) or localized(
        locale,
        "None observed",
        "관찰되지 않음",
    )
    note = (
        f'<p class="analyst-note"><strong>'
        f"{localized(locale, 'Analyst note:', '분석 메모:')}</strong> "
        f"{escape(run.analyst_note)}</p>"
        if run.analyst_note
        else ""
    )
    queries = ", ".join(run.search_queries) or localized(
        locale,
        "Not captured",
        "수집되지 않음",
    )
    full_answer = (
        f"""
<details>
  <summary>{localized(locale, "Full worker answer", "워커 전체 답변 원문")}</summary>
  <p>{escape(run.answer_text)}</p>
</details>
"""
        if run.answer_text
        else f"<p>{localized(locale, 'No completed worker answer was available.', '완료된 워커 답변이 없습니다.')}</p>"
    )
    return f"""
<article class="evidence" id="evidence-{escape(run.id)}">
  <header class="evidence-header">
    <div>
      <span class="evidence-id">{escape(run.id)}</span>
      <h3>{escape(question.text)}</h3>
    </div>
    <span class="status {class_name}">{label}</span>
  </header>
  <p class="run-meta">
    {escape(run.agent)} · {escape(run.agent_version)} ·
    {escape(run.searched_at)} · question {escape(run.question_id)}
  </p>
  <p class="run-meta">
    {localized(locale, "Search queries:", "검색 쿼리:")} {escape(queries)}
  </p>
  {excerpt}
  {full_answer}
  <h3>{localized(locale, "Returned sources", "반환된 출처")}</h3>
  {_source_list(run, locale)}
  <p><strong>{localized(locale, "Co-mentioned:", "함께 언급됨:")}</strong>
    {escape(competitors)}</p>
  {note}
</article>
"""


def evidence_exhibit(audit: Audit, locale: ReportLocale) -> str:
    records = "".join(
        _evidence_record(run, audit, locale)
        for run in audit.runs
    )
    return f"""
<section class="exhibit" aria-labelledby="evidence-title">
  <div class="exhibit-heading">
    <span class="exhibit-number">{localized(locale, "Exhibit 03", "근거 03")}</span>
    <h2 id="evidence-title">
      {localized(locale, "Run-level evidence", "실행별 근거")}
    </h2>
  </div>
  <p>
    {localized(
        locale,
        "Source text and analyst commentary are separated. URLs are shown in full so aggregate findings can be checked.",
        "출처 내용과 분석자 의견을 구분했습니다. 집계 결과를 확인할 수 있도록 URL 전체를 표시합니다.",
    )}
  </p>
  <div class="evidence-list">{records}</div>
</section>
"""


def actions_exhibit(audit: Audit, locale: ReportLocale) -> str:
    def evidence_links(evidence_ids: tuple[str, ...]) -> str:
        return ", ".join(
            f'<a href="#evidence-{escape(evidence_id)}">'
            f"{escape(evidence_id)}</a>"
            for evidence_id in evidence_ids
        )

    actions = "".join(
        f"""
<article class="action">
  <span class="action-priority">{insight.priority:02}</span>
  <div>
    <h3>{escape(insight.action)}</h3>
    <p><strong>{localized(locale, "Observed:", "관찰:")}</strong>
      {escape(insight.observation)}</p>
    <p><strong>{localized(locale, "Evidence:", "근거:")}</strong>
      {evidence_links(insight.evidence_ids)}</p>
    <p><strong>{localized(locale, "Re-measure:", "재측정:")}</strong>
      {escape(insight.remeasure)}</p>
  </div>
</article>
"""
        for insight in sorted(audit.insights, key=lambda item: item.priority)
    )
    if not actions:
        actions = f"<p>{localized(locale, 'No recommendations were recorded.', '기록된 권고가 없습니다.')}</p>"
    return f"""
<section class="exhibit" aria-labelledby="actions-title">
  <div class="exhibit-heading">
    <span class="exhibit-number">{localized(locale, "Exhibit 04", "근거 04")}</span>
    <h2 id="actions-title">
      {localized(locale, "Observed patterns and actions", "관찰 결과와 권고")}
    </h2>
  </div>
  <div class="actions">{actions}</div>
</section>
"""


def methodology_exhibit(
    audit: Audit,
    summary: AuditSummary,
    locale: ReportLocale,
) -> str:
    measurement = localized(
        locale,
        (
            f"{summary.valid_questions} measured questions produced "
            f"{summary.valid_runs} valid answers. {summary.failed_runs} failed "
            "runs were reported separately and excluded from rates."
        ),
        (
            f"측정 질문 {summary.valid_questions}개에서 유효 답변 "
            f"{summary.valid_runs}개를 얻었습니다. 실패한 실행 "
            f"{summary.failed_runs}건은 별도로 표시하고 비율에서 제외했습니다."
        ),
    )
    return f"""
<section class="exhibit" aria-labelledby="method-title">
  <div class="exhibit-heading">
    <span class="exhibit-number">{localized(locale, "Exhibit 05", "근거 05")}</span>
    <h2 id="method-title">
      {localized(locale, "Methodology and limitations", "측정 방법과 한계")}
    </h2>
  </div>
  <div class="methodology">
    <p>
      <strong>{localized(locale, "Measurement.", "측정.")}</strong>
      {measurement}
    </p>
    <p>
      <strong>{localized(locale, "Brand matching.", "브랜드 판정.")}</strong>
      {localized(
        locale,
        "A run counts as named only when the company name, domain, or a confirmed alias appears in the completed answer.",
        "완료된 답변에 회사명, 도메인 또는 확인된 별칭이 등장한 경우에만 브랜드 노출로 계산했습니다.",
      )}
    </p>
    <p>
      <strong>{localized(locale, "Sources.", "출처.")}</strong>
      {localized(
        locale,
        "Citation counts represent completed answers containing each normalized domain, not the number of repeated links.",
        "인용 수는 각 정규화 도메인이 포함된 완료 답변의 수이며 반복 링크 수가 아닙니다.",
      )}
    </p>
    <p>
      <strong>{localized(locale, "Boundary.", "한계.")}</strong>
      {localized(
        locale,
        "Results characterize this controlled agent test. They are not consumer reach, traffic, model market share, or proof of any model's internal retrieval state.",
        "이 결과는 통제된 에이전트 테스트를 설명합니다. 소비자 도달, 트래픽, 모델 시장 점유율 또는 모델 내부 검색 상태의 증거가 아닙니다.",
      )}
    </p>
  </div>
</section>
"""
