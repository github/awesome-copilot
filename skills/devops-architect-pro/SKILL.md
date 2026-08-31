---
name: devops-architect-pro
description: "DevOps and platform engineering knowledge base covering AWS, Azure, Kubernetes, Docker, Terraform, CloudFormation, Ansible, Jenkins, GitHub Actions, Python, Java, Spring Boot, PostgreSQL, Patroni, Kafka, Snowflake, Databricks, AI agents, LangChain, MCP, CI/CD, Linux, and Cloudflare. Use when designing, building, debugging, or reviewing infrastructure, deployment pipelines, cloud architecture, container orchestration, database HA/replication, data platforms, or AI-agent/MCP integrations. Skip for pure frontend/UI work or business logic unrelated to infrastructure or the deployment path."
---

# DevOps Architect Pro

Searchable local knowledge base of DevOps, cloud, and platform-engineering guidance across 23 domains, ranked
with the same stdlib-only BM25 approach used by production Claude Code skills — no external services, no
API keys, no network calls.

## When to Apply

Use this skill for infrastructure design, deployment pipelines, cloud resource configuration, container
orchestration, database high-availability/replication, data platform work, CI/CD pipeline design, or
AI-agent/MCP integration work. Skip it for pure application/business logic, UI work, or anything that
doesn't touch infrastructure, deployment, data platforms, or the operational path.

## Running the search tool

The script lives inside this skill's own directory, not the project directory — always invoke it by its
full path, never assume a particular working directory:

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/search.py" "<query>" --domain <domain>
```

If `python` is not found, try `python3`, then `py -3`. Requires Python 3.x, stdlib only.

## Domains

| Domain | File | Covers |
|--------|------|--------|
| `aws` | `data/aws.csv` | EC2, S3, Lambda, IAM, VPC, RDS, EKS, CloudWatch, and related AWS services |
| `azure` | `data/azure.csv` | AKS, Azure Functions, ARM/Bicep, Azure DevOps, Entra ID, Blob Storage |
| `kubernetes` | `data/kubernetes.csv` | Pods, deployments, Helm, ingress, autoscaling, cluster operations |
| `docker` | `data/docker.csv` | Dockerfiles, image builds, layer caching, docker-compose |
| `terraform` | `data/terraform.csv` | HCL, state management, modules, providers, plan/apply workflow |
| `cloudformation` | `data/cloudformation.csv` | Stacks, change sets, nested stacks, drift |
| `ansible` | `data/ansible.csv` | Playbooks, roles, inventory, idempotency, Vault |
| `jenkins` | `data/jenkins.csv` | Jenkinsfiles, declarative pipelines, agents |
| `github-actions` | `data/github-actions.csv` | Workflows, reusable actions, runners, secrets |
| `python` | `data/python.csv` | Packaging, testing, async, dependency management |
| `java` | `data/java.csv` | JVM tuning, build tools, GC, concurrency |
| `spring-boot` | `data/spring-boot.csv` | Configuration, security, actuator, dependency injection |
| `postgresql` | `data/postgresql.csv` | Query performance, indexing, vacuum, replication |
| `patroni` | `data/patroni.csv` | Postgres HA, leader election, failover, DCS |
| `kafka` | `data/kafka.csv` | Brokers, topics, partitions, consumer groups |
| `snowflake` | `data/snowflake.csv` | Warehouses, clustering, Snowpipe, cost control |
| `databricks` | `data/databricks.csv` | Spark, Delta Lake, notebooks, Unity Catalog |
| `ai-agents` | `data/ai-agents.csv` | Agent loop design, tool use, autonomy boundaries |
| `langchain` | `data/langchain.csv` | Chains, retrievers, LangGraph, vector stores |
| `mcp` | `data/mcp.csv` | Model Context Protocol servers, tools, transports |
| `ci-cd` | `data/ci-cd.csv` | Pipeline design, deployment gates, artifact promotion |
| `linux` | `data/linux.csv` | systemd, networking, permissions, troubleshooting |
| `cloudflare` | `data/cloudflare.csv` | Workers, Tunnels, DNS, WAF, Pages |

Domain is auto-detected from the query if `--domain` is omitted, but auto-detection can misroute on
overlapping terms (e.g. "cluster" could mean Kubernetes, Kafka, or Databricks). If results look
off-topic, pass `--domain` explicitly. Use `--list-domains` to print the full list.

## Workflow

### Step 1: Identify the domain(s)

A single request often spans more than one domain (e.g. "why is my Postgres replica lagging behind
Patroni's leader" touches both `postgresql` and `patroni`). Identify every domain the request actually
touches before searching — don't stop at the first match.

### Step 2: Search before answering from memory

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/search.py" "<specific keywords>" --domain <domain>
```

Use specific, multi-word queries — combine the technology + the symptom or task: `"terraform state lock
dynamodb"`, not just `"terraform"`. Run one search per domain identified in Step 1.

### Step 3: If a search returns 0 results

Do not fabricate an answer as if it came from the knowledge base. Instead:
1. Retry once with broader or differently-worded keywords (try the technology name alone, separately from
   the symptom).
2. If still empty, answer from general knowledge and say explicitly that this came from general knowledge,
   not a database match (e.g. "no entry for X in the local knowledge base — this is general guidance").
3. Never present a 0-result search as if it returned data.

### Step 4: Cross-domain synthesis

For infrastructure-spanning tasks (e.g. "deploy this Spring Boot service to EKS via GitHub Actions"),
search each relevant domain (`spring-boot`, `kubernetes`, `aws`, `github-actions`, `ci-cd`) and synthesize
— don't just paste the first domain's results and stop.

## Output Formats

Default is human-readable text, truncated at 300 characters per field except `Do`/`Don't`/`Example`
(commands and config snippets are never truncated, since a cut-off snippet is worse than a long one).
Pass `--json` for machine-readable output, `--full` to disable truncation entirely, `-n <N>` to change the
result count (default 5).

## Tips for Better Results

- Combine **technology + specific symptom or task**: `"kafka consumer group rebalancing storm"`, not just
  `"kafka"`.
- If a query could plausibly span two domains, search both rather than guessing which one the
  auto-detector picked.
- For "how do I..." questions, search the verb + object (`"terraform import existing resource"`) rather
  than an abstract description.
