---
name: fabric-data-agent-create
description: "Step-by-step skill for creating a Microsoft Fabric Data Agent end-to-end — connect lakehouse, select tables, write instructions from semantic models, add validated few-shots, publish and test"
---

# Create Fabric Data Agent

Guide a user through creating a new Fabric Data Agent from scratch using MCP tools.

## Prerequisites

- Azure CLI authenticated (`az login`)
- Fabric workspace access (Contributor role)
- MCP server for Fabric Data Agents connected

## Steps

1. **Ask the user** for agent name and workspace
2. **Create** the agent using the MCP create tool
3. **List lakehouses** in the workspace — ask which to connect
4. **Connect datasource** — connects the lakehouse and discovers the schema
5. **List schemas and tables** — ask which tables to select
6. **Select tables** — use the safe GET→modify→PUT approach; verify selection shows non-zero table count
7. **Ask about knowledge base** — does the user have a semantic model, TMDL files, or SQL views in a Git repo?
   - If yes: fetch from Git, parse table definitions, column names, measures, and relationships
   - Use the knowledge to draft domain-specific instructions with exact column names and data types
8. **Show instructions to user** for approval before applying
9. **Generate few-shots** — create Q→SQL pairs from the domain knowledge
   - Query `INFORMATION_SCHEMA.COLUMNS` to validate column names
   - Run each SQL query against the database to confirm it executes
   - Only add validated queries as few-shots
10. **Publish** the agent
11. **Test** with a sample question — show the SQL and answer

## Key Rules

- Never invent column names — always discover from INFORMATION_SCHEMA
- Always validate SQL before adding as few-shots
- Ask, don't assume — require user input at steps 1, 3, 5, 7, and 11
- Print instructions and few-shots for user review before applying
- Verify table selection after every select operation
- Use `LOWER()` for case-insensitive string matching
- Default to last month when no date range is specified
