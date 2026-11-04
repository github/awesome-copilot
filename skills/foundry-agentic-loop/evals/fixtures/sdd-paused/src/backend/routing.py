ROUTES = {
    "low": "fast-track",
    "high": "senior-adjuster",
}


def route(severity: str | None) -> str | None:
    return ROUTES.get(severity) if severity else None
