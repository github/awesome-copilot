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
        { id: "pomodoro", icon: "🍅", label: "Pomodoro" },
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
        pomodoro: "Focus timers and logged sessions",
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
        const cls = k === "done" ? "st-done" : k === "inprogress" ? "st-inprogress" : k === "planned" ? "st-planned" : k === "blocked" ? "st-blocked" : "st-open";
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

    // Single-series vertical bar chart (value per labeled group).
    function simpleBars(items, { color = "#7c5cff", unit = "" } = {}) {
        const max = Math.max(1, ...items.map((d) => d.value || 0));
        const bars = el("div", { class: "bars" });
        for (const d of items) {
            const stack = el("div", { class: "bar-stack" });
            if (d.value) {
                const seg = el("div", { class: "bar-seg" });
                seg.style.height = `${(d.value / max) * 130}px`;
                seg.style.background = color;
                seg.title = `${d.label}: ${d.value}${unit}`;
                stack.append(seg);
            }
            bars.append(el("div", { class: "bar-col" }, stack, el("div", { class: "bar-label", text: d.short || d.label })));
        }
        return bars;
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
    // Dashboard period filter (drives the focus/Pomodoro analytics section).
    let dashPeriod = localStorage.getItem("cp-dash-period") || "today";
    const DASH_PERIODS = [["today", "Today"], ["week", "Week"], ["month", "Month"]];
    const DASH_PERIOD_LABEL = { today: "Today", week: "This week", month: "This month" };
    function fmtMinutes(m) {
        m = parseInt(m, 10) || 0;
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60), r = m % 60;
        return r ? `${h}h ${r}m` : `${h}h`;
    }

    VIEWS.dashboard = async (root) => {
        const [s, pomoStats] = await Promise.all([
            api("/api/summary"),
            api(`/api/pomodoro/stats?period=${dashPeriod}`).catch(() => null),
        ]);
        state.summary = s;
        renderNav();
        root.innerHTML = "";

        // Period filter in the topbar — governs the focus analytics below.
        const periodSeg = el("div", { class: "segmented" },
            ...DASH_PERIODS.map(([key, label]) =>
                el("button", { class: dashPeriod === key ? "active" : "", text: label,
                    onclick: () => { dashPeriod = key; localStorage.setItem("cp-dash-period", key); go("dashboard"); } })));
        actionsHost.append(periodSeg);

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

        // Focus / Pomodoro analytics — driven by the period filter above.
        const ps = pomoStats || { focusSessions: 0, focusMinutes: 0, completedSessions: 0, abandonedSessions: 0 };
        const pomoCards = [
            { n: ps.focusSessions, label: "Focus sessions", ic: "🍅", tone: "tone-accent", sub: `${DASH_PERIOD_LABEL[dashPeriod]}` },
            { n: fmtMinutes(ps.focusMinutes), label: "Focus time", ic: "⏱", tone: "tone-ok", sub: "logged focus" },
            { n: ps.completedSessions, label: "Completed", ic: "✓", tone: "", sub: `${ps.totalSessions || 0} total` },
            { n: ps.abandonedSessions, label: "Abandoned", ic: "⏹", tone: ps.abandonedSessions ? "tone-danger" : "", sub: "cancelled early" },
        ];
        const pomoSection = el("div", { style: "margin-top:22px" },
            el("div", { class: "toolbar", style: "margin-bottom:12px" },
                el("h4", { style: "margin:0", text: `🍅 Focus · ${DASH_PERIOD_LABEL[dashPeriod]}` }),
                el("span", { class: "spacer" }),
                el("button", { class: "btn small", html: "Open Pomodoro →", onclick: () => go("pomodoro") })),
            el("div", { class: "grid cards" },
                pomoCards.map((cd) => el("div", { class: `card stat hoverable ${cd.tone}` },
                    el("span", { class: "stat-ic", text: cd.ic }),
                    el("div", { class: "stat-num", text: String(cd.n) }),
                    el("div", { class: "stat-label", text: cd.label }),
                    el("div", { class: "stat-sub muted", text: cd.sub })))));
        root.append(pomoSection);

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
    let taskDueFilter = localStorage.getItem("cp-task-filter") || "all"; // all | today | 7days
    // Calendar sub-view state.
    let taskCalMode = localStorage.getItem("cp-task-cal-mode") || "month"; // month | week
    let taskCalAnchorISO = todayISO(); // which month/week is in view (module-persistent across re-renders)
    let taskCalFields = (localStorage.getItem("cp-task-cal-fields") || "priority").split(",").filter(Boolean);

    // Apply the active due-date filter. Today = due today or overdue;
    // 7days = due within the next 7 days (includes overdue). Undated tasks are
    // hidden while a filter is active, per product decision.
    function applyDueFilter(tasks) {
        if (taskDueFilter === "all") return tasks;
        const today = todayISO();
        const in7 = new Date(); in7.setDate(in7.getDate() + 7);
        const limit = in7.toISOString().split("T")[0];
        if (taskDueFilter === "today") return tasks.filter((t) => t.dueDate && t.dueDate <= today);
        if (taskDueFilter === "7days") return tasks.filter((t) => t.dueDate && t.dueDate <= limit);
        return tasks;
    }

    VIEWS.tasks = async (root) => {
        const { tasks: allTasks } = await api("/api/tasks?status=all");
        const tasks = applyDueFilter(allTasks);
        root.innerHTML = "";

        // view switcher in topbar
        const seg = el("div", { class: "segmented" },
            el("button", { class: taskViewMode === "list" ? "active" : "", text: "☰ List", onclick: () => { taskViewMode = "list"; localStorage.setItem("cp-task-view", "list"); go("tasks"); } }),
            el("button", { class: taskViewMode === "board" ? "active" : "", text: "▦ Board", onclick: () => { taskViewMode = "board"; localStorage.setItem("cp-task-view", "board"); go("tasks"); } }),
            el("button", { class: taskViewMode === "calendar" ? "active" : "", text: "📅 Calendar", onclick: () => { taskViewMode = "calendar"; localStorage.setItem("cp-task-view", "calendar"); go("tasks"); } }));
        actionsHost.append(seg);

        // Calendar mode uses the full task set (the due-window filter would hide most
        // days) and its own toolbar; list/board keep the existing due filter.
        if (taskViewMode === "calendar") {
            const holderCal = el("div", { id: "task-holder" });
            root.append(buildCalendarToolbar(allTasks), holderCal);
            if (!allTasks.length) { holderCal.append(emptyState("🗒️", "No tasks yet", "Capture your first task and it will show up on the calendar.", el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }))); return; }
            renderTaskCalendar(holderCal, allTasks);
            root._tasks = allTasks;
            return;
        }

        const filterSeg = el("div", { class: "segmented" },
            ...[["all", "All"], ["today", "Today"], ["7days", "7 days"]].map(([key, label]) =>
                el("button", { class: taskDueFilter === key ? "active" : "", text: label, onclick: () => { taskDueFilter = key; localStorage.setItem("cp-task-filter", key); go("tasks"); } })));

        const toolbar = el("div", { class: "toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }),
            el("input", { class: "search", placeholder: "Search tasks…", oninput: (e) => filterTasks(e.target.value) }),
            filterSeg,
            el("span", { class: "spacer" }),
            el("span", { class: "muted small", text: `${tasks.filter((t) => t.status.toLowerCase() === "open").length} open · ${tasks.filter((t) => t.status.toLowerCase() === "blocked").length} blocked · ${tasks.filter((t) => t.status.toLowerCase() === "done").length} done` }));
        root.append(toolbar);

        const holder = el("div", { id: "task-holder" });
        root.append(holder);
        if (!allTasks.length) { holder.append(emptyState("🗒️", "No tasks yet", "Capture your first task and it will sync straight to CatPilot.", el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }))); return; }
        if (!tasks.length) { holder.append(emptyState("🔍", "Nothing in this window", "No tasks match the current filter. Try “All”.")); return; }
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
        const blocked = tasks.filter((t) => t.status.toLowerCase() === "blocked");
        const done = tasks.filter((t) => t.status.toLowerCase() === "done");
        const ordered = [...open, ...blocked, ...done];
        const tbody = el("tbody");
        ordered.forEach((t) => tbody.append(taskRow(t)));
        holder.append(el("div", { class: "table-wrap" },
            el("table", { class: "tbl" },
                el("thead", {}, el("tr", {},
                    el("th", { text: "" }),
                    el("th", { text: "Task" }),
                    el("th", { text: "Status" }),
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
            el("td", {}, statusBadge(t.status)),
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

    // Priority accent colours (index == priorityRank: P0..P3, then "none").
    const PR_COLORS = ["#ff6b7d", "#ffb020", "#7c5cff", "#35c88f", "var(--border)"];
    // Board columns are declared here so adding/re-ordering a column is a one-liner.
    // `canAdd` gates the quick-add "＋" + footer for real statuses; Overdue is a
    // derived urgency bucket (open tasks past due) so it has no quick-add.
    const BOARD_COLS = [
        { key: "overdue", title: "Overdue", icon: "⏰", accent: "#ff6b7d", status: "Open", addDue: true, canAdd: false, emptyHint: "Nothing overdue 🎉", filter: (t) => t.status.toLowerCase() === "open" && t.dueDate && t.dueDate < todayISO() },
        { key: "open", title: "To do", icon: "🗒️", accent: "#7c5cff", status: "Open", canAdd: true, emptyHint: "No tasks queued — add one", filter: (t) => t.status.toLowerCase() === "open" && !(t.dueDate && t.dueDate < todayISO()) },
        { key: "blocked", title: "Blocked", icon: "⛔", accent: "#ff8c32", status: "Blocked", canAdd: true, emptyHint: "No blockers right now", filter: (t) => t.status.toLowerCase() === "blocked" },
        { key: "done", title: "Done", icon: "✅", accent: "#35c88f", status: "Done", canAdd: true, emptyHint: "Nothing done yet", filter: (t) => t.status.toLowerCase() === "done" },
    ];

    function renderTaskBoard(holder, tasks) {
        const board = el("div", { class: "board" });
        for (const col of BOARD_COLS) {
            const items = tasks.filter(col.filter).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
            const colEl = el("div", { class: "board-col", dataset: { col: col.key }, style: `--col-accent:${col.accent}` });

            const addPrefill = () => taskModal(null, { status: col.status, due: col.addDue ? todayISO() : undefined });
            const head = el("div", { class: "board-col-head" },
                el("span", { class: "bch-dot" }),
                el("span", { class: "bch-icon", text: col.icon }),
                el("span", { class: "bch-title", text: col.title }),
                el("span", { class: "bch-count", text: String(items.length) }),
                col.canAdd ? el("button", { class: "bch-add", title: `Add to ${col.title}`, "aria-label": `Add task to ${col.title}`, html: "＋", onclick: addPrefill }) : null);

            const bodyEl = el("div", { class: "board-col-body" });
            if (items.length) items.forEach((t) => bodyEl.append(boardCard(t)));
            else bodyEl.append(el("div", { class: "board-col-empty", text: col.emptyHint }));

            colEl.append(head, bodyEl);
            if (col.canAdd) colEl.append(el("div", { class: "board-col-foot" },
                el("button", { class: "board-col-add", html: "＋ New", onclick: addPrefill })));

            // Drag & drop -> change status. Highlight only the drop target.
            colEl.addEventListener("dragover", (e) => { e.preventDefault(); colEl.classList.add("drop"); });
            colEl.addEventListener("dragleave", (e) => { if (!colEl.contains(e.relatedTarget)) colEl.classList.remove("drop"); });
            colEl.addEventListener("drop", async (e) => {
                e.preventDefault(); colEl.classList.remove("drop");
                const id = e.dataTransfer.getData("text/plain");
                try {
                    // Overdue and To do both map to the stored "Open" status; the card
                    // lands in the right column based on its due date.
                    if (col.status === "Done") await api(`/api/tasks/${id}/complete`, { method: "POST" });
                    else await api(`/api/tasks/${id}`, { method: "PUT", body: { status: col.status } });
                    await refreshSummary(); go("tasks");
                } catch (err) { toast("Error", err.message, "err"); }
            });
            board.append(colEl);
        }
        holder.append(board);
    }

    function boardCard(t) {
        const rank = priorityRank(t.priority);
        const done = t.status.toLowerCase() === "done";
        const blocked = t.status.toLowerCase() === "blocked";
        const overdue = !done && t.dueDate && t.dueDate < todayISO();
        const card = el("div", { class: `board-card pr-${rank}${done ? " is-done" : ""}`, draggable: "true", dataset: { taskTitle: t.title }, style: `--pr-accent:${PR_COLORS[rank]}` });
        card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));

        // Header row: priority + status flag, id pushed right — visually separate
        // from the title so the card reads cleanly.
        const head = el("div", { class: "bc-head" });
        if (t.priority) head.append(priorityBadge(t.priority));
        if (blocked) head.append(statusBadge("Blocked"));
        if (overdue) head.append(el("span", { class: "badge st-overdue", html: "⏰ Overdue" }));
        head.append(el("span", { class: "bc-id", text: `#${t.id}` }));

        card.append(head, el("div", { class: "bc-title", text: t.title, title: t.title, onclick: () => taskDetail(t) }));

        const foot = el("div", { class: "bc-foot" });
        if (t.dueDate) foot.append(el("span", { class: `bc-due${overdue ? " overdue" : (t.dueDate === todayISO() ? " today" : "")}`, html: `📅 ${esc(t.dueDate)}` }));
        if (String(t.tags || "").trim()) foot.append(tagChips(t.tags));
        if (foot.childNodes.length) card.append(foot);
        return card;
    }

    // ---------- Tasks · Calendar view ----------
    const CAL_FIELD_OPTS = [["priority", "Priority"], ["status", "Status"], ["tags", "Tags"]];
    const pad2 = (n) => String(n).padStart(2, "0");
    function fmtLocalISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
    function parseISO(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function startOfWeekMon(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

    function buildCalendarToolbar(tasks) {
        const anchor = parseISO(taskCalAnchorISO);
        // Human title for the current window.
        let title;
        if (taskCalMode === "week") {
            const ws = startOfWeekMon(anchor), we = addDays(ws, 6);
            const opt = { month: "short", day: "numeric" };
            title = `${ws.toLocaleDateString(undefined, opt)} – ${we.toLocaleDateString(undefined, opt)}, ${we.getFullYear()}`;
        } else {
            title = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        }
        const step = (dir) => {
            const a = parseISO(taskCalAnchorISO);
            if (taskCalMode === "week") { taskCalAnchorISO = fmtLocalISO(addDays(a, dir * 7)); }
            else { taskCalAnchorISO = fmtLocalISO(new Date(a.getFullYear(), a.getMonth() + dir, 1)); }
            go("tasks");
        };
        const modeSeg = el("div", { class: "segmented" },
            ...[["month", "Month"], ["week", "Week"]].map(([k, l]) =>
                el("button", { class: taskCalMode === k ? "active" : "", text: l,
                    onclick: () => { taskCalMode = k; localStorage.setItem("cp-task-cal-mode", k); go("tasks"); } })));

        // "Show fields" dropdown — pick which task info appears on each day chip.
        const menu = el("div", { class: "cal-fields-menu" },
            CAL_FIELD_OPTS.map(([key, label]) => {
                const cb = el("input", { type: "checkbox", ...(taskCalFields.includes(key) ? { checked: "checked" } : {}) });
                cb.addEventListener("change", () => {
                    const set = new Set(taskCalFields);
                    if (cb.checked) set.add(key); else set.delete(key);
                    taskCalFields = [...set];
                    localStorage.setItem("cp-task-cal-fields", taskCalFields.join(","));
                    go("tasks");
                });
                return el("label", { class: "cal-fields-opt" }, cb, el("span", { text: label }));
            }));
        const fields = el("details", { class: "cal-fields" },
            el("summary", { class: "btn", html: "▾ Fields" }), menu);

        const nav = el("div", { class: "cal-nav" },
            el("button", { class: "btn btn-ghost", html: "‹", title: "Previous", onclick: () => step(-1) }),
            el("span", { class: "cal-title", text: title }),
            el("button", { class: "btn btn-ghost", html: "›", title: "Next", onclick: () => step(1) }),
            el("button", { class: "btn", text: "Today", onclick: () => { taskCalAnchorISO = todayISO(); go("tasks"); } }));

        return el("div", { class: "toolbar cal-toolbar" },
            el("button", { class: "btn btn-primary", html: "＋ Add task", onclick: () => taskModal() }),
            nav,
            el("span", { class: "spacer" }),
            fields,
            modeSeg,
            el("input", { class: "search", placeholder: "Search tasks…", oninput: (e) => filterTasks(e.target.value) }));
    }

    function renderTaskCalendar(holder, tasks) {
        const anchor = parseISO(taskCalAnchorISO);
        const todayIso = todayISO();
        // Bucket dated tasks by day; count undated for a footnote.
        const byDay = new Map();
        let undated = 0;
        for (const t of tasks) {
            if (!t.dueDate) { undated++; continue; }
            (byDay.get(t.dueDate) || byDay.set(t.dueDate, []).get(t.dueDate)).push(t);
        }

        const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        let start, count;
        if (taskCalMode === "week") { start = startOfWeekMon(anchor); count = 7; }
        else { start = startOfWeekMon(new Date(anchor.getFullYear(), anchor.getMonth(), 1)); count = 42; }

        const grid = el("div", { class: `cal-grid ${taskCalMode === "week" ? "cal-week" : "cal-month"}` });
        weekdays.forEach((w) => grid.append(el("div", { class: "cal-wd", text: w })));

        for (let i = 0; i < count; i++) {
            const day = addDays(start, i);
            const iso = fmtLocalISO(day);
            const inMonth = taskCalMode === "week" || day.getMonth() === anchor.getMonth();
            const isToday = iso === todayIso;
            const cell = el("div", { class: `cal-day${inMonth ? "" : " other"}${isToday ? " today" : ""}` });
            cell.append(el("div", { class: "cal-daynum" },
                el("span", { class: "cal-dow-sm", text: taskCalMode === "week" ? weekdays[i] + " " : "" }),
                el("span", { text: String(day.getDate()) })));
            const list = el("div", { class: "cal-day-list" });
            const items = (byDay.get(iso) || []).slice().sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
            items.forEach((t) => list.append(calChip(t)));
            cell.append(list);
            grid.append(cell);
        }
        holder.append(grid);
        if (undated) holder.append(el("p", { class: "muted small", style: "margin-top:12px",
            text: `${undated} task${undated > 1 ? "s" : ""} without a due date ${undated > 1 ? "are" : "is"} not shown on the calendar.` }));
    }

    function priorityRank(p) {
        const s = String(p || "").toLowerCase();
        if (s === "p0" || s === "high") return 0;
        if (s === "p1") return 1;
        if (s === "p2" || s === "med") return 2;
        if (s === "p3" || s === "low") return 3;
        return 4;
    }

    function calChip(t) {
        const done = t.status.toLowerCase() === "done";
        const chip = el("div", { class: `cal-chip pr-${priorityRank(t.priority)}${done ? " done" : ""}`,
            dataset: { taskTitle: t.title }, title: t.title, onclick: () => taskDetail(t) });
        chip.append(el("div", { class: "cal-chip-title", text: t.title }));
        const meta = el("div", { class: "cal-chip-meta" });
        if (taskCalFields.includes("priority") && t.priority) meta.append(priorityBadge(t.priority));
        if (taskCalFields.includes("status")) meta.append(statusBadge(t.status));
        if (taskCalFields.includes("tags") && t.tags) meta.append(tagChips(t.tags));
        if (meta.childNodes.length) chip.append(meta);
        return chip;
    }

    async function removeTask(t) {
        if (!confirm(`Delete task "${t.title}"?`)) return;
        try { await api(`/api/tasks/${t.id}`, { method: "DELETE" }); toast("Deleted", t.title, "ok"); await refreshSummary(); go("tasks"); }
        catch (e) { toast("Error", e.message, "err"); }
    }

    function taskModal(t, prefill = {}) {
        const editing = !!t;
        const f = {};
        const body = el("div", { class: "form" },
            field("Title", f, "title", { value: t?.title, placeholder: "What needs doing?", required: true }),
            el("div", { class: "form-row" },
                field("Due date", f, "due", { value: t?.dueDate || prefill.due, type: "date" }),
                selectField("Priority", f, "priority", ["", "P0", "P1", "P2", "P3", "High", "Med", "Low"], t?.priority || prefill.priority)),
            selectField("Status", f, "status", ["Open", "Blocked", "Done"], t?.status || prefill.status || "Open", { Open: "To do", Blocked: "Blocked", Done: "Done" }),
            field("Tags", f, "tags", { value: t?.tags, placeholder: "comma,separated" }),
            mdField("Context", f, "context", { value: t?.context, placeholder: "One-line context (markdown supported)" }));
        const save = el("button", { class: "btn btn-primary", text: editing ? "Save changes" : "Add task", onclick: async () => {
            const payload = { title: f.title.value.trim(), due: f.due.value, priority: f.priority.value, tags: f.tags.value.trim(), context: f.context.value.trim(), status: f.status.value };
            if (!payload.title) { toast("Title required", "", "err"); return; }
            try {
                if (editing) { await api(`/api/tasks/${t.id}`, { method: "PUT", body: { title: payload.title, dueDate: payload.due, priority: payload.priority, tags: payload.tags, context: payload.context, status: payload.status } }); toast("Task updated", payload.title, "ok"); }
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
    function selectField(label, store, key, options, value, labels) {
        const sel = el("select", {});
        options.forEach((o) => { const opt = el("option", { value: o, text: (labels && labels[o]) || o || "—" }); if (o === value) opt.selected = true; sel.append(opt); });
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

    // ---------------------------------------------------------------- pomodoro
    const POMO_TYPES = [["focus", "Focus"], ["short-break", "Short break"], ["long-break", "Long break"]];
    const POMO_DEFAULT_MIN = { focus: 25, "short-break": 5, "long-break": 15 };
    const POMO_TYPE_LABEL = { focus: "Focus", "short-break": "Short break", "long-break": "Long break" };
    const POMO_LONG_BREAK_EVERY = 4; // classic Pomodoro: long break after every 4th focus
    // Distinct accent per session type (used for the ring arc and the dock badge).
    const POMO_TYPE_COLOR = { focus: "#ff6b6b", "short-break": "#35c88f", "long-break": "#5aa9ff" };
    const POMO_TYPE_BADGE = { focus: "st-focus", "short-break": "st-short", "long-break": "st-long" };
    const pomoColor = (type) => POMO_TYPE_COLOR[type] || POMO_TYPE_COLOR.focus;

    function fmtClock(sec) {
        const s = Math.max(0, Math.round(sec));
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }

    // Circular progress ring for the running timer.
    function pomoRing(remainingSec, plannedSec, size = 220, color = null) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.setAttribute("width", size); svg.setAttribute("height", size);
        const stroke = Math.max(4, Math.round(size * 0.064));
        const inset = Math.max(6, Math.round(size * 0.073));
        const cx = size / 2, cy = size / 2, r = size / 2 - inset, C = 2 * Math.PI * r;
        const frac = plannedSec > 0 ? Math.max(0, Math.min(1, remainingSec / plannedSec)) : 0;
        const track = document.createElementNS(NS, "circle");
        track.setAttribute("cx", cx); track.setAttribute("cy", cy); track.setAttribute("r", r);
        track.setAttribute("fill", "none"); track.setAttribute("stroke", "var(--panel-2)"); track.setAttribute("stroke-width", stroke);
        svg.append(track);
        const arc = document.createElementNS(NS, "circle");
        arc.setAttribute("cx", cx); arc.setAttribute("cy", cy); arc.setAttribute("r", r);
        arc.setAttribute("fill", "none"); arc.setAttribute("stroke", remainingSec === 0 ? "#4caf7d" : (color || "#ff6b6b"));
        arc.setAttribute("stroke-width", stroke); arc.setAttribute("stroke-linecap", "round");
        arc.setAttribute("stroke-dasharray", `${C * frac} ${C}`);
        arc.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
        svg.append(arc);
        // Compact rings (dock) are pure progress indicators; text only on the large ring.
        if (size >= 90) {
            const t1 = document.createElementNS(NS, "text");
            t1.setAttribute("x", cx); t1.setAttribute("y", cy - 2); t1.setAttribute("text-anchor", "middle");
            t1.setAttribute("font-size", String(Math.round(size * 0.18))); t1.setAttribute("font-weight", "800"); t1.setAttribute("fill", "var(--text)");
            t1.textContent = fmtClock(remainingSec);
            const t2 = document.createElementNS(NS, "text");
            t2.setAttribute("x", cx); t2.setAttribute("y", cy + Math.round(size * 0.1)); t2.setAttribute("text-anchor", "middle");
            t2.setAttribute("font-size", String(Math.round(size * 0.055))); t2.setAttribute("fill", "var(--text-faint)");
            t2.textContent = remainingSec === 0 ? "done" : "remaining";
            svg.append(t1, t2);
        }
        return svg;
    }

    // ------------------------------------------------- global pomodoro controller
    // A single app-wide loop drives BOTH the floating mini-timer dock and (when
    // visible) the full Pomodoro page, so the timer keeps running regardless of the
    // current view. Replaces the old view-local `pomoTick`.
    const pomo = { active: null, remaining: 0, planned: 0, expiredHandled: false, durations: null };
    let pomoLoop = null;
    let pomoSyncAccum = 0;
    let pomoPageUpdater = null; // set by VIEWS.pomodoro while it is mounted
    let pomoNotifyAsked = false;

    async function pomoDurations() {
        if (pomo.durations) return pomo.durations;
        try { const cfg = await api("/api/config"); pomo.durations = (cfg && cfg.pomodoro) || POMO_DEFAULT_MIN; }
        catch { pomo.durations = POMO_DEFAULT_MIN; }
        return pomo.durations;
    }

    function pomoAskNotifyPermission() {
        if (pomoNotifyAsked) return;
        pomoNotifyAsked = true;
        try {
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => {});
            }
        } catch { /* webview may not support Notifications */ }
    }

    function pomoBeep() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const now = ctx.currentTime;
            [0, 0.18].forEach((offset, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = i === 0 ? 880 : 660;
                gain.gain.setValueAtTime(0.0001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now + offset); osc.stop(now + offset + 0.18);
            });
            setTimeout(() => { try { ctx.close(); } catch { /* */ } }, 600);
        } catch { /* audio not available */ }
    }

    /** Re-fetch authoritative state from the server and refresh dock + page. */
    async function pomoSync() {
        let active = null;
        try { const res = await api("/api/pomodoro/status"); active = res && res.active; } catch { return; }
        const hadId = pomo.active ? pomo.active.startedAt : null;
        const newId = active ? active.startedAt : null;
        pomo.active = active || null;
        if (active) {
            // A different (new) session appeared -> reset expiry latch and ask for notifications.
            if (newId !== hadId) { pomo.expiredHandled = false; pomoAskNotifyPermission(); }
            pomo.planned = active.plannedSec;
            pomo.remaining = active.remainingSec;
            if (active.remainingSec === 0 && !pomo.expiredHandled) { pomo.expiredHandled = true; onPomoExpire(active); }
        } else {
            pomo.remaining = 0; pomo.planned = 0;
        }
        renderPomoDock();
        if (pomoPageUpdater) pomoPageUpdater();
    }

    function startPomoLoop() {
        if (pomoLoop) return;
        pomoSyncAccum = 0;
        pomoLoop = setInterval(async () => {
            pomoSyncAccum += 1;
            if (pomo.active && !pomo.active.paused) {
                pomo.remaining = Math.max(0, pomo.remaining - 1);
                if (pomo.remaining === 0 && !pomo.expiredHandled) {
                    pomo.expiredHandled = true;
                    onPomoExpire(pomo.active);
                }
                renderPomoDock();
                if (pomoPageUpdater) pomoPageUpdater();
            }
            // Periodic re-sync (~15s) corrects drift and catches CLI/other-surface changes.
            if (pomoSyncAccum >= 15) { pomoSyncAccum = 0; pomoSync(); }
        }, 1000);
    }

    function stopPomoLoop() { if (pomoLoop) { clearInterval(pomoLoop); pomoLoop = null; } }

    async function pomoAction(path) {
        await api(path, { method: "POST", body: {} });
        await pomoSync();
        if (state.view === "pomodoro") go("pomodoro");
    }

    /** Render / update the floating mini-timer dock (persists across navigation). */
    function renderPomoDock() {
        const host = $("#pomo-dock");
        if (!host) return;
        const a = pomo.active;
        if (!a) { host.classList.add("hidden"); host.innerHTML = ""; host.className = "pomo-dock hidden"; return; }
        const paused = !!a.paused;
        host.className = `pomo-dock pomo-${a.type}` + (pomo.remaining === 0 ? " is-done" : "") + (paused ? " is-paused" : "");
        host.innerHTML = "";
        const focusOn = a.task || a.label || "";
        const typeLabel = POMO_TYPE_LABEL[a.type] || a.type;
        const ringHost = el("div", { class: "pomo-dock-ring", title: "Open Pomodoro",
            onclick: () => go("pomodoro") }, pomoRing(pomo.remaining, pomo.planned, 46, pomoColor(a.type)));
        const info = el("div", { class: "pomo-dock-info", title: "Open Pomodoro", onclick: () => go("pomodoro") },
            el("div", { class: "pomo-dock-time", text: fmtClock(pomo.remaining) }),
            el("div", { class: "pomo-dock-label" },
                el("span", { class: `badge ${POMO_TYPE_BADGE[a.type] || "st-inprogress"}`, text: typeLabel }),
                paused ? el("span", { class: "badge st-paused", text: "Paused" })
                    : (focusOn ? el("span", { class: "muted small pomo-dock-task", text: focusOn }) : null)));
        const controls = el("div", { class: "pomo-dock-controls" },
            paused
                ? el("button", { class: "icon-btn pomo-dock-btn", title: "Resume", "aria-label": "Resume session", html: "▶",
                    onclick: async () => { try { await pomoAction("/api/pomodoro/resume"); toast("Resumed", typeLabel, "ok"); } catch (e) { toast("Error", e.message, "err"); } } })
                : el("button", { class: "icon-btn pomo-dock-btn", title: "Pause", "aria-label": "Pause session", html: "⏸",
                    onclick: async () => { try { await pomoAction("/api/pomodoro/pause"); toast("Paused", typeLabel, ""); } catch (e) { toast("Error", e.message, "err"); } } }),
            el("button", { class: "icon-btn pomo-dock-btn pomo-dock-stop", title: "Stop & log session", "aria-label": "Stop session", html: "⏹",
                onclick: async () => { try { await pomoAction("/api/pomodoro/complete"); toast("Pomodoro stopped", "Logged 🍅", "ok"); } catch (e) { toast("Error", e.message, "err"); } } }));
        host.append(ringHost, info, controls);
    }

    /** Fired once when a running session's countdown reaches zero. */
    async function onPomoExpire(session) {
        const finishedType = session.type;
        const finishedTask = session.task || session.label || "";
        pomoBeep();
        try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("CatPilot 🍅", {
                    body: finishedType === "focus" ? "Focus session done — time for a break?" : "Break's over — back to focus?",
                    silent: true,
                });
            }
        } catch { /* best-effort only */ }
        toast("Time! ⏰", finishedType === "focus" ? "Focus session finished 🍅" : "Break finished", "ok");
        renderPomoDock();

        const durations = await pomoDurations();
        const min = (t) => parseInt(durations[t], 10) || POMO_DEFAULT_MIN[t];

        // Log the finished session, then start the chosen next one (if any).
        async function choose(nextType, carryTask) {
            try {
                await api("/api/pomodoro/complete", { method: "POST", body: {} });
                if (nextType) {
                    const body = { type: nextType, minutes: min(nextType) };
                    if (nextType === "focus" && carryTask) body.task = carryTask;
                    await api("/api/pomodoro", { method: "POST", body });
                    toast("Started", POMO_TYPE_LABEL[nextType], "ok");
                }
            } catch (e) { toast("Error", e.message, "err"); }
            closeModal();
            await pomoSync();
            if (state.view === "pomodoro") go("pomodoro");
        }

        let suggestLong = false;
        if (finishedType === "focus") {
            try {
                const stats = await api("/api/pomodoro/stats?period=today");
                // The just-finished focus isn't logged yet, so add it to today's count.
                const done = (parseInt(stats && stats.focusSessions, 10) || 0) + 1;
                suggestLong = done % POMO_LONG_BREAK_EVERY === 0;
            } catch { /* default to short */ }
        }

        const btn = (label, cls, onclick) => el("button", { class: `btn ${cls}`, html: label, onclick });
        let foot;
        let bodyText;
        if (finishedType === "focus") {
            bodyText = suggestLong
                ? `Nice work — that's ${POMO_LONG_BREAK_EVERY} focus sessions. Time for a long break?`
                : "Focus session complete. Take a short break?";
            foot = el("div", { class: "toolbar", style: "flex-wrap:wrap;gap:8px" },
                btn(`☕ Short break (${min("short-break")}m)`, suggestLong ? "" : "btn-primary", () => choose("short-break")),
                btn(`🛋️ Long break (${min("long-break")}m)`, suggestLong ? "btn-primary" : "", () => choose("long-break")),
                btn(`🍅 Another focus (${min("focus")}m)`, "", () => choose("focus", finishedTask)),
                btn("Skip", "", () => choose(null)));
        } else {
            bodyText = "Break's over. Ready to focus again?";
            foot = el("div", { class: "toolbar", style: "flex-wrap:wrap;gap:8px" },
                btn(`🍅 Start focus (${min("focus")}m)`, "btn-primary", () => choose("focus")),
                btn("Skip", "", () => choose(null)));
        }
        openModal({
            title: finishedType === "focus" ? "Focus session done 🍅" : "Break over ☕",
            width: 460,
            body: el("div", {},
                el("p", { text: bodyText }),
                finishedTask ? el("p", { class: "muted small", text: `Was focusing on: ${finishedTask}` }) : null,
                el("p", { class: "muted small", text: "You decide — nothing starts automatically." })),
            foot,
        });
    }

    VIEWS.pomodoro = async (root) => {
        pomoPageUpdater = null;
        const [{ active }, stats, { sessions }, cfg] = await Promise.all([
            api("/api/pomodoro/status"),
            api("/api/pomodoro/stats?period=today"),
            api("/api/pomodoro?limit=8"),
            api("/api/config").catch(() => ({})),
        ]);
        const durations = (cfg && cfg.pomodoro) || POMO_DEFAULT_MIN;
        pomo.durations = durations;
        root.innerHTML = "";

        const timerCard = el("div", { class: "card", style: "text-align:center;padding:24px" });
        root.append(timerCard);

        let pageRingHost = null;
        let pageRenderedFor = "__init__"; // startedAt of the session the page structure was built for

        function renderRunning(activeSession) {
            timerCard.innerHTML = "";
            const paused = !!pomo.active?.paused;
            pageRingHost = el("div", { class: "pomo-ring" }, pomoRing(pomo.remaining, pomo.planned, 220, pomoColor(activeSession.type)));
            const focusOn = activeSession.task || activeSession.label || "";
            const typeLabel = POMO_TYPE_LABEL[activeSession.type] || activeSession.type;
            timerCard.append(
                pageRingHost,
                el("div", { class: "pomo-meta" },
                    el("span", { class: `badge ${POMO_TYPE_BADGE[activeSession.type] || "st-inprogress"}`, text: typeLabel }),
                    paused ? el("span", { class: "badge st-paused", text: "Paused" }) : null,
                    focusOn ? el("span", { class: "muted", text: `🎯 ${focusOn}` }) : null),
                el("div", { class: "toolbar", style: "justify-content:center;margin-top:16px" },
                    paused
                        ? el("button", { class: "btn btn-primary", html: "▶ Resume", onclick: async () => {
                            try { await api("/api/pomodoro/resume", { method: "POST", body: {} }); toast("Resumed", typeLabel, "ok"); await pomoSync(); go("pomodoro"); }
                            catch (e) { toast("Error", e.message, "err"); } } })
                        : el("button", { class: "btn", html: "⏸ Pause", onclick: async () => {
                            try { await api("/api/pomodoro/pause", { method: "POST", body: {} }); toast("Paused", typeLabel, ""); await pomoSync(); go("pomodoro"); }
                            catch (e) { toast("Error", e.message, "err"); } } }),
                    el("button", { class: "btn btn-primary", html: "✓ Complete", onclick: async () => {
                        try { await api("/api/pomodoro/complete", { method: "POST", body: {} }); toast("Pomodoro completed", "Logged 🍅", "ok"); await pomoSync(); go("pomodoro"); }
                        catch (e) { toast("Error", e.message, "err"); }
                    } }),
                    el("button", { class: "btn", html: "✕ Cancel", onclick: async () => {
                        try { await api("/api/pomodoro/cancel", { method: "POST", body: {} }); toast("Pomodoro cancelled", "", ""); await pomoSync(); go("pomodoro"); }
                        catch (e) { toast("Error", e.message, "err"); }
                    } })));
        }

        // The global loop calls this every second while the Pomodoro page is mounted.
        pomoPageUpdater = () => {
            if (state.view !== "pomodoro") return;
            const a = pomo.active;
            const id = a ? a.startedAt + (a.paused ? ":paused" : "") : null;
            if (id !== pageRenderedFor) {
                pageRenderedFor = id;
                if (a) renderRunning(a); else renderStartForm();
                return;
            }
            if (a && pageRingHost) pageRingHost.replaceChildren(pomoRing(pomo.remaining, pomo.planned, 220, pomoColor(a.type)));
        };

        async function renderStartForm() {
            pageRingHost = null;
            timerCard.innerHTML = "";
            const f = {};
            let tasks = [];
            try { tasks = await api("/api/tasks?status=open"); tasks = tasks.tasks || tasks || []; } catch { tasks = []; }
            const typeSel = el("select", {}, POMO_TYPES.map(([v, l]) => el("option", { value: v, text: l })));
            const minutes = el("input", { type: "number", min: "1", value: String(durations.focus || 25), style: "width:90px" });
            typeSel.addEventListener("change", () => { minutes.value = String(durations[typeSel.value] || POMO_DEFAULT_MIN[typeSel.value] || 25); });
            const taskSel = el("select", {}, el("option", { value: "", text: "— No task —" }),
                tasks.map((t) => el("option", { value: `#${t.id} ${t.title}`, text: `#${t.id} ${t.title}` })));
            f.type = typeSel; f.minutes = minutes; f.task = taskSel;

            timerCard.append(
                el("div", { class: "big", text: "🍅", style: "font-size:52px" }),
                el("h3", { text: "Start a focus session" }),
                el("div", { class: "form", style: "max-width:420px;margin:16px auto 0;text-align:left" },
                    el("div", { class: "form-row" },
                        el("label", {}, el("span", { text: "Type" }), typeSel),
                        el("label", {}, el("span", { text: "Minutes" }), minutes)),
                    el("label", {}, el("span", { text: "Focus on task (optional)" }), taskSel)),
                el("div", { class: "toolbar", style: "justify-content:center;margin-top:16px" },
                    el("button", { class: "btn btn-primary", html: "▶ Start", onclick: async () => {
                        const body = { type: typeSel.value, minutes: parseInt(minutes.value, 10) || undefined, task: taskSel.value || undefined };
                        try { await api("/api/pomodoro", { method: "POST", body }); toast("Pomodoro started", body.type, "ok"); await pomoSync(); go("pomodoro"); }
                        catch (e) { toast("Error", e.message, "err"); }
                    } })));
        }

        // Seed the page from the controller's authoritative state.
        pomo.active = active || null;
        if (active) { pomo.planned = active.plannedSec; pomo.remaining = active.remainingSec; renderRunning(active); pageRenderedFor = active.startedAt; }
        else { pomo.remaining = 0; pomo.planned = 0; await renderStartForm(); pageRenderedFor = null; }

        // Stats strip (today)
        root.append(el("div", { class: "grid stat-grid", style: "margin-top:16px" },
            statTile("🍅", stats.completedSessions, "Sessions today"),
            statTile("🎯", stats.focusSessions, "Focus sessions"),
            statTile("⏱️", stats.focusMinutes, "Focus minutes")));

        // Recent sessions
        if (sessions.length) {
            const tbody = el("tbody");
            sessions.forEach((s) => tbody.append(el("tr", {},
                el("td", {}, el("span", { class: "badge", text: s.type })),
                el("td", {}, el("span", { text: s.task || "—" })),
                el("td", {}, el("span", { class: "muted small", text: `${s.actualMin || 0} min` })),
                el("td", {}, statusBadge(s.status === "completed" ? "Done" : s.status)))));
            root.append(el("h3", { text: "Recent sessions", style: "margin:20px 0 8px" }),
                el("div", { class: "table-wrap" }, el("table", { class: "tbl" },
                    el("thead", {}, el("tr", {}, el("th", { text: "Type" }), el("th", { text: "Task" }), el("th", { text: "Actual" }), el("th", { text: "Status" }))),
                    tbody)));
        }

        // Productivity reports
        const reportHost = el("div", { style: "margin-top:24px" });
        root.append(reportHost);
        await renderPomoReports(reportHost);
    };

    let pomoReport = { period: "this-week", by: "day" };
    async function renderPomoReports(host) {
        host.innerHTML = "";
        const periodSel = el("select", {}, PERIODS.map(([v, l]) => el("option", { value: v, text: l, selected: v === pomoReport.period })));
        periodSel.value = pomoReport.period;
        periodSel.addEventListener("change", () => { pomoReport.period = periodSel.value; renderPomoReports(host); });
        const BYS = [["day", "By day"], ["week", "By week"], ["task", "By task"], ["session", "By session"]];
        const bySel = el("select", {}, BYS.map(([v, l]) => el("option", { value: v, text: l, selected: v === pomoReport.by })));
        bySel.value = pomoReport.by;
        bySel.addEventListener("change", () => { pomoReport.by = bySel.value; renderPomoReports(host); });

        host.append(el("div", { class: "toolbar", style: "align-items:center;gap:10px;margin-bottom:12px" },
            el("h3", { text: "📊 Productivity", style: "margin:0;margin-right:auto" }),
            periodSel, bySel));

        let data;
        try { data = await api(`/api/pomodoro/report?period=${encodeURIComponent(pomoReport.period)}&by=${encodeURIComponent(pomoReport.by)}`); }
        catch (e) { host.append(el("div", { class: "muted", text: e.message })); return; }
        const s = data.summary;
        const pct = (x) => `${Math.round((x || 0) * 100)}%`;

        host.append(el("div", { class: "grid stat-grid" },
            statTile("🎯", `${s.completedFocusSessions}/${s.focusSessions}`, "Focus completed"),
            statTile("⏱️", s.focusMinutes, "Focus minutes"),
            statTile("✅", pct(s.focusCompletionRate), "Focus completion"),
            statTile("🍅", s.totalSessions, "Total sessions")));

        if (!data.groups.length) { host.append(el("div", { class: "muted small", style: "margin-top:12px", text: "No sessions in this period yet." })); return; }

        // Charts row (skip bars for session view)
        const charts = el("div", { class: "grid", style: "grid-template-columns:2fr 1fr;gap:16px;margin-top:16px" });
        if (pomoReport.by !== "session") {
            const barItems = data.groups.map((g) => ({
                label: g.label,
                short: pomoReport.by === "day" ? g.label.slice(5) : (pomoReport.by === "week" ? g.label.replace(/^\d+-/, "") : g.label),
                value: g.focusMinutes || 0,
            }));
            charts.append(el("div", { class: "card" },
                el("div", { class: "muted small", style: "margin-bottom:8px", text: "Focus minutes" }),
                simpleBars(barItems, { color: "#7c5cff", unit: " min" })));
        }
        const donutHost = el("div", { class: "card", style: "text-align:center" },
            el("div", { class: "muted small", style: "margin-bottom:8px", text: "Completed vs abandoned" }),
            donut([
                { value: s.completedSessions, color: "#4ade80" },
                { value: s.abandonedSessions, color: "#f87171" },
            ]),
            el("div", { class: "legend", style: "justify-content:center" },
                el("span", {}, el("i", { style: "background:#4ade80" }), "Completed"),
                el("span", {}, el("i", { style: "background:#f87171" }), "Abandoned")));
        charts.append(donutHost);
        if (pomoReport.by === "session") charts.style.gridTemplateColumns = "1fr";
        host.append(charts);

        // Grouped table
        const tbody = el("tbody");
        if (pomoReport.by === "session") {
            data.groups.forEach((g) => tbody.append(el("tr", {},
                el("td", {}, el("span", { class: "muted small", text: new Date(g.started).toLocaleString() })),
                el("td", {}, el("span", { class: "badge", text: g.type })),
                el("td", {}, el("span", { text: g.task || "—" })),
                el("td", {}, el("span", { class: "muted small", text: `${g.actualMin}/${g.plannedMin} min` })),
                el("td", {}, statusBadge(g.status === "completed" ? "Done" : g.status)))));
            host.append(el("div", { class: "table-wrap", style: "margin-top:16px" }, el("table", { class: "tbl" },
                el("thead", {}, el("tr", {}, el("th", { text: "Started" }), el("th", { text: "Type" }), el("th", { text: "Task" }), el("th", { text: "Actual/Planned" }), el("th", { text: "Status" }))),
                tbody)));
        } else {
            const head = pomoReport.by === "task" ? "Task" : (pomoReport.by === "week" ? "Week" : "Day");
            data.groups.forEach((g) => tbody.append(el("tr", {},
                el("td", {}, el("span", { text: g.label })),
                el("td", {}, el("span", { text: `${g.completedFocusSessions}/${g.focusSessions}` })),
                el("td", {}, el("span", { text: String(g.focusMinutes) })),
                el("td", {}, el("span", { class: "muted small", text: pct(g.completionRate) })))));
            host.append(el("div", { class: "table-wrap", style: "margin-top:16px" }, el("table", { class: "tbl" },
                el("thead", {}, el("tr", {}, el("th", { text: head }), el("th", { text: "Focus done" }), el("th", { text: "Focus min" }), el("th", { text: "Completion" }))),
                tbody)));
        }
    }

    function statTile(icon, value, label) {
        return el("div", { class: "card", style: "text-align:center" },
            el("div", { class: "big", text: icon, style: "font-size:26px" }),
            el("div", { style: "font-size:24px;font-weight:800", text: String(value) }),
            el("div", { class: "muted small", text: label }));
    }

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

        // Pomodoro durations
        const pd = cfg.pomodoro || { focus: 25, "short-break": 5, "long-break": 15 };
        const dur = {};
        const durInput = (key) => { const i = el("input", { type: "number", min: "1", value: String(pd[key] || 1), style: "width:90px" }); dur[key] = i; return i; };
        const saveDur = el("button", { class: "btn btn-primary", html: "💾 Save durations", onclick: async () => {
            const body = { pomodoro: {
                focus: parseInt(dur.focus.value, 10),
                "short-break": parseInt(dur["short-break"].value, 10),
                "long-break": parseInt(dur["long-break"].value, 10),
            } };
            try { await api("/api/config/pomodoro", { method: "POST", body }); toast("Pomodoro durations saved", "", "ok"); go("settings"); }
            catch (e) { toast("Error", e.message, "err"); }
        } });
        root.append(el("div", { class: "card settings-card", style: "margin-top:16px" },
            el("h4", { text: "🍅 Pomodoro durations" }),
            el("p", { class: "muted small", text: "Default session lengths (minutes) used when you start a timer without a custom value." }),
            el("div", { class: "form" },
                el("div", { class: "form-row" },
                    el("label", {}, el("span", { text: "Focus" }), durInput("focus")),
                    el("label", {}, el("span", { text: "Short break" }), durInput("short-break")),
                    el("label", {}, el("span", { text: "Long break" }), durInput("long-break")))),
            el("div", { class: "toolbar", style: "margin-top:12px" }, saveDur)));
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
            { icon: "🧭", title: "Navigation", body: "The sidebar covers every CatPilot domain: **Tasks, Journal, Milestones, Memos, Learning, Growth, Projects**. Each has add buttons, inline edit and detail popups. **Tasks** offers a table and a kanban board with **Overdue · To do · Blocked · Done** columns, a status selector on create/edit, and **All / Today / 7 days** due-date filters." },
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
        await pomoSync();
        startPomoLoop();
        const initial = (location.hash || "").replace("#", "");
        go(NAV.some((n) => n.id === initial) ? initial : "dashboard");
    }

    window.addEventListener("hashchange", () => {
        const v = (location.hash || "").replace("#", "");
        if (v && v !== state.view && NAV.some((n) => n.id === v)) go(v);
    });

    boot();
})();
