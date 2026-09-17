/************************************************************************
 * HostBridge - Thin abstraction over the VS Code webview messaging API. *
 *                                                                       *
 * The simulator runs in two places: inside a VS Code webview panel and  *
 * as a plain page in a browser. Everything that needs the extension     *
 * host (config injection, saving renderMap.json) goes through here so   *
 * the rest of the code stays identical in both environments.            *
 *                                                                       *
 * In the browser the API is absent and every call degrades to a no-op,  *
 * leaving the original web behavior in place.                           *
 ***********************************************************************/
var HostBridge = (function () {

    var api = null;
    var handlers = {};

    // acquireVsCodeApi exists only inside a webview, and may be called
    // exactly once per page load
    if (typeof acquireVsCodeApi === 'function') {
        try {
            api = acquireVsCodeApi();
        } catch (e) {
            api = null;
        }
    }

    if (api) {
        window.addEventListener('message', function (event) {
            var message = event.data;
            if (!message || !message.command) return;
            var fn = handlers[message.command];
            if (fn) fn(message);
        });
    }

    /**
     * True when running inside the VS Code webview panel.
     */
    function isHosted() {
        return api !== null;
    }

    /**
     * Send a message to the extension host. No-op in the browser.
     */
    function post(message) {
        if (api) api.postMessage(message);
    }

    /**
     * Register a handler for a command sent by the extension host.
     */
    function on(command, fn) {
        handlers[command] = fn;
    }

    /**
     * Render configuration injected by the extension host, or null when
     * running as a standalone page.
     */
    function getInjectedConfig() {
        return (window.__flightMapConfig && typeof window.__flightMapConfig === 'object')
            ? window.__flightMapConfig
            : null;
    }

    return {
        isHosted: isHosted,
        post: post,
        on: on,
        getInjectedConfig: getInjectedConfig
    };
})();
