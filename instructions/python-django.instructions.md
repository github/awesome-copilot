---
description: 'Django 5 project conventions: fat models, DRF serializers, pytest-django, ruff, uv package manager, and migration safety rules.'
applyTo: '**/*.py'
---

# Python + Django 5

## Project structure

- Source lives in Django apps under the project root; tests in `**/tests.py` or `**/tests/`.
- Settings split per environment (base/dev/prod) with django-environ for secrets. No secrets in settings modules.

## Commands

| Action | Command |
|---|---|
| Install deps | `uv sync` |
| Dev server | `uv run python manage.py runserver` |
| Tests (single) | `uv run pytest path/to/tests.py -x` |
| All tests | `uv run pytest` |
| Lint + format | `uv run ruff check . && uv run ruff format --check .` |
| Type check | `uv run mypy .` |
| Migrations | `uv run python manage.py migrate` |

## Code style

- Fat models, thin views. Business logic in model methods or `services.py`. Views orchestrate.
- ORM queries: review every queryset touching relations for N+1 problems. Use `select_related` for foreign keys, `prefetch_related` for reverse/M2M.
- DRF serializers validate input; views call serializer `.is_valid(raise_exception=True)` before acting.
- No dead code: delete unused imports, unreachable branches, and commented-out blocks.
- Smallest diff that solves the problem. Do not reformat unrelated code.

## Testing

- Every bug fix ships with a regression test that fails without the fix.
- pytest-django with `db` fixture where needed. Factories via factory_boy, not hardcoded fixtures.
- Deterministic: no sleeps, no real network calls, no wall-clock dependence.
- `makemigrations --check` in CI catches missing migrations.

## Migrations

- Never edit an applied migration. Fix forward with a new migration.
- Data migrations use `RunPython` with a reverse function.
- Raw SQL in migrations is parameterized, always.

## Safety

- No secrets, tokens, or connection strings in code. Use env vars via django-environ.
- Pin exact dependency versions. State why a new dep is needed.
- Raw SQL is a last resort. Justify in a comment. Always parameterized.

## Definition of done

1. `pytest` green.
2. `ruff check . && ruff format --check .` zero warnings.
3. New logic covered by tests.
4. README updated if behavior or interfaces changed.
