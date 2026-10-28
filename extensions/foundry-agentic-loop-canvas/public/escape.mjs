const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Escapes text for HTML element content and quoted attribute values.
export const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ENTITIES[char]);

// The GitHub Copilot App opens canvas links in the system browser but ignores these loopback hosts.
export function isLoopback(href) {
    try {
        const host = new URL(href).hostname;
        return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) || host.endsWith(".localhost");
    } catch { return false; }
}
