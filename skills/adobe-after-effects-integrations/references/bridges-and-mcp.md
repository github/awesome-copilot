# Bridges and MCP Servers for After Effects

How a process outside After Effects gets work done inside it, and how to put
an MCP server in front of that safely. The ExtendScript each bridge runs is
covered by the adobe-after-effects-scripting skill.

## The four bridges

### 1. Command line

- Windows: `AfterFX.exe -r <file>` runs a script "in the existing instance";
  `-s "<code>"` runs a string.
- macOS: AppleScript `DoScriptFile` or `DoScript`, which needs the calling
  app to have Automation permission for After Effects.
- Nothing comes back on stdout. `app.exitCode` is returned on the command
  line on Windows and as the `DoScript` result on macOS; anything richer goes
  through a file. The SDK guide notes `AfterFX.com` as the way to get console
  feedback on Windows.
- Third-party tools report that instances started with `-m` do not receive
  `-r` scripts, and that a modal dialog blocks every script until it closes.

Good for a pipeline step that runs a known script. Poor for a conversation of
many small calls, because each one starts a process.

### 2. File mailbox

A ScriptUI panel or a `Startup` script polls a folder:

```jsx
/* Inside After Effects. ES3; JSON comes from json2.js. */
var acmeMailbox = new Folder(Folder.temp.fsName + "/acme-ae-bridge");
var acmeTaskId = app.scheduleTask("acmeCheckMailbox()", 1000, true);

function acmeCheckMailbox() {
    var command = new File(acmeMailbox.fsName + "/command.json");
    if (!command.exists) { return; }
    command.encoding = "UTF-8";
    command.open("r");
    var text = command.read();
    command.close();
    command.remove();                 /* consume it first, so a bad command cannot repeat */
    var reply;
    try {
        var request = JSON.parse(text);
        reply = acmeRun(request);     /* dispatch to a known command, inside an undo group */
    } catch (err) {
        reply = { ok: false, error: err.toString(), line: err.line };
    }
    acmeWriteAtomically(acmeMailbox.fsName + "/result.json", JSON.stringify(reply));
}
```

`acmeRun` and `acmeWriteAtomically` are the bridge's own helpers: a lookup
from command name to function, and a write to a temporary file followed by a
rename.

- Pure ExtendScript, no listening port. Needs **Allow Scripts To Write Files
  And Access Network**.
- Write every file under a temporary name and rename it into place, on both
  sides, so neither reads half a file.
- Consume the command file before parsing it, and answer a request that fails
  to parse or run with an error reply. An exception that escapes the
  scheduled task repeats on every poll and the client never hears back.
- Give each request an ID and echo it in the reply, so a slow reply is never
  mistaken for the answer to a newer request.
- Latency is the polling interval; `app.cancelTask(acmeTaskId)` stops it.
- Dispatch only to known commands. A mailbox that evaluates whatever it is
  handed lets any process able to write the folder run code in After
  Effects.

### 3. Server in a CEP panel

Node.js in a CEP panel listens on loopback and answers each request with
`evalScript`:

- Bind to `127.0.0.1`, never `0.0.0.0`.
- Require a long random token, generated per session and handed to the
  client out of band.
- Refuse requests that carry an `Origin` or `Referer` header, so a web page in
  a browser cannot reach the server through the user's machine.
- Serialize arguments as JSON and parse them in the host script.
- CEP is scheduled to be off by default in After Effects from December 2028
  and removed at the end of 2029, so plan a UXP or native successor.

### 4. AEGP

A C++ plugin runs a socket on its own thread, queues requests, and wakes the
main thread with `AEGP_CauseIdleRoutinesToBeCalled()`. Its idle hook runs each
request with `AEGP_ExecuteScript` and replies with the script's last-line
value. Fastest and needs no panel, at the cost of native builds per platform
and the main-thread-only rule.

## An MCP server in front

### Protocol

- Servers expose **tools** (model-controlled), **resources**
  (application-controlled) and **prompts** (user-controlled).
- Transports are **stdio** and **Streamable HTTP**. A stdio server writes
  nothing to stdout except valid MCP messages; logs go to stderr.
- The specification's current revision is **2026-07-28**. It changed sessions
  and the HTTP transport, so examples written for 2025-11-25 and earlier may
  be legacy. Let the SDK handle the protocol, and check which revision it
  implements.
- SDKs: TypeScript (v2 packages `@modelcontextprotocol/server` and
  `@modelcontextprotocol/client`; v1's `@modelcontextprotocol/sdk` receives
  fixes for at least six months after v2's July 2026 release) and Python
  (`mcp` on PyPI).

### Security

From the specification and its security best practices:

- Prefer **stdio** for a local server: only the client that started it can
  talk to it.
- Over HTTP, "Servers MUST validate the Origin header on all incoming
  connections to prevent DNS rebinding attacks", should bind only to
  `127.0.0.1`, and should authenticate every connection, with a token or a
  local IPC channel.

For After Effects in particular:

- **Specific tools over a run-anything tool.** `create_composition`,
  `add_layer`, `set_property`, `queue_render` and `describe_project` each
  check their arguments. A tool that runs arbitrary ExtendScript is code
  execution in an application that may be allowed to write files and reach
  the network; if it exists, keep it off unless the user turns it on, and say
  so in its description.
- **No string building.** Send arguments as data, parse them inside After
  Effects, and never splice model output into a script.
- **One request at a time.** All work lands on After Effects' main thread.
  Queue, time out, and return "After Effects is busy" when a render or a
  dialog holds it.
- **Undo groups per tool call**, named after the tool, so a person can undo
  an agent's change.
- **Structured errors.** Return the ExtendScript error message and line, not
  just "failed".
- **Paths:** resolve any path a tool receives against an allowed folder, and
  refuse anything outside it.

## Open-source servers, for reference

These are what their READMEs described as of November 2026. Read the current
code before reusing any of it.

| Project | How it reaches After Effects |
| --- | --- |
| `Dakkshin/after-effects-mcp` | Installs a ScriptUI panel (`Window > mcp-bridge-auto.jsx`) that polls a command file with `app.scheduleTask` and writes a result file: the file mailbox. |
| `solomondivyananth/aftereffects-mcp` | stdio to a Node.js server, HTTP on a loopback port to a CEP panel, then `evalScript`. Loopback only, a 256-bit token, and requests with an `Origin` or `Referer` refused. |
| `JUNKDOGE-JOE/after-effects-mcp` | The MCP server runs in the CEP panel's Node.js host on a loopback HTTP port, with a stdio connector for clients. |
| `kumoproductions/mcp-aftereffects` | No panel by default: runs scripts with `-r` launches (Automation permission on macOS), with an optional `Startup` script that polls a mailbox in the temp folder. |
