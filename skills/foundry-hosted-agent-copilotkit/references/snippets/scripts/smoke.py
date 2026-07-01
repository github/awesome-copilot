#!/usr/bin/env python3
"""smoke.py — the bridge against the REAL Foundry hosted agent running
locally via `azd ai agent run`.

Requires:
  - The hosted agent running locally (DIRECT mode), e.g.:
        cd hosted && azd ai agent run --no-inspector --no-prompt
    (needs `az login` + a provisioned Foundry project).
  - The bridge running and pointed at it, e.g.:
        HOSTED_AGENT_DIRECT_URL=http://localhost:8088 \\
        uvicorn bridge_app:app --port 8080   (from backend/)

Env overrides: BRIDGE_URL (default http://localhost:8080/agent).

Exercises, through the bridge (not the raw hosted agent), for the example
"records" domain in hosted/responses/agent.py — rename the tool names / regex below if you
changed the domain:
  - read tool (list_pending_records) runs and returns a result
  - the consequential tool (approve_record) PAUSES with a confirm_changes
    tool call (not silently executed)
  - approve -> mcp_approval_response{approve:true} -> tool re-executes,
    state changes server-side (verified by re-querying pending records)
  - reject -> mcp_approval_response{approve:false} -> tool does NOT execute,
    state unchanged
"""

from __future__ import annotations

import json
import os
import re
import sys
import uuid

import httpx

BRIDGE_URL = os.environ.get("BRIDGE_URL", "http://localhost:8080/agent")

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        PASS.append(name)
        print(f"  OK   {name}")
    else:
        FAIL.append(name)
        print(f"  FAIL {name} {detail}")


def run_turn(thread_id: str, run_id: str, messages: list[dict]) -> list[dict]:
    body = {
        "threadId": thread_id,
        "runId": run_id,
        "state": None,
        "messages": messages,
        "tools": [],
        "context": [],
        "forwardedProps": None,
    }
    events: list[dict] = []
    with httpx.Client(timeout=60.0) as client:
        with client.stream("POST", BRIDGE_URL, json=body) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if line.startswith("data:"):
                    payload = line[len("data:") :].strip()
                    if payload:
                        events.append(json.loads(payload))
    return events


def find(events: list[dict], **kwargs) -> dict | None:
    for e in events:
        if all(e.get(k) == v for k, v in kwargs.items()):
            return e
    return None


def assistant_text(events: list[dict]) -> str:
    return "".join(e.get("delta", "") for e in events if e.get("type") == "TEXT_MESSAGE_CONTENT")


def tool_result_text(events: list[dict], tool_call_id: str) -> str | None:
    e = find(events, type="TOOL_CALL_RESULT", toolCallId=tool_call_id)
    return e.get("content") if e else None


def main() -> int:
    print(f"== smoke.py against {BRIDGE_URL} ==")

    # C1: read tool works
    t1 = f"smoke-read-{uuid.uuid4()}"
    events = run_turn(t1, "r1", [{"id": "m1", "role": "user", "content": "List pending records for alice"}])
    tool_start = find(events, type="TOOL_CALL_START", toolCallName="list_pending_records")
    check("C1 read tool call started", tool_start is not None)
    result_text = tool_result_text(events, tool_start["toolCallId"]) if tool_start else None
    check("C1 read tool produced a result", bool(result_text), detail=str(result_text)[:120])
    check("C1 run finished cleanly", find(events, type="RUN_FINISHED") is not None)
    check("C1 no RUN_ERROR", find(events, type="RUN_ERROR") is None)

    # Discover a pending record id to exercise HITL against, from C1's result.
    record_id = None
    if result_text:
        m = re.search(r"(REC-\d+)", result_text)
        record_id = m.group(1) if m else None
    check("C1 found a pending record id to test HITL with", record_id is not None, detail=str(result_text))
    if not record_id:
        print("Cannot continue HITL checks without a pending record id.")
        return 1 if FAIL else 0

    # C2: HITL pause — consequential tool must NOT execute inline.
    t2 = f"smoke-hitl-{uuid.uuid4()}"
    events2 = run_turn(t2, "r1", [{"id": "m1", "role": "user", "content": f"Approve {record_id}."}])
    confirm_start = find(events2, type="TOOL_CALL_START", toolCallName="confirm_changes")
    check("C2 confirm_changes tool call appears (HITL pause)", confirm_start is not None)
    # The hosted agent's Responses stream emits a `function_call` (the model's
    # intent to call the gated tool) immediately followed by an
    # `mcp_approval_request` for the SAME call — so a TOOL_CALL_START named
    # "approve_record" legitimately appears even though it's paused. What must
    # NOT appear is a TOOL_CALL_RESULT for that same tool_call_id (there is no
    # `function_call_output` for a gated call until it's approved). Match by
    # id, not name — ToolCallResultEvent carries no toolCallName field at all,
    # so checking TOOL_CALL_RESULT + toolCallName here would trivially "pass"
    # regardless of whether the tool actually ran.
    approve_start = find(events2, type="TOOL_CALL_START", toolCallName="approve_record")
    check(
        "C2 approve_record has NO TOOL_CALL_RESULT yet (paused, not executed)",
        approve_start is None or find(events2, type="TOOL_CALL_RESULT", toolCallId=approve_start["toolCallId"]) is None,
    )
    if not confirm_start:
        print("Cannot continue: no confirm_changes call to approve/reject.")
        return 1

    tool_call_id = confirm_start["toolCallId"]

    # C3: reject -> state unchanged
    events3 = run_turn(
        t2,
        "r2",
        [
            {"id": "m1", "role": "user", "content": f"Approve {record_id}."},
            {"id": "m2", "role": "tool", "toolCallId": tool_call_id, "content": json.dumps({"accepted": False, "steps": []})},
        ],
    )
    check("C3 reject run finishes without error", find(events3, type="RUN_ERROR") is None)

    t_verify = f"smoke-verify-{uuid.uuid4()}"
    events_verify = run_turn(t_verify, "r1", [{"id": "m1", "role": "user", "content": "List pending records for alice"}])
    text_after_reject = assistant_text(events_verify)
    check(f"C3 {record_id} still pending after reject", record_id in text_after_reject, detail=text_after_reject[:200])

    # C4: fresh HITL + approve -> tool re-executes, state changes.
    t4 = f"smoke-approve-{uuid.uuid4()}"
    events4a = run_turn(t4, "r1", [{"id": "m1", "role": "user", "content": f"Approve {record_id}."}])
    confirm_start2 = find(events4a, type="TOOL_CALL_START", toolCallName="confirm_changes")
    check("C4 confirm_changes appears again for the approve path", confirm_start2 is not None)
    if confirm_start2:
        events4b = run_turn(
            t4,
            "r2",
            [
                {"id": "m1", "role": "user", "content": f"Approve {record_id}."},
                {
                    "id": "m2",
                    "role": "tool",
                    "toolCallId": confirm_start2["toolCallId"],
                    "content": json.dumps({"accepted": True, "steps": []}),
                },
            ],
        )
        check("C4 approve run finishes without error", find(events4b, type="RUN_ERROR") is None)

        t_verify2 = f"smoke-verify2-{uuid.uuid4()}"
        events_verify2 = run_turn(
            t_verify2, "r1", [{"id": "m1", "role": "user", "content": "List pending records for alice"}]
        )
        text_after_approve = assistant_text(events_verify2)
        check(
            f"C4 {record_id} NO LONGER pending after approve (tool re-executed server-side)",
            record_id not in text_after_approve,
            detail=text_after_approve[:200],
        )

    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
