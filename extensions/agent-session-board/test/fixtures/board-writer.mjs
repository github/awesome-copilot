// Test fixture: one independent writer. Each worker thread loads its own copy of store.mjs, so the in-process
// queue is not shared between writers and only the lock file keeps their updates from overwriting each other.
import { workerData } from "node:worker_threads";
import { updateBoard } from "../../lib/store.mjs";

for (let i = 0; i < workerData.count; i += 1) {
    await updateBoard("octo/app", (b) => ({ ...b, decisions: [...b.decisions, { id: `${workerData.name}-${i}`, title: "t", detail: "", url: "", options: [] }] }));
}
