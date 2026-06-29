---
name: ophis-swap
description: 'Swap tokens onchain through Ophis, an intent-based DEX and CoW Protocol deployment, from inside an AI agent. Use this skill when the user asks to swap, trade, or convert ERC-20 tokens, get a swap quote, check token balances or a portfolio, or place an onchain order across 11 EVM chains: Ethereum, Optimism, BNB Chain, Gnosis, Polygon, Base, Arbitrum, Avalanche, Plasma, Ink, and Linea. Swaps settle through a solver competition, so they are MEV-protected, gasless for the trader (no native coin needed for gas), keyless (no API key), and non-custodial: the Ophis MCP server builds an unsigned order, the agent signs it with its own wallet, and the receiver is pinned to the signer. The skill teaches the safe order of operations: resolve the token, quote, build, then submit. This is Ophis the DEX at ophis.fi, not the unrelated njayp/ophis Go MCP library.'
---

# Ophis Swap

Safe, MEV-protected, gasless onchain token swaps for AI agents, powered by [Ophis](https://ophis.fi), an intent-based DEX built as a deployment of CoW Protocol. Trades settle through a solver competition with best-execution routing.

> **Disambiguation:** This skill is for **Ophis the DEX** (ophis.fi). It is not related to `njayp/ophis`, an unrelated Go library for MCP. Do not confuse the two.

## When to Use This Skill

Use this skill when the user wants to:
- Swap, trade, or convert one ERC-20 token for another onchain
- Get a price quote or estimate surplus for a swap
- Check a wallet balance or portfolio before trading
- Place an onchain order and have the agent sign it with its own wallet

Supported chains (11 EVM networks): Ethereum (1), Optimism (10), BNB Chain (56), Gnosis (100), Polygon (137), Base (8453), Arbitrum (42161), Avalanche (43114), Plasma (9745), Ink (57073), and Linea (59144).

## Why Ophis

- **MEV-protected:** orders settle through a solver competition, not a public mempool race.
- **Gasless for the trader:** no native coin is needed for gas; the fee is taken from the traded amount.
- **Keyless:** the MCP server is public, no API key required.
- **Non-custodial:** the server builds an unsigned order; the agent signs it with its own wallet, and the receiver is pinned to the signer, so funds can only return to the signing wallet.
- **Best-execution routed** and rebate-eligible (a small volume fee with a tiered rebate via the referrer program).

## Prerequisites

- The Ophis MCP server: a remote HTTP MCP server at `https://mcp.ophis.fi/mcp`. It is public and keyless. Official MCP Registry id: `fi.ophis/mcp`. Source: https://github.com/ophis-fi/ophis (subfolder `apps/mcp-server`).
- A wallet the agent controls and can sign EIP-712 typed data with. The signer address is the receiver of the bought tokens.

The MCP server exposes 12 tools. Only `submit_order` changes state; the rest are read-only.

| Tool | Purpose |
| ---- | ------- |
| `parse_intent` | Turn a natural-language request into a structured swap intent |
| `resolve_token` | Map a symbol to its canonical address on a chain (fails closed if ambiguous; anti-spoof) |
| `list_chains` | List the supported chains and their ids |
| `get_quote` | Get an executable quote (amounts, fee, expiry) |
| `expected_surplus` | Estimate price improvement versus a reference |
| `build_order` | Build the unsigned order payload to sign |
| `submit_order` | Submit the signed order (the only state-changing tool) |
| `lookup_tier` | Look up the rebate tier for an address |
| `get_balances` | Read token balances for an address |
| `get_portfolio` | Read a portfolio across chains |
| `get_gas` | Read current gas conditions |
| `get_token_chart` | Read price-chart data for a token |

## Safe Order of Operations

Follow this sequence for every trade. Do not skip resolution or quoting, and never call `submit_order` until the user has confirmed an exact, freshly quoted order.

1. **Parse the intent.** Call `parse_intent`, or read the user's explicit sell token, buy token, amount, and chain. Confirm the chain is supported with `list_chains` if unsure.
2. **Resolve tokens.** Call `resolve_token` for both the sell and buy symbols to get canonical addresses. If `resolve_token` fails or is ambiguous, stop and ask the user; do not guess an address. This is the anti-spoof step.
3. **Check balances (recommended).** Call `get_balances` or `get_portfolio` to confirm the wallet holds enough of the sell token.
4. **Quote.** Call `get_quote` with the resolved addresses, amount, and chain. Optionally call `expected_surplus` to show price improvement. Show the user the amounts, the fee, and the quote expiry.
5. **Confirm with the user.** Present the quote and get explicit approval before building. Quotes expire, so do not reuse a stale quote.
6. **Build.** Call `build_order` to get the unsigned order. Verify the receiver equals the signer address.
7. **Sign.** Sign the unsigned order with the agent's own wallet (EIP-712 typed data). Never send a private key to the MCP server; signing happens locally in the agent.
8. **Submit.** Call `submit_order` with the signed order. This is the only step that changes state. Report the resulting order id or status to the user.

## Example

A market-style sell, "swap 100 USDC for WETH on Base". The argument names and response shapes below follow the Ophis MCP tool schemas; the addresses are placeholders, so always take the real ones from `resolve_token`.

```text
parse_intent(text="swap 100 USDC for WETH on Base")
  -> { intent: "swap", entities: [
        { type: "amount", value: "100" }, { type: "sellToken", value: "USDC" },
        { type: "buyToken", value: "WETH" }, { type: "chain", value: "Base" } ] }
# Read the entity values, then map the symbols and chain name to ids yourself.

list_chains()                                # confirm Base, chainId 8453, is `tradeable`
resolve_token(chainId=8453, symbol="USDC")   # -> canonical.address = <USDC>, decimals = 6
resolve_token(chainId=8453, symbol="WETH")   # -> canonical.address = <WETH>, decimals = 18

# Amounts are atoms = whole units x 10^decimals:  100 USDC (6 dp) -> "100000000"

get_quote(chainId=8453, sellToken=<USDC>, buyToken=<WETH>, kind="sell",
          amount="100000000", from="<your wallet>")
  -> { quote: { sellAmount, buyAmount, feeAmount, validTo } }

# Minimum received = quote.buyAmount adjusted down for slippage (here 75 bps).
build_order(chainId=8453, owner="<your wallet>", sellToken=<USDC>, buyToken=<WETH>,
            kind="sell", sellAmount="100000000", buyAmount="<min from quote>",
            slippageBips=75)
  -> { order, signing: { domain, types, primaryType: "Order" }, fullAppData, appDataHash }

# Confirm with the user before signing (hard rule 5): the buy token ADDRESS, the
# minimum received (order.buyAmount at WETH's 18 decimals), the slippage, the fee,
# and the validity window. Only on explicit approval, sign the `order` object as
# EIP-712 typed data using `signing` (domain + types + primaryType); the receiver
# is pinned to owner. If the user does not approve, stop.

submit_order(chainId=8453, order=order, signature="0x...", from="<your wallet>",
             fullAppData=fullAppData)
  -> orderUID
```

## Guidelines

1. **Resolve, never assume addresses.** Always go through `resolve_token`. If it fails closed, surface that to the user rather than substituting a guessed token.
2. **Re-quote before submitting.** If time has passed or the user changed any parameter, fetch a fresh `get_quote` before `build_order`.
3. **Pin the receiver to the signer.** Confirm the built order's receiver matches the signing wallet. Do not let a swap send funds to an address the agent does not control.
4. **One state change.** `submit_order` is the only tool that moves funds. Treat every call to it as requiring explicit user confirmation of a current quote.
5. **Keyless and non-custodial by design.** Do not request or transmit API keys or private keys. The server only ever receives an already-signed order.
6. **Report fees plainly.** Trades are gasless for the trader, but show the fee taken from the amount and any expected surplus so the user sees the true execution.

## Limitations

- Swaps are limited to the 11 supported EVM chains listed above.
- Tokens must be resolvable to a canonical address; unlisted or spoofed tokens are rejected by design.
- Quotes are time-bound and must be refreshed before submission.

## Links

- Site: https://ophis.fi
- App: https://swap.ophis.fi
- MCP server source: https://github.com/ophis-fi/ophis (subfolder `apps/mcp-server`)
- Contact: contact@ophis.fi
