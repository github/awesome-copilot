import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("./ui.html", import.meta.url), "utf8");
const source = html.split("<script>")[1].split("// ---------- Panels ----------")[0];
const panelSource = html.split("<script>")[1].split("// Feed resize grip")[0];

function graph(width = 1000, height = 500, panels = false) {
  const labels = [], paths = [], arcs = [];
  const ctx = new Proxy({
    measureText: (text) => ({ width: text.length * 8 }),
    getImageData: () => ({ data: [13, 17, 23, 255] }),
    fillText: (text, x, y) => labels.push({ text, x, y }),
    moveTo: (x, y) => paths.push(["move", x, y]),
    lineTo: (x, y) => paths.push(["line", x, y]),
    arc: (x, y, r) => arcs.push({ x, y, r }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      style: { setProperty() {} }, clientWidth: width, clientHeight: height,
      innerHTML: "", checked: false, addEventListener() {}, getContext: () => ctx,
      contains: () => false, querySelectorAll: () => [],
    });
    return elements.get(id);
  };
  const sandbox = {
    document: { getElementById: element, createElement: element, body: element("body"), addEventListener() {} },
    window: { devicePixelRatio: 2 }, performance: { now: () => 1000 },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ backgroundColor: "#0d1117", getPropertyValue: () => "" }),
    ResizeObserver: class { observe() {} },
    requestAnimationFrame() {}, renderSidebar() {},
    getSelection: () => null, addEventListener() {},
  };
  vm.createContext(sandbox);
  vm.runInContext((panels ? panelSource : source) + `
    reduceMotion = true;
    globalThis.graph = { build, draw, pick, toggleSelect, nodeInfo, label, nodes, focusedNodes, messagePoint, drawMessages,
      setReducedMotion(value) { reduceMotion = value; },
      get messagePulses() { return messagePulses; },
      get links() { return links; }, get selected() { return selected; },
      get size() { return [W, H]; } };
  `, sandbox);
  // Sidebar rendering is covered by browser interaction checks.
  sandbox.sidebarArgs = null;
  sandbox.highlightCard = () => {};
  element("showIdle");
  return { api: sandbox.graph, elements, labels, paths, arcs };
}

function session(id, count = 0) {
  return {
    id, name: "Parent " + id, surface: "Copilot CLI", busy: true, waiting: false,
    lastEventAt: Date.now(), tokens: { in: 0, out: 0 },
    runningTools: [], flows: [], peers: [],
    subagents: Array.from({ length: count }, (_, i) => ({
      id: "child-" + i, name: "Worker " + i, running: true,
      model: "Demo model", doing: "Inspecting fabricated test files",
    })),
  };
}
const snapshot = (...sessions) => ({ now: Date.now(), sessions, ides: [] });

test("children stay below and inside their parent group, including large batches", () => {
  const { api, elements } = graph(420);
  api.build(snapshot(session("one", 40), session("two", 3)));
  assert.equal(api.size[0], 900);
  assert.equal(elements.get("graphHint").hidden, false);
  assert.ok(api.size[1] > 2200);
  const parent = api.nodes.get("s:one"), next = api.nodes.get("s:two");
  const children = [...api.nodes.values()].filter((n) => n.parent?.id === "one");
  assert.equal(children.length, 40);
  let previous = parent.ty;
  for (const child of children) {
    assert.ok(child.tx > parent.tx);
    assert.ok(child.ty - previous >= 52);
    assert.ok(child.ty + 20 < parent.ty + (parent.rows - .5) * parent.slot);
    assert.ok(child.tx + child.r + 7 + child.labelWidth < parent.familyRight);
    previous = child.ty;
  }
  assert.ok(next.ty - previous >= 52);
  assert.equal(api.links.filter((l) => l.kind === "sub").length, 43);
});

test("idle filtering keeps node identities and data flow attribution", () => {
  const { api, elements } = graph();
  const s = session("one", 2);
  s.subagents[1].running = false;
  s.flows.push({ sink: "Filesystem", agentId: "child-0", endAt: Date.now() });
  api.build(snapshot(s));
  const child = api.nodes.get("a:one:child-0");
  assert.ok(child);
  assert.ok(!api.nodes.has("a:one:child-1"));
  assert.equal(api.links.find((l) => l.kind === "flow").a, child.id);
  elements.get("showIdle").checked = true;
  api.build(snapshot(s));
  assert.equal(api.nodes.get(child.id), child);
  assert.ok(api.nodes.has("a:one:child-1"));
  s.subagents = [];
  api.build(snapshot(s));
  assert.ok(!api.nodes.has(child.id));
  assert.equal(api.links.find((l) => l.kind === "flow").a, "s:one");
});

test("drawing shows diamond, name, status and task with pixel-bounded labels", () => {
  const { api, labels, paths } = graph(900);
  const s = session("one", 1);
  s.subagents[0].name = "W".repeat(100);
  api.build(snapshot(s));
  api.draw(1000);
  const child = api.nodes.get("a:one:child-0");
  const lines = labels.filter((l) => l.x === child.x + child.r + 7);
  assert.equal(lines.length, 3);
  assert.ok(lines[0].text.endsWith("…"));
  assert.match(lines[1].text, /^Running/);
  assert.match(lines[2].text, /^Inspecting/);
  for (const line of lines) assert.ok(line.text.length * 8 <= child.labelWidth);
  assert.ok(paths.some(([kind, x, y]) => kind === "move" && x === child.x && y === child.y - child.r));
  assert.ok(paths.some(([kind, x, y]) => kind === "line" && x === child.x + child.r && y === child.y));
  assert.equal(api.pick(child.x, child.y), child);
  assert.match(api.nodeInfo(child), /in Parent one/);
  api.toggleSelect(child);
  assert.equal(api.selected, child);
  api.draw(1000);
  api.toggleSelect(child);
  assert.equal(api.selected, null);
});

test("completed and tool-free subagents retain explicit status and task text", () => {
  const { api, elements, labels } = graph();
  const s = session("one", 2);
  s.subagents[0].running = false;
  s.subagents[0].doing = "";
  s.subagents[1].doing = "";
  elements.get("showIdle").checked = true;
  api.build(snapshot(s));
  api.draw(1000);
  assert.ok(labels.some((l) => l.text.startsWith("Done")));
  assert.ok(labels.some((l) => l.text === "Task complete"));
  assert.ok(labels.some((l) => l.text === "Thinking"));
});

test("empty snapshots and wide layouts remain finite and bounded", () => {
  const { api } = graph(1600, 800);
  api.build(snapshot());
  api.draw(1000);
  assert.equal(api.size[0], 1600);
  assert.equal(api.nodes.size, 1);
  api.build(snapshot(session("one", 2)));
  for (const n of api.nodes.values()) {
    assert.ok(Number.isFinite(n.tx) && Number.isFinite(n.ty));
    assert.ok(n.ty + 20 < api.size[1]);
  }
});

test("background shells stay visible under idle or disconnected owners without becoming agents", () => {
  const { api, elements, labels } = graph(1000, 500, true);
  const s = session("owner", 1);
  s.busy = false;
  s.live = false;
  s.subagents[0].running = false;
  s.backgroundShells = [{ id: "preview-server", pid: 123, startedAt: Date.now() - 3600000 }];
  api.build(snapshot(s));
  const parent = api.nodes.get("s:owner"), shell = api.nodes.get("b:owner:preview-server");
  assert.ok(parent && shell);
  assert.equal(shell.type, "shell");
  assert.equal(parent.rows, 2);
  assert.equal(api.nodes.has("a:owner:child-0"), false);
  assert.equal(api.links.filter((l) => l.kind === "sub").length, 0);
  assert.equal(api.links.filter((l) => l.kind === "background").length, 1);
  assert.equal(elements.get("sBusy").textContent, 0);
  assert.equal(elements.get("sSub").textContent, 0);
  assert.equal(elements.get("sShell").textContent, 1);
  assert.equal(elements.get("sAll").textContent, 1);
  assert.match(elements.get("list").innerHTML, /running background shell/);
  api.draw(1000);
  assert.ok(labels.some((l) => l.text === "Running · background shell"));
  assert.ok(labels.some((l) => l.text === "Detached process · PID 123"));
  assert.ok(shell.ty > parent.ty && shell.ty + 20 < parent.ty + (parent.rows - .5) * parent.slot);
  assert.equal(api.pick(shell.x, shell.y), shell);
  assert.match(api.nodeInfo(shell), /not a sub-agent/);
  assert.match(api.nodeInfo(shell), /Owner not connected/);
  api.toggleSelect(shell);
  assert.match(elements.get("list").innerHTML, /<details[^>]* open/);
  assert.match(elements.get("list").innerHTML, /background shell · running · pid 123/);
  elements.get("showIdle").checked = true;
  api.build(snapshot(s));
  assert.equal(api.nodes.get(shell.id), shell);
  assert.equal(api.nodes.get(parent.id).rows, 3);
  assert.equal(elements.get("sSub").textContent, 0);
  s.backgroundShells = [];
  api.build(snapshot(s));
  assert.equal(api.nodes.has(shell.id), false);
  assert.equal(api.selected, null);
  elements.get("showIdle").checked = false;
  api.build(snapshot(s));
  assert.equal(api.nodes.has(parent.id), false);
  assert.equal(elements.get("sShell").textContent, 0);
});

test("idle parent → child session → subagent remains a durable, nested ownership chain", () => {
  const { api, elements, labels } = graph(420, 500, true);
  const parent = session("parent"), child = session("child", 2), sibling = session("sibling");
  parent.busy = false;
  parent.surface = "Copilot app";
  parent.childSessions = [child.id, sibling.id];
  parent.peers = [{ to: child.id, kind: "spawn", at: Date.now() - 86400000 }];
  child.surface = "Copilot CLI";
  child.backgroundShells = [{ id: "server", pid: 123, startedAt: Date.now() }];
  child.flows = [{ sink: "Filesystem", agentId: "child-0", endAt: Date.now() }];
  api.build(snapshot(child, sibling, parent));
  const root = api.nodes.get("s:parent"), branch = api.nodes.get("s:child");
  const worker = api.nodes.get("a:child:child-0"), shell = api.nodes.get("b:child:server");
  assert.ok(root.s.contextOnly);
  assert.equal(branch.parentSessionID, root.id);
  assert.ok(branch.tx > root.tx && worker.tx > branch.tx);
  assert.ok(branch.ty > root.ty && worker.ty > branch.ty);
  assert.ok(shell.ty + 20 < branch.ty + (branch.rows - .5) * branch.slot);
  assert.ok(shell.ty + 20 < root.ty + (root.rows - .5) * root.slot);
  assert.equal(api.links.filter((l) => l.kind === "child").length, 2);
  assert.ok(!api.links.some((l) => l.kind === "own" && l.b === branch.id));
  assert.ok(!api.links.some((l) => l.kind === "peer"));
  const focused = api.focusedNodes(worker);
  assert.ok(focused.has(root.id) && focused.has(branch.id) && focused.has("k:Filesystem"));
  assert.ok(!focused.has("s:sibling") && !focused.has(shell.id) && !focused.has("a:child:child-1"));
  const sinkFocus = api.focusedNodes(api.nodes.get("k:Filesystem"));
  assert.ok(sinkFocus.has(root.id) && sinkFocus.has(worker.id));
  assert.ok(!sinkFocus.has("s:sibling"));
  api.draw(1000);
  assert.ok(labels.some((l) => l.text.startsWith("Idle parent context")));
  assert.ok(labels.some((l) => l.text.startsWith("Child session")));
  assert.match(api.nodeInfo(branch), /Child session of Parent parent/);
  assert.equal(elements.get("sBusy").textContent, 2);
  assert.equal(elements.get("sSub").textContent, 2);
  assert.equal(elements.get("sShell").textContent, 1);
  child.busy = false;
  child.subagents.forEach((a) => a.running = false);
  child.backgroundShells = [];
  sibling.busy = false;
  api.build(snapshot(parent, child, sibling));
  assert.equal(api.nodes.has(root.id), false);
  elements.get("showIdle").checked = true;
  api.build(snapshot(parent, child, sibling));
  assert.equal(api.nodes.get(branch.id).parentSessionID, root.id);
});

test("messages travel once along ownership in the correct direction, without extra edges", () => {
  const { api } = graph();
  const a = session("a"), b = session("b");
  a.childSessions = [b.id];
  const snap = snapshot(a, b);
  a.peers = [{ id: "history", to: b.id, kind: "message", at: snap.now - 1000 }];
  api.build(snap);
  assert.equal(api.messagePulses.length, 0);
  a.peers.push({ id: "new", to: b.id, kind: "message", at: snap.now + 1 });
  snap.now += 2;
  api.build(snap);
  api.draw(1000);
  assert.equal(api.messagePulses.length, 1);
  const forward = api.messagePulses[0], source = api.nodes.get("s:a"), target = api.nodes.get("s:b");
  assert.equal(api.messagePoint(forward, 0)[1], source.y + source.r);
  assert.equal(api.messagePoint(forward, 1)[1], target.y);
  assert.equal(api.links.filter((l) => l.kind === "child").length, 1);
  assert.ok(!api.links.some((l) => l.kind === "peer"));
  api.build(snap);
  assert.equal(api.messagePulses.length, 1);
  b.peers.push({ id: "reply", to: a.id, kind: "message", at: snap.now + 1 });
  snap.now += 2;
  api.build(snap);
  const reverse = api.messagePulses[1];
  assert.equal(api.messagePoint(reverse, 0)[1], target.y);
  assert.equal(api.messagePoint(reverse, 1)[1], source.y + source.r);
  api.drawMessages(2201);
  assert.equal(api.messagePulses.length, 0);
  api.build(snap);
  assert.equal(api.messagePulses.length, 0);
});

test("unrelated messages are transient only and reduced motion stays stationary", () => {
  const { api, arcs } = graph();
  const a = session("a"), b = session("b");
  const snap = snapshot(a, b);
  api.build(snap);
  a.peers.push({ id: "new", to: b.id, kind: "message", at: snap.now + 1 });
  snap.now += 2;
  api.build(snap);
  const receiver = api.nodes.get("s:b");
  assert.equal(receiver.parentSessionID, null);
  assert.ok(!api.links.some((l) => l.kind === "child" || l.kind === "peer"));
  api.drawMessages(1000);
  api.drawMessages(1800);
  assert.deepEqual(arcs.slice(-2), [
    { x: receiver.x, y: receiver.y - receiver.r - 7, r: 3.5 },
    { x: receiver.x, y: receiver.y - receiver.r - 7, r: 3.5 },
  ]);
  api.setReducedMotion(false);
  const pulse = api.messagePulses[0];
  assert.notEqual(api.messagePoint(pulse, .2)[1], api.messagePoint(pulse, .8)[1]);
  api.drawMessages(2201);
  assert.equal(api.messagePulses.length, 0);
  const message = a.peers.pop();
  api.build(snap);
  a.peers.push(message);
  api.build(snap);
  assert.equal(api.messagePulses.length, 0);
});

test("nested ancestry is cycle safe, deterministic, and never creates missing or alias nodes", () => {
  const { api } = graph(420);
  const a = session("a"), b = session("b"), c = session("c", 1);
  a.busy = b.busy = false;
  a.childSessions = [b.id, "missing-app-alias", a.id];
  b.childSessions = [c.id];
  c.childSessions = [a.id];
  api.build(snapshot(c, b, a));
  assert.ok(api.nodes.has("s:a") && api.nodes.has("s:b") && api.nodes.has("s:c"));
  assert.ok(!api.nodes.has("s:missing-app-alias"));
  assert.equal(api.links.filter((l) => l.kind === "child").length, 2);
  assert.ok(api.nodes.get("s:a").ty < api.nodes.get("s:b").ty);
  assert.ok(api.nodes.get("s:b").ty < api.nodes.get("s:c").ty);
  assert.ok(api.size[0] >= 1060);
});

test("resumed background agents reappear under the same owner, completed history stays opt-in", () => {
  const { api, elements } = graph(1000, 500, true);
  const s = session("owner", 4);
  s.busy = false;
  s.backgroundShells = [{ id: "server", pid: 123, startedAt: Date.now() }];
  s.subagents.forEach((a) => { a.running = false; a.mode = "background"; });
  api.build(snapshot(s));
  assert.equal([...api.nodes.values()].filter((n) => n.type === "agent").length, 0);
  assert.match(elements.get("subHistory").textContent, /4 inactive hidden/);
  elements.get("showIdle").checked = true;
  api.build(snapshot(s));
  assert.equal([...api.nodes.values()].filter((n) => n.type === "agent").length, 4);
  assert.equal(elements.get("subHistory").textContent, " · 4 inactive");
  elements.get("showIdle").checked = false;
  s.subagents[3].running = true;
  s.flows = [{ sink: "Filesystem", agentId: "child-3", endAt: Date.now() }];
  api.build(snapshot(s));
  assert.equal([...api.nodes.values()].filter((n) => n.type === "agent").length, 1);
  assert.match(elements.get("subHistory").textContent, /3 inactive hidden/);
  assert.equal(api.links.find((l) => l.kind === "flow").a, "a:owner:child-3");
  assert.equal(api.nodes.get("a:owner:child-3").parent.id, s.id);
  assert.equal(api.nodes.get("b:owner:server").type, "shell");
});
