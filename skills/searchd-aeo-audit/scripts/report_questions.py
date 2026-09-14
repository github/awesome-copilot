from __future__ import annotations

from aggregate import AuditSummary, QuestionSummary
from report_common import escape, relationship_label
from report_locale import ReportLocale, intent_label, localized


def _question_status(
    summary: QuestionSummary,
    locale: ReportLocale,
) -> tuple[str, str]:
    if summary.valid_runs == 0:
        return localized(locale, "Not measured", "미측정"), "status-unmeasured"
    if summary.named_runs == 0:
        return (
            localized(
                locale,
                f"Not named 0/{summary.valid_runs}",
                f"노출 안 됨 0/{summary.valid_runs}",
            ),
            "status-missing",
        )
    if summary.named_runs == summary.valid_runs:
        return (
            localized(
                locale,
                f"Named {summary.named_runs}/{summary.valid_runs}",
                f"노출 {summary.named_runs}/{summary.valid_runs}",
            ),
            "status-named",
        )
    return (
        localized(
            locale,
            f"Occasional {summary.named_runs}/{summary.valid_runs}",
            f"일부 노출 {summary.named_runs}/{summary.valid_runs}",
        ),
        "status-named",
    )


def _question_rows(summary: AuditSummary, locale: ReportLocale) -> str:
    rows: list[str] = []
    for item in summary.questions:
        label, class_name = _question_status(item, locale)
        position = str(item.median_position) if item.median_position else "—"
        competitors = ", ".join(item.competitors) or localized(
            locale,
            "None observed",
            "관찰되지 않음",
        )
        evidence = ", ".join(
            f'<a href="#evidence-{escape(run_id)}">{escape(run_id)}</a>'
            for run_id in item.evidence_ids
        )
        width = (
            round(item.named_runs / item.valid_runs * 100)
            if item.valid_runs
            else 0
        )
        rows.append(
            f"""
<tr>
  <td class="question">{escape(item.question.text)}</td>
  <td>{intent_label(item.question.intent, locale)}</td>
  <td class="count">
    <span class="status {class_name}">{label}</span>
    <span class="bar" aria-hidden="true"><span style="width:{width}%"></span></span>
  </td>
  <td>{position}</td>
  <td>{escape(competitors)}</td>
  <td>{evidence}</td>
</tr>
"""
        )
    return "".join(rows)


def questions_exhibit(summary: AuditSummary, locale: ReportLocale) -> str:
    description = localized(
        locale,
        (
            "Coverage is directional: each completed answer is one controlled "
            "agent observation, not a consumer impression."
        ),
        (
            "이 노출 결과는 방향성 관찰입니다. 완료된 답변 한 개는 통제된 "
            "에이전트 관찰 한 건이며 소비자 노출 수가 아닙니다."
        ),
    )
    return f"""
<section class="exhibit" aria-labelledby="questions-title">
  <div class="exhibit-heading">
    <span class="exhibit-number">
      {localized(locale, "Exhibit 01", "근거 01")}
    </span>
    <h2 id="questions-title">
      {localized(locale, "Question-by-question exposure", "질문별 노출")}
    </h2>
  </div>
  <p>{description}</p>
  <span class="scroll-cue">
    {localized(locale, "Scroll to inspect all columns →", "옆으로 스크롤해 전체 열 보기 →")}
  </span>
  <div class="table-scroll" role="region"
       aria-label="{localized(locale, "Question exposure table", "질문 노출 표")}"
       tabindex="0">
    <table>
      <thead>
        <tr>
          <th>{localized(locale, "Question", "측정 질문")}</th>
          <th>{localized(locale, "Intent", "의도")}</th>
          <th>{localized(locale, "Exposure", "노출")}</th>
          <th>{localized(locale, "Position", "순위")}</th>
          <th>{localized(locale, "Other brands", "함께 나온 브랜드")}</th>
          <th>{localized(locale, "Evidence", "근거")}</th>
        </tr>
      </thead>
      <tbody>{_question_rows(summary, locale)}</tbody>
    </table>
  </div>
</section>
"""


def _ranked_items(items: tuple[tuple[str, str], ...]) -> str:
    return "".join(
        f"""
<li>
  <span class="rank">{index:02}</span>
  <span>{escape(label)}</span>
  <strong>{escape(value)}</strong>
</li>
"""
        for index, (label, value) in enumerate(items, start=1)
    )


def _answer_count(count: int, locale: ReportLocale) -> str:
    unit = "answer" if count == 1 else "answers"
    return localized(locale, f"{count} {unit}", f"답변 {count}개")


def landscape_exhibit(summary: AuditSummary, locale: ReportLocale) -> str:
    competitors = tuple(
        (item.name, _answer_count(item.answer_count, locale))
        for item in summary.competitors
    ) or (
        (
            localized(locale, "No competitors observed", "관찰된 경쟁사 없음"),
            localized(locale, "0 answers", "답변 0개"),
        ),
    )
    domains = tuple(
        (
            item.domain,
            (
                f"{_answer_count(item.answer_count, locale)} · "
                f"{relationship_label(item.relationship, locale)}"
            ),
        )
        for item in summary.domains
    ) or (
        (
            localized(locale, "No cited domains observed", "관찰된 인용 도메인 없음"),
            localized(locale, "0 answers", "답변 0개"),
        ),
    )
    return f"""
<section class="exhibit" aria-labelledby="landscape-title">
  <div class="exhibit-heading">
    <span class="exhibit-number">{localized(locale, "Exhibit 02", "근거 02")}</span>
    <h2 id="landscape-title">
      {localized(locale, "Competitive and citation landscape", "경쟁사 및 인용 출처")}
    </h2>
  </div>
  <p>
    {localized(
        locale,
        "Mention totals may exceed the answer count because one answer can name several organizations.",
        "한 답변에 여러 조직이 등장할 수 있으므로 언급 합계는 전체 답변 수보다 클 수 있습니다.",
    )}
  </p>
  <div class="ledger">
    <div>
      <h3>
        {localized(locale, "Brands named beside or instead of the target", "대상 브랜드와 함께 또는 대신 등장한 브랜드")}
      </h3>
      <ol class="ranked-list">{_ranked_items(competitors)}</ol>
    </div>
    <div>
      <h3>{localized(locale, "Domains used as answer evidence", "답변 근거로 사용된 도메인")}</h3>
      <ol class="ranked-list">{_ranked_items(domains)}</ol>
    </div>
  </div>
</section>
"""
