// Runs one task at a time. A background call during a run joins it; a forced call during a run records a retry that
// runs right after it settles, so a user's refresh is never dropped. Callers share the promise of the whole batch,
// which rejects only when its last run failed.
export function coalesce(task) {
    let running = null;
    let retryPending = false;
    return function request(force = false) {
        if (running) {
            if (force) retryPending = true;
            return running;
        }
        running = (async () => {
            let current = force;
            try {
                for (;;) {
                    let failure = null;
                    try { await task(current); }
                    catch (error) { failure = error; }
                    if (!retryPending) {
                        if (failure) throw failure;
                        return;
                    }
                    retryPending = false;
                    current = true;
                }
            } finally { running = null; }
        })();
        return running;
    };
}
