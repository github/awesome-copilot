#!/usr/bin/env node
// pr-dashboard-cli.mjs
// Standalone CLI for the PR dashboard — no Copilot SDK required.
// Usage: node pr-dashboard-cli.mjs [query] [role]
//   query: natural-language date range, e.g. "last 2 weeks" (default: "last 7 days")
//   role:  one of "Authored by me" | "Requested reviews" | "Assigned to me" | "All"
//          (default: "Authored by me")

import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { execFile, spawn } from "child_process";
import { fileURLToPath } from "url";
import { parseDateRange } from "./lib/utils.mjs";

const execFileP = promisify(execFile);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const query = args[0] || "last 7 days";
const role  = args[1] || "Authored by me";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatHumanDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return d;
  }
}

async function ghApi(args) {
  try {
    const { stdout } = await execFileP("gh", ["api", ...args]);
    return JSON.parse(stdout);
  } catch (err) {
    if (err?.code === "ENOENT") throw new Error("`gh` CLI not found. Install GitHub CLI and authenticate (gh auth login).");
    let errorMessage = err?.message || String(err);
    if (err?.stdout) {
      try {
        const parsed = JSON.parse(err.stdout);
        if (parsed?.message) errorMessage = parsed.message;
      } catch (e) { /* fall through */ }
    }
    if (err?.stderr?.trim()) errorMessage = err.stderr.trim();
    throw new Error(`gh api failed: ${errorMessage}`);
  }
}

async function getGhUsername() {
  const res = await ghApi(["user"]);
  return res.login;
}

async function searchIssues(qstr) {
  const q = encodeURIComponent(qstr);
  const perPage = 100;
  const maxResults = 1000;
  const items = [];

  for (let page = 1; items.length < maxResults; page++) {
    const res = await ghApi([`/search/issues?q=${q}&per_page=${perPage}&page=${page}`]);
    const pageItems = res.items || [];
    if (pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < perPage) break;
  }

  return items.slice(0, maxResults);
}

async function getPrDetails(item) {
  try {
    const prHtml = item.html_url || item.pull_request?.html_url;
    const m = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(prHtml);
    if (!m) return null;
    const [, owner, repo, number] = m;

    const pr = await ghApi([`/repos/${owner}/${repo}/pulls/${number}`]);

    const out = {
      repo: `${owner}/${repo}`,
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      createdAt: formatHumanDate(pr.created_at),
      updatedAt: formatHumanDate(pr.updated_at),
      summary: (pr.body || "").split("\n").slice(0, 3).join(" "),
      status: "OPEN",
      review: "—",
      ci: "—",
      draft: pr.draft || false,
      bodyHtml: null,
      bodyMarkdown: pr.body || "",
    };

    if (out.draft) out.status = "DRAFT";
    else if (pr.merged) out.status = "MERGED";
    else if (pr.state === "closed") out.status = "CLOSED";

    // reviews
    try {
      const reviews = await ghApi([`/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`]);
      if (Array.isArray(reviews) && reviews.length) {
        const rev = [...reviews].reverse().find(r =>
          ["APPROVED", "CHANGES_REQUESTED", "DISMISSED", "COMMENTED"].includes((r.state || "").toUpperCase())
        );
        out.review = rev
          ? (rev.state || "").toUpperCase()
          : (reviews[reviews.length - 1].state || "").toUpperCase();
      } else {
        out.review = "REVIEW_REQUIRED";
      }
    } catch (e) { /* ignore */ }

    // CI status
    try {
      if (pr.head?.sha) {
        const status = await ghApi([`/repos/${owner}/${repo}/commits/${pr.head.sha}/status`]);
        if (status?.state) out.ci = (status.state || "").toUpperCase();
      }
    } catch (e) { /* ignore */ }

    // Render first paragraph to HTML via GitHub Markdown API
    try {
      if (pr.body && String(pr.body).trim()) {
        let firstPara = String(pr.body).split(/\r?\n\r?\n/)[0] || "";
        firstPara = firstPara.replace(/\s*\*{1,2}\s*([^*]+?)\s*\*{1,2}\s*:\s*$/, "").trim();
        if (firstPara) {
          const { stdout } = await execFileP("gh", [
            "api", "-X", "POST", "/markdown",
            "-f", `text=${firstPara}`, "-f", "mode=gfm", "-f", `context=${owner}/${repo}`,
          ]).catch(err => ({ stdout: err?.stdout || "" }));
          if (stdout && String(stdout).trim()) out.bodyHtml = stdout;
          out.bodyMarkdown = firstPara;
          out.summary = firstPara.replace(/\n+/g, " ").trim();
        } else {
          out.bodyHtml = null;
          out.bodyMarkdown = "";
          out.summary = "";
        }
      } else {
        out.bodyHtml = null;
        out.bodyMarkdown = "";
        out.summary = "";
      }
    } catch (e) { out.bodyHtml = null; }

    return out;
  } catch (e) {
    return null;
  }
}

async function pMap(list, mapper, concurrency = 5) {
  const results = new Array(list.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++;
      try { results[idx] = await mapper(list[idx]); } catch (e) { results[idx] = null; }
    }
  });
  await Promise.all(workers);
  return results.filter(Boolean);
}

function buildMarkdown(prs, label) {
  const open   = prs.filter(p => p.status === "OPEN").length;
  const merged = prs.filter(p => p.status === "MERGED").length;
  const closed = prs.filter(p => p.status === "CLOSED").length;
  const draft  = prs.filter(p => p.status === "DRAFT").length;

  const lines = [`## PR Dashboard — ${label}\n`,
    `**${prs.length} total** · ✅ ${open} open · 🔀 ${merged} merged · ❌ ${closed} closed · 📝 ${draft}\n\n`];

  for (const pr of prs) {
    lines.push(`**[${pr.title}](${pr.html_url})** · \`${pr.repo}\` · ${pr.status} · ${pr.review} · CI: ${pr.ci} · ${pr.createdAt}\n\n`);
    if (pr.summary) lines.push(`${pr.summary}\n\n`);
  }
  return lines.join("");
}

async function renderHtml(md, label = "PR Dashboard", prs = []) {
  const extDir = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(extDir, "../assets/dashboard.html");
  let template = "";
  try { template = fs.readFileSync(templatePath, "utf8"); }
  catch (e) {
    template = `<html><head><title>PR Dashboard — ${escapeHtml(label)}</title></head><body><pre>${escapeHtml(JSON.stringify(md))}</pre></body></html>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function statusColor(s) {
    return { DRAFT: "#848d97", MERGED: "#6f42c1", CLOSED: "#da3633", OPEN: "#d29922" }[(s || "").toUpperCase()] || "#848d97";
  }
  function reviewColor(r) {
    return { APPROVED: "#2ea043", CHANGES_REQUESTED: "#da3633", REVIEW_REQUIRED: "#d29922" }[(r || "").toUpperCase()] || "#848d97";
  }
  function ciColor(c) {
    return { SUCCESS: "#2ea043", FAILURE: "#da3633", PENDING: "#d29922" }[(c || "").toUpperCase()] || "#848d97";
  }

  const rows = prs.map(pr => {
    const previewHtml = (pr.bodyHtml && String(pr.bodyHtml).trim())
      ? pr.bodyHtml
      : pr.summary
        ? `<div style="margin-top:6px;white-space:pre-wrap;font-size:.95em;color:var(--text);">${escapeHtml(pr.summary)}</div>`
        : `<div style="margin-top:6px;color:var(--muted);font-size:.9em">No description</div>`;

    return `<tr>
  <td><a href="https://github.com/${escapeHtml(pr.repo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pr.repo)}</a></td>
  <td>
    <div class="title-line"><a href="${escapeHtml(pr.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pr.title)}</a></div>
    ${previewHtml}
  </td>
  <td><span class="badge" style="background:${statusColor(pr.status)}">${escapeHtml(pr.status)}</span></td>
  <td><span class="badge" style="background:${reviewColor(pr.review)}">${escapeHtml(pr.review)}</span></td>
  <td><span class="badge" style="background:${ciColor(pr.ci)}">${escapeHtml(pr.ci)}</span></td>
  <td style="white-space:nowrap">${escapeHtml(pr.createdAt)}</td>
  <td style="white-space:nowrap">${escapeHtml(pr.updatedAt)}</td>
</tr>`;
  }).join("\n");

  let replaced = template;
  replaced = replaced.replace(/<tbody id="tb">[\s\S]*?<\/tbody>/, `<tbody id="tb">\n${rows}\n</tbody>`);
  replaced = replaced.replace(/const __md = [\s\S]*?;/, `const __md = ${JSON.stringify(md)};`);
  replaced = replaced.replace(/<span class="visible-count" id="vc">[^<]*<\/span>/, `<span class="visible-count" id="vc">${prs.length} PR${prs.length !== 1 ? "s" : ""}</span>`);

  try { replaced = replaced.replace(/<title>[^<]*<\/title>/, `<title>PR Dashboard — ${escapeHtml(label)}</title>`); } catch (e) {}
  try { replaced = replaced.replace(/<h1[^>]*>[^<]*<\/h1>/, `<h1>🔀 PR Dashboard — ${escapeHtml(label)}</h1>`); } catch (e) {}

  try {
    const nowStr = new Date().toLocaleString();
    replaced = replaced.replace(/<div class="meta">[^<]*<\/div>/, `<div class="meta">Generated ${escapeHtml(nowStr)} · ${prs.length} pull requests</div>`);

    const counts = { open: 0, merged: 0, closed: 0, draft: 0 };
    for (const p of prs) counts[p.status.toLowerCase()] = (counts[p.status.toLowerCase()] || 0) + 1;

    function replaceStat(cls, val) {
      const marker = `<div class="${cls}">`;
      const idx = replaced.indexOf(marker);
      if (idx === -1) return;
      const nStart = replaced.indexOf('<div class="n">', idx);
      if (nStart === -1) return;
      const nEnd = replaced.indexOf("</div>", nStart);
      if (nEnd === -1) return;
      replaced = replaced.slice(0, nStart + '<div class="n">'.length) + String(val) + replaced.slice(nEnd);
    }
    replaceStat("stat open",   counts.open);
    replaceStat("stat merged", counts.merged);
    replaceStat("stat closed", counts.closed);
    replaceStat("stat draft",  counts.draft);
  } catch (e) {}

  try {
    const safe = String(label).replace(/[^a-z0-9]/gi, "_");
    replaced = replaced.replace(/const filename = '[^']*';/, `const filename = 'pr-dashboard-${safe}.md';`);
  } catch (e) {}

  const outPath = path.join(os.tmpdir(), "pr-dashboard.html");
  fs.writeFileSync(outPath, replaced, "utf8");
  return outPath;
}

function openInBrowser(filePath) {
  try {
    const platform = process.platform;
    const opener = platform === "win32" ? null : platform === "darwin" ? "open" : "xdg-open";
    const child = opener
      ? spawn(opener, [filePath], { detached: true, stdio: "ignore" })
      : spawn("cmd", ["/c", "start", '""', filePath], { detached: true, stdio: "ignore" });
    child.unref();
  } catch (e) { /* ignore */ }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const { start, end, label } = parseDateRange(query);
    const labelWithRange = `${label} (${start} → ${end})`;

    console.log(`[pr-dashboard] Fetching PRs for: ${labelWithRange} · role: ${role}`);

    const username = await getGhUsername();

    const roleMap = {
      "Authored by me":   `author:${username}`,
      "Requested reviews": `review-requested:${username}`,
      "Assigned to me":   `assignee:${username}`,
      "All":              `involves:${username}`,
    };
    const roleQualifier = roleMap[role] || `author:${username}`;
    const qstr = `is:pr ${roleQualifier} created:${start}..${end}`;

    console.log(`[pr-dashboard] Search: ${qstr}`);
    const items = await searchIssues(qstr);
    console.log(`[pr-dashboard] Found ${items.length} PR(s)`);

    if (!items.length) {
      const extDir = path.dirname(fileURLToPath(import.meta.url));
      const noResultsPath = path.join(os.tmpdir(), "pr-dashboard-no-results.html");
      fs.writeFileSync(noResultsPath,
        `<html><head><title>PR Dashboard — ${labelWithRange}</title></head><body><h1>No PRs found</h1><p>No pull requests matched your query for ${labelWithRange}.</p></body></html>`,
        "utf8"
      );
      openInBrowser(noResultsPath);
      console.log("[pr-dashboard] No results — opened placeholder page.");
      return;
    }

    const prs = await pMap(items, getPrDetails, 5);
    console.log(`[pr-dashboard] Fetched details for ${prs.length} PR(s)`);

    const md  = buildMarkdown(prs, labelWithRange);
    const out = await renderHtml(md, labelWithRange, prs);
    openInBrowser(out);
    console.log(`[pr-dashboard] Dashboard opened: ${out}`);
  } catch (e) {
    console.error("[pr-dashboard] Error:", e?.message || e);
    process.exit(1);
  }
})();
