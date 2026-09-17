---
name: gem-devops-guidelines
description: Design or review infrastructure, deployment, CI/CD, Docker, Kubernetes, health checks, rollback, feature flags, production readiness, and mobile release workflows. Use for DevOps, platform, container, pipeline, or release tasks.
---

# DevOps Guidelines

Apply only the sections relevant to the workload, provider, environment, and acceptance criteria. Skip Docker, Kubernetes, mobile, production, rollback, health, feature-flag, and security checks when they do not apply.

## Deployment strategy

- Rolling (default): gradual, zero-downtime replacement.
- Blue-green: duplicate environments, atomic cutover, instant rollback, 2× infrastructure.
- Canary: route a small percentage first; requires traffic splitting.

## Docker

- Pin specific base-image tags (for example `node:22-alpine`); NEVER use `:latest`.
- Use multi-stage builds and a non-root user. Copy dependencies first for caching.
- `.dockerignore`: `node_modules`, `.git`, tests. Define `HEALTHCHECK` and resource limits.

## Kubernetes

Configure startup, readiness, and liveness probes with workload-appropriate initial delays and thresholds.

## CI/CD

- PR: lint -> typecheck -> unit -> integration -> preview.
- Main: build -> staging -> smoke -> production.

## Health and shutdown

- Simple: `GET /health` -> `{ "status": "ok" }`.
- Detailed: dependencies, uptime, version.
- Services MUST expose meaningful health and gracefully handle `SIGTERM` when the workload requires it.

## Configuration

Use environment variables (Twelve-Factor), separated by environment. Validate at startup and fail fast. NEVER commit secrets or hard-code `NODE_ENV=production`.

## Rollback

Kubernetes: `kubectl rollout undo`. Vercel: `vercel rollback`. Docker: redeploy the previous pinned image.

## Feature Flags

- Lifecycle: create -> enable -> 5% -> 25% -> 50% -> 100% -> remove flag and dead code.
- Every flag MUST have an owner, expiration, and rollback trigger. Remove within two weeks.

## Checklists

- Pre-deploy, when applicable: passing tests, code review, environment variables, migrations, rollback plan.
- Post-deploy services: healthy, monitored, old pods terminated, outcome documented.
- Production services: passing tests; no hardcoded secrets; JSON logs; meaningful health; pinned versions; validated environment variables; resource limits; TLS; CVE scan; CORS; rate limiting; CSP/HSTS/X-Frame-Options; tested rollback; runbook; on-call.
- Apply security/CVE checks to executable or security-sensitive workloads.

## Mobile Deployment

- EAS: `eas build:configure`; `eas build -p ios|android --profile preview`; `eas update --branch production`; `--auto-submit`.
- Fastlane: iOS `match`/`cert`/`sigh`/`pilot`; Android Gradle/`supply`.
- Keep credentials in environment/secret storage, never Git. Automate iOS development/distribution signing with `fastlane match`; use `keytool` and Google Play App Signing for Android.
- TestFlight: internal instant; external 90 days/100 testers. Google Play: internal/beta/production. Expect 1–7 days for review.
- Rollback: EAS `eas update:rollback`; native release -> revert build; store release -> reduce phased rollout.
