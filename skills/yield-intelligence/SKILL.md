---
name: yield-intelligence
description: Passive income portfolio analysis — activate when the user asks about dividend yields, Treasury rates, REIT income, monthly passive income goals, or portfolio yield optimization. Scans 4 asset classes (Treasuries, dividend ETFs, REITs, preferred stocks), ranks by risk-adjusted return, and builds an allocation targeting a specific monthly income goal.
license: MIT
compatibility: Cross-platform. No external tools required for the standalone workflow. Optional MCP server at https://api.intuitek.ai/yield/mcp provides live rate data (x402 micropayment, $1 USDC per call).
argument-hint: "Optional: target monthly income and capital, e.g. \"$500/month from $100k\", plus risk tolerance (conservative/moderate/aggressive) and account type (taxable/Roth IRA/traditional IRA)"
---

# Yield Intelligence

Passive income analysis across US Treasuries, dividend ETFs, REITs, and preferred stocks. Given a target monthly income and investment amount, produces a ranked opportunity table and optimal allocation.

## When to Use

- "I want to generate $X/month in passive income"
- "What are the best dividend ETFs or Treasury rates right now?"
- "Compare REITs vs Treasuries for income generation"
- "How much capital do I need to retire on dividends?"
- "Build me a conservative income portfolio"
- "Which pays more — Treasuries or REITs right now?"

## Step 1 — Gather Parameters

Ask if not provided:
- **Target monthly income** (e.g., $500/month)
- **Available capital** (e.g., $100,000)
- **Risk tolerance**: conservative / moderate / aggressive
- **Account type**: taxable / Roth IRA / traditional IRA

## Step 2 — Asset Class Scan

Research or use current knowledge to estimate yields for these four classes:

| Asset Class | Benchmark Tickers | Typical Yield Range |
|---|---|---|
| US Treasuries | T-Bills (1-yr), T-Notes (5-yr, 10-yr), T-Bonds (30-yr) | 4.0–5.5% |
| Dividend ETFs | SCHD, VYM, JEPI, JEPQ | 3.5–10% |
| REITs | O (Realty Income), MAIN, STAG | 4–12% |
| Preferred Stocks | PFF, PFFD | 5–7% |

For each asset, calculate:
- **Annual yield %** (dividend/distribution rate)
- **Risk score** (1–5: 1=Treasury, 5=high-yield REIT)
- **Liquidity** (High/Medium/Low)
- **Tax efficiency** (Qualified dividends = favorable; REIT distributions = ordinary income)

## Step 3 — Ranked Opportunity Table

Present results as a markdown table sorted by risk-adjusted yield (yield ÷ risk score):

```markdown
| Rank | Asset | Ticker | Yield | Risk | Liquidity | Tax | Risk-Adj Yield |
|------|-------|--------|-------|------|-----------|-----|---------------|
| 1    | …     | …      | x.x%  | 2/5  | High      | QD  | x.x%          |
```

## Step 4 — Allocation Engine

Given the capital and monthly income target:

1. **Required annual income** = monthly target × 12
2. **Blended yield needed** = required annual income ÷ total capital
3. Build a 3-tier allocation matching the user's risk tolerance:

| Risk Profile | Tier 1 (Low Risk) | Tier 2 (Mid Risk) | Tier 3 (Growth Income) |
|---|---|---|---|
| Conservative | 60% Treasuries | 30% Dividend ETFs | 10% REITs |
| Moderate | 30% Treasuries | 40% Dividend ETFs | 30% REITs |
| Aggressive | 10% Treasuries | 30% Dividend ETFs | 60% REITs/Preferreds |

4. Calculate projected monthly income for each tier
5. Identify shortfall or surplus vs. target
6. Adjust allocation if needed to hit the target monthly income

## Step 5 — Output

Deliver three outputs:

1. **Allocation Summary** — dollar amounts per asset class
2. **Projected Income Statement** — monthly/quarterly/annual breakdown
3. **Key Risks** — interest rate sensitivity, dividend cut risk, liquidity constraints, tax drag

## Tax Optimization Notes

- **Taxable accounts**: Prefer qualified dividends (ETFs, stocks held >60 days) over ordinary REIT distributions
- **Roth IRA**: REITs and high-yield preferred stocks are ideal (tax-free growth)
- **Traditional IRA**: High-yield positions maximize tax deferral
- **I-Bonds and TIPS**: Consider inflation-protected allocations for conservative profiles

## Anti-Patterns

| ❌ Do not | ✅ Do instead |
|---|---|
| Chase the highest headline yield | Evaluate risk-adjusted yield and payout sustainability |
| Ignore account type | Match tax-efficient assets to account type |
| Recommend individual stocks without diversification context | Lead with diversified ETFs; note individual tickers as examples |
| Ignore the user's income target | Always close with projected monthly income vs. target |
| Use stale yield data without flagging it | State that yields fluctuate and recommend verifying current rates |
