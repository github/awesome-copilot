export function assertSession(session, sessionId) {
    if (!session.sessionId || session.sessionId !== sessionId) {
        throw new Error("This canvas is not attached to the requested Copilot session. Reopen it from that session.");
    }
}

export async function sessionUsage(session, sessionId) {
    assertSession(session, sessionId);
    const metrics = await session.rpc.usage.getMetrics();
    if (!metrics || typeof metrics.modelMetrics !== "object" || metrics.modelMetrics === null) {
        throw new Error("The runtime did not return session usage metrics. Refresh or update Copilot.");
    }
    return {
        sessionId,
        checkedAt: new Date().toISOString(),
        sessionStartTime: metrics.sessionStartTime,
        totalNanoAiu: metrics.totalNanoAiu,
        tokenDetails: metrics.tokenDetails,
        totalUserRequests: metrics.totalUserRequests,
        totalApiDurationMs: metrics.totalApiDurationMs,
        modelMetrics: metrics.modelMetrics,
    };
}
