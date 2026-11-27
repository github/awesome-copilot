# Connection Configuration Reference

**Official examples repo**: https://github.com/mongodb/ASP_example — check quickstarts, example processors, and Terraform examples. Start with quickstarts.

## Connection Capabilities — Source/Sink Reference

Know what each connection type can do before creating pipelines:

| Connection Type | As Source ($source) | As Sink ($merge / $emit) | Mid-Pipeline | Notes |
|-----------------|---------------------|--------------------------|--------------|-------|
| **Cluster** | ✅ Change streams | ✅ $merge to collections | ✅ $lookup | Change streams monitor insert/update/delete/replace operations |
| **Kafka** | ✅ Topic consumer | ✅ $emit to topics | ❌ | Source MUST include `topic` field |
| **Sample Stream** | ✅ Sample data | ❌ Not valid | ❌ | Testing/demo only |
| **S3** | ❌ Not valid | ✅ $emit to buckets; `$iceberg` (SP10+) | ❌ | Sink only - use `path` and `config.outputFormat` (no top-level `format`); `compression` under `config` |
| **Https** | ❌ Not valid | ✅ $https as sink | ✅ $https enrichment | Can be used mid-pipeline for enrichment OR as final sink stage |
| **AWSLambda** | ❌ Not valid | ✅ $externalFunction (async only) | ✅ $externalFunction (sync or async) | **Sink:** `execution: "async"` required. **Mid-pipeline:** `execution: "sync"` or `"async"` |
| **AWS Kinesis** | ✅ Stream consumer | ✅ $emit to streams | ❌ | Similar to Kafka pattern |
| **SchemaRegistry** | ❌ Not valid | ❌ Not valid | ✅ Schema resolution | **Metadata only** - used by Kafka connections for Avro schemas |
| **AzureBlobStorage** | ❌ Not valid | ✅ $emit to containers; `$iceberg` (SP10+) | ❌ | Sink only - use `container` and `path`; private networking uses `publicPrivateNetworking` |
| **DataCatalog** | ❌ Not valid | ❌ Not valid | ❌ | **Metadata only** - Unity or Horizon Iceberg catalog referenced by `$iceberg.catalog.connectionName` |

**Common connection usage mistakes to avoid:**
- ❌ Using HTTPS connections as `$source` → HTTPS is for enrichment or sink only
- ❌ Using `$externalFunction` as sink with `execution: "sync"` → Must use `execution: "async"` for sink stage
- ❌ Forgetting change streams exist → Atlas Cluster is a powerful source, not just a sink
- ❌ Using `$merge` with Kafka → Use `$emit` for Kafka sinks

**$externalFunction execution modes:**
- **Mid-pipeline:** Can use `execution: "sync"` (blocks until Lambda returns) or `execution: "async"` (non-blocking)
- **Final sink stage:** MUST use `execution: "async"` only

## Connection Naming Best Practices

**CRITICAL**: Connection names should clearly indicate their actual targets to avoid confusion and prevent writing data to wrong destinations.

### Good Naming Patterns

**Match the actual target name:**
- Cluster connection to "ClusterRestoreTest" → name it `cluster-restore-test` or `ClusterRestoreTest`
- Cluster connection to "AtlasCluster" → name it `atlas-cluster` or `AtlasCluster`

**Use descriptive names with context:**
- `prod-kafka-orders` (indicates environment + service + purpose)
- `dev-atlas-main` (indicates environment + service + designation)
- `staging-s3-exports` (indicates environment + service + purpose)

### Bad Naming Patterns (AVOID)

❌ **Generic names that don't match targets:**
- Connection "atlascluster" pointing to "ClusterRestoreTest" ← CONFUSING!
- Connection "kafka" pointing to multiple different topics ← NOT SPECIFIC!

❌ **Reusing names across workspaces without context:**
- "myconnection" in workspace A and workspace B with different targets

❌ **Names that don't indicate connection type:**
- "connection1", "test", "temp" ← NO CONTEXT!

### Verification Workflow

**Before creating processors**, always inspect your connections to verify they point where you expect:
```
1. atlas-streams-discover → action: "list-connections"
2. atlas-streams-discover → action: "inspect-connection" for each
3. Verify connection name matches actual target (clusterName, bootstrapServers, url, etc.)
4. If mismatch exists, consider renaming or warn the user
```

See [development-workflow.md](development-workflow.md) "Pre-Deployment Connection Validation" section for the complete validation procedure.

## Important Notes
- HTTPS connections are for `$https` enrichment ONLY — they are NOT valid as `$source` data sources
- Store API authentication in connection settings, never hardcode in processor pipelines
- AWS connections (S3, Kinesis, Lambda) require IAM role ARN registered via Atlas Cloud Provider Access first
- Supported `connectionType` values: `Kafka`, `Cluster`, `S3`, `Https`, `AWSKinesisDataStreams`, `AWSLambda`, `SchemaRegistry`, `DataCatalog`, `AzureBlobStorage`, `Sample`

## AWS Cloud Provider Access Prerequisites

**For S3, Kinesis, and Lambda connections:**

AWS connections (S3, Kinesis, Lambda) require that the IAM role ARN be **registered in the Atlas project via Cloud Provider Access** before creating the connection. This is a prerequisite — the connection creation will fail without it.

**Always mention this prerequisite** in your response when the user wants to create AWS connections, even if the user says connections already exist. Confirm with language like:
- "IAM role ARNs are registered via Atlas Cloud Provider Access"
- "Ensure IAM role ARNs are registered via Atlas Cloud Provider Access before creating connections"

**Security best practice:** Use a dedicated IAM role per processor (or group of related processors) with least-privilege permissions scoped only to the specific S3 buckets, Kinesis streams, or Lambda functions that processor needs. Avoid sharing broad-access roles across unrelated processors.

## Region Mapping Reference

The `region` field for workspace creation uses Atlas-specific names that differ by cloud provider. Using the wrong format returns a cryptic `dataProcessRegion` error.

| Provider | Cloud Region | Streams `region` Value |
|----------|-------------|----------------------|
| **AWS** | us-east-1 | `VIRGINIA_USA` |
| **AWS** | us-east-2 | `OHIO_USA` |
| **AWS** | us-west-2 | `OREGON_USA` |
| **AWS** | ca-central-1 | `MONTREAL_CAN` |
| **AWS** | sa-east-1 | `SAOPAULO_BRA` |
| **AWS** | eu-west-1 | `DUBLIN_IRL` |
| **AWS** | ap-southeast-1 | `SINGAPORE_SGP` |
| **AWS** | ap-south-1 | `MUMBAI_IND` |
| **AWS** | ap-northeast-1 | `TOKYO_JPN` |
| **GCP** | us-central1 | `US_CENTRAL1` |
| **GCP** | europe-west1 | `EUROPE_WEST1` |
| **GCP** | us-east4 | `US_EAST4` |
| **Azure** | eastus | `eastus` |
| **Azure** | eastus2 | `eastus2` |
| **Azure** | westus | `westus` |
| **Azure** | westeurope | `westeurope` |

This is a partial list. If unsure, inspect an existing workspace with `atlas-streams-discover` → `inspect-workspace` and check `dataProcessRegion.region`.

## MCP Tool Behaviors for Connections

**Elicitation:** When required fields are missing, the build tool auto-prompts for them via an interactive form (MCP elicitation protocol). Do NOT manually ask the user for passwords or bootstrap servers — let the tool collect them.

**Auto-normalization:**
- `bootstrapServers` passed as array → auto-converted to comma-separated string
- `schemaRegistryUrls` passed as string → auto-wrapped in array
- Cluster `dbRoleToExecute` → auto-defaults to `{role: "readWriteAnyDatabase", type: "BUILT_IN"}` if omitted

## connectionConfig by type

### Kafka
```json
{
  "bootstrapServers": "broker1:9092,broker2:9092",
  "authentication": {
    "mechanism": "SCRAM-256",
    "username": "my-user",
    "password": "my-password"
  },
  "security": {
    "protocol": "SASL_SSL"
  }
}
```
**Important:** `bootstrapServers` is a **comma-separated string**, not an array.

All fields above are required. The tool will prompt the user for username/password via elicitation if not provided.

Authentication mechanisms: `PLAIN`, `SCRAM-256`, `SCRAM-512`, `OAUTHBEARER`
Security protocols: `SASL_SSL`, `SASL_PLAINTEXT`, `SSL`

For Confluent Cloud, use `mechanism: "PLAIN"` with your API key as `username` and API secret as `password`.

Kafka supports both **PrivateLink** and **VPC Peering** for private networking. See the [PrivateLink Reference](#privatelink-reference-all-vendors) section below for all supported vendors and providers.

**VPC Peering:**
- Supported for outbound connections to Kafka brokers in your own VPC
- Requires `SASL_SSL` security protocol
- Use `atlas-streams-manage` with `accept-peering` action to complete the peering setup
- Requires AWS account ID, VPC ID, and region information

**Important: Networking cannot be modified after connection creation.** To add or change PrivateLink/VPC peering on an existing Kafka connection, you must delete it and recreate it with the networking config.

Use `atlas-streams-discover` → `action: "get-networking"` to list available PrivateLink endpoints and VPC peering connections.

### Cluster (Atlas)
```json
{
  "clusterName": "my-atlas-cluster",
  "dbRoleToExecute": {
    "role": "readWriteAnyDatabase",
    "type": "BUILT_IN"
  }
}
```
`clusterName` is **required** — must be a cluster in the same project (use `atlas-list-clusters` to verify).

`dbRoleToExecute` defaults to `{role: "readWriteAnyDatabase", type: "BUILT_IN"}` if not provided.

Optional: `clusterGroupId` (if cluster is in a different project — requires cross-project access to be enabled at the org level).

### S3
```json
{
  "aws": {
    "roleArn": "arn:aws:iam::123456789:role/streams-s3-role",
    "testBucket": "my-test-bucket"
  }
}
```
**Prerequisite:** The IAM role ARN must be registered in the Atlas project via Cloud Provider Access before creating the connection.

Required IAM policy permissions: `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`.

### AzureBlobStorage
```json
{
  "azure": {
    "servicePrincipalId": "<service-principal-id>",
    "storageAccountName": "mystorageaccount"
  }
}
```
- `servicePrincipalId` is the ID of an Azure service principal that **must already be registered in the project via Atlas Cloud Provider Access** and have access to the storage account (for `$iceberg`, Storage Blob Data Contributor on the container). The connection does not create or register it.
- `storageAccountName` is 3-24 letters and numbers only; mixed case is lowercased automatically.
- Sink only. Use it as the storage connection for `$emit` (`container`, `path`) or `$iceberg` (see [pipeline-patterns.md](pipeline-patterns.md#iceberg-to-s3-or-azure-blob)).
- Private networking goes in `connectionConfig.publicPrivateNetworking`, not `networking`.

### Https
```json
{
  "url": "https://api.example.com/webhook",
  "headers": {
    "Authorization": "Bearer token123"
  }
}
```
**IMPORTANT:** HTTPS connections are for `$https` enrichment stages ONLY. They are NOT valid data sources — do not use them in `$source`.

Store all API authentication in the connection config headers, not in the processor pipeline.

#### HTTPS Auth Patterns

**API Key:**
```json
{"url": "https://api.example.com", "headers": {"X-API-Key": "your-api-key"}}
```

**Bearer Token:**
```json
{"url": "https://api.example.com", "headers": {"Authorization": "Bearer your-token"}}
```

**Basic Auth:**
```json
{"url": "https://api.example.com", "headers": {"Authorization": "Basic base64-encoded-credentials"}}
```

**OAuth 2.0 (pre-obtained token):**
```json
{"url": "https://api.example.com", "headers": {"Authorization": "Bearer oauth-access-token"}}
```

### AWSKinesisDataStreams
```json
{
  "aws": {
    "roleArn": "arn:aws:iam::123456789:role/streams-kinesis-role"
  }
}
```
**Prerequisite:** The IAM role ARN must be registered in the Atlas project via Cloud Provider Access before creating the connection.

Required IAM policy permissions: `kinesis:ListShards`, `kinesis:SubscribeToShard`, `kinesis:PutRecords`, `kinesis:DescribeStreamSummary`.

### AWSLambda
```json
{
  "aws": {
    "roleArn": "arn:aws:iam::123456789:role/streams-lambda-role"
  }
}
```
**Prerequisite:** The IAM role ARN must be registered in the Atlas project via Cloud Provider Access before creating the connection.

### SchemaRegistry
```json
{
  "connectionType": "SchemaRegistry",
  "connectionConfig": {
    "schemaRegistryUrls": ["https://schema-registry.example.com"],
    "schemaRegistryAuthentication": {
      "type": "USER_INFO",
      "username": "...",
      "password": "..."
    }
  }
}
```
- `connectionType` MUST be `"SchemaRegistry"` (not `"Kafka"` or `"Https"`)
- `schemaRegistryUrls` is an **array** (not a string). The tool auto-wraps a string into an array if needed.
- `schemaRegistryAuthentication.type`: `"USER_INFO"` (explicit credentials) or `"SASL_INHERIT"` (inherit from Kafka connection)
- Tool elicitation will collect sensitive fields (password) — don't ask the user for these directly

### DataCatalog
Iceberg catalog connection for `$iceberg` sinks. Pick one provider and supply only its settings block.

**Databricks Unity:**
```json
{
  "connectionType": "DataCatalog",
  "connectionConfig": {
    "catalogProvider": "DATABRICKS_UNITY",
    "catalogUrl": "https://my-workspace.cloud.databricks.com",
    "databricks": {
      "authentication": {"clientId": "...", "clientSecret": "..."}
    }
  }
}
```

**Snowflake Horizon:**
```json
{
  "connectionType": "DataCatalog",
  "connectionConfig": {
    "catalogProvider": "SNOWFLAKE_HORIZON",
    "catalogUrl": "https://myaccount.snowflakecomputing.com",
    "snowflake": {
      "authentication": {"account": "...", "user": "...", "role": "...", "privateKey": "<unencrypted-PKCS8-PEM-private-key>"}
    }
  }
}
```
- `connectionType` MUST be `"DataCatalog"`; `catalogProvider` is required and cannot be changed after creation
- `catalogUrl` is the HTTPS **base URL only** — no REST path, query, fragment, or credentials. Host must end in `.cloud.databricks.com` or `.azuredatabricks.net` (Unity), or `.snowflakecomputing.com` (Horizon)
- Do not combine `databricks` and `snowflake` blocks
- Unity authenticates with a Databricks service principal (`clientId`/`clientSecret`). Horizon uses key-pair auth; `privateKey` must be an unencrypted PKCS#8 PEM starting `-----BEGIN PRIVATE KEY-----`
- Tool elicitation collects missing fields and secrets — don't ask the user for `clientSecret` or `privateKey` directly
- Secrets are never returned by Atlas or the tool. Never supply token credentials or call a private token endpoint
- A DataCatalog connection holds catalog credentials only. The `$iceberg` sink still needs a separate storage connection (S3 or Azure Blob) for `$iceberg.connectionName`
- Reference the connection from a processor via `$iceberg.catalog.connectionName` (see [pipeline-patterns.md](pipeline-patterns.md#iceberg-to-s3-or-azure-blob))

### Sample
No connectionConfig required. Provides built-in test data. Useful for development and testing without external infrastructure.

Available sample formats: `sample_stream_solar` (default, auto-created when `includeSampleData: true` on workspace), `samplestock`, `sampleweather`, `sampleiot`, `samplelog`, `samplecommerce`.

### PrivateLink Reference (All Vendors)

PrivateLink is supported for Kafka, S3, Kinesis, and Azure EventHub connections. Create a project-level PrivateLink first, then reference it in the connection's `networking.access` config.

**Step 1: Create project-level PrivateLink** via `atlas-streams-build` resource='privatelink':

| Provider | Vendor | Required privateLinkConfig fields |
|----------|--------|----------------------------------|
| AWS | CONFLUENT | provider, vendor, dnsDomain, dnsSubDomain (array, [] if none) |
| AWS | MSK | provider, vendor, arn |
| AWS | S3 | provider, vendor, region, serviceEndpointId (`com.amazonaws.<region>.s3`) |
| AWS | KINESIS | provider, vendor, region, serviceEndpointId |
| AZURE | EVENTHUB | provider, vendor, dnsDomain, serviceEndpointId |
| AZURE | CONFLUENT | provider, vendor, dnsDomain |
| GCP | CONFLUENT | provider, vendor, gcpServiceAttachmentUris |

**Step 2: Reference in connection networking config:**
```json
{
  "networking": {
    "access": {
      "type": "PRIVATE_LINK",
      "connectionId": "<PrivateLink _id from Step 1>"
    }
  }
}
```

Use `atlas-streams-discover` action='get-networking' to find the PrivateLink `_id`.

**Note:** Networking config cannot be modified after connection creation — delete and recreate to change.
