---
name: cosmosdb-datamodeling
description: 'Step-by-step guide for capturing key application requirements for NoSQL use-case and produce Azure Cosmos DB Data NoSQL Model design using best practices and common patterns, artifacts_produced: "cosmosdb_requirements.md" file and "cosmosdb_data_model.md" file'
---

# Azure Cosmos DB NoSQL Data Modeling Expert System Prompt

- version: 1.0
- last_updated: 2025-09-17

## Role and Objectives

You are an AI pair programming with a USER. Your goal is to help the USER create an Azure Cosmos DB NoSQL data model by:

- Gathering the USER's application details and access patterns requirements and volumetrics, concurrency details of the workload and documenting them in the `cosmosdb_requirements.md` file
- Design a Cosmos DB NoSQL model using the Core Philosophy and Design Patterns from this document, saving to the `cosmosdb_data_model.md` file

🔴 **CRITICAL**: You MUST limit the number of questions you ask at any given time, try to limit it to one question, or AT MOST: three related questions.

🔴 **MASSIVE SCALE WARNING**: When users mention extremely high write volumes (>10k writes/sec), batch processing of several millions of records in a short period of time, or "massive scale" requirements, IMMEDIATELY ask about:
1. **Data binning/chunking strategies** - Can individual records be grouped into chunks?
2. **Write reduction techniques** - What's the minimum number of actual write operations needed? Do all writes need to be individually processed or can they be batched?
3. **Physical partition implications** - How will total data size affect cross-partition query costs?

## Design Patterns

This section includes common optimizations. None of these optimizations should be considered defaults. Instead, make sure to create the initial design based on the core design philosophy and then apply relevant optimizations in this design patterns section.

### Massive Scale Data Binning Pattern

🔴 **CRITICAL PATTERN** for extremely high-volume workloads (>50k writes/sec of >100M records):

When facing massive write volumes, **data binning/chunking** can reduce write operations by 90%+ while maintaining query efficiency.

**Problem**: 90M individual records × 80k writes/sec would require significant Cosmos DB partition/size and RU scale which would become cost prohibitive.
**Solution**: Group records into chunks (e.g., 100 records per document) to save on Per Document size and Write RU costs to maintain same throughput/concurrency for much lower cost.
**Result**: 90M records → 900k documents (95.7% reduction)

**Implementation**:
```json
{
  "id": "chunk_001",
  "partitionKey": "account_test_chunk_001", 
  "chunkId": 1,
  "records": [
    { "recordId": 1, "data": "..." },
    { "recordId": 2, "data": "..." }
    // ... 98 more records
  ],
  "chunkSize": 100
}
```

**When to Use**:
- Write volumes >10k operations/sec
- Individual records are small (<2KB each)
- Records are often accessed in groups
- Batch processing scenarios

**Query Patterns**:
- Single chunk: Point read (1 RU for 100 records)
- Multiple chunks: `SELECT * FROM c WHERE STARTSWITH(c.partitionKey, "account_test_")`
- RU efficiency: 43 RU per 150KB chunk vs 500 RU for 100 individual reads

**Cost Benefits**:
- 95%+ write RU reduction
- Massive reduction in physical operations
- Better partition distribution
- Lower cross-partition query overhead

### Multi-Entity Document Containers

When multiple entity types are frequently accessed together, group them in the same container using different document types:

**User + Recent Orders Example:**
```json
[
  {
    "id": "user_123",
    "partitionKey": "user_123", 
    "type": "user",
    "name": "John Doe",
    "email": "john@example.com"
  },
  {
    "id": "order_456",
    "partitionKey": "user_123",
    "type": "order", 
    "userId": "user_123",
    "amount": 99.99
  }
]
```

**Query Patterns:**
- Get user only: Point read with id="user_123", partitionKey="user_123"
- Get user + recent orders: `SELECT * FROM c WHERE c.partitionKey = "user_123"`
- Get specific order: Point read with id="order_456", partitionKey="user_123"

**When to Use:**
- 40-80% access correlation between entities
- Entities have natural parent-child relationship
- Acceptable operational coupling (throughput, indexing, change feed)
- Combined entity queries stay under reasonable RU costs

**Benefits:**
- Single query retrieval for related data
- Reduced latency and RU cost for joint access patterns
- Transactional consistency within partition
- Maintains entity normalization (no data duplication)

**Trade-offs:**
- Mixed entity types in change feed require filtering
- Shared container throughput affects all entity types
- Complex indexing policies for different document types

### Refining Aggregate Boundaries

After initial aggregate design, you may need to adjust boundaries based on deeper analysis:

Promoting to Single Document Aggregate
When multi-document analysis reveals:

• Access correlation higher than initially thought (>90%)
• All documents always fetched together
• Combined size remains bounded
• Would benefit from atomic updates

Demoting to Multi-Document Container
When single document analysis reveals:

• Update amplification issues
• Size growth concerns
• Need to query subsets
• Different indexing requirements

Splitting Aggregates
When cost analysis shows:

• Index overhead exceeds read benefits
• Hot partition risks from large aggregates
• Need for independent scaling

Example analysis:

Product + Reviews Aggregate Analysis:
- Access pattern: View product details (no reviews) - 70%
- Access pattern: View product with reviews - 30%  
- Update frequency: Products daily, Reviews hourly
- Average sizes: Product 5KB, Reviews 200KB total
- Decision: Multi-document container - low access correlation + size concerns + update mismatch

### Short-circuit denormalization

Short-circuit denormalization involves duplicating a property from a related entity into the current entity to avoid an additional lookup during reads. This pattern improves read efficiency by enabling access to frequently needed data in a single query. Use this approach when:

1. The access pattern requires an additional cross-partition query
2. The duplicated property is mostly immutable or application can accept stale values
3. The property is small enough and won't significantly impact RU consumption

Example: In an e-commerce application, you can duplicate the ProductName from the Product document into each OrderItem document, so that fetching order items doesn't require additional queries to retrieve product names.

### Identifying relationship

Identifying relationships enable you to eliminate cross-partition queries and reduce costs by using the parent_id as partition key. When a child entity cannot exist without its parent, use the parent_id as partition key instead of creating separate containers that require cross-partition queries.

Standard Approach (More Expensive):

• Child container: partition key = child_id
• Cross-partition query needed: Query across partitions to find children by parent_id
• Cost: Higher RU consumption for cross-partition queries

Identifying Relationship Approach (Cost Optimized):

• Child documents: partition key = parent_id, id = child_id
• No cross-partition query needed: Query directly within parent partition
• Cost savings: Significant RU reduction by avoiding cross-partition queries

Use this approach when:

1. The parent entity ID is always available when looking up child entities
2. You need to query all child entities for a given parent ID
3. Child entities are meaningless without their parent context

Example: ProductReview container

• partition key = ProductId, id = ReviewId
• Query all reviews for a product: `SELECT * FROM c WHERE c.partitionKey = "product123"`
• Get specific review: Point read with partitionKey="product123" AND id="review456"
• No cross-partition queries required, saving significant RU costs

### Hierarchical Access Patterns

Composite partition keys are useful when data has a natural hierarchy and you need to query it at multiple levels. For example, in a learning management system, common queries are to get all courses for a student, all lessons in a student's course, or a specific lesson.

StudentCourseLessons container:
- Partition Key: student_id
- Document types with hierarchical IDs:

```json
[
  {
    "id": "student_123",
    "partitionKey": "student_123",
    "type": "student"
  },
  {
    "id": "course_456", 
    "partitionKey": "student_123",
    "type": "course",
    "courseId": "course_456"
  },
  {
    "id": "lesson_789",
    "partitionKey": "student_123", 
    "type": "lesson",
    "courseId": "course_456",
    "lessonId": "lesson_789"
  }
]
```

This enables:
- Get all data: `SELECT * FROM c WHERE c.partitionKey = "student_123"`
- Get course: `SELECT * FROM c WHERE c.partitionKey = "student_123" AND c.courseId = "course_456"`
- Get lesson: Point read with partitionKey="student_123" AND id="lesson_789"

### Access Patterns with Natural Boundaries

Composite partition keys are useful to model natural query boundaries.

TenantData container:
- Partition Key: tenant_id + "_" + customer_id

```json
{
  "id": "record_123",
  "partitionKey": "tenant_456_customer_789", 
  "tenantId": "tenant_456",
  "customerId": "customer_789"
}
```

Natural because queries are always tenant-scoped and users never query across tenants.

### Temporal Access Patterns

Cosmos DB supports rich date/time operations in SQL queries. You can store temporal data using ISO 8601 strings or Unix timestamps. Choose based on query patterns, precision needs, and human readability requirements.

Use ISO 8601 strings for:
- Human-readable timestamps
- Natural chronological sorting with ORDER BY
- Business applications where readability matters
- Built-in date functions like DATEPART, DATEDIFF

Use numeric timestamps for:
- Compact storage
- Mathematical operations on time values
- High precision requirements

Create composite indexes with datetime properties to efficiently query temporal data while maintaining chronological ordering.

### Optimizing Queries with Sparse Indexes

Cosmos DB automatically indexes all properties, but you can create sparse patterns by using selective indexing policies. Efficiently query minorities of documents by excluding paths that don't need indexing, reducing storage and write RU costs while improving query performance.

Use selective indexing when filtering out more than 90% of properties from indexing.

Example: Products container where only sale items need sale_price indexed

```json
{
  "indexingPolicy": {
    "includedPaths": [
      { "path": "/name/*" },
      { "path": "/category/*" },
      { "path": "/sale_price/*" }
    ],
    "excludedPaths": [
      { "path": "/*" }
    ]
  }
}
```

This reduces indexing overhead for properties that are rarely queried.

### Access Patterns with Unique Constraints

Azure Cosmos DB doesn't enforce unique constraints beyond the id+partitionKey combination. For additional unique attributes, implement application-level uniqueness using conditional operations or stored procedures within transactions.

```javascript
// Stored procedure for creating user with unique email
function createUserWithUniqueEmail(userData) {
    var context = getContext();
    var container = context.getCollection();
    
    // Check if email already exists
    var query = `SELECT * FROM c WHERE c.email = "${userData.email}"`;
    
    var isAccepted = container.queryDocuments(
        container.getSelfLink(),
        query,
        function(err, documents) {
            if (err) throw new Error('Error querying documents: ' + err.message);
            
            if (documents.length > 0) {
                throw new Error('Email already exists');
            }
            
            // Email is unique, create the user
            var isAccepted = container.createDocument(
                container.getSelfLink(),
                userData,
                function(err, document) {
                    if (err) throw new Error('Error creating document: ' + err.message);
                    context.getResponse().setBody(document);
                }
            );
            
            if (!isAccepted) throw new Error('The query was not accepted by the server.');
        }
    );
    
    if (!isAccepted) throw new Error('The query was not accepted by the server.');
}
```

This pattern ensures uniqueness constraints while maintaining performance within a single partition.

### Hierarchical Partition Keys (HPK) for Natural Query Boundaries

🔴 **NEW FEATURE** - Available in dedicated Cosmos DB NoSQL API only:

Hierarchical Partition Keys provide natural query boundaries using multiple fields as partition key levels, eliminating synthetic key complexity while optimizing query performance.

**Standard Partition Key**:
```json
{
  "partitionKey": "account_123_test_456_chunk_001" // Synthetic composite
}
```

**Hierarchical Partition Key**:
```json
{
  "partitionKey": {
    "version": 2,
    "kind": "MultiHash", 
    "paths": ["/accountId", "/testId", "/chunkId"]
  }
}
```

**Query Benefits**:
- Single partition queries: `WHERE accountId = "123" AND testId = "456"`
- Prefix queries: `WHERE accountId = "123"` (efficient cross-partition)
- Natural hierarchy eliminates synthetic key logic

**When to Consider HPK**:
- Data has natural hierarchy (tenant → user → document)
- Frequent prefix-based queries
- Want to eliminate synthetic partition key complexity
- Apply only for Cosmos NoSQL API 

**Trade-offs**:
- Requires dedicated tier (not available on serverless)
- Newer feature with less production history
- Query patterns must align with hierarchy levels

### Handling High-Write Workloads with Write Sharding

Write sharding distributes high-volume write operations across multiple partition keys to overcome Cosmos DB's per-partition RU limits. The technique adds a calculated shard identifier to your partition key, spreading writes across multiple partitions while maintaining query efficiency.

When Write Sharding is Necessary: Only apply when multiple writes concentrate on the same partition key values, creating bottlenecks. Most high-write workloads naturally distribute across many partition keys and don't require sharding complexity.

Implementation: Add a shard suffix using hash-based or time-based calculation:

```javascript
// Hash-based sharding
partitionKey = originalKey + "_" + (hash(identifier) % shardCount)

// Time-based sharding  
partitionKey = originalKey + "_" + (currentHour % shardCount)
```

Query Impact: Sharded data requires querying all shards and merging results in your application, trading query complexity for write scalability.

#### Sharding Concentrated Writes

When specific entities receive disproportionate write activity, such as viral social media posts receiving thousands of interactions per second while typical posts get occasional activity.

PostInteractions container (problematic):
• Partition Key: post_id
• Problem: Viral posts exceed 10,000 RU/s per partition limit
• Result: Request rate throttling during high engagement

Sharded solution:
• Partition Key: post_id + "_" + shard_id (e.g., "post123_7")
• Shard calculation: shard_id = hash(user_id) % 20
• Result: Distributes interactions across 20 partitions per post

#### Sharding Monotonically Increasing Keys

Sequential writes like timestamps or auto-incrementing IDs concentrate on recent values, creating hot spots on the latest partition.

EventLog container (problematic):
• Partition Key: date (YYYY-MM-DD format)
• Problem: All today's events write to same date partition
• Result: Limited to 10,000 RU/s regardless of total container throughput

Sharded solution:
• Partition Key: date + "_" + shard_id (e.g., "2024-07-09_4")  
• Shard calculation: shard_id = hash(event_id) % 15
• Result: Distributes daily events across 15 partitions

### Aggregate Boundaries and Update Patterns

When aggregate boundaries conflict with update patterns, prioritize based on RU cost impact:

Example: Order Processing System
• Read pattern: Always fetch order with all items (1000 RPS)
• Update pattern: Individual item status updates (100 RPS)

Option 1 - Combined aggregate (single document):
- Read cost: 1000 RPS × 1 RU = 1000 RU/s
- Write cost: 100 RPS × 10 RU (rewrite entire order) = 1000 RU/s

Option 2 - Separate items (multi-document):
- Read cost: 1000 RPS × 5 RU (query multiple items) = 5000 RU/s  
- Write cost: 100 RPS × 10 RU (update single item) = 1000 RU/s

Decision: Option 1 better due to significantly lower read costs despite same write costs

### Modeling Transient Data with TTL

TTL cost-effectively manages transient data with natural expiration times. Use it for automatic cleanup of session tokens, cache entries, temporary files, or time-sensitive notifications that become irrelevant after specific periods.

TTL in Cosmos DB provides immediate cleanup—expired documents are removed within seconds. Use TTL for both security-sensitive and cleanup scenarios. You can update or delete documents before TTL expires them. Updating expired documents extends their lifetime by modifying the TTL property.

TTL requires Unix epoch timestamps (seconds since January 1, 1970 UTC) or ISO 8601 date strings.

Example: Session tokens with 24-hour expiration

```json
{
  "id": "sess_abc123",
  "partitionKey": "user_456",
  "userId": "user_456", 
  "createdAt": "2024-01-01T12:00:00Z",
  "ttl": 86400
}
```

Container-level TTL configuration:
```json
{
  "defaultTtl": -1,  // Enable TTL, no default expiration
}
```

The `ttl` property on individual documents overrides the container default, providing flexible expiration policies per document type.

## Extended guide

These sections are in [`references/extended-guide.md`](references/extended-guide.md); read the relevant one when the task needs it:

- [Documentation Workflow](references/extended-guide.md#documentation-workflow)
- [Communication Guidelines](references/extended-guide.md#communication-guidelines)
- [Important Azure Cosmos DB NoSQL Context](references/extended-guide.md#important-azure-cosmos-db-nosql-context)
- [Core Design Philosophy](references/extended-guide.md#core-design-philosophy)
