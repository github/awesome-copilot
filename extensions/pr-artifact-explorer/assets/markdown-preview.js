(() => {
  "use strict";

  const MAX_CHARS = 2 * 1024 * 1024;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeUrl(url) {
    const value = String(url).trim();
    return /^(https?:|mailto:|#)/i.test(value) ? value : "";
  }

  // Input is HTML-escaped first, so only markup produced here reaches the DOM.
  function inline(text) {
    const codes = [];
    let out = esc(text).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _t, code) => {
      codes.push(`<code>${code.trim()}</code>`);
      return `\u0000${codes.length - 1}\u0000`;
    });
    out = out
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_m, alt) => `<span class="md-image">[image: ${alt || "no description"}]</span>`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_m, label, href) => {
        const safe = safeUrl(href.replaceAll("&amp;", "&"));
        return safe
          ? `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : label;
      })
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a, b) => `<strong>${a ?? b}</strong>`)
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, (_m, pre, t) => `${pre}<em>${t}</em>`)
      .replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, (_m, pre, t) => `${pre}<em>${t}</em>`)
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
  }

  function splitRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function toHtml(source) {
    const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    const startsBlock = (line) =>
      /^\s*(#{1,6}\s|```|~~~|>|[-*+]\s|\d+[.)]\s|(?:-\s*){3,}$|(?:\*\s*){3,}$)/.test(line);
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      const fence = line.match(/^\s*(```|~~~)\s*([\w+-]*)/);
      if (fence) {
        const body = [];
        i += 1;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
        i += 1;
        out.push(`<pre class="md-code"><code>${esc(body.join("\n"))}</code></pre>`);
        continue;
      }
      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
        i += 1;
        continue;
      }
      if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) {
        out.push("<hr />");
        i += 1;
        continue;
      }
      if (/^\s*>/.test(line)) {
        const body = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
        out.push(`<blockquote>${toHtml(body.join("\n"))}</blockquote>`);
        continue;
      }
      if (line.includes("|") && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] ?? "")) {
        const head = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
        out.push(
          `<div class="md-table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows
            .map((r) => `<tr>${head.map((_h, n) => `<td>${inline(r[n] ?? "")}</td>`).join("")}</tr>`)
            .join("")}</tbody></table></div>`,
        );
        continue;
      }
      const list = line.match(/^(\s*)([-*+]|\d+[.)])\s+/);
      if (list) {
        const ordered = /\d/.test(list[2]);
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (m && /\d/.test(m[2]) === ordered && m[1].length < 2 + list[1].length) {
            items.push([m[3]]);
            i += 1;
          } else if (m && items.length && m[1].length >= 2 + list[1].length) {
            items[items.length - 1].push(lines[i].slice(2 + list[1].length));
            i += 1;
          } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
            items[items.length - 1].push(lines[i].trim());
            i += 1;
          } else break;
        }
        const tag = ordered ? "ol" : "ul";
        out.push(
          `<${tag}>${items
            .map(([first, ...rest]) => {
              const task = first.match(/^\[([ xX])\]\s+(.*)$/);
              const head = task
                ? `<input type="checkbox" disabled ${task[1] === " " ? "" : "checked"} aria-label="${task[1] === " " ? "Not done" : "Done"}" /> ${inline(task[2])}`
                : inline(first);
              return `<li>${head}${rest.length ? toHtml(rest.join("\n")) : ""}</li>`;
            })
            .join("")}</${tag}>`,
        );
        continue;
      }
      const para = [];
      while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i]))) para.push(lines[i++]);
      out.push(`<p>${para.map((p) => inline(p.replace(/\s+$/, ""))).join("<br />")}</p>`);
    }
    return out.join("\n");
  }

  function render(source, container) {
    const text = String(source ?? "");
    const clipped = text.length > MAX_CHARS;
    const article = document.createElement("article");
    article.className = "markdown-preview";
    article.dataset.markdown = "rendered";
    article.innerHTML = toHtml(clipped ? text.slice(0, MAX_CHARS) : text);
    if (clipped) {
      const note = document.createElement("p");
      note.className = "raw-note";
      note.textContent = "Rendering is limited to the first 2 MB. Use Raw or Download for the full file.";
      article.prepend(note);
    }
    container.replaceChildren(article);
  }

  window.MarkdownPreview = { render, toHtml };
})();
