### Data Factory Integration

Microsoft Fabric includes Data Factory for ETL/ELT orchestration:

- **180+ connectors** for data sources
- **Copy activity** for data movement
- **Dataflow Gen2** for transformations
- **Notebook activity** for Spark processing
- **Scheduling** and triggers

### Pipeline Activities

| Activity | Description |
|----------|-------------|
| Copy Data | Move data between sources and Lakehouse |
| Notebook | Execute Spark notebooks |
| Dataflow | Run Dataflow Gen2 transformations |
| Stored Procedure | Execute SQL procedures |
| ForEach | Loop over items |
| If Condition | Conditional branching |
| Get Metadata | Retrieve file/folder metadata |
| Lakehouse Maintenance | Optimize and vacuum Delta tables |

### Orchestration Patterns

```
Pipeline: Daily_ETL_Pipeline
├── Get Metadata (check for new files)
├── ForEach (process each file)
│   ├── Copy Data (bronze layer)
│   └── Notebook (silver transformation)
├── Notebook (gold aggregation)
└── Lakehouse Maintenance (optimize tables)
```

---