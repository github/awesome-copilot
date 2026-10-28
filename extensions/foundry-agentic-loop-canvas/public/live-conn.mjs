export const DISCONNECT_AFTER = 15_000;

// Long-poll health: exponential backoff between failed polls, and a disconnected state once polls have failed for
// `threshold` ms since the last success. A long poll can wait 20 s on success, so the clock starts at the first failure.
export class LiveConnection {
    constructor({ now = () => Date.now(), threshold = DISCONNECT_AFTER, minDelay = 1000, maxDelay = 15_000 } = {}) {
        Object.assign(this, { now, threshold, minDelay, maxDelay });
        this.lastSuccess = now();
        this.failingSince = null;
        this.delay = minDelay;
        this.disconnected = false;
        this.controller = null;
        this.running = null;
        this.stopped = false;
    }

    // Each returns whether `disconnected` changed.
    succeeded() {
        this.lastSuccess = this.now();
        this.failingSince = null;
        this.delay = this.minDelay;
        const changed = this.disconnected;
        this.disconnected = false;
        return changed;
    }

    failed() {
        this.failingSince ??= this.now();
        const was = this.disconnected;
        this.disconnected = this.now() - this.failingSince >= this.threshold;
        return was !== this.disconnected;
    }

    // The wait before the next poll after a failure.
    backoff() {
        const wait = this.delay;
        this.delay = Math.min(this.delay * 2, this.maxDelay);
        return wait;
    }

    // Polls until stop(); request receives an AbortSignal so stop() also ends the poll in flight.
    run({ request, apply, sleep, onState = () => {} }) {
        this.stopped = false;
        this.running ??= (async () => {
            while (!this.stopped) {
                const controller = this.controller = new AbortController();
                try {
                    const value = await request(controller.signal);
                    if (this.stopped) break;
                    apply(value);
                    if (this.succeeded()) onState(false);
                } catch {
                    if (this.stopped) break;
                    if (this.failed()) onState(this.disconnected);
                    await sleep(this.backoff());
                }
            }
        })().finally(() => { this.running = null; this.controller = null; });
        return this.running;
    }

    stop() {
        this.stopped = true;
        this.controller?.abort();
    }
}
