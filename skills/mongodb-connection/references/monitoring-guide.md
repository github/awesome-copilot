# MongoDB Connection Monitoring Guide

This reference provides detailed guidance on monitoring connection pool health, interpreting metrics, and taking action based on what you observe. Consult this when users need to verify their configuration is working or troubleshoot connection-related issues.

## Driver Events
All MongoDB drivers implement the [Connection Monitoring and Pooling specification](https://github.com/mongodb/specifications/blob/master/source/connection-monitoring-and-pooling/connection-monitoring-and-pooling.md), which defines standard events for tracking pool lifecycle and connection state:

**Pool lifecycle events**:
- `ConnectionPoolCreated` / `ConnectionPoolClosed` - Track when pools are initialized or shut down

**Connection lifecycle events**:
- `ConnectionCreated` / `ConnectionClosed` - Monitor connection churn (rapid creation = pooling issues)

**Check-out events**:
- `ConnectionCheckOutStarted` - Operation requests a connection
- `ConnectionCheckedOut` / `ConnectionCheckedIn` - Track when connections are borrowed/returned
- `ConnectionCheckOutFailed` - **Critical alert signal** - indicates pool exhaustion

**Tip:** Send `ConnectionCheckOutFailed` events and rapid `ConnectionCreated` events to your monitoring system immediately.

Access methods vary by driver. Consult your driver's [documentation](https://www.mongodb.com/docs/drivers/?utm_source=agent-skills) for how to subscribe to these standard events.

---

### Driver-Level Metrics to Watch

#### Connections Created

**What it is**: The total number of connections the pool has established since initialization.

**Events**: 
- `ConnectionCreatedEvent` - fired when a new connection object is instantiated.

**What to watch for**: Rapid increases (+100 connections/hour in steady state) indicate connection churn due to network issues or misconfiguration.

**Healthy pattern**: Gradual increase during application startup as the pool warms up, then relatively stable. You should see increases mainly when:
- Application restarts
- Pool size is increased
- Network disruptions force reconnections

**Troubleshooting**:
- **Rapid growth**: Indicates connection churn. Check:
  - `maxIdleTimeMS` is not too aggressive
  - Network stability
  - Application not creating new clients repeatedly
  - Serverless functions caching clients properly

---

#### Connections In-Use

**What it is**: The number of connections currently borrowed from the pool and serving application requests.

**Events**:
- `ConnectionCheckedOutEvent` - increment counter (connection borrowed)
- `ConnectionCheckedInEvent` - decrement counter (connection returned)

**What to watch for**: Consistently high values approaching `maxPoolSize` signal potential pool exhaustion.

**Healthy pattern**: Fluctuates with application traffic while maintaining headroom. Should correlate with request volume.

**Action thresholds**:
- **Sustained >80% of maxPoolSize**: Increase `maxPoolSize` by 20-30%
- **Consistently 100%**: Pool is definitely exhausted; immediate action needed
- **High percentage with high wait queue times**: Clear sign of undersized pool

---

#### Connections Available

**What it is**: The number of open but unused connections ready in the pool.

**Events**:
- `ConnectionCheckedInEvent` - increases available count
- `ConnectionCheckedOutEvent` - decreases available count

**What to watch for**: Consistently zero means the pool is undersized.

**Healthy pattern**: Some available connections (10-20% of `maxPoolSize`) ready to handle sudden traffic spikes without waiting for new connection establishment.

**Action thresholds**:
- **Always zero during traffic**: Pool is too small; connections are never released
- **Very low during normal load**: Consider increasing `maxPoolSize` or `minPoolSize`

---

#### Wait Queue Size

**What it is**: The number of operations currently waiting for an available connection because the pool is at capacity.

**Event**: 
- `ConnectionCheckoutStartedEvent` - track when threads enter wait queue.

**What to watch for**: Any value above zero indicates possible pool exhaustion. This is a critical metric.

**Healthy pattern**: Zero most of the time, or occasional spikes during peak loads.

**Action thresholds**:
- **Any sustained queue (>0 for >10 seconds)**: Immediate action required
- **Repeated queuing**: Increase `maxPoolSize` or reduce operation duration
- **Queue correlates with specific operations**: Those operations may be holding connections too long

**Why this matters**: If `waitQueueTimeoutMS` is reached, users see errors.

---

#### Wait Queue Time

**What it is**: The duration operations spend waiting for connections to become available.

**Events** – Calculate duration: `(checked out time) - (checkout started time)`
- `ConnectionCheckoutStartedEvent` - record timestamp when entering queue
- `ConnectionCheckedOutEvent` - record timestamp when successfully acquired

**What to watch for**: This wait time directly adds to application latency. Even moderate wait times (50-100ms) can degrade user experience.

**Healthy pattern**: Consistently near-zero milliseconds.

**Action thresholds**:
- **>50ms consistently**: Pool is under pressure; investigate sizing
- **>100ms**: Immediate action required; users experiencing degraded performance
- **Spikes to >waitQueueTimeoutMS**: Users seeing timeout errors

---

## Server-Level Metrics to Watch

Use `db.serverStatus().connections` via MongoDB shell or driver equivalent.

**Available fields**:
- `current` - Total active client connections
- `available` - Remaining capacity before hitting `maxIncomingConnections`
- `totalCreated` - Cumulative connections created since server start
- `active` - Connections currently executing operations
- `exhaustIsMaster` / `exhaustHello` - Streaming topology monitoring connections
- `awaitingTopologyChanges` - Connections waiting for topology updates

**See manual**: [db.serverStatus() documentation](https://www.mongodb.com/docs/manual/reference/command/serverStatus/?utm_source=agent-skills#connections)

### `connections.current`

**What it is**: The number of active client connections currently established to the MongoDB server.

**What to watch for**: Approaching `maxIncomingConnections` indicates server-side saturation.

**Default maxIncomingConnections values per OS**: 
- Windows: 1,000,000
- Linux/Unix: `(RLIMIT_NOFILE / 2) * 0.8` (MongoDB enforces this limit even if configured higher)

**Healthy pattern**: Stable value with headroom for growth. Should roughly match the sum of all client pool sizes across all application instances.

**Action thresholds**:
- **>90% of maxIncomingConnections**: Server at risk of refusing new connections
- **Unexpected spikes**: May indicate runaway connection creation from clients
- **Steady growth**: May need to scale server tier (Atlas) or adjust configuration (self-hosted)

**Calculation example**: If you have 10 application instances each with `maxPoolSize: 50`, you could have up to 500 connections in a single-server deployment. In a 3-member replica set, potentially 1,500 total connections across all members.

---

### `connections.available`

**What it is**: How many more connections the server can accept before hitting its configured limit.

**What to watch for**: Low values indicate risk of connection refusal for new clients or scaling operations.

**Healthy pattern**: Substantial headroom even during peak traffic. At least 20-30% of `maxIncomingConnections` should remain available.

**Action thresholds**:
- **<10% available**: High risk; urgent capacity planning needed
- **<5% available**: Critical; new client connections may be refused

---

### `connections.totalCreated`

**What it is**: The cumulative total of all connections created since the MongoDB server started.

**What to watch for**: The rate of increase indicates connection churn. Compare snapshots over time to calculate rate.

**Healthy pattern**: Increases mainly during:
- Application deployments/restarts
- Scaling events (adding new app instances)
- Legitimate traffic growth

**Diagnosis**:
- **Baseline calculation**: After initial warmup, calculate connections created per hour
- **Rapid increase** (much faster than app restart cadence): Indicates connection churn across one or more clients
- **Correlation with client metrics**: Cross-reference with driver-level total connections to identify which clients are churning

**Example**: If you see `totalCreated` increasing by 1,000 connections/hour but you only restart apps once per day (not serverless), something is causing unnecessary connection cycling.
