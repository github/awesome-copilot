# Copyright (c) Microsoft. All rights reserved.
"""Foundry hosted-agent entry point.

Wraps build_hosted_agent() (agent.py, right next to this file — the single
brain) in a ResponsesHostServer so it can run:
  - locally, via `azd ai agent run` (this file executed directly), and
  - deployed, as the published Azure AI Foundry hosted agent (same image/code).

Prefer generating this file (and agent.yaml/azure.yaml/Dockerfile/infra/) with
`azd ai agent init -m <manifest-url>` instead of hand-copying it — the import
below (`agent_framework_foundry_hosting.ResponsesHostServer`) is shown here to
illustrate the shape, but the exact package/module name has moved before and
may move again; trust what the generated scaffold's own `main.py` imports.
"""

from agent import build_hosted_agent
from agent_framework_foundry_hosting import ResponsesHostServer
from dotenv import load_dotenv

load_dotenv()


def main() -> None:
    agent = build_hosted_agent()
    server = ResponsesHostServer(agent)
    server.run()


if __name__ == "__main__":
    main()
