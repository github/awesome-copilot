# Copilot Studio — Billing Rates & Estimation

> Source: [Billing rates and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
> Estimator: [Microsoft agent usage estimator](https://microsoft.github.io/copilot-studio-estimator/)
> Licensing Guide: [Copilot Studio Licensing Guide](https://go.microsoft.com/fwlink/?linkid=2320995)

## Copilot Credit Rate

**1 Copilot Credit = $0.01 USD**

## Billing Rates (cached snapshot — last updated March 2026)

**IMPORTANT: Always prefer fetching live rates from the source URLs below. Use this table only as a fallback if web fetch is unavailable.**

| Feature | Rate | Unit |
|---|---|---|
| Classic answer | 1 | per response |
| Generative answer | 2 | per response |
| Agent action | 5 | per action (triggers, deep reasoning, topic transitions, computer use) |
| Tenant graph grounding | 10 | per message |
| Agent flow actions | 13 | per 100 flow actions |
| Text & gen AI tools (basic) | 1 | per 10 responses |
| Text & gen AI tools (standard) | 15 | per 10 responses |
| Text & gen AI tools (premium) | 100 | per 10 responses |
| Content processing tools | 8 | per page |

### Notes

- **Classic answers**: Predefined, manually authored responses. Static — don't change unless updated by the maker.
- **Generative answers**: Dynamically generated using AI models (GPTs). Adapt based on context and knowledge sources.
- **Tenant graph grounding**: RAG over tenant-wide Microsoft Graph, including external data via connectors. Optional per agent.
- **Agent actions**: Steps like triggers, deep reasoning, topic transitions visible in the activity map. Includes Computer-Using Agents.
- **Text & gen AI tools**: Prompt tools embedded in agents. Three tiers (basic/standard/premium) based on the underlying language model.
- **Agent flow actions**: Predefined flow action sequences executed without agent reasoning/orchestration at each step.

### Reasoning Model Billing

When using a reasoning-capable model:

```
Total cost = feature rate for operation + text & gen AI tools (premium) per 10 responses
```

Example: A generative answer using a reasoning model costs **2 credits** (generative answer) **+ 10 credits** (premium per response, prorated from 100/10).

## Estimation Formula

### Inputs

| Parameter | Description |
|---|---|
| `users` | Number of end users |
| `interactions_per_month` | Average interactions per user per month |
| `knowledge_pct` | % of responses from knowledge sources (0-100) |
| `tenant_graph_pct` | Of knowledge responses, % using tenant graph grounding (0-100) |
| `tool_prompt` | Average Prompt tool calls per session |
| `tool_agent_flow` | Average Agent flow calls per session |
| `tool_computer_use` | Average Computer use calls per session |
| `tool_custom_connector` | Average Custom connector calls per session |
| `tool_mcp` | Average MCP (Model Context Protocol) calls per session |
| `tool_rest_api` | Average REST API calls per session |
| `prompts_basic` | Average basic AI prompt uses per session |
| `prompts_standard` | Average standard AI prompt uses per session |
| `prompts_premium` | Average premium AI prompt uses per session |

### Calculation

```
total_sessions = users × interactions_per_month

── Knowledge Credits ──
tenant_graph_credits    = total_sessions × (knowledge_pct/100) × (tenant_graph_pct/100) × 10
generative_answer_credits = total_sessions × (knowledge_pct/100) × (1 - tenant_graph_pct/100) × 2
classic_answer_credits  = total_sessions × (1 - knowledge_pct/100) × 1

── Agent Tools Credits ──
tool_calls = total_sessions × (prompt + computer_use + custom_connector + mcp + rest_api)
tool_credits = tool_calls × 5

── Agent Flow Credits ──
flow_calls = total_sessions × tool_agent_flow
flow_credits = ceil(flow_calls / 100) × 13

── Prompt Modifier Credits ──
basic_credits    = ceil(total_sessions × prompts_basic / 10) × 1
standard_credits = ceil(total_sessions × prompts_standard / 10) × 15
premium_credits  = ceil(total_sessions × prompts_premium / 10) × 100

── Total ──
total_credits = knowledge + tools + flows + prompts
cost_usd = total_credits × 0.01
```

## Billing Examples (from Microsoft Docs)

### Customer Support Agent

- 4 classic answers + 2 generative answers per session
- 900 customers/day
- **Daily**: `[(4×1) + (2×2)] × 900 = 7,200 credits`
- **Monthly (30d)**: ~216,000 credits = **~$2,160**

### Sales Performance Agent (Tenant Graph Grounded)

- 4 generative answers + 4 tenant graph grounded responses per session
- 100 unlicensed users
- **Daily**: `[(4×2) + (4×10)] × 100 = 4,800 credits`
- **Monthly (30d)**: ~144,000 credits = **~$1,440**

### Order Processing Agent

- 4 action calls per trigger (autonomous)
- **Per trigger**: `4 × 5 = 20 credits`

## Employee vs Customer Agent Types

| Agent Type | Included with M365 Copilot? |
|---|---|
| Employee-facing (BtoE) | Classic answers, generative answers, and tenant graph grounding are included at zero cost when the user has a Microsoft 365 Copilot license |
| Customer/partner-facing | All usage is billed normally |

## Overage Enforcement

- Triggered at **125%** of prepaid capacity
- Custom agents are disabled (ongoing conversations continue)
- Email notification sent to tenant admin
- Resolution: reallocate capacity, purchase more, or enable pay-as-you-go

## Live Source URLs

For the latest rates, fetch content from these pages:

- [Billing rates and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
- [Copilot Studio licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing)
- [Copilot Studio Licensing Guide (PDF)](https://go.microsoft.com/fwlink/?linkid=2320995)
