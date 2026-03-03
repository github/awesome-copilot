#!/usr/bin/env python3
"""
Copilot Studio Agent Usage Estimator — Live Page Scraper

Automates the Microsoft Copilot Studio estimator page
(https://microsoft.github.io/copilot-studio-estimator/) by filling in
the form fields with user-provided values and extracting the results.

Uses the system's existing Microsoft Edge browser — no Chromium download needed.

Requirements (one-time):
    pip install playwright

Usage:
    python copilot-studio-estimator.py \
        --agent-type employee \
        --users 500 \
        --interactions 20 \
        --knowledge-pct 60 \
        --tenant-graph-pct 30 \
        --tool-prompt 0.5 \
        --output json

    python copilot-studio-estimator.py --help
"""

import argparse
import json
import sys
import re
import time

ESTIMATOR_URL = "https://microsoft.github.io/copilot-studio-estimator/"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Automate the Copilot Studio agent usage estimator page."
    )
    parser.add_argument(
        "--agent-type",
        choices=["employee", "customer"],
        default="employee",
        help="Agent type: 'employee' or 'customer'. Default: employee",
    )
    parser.add_argument(
        "--users",
        type=int,
        required=True,
        help="Number of end users accessing the agent.",
    )
    parser.add_argument(
        "--interactions",
        type=float,
        required=True,
        help="Average interactions per user per month.",
    )
    parser.add_argument(
        "--knowledge-pct",
        type=float,
        default=0,
        help="Percentage of responses from knowledge (0-100). Default: 0",
    )
    parser.add_argument(
        "--tenant-graph-pct",
        type=float,
        default=0,
        help="Of knowledge responses, %% using tenant graph grounding (0-100). Default: 0",
    )
    parser.add_argument(
        "--tool-prompt",
        type=float,
        default=0,
        help="Average Prompt tool calls per session. Default: 0",
    )
    parser.add_argument(
        "--tool-agent-flow",
        type=float,
        default=0,
        help="Average Agent flow calls per session. Default: 0",
    )
    parser.add_argument(
        "--tool-computer-use",
        type=float,
        default=0,
        help="Average Computer use calls per session. Default: 0",
    )
    parser.add_argument(
        "--tool-custom-connector",
        type=float,
        default=0,
        help="Average Custom connector calls per session. Default: 0",
    )
    parser.add_argument(
        "--tool-mcp",
        type=float,
        default=0,
        help="Average MCP calls per session. Default: 0",
    )
    parser.add_argument(
        "--tool-rest-api",
        type=float,
        default=0,
        help="Average REST API calls per session. Default: 0",
    )
    parser.add_argument(
        "--output",
        choices=["json", "text"],
        default="text",
        help="Output format. Default: text",
    )
    return parser.parse_args()


def fill_input(page, index, value):
    """Fill a spinbutton input by index."""
    inputs = page.get_by_role("spinbutton").all()
    if index < len(inputs):
        inputs[index].click()
        inputs[index].fill(str(value))


def extract_number(text):
    """Extract a number from text like '55,400' or '18,000.50'."""
    if not text:
        return 0
    cleaned = re.sub(r'[^\d.,]', '', text.strip())
    cleaned = cleaned.replace(',', '')
    try:
        return float(cleaned) if cleaned else 0
    except ValueError:
        return 0


def run_estimator(args):
    """Open the estimator page, fill the form, and extract results."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(
            "Error: playwright is not installed.\n"
            "Run: pip install playwright",
            file=sys.stderr,
        )
        sys.exit(1)

    with sync_playwright() as p:
        # Try system browsers in order: Edge → Chrome → Chromium (bundled) → Firefox
        browser = None
        for launch_fn, kwargs in [
            (p.chromium.launch, {"headless": True, "channel": "msedge"}),
            (p.chromium.launch, {"headless": True, "channel": "chrome"}),
            (p.chromium.launch, {"headless": True}),  # bundled Chromium if installed
            (p.firefox.launch, {"headless": True}),   # Firefox if installed
        ]:
            try:
                browser = launch_fn(**kwargs)
                break
            except Exception:
                continue

        if not browser:
            print(
                "Error: No usable browser found.\n"
                "Install one with: playwright install chromium\n"
                "Or install Edge, Chrome, or Firefox on your system.",
                file=sys.stderr,
            )
            sys.exit(1)

        page = browser.new_page()

        try:
            # Load page — use domcontentloaded (faster than networkidle)
            page.goto(ESTIMATOR_URL, timeout=20000, wait_until="domcontentloaded")
            # Wait for React to render form inputs
            page.wait_for_selector('[role="spinbutton"], input[type="number"]', state="attached", timeout=15000)
            time.sleep(2)

            # --- Agent Type (radio buttons) ---
            radios = page.get_by_role("radio").all()
            if args.agent_type == "employee" and len(radios) > 0:
                radios[0].check()
            elif args.agent_type == "customer" and len(radios) > 1:
                radios[1].check()

            # --- Form inputs (ordered by position on page) ---
            # 0: users, 1: interactions, 2: knowledge%, 3: tenant graph%
            fill_input(page, 0, args.users)
            fill_input(page, 1, args.interactions)
            fill_input(page, 2, args.knowledge_pct)
            fill_input(page, 3, args.tenant_graph_pct)

            # --- Tools table inputs (indices 4+) ---
            tool_values = [
                args.tool_prompt,
                args.tool_agent_flow,
                args.tool_computer_use,
                args.tool_custom_connector,
                args.tool_mcp,
                args.tool_rest_api,
            ]
            for i, val in enumerate(tool_values):
                if val > 0:
                    fill_input(page, 4 + i, val)

            # Wait for calculations to update
            time.sleep(2)

            # --- Extract Results ---
            body_text = page.inner_text("body")

            results = {
                "inputs": {
                    "agent_type": args.agent_type,
                    "users": args.users,
                    "interactions_per_month": args.interactions,
                    "knowledge_pct": args.knowledge_pct,
                    "tenant_graph_pct": args.tenant_graph_pct,
                    "tools": {
                        "prompt": args.tool_prompt,
                        "agent_flow": args.tool_agent_flow,
                        "computer_use": args.tool_computer_use,
                        "custom_connector": args.tool_custom_connector,
                        "mcp": args.tool_mcp,
                        "rest_api": args.tool_rest_api,
                    },
                },
                "results": {},
                "source": ESTIMATOR_URL,
            }

            # Parse results from page text
            patterns = {
                "total_monthly_credits": r"Total Estimated Monthly Copilot Credit Usage\s*([\d,]+)",
                "knowledge_credits": r"Copilot credits driven by knowledge\s*([\d,]+)",
                "tenant_graph_credits": r"tenant graph grounding\s*([\d,]+)",
                "non_tenant_graph_credits": r"non-tenant graph grounding[^0-9]*([\d,]+)",
                "agent_tools_credits": r"Copilot credits driven by agent tools\s*([\d,]+)",
                "agent_flows_credits": r"Copilot credits driven by agent flows\s*([\d,]+)",
                "optional_modifiers_credits": r"Copilot credits driven by optional modifiers\s*([\d,]+)",
            }

            for key, pattern in patterns.items():
                match = re.search(pattern, body_text, re.IGNORECASE)
                if match:
                    results["results"][key] = extract_number(match.group(1))

            # Grab full results section as fallback
            idx = body_text.find("Total Estimated Monthly")
            if idx >= 0:
                results["results"]["raw_text"] = body_text[idx:idx + 1500].strip()

            # Calculate cost
            total = results["results"].get("total_monthly_credits", 0)
            if total:
                results["results"]["estimated_cost_usd"] = round(total * 0.01, 2)

        except Exception as e:
            results = {
                "error": str(e),
                "hint": "The page may have changed its structure. Check the URL manually.",
                "source": ESTIMATOR_URL,
            }

        browser.close()
        return results


def print_text_report(results):
    """Pretty-print results."""
    if "error" in results:
        print(f"Error: {results['error']}")
        print(f"Hint: {results.get('hint', '')}")
        print(f"URL: {results['source']}")
        return

    inp = results["inputs"]
    res = results["results"]

    print("=" * 55)
    print("  Copilot Studio — Monthly Credit Estimate")
    print("  (from live Microsoft estimator page)")
    print("=" * 55)
    print(f"  Agent type:       {inp['agent_type']}")
    print(f"  Users:            {inp['users']:,}")
    print(f"  Interactions/mo:  {inp['interactions_per_month']}")
    print(f"  Knowledge %:      {inp['knowledge_pct']}%")
    print(f"  Tenant Graph %:   {inp['tenant_graph_pct']}%")

    print(f"\n  {'─' * 50}")
    for key, val in res.items():
        if key == "raw_text":
            continue
        label = key.replace("_", " ").title()
        if isinstance(val, float):
            if "cost" in key:
                print(f"  {label}: ${val:,.2f}")
            else:
                print(f"  {label}: {val:,.0f}")
        else:
            print(f"  {label}: {val}")

    print(f"\n  Source: {results['source']}")
    print("  1 Copilot Credit = $0.01 USD")


def main():
    args = parse_args()
    results = run_estimator(args)

    if args.output == "json":
        print(json.dumps(results, indent=2))
    else:
        print_text_report(results)


if __name__ == "__main__":
    main()
