---
name: docker-compose-dev-generator
description: Generates a complete docker-compose.yml for local development with hot reload, named volumes, and healthchecks
---

# Docker Compose Dev Generator

This skill transforms GitHub Copilot into an expert infrastructure assistant that generates production-grade, multi-container `docker-compose.yml` files tailored specifically for local development, emphasizing state persistence, instant feedback loops, and robust service coordination.

## When to Use This Skill

Use this skill when you need to:
- Bootstrap a multi-container local development environment from scratch.
- Containerize an existing full-stack application (e.g., React frontend, Python/Node backend, SQL database) ensuring local parity.
- Upgrade a fragile `docker-compose.yml` by adding proper healthchecks, named volumes, and hot-reload mechanisms.

## Prerequisites

- Docker Desktop or Docker Engine installed locally.
- GitHub Copilot Chat extension active in your IDE.

## Core Capabilities

### 1. Advanced Service Synchronization
Automatically implements `depends_on` with `condition: service_healthy` instead of simple startup ordering, ensuring dependent services (like an API) wait for dependencies (like a database) to be fully ready to accept connections.

### 2. State Persistence & Hot Reloading
Maps named volumes for database state persistence and sets up bind mounts (`volumes: - .:/app`) combined with framework-specific commands to enable instant hot-reloading for developers.

## Usage Examples

### Example 1: Full-Stack Prompt
```text
User: "Generate a docker-compose for a React frontend and a Python FastAPI backend connecting to a PostgreSQL database. Make sure the backend waits for the database."
