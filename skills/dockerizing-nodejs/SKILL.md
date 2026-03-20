---
name: dockerizing-nodejs
description: 'A comprehensive, prompt-by-prompt guide for using GitHub Copilot (Chat + Inline) to generate, optimize, and ship a production-ready Docker container for any Node.js app.'
---
# GitHub Copilot Skill — Dockerizing a Node.js Application

> A comprehensive, prompt-by-prompt guide for using GitHub Copilot (Chat + Inline) to generate, optimize, and ship a production-ready Docker container for any Node.js app.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Phase 1 — Scaffold the Dockerfile](#2-phase-1--scaffold-the-dockerfile)
3. [Phase 2 — Generate .dockerignore](#3-phase-2--generate-dockerignore)
4. [Phase 3 — docker-compose for Local Development](#4-phase-3--docker-compose-for-local-development)
5. [Phase 4 — Optimize & Harden the Image](#5-phase-4--optimize--harden-the-image)
6. [Phase 5 — CI/CD: Build & Push to Registry](#6-phase-5--cicd-build--push-to-registry)
7. [Phase 6 — Debugging & Inline Fixes](#7-phase-6--debugging--inline-fixes)
8. [Copilot Prompting Cheat Sheet](#8-copilot-prompting-cheat-sheet)
9. [Common Pitfalls & Copilot Caveats](#9-common-pitfalls--copilot-caveats)

---

## 1. Prerequisites & Setup

### Tools Required

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18 or 20 LTS | Runtime |
| Docker Desktop | 24+ | Build & run containers |
| GitHub Copilot | Chat + Inline | AI code generation |
| VS Code | Latest | Editor |
| Docker extension (VS Code) | Latest | Container management |

### Enable Copilot Chat Features

Before starting, ensure these VS Code settings are active:

```json
{
  "github.copilot.chat.enabled": true,
  "github.copilot.editor.enableAutoCompletions": true
}
```

### Copilot Invocation Methods

| Method | Shortcut | Best For |
|---|---|---|
| Inline suggestion | Tab to accept | Completing known patterns |
| Inline chat | Ctrl+I (Cmd+I) | Editing selected code |
| Copilot Chat sidebar | Ctrl+Shift+I | Generating full files |
| `@workspace` scope | In chat | Analysing your whole project |
| `/explain`, `/fix`, `/doc` | In chat | Slash commands |

---

## 2. Phase 1 — Scaffold the Dockerfile

### 2.1 Basic Single-Stage Dockerfile (quick start)

**Trigger:** Create a blank `Dockerfile` in your project root and type the first `#` comment. Copilot will start suggesting.

**Copilot Chat Prompt:**

```
@workspace Create a Dockerfile for this Node.js Express app.
Use node:20-alpine as the base image.
Set NODE_ENV=production.
Run npm ci to install production dependencies only.
Copy source files, expose port 3000, and start with node src/index.js.
Run as a non-root user.
```

**Expected Output:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Create and switch to non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "src/index.js"]
```

---

### 2.2 Multi-Stage Build (recommended for production)

Multi-stage builds keep the final image small by discarding build tools and dev dependencies.

**Copilot Chat Prompt:**

```
@workspace Create a production-ready multi-stage Dockerfile for this Node.js app.

Stage 1 (builder):
- Base image: node:20-alpine
- Install ALL dependencies including devDependencies
- Run the build script (npm run build)

Stage 2 (production):
- Base image: node:20-alpine
- Copy only the built output (/dist) and production node_modules from stage 1
- Set NODE_ENV=production
- Create a non-root user called 'node' with uid 1001
- Expose port 3000
- Add a HEALTHCHECK

Do NOT include dev tools, test files, or source maps in the final image.
```

**Expected Output:**

```dockerfile
# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

---

### 2.3 TypeScript Project Variant

**Copilot Chat Prompt:**

```
@workspace This is a TypeScript Node.js app using Express.
Modify the Dockerfile to:
- Run `npx tsc` in the builder stage to compile TypeScript
- Use tsconfig.json paths to output to /dist
- In production stage, copy only /dist and node_modules
- The start command should be: node dist/index.js
```

**Copilot Inline Prompt (in the builder stage):**

```
# compile TypeScript to /dist
```
Copilot will suggest: `RUN npx tsc --project tsconfig.json`

---

### 2.4 Using Build Arguments and Environment Variables

**Copilot Chat Prompt:**

```
Add ARG and ENV instructions to the Dockerfile for:
- NODE_ENV (default: production)
- PORT (default: 3000)
- APP_VERSION passed at build time

Do NOT hardcode any secrets. All secret values must be injected at container runtime via environment variables, never baked into the image.
```

**Expected additions:**

```dockerfile
ARG NODE_ENV=production
ARG PORT=3000
ARG APP_VERSION=unknown

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV APP_VERSION=${APP_VERSION}
```

> **Warning:** Copilot sometimes inserts placeholder values like `SECRET=your-secret-here`. Always audit every `ENV` and `ARG` line before committing.

---

## 3. Phase 2 — Generate .dockerignore

A missing `.dockerignore` can balloon your build context from kilobytes to gigabytes. Generate it immediately after the Dockerfile.

**Copilot Chat Prompt:**

```
@workspace Generate a comprehensive .dockerignore file for a Node.js project.

Exclude:
- node_modules (all levels)
- .git and .github
- All .env files (.env, .env.local, .env.*.local)
- dist and build output directories
- Test files and coverage reports
- Log files (*.log, logs/)
- Editor config (.vscode, .idea, *.swp)
- OS files (.DS_Store, Thumbs.db)
- Docker files themselves (Dockerfile*, docker-compose*)
- README and documentation
- CI config files (.github/, .circleci/)
```

**Expected Output:**

```dockerignore
# Dependencies
node_modules
**/node_modules

# Version control
.git
.gitignore
.github

# Environment files — never bake secrets into the image
.env
.env.*
.env.local
.env.*.local

# Build artifacts (will be generated inside Docker)
dist
build
.next
.nuxt
out

# Test & coverage
coverage
__tests__
*.test.ts
*.spec.ts
jest.config.*

# Logs
*.log
logs/
npm-debug.log*

# Editor
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker (avoid recursive build context issues)
Dockerfile*
docker-compose*
.dockerignore

# Docs & CI (not needed in container)
*.md
.github
.circleci
```

### Monorepo Variant

**Copilot Chat Prompt:**

```
This is a monorepo. The Docker build context is the repo root but we only need packages/api/** inside the container.
Ignore all other packages/* directories and apps/* except the one being built.
```

---

## 4. Phase 3 — docker-compose for Local Development

### 4.1 Basic Compose with Database and Cache

**Copilot Chat Prompt:**

```
@workspace Generate a docker-compose.yml for local development with:

Services:
- app: built from local Dockerfile, port 3000:3000
- postgres: image postgres:16-alpine, port 5432:5432, persistent named volume
- redis: image redis:7-alpine, port 6379:6379

Requirements:
- Load environment from .env file using env_file
- postgres and redis should have health checks
- app service should depend_on postgres and redis (with condition: service_healthy)
- Use named volumes for postgres data
- All services on a shared custom network called 'app-network'
```

**Expected Output:**

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

---

### 4.2 Hot Reload for Development (Override File Pattern)

**Copilot Chat Prompt:**

```
Create a docker-compose.override.yml that:
- Mounts the local source directory as a volume into /app (for hot reload)
- Overrides the app command to use: npm run dev (nodemon)
- Sets NODE_ENV=development
- Adds DEBUG=* env var

This override should work alongside docker-compose.yml automatically when running `docker compose up`.
```

**Expected Output:**

```yaml
# docker-compose.override.yml — auto-merged in development
version: "3.9"

services:
  app:
    build:
      target: builder        # Use build stage, not production
    volumes:
      - .:/app               # Mount source for hot reload
      - /app/node_modules    # Prevent host node_modules from overwriting
    command: npm run dev
    environment:
      NODE_ENV: development
      DEBUG: "*"
```

> **Tip:** `docker compose up` merges `docker-compose.yml` + `docker-compose.override.yml` automatically. Use `docker compose -f docker-compose.yml up` to run production config only.

---

## 5. Phase 4 — Optimize & Harden the Image

### 5.1 Fix Layer Caching Order

**Copilot Inline Prompt (select your COPY/RUN block):**

```
# Fix layer caching: copy package files first, install deps, then copy source
```

**Correct pattern (Copilot should generate):**

```dockerfile
# [Correct]: package files copied first — deps only reinstall when package.json changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
```

```dockerfile
# [Wrong]: copying source first invalidates dep cache on every file change
COPY . .
RUN npm ci
```

---

### 5.2 Non-Root User (Security Hardening)

**Copilot Chat Prompt:**

```
Add a non-root user to the production stage of my Dockerfile:
- Group name: appgroup
- User name: appuser, uid 1001
- chown the /app directory to appuser
- Switch to appuser before the CMD instruction
- Ensure the app can still write to /tmp if needed
```

```dockerfile
RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

RUN chown -R appuser:appgroup /app

USER appuser
```

---

### 5.3 Health Check Endpoint

First, add a `/health` route to your Express app:

**Copilot Chat Prompt:**

```
Add a /health GET endpoint to my Express app that returns:
{ status: "ok", uptime: process.uptime(), timestamp: Date.now() }
with HTTP 200. Keep it lightweight — no DB checks.
```

Then add the `HEALTHCHECK` to the Dockerfile:

**Copilot Inline Prompt:**

```
# Add HEALTHCHECK using wget, interval 30s, timeout 5s, 3 retries
```

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1
```

---

### 5.4 Minimize Final Image Size

**Copilot Chat Prompt:**

```
My Docker image is 1.4GB. Suggest all changes to reduce it below 150MB.
Current Dockerfile: [paste your Dockerfile here]

Focus on:
- Correct base image choice
- Multi-stage separation
- Removing dev dependencies
- Clearing npm and apk caches
- Not copying unnecessary files
```

**Common wins Copilot will suggest:**

```dockerfile
# 1. Use Alpine
FROM node:20-alpine

# 2. Clean npm cache after install
RUN npm ci --omit=dev && npm cache clean --force

# 3. Clean apk cache if you installed system packages
RUN apk add --no-cache curl

# 4. Remove unnecessary files post-install
RUN find /app/node_modules -name "*.md" -delete \
  && find /app/node_modules -name "*.ts" ! -name "*.d.ts" -delete
```

---

### 5.5 Vulnerability Scanning

**Copilot Chat Prompt:**

```
Generate a GitHub Actions job step that:
1. Builds the Docker image
2. Runs Trivy to scan for CRITICAL and HIGH vulnerabilities
3. Fails the workflow if any CRITICAL vulnerabilities are found
4. Outputs the results as a GitHub Actions summary
```

```yaml
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
    format: "sarif"
    output: "trivy-results.sarif"
    severity: "CRITICAL,HIGH"
    exit-code: "1"

- name: Upload Trivy results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

---

## 6. Phase 5 — CI/CD: Build & Push to Registry

### 6.1 GitHub Actions — Build & Push to GHCR

**Copilot Chat Prompt:**

```
@workspace Generate a complete GitHub Actions workflow file at .github/workflows/docker-publish.yml that:

1. Triggers on push to main branch and version tags (v*)
2. Checks out the code
3. Sets up Docker Buildx
4. Logs in to GitHub Container Registry (ghcr.io) using GITHUB_TOKEN
5. Extracts Docker metadata (tags and labels) using docker/metadata-action
6. Builds and pushes the image for linux/amd64 and linux/arm64 platforms
7. Uses GitHub Actions cache (type=gha) for build layer caching
8. Tags the image with: git SHA, branch name, and semver tags on releases
```

**Expected Output:**

```yaml
name: Build and publish Docker image

on:
  push:
    branches: [main]
    tags: ["v*.*.*"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            APP_VERSION=${{ github.sha }}
```

---

### 6.2 Build for a Specific Target (e.g. AWS ECR)

**Copilot Chat Prompt:**

```
Modify the workflow to push to AWS ECR instead of GHCR.
Use aws-actions/configure-aws-credentials and amazon-ecr-login.
Store AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as GitHub secrets.
```

---

## 7. Phase 6 — Debugging & Inline Fixes

### 7.1 Explain a Generated Dockerfile

Select the entire Dockerfile and use:

```
/explain Walk me through each instruction in this Dockerfile.
Explain why each layer is ordered the way it is.
```

---

### 7.2 Fix Build Errors

**Pattern — paste the exact error:**

```
/fix Docker build fails at RUN npm ci with this error:
npm ERR! code ENOENT
npm ERR! path /app/package.json

Here is my Dockerfile: [paste]
```

**Common fixes Copilot suggests:**

```dockerfile
# Fix: WORKDIR must be set before COPY
WORKDIR /app
COPY package.json package-lock.json ./  # ← must come after WORKDIR
```

---

### 7.3 Debug a Running Container

**Copilot Chat Prompt:**

```
Generate a Makefile with these targets:
- make build: docker build with build args
- make up: docker compose up -d
- make down: docker compose down -v
- make shell: exec into the running app container as root
- make logs: tail logs from the app service
- make inspect: show env vars, open ports, running processes inside the container
```

**Expected Makefile excerpt:**

```makefile
IMAGE  := myapp
TAG    := $(shell git rev-parse --short HEAD)

build:
	docker build --build-arg APP_VERSION=$(TAG) -t $(IMAGE):$(TAG) .

up:
	docker compose up -d

down:
	docker compose down -v

shell:
	docker compose exec app sh

logs:
	docker compose logs -f app

inspect:
	@echo "=== ENV VARS ===" && docker compose exec app env
	@echo "=== PROCESSES ===" && docker compose exec app ps aux
	@echo "=== OPEN PORTS ===" && docker compose exec app netstat -tuln 2>/dev/null || ss -tuln
```

---

### 7.4 Reduce Image Size — Audit Prompt

**Copilot Chat Prompt:**

```
Analyse this Dockerfile for size reduction opportunities.
Run `docker history` mentally and estimate which layers are largest.
Suggest:
1. Base image alternatives
2. Files that can be excluded
3. RUN commands that can be merged
4. Whether multi-stage is being used correctly

Current image size: 1.2GB
Target: under 200MB

Dockerfile:
[paste here]
```

---

## 8. Copilot Prompting Cheat Sheet

| Goal | Prompt Pattern |
|---|---|
| Generate full Dockerfile | `@workspace Create a Dockerfile for [app type]. Use [base image]. Requirements: [list]` |
| Multi-stage build | `Use multi-stage: stage 1 builds, stage 2 is production only` |
| Fix a specific error | `/fix [paste exact error message] — Dockerfile: [paste]` |
| Explain generated code | `/explain` (with file selected) |
| Reduce image size | `My image is Xgb. Suggest all changes to reduce it. Dockerfile: [paste]` |
| Security hardening | `Add non-root user, read-only filesystem, drop all Linux capabilities` |
| Add health check | `Add HEALTHCHECK for /health endpoint, port 3000, 30s interval, 3 retries` |
| Generate CI workflow | `Generate GitHub Actions workflow: build, scan, push to ghcr.io` |
| Debug running container | `Generate Makefile targets: shell, logs, inspect env, inspect ports` |
| Generate .dockerignore | `Generate .dockerignore for Node.js. Exclude: [your list]` |

---

## 9. Common Pitfalls & Copilot Caveats

### Pitfall 1 — Copilot Uses Outdated Base Images

Copilot may suggest `node:14` or `node:16` (EOL). Always specify:

```
Use node:20-alpine (LTS, Alpine variant)
```

### Pitfall 2 — Secrets in ENV Instructions

Copilot sometimes generates:

```dockerfile
ENV DATABASE_URL=postgres://user:password@localhost/db  # [Never do this]
```

Always use runtime injection:

```bash
docker run -e DATABASE_URL=$DATABASE_URL myapp
```

Or via Compose `env_file: .env`.

### Pitfall 3 — Wrong Layer Order (Cache Busting)

```dockerfile
COPY . .          # [Wrong] Copies source first — busts cache on every change
RUN npm ci
```

Correct:

```dockerfile
COPY package*.json ./  # [Correct] Only changes when deps change
RUN npm ci
COPY . .               # [Correct] Source copied after deps are cached
```

### Pitfall 4 — Running as Root

The default Node.js image runs as root. Always add:

```dockerfile
USER node
# or create a custom user with adduser
```

### Pitfall 5 — node_modules in Build Context

Without `.dockerignore`, the host `node_modules` (potentially GB-scale) is sent to the Docker daemon. Always create `.dockerignore` before running the first `docker build`.

### Pitfall 6 — Copilot Action Version Drift

GitHub Actions steps generated by Copilot may use `@v2` or `@v3` for actions that have since released `@v4` or `@v5`. Always verify action versions at [github.com/marketplace](https://github.com/marketplace).

### Pitfall 7 — Missing `--omit=dev` Flag

```dockerfile
RUN npm ci           # [Wrong] Installs devDependencies in production image
RUN npm ci --omit=dev  # [Correct] Production dependencies only
```

---

