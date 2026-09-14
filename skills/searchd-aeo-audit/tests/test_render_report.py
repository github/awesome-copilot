from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parents[1]
RENDERER = SKILL_ROOT / "scripts" / "render_report.py"


@pytest.fixture
def audit_payload() -> dict[str, object]:
  return {
    "schema_version": "searchd-aeo-audit-v1",
    "audit": {
      "brand": "SearchD",
      "domain": "searchd.ai",
      "market": "United States",
      "language": "English",
      "measured_at": "2026-09-10T12:00:00Z",
      "measurement_method": "Independent web-search agents",
      "scope_note": (
        "Agent-measured research, not consumer application impression data."
      ),
    },
    "questions": [
      {
        "id": "q01",
        "text": "Which agencies help Asian brands appear in AI answers in the US?",
        "intent": "commercial",
      },
      {
        "id": "q02",
        "text": "How can a Japanese brand improve ChatGPT visibility in America?",
        "intent": "informational",
      },
    ],
    "runs": [
      {
        "id": "r01",
        "question_id": "q01",
        "agent": "web-research-agent-a",
        "agent_version": "research-agent/1",
        "searched_at": "2026-09-10T12:01:00Z",
        "search_queries": [
          "AEO agencies Asian brands US"
        ],
        "status": "completed",
        "brand_mentioned": True,
        "brand_position": 2,
        "competitors": ["Profound", "Scrunch AI"],
        "citations": [
          {
            "url": "https://www.searchd.ai/",
            "title": "SearchD",
            "relationship": "first_party",
          },
          {
            "url": "https://www.g2.com/categories/generative-engine-optimization",
            "title": "G2",
            "relationship": "directory",
          },
        ],
        "answer_text": (
          "SearchD and two competitors were named in the full worker answer."
        ),
        "answer_excerpt": "SearchD focuses on Asian brands entering the US market.",
        "analyst_note": "The mention was supported by first-party positioning.",
      },
      {
        "id": "r02",
        "question_id": "q01",
        "agent": "web-research-agent-b",
        "agent_version": "research-agent/1",
        "searched_at": "2026-09-10T12:02:00Z",
        "search_queries": [
          "generative engine optimization agencies"
        ],
        "status": "completed",
        "brand_mentioned": False,
        "brand_position": None,
        "competitors": ["Profound"],
        "citations": [
          {
            "url": "https://www.g2.com/categories/generative-engine-optimization?ref=test",
            "title": "G2",
            "relationship": "directory",
          }
        ],
        "answer_text": (
          "Profound was named and SearchD did not appear in the full answer."
        ),
        "answer_excerpt": "Profound is frequently discussed for enterprise AI visibility.",
        "analyst_note": "",
      },
      {
        "id": "r03",
        "question_id": "q02",
        "agent": "web-research-agent-a",
        "agent_version": "research-agent/1",
        "searched_at": "2026-09-10T12:03:00Z",
        "search_queries": [],
        "status": "failed",
        "brand_mentioned": False,
        "brand_position": None,
        "competitors": [],
        "citations": [],
        "answer_text": "",
        "answer_excerpt": "",
        "analyst_note": "Search timed out.",
      },
    ],
    "insights": [
      {
        "priority": 1,
        "observation": "SearchD appears only when the cross-border context is explicit.",
        "action": "Publish an evidence-led page for Asian brands entering the US.",
        "evidence_ids": ["r01", "r02"],
        "remeasure": "Repeat q01 after independent coverage is published.",
      }
    ],
  }


def run_renderer(
  tmp_path: Path,
  audit_payload: dict[str, object],
  locale: str = "en",
) -> tuple[subprocess.CompletedProcess[str], Path]:
  input_path = tmp_path / "audit.json"
  output_path = tmp_path / "report.html"
  input_path.write_text(json.dumps(audit_payload), encoding="utf-8")

  command = [
    sys.executable,
    str(RENDERER),
    "--input",
    str(input_path),
    "--output",
    str(output_path),
    "--locale",
    locale,
  ]
  result = subprocess.run(
    command,
    check=False,
    capture_output=True,
    text=True,
  )
  return result, output_path


def test_renderer_builds_auditable_html_when_runs_include_failure(
  tmp_path: Path,
  audit_payload: dict[str, object],
) -> None:
  # Given
  expected_named_rate = "50%"

  # When
  result, output_path = run_renderer(tmp_path, audit_payload)

  # Then
  assert result.returncode == 0, result.stderr
  html = output_path.read_text(encoding="utf-8")
  assert expected_named_rate in html
  assert "1 of 2 valid measured answers" in html
  assert "1 failed run excluded" in html
  assert "Profound" in html
  assert "g2.com" in html
  assert 'href="https://www.g2.com/categories/generative-engine-optimization?ref=test"' in html
  assert 'href="#evidence-r01"' in html
  assert "Full worker answer" in html
  assert 'id="audit-data"' in html
  assert "Agent-measured research" in html


def test_renderer_normalizes_duplicate_citation_domains(
  tmp_path: Path,
  audit_payload: dict[str, object],
) -> None:
  # Given
  expected_domain_total = "2 answers"

  # When
  result, output_path = run_renderer(tmp_path, audit_payload)

  # Then
  assert result.returncode == 0, result.stderr
  html = output_path.read_text(encoding="utf-8")
  g2_row_start = html.index("g2.com")
  g2_row = html[g2_row_start : g2_row_start + 500]
  assert expected_domain_total in g2_row
  assert "1 answers" not in html


def test_renderer_rejects_run_with_unknown_question(
  tmp_path: Path,
  audit_payload: dict[str, object],
) -> None:
  # Given
  runs = audit_payload["runs"]
  assert isinstance(runs, list)
  first_run = runs[0]
  assert isinstance(first_run, dict)
  first_run["question_id"] = "missing-question"

  # When
  result, output_path = run_renderer(tmp_path, audit_payload)

  # Then
  assert result.returncode == 2
  assert "missing-question" in result.stderr
  assert not output_path.exists()


@pytest.mark.parametrize(
  "unsafe_url",
  [
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "https:///missing-host",
  ],
)
def test_renderer_rejects_unsafe_citation_url(
  tmp_path: Path,
  audit_payload: dict[str, object],
  unsafe_url: str,
) -> None:
  # Given
  runs = audit_payload["runs"]
  assert isinstance(runs, list)
  first_run = runs[0]
  assert isinstance(first_run, dict)
  citations = first_run["citations"]
  assert isinstance(citations, list)
  first_citation = citations[0]
  assert isinstance(first_citation, dict)
  first_citation["url"] = unsafe_url

  # When
  result, output_path = run_renderer(tmp_path, audit_payload)

  # Then
  assert result.returncode == 2
  assert "$.runs[0].citations[0].url" in result.stderr
  assert "http or https URL with a host" in result.stderr
  assert not output_path.exists()


def test_renderer_localizes_report_chrome_without_translating_evidence(
  tmp_path: Path,
  audit_payload: dict[str, object],
) -> None:
  # Given
  exact_measured_question = (
    "Which agencies help Asian brands appear in AI answers in the US?"
  )

  # When
  result, output_path = run_renderer(tmp_path, audit_payload, locale="ko")

  # Then
  assert result.returncode == 0, result.stderr
  html = output_path.read_text(encoding="utf-8")
  assert '<html lang="ko">' in html
  assert "핵심 결과" in html
  assert "질문별 노출" in html
  assert "경쟁사 및 인용 출처" in html
  assert "실행별 근거" in html
  assert "관찰 결과와 권고" in html
  assert exact_measured_question in html


def test_renderer_attributes_open_source_without_commercial_link(
  tmp_path: Path,
  audit_payload: dict[str, object],
) -> None:
  # Given
  expected_named_rate = "50%"

  # When
  result, output_path = run_renderer(tmp_path, audit_payload)

  # Then
  assert result.returncode == 0, result.stderr
  html = output_path.read_text(encoding="utf-8")
  assert 'class="powered-by"' in html
  assert 'href="https://github.com/runbear-io/searchd-skills"' in html
  assert 'data-attribution="source"' in html
  assert "<svg" in html
  assert expected_named_rate in html
  assert 'id="searchd-agency-cta"' not in html


def test_renderer_does_not_expose_commercial_agency_cta_option(
) -> None:
  # When
  result = subprocess.run(
    [sys.executable, str(RENDERER), "--help"],
    check=False,
    capture_output=True,
    text=True,
  )

  # Then
  assert result.returncode == 0, result.stderr
  assert "--agency-cta" not in result.stdout
