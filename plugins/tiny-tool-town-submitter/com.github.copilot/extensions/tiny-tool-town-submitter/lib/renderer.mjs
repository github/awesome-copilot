const STYLE = `
* { box-sizing: border-box; }
:root {
  color-scheme: light dark;
  --accent: var(--true-color-blue, #0969da);
  --accent-muted: var(--true-color-blue-muted, #ddf4ff);
  --danger: var(--true-color-red, #cf222e);
  --danger-muted: var(--true-color-red-muted, #ffebe9);
  --success: #1a7f37;
  --success-muted: #dafbe1;
  --warning: #9a6700;
  --warning-muted: #fff8c5;
  --radius: 10px;
}
html, body { min-height: 100%; }
body {
  margin: 0;
  background:
    radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--accent) 10%, transparent) 0, transparent 28rem),
    radial-gradient(circle at 100% 18%, color-mix(in srgb, #a855f7 8%, transparent) 0, transparent 24rem),
    var(--background-color-default, #f6f8fa);
  color: var(--text-color-default, #1f2328);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}
button, input, textarea, select { font: inherit; }
button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: 2px solid var(--color-focus-outline, #0969da);
  outline-offset: 2px;
}
.shell { max-width: 1120px; margin: 0 auto; padding: 34px 28px 56px; }
.hero {
  position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 24px;
  margin-bottom: 18px; padding: 28px 30px;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border-color-default, #d0d7de));
  border-radius: 18px;
  background:
    linear-gradient(125deg, color-mix(in srgb, var(--accent) 10%, var(--background-color-default, #fff)), var(--background-color-default, #fff) 58%);
  box-shadow: 0 16px 44px color-mix(in srgb, var(--text-color-default, #1f2328) 9%, transparent);
}
.hero::after {
  content: ""; position: absolute; width: 210px; height: 210px; right: -70px; top: -115px;
  border-radius: 50%; background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.brand { display: flex; align-items: center; gap: 18px; min-width: 0; }
.brand-mark {
  width: 54px; height: 54px; display: grid; place-items: center; flex: 0 0 auto;
  border-radius: 15px; background: linear-gradient(145deg, var(--accent), #8250df);
  color: #fff; font-size: 28px; box-shadow: 0 9px 22px color-mix(in srgb, var(--accent) 28%, transparent);
}
.eyebrow { color: var(--accent); font-weight: var(--font-weight-semibold, 600); letter-spacing: .08em; text-transform: uppercase; font-size: 11px; }
h1 { margin: 3px 0 6px; font-size: 30px; line-height: 36px; letter-spacing: -.025em; }
.lede, .muted { color: var(--text-color-muted, #656d76); }
.lede { margin: 0; max-width: 700px; }
.status {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
  padding: 8px 12px; border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 999px; background: color-mix(in srgb, var(--background-color-default, #fff) 88%, transparent);
  font-weight: var(--font-weight-semibold, 600);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--text-color-default, #1f2328) 6%, transparent);
}
.status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--warning); }
.status.ready::before { background: var(--success); }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
.metric, .panel {
  background: var(--background-color-default, #fff);
  border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 13px;
}
.metric { position: relative; overflow: hidden; padding: 15px 17px; box-shadow: 0 5px 16px color-mix(in srgb, var(--text-color-default, #1f2328) 4%, transparent); }
.metric::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--metric-color, var(--accent)); }
.metric.success { --metric-color: var(--success); }
.metric.danger { --metric-color: var(--danger); }
.metric.warning { --metric-color: var(--warning); }
.metric strong { display: block; font-size: 19px; margin-top: 2px; }
.metric span { display: flex; align-items: center; gap: 6px; color: var(--text-color-muted, #656d76); font-size: 12px; }
.metric-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--metric-color, var(--accent)); }
.panel { margin-bottom: 18px; overflow: hidden; box-shadow: 0 8px 24px color-mix(in srgb, var(--text-color-default, #1f2328) 5%, transparent); }
.panel-head {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 16px 18px; border-bottom: 1px solid var(--border-color-default, #d0d7de);
}
.panel-head h2 { font-size: 16px; margin: 0; }
.panel-head p { margin: 2px 0 0; font-size: 12px; color: var(--text-color-muted, #656d76); }
.panel-title { display: flex; align-items: center; gap: 11px; }
.step-number {
  width: 28px; height: 28px; display: grid; place-items: center; flex: 0 0 auto;
  border-radius: 9px; color: var(--accent); background: var(--accent-muted);
  font-size: 12px; font-weight: var(--font-weight-semibold, 600);
}
.panel-body { padding: 18px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.span-2 { grid-column: 1 / -1; }
label { display: block; font-weight: var(--font-weight-semibold, 600); font-size: 12px; margin-bottom: 5px; }
.required::after { content: " *"; color: var(--danger); }
input, textarea, select {
  width: 100%; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px;
  background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328);
  padding: 10px 11px; transition: border-color .16s ease, box-shadow .16s ease;
}
input:hover, textarea:hover, select:hover { border-color: color-mix(in srgb, var(--accent) 48%, var(--border-color-default, #d0d7de)); }
input:focus, textarea:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
textarea { resize: vertical; min-height: 92px; }
.hint { color: var(--text-color-muted, #656d76); font-size: 11px; margin-top: 4px; }
.field-label-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
.field-label-row label { margin: 0; }
button.generate-button {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px;
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color-default, #d0d7de));
  color: var(--accent); font-size: 11px;
}
.description-options { display: none; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 10px; }
.description-options.visible { display: grid; }
.description-option {
  display: flex; min-width: 0; flex-direction: column; padding: 12px;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 9px;
  background: color-mix(in srgb, var(--background-color-default, #fff) 94%, var(--accent-muted));
}
.description-option-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
.description-option-head strong { font-size: 12px; }
.word-count { color: var(--text-color-muted, #656d76); font-size: 10px; white-space: nowrap; }
.description-option p {
  flex: 1; margin: 0 0 10px; color: var(--text-color-muted, #656d76);
  font-size: 11px; line-height: 16px;
}
.description-option button { align-self: flex-start; padding: 5px 8px; font-size: 11px; }
.checklist { display: grid; gap: 9px; margin-top: 4px; }
.checkline {
  display: flex; gap: 9px; align-items: flex-start; margin: 0; padding: 10px 12px;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 8px;
  background: color-mix(in srgb, var(--background-color-default, #fff) 92%, var(--accent-muted));
  font-weight: 400; font-size: 13px;
}
.checkline input { width: auto; margin-top: 3px; }
.theme-workbench {
  display: grid; grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.2fr); gap: 16px;
  padding: 15px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 11px;
  background: color-mix(in srgb, var(--background-color-default, #fff) 94%, var(--accent-muted));
}
.theme-control { min-width: 0; }
.theme-control .hint { margin-bottom: 12px; }
.theme-swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 12px; }
.theme-swatch { min-width: 0; }
.swatch-color { display: block; height: 28px; border: 1px solid rgba(127,127,127,.25); border-radius: 7px; }
.swatch-name { display: block; margin-top: 4px; overflow: hidden; color: var(--text-color-muted, #656d76); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.theme-preview {
  --preview-bg: #0f0e17; --preview-card: #1a1932; --preview-text: #fffffe;
  --preview-muted: #a7a9be; --preview-primary: #ff8906; --preview-accent: #3da9fc;
  --preview-tag-bg: rgba(61,169,252,.15); --preview-tag-text: #3da9fc; --preview-border: rgba(255,255,255,.08);
  min-height: 228px; padding: 12px; border-radius: 10px; overflow: hidden;
  background: var(--preview-bg); color: var(--preview-text);
  font-family: var(--preview-font, var(--font-sans, system-ui, sans-serif));
  box-shadow: inset 0 0 0 1px var(--preview-border);
  transition: background-color .2s ease, color .2s ease;
}
.preview-browser { display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
.preview-browser i { width: 6px; height: 6px; border-radius: 50%; background: var(--preview-muted); opacity: .65; }
.preview-browser span { margin-left: 5px; color: var(--preview-muted); font-size: 9px; letter-spacing: .04em; }
.preview-card {
  padding: 15px; border: 1px solid var(--preview-border); border-radius: 9px;
  background: var(--preview-card);
}
.preview-kicker { color: var(--preview-primary); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.preview-card h3 { margin: 4px 0 5px; color: var(--preview-text); font-size: 19px; line-height: 23px; }
.preview-card p { min-height: 32px; margin: 0 0 10px; color: var(--preview-muted); font-size: 11px; line-height: 16px; }
.preview-footer { display: flex; align-items: center; justify-content: space-between; gap: 9px; }
.preview-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.preview-tag { padding: 2px 7px; border-radius: 999px; background: var(--preview-tag-bg); color: var(--preview-tag-text); font-size: 9px; }
.preview-button { padding: 5px 8px; border-radius: 999px; background: var(--preview-primary); color: var(--preview-bg); font-size: 9px; font-weight: 700; white-space: nowrap; }
.recommendations { display: grid; gap: 10px; }
.recommendation {
  display: grid; grid-template-columns: auto 1fr; gap: 11px; padding: 13px;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px;
  transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
}
.recommendation:hover { border-color: color-mix(in srgb, var(--accent) 42%, var(--border-color-default, #d0d7de)); transform: translateY(-1px); box-shadow: 0 4px 12px color-mix(in srgb, var(--text-color-default, #1f2328) 5%, transparent); }
.recommendation input { width: auto; margin-top: 4px; }
.recommendation h3 { font-size: 14px; margin: 0 0 3px; }
.recommendation p { margin: 0; color: var(--text-color-muted, #656d76); font-size: 12px; }
.badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; margin-left: 7px; }
.badge.blocking { color: var(--danger); background: var(--danger-muted); }
.badge.recommended { color: var(--warning); background: var(--warning-muted); }
.badge.suggestion { color: var(--accent); background: var(--accent-muted); }
.actions {
  position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px; border-top: 1px solid var(--border-color-default, #d0d7de);
  background: color-mix(in srgb, var(--background-color-default, #fff) 92%, transparent);
  backdrop-filter: blur(10px);
}
.button-row { display: flex; flex-wrap: wrap; gap: 8px; }
button {
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px;
  background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328);
  padding: 9px 13px; font-weight: var(--font-weight-semibold, 600); cursor: pointer;
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}
button:hover { border-color: var(--accent); transform: translateY(-1px); }
button.primary { background: linear-gradient(135deg, var(--accent), #8250df); border-color: transparent; color: var(--color-white, #fff); box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 25%, transparent); }
button:disabled { opacity: .55; cursor: wait; }
.message { font-size: 12px; color: var(--text-color-muted, #656d76); min-height: 18px; }
.message.error { color: var(--danger); }
.message.success { color: var(--success); }
.repo-path { font-family: var(--font-mono, Consolas, monospace); font-size: 11px; word-break: break-all; }
.submission-link { color: var(--accent); font-weight: var(--font-weight-semibold, 600); }
@media (max-width: 760px) {
  .shell { padding: 18px 14px; }
  .hero { display: block; }
  .brand { align-items: flex-start; }
  .brand-mark { width: 46px; height: 46px; font-size: 23px; }
  .status { margin-top: 14px; }
  .summary { grid-template-columns: 1fr 1fr; }
  .grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
  .theme-workbench { grid-template-columns: 1fr; }
  .description-options { grid-template-columns: 1fr; }
  .actions { align-items: stretch; flex-direction: column; }
}
`;

export function renderHtml(nonce = "") {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tiny Tool Town Submitter</title>
  <style nonce="${nonce}">${STYLE}</style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">⌂</div>
        <div>
          <div class="eyebrow">Tiny Tool Town</div>
          <h1>Submission workshop</h1>
          <p class="lede">Polish your listing, preview its personality, and get the repository ready for its place in town.</p>
        </div>
      </div>
      <div id="status" class="status">Inspecting repository</div>
    </header>
    <section id="summary" class="summary" aria-label="Repository readiness summary"></section>
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <span class="step-number">1</span>
          <div>
            <h2>Shape the listing</h2>
            <p id="repoPath" class="repo-path"></p>
          </div>
        </div>
        <button id="refreshButton" type="button">Re-scan repository</button>
      </div>
      <form id="submissionForm" class="panel-body">
        <div class="grid">
          <div><label class="required" for="name">Tool name</label><input id="name" name="name" required /></div>
          <div><label class="required" for="tagline">One-line description</label><input id="tagline" name="tagline" maxlength="100" required /><div id="taglineHint" class="hint"></div></div>
          <div class="span-2">
            <div class="field-label-row">
              <label class="required" for="description">Tell us about your tool</label>
              <button id="generateDescriptionsButton" class="generate-button" type="button"><span aria-hidden="true">✦</span> Generate options</button>
            </div>
            <textarea id="description" name="description" required></textarea>
            <div id="descriptionOptions" class="description-options" aria-live="polite"></div>
          </div>
          <div class="span-2"><label class="required" for="githubUrl">GitHub repository URL</label><input id="githubUrl" name="githubUrl" type="url" required /></div>
          <div><label for="websiteUrl">Website or demo URL</label><input id="websiteUrl" name="websiteUrl" type="url" /></div>
          <div><label for="thumbnailUrl">Thumbnail image URL</label><input id="thumbnailUrl" name="thumbnailUrl" type="url" /><div class="hint">PNG, JPG, WebP, or GIF; ideally at least 960x540.</div></div>
          <div><label class="required" for="author">Author name</label><input id="author" name="author" required /></div>
          <div><label class="required" for="authorGitHub">GitHub username</label><input id="authorGitHub" name="authorGitHub" required /></div>
          <div><label class="required" for="tags">Tags</label><input id="tags" name="tags" required /><div class="hint">Comma-separated discovery tags.</div></div>
          <div><label for="language">Primary language</label><input id="language" name="language" /></div>
          <div><label for="license">License</label><input id="license" name="license" /></div>
          <div></div>
          <div class="span-2 theme-workbench">
            <div class="theme-control">
              <label for="theme">Page theme</label>
              <select id="theme" name="theme"></select>
              <div class="hint">Choose the color personality visitors will see on your Tiny Tool Town page.</div>
              <div id="themeSwatches" class="theme-swatches" aria-label="Selected theme colors"></div>
            </div>
            <div id="themePreview" class="theme-preview" aria-label="Selected Tiny Tool Town theme preview">
              <div class="preview-browser"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i><span>tinytooltown.com/tools/preview</span></div>
              <div class="preview-card">
                <div id="previewThemeName" class="preview-kicker">Site default</div>
                <h3 id="previewName">Your tiny tool</h3>
                <p id="previewTagline">A delightful little tool with one focused job.</p>
                <div class="preview-footer">
                  <div id="previewTags" class="preview-tags"></div>
                  <span class="preview-button">View on GitHub</span>
                </div>
              </div>
            </div>
          </div>
          <div class="span-2">
            <label>Required checklist</label>
            <div class="checklist">
              <label class="checkline"><input id="freeOpenSource" type="checkbox" /> This tool is free and open source.</label>
              <label class="checkline"><input id="notEnterpriseSaas" type="checkbox" /> This tool is not enterprise software or paid SaaS.</label>
              <label class="checkline"><input id="publicAndWorks" type="checkbox" /> The GitHub repository is public and the tool works.</label>
            </div>
          </div>
        </div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <span class="step-number">2</span>
          <div>
            <h2>Finish the curb appeal</h2>
            <p>Select improvements to hand off to a dedicated Copilot implementation session.</p>
          </div>
        </div>
      </div>
      <div id="recommendations" class="panel-body recommendations"></div>
      <div class="actions">
        <div id="message" class="message" role="status" aria-live="polite"></div>
        <div class="button-row">
          <button id="sessionButton" type="button">Start improvement session</button>
          <button id="submitButton" class="primary" type="button">Submit to Tiny Tool Town</button>
        </div>
      </div>
    </section>
  </main>
  <script nonce="${nonce}">
    const tokenParam = new URLSearchParams(location.search).get("token");
    const token = tokenParam || sessionStorage.getItem("tiny-tool-town-submitter-token") || "";
    if (tokenParam) {
      sessionStorage.setItem("tiny-tool-town-submitter-token", tokenParam);
      history.replaceState(null, "", location.pathname + location.hash);
    }
    let currentState = null;
    let saveTimer = null;
    let generatedDescriptions = [];
    const fields = ["name", "tagline", "description", "githubUrl", "websiteUrl", "thumbnailUrl", "author", "authorGitHub", "tags", "language", "license", "theme"];
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    const themePalettes = {
      "None (site default)": { bg:"#0f0e17", card:"#1a1932", text:"#fffffe", muted:"#a7a9be", primary:"#ff8906", accent:"#3da9fc", tagBg:"rgba(61,169,252,.15)", tagText:"#3da9fc", border:"rgba(255,255,255,.08)", font:"system-ui, sans-serif" },
      terminal: { bg:"#0a0a0a", card:"#111111", text:"#00ff41", muted:"#00aa2a", primary:"#00ff41", accent:"#00ff41", tagBg:"rgba(0,255,65,.1)", tagText:"#00ff41", border:"rgba(0,255,65,.15)", font:"'Courier New', monospace" },
      neon: { bg:"#0d0221", card:"#150535", text:"#f0e6ff", muted:"#b088d4", primary:"#ff2a6d", accent:"#05d9e8", tagBg:"rgba(5,217,232,.15)", tagText:"#05d9e8", border:"rgba(255,42,109,.2)", font:"system-ui, sans-serif" },
      minimal: { bg:"#fafafa", card:"#ffffff", text:"#222222", muted:"#777777", primary:"#333333", accent:"#333333", tagBg:"rgba(0,0,0,.06)", tagText:"#444444", border:"rgba(0,0,0,.08)", font:"system-ui, sans-serif" },
      pastel: { bg:"#fef6f9", card:"#ffffff", text:"#4a3f5c", muted:"#8e82a6", primary:"#e8829a", accent:"#82cae8", tagBg:"rgba(200,130,232,.1)", tagText:"#a872cc", border:"rgba(200,130,232,.15)", font:"system-ui, sans-serif" },
      matrix: { bg:"#000800", card:"#001200", text:"#00ff00", muted:"#008f00", primary:"#00ff00", accent:"#00ff00", tagBg:"rgba(0,255,0,.08)", tagText:"#00ff00", border:"rgba(0,255,0,.1)", font:"'Courier New', monospace" },
      sunset: { bg:"#1a0a2e", card:"#251244", text:"#ffe6cc", muted:"#cc9e77", primary:"#ff6b35", accent:"#ff9f1c", tagBg:"rgba(255,107,53,.15)", tagText:"#ff9f1c", border:"rgba(255,107,53,.15)", font:"system-ui, sans-serif" },
      ocean: { bg:"#0a1628", card:"#0f2035", text:"#d4eaf7", muted:"#7ba7c9", primary:"#00b4d8", accent:"#48cae4", tagBg:"rgba(0,180,216,.12)", tagText:"#48cae4", border:"rgba(0,180,216,.12)", font:"system-ui, sans-serif" },
      forest: { bg:"#1a2416", card:"#243020", text:"#d4e6c3", muted:"#8aaa72", primary:"#82b74b", accent:"#a8cc60", tagBg:"rgba(130,183,75,.12)", tagText:"#a8cc60", border:"rgba(130,183,75,.12)", font:"system-ui, sans-serif" },
      candy: { bg:"#ff69b4", card:"#ff91cb", text:"#ffffff", muted:"#fce4f0", primary:"#ffff00", accent:"#7b2fff", tagBg:"rgba(255,255,0,.3)", tagText:"#ffffff", border:"rgba(255,255,255,.4)", font:"system-ui, sans-serif" },
      synthwave: { bg:"#1a1033", card:"#241546", text:"#e8d5ff", muted:"#a87fd4", primary:"#ff71ce", accent:"#01cdfe", tagBg:"rgba(185,103,255,.15)", tagText:"#b967ff", border:"rgba(255,113,206,.15)", font:"system-ui, sans-serif" },
      newspaper: { bg:"#f2efe6", card:"#fffdf7", text:"#1a1a1a", muted:"#555555", primary:"#b91c1c", accent:"#b91c1c", tagBg:"rgba(0,0,0,.06)", tagText:"#1a1a1a", border:"rgba(0,0,0,.15)", font:"Georgia, 'Times New Roman', serif" },
      retro: { bg:"#1a1200", card:"#2a1f00", text:"#ffb000", muted:"#b87a00", primary:"#ffb000", accent:"#ffb000", tagBg:"rgba(255,176,0,.1)", tagText:"#ffb000", border:"rgba(255,176,0,.12)", font:"'Courier New', monospace" },
    };

    async function api(path, options = {}) {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(path + separator + "token=" + encodeURIComponent(token), {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { payload = { error: text }; }
      if (!response.ok) throw new Error(payload.error || text || "Request failed");
      return payload;
    }

    function collectMetadata() {
      const metadata = {};
      for (const id of fields) metadata[id] = document.getElementById(id).value.trim();
      metadata.confirmations = {
        freeOpenSource: document.getElementById("freeOpenSource").checked,
        notEnterpriseSaas: document.getElementById("notEnterpriseSaas").checked,
        publicAndWorks: document.getElementById("publicAndWorks").checked,
      };
      return metadata;
    }

    function setMessage(text, type = "") {
      const element = document.getElementById("message");
      element.textContent = text;
      element.className = "message " + type;
    }

    function renderDescriptionOptions(options) {
      generatedDescriptions = Array.isArray(options) ? options : [];
      const container = document.getElementById("descriptionOptions");
      container.classList.toggle("visible", generatedDescriptions.length > 0);
      container.innerHTML = generatedDescriptions.map((option) =>
        '<article class="description-option">' +
          '<div class="description-option-head"><strong>' + escapeHtml(option.label) + '</strong><span class="word-count">' + escapeHtml(option.wordCount) + ' words</span></div>' +
          '<p>' + escapeHtml(option.description) + '</p>' +
          '<button type="button" data-apply-description="' + escapeHtml(option.id) + '">Use this option</button>' +
        '</article>'
      ).join("");
    }

    function applyThemePreview() {
      const selected = document.getElementById("theme").value || "None (site default)";
      const palette = themePalettes[selected] || themePalettes["None (site default)"];
      const preview = document.getElementById("themePreview");
      const properties = {
        "--preview-bg": palette.bg,
        "--preview-card": palette.card,
        "--preview-text": palette.text,
        "--preview-muted": palette.muted,
        "--preview-primary": palette.primary,
        "--preview-accent": palette.accent,
        "--preview-tag-bg": palette.tagBg,
        "--preview-tag-text": palette.tagText,
        "--preview-border": palette.border,
        "--preview-font": palette.font,
      };
      for (const [name, value] of Object.entries(properties)) preview.style.setProperty(name, value);
      document.getElementById("previewThemeName").textContent = selected === "None (site default)" ? "Site default" : selected;
      document.getElementById("previewName").textContent = document.getElementById("name").value.trim() || "Your tiny tool";
      document.getElementById("previewTagline").textContent = document.getElementById("tagline").value.trim() || "A delightful little tool with one focused job.";
      const tags = document.getElementById("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 2);
      if (!tags.length) tags.push("tiny", "open-source");
      document.getElementById("previewTags").innerHTML = tags.map((tag) => '<span class="preview-tag">' + escapeHtml(tag) + '</span>').join("");
      const swatches = [
        ["Background", palette.bg],
        ["Card", palette.card],
        ["Primary", palette.primary],
        ["Accent", palette.accent],
      ];
      const swatchesElement = document.getElementById("themeSwatches");
      swatchesElement.innerHTML = swatches.map(([name, color], index) =>
        '<div class="theme-swatch" title="' + escapeHtml(name + ": " + color) + '"><span class="swatch-color" data-swatch="' + index + '"></span><span class="swatch-name">' + escapeHtml(name) + '</span></div>'
      ).join("");
      swatches.forEach(([, color], index) => {
        swatchesElement.querySelector('[data-swatch="' + index + '"]').style.background = color;
      });
    }

    function render(state) {
      currentState = state;
      renderDescriptionOptions([]);
      const blocking = state.recommendations.filter((item) => item.severity === "blocking").length;
      const ready = blocking === 0;
      const status = document.getElementById("status");
      status.textContent = ready ? "Ready for final review" : blocking + " blocking issue" + (blocking === 1 ? "" : "s");
      status.className = "status " + (ready ? "ready" : "");
      document.getElementById("repoPath").textContent = state.repoPath;
      const facts = state.facts;
      document.getElementById("summary").innerHTML = [
        ["README", facts.hasReadme ? "Found" : "Missing", facts.hasReadme ? "success" : "danger"],
        ["License file", facts.licensePath ? "Found" : "Missing", facts.licensePath ? "success" : "danger"],
        ["Showcase image", facts.hasThumbnail ? "Found" : "Missing", facts.hasThumbnail ? "success" : "warning"],
        ["GitHub visibility", facts.isPrivate === false ? "Public" : facts.isPrivate === true ? "Private" : "Unverified", facts.isPrivate === false ? "success" : facts.isPrivate === true ? "danger" : "warning"],
      ].map(([label, value, tone]) => '<div class="metric ' + escapeHtml(tone) + '"><span><i class="metric-dot" aria-hidden="true"></i>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>').join("");

      for (const id of fields) {
        const element = document.getElementById(id);
        if (id === "theme") {
          element.innerHTML = state.themes.map((theme) => '<option value="' + escapeHtml(theme) + '">' + escapeHtml(theme) + '</option>').join("");
        }
        element.value = state.metadata[id] || "";
      }
      const confirmations = state.metadata.confirmations || {};
      for (const id of ["freeOpenSource", "notEnterpriseSaas", "publicAndWorks"]) {
        document.getElementById(id).checked = Boolean(confirmations[id]);
      }
      document.getElementById("taglineHint").textContent = (state.metadata.tagline || "").length + " / 100 characters";
      applyThemePreview();
      document.getElementById("recommendations").innerHTML = state.recommendations.length
        ? state.recommendations.map((item) => '<label class="recommendation"><input type="checkbox" data-recommendation="' + escapeHtml(item.id) + '" ' + (item.severity === "blocking" || item.severity === "recommended" ? "checked" : "") + ' /><div><h3>' + escapeHtml(item.title) + '<span class="badge ' + escapeHtml(item.severity) + '">' + escapeHtml(item.severity) + '</span></h3><p>' + escapeHtml(item.detail) + '</p></div></label>').join("")
        : '<p class="muted">No repository improvements were detected. Complete the checklist and submit when ready.</p>';
      if (state.submission?.url) {
        setMessage("Submitted: " + state.submission.url, "success");
      }
    }

    async function save() {
      try {
        const state = await api("/save", { method: "POST", body: JSON.stringify({ metadata: collectMetadata() }) });
        currentState = state;
        document.getElementById("taglineHint").textContent = (state.metadata.tagline || "").length + " / 100 characters";
      } catch (error) {
        setMessage(error.message, "error");
      }
    }

    document.getElementById("submissionForm").addEventListener("input", () => {
      applyThemePreview();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 350);
    });

    document.getElementById("refreshButton").addEventListener("click", async () => {
      const button = document.getElementById("refreshButton");
      button.disabled = true;
      setMessage("Re-scanning repository…");
      try {
        render(await api("/refresh", {
          method: "POST",
          body: JSON.stringify({ metadata: collectMetadata() }),
        }));
        setMessage("Repository analysis refreshed.", "success");
      } catch (error) {
        setMessage(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById("generateDescriptionsButton").addEventListener("click", async () => {
      const button = document.getElementById("generateDescriptionsButton");
      button.disabled = true;
      setMessage("Asking Copilot for short, balanced, and detailed options…");
      try {
        await save();
        const result = await api("/generate-descriptions", {
          method: "POST",
          body: JSON.stringify({ metadata: collectMetadata() }),
        });
        renderDescriptionOptions(result.options);
        setMessage("Choose an option below to apply it to your draft.", "success");
      } catch (error) {
        setMessage(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById("descriptionOptions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-apply-description]");
      if (!button) return;
      const option = generatedDescriptions.find((candidate) => candidate.id === button.dataset.applyDescription);
      if (!option) return;
      const textarea = document.getElementById("description");
      textarea.value = option.description;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      setMessage(option.label + " description applied to the draft.", "success");
    });

    document.getElementById("sessionButton").addEventListener("click", async () => {
      const ids = [...document.querySelectorAll("[data-recommendation]:checked")].map((input) => input.dataset.recommendation);
      if (!ids.length) {
        setMessage("Select at least one recommendation to implement.", "error");
        return;
      }
      const button = document.getElementById("sessionButton");
      button.disabled = true;
      setMessage("Requesting a dedicated implementation session…");
      try {
        await save();
        const result = await api("/implement", { method: "POST", body: JSON.stringify({ recommendationIds: ids }) });
        setMessage(result.message, "success");
      } catch (error) {
        setMessage(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById("submitButton").addEventListener("click", async () => {
      if (!confirm("Create a public issue in shanselman/TinyToolTown with these details?")) return;
      const button = document.getElementById("submitButton");
      button.disabled = true;
      setMessage("Checking for duplicates and creating the issue…");
      try {
        const result = await api("/submit", { method: "POST", body: JSON.stringify({ metadata: collectMetadata(), confirm: true }) });
        render(result.state);
        setMessage(result.existing ? "An existing submission was found: " + result.url : "Submission created: " + result.url, "success");
      } catch (error) {
        setMessage(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    api("/state").then(render).catch((error) => setMessage(error.message, "error"));
  </script>
</body>
</html>`;
}
