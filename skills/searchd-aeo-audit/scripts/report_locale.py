from __future__ import annotations

from enum import Enum

from audit_types import Intent, assert_unreachable


class ReportLocale(str, Enum):
    ENGLISH = "en"
    KOREAN = "ko"


def localized(locale: ReportLocale, english: str, korean: str) -> str:
    match locale:
        case ReportLocale.ENGLISH:
            return english
        case ReportLocale.KOREAN:
            return korean
        case unreachable:
            assert_unreachable(unreachable)


def intent_label(intent: Intent, locale: ReportLocale) -> str:
    match intent:
        case Intent.COMMERCIAL:
            return localized(locale, "commercial", "구매")
        case Intent.COMPARISON:
            return localized(locale, "comparison", "비교")
        case Intent.INFORMATIONAL:
            return localized(locale, "informational", "정보")
        case Intent.TRUST:
            return localized(locale, "trust", "신뢰")
        case Intent.MARKET_FIT:
            return localized(locale, "market fit", "시장 적합성")
        case unreachable:
            assert_unreachable(unreachable)
