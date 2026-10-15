import json
import sys
import time


def main():
    scenario = sys.argv[1] if len(sys.argv) > 1 else "normal"
    if scenario not in {"normal", "mixed", "partial-zero", "empty", "unknown", "fail-fast", "cancelled", "live"}:
        raise ValueError("Unknown fixture scenario")
    count = 0 if scenario == "empty" else 4 if scenario == "mixed" else 3
    total = None if scenario == "unknown" else count
    stats = {"processed": 0, "succeeded": 0, "failed": 0, "skipped": 0}
    started = time.monotonic()
    last_report = started
    results = []
    status = "completed"

    def emit(event, **fields):
        record = {"event": event, "total": total, **stats, "elapsed_ms": round((time.monotonic() - started) * 1000), **fields}
        print(json.dumps(record), file=sys.stderr, flush=True)

    emit("start")
    try:
        for index in range(1, count + 1):
            if scenario == "cancelled" and index == 2:
                raise KeyboardInterrupt()
            if scenario == "mixed" and index == 2:
                stats["skipped"] += 1
            else:
                try:
                    if (scenario == "mixed" and index == 3) or (scenario in {"fail-fast", "partial-zero"} and index == 2):
                        raise ValueError("fixture-rejected")
                    results.append({"id": f"item-{index}", "value": index * 2})
                    stats["succeeded"] += 1
                except ValueError:
                    stats["failed"] += 1
                    stats["processed"] += 1
                    emit("item-failed", item_id=f"item-{index}", reason="fixture-rejected", will_continue=scenario != "fail-fast")
                    if scenario == "fail-fast":
                        status = "failed"
                        break
                    stats["processed"] -= 1
            stats["processed"] += 1
            now = time.monotonic()
            if stats["processed"] % 2 == 0 or now - last_report >= 1 or scenario == "live":
                emit("progress")
                last_report = now
            if scenario == "live" and index == 1:
                if not sys.stdin.readline():
                    raise RuntimeError("Fixture release input missing")
    except KeyboardInterrupt:
        status = "cancelled"
    if status == "completed" and stats["failed"]:
        status = "partial"
    exit_code = 130 if status == "cancelled" else 1 if stats["failed"] and scenario != "partial-zero" else 0
    emit("summary", status=status, exit_code=exit_code, unprocessed=None if total is None else total - stats["processed"])
    if status != "cancelled":
        print(json.dumps({"results": results}), flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
