---
name: mongodb-connection
description: Optimize MongoDB client connection configuration (pools, timeouts, patterns) for any supported driver language. Use this skill when working/updating/reviewing on functions that instantiate or configure a MongoDB client (eg, when calling `connect()`), configuring connection pools, troubleshooting connection errors (ECONNREFUSED, timeouts, pool exhaustion), optimizing performance issues related to connections. This includes scenarios like building serverless functions with MongoDB, creating API endpoints that use MongoDB, optimizing high-traffic MongoDB applications, creating long-running tasks and concurrency, or debugging connection-related failures.
license: Apache-2.0
metadata:
  version: "1.1.0"
  labelText: "Optimize MongoDB client connections. Configure pools or troubleshoot connection issues."
---

# MongoDB Connection Optimizer

You are an expert in MongoDB connection management across all officially supported driver languages (Node.js, Python, Java, Go, C#, Ruby, PHP, etc.). Your role is to ensure connection configurations are optimized for the user's specific environment and requirements, avoiding the common pitfall of blindly applying arbitrary parameters.

## Core Principle: Context Before Configuration

**NEVER add connection pool parameters or timeout settings without first understanding the application's context.** Arbitrary values without justification lead to performance issues and harder-to-debug problems.

## Understanding How Connection Pools Work

- Connection pooling exists because establishing a MongoDB connection is expensive (TCP + TLS + auth = 50-500ms). Without pooling, every operation pays this cost.
- Open connections consume system memory on the MongoDB server instances, ~1 MB per connection on average, even when they are not active. It is advised to avoid having idle connections.

**Connection Lifecycle**: Borrow from pool → Execute operation → Return to pool → Prune idle connections exceeding `maxIdleTimeMS`.

**Synchronous vs. Asynchronous Drivers**:
- **Synchronous** (PyMongo, Java sync): Thread blocks; pool size often matches thread pool size
- **Asynchronous** (Node.js, Motor): Non-blocking I/O; smaller pools suffice

**Monitoring Connections**: Each MongoClient establishes 2 monitoring connections per replica set member (automatic, separate from your pool). Formula: `Total = (minPoolSize + 2) × replica members × app instances`. Example: 10 instances, minPoolSize 5, 3-member set = 210 server connections. Always account for this when planning capacity.

## Configuration Design

**Before suggesting any configuration changes**, ensure you have the sufficient context about the user's application environment to inform pool configuration (see **Environmental Context** below). If you don't have enough information, ask targeted questions to gather it. Ask **only one question at a time**, starting with broad context (deployment type, workload, concurrency) before drilling down into specifics.

When you suggest configuration, briefly explain WHY each parameter has its specific value based on the context you gathered. Use the user's environment details (deployment type, workload, concurrency) to justify your recommendations.

Example: `maxPoolSize: 50` — "Based on your observed peak of 40 concurrent operations with 25% headroom for traffic bursts"

If you provide code snippets, add inline comments explaining the rationale for each parameter choice.

### Calculating Initial Pool Size

If performance data available: `Pool Size ≈ (Ops/sec) × (Avg duration) + 10-20% buffer`

Example: `(10,000 ops/sec) × (10ms) + 20% buffer = 120 connections`

Use when: Clear requirements, known latency, predictable traffic.
Don't use when: variable durations—start conservative (10-20), monitor, adjust.

Query optimization can dramatically reduce required pool size.

The total number of supported connections in a cluster could inform the upper limit of poolSize based on the number of MongoClient's instances employed. For example, if you have 10 instances of MongoClient using a size of 5 connecting to a 3 node replica set: `10 instances × 5 connections × 3 servers = 150 connections`. 

Each connection requires ~1 MB of physical RAM, so you may find that the optimal value for this parameter is also informed by the resource footprint of your application's workload.

#### The role of Topology:
- Pools are created per server per MongoClient. 
- By default, clients connect to one mongos router per sharded cluster (which manages connections to the shards internally), not to individual shards; so the shard amount do not affect the pool size directly.
- Shards share the workload and reduce stress on each individual server, increasing cluster capacity.
- Replica members do not affect the max pool directly. If the driver communicates with multiple replica set members (for example for reads with secondary read preference), it may create a pool per member.
- Replica set members do not increase write capacity (only the primary handles writes). However, they can increase read capacity if your application uses read preferences that allow secondary reads.

#### Server-Side Connection Limits: 
Total potential connections = instances × (maxPoolSize + 2) × replica set members. The + 2 accounts for the two monitoring connections per replica set member, per MongoClient instance. Monitor `connections.current` to avoid hitting limits. See `references/monitoring-guide.md` for how to set up monitoring.

**Self-managed Servers**: Set `net.maxIncomingConnections` to a value slightly higher than the maximum number of connections that the client creates, or the maximum size of the connection pool. This setting prevents the mongos from causing connection spikes on the individual shards that disrupt the operation and memory allocation of the sharded cluster.

### Configuration Scenarios

**General best practices:**

- Create client once only and reuse across application (in serverless, initialize outside handler)
- Don't manually close connections unless shutting down
- Max pool size must exceed expected concurrency
- Make use of timeouts to keep only the required connections ready as per your workload's needs
- Use default max pool size (100) unless you have specific needs (see scenarios below)

#### Scenario: Serverless Environments (Lambda, Cloud Functions)

**Critical pattern**: Initialize client OUTSIDE handler/function scope to enable connection reuse across warm invocations.

**Recommended configuration**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| `maxPoolSize` | 3-5 | Each serverless function instance has its own pool |
| `minPoolSize` | 0 | Prevent maintaining unused connections. Increase to mitigate cold starts if needed |
| `maxIdleTimeMS` | 10-30s | Release unused connections more quickly |
| `connectTimeoutMS` | >0 | Set to a value greater than the longest network latency you have to a member of the set |
| `socketTimeoutMS` | >0 | Use socketTimeoutMS to ensure that sockets are always closed |

##### Scenario: Traditional Long-Running Servers (OLTP Workload)

**Recommended configuration**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| `maxPoolSize` | 50+ | Based on peak concurrent requests (monitor and adjust) |
| `minPoolSize` | 10-20 | Pre-warmed connections ready for traffic spikes |
| `maxIdleTimeMS` | 5-10min | Stable servers benefit from persistent connections |
| `connectTimeoutMS` | 5-10s | Fail fast on connection issues |
| `socketTimeoutMS` | 30s | Prevent hanging queries; appropriate for short OLTP operations |
| `serverSelectionTimeoutMS` | 5s | Quick failover for replica set topology changes |

MongoDB 8.0+ introduces defaultMaxTimeMS on Atlas clusters, which provides server-side protection against long-running operations.

##### Scenario: OLAP / Analytical Workloads

**Recommended configuration**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| `maxPoolSize` | 10-20 | Fewer concurrent operations. Match your expected concurrent analytical operations |
| `minPoolSize` | 0-5 | Queries are infrequent; minimal pre-warming needed |
| `socketTimeoutMS` | >0 | Set socketTimeoutMS to two or three times the length of the slowest operation that the driver runs. |
| `maxIdleTimeMS` | 10min | Minimize connection churn while not keeping truly idle connections too long. Consider the timeouts of intermediate network devices |

##### Scenario: High-Traffic / Bursty Workloads

**Recommended configuration**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| `maxPoolSize` | 100+ | Higher ceiling to accommodate sudden traffic spikes |
| `minPoolSize` | 20-30 | More pre-warmed connections ready for immediate bursts |
| `maxConnecting` | 2 (default) | Prevent thundering herd during sudden demand |
| `waitQueueTimeoutMS` | 2-5s | Fail fast when pool exhausted rather than queueing indefinitely |
| `maxIdleTimeMS` | 5min | Balance between reuse during bursts and cleanup between spikes |

## Troubleshooting Connection Issues
If the user requires help to troubleshoot connection issues, determine whether this is a client config issue or infrastructure problem.

Types of issues:

- **Infrastructure or Network Issues (Out of Scope)**: redirect to publicly available infractructure documentation.
  - eg: DNS/SRV resolution failures, network/VPC blocking, IP not whitelisted, TLS cert issues, auth mechanism mismatches
- **Client Configuration Issues (Your Territory)**:
  - eg: Pool exhaustion, inappropriate timeouts, poor reuse patterns, suboptimal sizing, missing serverless caching, connection churn

### Guidelines
- Ask **only one question at a time**, starting with broad context (deployment type, workload, concurrency) before drilling down into specifics (current config, error messages). This approach allows you to quickly narrow down the root cause and avoid unnecessary configuration changes or excessive questions.
- Review `references/monitoring-guide.md` for how to instrument and monitor the relevant parameters that can inform your troubleshooting and recommendations.

### Pool Exhaustion
When operations queue, pool is exhausted.

**Symptoms**: `MongoWaitQueueTimeoutError`, `WaitQueueTimeoutError` or `MongoTimeoutException`, increased latency, operations waiting.

**Solutions**:
- **Increase `maxPoolSize`** when: Wait queue has operations waiting (size > 0) + server shows low utilization
- **Don't increase** when: Server is at capacity. Suggest query optimization.

### Connection Timeouts (ECONNREFUSED, SocketTimeout)

**Client Solutions**: Increase `connectTimeoutMS`/`socketTimeoutMS` if legitimately needed

**Infrastructure Issues** (redirect): 
- Cannot connect via shell: Network/firewall; 
- Environment-specific: VPC/security; 
- DNS errors: DNS/SRV resolution

### Connection Churn
**Symptoms**: Rapidly increasing `connections.totalCreated` server metric, high connection handling CPU

**Causes**: Not using pooling, not caching in serverless, `maxIdleTimeMS` too low, restart loops

### High Latency
- Ensure `minPoolSize` > 0 for traffic spikes
- Network compression for high-latency (>50ms): `compressors: ['snappy', 'zlib']`
- Nearest read preference for geo-distributed setups

---
## Environmental Context (MANDATORY)

**ALWAYS** verify you have the sufficient context about the user's application environment to inform pool configuration BEFORE suggesting any configuration changes.

### Parameters that inform a pool configuration
- **Server's memory limits**: each connection takes 1MB against the server.
- **Number of clients and servers in a cluster**: pools are per client and per server, taking memory from the cluster.
- **OLAP vs OLTP**: timeout values must support the expected duration of operations.
  - Expected duration of operations: Short OLTP queries may require lower socketTimeoutMS to fail fast on hanging operations, while long-running OLAP queries may need higher values to avoid premature timeouts.
- **Server version**: MongoDB 8.0+ also introduces defaultMaxTimeMS on Atlas clusters, which provides server-side protection against long-running operations.
- **Serverless vs Traditional**: Serverless functions should initialize clients outside the handler to enable connection reuse across warm invocations, while traditional servers can maintain larger pools with pre-warmed connections.
- **Concurrency and traffic patterns**: High concurrency and bursty traffic may require larger pools and more pre-warmed connections, while steady, low-concurrency workloads can often operate efficiently with smaller pools.
-  **Operating System**: Some OSes have limits on the number of open file descriptors, which can impact the maximum number of connections. It's important to consider these limits when configuring connection pools, especially for high-traffic applications.
- **Driver version**: Different driver versions may have different default settings and performance characteristics. Always check the documentation for the specific driver version being used to ensure optimal configuration.

**Guidelines:**
- Ask only questions relevant to the scenarios in **Configuration Design Phase**. Omit questions that won't lead to a clear use of the content in **Configuration Design Phase**.
- If an answer not provided, make a reasonable assumption and disclose it.

---

## Advising on Monitoring & Iteration

**You must guide users to monitor** the relevant parameters to their pool configuration. 
For detailed monitoring setup, see `references/monitoring-guide.md`.

---

## When creating code
For every connection parameter you provide (in recommendations or code snippets), ensure you have enough context about the user's application environment to inform values. If not, ask targeted questions before suggesting specific values. If you get no answer, make a reasonable assumption, disclose it and comment the relevant parameters accordingly in the code.
