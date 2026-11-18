// Runs configured patterns against subjects off the main thread, one pattern at a time, reporting progress
// so the parent can terminate this worker if a single pattern runs past its deadline.
import { parentPort, workerData } from "node:worker_threads";

const { patterns, subjects, start } = workerData;
for (let pi = start; pi < patterns.length; pi += 1) {
    parentPort.postMessage({ type: "start", pi });
    const hits = [];
    let re = null;
    try {
        re = new RegExp(patterns[pi], "i");
    } catch {
        re = null;
    }
    if (re) for (let si = 0; si < subjects.length; si += 1) if (re.test(subjects[si])) hits.push(si);
    parentPort.postMessage({ type: "done", pi, hits });
}
parentPort.postMessage({ type: "end" });
