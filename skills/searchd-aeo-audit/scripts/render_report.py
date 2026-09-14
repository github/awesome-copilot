# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
# ─── How to run ───
# python3 render_report.py --input audit.json --output report.html

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from aggregate import aggregate
from audit_parse import parse_audit
from audit_types import Audit, AuditInputError
from report_common import (
    CSS_PATH,
    REPORT_TEMPLATE,
    boundary,
    escape,
    executive,
    footer,
    masthead,
    metadata,
)
from report_evidence import actions_exhibit, evidence_exhibit, methodology_exhibit
from report_locale import ReportLocale, localized
from report_questions import landscape_exhibit, questions_exhibit


@dataclass(frozen=True, slots=True)
class CliArguments:
    input_path: Path
    output_path: Path
    locale: ReportLocale


def render(audit: Audit, locale: ReportLocale) -> str:
    summary = aggregate(audit)
    body = "".join(
        (
            masthead(audit, locale),
            executive(summary, locale),
            metadata(audit, summary, locale),
            boundary(audit, locale),
            questions_exhibit(summary, locale),
            landscape_exhibit(summary, locale),
            evidence_exhibit(audit, locale),
            actions_exhibit(audit, locale),
            methodology_exhibit(audit, summary, locale),
            footer(locale),
        )
    )
    audit_json = audit.raw_json.replace("<", "\\u003c")
    return REPORT_TEMPLATE.substitute(
        lang=locale.value,
        title=escape(
            localized(
                locale,
                f"{audit.metadata.brand} AEO audit",
                f"{audit.metadata.brand} AEO 노출 감사",
            )
        ),
        description=escape(
            localized(
                locale,
                f"Agent-measured AEO exposure audit for {audit.metadata.brand}.",
                f"{audit.metadata.brand}의 에이전트 측정 AEO 노출 감사입니다.",
            )
        ),
        css=CSS_PATH.read_text(encoding="utf-8"),
        body=body,
        audit_json=audit_json,
    )


def _parse_arguments() -> CliArguments:
    parser = argparse.ArgumentParser(
        description="Render a self-contained Searchd AEO audit report.",
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--locale",
        choices=[locale.value for locale in ReportLocale],
        default=ReportLocale.ENGLISH.value,
    )
    parsed = parser.parse_args()
    return CliArguments(
        input_path=parsed.input,
        output_path=parsed.output,
        locale=ReportLocale(parsed.locale),
    )


def main() -> int:
    arguments = _parse_arguments()
    try:
        audit = parse_audit(arguments.input_path.read_text(encoding="utf-8"))
        output = render(audit, arguments.locale)
        arguments.output_path.parent.mkdir(parents=True, exist_ok=True)
        arguments.output_path.write_text(output, encoding="utf-8")
    except AuditInputError as error:
        print(f"Invalid audit input: {error}", file=sys.stderr)
        return 2
    except OSError as error:
        print(f"File operation failed: {error}", file=sys.stderr)
        return 1

    print(arguments.output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
