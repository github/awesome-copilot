---
name: gem-devops-guidelines
description: Infrastructure deployment, CI/CD pipelines, container management.
---

# Deployment Strategies

Rolling (default): gradual, zero-downtime. Blue-Green: two envs, atomic switch, instant rollback, 2x infra. Canary: route small % first, traffic splitting.

## Docker

- Specific tags (node:22-alpine), multi-stage, non-root user.
- Copy deps first for caching, .dockerignore node_modules/.git/tests.
- HEALTHCHECK, resource limits.

## Kubernetes

livenessProbe, readinessProbe, startupProbe w/ proper initialDelay and thresholds.

## CI/CD

PR: lint->typecheck->unit->integration->preview. Main: build->staging->smoke->production.

## Health Checks

Simple: GET /health -> { status: "ok" }. Detailed: deps, uptime, version.

## Configuration

All config via env vars (Twelve-Factor). Validate at startup, fail fast.

## Rollback

- K8s: kubectl rollout undo.
- Vercel: vercel rollback.
- Docker: previous image.

## Feature Flags

- Lifecycle: Create->Enable->Canary(5%)->25%->50%->100%->Remove flag+dead code.
- Each flag MUST have: owner, expiration, rollback trigger.
- Clean up within 2 weeks.

## Checklists

Pre-Deploy (when applicable): tests passing, code review, env vars, migrations, rollback plan.
Post-Deploy (services): health check OK, monitoring active, old pods terminated, documented.
Production Readiness (production services): tests pass, no hardcoded secrets, JSON logging,
meaningful health check, pinned versions, env vars validated, resource limits, SSL/TLS, CVE
scan, CORS, rate limiting, security headers (CSP/HSTS/X-Frame-Options), rollback tested,
runbook, on-call. Apply security and CVE items to executable or security-sensitive workloads.

## Mobile Deployment

- EAS Build/Update: eas build:configure, eas build -p ios|android --profile preview, eas update --branch production, --auto-submit. Fastlane: iOS->match/cert/sigh, Android->supply/gradle.
- Store creds in env vars, never repo. Code Signing: iOS dev/distribution, automate w/ fastlane match.
- Android: keytool + Google Play App Signing. TestFlight/Google Play: fastlane pilot (internal instant, external 90d/100 testers), fastlane supply (internal/beta/production).
- Review 1-7 days. Rollback (Mobile): EAS->eas update:rollback.
- Native->revert build.
- Stores->phased rollout reduction.

## Constraints

MUST: env var separation. Services MUST expose a health check endpoint and graceful shutdown
(SIGTERM) when the workload requires them. MUST NOT: secrets in Git, NODE_ENV=production,
:latest tags (use version tags).
