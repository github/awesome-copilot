export function safeErrorSummary(error, maxLength = 240) {
    const rawMessage = typeof error === "string" ? error : error?.message;
    let summary = typeof rawMessage === "string" ? rawMessage : "The request could not be completed.";
    summary = summary
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[redacted]")
        .replace(/\b(token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
        .replace(/\\\\[^\\\s]+\\.+?(?=[.;,]\s|$)/g, "[path]")
        .replace(/\b[A-Za-z]:\/.+?(?=[.;,]\s|$)/g, "[path]")
        .replace(/\b[A-Za-z]:\\.+?(?=\.lock(?:[.;,\s]|$)|[.;,]\s|$)/g, "[path]")
        .replace(/(?<![:/\w])\/.+?(?=[.;,]\s|$)/g, "[path]")
        .replace(/\b[A-Za-z]:\\[^\s"'<>]+/g, "[path]")
        .replace(/(?<![:/\w])\/(?:[^\s"'<>]+\/?)+/g, "[path]")
        .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[redacted]")
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!summary) summary = "The request could not be completed.";
    return summary.length > maxLength ? `${summary.slice(0, maxLength - 3)}...` : summary;
}
