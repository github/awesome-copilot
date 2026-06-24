---
name: use-subotiz
description: 'Operate Subotiz billing and payments through the subotiz MCP server: list/create customers, products and prices, inspect subscriptions, trades, refunds, invoices and webhook events. Use when the user asks to manage subscriptions, set up usage-based billing, create products/prices, look up payments or invoices, issue or inspect refunds, or work with Subotiz / Merchant-of-Record revenue operations.'
---

# Subotiz Billing & Payments

Use the `subotiz` MCP server for all Subotiz operations. Do not rely on training data for Subotiz endpoints, parameters, or pricing models — query the server's tools and developer docs instead.

## When to Apply

Apply this skill when the user:
- Manages subscriptions, plans, or usage-based billing on Subotiz
- Creates or lists products and prices
- Looks up customers, payments (trades), invoices, or webhook events
- Issues or inspects refunds
- Asks anything about Subotiz revenue operations or Merchant-of-Record flows

## Tools

| Tool | Purpose |
|------|---------|
| `list_customer` / `create_customer` | List or create customers |
| `list_products` / `create_product` | List or create products |
| `list_prices` / `create_price` | List or create prices |
| `list_subscription` | List subscriptions |
| `list_trades` | List payments/transactions |
| `list_refund` | List refunds for a trade |
| `list_invoice` | List invoices |
| `list_webhook_event_v2` | List webhook events (v2) |
| `get_llm_doc` / `get_llm_full_doc` | Fetch Subotiz developer documentation |

When unsure about parameters or an endpoint not listed above, call `get_llm_doc` (condensed) or `get_llm_full_doc` (full) before guessing.

## Example Workflow

Set the API key for the environment you target before any call:

```bash
export SUBOTIZ_API_KEY="sk_live_..."          # production → subotiz
export SUBOTIZ_SANDBOX_API_KEY="sk_test_..."  # sandbox    → subotiz-sandbox
```

Read-only investigation — "show a customer's active subscriptions and recent payments":

```text
list_customer(email="alex@example.com")              # resolve the customer id
list_subscription(customer_id="cus_123", status="active")
list_trades(customer_id="cus_123", limit=5)
list_refund(trade_id="trd_456")                      # only if a refund is in question
```

Creating a billable resource — restate the payload, get explicit confirmation, then call:

```text
# 1. Confirm with the user first (never auto-create):
#    create_product "Pro Plan" -> create_price 2900 USD / month
# 2. Only after an explicit "yes":
create_product(name="Pro Plan", description="Pro tier")
create_price(product_id="prod_789", unit_amount=2900, currency="USD", recurring_interval="month")
```

## Safety Rules (payment-grade)

Subotiz handles real money. Treat write operations as high-risk:

1. **Confirm before any write.** Before `create_customer`, `create_product`, `create_price`, or any mutating action, restate the exact payload to the user and get explicit confirmation. Never auto-create billable resources.
2. **Refunds and charges are irreversible.** Always echo amount, currency, and the target trade/customer, and require an explicit "yes" before proceeding.
3. **Never log or echo the API key.** The token lives in the `Authorization` header / `SUBOTIZ_API_KEY` env var — never print it, never write it to files or commits.
4. **Default to read-only for discovery.** Use `list_*` tools to inspect state before proposing any change.
5. **Sandbox first.** This plugin ships two servers — `subotiz` (production) and `subotiz-sandbox`. For any experimentation or destructive testing, prefer the `subotiz-sandbox` tools so no real money or live customer data is touched.

## Setup

This plugin ships two remote MCP servers via `.mcp.json`:

| Server | Environment | API key env var |
|--------|-------------|-----------------|
| `subotiz` | Production | `SUBOTIZ_API_KEY` |
| `subotiz-sandbox` | Sandbox / testing | `SUBOTIZ_SANDBOX_API_KEY` |

The user only needs to set the key(s) for the environment(s) they use; the other server simply stays disconnected (harmless). If a tool call returns `401 Unauthorized`, the matching key is missing, expired, or lacks the `Bearer ` prefix — tell the user to set/rotate the right env var. Key creation: https://developer.subotiz.com/v1.0-zh-cn/reference/authentication-1
