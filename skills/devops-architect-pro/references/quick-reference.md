# DevOps Architect Pro — Quick Reference

A priority-ordered "read this first" cheat sheet across all 23 knowledge-base domains. Rows are ordered
by blast radius: security and data-loss risks first, reliability and correctness next, cost and
performance concerns last. This table is a summary — search the domain's CSV for full guidance,
commands, and references.

| Priority | Domain | Top Concern | Why It Matters |
|---|---|---|---|
| 1 | Kubernetes | RBAC over-permissioned service accounts / no NetworkPolicy | A compromised pod with `cluster-admin` or unrestricted pod-to-pod networking can take over the whole cluster. |
| 2 | AWS | S3 public access / open security groups (0.0.0.0/0) | The single most common cause of real-world cloud data breaches; scanners find exposed ports and buckets within minutes. |
| 3 | AWS | IAM least privilege / root account MFA | A broad or unprotected root/IAM credential is a full account takeover, not just a service compromise. |
| 4 | Azure | Entra ID Owner-role sprawl | Owner grants role-assignment rights too, letting a compromised identity self-escalate to full control. |
| 5 | Docker | Secrets baked into image layers | `ENV`/`ARG`-injected secrets are visible via `docker history` forever, even after a later layer "deletes" them. |
| 6 | Terraform | Remote state with locking, and state file secrets | Unlocked/local state causes corruption under concurrent applies; state itself often holds plaintext secrets. |
| 7 | CloudFormation | Missing `DeletionPolicy` on stateful resources | A stack delete wipes databases and buckets by default unless `Retain`/`Snapshot` is set explicitly. |
| 8 | Ansible | Vault for secrets | Plaintext credentials in `group_vars` are a routine leak vector the moment a repo's visibility changes. |
| 9 | Jenkins | Credentials binding / controller isolation | Hardcoded secrets leak into build logs; builds on the controller node expose the system that manages Jenkins itself. |
| 10 | GitHub Actions | Least-privilege `GITHUB_TOKEN`, pinned third-party actions | An overscoped default token or a mutable-tag action turns one compromised dependency into a repo-wide compromise. |
| 11 | PostgreSQL | Point-in-time recovery / WAL archiving | Nightly `pg_dump` alone means any gap since the last dump is unrecoverable data loss. |
| 12 | Patroni | DCS quorum sizing and split-brain fencing | An under-sized or unfenced DCS cluster can produce two "primaries" writing divergent data simultaneously. |
| 13 | Kafka | Replication factor + `min.insync.replicas` | `replication.factor=1` means one broker failure loses committed, acknowledged data outright. |
| 14 | Snowflake | RBAC design / ACCOUNTADMIN sprawl | Over-granting ACCOUNTADMIN for convenience removes the least-privilege boundary across the whole account. |
| 15 | Databricks | Secrets management (Databricks Secrets, not hardcoded) | Credentials pasted into notebook cells persist in history and are visible to anyone with notebook read access. |
| 16 | AI Agents | Permission boundaries for autonomous/destructive actions | An agent with unscoped access to destructive or financial tools turns one reasoning error into real-world damage. |
| 17 | AI Agents | Prompt injection from untrusted tool output | Text from web pages, emails, or scraped content can hijack an agent's instructions if treated as trusted input. |
| 18 | MCP | Server authentication for remote/networked servers | An unauthenticated remote MCP server lets anyone who can reach it invoke its tools, including destructive ones. |
| 19 | CI/CD | Rollback strategy tested before it's needed | Discovering the rollback path for the first time during an incident wastes the minutes that matter most. |
| 20 | Linux | SSH hardening (disable password auth / root login) | Password + root SSH access is the default target for internet-wide credential-stuffing scans. |
| 21 | Cloudflare | Zero Trust Access policies in front of Tunnels | Exposing an internal tool via Tunnel with no Access policy is "security through obscurity" of the URL alone. |
| 22 | Java / Spring Boot | Actuator endpoint exposure / heap sizing in containers | Public `/actuator/env` leaks secrets; default heap sizing ignores container cgroup limits and gets OOMKilled. |
| 23 | Python | Deserializing untrusted data (`pickle`/`eval`) | Unpickling or `eval()`-ing untrusted input is arbitrary code execution, not a performance or style concern. |
| 24 | LangChain | Unbounded conversation memory | `ConversationBufferMemory` with no windowing eventually exceeds the context window in any long-running session. |
| 25 | Terraform / CloudFormation | Plan review / change-set discipline before apply | Skipping the preview step is how an unintended `destroy`/`replace` reaches production undetected. |
| 26 | Docker | Non-root containers, pinned base images | Root-by-default containers widen the blast radius of any container-escape bug; mutable `:latest` tags break reproducibility. |
| 27 | Kubernetes | PodDisruptionBudget / liveness vs readiness probes | Missing PDBs let routine node drains take down every replica at once; probe misconfiguration causes needless restarts. |
| 28 | AWS / Azure | RDS Multi-AZ / geo-redundant backups | Single-AZ or locally-redundant backup storage means a regional outage takes the database and its backups down together. |
| 29 | PostgreSQL | Autovacuum tuning on large, high-churn tables | Default thresholds under-vacuum large tables, degrading performance and risking transaction ID wraparound. |
| 30 | Kafka | Consumer group rebalancing storms | Frequent pod churn under the eager rebalance protocol stalls the entire consumer group on every restart. |
| 31 | Jenkins / GitHub Actions | Pipeline timeouts and manual approval gates | Hung builds tie up runners indefinitely; auto-deploying every merge straight to prod removes the last human checkpoint. |
| 32 | Java | Thread pool / connection pool sizing | Unbounded pools exhaust memory and downstream connections simultaneously under load spikes. |
| 33 | AI Agents / MCP | Idempotency of side-effecting actions | A retried tool call against a non-idempotent action (charge, invoice, email) produces duplicate side effects. |
| 34 | AWS | Unattached EBS volumes / idle resources | The most common source of silently accumulating cloud cost that no one notices until the bill arrives. |
| 35 | Snowflake / Databricks | Warehouse/cluster auto-suspend and autoscaling | Idle compute left running (no auto-suspend, fixed-size clusters) is pure wasted spend with no performance benefit. |
| 36 | CI/CD | Build once, promote across environments | Rebuilding per environment means what was tested in staging isn't guaranteed identical to what ships to prod. |
| 37 | Linux | Disk space: inodes vs blocks | "No space left on device" with free blocks remaining is a classic inode-exhaustion trap that `df -h` alone hides. |
| 38 | Python / Java | Dependency lockfiles and pinning | Unpinned dependencies make builds non-reproducible and let a transitive version bump break prod without a code change. |
