const token = new URLSearchParams(location.search).get("token");
const endpoint = path => `${path}?token=${encodeURIComponent(token)}`;
const board = document.querySelector("#board");
const errorBox = document.querySelector("#error");
const undoButton = document.querySelector("#undo");
const dialog = document.querySelector("#restart-dialog");
const number = new Intl.NumberFormat("en-US");
let state;
let pending = Promise.resolve();
let connected = false;
let storageError = false;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const animations = new Set();
const motionLayer = document.createElement("div");
motionLayer.className = "motion-layer";
motionLayer.setAttribute("aria-hidden", "true");
board.parentElement.append(motionLayer);
const cells = Array.from({ length: 16 }, () => {
    const cell = document.createElement("div");
    cell.className = "tile";
    board.append(cell);
    return cell;
});

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function clearMotion() {
    for (const animation of animations) {
        animation.onfinish = null;
        animation.cancel();
    }
    animations.clear();
    motionLayer.replaceChildren();
    cells.forEach(cell => cell.classList.remove("in-flight"));
}

function animateMove(motion) {
    const merged = new Set(motion.merges);
    const moving = motion.movements.filter(tile => tile.from !== tile.to || merged.has(tile.to));
    if (!moving.length) return;
    // Layout offsets exclude the spawn/pulse transforms on the final board.
    const rects = cells.map(cell => ({
        left: cell.offsetLeft, top: cell.offsetTop,
        width: cell.offsetWidth, height: cell.offsetHeight,
    }));
    const arrivals = new Set(moving.map(tile => tile.to));
    arrivals.forEach(index => cells[index].classList.add("in-flight"));
    let remaining = moving.length;
    for (const tile of moving) {
        const source = rects[tile.from];
        const target = rects[tile.to];
        const ghost = document.createElement("div");
        ghost.className = `tile motion-tile${tile.value >= 1024 ? " large" : ""}`;
        ghost.dataset.level = Math.min(11, Math.log2(tile.value));
        ghost.textContent = tile.value;
        Object.assign(ghost.style, {
            left: `${source.left}px`, top: `${source.top}px`,
            width: `${source.width}px`, height: `${source.height}px`,
        });
        motionLayer.append(ghost);
        const animation = ghost.animate([
            { transform: "translate(0, 0)" },
            { transform: `translate(${target.left - source.left}px, ${target.top - source.top}px)` },
        ], { duration: 120, easing: "ease-out", fill: "forwards" });
        animations.add(animation);
        animation.onfinish = () => {
            if (--remaining) return;
            clearMotion();
            for (const index of merged) {
                const pulse = cells[index].animate([
                    { transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" },
                ], { duration: 100, easing: "ease-out" });
                animations.add(pulse);
                pulse.onfinish = () => { animations.delete(pulse); pulse.cancel(); };
            }
        };
    }
}

function render(next) {
    // SSE and HTTP can deliver the same update, or an older HTTP reply after newer SSE.
    if (state?.update && next.update?.stream === state.update.stream
        && next.update.revision <= state.update.revision) return;
    const motion = state?.update && next.update?.stream === state.update.stream
        && next.update.revision === state.update.revision + 1
        && next.update.motion?.from.every((value, index) => value === state.board[index])
        ? next.update.motion : null;
    clearMotion();
    cells.forEach((cell, index) => {
        const value = next.board[index];
        const spawned = value && index === next.spawnedIndex;
        cell.className = `tile${value >= 1024 ? " large" : ""}`;
        if (spawned) cell.classList.add("spawned");
        cell.dataset.level = value ? Math.min(11, Math.log2(value)) : 0;
        cell.textContent = value || "";
        cell.setAttribute("aria-label", `Row ${Math.floor(index / 4) + 1}, column ${index % 4 + 1}: ${value || "empty"}${spawned ? " (new tile)" : ""}`);
    });
    document.querySelector("#score").textContent = number.format(next.score);
    document.querySelector("#best").textContent = number.format(next.best);
    document.querySelector("#moves").textContent = `${number.format(next.moves)} ${next.moves === 1 ? "move" : "moves"}`;
    document.querySelector("#status").textContent = next.gameOver
        ? "No moves left. Undo or start a new game."
        : next.won ? "2048 reached! You can keep playing." : "Your move.";
    document.querySelector("#game-over").hidden = !next.gameOver;
    undoButton.disabled = !next.canUndo;
    state = next;
    if (motion && !reducedMotion.matches) animateMove(motion);
}

reducedMotion.addEventListener("change", clearMotion);
window.addEventListener("resize", clearMotion);

function command(action, direction) {
    pending = pending.then(async () => {
        const response = await fetch(endpoint("/command"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, direction }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error ${response.status}`);
        storageError = false;
        if (connected) errorBox.hidden = true;
        render(result);
    }).catch(error => {
        storageError = true;
        showError(`Move not confirmed: ${error.message}`);
    });
    return pending;
}

function requestRestart() {
    if (!dialog.open) {
        dialog.returnValue = "";
        dialog.showModal();
    }
}
dialog.addEventListener("close", () => {
    if (dialog.returnValue === "restart") void command("new");
    board.focus({ preventScroll: true });
});
document.querySelector("#new").addEventListener("click", requestRestart);
undoButton.addEventListener("click", () => { void command("undo"); board.focus({ preventScroll: true }); });
document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => {
        void command("move", button.dataset.direction);
        board.focus({ preventScroll: true });
    });
});
const keys = {
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
    a: "left", d: "right", w: "up", s: "down",
};
document.addEventListener("keydown", event => {
    if (dialog.open || event.isComposing || event.altKey
        || event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
        event.preventDefault();
        if (!event.repeat) void command("undo");
        return;
    }
    if (event.ctrlKey || event.metaKey) return;
    if (keys[key]) {
        event.preventDefault();
        void command("move", keys[key]);
    } else if (key === "u") {
        event.preventDefault();
        if (!event.repeat) void command("undo");
    } else if (key === "n") {
        event.preventDefault();
        if (!event.repeat) requestRestart();
    }
});
let start;
board.addEventListener("pointerdown", event => {
    board.focus({ preventScroll: true });
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    board.setPointerCapture(event.pointerId);
});
board.addEventListener("pointercancel", () => { start = undefined; });
board.addEventListener("pointerup", event => {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    void command("move", direction);
});

const events = new EventSource(endpoint("/events"));
events.addEventListener("message", event => {
    try { render(JSON.parse(event.data)); }
    catch (error) { showError(`Invalid game state: ${error.message}`); }
});
events.addEventListener("open", () => {
    connected = true;
    if (!storageError) errorBox.hidden = true;
});
events.addEventListener("error", () => {
    connected = false;
    showError("Connection lost. Reconnecting automatically; your game is still saved.");
});
window.addEventListener("pagehide", () => { clearMotion(); events.close(); });
board.focus({ preventScroll: true });
