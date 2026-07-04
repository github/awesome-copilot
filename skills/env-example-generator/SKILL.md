---
name: env-example-generator
description: 'Generate and maintain a .env.example that stays in sync with every environment variable the code actually reads. Use when the user asks to create or update .env.example, document environment variables, audit config for missing or unused variables, or onboard developers who need to know which variables a project requires.'
license: MIT
---

# Env Example Generator

Scan the codebase for every environment variable it reads and generate a complete, documented `.env.example` - without ever copying real secret values.

## When to Use This Skill

Use this skill when you need to:
- Create a `.env.example` for a project that lacks one
- Detect drift: variables read in code but missing from `.env.example`, or documented but no longer used
- Document what each variable does, its format, and a safe default
- Prepare a project for new-developer onboarding or open-sourcing

## Workflow

1. **Scan for reads** across the stack:
   - Node: `process.env.X`, `import.meta.env.X`
   - Python: `os.environ[...]`, `os.getenv(...)`, pydantic `BaseSettings` fields
   - Go: `os.Getenv(...)`; Java/Spring: `${X}` in properties/yml, `@Value`; .NET: `builder.Configuration[...]`, `IConfiguration`
   - Infra: `docker-compose.yml` `environment:`/`env_file:`, Dockerfiles `ENV`/`ARG`, CI workflows, K8s manifests
2. **Merge and dedupe** into one inventory with file references.
3. **Classify each variable**: required (no fallback in code) vs. optional (has default), secret vs. non-secret.
4. **Generate `.env.example`** grouped by concern, with a comment and placeholder per variable.
5. **Report drift**: list variables in code but not in the example, and stale entries in the example no code reads.

## Output Format

```bash
# ---------------------------------------------------------------
# App
# ---------------------------------------------------------------
# Runtime environment: development | staging | production
NODE_ENV=development
# HTTP port the API listens on (default: 3000)
PORT=3000

# ---------------------------------------------------------------
# Database
# ---------------------------------------------------------------
# PostgreSQL connection string (required)
DATABASE_URL=postgresql://user:password@localhost:5432/appdb

# ---------------------------------------------------------------
# Auth (secrets - generate real values, never commit them)
# ---------------------------------------------------------------
# JWT signing secret (required) - generate with: openssl rand -hex 32
JWT_SECRET=change-me
```

## Guidelines

1. **Never copy real values** - even from a local `.env`; placeholders only. If a real secret is spotted in tracked files, flag it and suggest rotation plus secret-manager adoption.
2. **Required variables get no default placeholder that "works"** - use `change-me` style values that fail loudly rather than silently connecting somewhere wrong.
3. **Comment format and origin** - each entry says what it is, its format, and (for secrets) how to generate one.
4. **Keep ordering stable and grouped** - diffs stay readable when variables are grouped by concern, alphabetical within groups.
5. **Suggest validation** - recommend fail-fast startup validation (zod/envalid, pydantic Settings, Spring `@ConfigurationProperties`) so missing variables break boot, not runtime.

## Limitations

- Dynamic access (`process.env[name]`) cannot be resolved statically; report these call sites for manual review.
- Variables consumed only by third-party libraries (e.g. `AWS_REGION`) may not appear in code scans; check docs of detected SDKs.
