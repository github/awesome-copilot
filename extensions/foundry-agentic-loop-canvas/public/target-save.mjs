// Saves the SDD target (environment, subscription, location) one request at a time. Edits are merged and debounced;
// flush() saves whatever is pending now and resolves once every save so far has settled, so a send never carries a
// stale target. A failed field stays failed until a later save of that same field succeeds or the server's target is
// restored; once nothing else is queued, any field still failed is reported and restoration is attempted.
// Timers are wrapped because browsers reject setTimeout and clearTimeout called as methods of another object.
export class TargetSaver {
    constructor({ save, restore = async () => {}, delay = 400, onChange = () => {}, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
        Object.assign(this, { save, restore, delay, onChange, setTimer, clearTimer });
        this.pending = null;
        this.timer = null;
        this.inflight = 0;
        this.failed = new Map();
        this.chain = Promise.resolve({ ok: true });
    }

    get saving() { return this.pending !== null || this.inflight > 0; }

    schedule(input) {
        this.pending = { ...this.pending, ...input };
        this.clearTimer(this.timer);
        this.timer = this.setTimer(() => { this.flush(); }, this.delay);
        this.onChange(true);
    }

    // Drops a field still waiting to be saved, such as an environment name that became invalid.
    discard(key) {
        if (!this.pending || !(key in this.pending)) return;
        const { [key]: _, ...rest } = this.pending;
        this.pending = Object.keys(rest).length ? rest : null;
        if (!this.pending) {
            this.clearTimer(this.timer);
            this.timer = null;
        }
        this.onChange(this.saving);
        if (!this.saving && this.failed.size) this.flush();
    }

    flush() {
        this.clearTimer(this.timer);
        this.timer = null;
        if (this.pending) {
            const input = this.pending;
            this.pending = null;
            this.inflight++;
            this.chain = this.chain.then(() => this.#run(input));
        } else if (!this.inflight) {
            // An earlier failure was already reported and the controls restored, so it no longer blocks.
            if (!this.failed.size) return Promise.resolve({ ok: true });
            this.inflight++;
            this.chain = this.chain.then(() => this.#finish({ ok: true }));
        }
        return this.chain;
    }

    async #run(input) {
        let result;
        try {
            await this.save(input);
            for (const key of Object.keys(input)) this.failed.delete(key);
            result = { ok: true };
        } catch (error) {
            for (const key of Object.keys(input)) this.failed.set(key, error);
            result = { ok: false, error };
        }
        return this.#finish(result);
    }

    // The last queued save reports any field that is still failed, whichever save failed it. The failure is kept until
    // the server's target is restored, so a failed restore keeps blocking and the next flush retries it.
    async #finish(result) {
        if (!this.pending && this.inflight === 1 && this.failed.size) {
            const error = [...this.failed.values()].at(-1);
            result = { ok: false, error };
            try {
                await this.restore(error);
                this.failed.clear();
            } catch { /* Still failed: the controls may show a target the server does not have. */ }
        }
        this.inflight--;
        this.onChange(this.saving);
        return result;
    }
}
