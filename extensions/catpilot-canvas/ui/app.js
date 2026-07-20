/* CatPilot canvas SPA. Vanilla JS, no build step, no external deps. */
(() => {
    "use strict";

    // ---------------------------------------------------------------- helpers
    const $ = (sel, root = document) => root.querySelector(sel);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const todayISO = () => new Date().toISOString().split("T")[0];

    function el(tag, attrs = {}, ...kids) {
        const n = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v == null || v === false) continue;
            if (k === "class") n.className = v;
            else if (k === "html") n.innerHTML = v;
            else if (k === "text") n.textContent = v;
            else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
            else if (k === "dataset") Object.assign(n.dataset, v);
            else n.setAttribute(k, v);
        }
        for (const kid of kids.flat()) {
            if (kid == null || kid === false) continue;
            n.append(kid.nodeType ? kid : document.createTextNode(kid));
        }
        return n;
    }

    async function api(path, { method = "GET", body } = {}) {
        const res = await fetch(path, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data.error || `Request failed (${res.status})`);
            err.code = data.code; err.status = res.status;
            throw err;
        }
        return data;
    }

    function toast(title, sub, kind = "") {
        const icon = kind === "err" ? "!" : kind === "ok" ? "✓" : "😺";
        const t = el("div", { class: `toast ${kind}` },
            el("div", { class: "t-ic", text: icon }),
            el("div", {}, el("strong", { text: title }), sub ? el("span", { text: sub }) : null));
        $("#toasts").append(t);
        setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(20px)"; setTimeout(() => t.remove(), 250); }, 3200);
    }

    // ---------------------------------------------------------------- modal
    let modalReturnFocus = null;
    function openModal({ title, body, foot, width }) {
        closeModal();
        modalReturnFocus = document.activeElement;
        const backdrop = el("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) closeModal(); } });
        const titleId = `modal-title-${Date.now()}`;
        const modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabindex: "-1" });
        if (width) modal.style.width = `min(${width}px, 100%)`;
        modal.append(
            el("div", { class: "modal-head" },
                el("h3", { id: titleId, text: title }),
                el("button", { class: "icon-btn", text: "✕", "aria-label": "Close dialog", onclick: closeModal })),
            el("div", { class: "modal-body" }, body),
            foot ? el("div", { class: "modal-foot" }, foot) : null,
        );
        backdrop.append(modal);
        $("#modal-root").append(backdrop);
        document.addEventListener("keydown", escClose);
        modal.addEventListener("keydown", trapFocus);
        const focusables = modal.querySelectorAll("a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])");
        (focusables[0] || modal).focus();
        return { close: closeModal, modal };
    }
    function trapFocus(e) {
        if (e.key !== "Tab") return;
        const modal = e.currentTarget;
        const f = [...modal.querySelectorAll("a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")]
            .filter((n) => n.offsetParent !== null || n === document.activeElement);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function escClose(e) { if (e.key === "Escape") closeModal(); }
    function closeModal() {
        $("#modal-root").innerHTML = "";
        document.removeEventListener("keydown", escClose);
        if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
            try { modalReturnFocus.focus(); } catch { /* */ }
        }
        modalReturnFocus = null;
    }

    // ---------------------------------------------------------------- state
    const state = { summary: null, theme: localStorage.getItem("cp-theme") || "dark", view: "dashboard" };

    const NAV = [
        { id: "dashboard", icon: "◆", label: "Dashboard" },
        { id: "timeline", icon: "🕑", label: "Timeline" },
        { id: "tasks", icon: "✓", label: "Tasks", countKey: "tasksOpen" },
        { id: "journal", icon: "✎", label: "Journal", countKey: "journal" },
        { id: "milestones", icon: "⚑", label: "Milestones", countKey: "milestones" },
        { id: "memos", icon: "▤", label: "Memos", countKey: "memos" },
        { id: "learning", icon: "🎓", label: "Learning", countKey: "learning" },
        { id: "growth", icon: "↗", label: "Growth", countKey: "growth" },
        { id: "projects", icon: "❏", label: "Projects", countKey: "projects" },
        { id: "reports", icon: "📊", label: "Reports" },
        { id: "settings", icon: "⚙️", label: "Settings", footer: true },
        { id: "help", icon: "❔", label: "Help", footer: true },
    ];

    const VIEW_SUB = {
        dashboard: "Your CatPilot at a glance",
        timeline: "A running story of what you've done",
        tasks: "Capture, organize and complete work",
        journal: "Daily notes and decisions",
        milestones: "Track goals to completion",
        memos: "Handoffs, summaries and notes",
        learning: "Certifications and study topics",
        growth: "Accomplishments and impact log",
        projects: "Lightweight project status",
        reports: "Executive reports from your data",
        settings: "Storage, migration and preferences",
        help: "Capabilities and how to use this canvas",
    };

    // ---------------------------------------------------------------- theme
    function applyTheme() {
        document.documentElement.setAttribute("data-theme", state.theme);
        const btn = $("#theme-btn");
        if (btn) btn.textContent = state.theme === "dark" ? "☀️" : "🌙";
    }
    function toggleTheme() { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("cp-theme", state.theme); applyTheme(); }

    // ---------------------------------------------------------------- badges
    function priorityClass(p) {
        const k = (p || "").toUpperCase().replace(/\s/g, "");
        if (k === "P0" || k === "HIGH") return "p0";
        if (k === "P1") return "p1";
        if (k === "P2" || k === "MED" || k === "MEDIUM") return "p2";
        if (k === "P3" || k === "LOW") return "p3";
        return "";
    }
    function priorityBadge(p) { return p ? el("span", { class: `badge ${priorityClass(p)}`, text: p }) : el("span", { class: "muted small", text: "—" }); }
    function statusBadge(s) {
        const k = (s || "").toLowerCase().replace(/\s/g, "");
        const cls = k === "done" ? "st-done" : k === "inprogress" ? "st-inprogress" : k === "planned" ? "st-planned" : "st-open";
        return el("span", { class: `badge ${cls}`, text: s || "Open" });
    }
    function tagChips(tags) {
        const list = String(tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        if (!list.length) return el("span", { class: "muted small", text: "—" });
        return el("div", { class: "tags" }, list.map((t) => el("span", { class: "tag", text: t })));
    }

    // ---------------------------------------------------------------- charts
    function donut(segments, size = 150) {
        const total = segments.reduce((a, s) => a + s.value, 0);
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.setAttribute("width", size); svg.setAttribute("height", size);
        const cx = size / 2, cy = size / 2, r = size / 2 - 14, C = 2 * Math.PI * r;
        const track = document.createElementNS(NS, "circle");
        track.setAttribute("cx", cx); track.setAttribute("cy", cy); track.setAttribute("r", r);
        track.setAttribute("fill", "none"); track.setAttribute("stroke", "var(--panel-2)"); track.setAttribute("stroke-width", 16);
        svg.append(track);
        let offset = 0;
        if (total > 0) {
            for (const s of segments) {
                if (!s.value) continue;
                const frac = s.value / total;
                const c = document.createElementNS(NS, "circle");
                c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", r);
                c.setAttribute("fill", "none"); c.setAttribute("stroke", s.color); c.setAttribute("stroke-width", 16);
                c.setAttribute("stroke-dasharray", `${C * frac} ${C}`);
                c.setAttribute("stroke-dashoffset", -C * offset);
                c.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
                c.setAttribute("stroke-linecap", "round");
                svg.append(c);
                offset += frac;
            }
        }
        const t1 = document.createElementNS(NS, "text");
        t1.setAttribute("x", cx); t1.setAttribute("y", cy - 2); t1.setAttribute("text-anchor", "middle");
        t1.setAttribute("font-size", "26"); t1.setAttribute("font-weight", "800"); t1.setAttribute("fill", "var(--text)");
        t1.textContent = total;
        const t2 = document.createElementNS(NS, "text");
        t2.setAttribute("x", cx); t2.setAttribute("y", cy + 16); t2.setAttribute("text-anchor", "middle");
        t2.setAttribute("font-size", "11"); t2.setAttribute("fill", "var(--text-faint)");
        t2.textContent = "total";
        svg.append(t1, t2);
        return svg;
    }

    function stackedBars(days) {
        const series = [
            { key: "journal", color: "#7c5cff", label: "Journal" },
            { key: "memos", color: "#ff7ac2", label: "Memos" },
            { key: "notes", color: "#5aa9ff", label: "Notes" },
        ];
        const max = Math.max(1, ...days.map((d) => series.reduce((a, s) => a + (d[s.key] || 0), 0)));
        const bars = el("div", { class: "bars" });
        for (const d of days) {
            const stack = el("div", { class: "bar-stack" });
            for (const s of series) {
                const v = d[s.key] || 0;
                if (!v) continue;
                const seg = el("div", { class: "bar-seg" });
                seg.style.height = `${(v / max) * 130}px`;
                seg.style.background = s.color;
                seg.title = `${s.label}: ${v}`;
                stack.append(seg);
            }
            const label = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
            bars.append(el("div", { class: "bar-col" }, stack, el("div", { class: "bar-label", text: label })));
        }
        const legend = el("div", { class: "legend" }, series.map((s) =>
            el("span", {}, el("i", { style: `background:${s.color}` }), s.label)));
        return el("div", {}, bars, legend);
    }

    // ---------------------------------------------------------------- nav
    function renderNav() {
        const nav = $("#nav");
        nav.innerHTML = "";
        const counts = state.summary?.counts || {};
        let footerStarted = false;
        for (const item of NAV) {
            if (item.footer && !footerStarted) { footerStarted = true; nav.append(el("div", { class: "nav-spacer" })); }
            const count = item.countKey ? counts[item.countKey] : null;
            const node = el("button", {
                type: "button",
                class: `nav-item ${state.view === item.id ? "active" : ""}`,
                "aria-current": state.view === item.id ? "page" : null,
                onclick: () => go(item.id),
            },
                el("span", { class: "nav-ic", text: item.icon, "aria-hidden": "true" }),
                el("span", { text: item.label }),
                count ? el("span", { class: "nav-badge", text: String(count) }) : null);
            nav.append(node);
        }
        const chip = $("#storage-chip");
        if (state.summary?.storageRoot) {
            chip.textContent = `📁 ${state.summary.storageRoot.split(/[\\/]/).slice(-2).join("/")}`;
            chip.title = `${state.summary.storageRoot}  ·  ${state.summary.partition}`;
        }
    }

    // ---------------------------------------------------------------- router
    // Views append asynchronously; a fast A→B navigation must not let A's late
    // resolution paint into B's screen. Each navigation gets a token and builds
    // into detached staging nodes, committing to the DOM only if it is still the
    // current navigation.
    let navToken = 0;
    let actionsHost = $("#view-actions");
    async function go(view) {
        const token = ++navToken;
        state.view = view;
        location.hash = view;
        $("#view-title").textContent = NAV.find((n) => n.id === view)?.label || "CatPilot";
        $("#view-sub").textContent = VIEW_SUB[view] || "";
        renderNav();
        const stage = el("div");
        const actionStage = el("div");
        actionsHost = actionStage;
        stage.append(el("div", { class: "spinner" }));
        $("#content").innerHTML = "";
        $("#content").append(el("div", { class: "spinner" }));
        try {
            await VIEWS[view](stage);
        } catch (err) {
            stage.innerHTML = "";
            stage.append(errorBox(err));
        }
        if (token !== navToken) return; // superseded by a newer navigation
        const content = $("#content");
        content.innerHTML = "";
        while (stage.firstChild) content.append(stage.firstChild);
        const actions = $("#view-actions");
        actions.innerHTML = "";
        while (actionStage.firstChild) actions.append(actionStage.firstChild);
    }

    function errorBox(err) {
        return el("div", { class: "empty" },
            el("div", { class: "big", text: "😿" }),
            el("h3", { text: "Something went wrong" }),
            el("p", { class: "muted", text: err.message }));
    }

    function emptyState(icon, title, sub, action) {
        return el("div", { class: "empty" },
            el("div", { class: "big", text: icon }),
            el("h3", { text: title }),
            el("p", { class: "muted", text: sub }),
            action ? el("div", { style: "margin-top:16px" }, action) : null);
    }

    // ---------------------------------------------------------------- refresh
    async function refreshSummary() {
        try { state.summary = await api("/api/summary"); }
        catch { state.summary = null; }
        renderNav();
    }

    // =================================================================
    // VIEWS
    // =================================================================
    const VIEWS = {};

    // ---------- Dashboard ----------
    VIEWS.dashboard = async (root) => {
        const s = await api("/api/summary");
        state.summary = s;
        renderNav();
        root.innerHTML = "";

        // Hero
        root.append(el("div", { class: "hero" },
            el("img", { src: "hero.png", alt: "CatPilot" }),
            el("div", { class: "hero-txt" },
                el("h1", { text: greeting() }),
                el("p", { text: heroLine(s) })),
            el("div", { class: "hero-actions" },
                el("button", { class: "btn btn-primary", onclick: () => taskModal(), html: "＋ Task" }),
                el("button", { class: "btn", onclick: () => journalModal(), html: "✎ Journal" }),
                el("button", { class: "btn", onclick: () => milestoneModal(), html: "⚑ Milestone" }))));

        // Stat cards
        const c = s.counts;
        const cards = [
            { n: c.tasksOpen, label: "Open tasks", ic: "✓", tone: "tone-accent", sub: `${c.tasksDone} completed` },
            { n: c.tasksOverdue, label: "Overdue", ic: "⏰", tone: c.tasksOverdue ? "tone-danger" : "tone-ok", sub: `${c.tasksDueToday} due today` },
            { n: c.milestones, label: "Milestones", ic: "⚑", tone: "tone-accent", sub: `${s.milestoneStatus.Done || 0} done` },
            { n: c.memos, label: "Memos", ic: "▤", tone: "", sub: `${c.journal} journal entries` },
            { n: c.learning, label: "Learning", ic: "🎓", tone: "", sub: "topics tracked" },
            { n: c.growth, label: "Growth", ic: "↗", tone: "tone-ok", sub: "impact entries" },
        ];
        root.append(el("div", { class: "grid cards", style: "margin-top:16px" },
            cards.map((cd) => el("div", { class: `card stat hoverable ${cd.tone}` },
                el("span", { class: "stat-ic", text: cd.ic }),
                el("div", { class: "stat-num", text: String(cd.n) }),
                el("div", { class: "stat-label", text: cd.label }),
                el("div", { class: "stat-sub muted", text: cd.sub })))));

        // Charts row
        const chartRow = el("div", { class: "chart-row", style: "margin-top:22px" });
        // Priority donut
        const pb = s.priorityBuckets;
        const pSegs = [
            { label: "P0 / High", value: pb.P0, color: "#ff6b7d" },
            { label: "P1", value: pb.P1, color: "#ffb020" },
            { label: "P2 / Med", value: pb.P2, color: "#7c5cff" },
            { label: "P3 / Low", value: pb.P3, color: "#35c88f" },
            { label: "Unset", value: pb.Other, color: "#5c5c74" },
        ];
        chartRow.append(el("div", { class: "card chart-card" },
            el("h4", { text: "Open tasks by priority" }),
            el("div", { style: "display:flex;gap:20px;align-items:center;flex-wrap:wrap" },
                donut(pSegs),
                el("div", { class: "legend", style: "flex-direction:column;gap:8px" },
                    pSegs.map((seg) => el("span", {}, el("i", { style: `background:${seg.color}` }), `${seg.label} · ${seg.value}`))))));
        // Activity bars
        chartRow.append(el("div", { class: "card chart-card" },
            el("h4", { text: "Activity · last 3 days" }),
            stackedBars(s.last3)));
        root.append(chartRow);

        // Two-column: focus + timeline
        const twoCol = el("div", { class: "grid", style: "grid-template-columns:1fr 1fr;margin-top:22px;align-items:start" });

        // Focus (overdue + due today + upcoming milestones)
        const focus = el("div", { class: "card" });
        focus.append(el("h4", { text: "🎯 Focus", style: "margin:0 0 12px" }));
        const focusItems = [
            ...s.overdue.map((t) => ({ t, tag: "Overdue", cls: "p0" })),
            ...s.dueToday.map((t) => ({ t, tag: "Today", cls: "p1" })),
        ];
        if (!focusItems.length && !s.upcomingMilestones.length) {
            focus.append(el("p", { class: "muted", text: "You're all caught up. No overdue or due-today items. 🎉" }));
        } else {
            focusItems.forEach(({ t, tag, cls }) => {
                focus.append(el("div", { class: "tl-item", onclick: () => taskDetail(t) },
                    el("div", { class: "tl-dot", text: "✓" }),
                    el("div", { class: "tl-body" },
                        el("div", { class: "tl-label", text: t.title }),
                        el("div", { class: "tl-meta", text: `${tag}${t.dueDate ? " · " + t.dueDate : ""}` })),
                    el("span", { class: `badge ${cls}`, text: tag })));
            });
            s.upcomingMilestones.forEach((m) => {
                focus.append(el("div", { class: "tl-item" },
                    el("div", { class: "tl-dot", text: "⚑" }),
                    el("div", { class: "tl-body" },
                        el("div", { class: "tl-label", text: m.name }),
                        el("div", { class: "tl-meta", text: `Milestone${m.targetDate ? " · " + m.targetDate : ""}` })),
                    statusBadge(m.status)));
            });
        }
        twoCol.append(focus);

        // Timeline
        const tl = el("div", { class: "card" });
        tl.append(el("h4", { text: "🕑 Recent activity", style: "margin:0 0 12px" }));
        if (!s.recentActivity.length) {
            tl.append(el("p", { class: "muted", text: "No activity in the last 3 days. Add a journal entry or memo to get started." }));
        } else {
            const tlIcons = { journal: "✎", memo: "▤", learning: "🎓", growth: "↗", project: "❏" };
            const wrap = el("div", { class: "timeline" });
            s.recentActivity.forEach((a) => {
                wrap.append(el("div", { class: "tl-item" },
                    el("div", { class: "tl-dot", text: tlIcons[a.type] || "•" }),
                    el("div", { class: "tl-body" },
                        el("div", { class: "tl-label", text: a.label || "(untitled)" }),
                        el("div", { class: "tl-meta", text: `${a.type} · ${a.date}` }))));
            });
            tl.append(wrap);
        }
        twoCol.append(tl);
        root.append(twoCol);
    };

    function greeting() {
        const h = new Date().getHours();
        const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
        return `${g}! 😺`;
    }
    function heroLine(s) {
        const c = s.counts;
        if (c.tasksOverdue) return `You have ${c.tasksOverdue} overdue task${c.tasksOverdue > 1 ? "s" : ""} and ${c.tasksOpen} open. Let's clear the deck.`;
        if (c.tasksDueToday) return `${c.tasksDueToday} task${c.tasksDueToday > 1 ? "s" : ""} due today, ${c.tasksOpen} open in total. You've got this.`;
        if (c.tasksOpen) return `${c.tasksOpen} open task${c.tasksOpen > 1 ? "s" : ""} and nothing overdue. Nice and steady.`;
        return "Everything's clear. Capture something new to get rolling.";
    }

    // ---------- Tasks ----------
    let taskViewMode = localStorage.getItem("cp-task-view") || "list";
    VIEWS.tasks = async (root) => {
        const { tasks } = await api("/api/tasks?status=all");
        root.innerHTML = "";

        // view switcher in topbar
        const seg = el("div", { class: "segmented" },
            el("button", { class: taskViewMode === "list" ? "active" : "", text: "☰ List", onclick: () => { taskViewMode = "list"; localStorage.setItem("cp-task-view", "list"); go("tasks"); } }),
            el("button", { class: taskViewMode === "board" ? "active" : "", text: "▦ Board", onclick: () => { taskViewMode = "board"; localStorage.setItem("cp-task-view", "board"); go("tasks"); } }));
        actionsHost.append(seg);

        const toolbar = el("div", { class: "toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }),
            el("input", { class: "search", placeholder: "Search tasks…", oninput: (e) => filterTasks(e.target.value) }),
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${tasks.filter((t) => t.status.toLowerCase() === "open").length} open · ${tasks.filter((t) => t.status.toLowerCase() === "done").length} done` }));
        root.append(toolbar);

        const holder = el("div", { id: "task-holder" });
        root.append(holder);
        if (!tasks.length) { holder.append(emptyState("🗒️", "No tasks yet", "Capture your first task and it will sync straight to CatPilot.", el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }))); return; }
        if (taskViewMode === "list") renderTaskList(holder, tasks);
        else renderTaskBoard(holder, tasks);
        root._tasks = tasks;
    };

    function filterTasks(q) {
        q = q.toLowerCase().trim();
        document.querySelectorAll("[data-task-title]").forEach((row) => {
            const hit = !q || row.dataset.taskTitle.toLowerCase().includes(q);
            row.style.display = hit ? "" : "none";
        });
    }

    function renderTaskList(holder, tasks) {
        const open = tasks.filter((t) => t.status.toLowerCase() === "open");
        const done = tasks.filter((t) => t.status.toLowerCase() === "done");
        const ordered = [...open, ...done];
        const tbody = el("tbody");
        ordered.forEach((t) => tbody.append(taskRow(t)));
        holder.append(el("div", { class: "table-wrap" },
            el("table", { class: "tbl" },
                el("thead", {}, el("tr", {},
                    el("th", { text: "" }),
                    el("th", { text: "Task" }),
                    el("th", { text: "Due" }),
                    el("th", { text: "Priority" }),
                    el("th", { text: "Tags" }),
                    el("th", { text: "" }))),
                tbody)));
    }

    function taskRow(t) {
        const done = t.status.toLowerCase() === "done";
        const tr = el("tr", { class: done ? "done-row" : "", dataset: { taskTitle: t.title } });
        const check = el("input", { type: "checkbox", style: "width:auto", "aria-label": done ? `Reopen ${t.title}` : `Complete ${t.title}`, ...(done ? { checked: "checked" } : {}) });
        check.addEventListener("change", async () => {
            try {
                if (check.checked) { await api(`/api/tasks/${t.id}/complete`, { method: "POST" }); toast("Task completed", t.title, "ok"); }
                else { await api(`/api/tasks/${t.id}`, { method: "PUT", body: { status: "Open" } }); toast("Reopened", t.title); }
                await refreshSummary(); go("tasks");
            } catch (e) { toast("Error", e.message, "err"); }
        });
        tr.append(
            el("td", { style: "width:34px" }, check),
            el("td", {}, el("div", { class: "cell-title", text: t.title, onclick: () => taskDetail(t) }),
                t.context ? el("div", { class: "muted small", text: t.context }) : null),
            el("td", {}, t.dueDate ? el("span", { class: dueClass(t.dueDate, done), text: t.dueDate }) : el("span", { class: "muted small", text: "—" })),
            el("td", {}, priorityBadge(t.priority)),
            el("td", {}, tagChips(t.tags)),
            el("td", {}, el("div", { class: "row-actions" },
                el("button", { class: "btn btn-sm btn-ghost", text: "Edit", onclick: () => taskModal(t) }),
                el("button", { class: "btn btn-sm btn-ghost btn-danger", text: "Delete", onclick: () => removeTask(t) }))));
        return tr;
    }

    function dueClass(due, done) {
        if (done) return "muted small";
        if (due < todayISO()) return "badge p0";
        if (due === todayISO()) return "badge p1";
        return "small";
    }

    function renderTaskBoard(holder, tasks) {
        const cols = [
            { key: "overdue", title: "⏰ Overdue", filter: (t) => t.status.toLowerCase() === "open" && t.dueDate && t.dueDate < todayISO() },
            { key: "open", title: "◻ To do", filter: (t) => t.status.toLowerCase() === "open" && !(t.dueDate && t.dueDate < todayISO()) },
            { key: "done", title: "✓ Done", filter: (t) => t.status.toLowerCase() === "done" },
        ];
        const board = el("div", { class: "board" });
        for (const col of cols) {
            const items = tasks.filter(col.filter);
            const colEl = el("div", { class: "board-col", dataset: { col: col.key } });
            colEl.append(el("h4", {}, col.title, el("span", { class: "count", text: ` ${items.length}` })));
            items.forEach((t) => colEl.append(boardCard(t)));
            // drag & drop -> change status
            colEl.addEventListener("dragover", (e) => { e.preventDefault(); colEl.classList.add("drop"); });
            colEl.addEventListener("dragleave", () => colEl.classList.remove("drop"));
            colEl.addEventListener("drop", async (e) => {
                e.preventDefault(); colEl.classList.remove("drop");
                const id = e.dataTransfer.getData("text/plain");
                try {
                    if (col.key === "done") await api(`/api/tasks/${id}/complete`, { method: "POST" });
                    else await api(`/api/tasks/${id}`, { method: "PUT", body: { status: "Open" } });
                    await refreshSummary(); go("tasks");
                } catch (err) { toast("Error", err.message, "err"); }
            });
            board.append(colEl);
        }
        holder.append(board);
    }

    function boardCard(t) {
        const done = t.status.toLowerCase() === "done";
        const card = el("div", { class: "board-card", draggable: "true", dataset: { taskTitle: t.title } });
        card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", String(t.id)); card.classList.add("dragging"); });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
        card.append(
            el("div", { class: "bc-title", text: t.title, style: done ? "text-decoration:line-through;color:var(--text-faint)" : "", onclick: () => taskDetail(t) }),
            el("div", { class: "bc-meta" },
                priorityBadge(t.priority),
                t.dueDate ? el("span", { class: dueClass(t.dueDate, done), text: t.dueDate }) : null));
        return card;
    }

    async function removeTask(t) {
        if (!confirm(`Delete task "${t.title}"?`)) return;
        try { await api(`/api/tasks/${t.id}`, { method: "DELETE" }); toast("Deleted", t.title, "ok"); await refreshSummary(); go("tasks"); }
        catch (e) { toast("Error", e.message, "err"); }
    }

    function taskModal(t) {
        const editing = !!t;
        const f = {};
        const body = el("div", { class: "form" },
            field("Title", f, "title", { value: t?.title, placeholder: "What needs doing?", required: true }),
            el("div", { class: "form-row" },
                field("Due date", f, "due", { value: t?.dueDate, type: "date" }),
                selectField("Priority", f, "priority", ["", "P0", "P1", "P2", "P3", "High", "Med", "Low"], t?.priority)),
            field("Tags", f, "tags", { value: t?.tags, placeholder: "comma,separated" }),
            mdField("Context", f, "context", { value: t?.context, placeholder: "One-line context (markdown supported)" }));
        const save = el("button", { class: "btn btn-primary", text: editing ? "Save changes" : "Add task", onclick: async () => {
            const payload = { title: f.title.value.trim(), due: f.due.value, priority: f.priority.value, tags: f.tags.value.trim(), context: f.context.value.trim() };
            if (!payload.title) { toast("Title required", "", "err"); return; }
            try {
                if (editing) { await api(`/api/tasks/${t.id}`, { method: "PUT", body: { title: payload.title, dueDate: payload.due, priority: payload.priority, tags: payload.tags, context: payload.context } }); toast("Task updated", payload.title, "ok"); }
                else { await api("/api/tasks", { method: "POST", body: payload }); toast("Task added", payload.title, "ok"); }
                closeModal(); await refreshSummary(); go("tasks");
            } catch (e) { toast("Error", e.message, "err"); }
        } });
        openModal({ title: editing ? "Edit task" : "New task", body, foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), save] });
        setTimeout(() => f.title.focus(), 50);
    }

    function taskDetail(t) {
        const done = t.status.toLowerCase() === "done";
        const body = el("div", {},
            detailRow("Status", statusBadge(t.status)),
            detailRow("Title", el("span", { text: t.title })),
            detailRow("Due date", el("span", { text: t.dueDate || "—" })),
            detailRow("Priority", priorityBadge(t.priority)),
            detailRow("Tags", tagChips(t.tags)),
            detailRow("Context", t.context ? mdRender(t.context) : el("span", { class: "muted small", text: "—" })));
        const foot = [
            el("button", { class: "btn btn-danger", text: "Delete", onclick: () => { closeModal(); removeTask(t); } }),
            el("span", { class: "spacer", style: "flex:1" }),
            el("button", { class: "btn", text: "Edit", onclick: () => taskModal(t) }),
            !done ? el("button", { class: "btn btn-primary", text: "Complete", onclick: async () => { try { await api(`/api/tasks/${t.id}/complete`, { method: "POST" }); toast("Completed", t.title, "ok"); closeModal(); await refreshSummary(); go("tasks"); } catch (e) { toast("Error", e.message, "err"); } } }) : null,
        ];
        openModal({ title: `Task #${t.id}`, body, foot });
    }

    // ---------- Journal ----------
    VIEWS.journal = async (root) => {
        const { entries } = await api("/api/journal");
        root.innerHTML = "";
        root.append(el("div", { class: "toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ Add entry", onclick: () => journalModal() }),
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${entries.length} entr${entries.length === 1 ? "y" : "ies"}` })));
        if (!entries.length) { root.append(emptyState("✎", "No journal entries", "Capture decisions and notes as they happen.", el("button", { class: "btn btn-primary", html: "＋ Add entry", onclick: () => journalModal() }))); return; }
        const list = el("div", { class: "journal-list" });
        entries.forEach((e) => list.append(el("div", { class: "journal-entry" },
            el("div", { class: "date" }, "📅 ", e.date),
            el("div", { class: "body", text: e.text }))));
        root.append(list);
    };

    function journalModal() {
        const f = {};
        const body = el("div", { class: "form" }, mdField("Entry", f, "text", { placeholder: "What happened today?", required: true }));
        const save = el("button", { class: "btn btn-primary", text: "Add entry", onclick: async () => {
            const text = f.text.value.trim();
            if (!text) { toast("Entry required", "", "err"); return; }
            try { await api("/api/journal", { method: "POST", body: { text } }); toast("Journal saved", todayISO(), "ok"); closeModal(); await refreshSummary(); if (state.view === "journal") go("journal"); }
            catch (e) { toast("Error", e.message, "err"); }
        } });
        openModal({ title: "New journal entry", body, foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), save] });
        setTimeout(() => f.text.focus(), 50);
    }

    // ---------- Milestones ----------
    VIEWS.milestones = async (root) => {
        const { milestones } = await api("/api/milestones");
        root.innerHTML = "";
        root.append(el("div", { class: "toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ Add milestone", onclick: () => milestoneModal() }),
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${milestones.length} milestone${milestones.length === 1 ? "" : "s"}` })));
        if (!milestones.length) { root.append(emptyState("⚑", "No milestones", "Set goals with target dates and track them to done.", el("button", { class: "btn btn-primary", html: "＋ Add milestone", onclick: () => milestoneModal() }))); return; }
        const tbody = el("tbody");
        milestones.forEach((m) => {
            const sel = el("select", { class: "inline-edit", style: "width:auto", onchange: async (e) => { try { await api(`/api/milestones/${m.id}`, { method: "PUT", body: { status: e.target.value } }); toast("Status updated", m.name, "ok"); await refreshSummary(); } catch (err) { toast("Error", err.message, "err"); } } });
            ["Planned", "In Progress", "Done"].forEach((o) => { const opt = el("option", { value: o, text: o }); if ((m.status || "Planned") === o) opt.selected = true; sel.append(opt); });
            tbody.append(el("tr", { dataset: { taskTitle: m.name } },
                el("td", {}, el("span", { class: "cell-title", text: m.name, onclick: () => noteLikeDetail(`Milestone #${m.id}`, [["Name", m.name], ["Target date", m.targetDate || "—"], ["Status", m.status || "Planned"], ["Notes", m.notes || "—"]]) })),
                el("td", {}, m.targetDate ? el("span", { class: dueClass(m.targetDate, (m.status || "").toLowerCase() === "done"), text: m.targetDate }) : el("span", { class: "muted small", text: "—" })),
                el("td", {}, sel),
                el("td", {}, el("span", { class: "muted small", text: m.notes || "—" }))));
        });
        root.append(el("div", { class: "table-wrap" }, el("table", { class: "tbl" },
            el("thead", {}, el("tr", {}, el("th", { text: "Milestone" }), el("th", { text: "Target" }), el("th", { text: "Status" }), el("th", { text: "Notes" }))),
            tbody)));
    };

    function milestoneModal() {
        const f = {};
        const body = el("div", { class: "form" },
            field("Name", f, "name", { placeholder: "Milestone name", required: true }),
            el("div", { class: "form-row" },
                field("Target date", f, "targetDate", { type: "date" }),
                selectField("Status", f, "status", ["Planned", "In Progress", "Done"], "Planned")),
            mdField("Notes", f, "notes", { placeholder: "Optional notes (markdown supported)" }));
        const save = el("button", { class: "btn btn-primary", text: "Add milestone", onclick: async () => {
            const name = f.name.value.trim();
            if (!name) { toast("Name required", "", "err"); return; }
            try { await api("/api/milestones", { method: "POST", body: { name, targetDate: f.targetDate.value, status: f.status.value, notes: f.notes.value.trim() } }); toast("Milestone added", name, "ok"); closeModal(); await refreshSummary(); if (state.view === "milestones") go("milestones"); }
            catch (e) { toast("Error", e.message, "err"); }
        } });
        openModal({ title: "New milestone", body, foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), save] });
        setTimeout(() => f.name.focus(), 50);
    }

    // ---------- Memos ----------
    VIEWS.memos = async (root) => {
        const { memos } = await api("/api/memos");
        root.innerHTML = "";
        root.append(el("div", { class: "toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ New memo", onclick: () => memoModal() }),
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${memos.length} memo${memos.length === 1 ? "" : "s"}` })));
        if (!memos.length) { root.append(emptyState("▤", "No memos", "Create handoff notes, retros and summaries as markdown.", el("button", { class: "btn btn-primary", html: "＋ New memo", onclick: () => memoModal() }))); return; }
        const grid = el("div", { class: "grid note-grid" });
        memos.forEach((m) => grid.append(el("div", { class: "card note-card hoverable", onclick: () => memoDetail(m.filename) },
            el("h4", { text: m.title }),
            el("div", { class: "note-foot" }, el("span", { class: "tag", text: m.date || "" }), el("span", { class: "muted small", text: "📄 memo" })))));
        root.append(grid);
    };

    async function memoDetail(filename) {
        try {
            const { memo } = await api(`/api/memos/${encodeURIComponent(filename)}`);
            openModal({ title: memo.title, width: 680, body: mdRender(memo.content || "(empty)"),
                foot: [el("button", { class: "btn", text: "Close", onclick: closeModal })] });
        } catch (e) { toast("Error", e.message, "err"); }
    }

    function memoModal() {
        const f = {};
        const body = el("div", { class: "form" },
            field("Title", f, "title", { placeholder: "Memo title", required: true }),
            mdField("Content", f, "content", { placeholder: "Markdown content…", minRows: 8 }));
        const save = el("button", { class: "btn btn-primary", text: "Create memo", onclick: async () => {
            const title = f.title.value.trim();
            if (!title) { toast("Title required", "", "err"); return; }
            try { await api("/api/memos", { method: "POST", body: { title, content: f.content.value } }); toast("Memo created", title, "ok"); closeModal(); await refreshSummary(); if (state.view === "memos") go("memos"); }
            catch (e) { toast("Error", e.message, "err"); }
        } });
        openModal({ title: "New memo", body, foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), save] });
        setTimeout(() => f.title.focus(), 50);
    }

    // ---------- Domain notes: learning / growth / projects ----------
    const DOMAIN_META = {
        learning: { icon: "🎓", fields: [["goal", "Goal"], ["target_date", "Target date", "date"], ["next_review", "Next review", "date"], ["status", "Status"]] },
        growth: { icon: "↗", fields: [["area", "Area"], ["impact", "Impact"]] },
        projects: { icon: "❏", fields: [["status", "Status"], ["owner", "Owner"], ["due", "Due", "date"]] },
    };
    for (const domain of ["learning", "growth", "projects"]) {
        VIEWS[domain] = async (root) => {
            const { notes } = await api(`/api/${domain}`);
            root.innerHTML = "";
            root.append(el("div", { class: "toolbar" },
                el("button", { class: "btn btn-primary", html: `＋ New ${domain === "projects" ? "project" : domain === "growth" ? "entry" : "topic"}`, onclick: () => noteModal(domain) }),
                el("span", { class: "spacer" }),
                el("span", { class: "muted small", text: `${notes.length} item${notes.length === 1 ? "" : "s"}` })));
            if (!notes.length) { root.append(emptyState(DOMAIN_META[domain].icon, `No ${domain} notes`, "Add your first note — it's saved with frontmatter for Obsidian Dataview.", el("button", { class: "btn btn-primary", html: "＋ Add", onclick: () => noteModal(domain) }))); return; }
            const grid = el("div", { class: "grid note-grid" });
            notes.forEach((n) => {
                const fm = n.frontmatter || {};
                grid.append(el("div", { class: "card note-card hoverable", onclick: () => domainNoteDetail(domain, n.filename) },
                    el("h4", { text: fm.title || n.filename }),
                    domainChips(domain, fm),
                    el("div", { class: "note-foot" }, el("span", { class: "tag", text: fm.date || "" }))));
            });
            root.append(grid);
        };
    }

    function domainChips(domain, fm) {
        const chips = el("div", { class: "tags" });
        if (fm.status) chips.append(statusBadge(fm.status));
        if (fm.area) chips.append(el("span", { class: "tag", text: fm.area }));
        if (fm.owner) chips.append(el("span", { class: "tag", text: "👤 " + fm.owner }));
        if (fm.goal) chips.append(el("span", { class: "muted small", text: fm.goal }));
        if (fm.impact) chips.append(el("span", { class: "muted small", text: fm.impact }));
        return chips;
    }

    async function domainNoteDetail(domain, filename) {
        try {
            const { note } = await api(`/api/${domain}/${encodeURIComponent(filename)}`);
            const fm = note.frontmatter || {};
            const rows = Object.entries(fm).filter(([k]) => k !== "catpilot").map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]);
            const body = el("div", {},
                ...rows.map(([k, v]) => detailRow(k, el("span", { text: String(v) }))),
                note.body ? el("div", { style: "margin-top:14px" }, el("div", { class: "detail-row" }, el("span", { class: "k", text: "Notes" })), mdRender(note.body)) : null);
            openModal({ title: fm.title || filename, width: 640, body, foot: [el("button", { class: "btn", text: "Close", onclick: closeModal })] });
        } catch (e) { toast("Error", e.message, "err"); }
    }

    function noteModal(domain) {
        const meta = DOMAIN_META[domain];
        const f = {};
        const rows = meta.fields.map(([key, label, type]) => field(label, f, key, { type: type || "text" }));
        const body = el("div", { class: "form" },
            field("Title", f, "title", { required: true, placeholder: "Title" }),
            el("div", { class: "form-row" }, rows),
            mdField("Body", f, "body", { placeholder: "Markdown notes…" }));
        const save = el("button", { class: "btn btn-primary", text: "Save", onclick: async () => {
            const title = f.title.value.trim();
            if (!title) { toast("Title required", "", "err"); return; }
            const payload = { title, body: f.body.value };
            meta.fields.forEach(([key]) => { if (f[key].value.trim()) payload[key] = f[key].value.trim(); });
            try { await api(`/api/${domain}`, { method: "POST", body: payload }); toast("Saved", title, "ok"); closeModal(); await refreshSummary(); if (state.view === domain) go(domain); }
            catch (e) { toast("Error", e.message, "err"); }
        } });
        openModal({ title: `New ${domain} note`, body, foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), save] });
        setTimeout(() => f.title.focus(), 50);
    }

    // ---------------------------------------------------------------- fields
    function field(label, store, key, opts = {}) {
        const input = opts.area
            ? el("textarea", { placeholder: opts.placeholder || "" })
            : el("input", { type: opts.type || "text", placeholder: opts.placeholder || "" });
        if (opts.value) input.value = opts.value;
        store[key] = input;
        return el("label", {}, el("span", {}, label, opts.required ? el("em", { text: " *" }) : null), input);
    }
    function selectField(label, store, key, options, value) {
        const sel = el("select", {});
        options.forEach((o) => { const opt = el("option", { value: o, text: o || "—" }); if (o === value) opt.selected = true; sel.append(opt); });
        store[key] = sel;
        return el("label", {}, el("span", { text: label }), sel);
    }
    function detailRow(k, valueNode) {
        return el("div", { class: "detail-row" }, el("span", { class: "k", text: k }), el("div", {}, valueNode));
    }
    function noteLikeDetail(title, rows) {
        openModal({ title, body: el("div", {}, rows.map(([k, v]) => detailRow(k, el("span", { text: String(v) })))), foot: [el("button", { class: "btn", text: "Close", onclick: closeModal })] });
    }

    // ---------------------------------------------------------------- markdown
    function mdInline(s) {
        return s
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
            .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    function mdTable(rows) {
        const cells = (r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
        let body = rows.slice(1);
        if (body[0] && /^[\s:|-]+$/.test(body[0])) body = body.slice(1);
        let h = '<table class="md-table"><thead><tr>' + cells(rows[0]).map((c) => `<th>${mdInline(esc(c))}</th>`).join("") + "</tr></thead><tbody>";
        for (const r of body) h += "<tr>" + cells(r).map((c) => `<td>${mdInline(esc(c))}</td>`).join("") + "</tr>";
        return h + "</tbody></table>";
    }
    function mdToHtml(md) {
        const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
        let html = "", inCode = false, codeBuf = [], listType = null, listBuf = [], tableBuf = [];
        const flushList = () => { if (listType) { html += `<${listType}>` + listBuf.map((li) => `<li>${mdInline(esc(li))}</li>`).join("") + `</${listType}>`; listType = null; listBuf = []; } };
        const flushTable = () => { if (tableBuf.length) { html += mdTable(tableBuf); tableBuf = []; } };
        const flush = () => { flushList(); flushTable(); };
        for (const raw of lines) {
            if (/^```/.test(raw)) { if (inCode) { html += `<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`; codeBuf = []; inCode = false; } else { flush(); inCode = true; } continue; }
            if (inCode) { codeBuf.push(raw); continue; }
            const line = raw.replace(/\s+$/, "");
            if (!line.trim()) { flush(); continue; }
            if (/^\s*\|.*\|\s*$/.test(line)) { flushList(); tableBuf.push(line); continue; }
            flushTable();
            let m;
            if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flushList(); const lv = m[1].length; html += `<h${lv}>${mdInline(esc(m[2]))}</h${lv}>`; continue; }
            if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) { if (listType !== "ul") { flushList(); listType = "ul"; } const done = /\[[xX]\]/.test(line); listBuf.push((done ? "☑ " : "☐ ") + line.replace(/^\s*[-*]\s+\[[ xX]\]\s+/, "")); continue; }
            if (/^\s*[-*]\s+/.test(line)) { if (listType !== "ul") { flushList(); listType = "ul"; } listBuf.push(line.replace(/^\s*[-*]\s+/, "")); continue; }
            if (/^\s*\d+\.\s+/.test(line)) { if (listType !== "ol") { flushList(); listType = "ol"; } listBuf.push(line.replace(/^\s*\d+\.\s+/, "")); continue; }
            if (/^>\s?/.test(line)) { flushList(); html += `<blockquote>${mdInline(esc(line.replace(/^>\s?/, "")))}</blockquote>`; continue; }
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushList(); html += "<hr/>"; continue; }
            flushList(); html += `<p>${mdInline(esc(line))}</p>`;
        }
        flush(); if (inCode && codeBuf.length) html += `<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`;
        return html;
    }
    function mdRender(md) { const d = el("div", { class: "md" }); d.innerHTML = mdToHtml(md); return d; }

    // ---------------------------------------------------------------- markdown editor
    function mdField(label, store, key, opts = {}) {
        const ed = mdEditor({ value: opts.value || "", placeholder: opts.placeholder || "", minRows: opts.minRows || 6 });
        store[key] = ed.textarea;
        return el("label", { class: "md-label" }, el("span", {}, label, opts.required ? el("em", { text: " *" }) : null), ed.node);
    }
    function mdEditor({ value = "", placeholder = "", minRows = 6 } = {}) {
        const ta = el("textarea", { class: "md-input", placeholder, rows: minRows });
        ta.value = value;
        const preview = el("div", { class: "md md-preview hidden" });
        let previewing = false;
        const pvBtn = el("button", { type: "button", class: "md-tool md-toggle", text: "👁 Preview" });
        const renderPreview = () => { preview.innerHTML = ta.value.trim() ? mdToHtml(ta.value) : '<p class="muted">Nothing to preview yet.</p>'; };
        const setPreview = (on) => { previewing = on; if (on) renderPreview(); preview.classList.toggle("hidden", !on); ta.classList.toggle("hidden", on); pvBtn.textContent = on ? "✎ Write" : "👁 Preview"; };
        pvBtn.addEventListener("click", () => setPreview(!previewing));
        function surround(before, after = before, ph = "text") { const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, sel = v.slice(s, e) || ph; ta.value = v.slice(0, s) + before + sel + after + v.slice(e); ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; }
        function linePrefix(pfx) { const s = ta.selectionStart, v = ta.value, ls = v.lastIndexOf("\n", s - 1) + 1; ta.value = v.slice(0, ls) + pfx + v.slice(ls); ta.focus(); ta.selectionStart = ta.selectionEnd = s + pfx.length; }
        const tools = [
            { ic: "B", cls: "b", t: "Bold", fn: () => surround("**") },
            { ic: "I", cls: "i", t: "Italic", fn: () => surround("*") },
            { ic: "H", t: "Heading", fn: () => linePrefix("## ") },
            { ic: "”", t: "Quote", fn: () => linePrefix("> ") },
            { ic: "•", t: "Bullet list", fn: () => linePrefix("- ") },
            { ic: "☑", t: "Checkbox", fn: () => linePrefix("- [ ] ") },
            { ic: "</>", t: "Code", fn: () => surround("`", "`", "code") },
            { ic: "🔗", t: "Link", fn: () => surround("[", "](https://)", "label") },
        ];
        const bar = el("div", { class: "md-toolbar" });
        tools.forEach((t) => bar.append(el("button", { type: "button", class: "md-tool" + (t.cls ? " tt-" + t.cls : ""), title: t.t, text: t.ic, onclick: () => { if (previewing) setPreview(false); t.fn(); } })));
        bar.append(el("span", { class: "spacer", style: "flex:1" }));
        const genBtn = el("button", { type: "button", class: "md-tool md-gen-btn", title: "Draft with Copilot", html: "✨ Copilot" });
        bar.append(genBtn, pvBtn);
        const genInput = el("input", { class: "md-gen-input", placeholder: "Describe what to write — Copilot drafts it…" });
        const genRow = el("div", { class: "md-gen hidden" });
        async function doGen() {
            const instr = genInput.value.trim();
            if (!instr) { toast("Describe what to generate", "", "err"); return; }
            const existing = ta.value.trim();
            genBtn.disabled = true; genBtn.innerHTML = "⏳ Drafting…";
            const prompt = `You are drafting content inside the CatPilot canvas markdown editor. Write: ${instr}. Respond with ONLY the markdown to insert — no preamble, no surrounding code fences, no explanation.` + (existing ? `\n\nBuild on this existing draft:\n"""\n${existing}\n"""` : "");
            try {
                const r = await api("/api/agent/generate", { method: "POST", body: { prompt, timeout: 120000 } });
                if (r && r.content) { ta.value = existing ? existing + "\n\n" + r.content.trim() : r.content.trim(); toast("Copilot drafted content", "", "ok"); if (previewing) renderPreview(); genRow.classList.add("hidden"); genInput.value = ""; }
                else toast("No content returned", (r && r.error) || "The agent may be busy", "err");
            } catch (e) { toast("Generate failed", e.message, "err"); }
            finally { genBtn.disabled = false; genBtn.innerHTML = "✨ Copilot"; }
        }
        genRow.append(genInput,
            el("button", { type: "button", class: "btn btn-sm btn-primary", text: "Generate", onclick: doGen }),
            el("button", { type: "button", class: "btn btn-sm", text: "Cancel", onclick: () => genRow.classList.add("hidden") }));
        genBtn.addEventListener("click", () => { genRow.classList.toggle("hidden"); if (!genRow.classList.contains("hidden")) genInput.focus(); });
        genInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doGen(); } });
        const node = el("div", { class: "md-editor" }, bar, genRow, el("div", { class: "md-surface" }, ta, preview));
        return { node, textarea: ta, getValue: () => ta.value, setValue: (v) => { ta.value = v; } };
    }

    // ---------------------------------------------------------------- agent
    function askAgent(prompt, okMsg) {
        return api("/api/agent", { method: "POST", body: { prompt } })
            .then((r) => { if (r && r.ok) toast(okMsg || "Sent to Copilot", "Check the chat panel", "ok"); else toast("No active session", (r && r.error) || "", "err"); })
            .catch((e) => toast("Error", e.message, "err"));
    }
    function agentBar(items) {
        const bar = el("div", { class: "agent-bar" });
        bar.append(el("span", { class: "agent-bar-label", html: "✨ Copilot actions" }));
        items.forEach((it) => bar.append(el("button", { class: "chip agent-chip", title: it.prompt, onclick: () => askAgent(it.prompt, it.ok) }, (it.icon ? it.icon + " " : "") + it.label)));
        return bar;
    }
    function agentModal() {
        const chips = [
            { label: "Summarize my week", prompt: "Summarize what I've worked on in CatPilot over the past week using my tasks, journal and milestones." },
            { label: "Plan my day", prompt: "Look at my CatPilot open and overdue tasks and propose a prioritized plan for today." },
            { label: "Generate weekly report", prompt: "Generate a CatPilot executive report for this week using the report-generator skill and save it with the save_report canvas action." },
            { label: "Triage overdue tasks", prompt: "Review my overdue CatPilot tasks and suggest reschedules or which to drop." },
            { label: "Draft a standup", prompt: "Write a concise standup update from my recent CatPilot activity." },
        ];
        const ta = el("textarea", { class: "md-input", rows: 4, placeholder: "Ask Copilot to do something with your CatPilot data…" });
        const chipRow = el("div", { class: "chip-row" }, chips.map((c) => el("button", { class: "chip", onclick: () => { ta.value = c.prompt; ta.focus(); } }, c.label)));
        const send = el("button", { class: "btn btn-primary", text: "Send to Copilot", onclick: async () => { const p = ta.value.trim(); if (!p) { toast("Type a request", "", "err"); return; } await askAgent(p); closeModal(); } });
        openModal({ title: "✨ Ask Copilot", width: 560, body: el("div", { class: "form" }, el("p", { class: "muted small", text: "Sends a message to the Copilot agent in the chat. It reads and updates the same CatPilot data shown here." }), chipRow, ta), foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), send] });
        setTimeout(() => ta.focus(), 50);
    }

    // ---------------------------------------------------------------- timeline
    const TL_ICON = { task: "✓", "task-done": "✅", journal: "✎", memo: "▤", milestone: "⚑", learning: "🎓", growth: "↗", project: "❏", report: "📊" };
    let tlDays = Number(localStorage.getItem("cp-tl-days")) || 14;
    function prettyDate(iso) {
        const d = new Date(iso + "T00:00:00");
        if (isNaN(d)) return iso;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diff = Math.round((today - d) / 86400000);
        const label = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        return label;
    }
    VIEWS.timeline = async (root) => {
        const data = await api(`/api/timeline?days=${tlDays}`);
        root.innerHTML = "";
        const seg = el("div", { class: "segmented" }, [7, 14, 30].map((d) => el("button", { class: tlDays === d ? "active" : "", text: `${d}d`, onclick: () => { tlDays = d; localStorage.setItem("cp-tl-days", d); go("timeline"); } })));
        actionsHost.append(seg);
        root.append(agentBar([
            { icon: "🧭", label: "Summarize this period", prompt: `Summarize what I've worked on in CatPilot over the last ${tlDays} days using my journal, memos, tasks and milestones.` },
            { icon: "🎯", label: "What should I do next?", prompt: "Based on my CatPilot tasks and milestones, what should I focus on next?" },
            { icon: "🗣️", label: "Draft a standup update", prompt: `Write a concise standup update from my CatPilot activity in the last ${tlDays} days.` },
            { icon: "📊", label: "Generate a report", prompt: "Generate a CatPilot executive report for this week using the report-generator skill and save it via the save_report canvas action." },
        ]));
        const groups = data.groups || [];
        const total = groups.reduce((n, g) => n + g.items.length, 0);
        if (data.byType && Object.keys(data.byType).length) {
            root.append(el("div", { class: "tl-summary" }, Object.entries(data.byType).map(([k, v]) => el("span", { class: "chip" }, `${TL_ICON[k] || "•"} ${v} ${k}`))));
        }
        if (!total) { root.append(emptyState("🕑", "Nothing in this window yet", "Add tasks, journal entries, memos or milestones and they'll show up here as a story.")); return; }
        const wrap = el("div", { class: "tl-wrap" });
        groups.forEach((g) => {
            const day = el("div", { class: "tl-day" },
                el("div", { class: "tl-day-head" }, el("span", { class: "tl-day-date", text: prettyDate(g.date) }), el("span", { class: "muted small", text: `${g.items.length} item${g.items.length > 1 ? "s" : ""}` })));
            const items = el("div", { class: "timeline" });
            g.items.forEach((a) => items.append(el("div", { class: "tl-item" },
                el("div", { class: `tl-dot tl-${a.type}` }, TL_ICON[a.type] || "•"),
                el("div", { class: "tl-body" }, el("div", { class: "tl-label", text: a.label || "(untitled)" }), el("div", { class: "tl-meta", text: `${a.type}${a.detail ? " · " + a.detail : ""}` })))));
            day.append(items); wrap.append(day);
        });
        root.append(wrap);
    };

    // ---------------------------------------------------------------- reports
    const PERIODS = [["this-week", "This week"], ["last-week", "Last week"], ["this-month", "This month"], ["last-month", "Last month"], ["last-7", "Last 7 days"], ["last-30", "Last 30 days"], ["all", "All time"]];
    let reportPeriod = "this-week";
    VIEWS.reports = async (root) => {
        const { reports } = await api("/api/reports");
        root.innerHTML = "";
        const sel = el("select", { class: "inline-edit", style: "width:auto" }, PERIODS.map(([v, l]) => { const o = el("option", { value: v, text: l }); if (v === reportPeriod) o.selected = true; return o; }));
        sel.addEventListener("change", (e) => { reportPeriod = e.target.value; });
        const genBtn = el("button", { class: "btn btn-primary", html: "📊 Generate report" });
        genBtn.addEventListener("click", async () => {
            genBtn.disabled = true; genBtn.innerHTML = "⏳ Generating…";
            try { const { report } = await api("/api/reports", { method: "POST", body: { period: reportPeriod } }); toast("Report generated", report.title, "ok"); go("reports"); reportDetail(report.filename); }
            catch (e) { toast("Error", e.message, "err"); }
            finally { genBtn.disabled = false; genBtn.innerHTML = "📊 Generate report"; }
        });
        root.append(el("div", { class: "toolbar" }, sel, genBtn,
            el("button", { class: "btn", html: "✨ Ask Copilot", onclick: () => askAgent(`Generate a detailed CatPilot executive report for "${reportPeriod}" using the report-generator skill, then save it with the save_report canvas action.`, "Report requested") }),
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${reports.length} report${reports.length === 1 ? "" : "s"}` })));
        if (!reports.length) { root.append(emptyState("📊", "No reports yet", "Generate an executive report from your tasks and milestones, or ask Copilot to write one.", genBtn)); return; }
        const grid = el("div", { class: "grid note-grid" });
        reports.forEach((r) => grid.append(el("div", { class: "card report-card hoverable", onclick: () => reportDetail(r.filename) },
            el("div", { class: "report-ic", text: r.format === "html" ? "🌐" : "📄" }),
            el("h4", { text: r.title }),
            el("div", { class: "note-foot" }, el("span", { class: "tag", text: r.date || "" }), el("span", { class: "tag", text: r.format || "md" })))));
        root.append(grid);
    };
    async function reportDetail(filename) {
        try {
            const { report } = await api(`/api/reports/${encodeURIComponent(filename)}`);
            let body;
            if (report.format === "html") { body = el("iframe", { class: "report-iframe", sandbox: "", title: report.title || "Report preview" }); body.srcdoc = report.content; }
            else body = mdRender(report.content);
            const del = el("button", { class: "btn btn-danger", text: "Delete", onclick: async () => {
                try { await api(`/api/reports/${encodeURIComponent(filename)}`, { method: "DELETE" }); toast("Report deleted", "", "ok"); closeModal(); if (state.view === "reports") go("reports"); }
                catch (e) { toast("Error", e.message, "err"); }
            } });
            openModal({ title: report.title, width: 860, body, foot: [del, el("span", { style: "flex:1" }), el("button", { class: "btn", text: "Close", onclick: closeModal })] });
        } catch (e) { toast("Error", e.message, "err"); }
    }

    // ---------------------------------------------------------------- settings
    function shortPath(p) { const parts = String(p || "").split(/[\\/]/).filter(Boolean); return parts.length > 3 ? "…/" + parts.slice(-3).join("/") : p; }
    VIEWS.settings = async (root) => {
        const cfg = await api("/api/config");
        root.innerHTML = "";
        if (!cfg.configured) { root.append(emptyState("⚙️", "Not configured", "Complete onboarding first to set your storage root.")); return; }
        root.append(el("div", { class: "card settings-card" },
            el("h4", { text: "Storage configuration" }),
            detailRow("Storage root", el("code", { text: cfg.root })),
            detailRow("Resolved path", el("code", { text: cfg.resolvedRoot || cfg.root })),
            detailRow("Partitioning", el("span", { text: cfg.partitioning })),
            detailRow("Active partition", el("code", { text: cfg.partition || "—" })),
            detailRow("Migration mode", el("span", { text: cfg.migration || "move" })),
            detailRow("Config file", el("code", { text: cfg.configPath || "~/.catpilot/config.json" }))));
        root.append(el("div", { class: "toolbar", style: "margin-top:16px" },
            el("button", { class: "btn btn-primary", html: "⚙️ Change configuration…", onclick: () => configModal(cfg) }),
            el("button", { class: "btn", html: "✨ Ask Copilot about my setup", onclick: () => askAgent("Explain my current CatPilot storage configuration and suggest improvements.") })));
        root.append(el("div", { class: "card settings-card", style: "margin-top:16px" },
            el("h4", { text: "Appearance" }),
            el("p", { class: "muted small", text: "Toggle light/dark from the top bar. Your preference is remembered on this machine." }),
            el("button", { class: "btn", html: state.theme === "dark" ? "☀️ Switch to light" : "🌙 Switch to dark", onclick: () => { toggleTheme(); go("settings"); } })));
    };
    function configModal(cfg) {
        const f = {};
        const form = el("div", { class: "form" },
            field("Storage root", f, "root", { value: cfg.root, placeholder: "Folder path (e.g. C:\\Users\\you\\Vault)" }),
            el("div", { class: "form-row" },
                selectField("Partitioning", f, "partitioning", ["month", "week", "day"], cfg.partitioning),
                selectField("If data exists", f, "migration", ["move", "copy", "adopt"], "move")));
        const planBox = el("div", { class: "plan-box hidden" });
        const approve = el("label", { class: "approve hidden" }, el("input", { type: "checkbox" }), el("span", { text: "I understand and want to apply these changes" }));
        const approveCb = approve.querySelector("input");
        const applyBtn = el("button", { class: "btn btn-primary", text: "Confirm & apply", disabled: true });
        approveCb.addEventListener("change", () => { applyBtn.disabled = !approveCb.checked; });
        function bodyFromForm(withConfirm) { const b = { root: f.root.value.trim(), partitioning: f.partitioning.value, migration: f.migration.value }; if (withConfirm) b.confirm = true; return b; }
        // A preview must precede every apply. Editing any field invalidates the
        // previewed plan so the user can never apply a stale/mismatched plan.
        let previewedBody = null;
        function invalidate() { previewedBody = null; planBox.classList.add("hidden"); planBox.innerHTML = ""; approve.classList.add("hidden"); approveCb.checked = false; applyBtn.disabled = true; }
        [f.root, f.partitioning, f.migration].forEach((inp) => { if (inp) { inp.addEventListener("input", invalidate); inp.addEventListener("change", invalidate); } });
        function renderPlan(plan) {
            planBox.innerHTML = ""; planBox.classList.remove("hidden");
            const changed = plan.rootChanged || plan.partitioningChanged;
            planBox.append(el("div", { class: "plan-head" }, el("strong", { text: changed ? "Proposed changes" : "No path change" })));
            planBox.append(el("div", { class: "plan-diff" },
                el("div", {}, el("span", { class: "muted small", text: "From " }), el("code", { text: `${shortPath(plan.current.resolvedRoot)} · ${plan.current.partitioning}` })),
                el("div", {}, el("span", { class: "muted small", text: "To " }), el("code", { text: `${shortPath(plan.next.resolvedRoot)} · ${plan.next.partitioning}` }))));
            if (plan.needsMigration && plan.totalItems) {
                const moving = (plan.items || []).filter((i) => i.willMove);
                planBox.append(el("p", { class: "muted small", text: `${plan.next.migration === "copy" ? "Copy" : "Move"} ${plan.totalItems} item(s) across ${moving.length} location(s):` }));
                const list = el("div", { class: "plan-list" });
                moving.forEach((i) => list.append(el("div", { class: "plan-item" }, el("span", { class: "tag", text: i.type }), el("span", { class: "muted small", text: `${i.count} → ${shortPath(i.to)}` }))));
                planBox.append(list);
                approve.classList.remove("hidden"); applyBtn.disabled = !approveCb.checked;
            } else {
                planBox.append(el("p", { class: "muted small", text: plan.next.migration === "adopt" ? "Adopt mode: config points at the new location; no files are moved." : "Nothing to migrate — paths are unchanged." }));
                approve.classList.add("hidden"); applyBtn.disabled = false;
            }
            if (plan.hasConflicts) {
                planBox.append(el("div", { class: "plan-warn small" },
                    el("strong", { text: `⚠ ${plan.conflicts.length} destination file(s) already exist` }),
                    el("div", { class: "muted small", text: "Existing files are kept and those sources are skipped — nothing is overwritten." })));
            }
        }
        const previewBtn = el("button", { class: "btn", text: "Preview changes", onclick: async () => {
            const b = bodyFromForm(false);
            if (!b.root) { toast("Root required", "", "err"); return; }
            try { const plan = await api("/api/config/plan", { method: "POST", body: b }); previewedBody = b; renderPlan(plan); }
            catch (e) { toast("Preview failed", e.message, "err"); }
        } });
        applyBtn.addEventListener("click", async () => {
            if (!previewedBody) { toast("Preview first", "Preview the changes before applying.", "err"); return; }
            applyBtn.disabled = true; const orig = applyBtn.textContent; applyBtn.textContent = "Applying…";
            try {
                const r = await api("/api/config/apply", { method: "POST", body: { ...previewedBody, confirm: true } });
                const moved = r.moved != null ? r.moved : r.migrated;
                const parts = [];
                if (moved) parts.push(`${moved} item(s) ${previewedBody.migration === "copy" ? "copied" : "moved"}`);
                if (r.skipped) parts.push(`${r.skipped} skipped (already existed)`);
                toast("Configuration updated", parts.join(" · ") || "Saved", "ok");
                closeModal(); await refreshSummary(); go("settings");
            }
            catch (e) { toast("Apply failed", e.message, "err"); applyBtn.disabled = false; applyBtn.textContent = orig; }
        });
        openModal({ title: "⚙️ CatPilot configuration", width: 660, body: el("div", {}, form, el("div", { class: "toolbar", style: "margin:4px 0 2px" }, previewBtn, el("span", { class: "spacer" }), el("span", { class: "muted small", text: "Preview before applying" })), planBox, approve), foot: [el("button", { class: "btn", text: "Cancel", onclick: closeModal }), applyBtn] });
    }

    // ---------------------------------------------------------------- help
    VIEWS.help = async (root) => {
        root.innerHTML = "";
        const cards = [
            { icon: "🐱", title: "What is this canvas?", body: "A visual command center for **CatPilot**. Everything you see reads and writes the *same files* CatPilot's CLI, agent and MCP server use — so edits here show up everywhere. Nothing is duplicated." },
            { icon: "🧭", title: "Navigation", body: "The sidebar covers every CatPilot domain: **Tasks, Journal, Milestones, Memos, Learning, Growth, Projects**. Each has add buttons, inline edit and detail popups. **Tasks** offers both a table and a kanban board." },
            { icon: "🕑", title: "Timeline", body: "A day-grouped story of your recent activity across every domain, with a **7/14/30 day** switch. Use the Copilot action chips to summarize the period, plan next steps or draft a standup." },
            { icon: "📊", title: "Reports", body: "Generate an **executive report** for a period from your tasks and milestones — or ask Copilot to write a richer one via the *report-generator* skill. Reports are saved as markdown/HTML in your storage `reports/` folder and open in a reader." },
            { icon: "✨", title: "Ask Copilot", body: "The **✨ button** (top bar) and the action chips send prompts to the Copilot agent in the chat panel. The agent works on the same data, so it can add tasks, write memos, generate reports and more on your behalf." },
            { icon: "✍️", title: "Markdown everywhere", body: "Every notes field is a full **markdown editor**: a formatting toolbar (bold, italic, headings, lists, checkboxes, code, links), a live **Preview** toggle, and **✨ Copilot** to draft the content from a short instruction." },
            { icon: "⚙️", title: "Settings & migration", body: "Change your storage **root** or **partitioning** from Settings. The wizard shows an exact **preview** of what will move, requires your **explicit approval**, then migrates your current data (move/copy/adopt) before switching config." },
            { icon: "🌗", title: "Themes & data", body: "Light/dark toggle lives in the top bar. Files are written in CatPilot's exact formats (markdown tables, `### date` journal headings, YAML frontmatter notes) so they stay **Obsidian/Dataview friendly**." },
        ];
        const grid = el("div", { class: "grid help-grid" });
        cards.forEach((c) => grid.append(el("div", { class: "card help-card" },
            el("div", { class: "help-ic", text: c.icon }),
            el("h4", { text: c.title }),
            mdRender(c.body))));
        root.append(grid);
        root.append(el("div", { class: "toolbar", style: "margin-top:16px" },
            el("button", { class: "btn btn-primary", html: "✨ Ask Copilot what it can do", onclick: () => askAgent("What can you help me do with my CatPilot data? List the most useful things.") })));
    };

    // ---------------------------------------------------------------- boot
    async function boot() {
        applyTheme();
        $("#theme-btn").addEventListener("click", toggleTheme);
        $("#refresh-btn").addEventListener("click", async () => { await refreshSummary(); go(state.view); toast("Refreshed", "", "ok"); });
        const agentBtn = $("#agent-btn"); if (agentBtn) agentBtn.addEventListener("click", agentModal);

        const status = await api("/api/status").catch(() => ({ configured: false }));
        if (!status.configured) { showOnboarding(); return; }
        startApp();
    }

    function showOnboarding() {
        $("#onboarding").classList.remove("hidden");
        $("#app").classList.add("hidden");
        $("#setup-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const payload = { root: fd.get("root"), partitioning: fd.get("partitioning") };
            if (!payload.root.trim()) { toast("Path required", "", "err"); return; }
            try {
                await api("/api/setup", { method: "POST", body: payload });
                toast("Workspace ready!", "CatPilot is set up", "ok");
                $("#onboarding").classList.add("hidden");
                startApp();
            } catch (err) { toast("Setup failed", err.message, "err"); }
        }, { once: false });
    }

    async function startApp() {
        $("#app").classList.remove("hidden");
        await refreshSummary();
        const initial = (location.hash || "").replace("#", "");
        go(NAV.some((n) => n.id === initial) ? initial : "dashboard");
    }

    window.addEventListener("hashchange", () => {
        const v = (location.hash || "").replace("#", "");
        if (v && v !== state.view && NAV.some((n) => n.id === v)) go(v);
    });

    boot();
})();
