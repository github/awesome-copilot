# Cost Estimator Reference

Formulas and patterns for converting Azure unit prices into monthly and annual cost estimates.

## Standard Time-Based Calculations

### Hours per Month

Azure uses **730 hours/month** as the standard billing period (365 days × 24 hours / 12 months).

```
Monthly Cost = Unit Price per Hour × 730
Annual Cost  = Monthly Cost × 12
```

### Common Multipliers

| Period | Hours | Calculation |
|--------|-------|-------------|
| 1 Hour | 1 | Unit price |
| 1 Day | 24 | Unit price × 24 |
| 1 Week | 168 | Unit price × 168 |
| 1 Month | 730 | Unit price × 730 |
| 1 Year | 8,760 | Unit price × 8,760 |

## Service-Specific Formulas

### Virtual Machines (Compute)

```
Monthly Cost = hourly price × 730
```

For VMs that run only business hours (8h/day, 22 days/month):
```
Monthly Cost = hourly price × 176
```

### Azure Functions

```
Execution Cost = price per execution × number of executions
Compute Cost   = price per GB-s × (memory in GB × execution time in seconds × number of executions)
Total Monthly  = Execution Cost + Compute Cost
```

Free grant: 1M executions and 400,000 GB-s per month.

### Azure Blob Storage

```
Storage Cost   = price per GB × storage in GB
Transaction Cost = price per 10,000 ops × (operations / 10,000)
Egress Cost    = price per GB × egress in GB
Total Monthly  = Storage Cost + Transaction Cost + Egress Cost
```

### Azure Cosmos DB

#### Provisioned Throughput
```
Monthly Cost = (RU/s / 100) × price per 100 RU/s × 730
```

#### Serverless
```
Monthly Cost = (total RUs consumed / 1,000,000) × price per 1M RUs
```

### Azure SQL Database

#### DTU Model
```
Monthly Cost = price per DTU × DTUs × 730
```

#### vCore Model
```
Monthly Cost = vCore price × vCores × 730  +  storage price per GB × storage GB
```

### Azure Kubernetes Service (AKS)

```
Monthly Cost = node VM price × 730 × number of nodes
```

Control plane is free for standard tier.

### Azure App Service

```
Monthly Cost = plan price × 730 (for hourly-priced plans)
```

Or flat monthly price for fixed-tier plans.

### Azure OpenAI

```
Monthly Cost = (input tokens / 1000) × input price per 1K tokens
             + (output tokens / 1000) × output price per 1K tokens
```

## Reservation vs. Pay-As-You-Go Comparison

When presenting pricing options, always show the comparison:

```
| Pricing Model | Monthly Cost | Annual Cost | Savings vs. PAYG |
|---------------|-------------|-------------|------------------|
| Pay-As-You-Go | $X | $Y | — |
| 1-Year Reserved | $A | $B | Z% |
| 3-Year Reserved | $C | $D | W% |
| Savings Plan (1yr) | $E | $F | V% |
| Savings Plan (3yr) | $G | $H | U% |
| Spot (if available) | $I | N/A | T% |
```

Savings percentage formula:
```
Savings % = ((PAYG Price - Reserved Price) / PAYG Price) × 100
```

## Cost Summary Table Template

Always present results in this format:

```markdown
| Service | SKU | Region | Unit Price | Unit | Monthly Est. | Annual Est. |
|---------|-----|--------|-----------|------|-------------|-------------|
| Virtual Machines | Standard_D4s_v5 | East US | $0.192/hr | 1 Hour | $140.16 | $1,681.92 |
```

## Tips

- Always clarify the **usage pattern** before estimating (24/7 vs. business hours vs. sporadic).
- For **storage**, ask about expected data volume and access patterns.
- For **databases**, ask about throughput requirements (RU/s, DTUs, or vCores).
- For **serverless** services, ask about expected invocation count and duration.
- Round to 2 decimal places for display.
- Note that prices are in **USD** unless otherwise specified.
