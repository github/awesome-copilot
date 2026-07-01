# Copyright (c) Microsoft. All rights reserved.
"""The single brain for the hosted agent — ADAPT THIS to your domain.

build_hosted_agent() returns an agent_framework.Agent backed by FoundryChatClient
(Responses protocol). This is the SAME code that runs locally via
`azd ai agent run` and, once deployed, as the Azure AI Foundry hosted agent.
It lives next to main.py (not in a separate top-level src/) because nothing
else in this app imports it directly — the bridge talks to the running
hosted agent over HTTP, not in-process. If you have a reason to reuse this
module from somewhere else (a test script, another entry point), moving it
to a shared location is a fine adaptation — just update main.py's import.

This example domain is a generic "records" assistant:
- list_pending_records(owner)  -> READ tool, no side effects.
- approve_record(record_id)    -> CONSEQUENTIAL tool, gated with
  approval_mode="always_require" so a human must explicitly confirm before
  it executes. Rename/replace with your own read tool(s) and your own
  gated/consequential tool(s) — keep at least one of each.

Confirm the import paths below against your installed `agent-framework-*`
packages before trusting them — they have moved between `agent_framework_foundry`
and `agent_framework.foundry` across versions; `azd ai agent init` generates
a scaffold using whichever form is current for your installed extension.
"""

import os
from typing import Any

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import DefaultAzureCredential
from pydantic import Field
from typing_extensions import Annotated

AGENT_NAME = "my-hosted-agent"  # keep this consistent with hosted/*/agent.yaml

# --------------------------------------------------------------------------
# In-memory backing store — replace with a real data source/API call.
# --------------------------------------------------------------------------
_RECORDS: dict[str, dict[str, Any]] = {
    "REC-1001": {"id": "REC-1001", "owner": "alice", "description": "Example record 1", "status": "pending"},
    "REC-1002": {"id": "REC-1002", "owner": "alice", "description": "Example record 2", "status": "pending"},
    "REC-1003": {"id": "REC-1003", "owner": "bob", "description": "Example record 3", "status": "pending"},
}


@tool(approval_mode="never_require")
def list_pending_records(
    owner: Annotated[str, Field(description="The owner to look up pending records for, e.g. 'alice'.")],
) -> str:
    """List all PENDING records for a given owner. Read-only, no side effects."""
    records = [r for r in _RECORDS.values() if r["owner"] == owner and r["status"] == "pending"]
    if not records:
        return f"No pending records found for '{owner}'."
    lines = [f"- {r['id']}: {r['description']} (status: {r['status']})" for r in records]
    return f"Pending records for '{owner}':\n" + "\n".join(lines)


@tool(approval_mode="always_require")
def approve_record(
    record_id: Annotated[str, Field(description="The record id to approve, e.g. 'REC-1001'.")],
) -> str:
    """Approve a record and mark it as APPROVED.

    This is a consequential action and therefore ALWAYS requires explicit
    human confirmation before it executes. Replace this with your own
    consequential action (send payment, delete data, send an email, etc.) —
    keep the `approval_mode="always_require"` decorator.
    """
    record = _RECORDS.get(record_id)
    if record is None:
        return f"No record found with id '{record_id}'."
    if record["status"] == "approved":
        return f"Record {record_id} was already approved."
    record["status"] = "approved"
    return f"Record {record_id} ({record['description']}) has been approved."


def build_hosted_agent() -> Agent:
    """Build the hosted agent: FoundryChatClient (Responses) + tools + HITL."""
    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=DefaultAzureCredential(),
    )

    return Agent(
        client=client,
        name=AGENT_NAME,
        instructions=(
            "You are an assistant that manages records for a small team. "
            "You can look up a user's PENDING records by calling "
            "list_pending_records directly whenever asked. When the user asks "
            "you to approve a record, immediately call the approve_record tool "
            "with that record id — do NOT ask the user to confirm in your own "
            "words first, and do not describe what you are about to do instead "
            "of calling the tool. The platform itself will pause and collect "
            "explicit human approval before the tool executes, so you must "
            "always invoke the tool for any approval request and simply report "
            "back whatever the tool result says afterward. Keep answers brief "
            "and reference record ids explicitly."
        ),
        tools=[list_pending_records, approve_record],
        # History is managed by the hosting infrastructure (Foundry Agent
        # Service), so there's no need for the client to also persist it.
        default_options={"store": False},
    )
