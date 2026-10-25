const POLL_DELAYS = [1000, 2000, 4000];

export function assertNoPendingFixesRequest(item, number) {
    if (item.pendingFixesRequest) {
        throw new Error(`#${number} has a fixes request awaiting workflow confirmation.`);
    }
}

export async function confirmRequestFixes({ number, getIssueStatus, onConfirmed, refresh, sleep, log }) {
    for (const delay of POLL_DELAYS) {
        try {
            await sleep(delay);
            const status = await getIssueStatus(number);
            if (!(status.labels ?? []).includes("requires-submitter-fixes")) continue;
            await onConfirmed(status);
            await refresh();
            return true;
        } catch (error) {
            try {
                log(error);
            } catch {
                // Confirmation is best-effort after GitHub accepts the comment.
            }
            return false;
        }
    }
    return false;
}
