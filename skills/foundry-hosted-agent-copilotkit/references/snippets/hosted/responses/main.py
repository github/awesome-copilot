# Copyright (c) Microsoft. All rights reserved.
"""Foundry hosted-agent entry point.

Wraps the shared build_hosted_agent() (src/agent.py, the single brain) in a
ResponsesHostServer so it can run:
  - locally, via `azd ai agent run` (this file executed directly), and
  - deployed, as the published Azure AI Foundry hosted agent (same image/code).

Prefer generating this file (and agent.yaml/azure.yaml/Dockerfile/infra/) with
`azd ai agent init -m <manifest-url>` instead of hand-copying it — the import
below (`agent_framework_foundry_hosting.ResponsesHostServer`) is shown here to
illustrate the shape, but the exact package/module name has moved before and
may move again; trust what the generated scaffold's own `main.py` imports.
"""

import os
import sys

# Make the project-root `src/` package importable regardless of the current
# working directory this script is launched from (local `azd ai agent run`
# runs it with cwd=hosted/responses; a container build also typically
# preserves this relative layout).
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from agent_framework_foundry_hosting import ResponsesHostServer  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

from src.agent import build_hosted_agent  # noqa: E402

load_dotenv()


def main() -> None:
    agent = build_hosted_agent()
    server = ResponsesHostServer(agent)
    server.run()


if __name__ == "__main__":
    main()
