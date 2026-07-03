---
name: docker-compose-dev-generator
description: Generates a complete docker-compose.yml tailored for local development with hot-reload and healthchecks
---

# Docker Compose Dev Generator

This skill instructs GitHub Copilot to analyze your project stack and generate a highly optimized `docker-compose.yml` file specifically designed for local development.

## When to Use This Skill

Use this skill when you need to:
- Set up a local development environment for a new or existing project.
- Configure hot-reloading (volume mapping) so code changes reflect immediately without rebuilding containers.
- Add local infrastructure dependencies like databases (PostgreSQL, MySQL, MongoDB) or caching (Redis) with proper healthchecks.

## Prerequisites

- Docker Desktop or Docker Engine installed.
- A basic understanding of the project's stack (e.g., Node.js, Python, React).
- GitHub Copilot Chat active in your IDE.

## Core Capabilities

### 1. Stack Detection
Analyzes your current workspace (e.g., `package.json`, `requirements.txt`) to automatically determine the required services and base images.

### 2. Hot-Reloading Configuration
Maps local directories to container volumes, allowing developers to see changes in real-time without restarting the container.

### 3. Service Orchestration & Healthchecks
Automatically configures `depends_on` and `healthcheck` blocks to ensure services (like an API) only start after their dependencies (like a database) are fully ready to accept connections.

## Usage Examples

### Example 1: Standard Web Stack
**User prompt:**
> "@workspace Generate a docker-compose file for local development for this project. It uses Node.js and needs a PostgreSQL database."

### Example 2: Frontend with Hot-Reload
**User prompt:**
> "Create a docker-compose.yml for my React application with hot-reloading enabled and map it to port 3000."

## Guidelines

1. **Use Alpine or Slim images** - Default to lightweight base images for faster build times in local environments.
2. **Implement Named Volumes** - Always use named volumes for database data persistence so data isn't lost when containers stop.
3. **Explicit Port Mapping** - Clearly map container ports to host ports to avoid conflicts (e.g., `5432:5432`).

## Common Patterns

### Pattern: API + Database
```yaml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser"]
      interval: 5s
      timeout: 5s
      retries: 5
