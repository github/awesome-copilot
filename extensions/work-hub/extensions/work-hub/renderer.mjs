export function renderHtml() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Work Hub</title>
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background:
    radial-gradient(1200px 400px at 100% -10%, color-mix(in srgb, var(--true-color-blue, #0969da) 12%, transparent), transparent),
    var(--background-color-default, #ffffff);
  color: var(--text-color-default, #1f2328);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}
button, select, input { font: inherit; color: inherit; }
a { color: var(--true-color-blue, #0969da); text-decoration: none; }
a:hover { text-decoration: underline; }
.muted { color: var(--text-color-muted, #656d76); }
.tiny { font-size: 12px; color: var(--text-color-muted, #656d76); }

.app { min-height: 100vh; }
header.top {
  position: sticky; top: 0; z-index: 20;
  backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--background-color-default, #fff) 82%, transparent);
  border-bottom: 1px solid var(--border-color-default, #d0d7de);
  padding: 14px 20px 0;
}
.top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 12px; }
.logo {
  width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
  background: linear-gradient(140deg, var(--true-color-blue, #0969da), color-mix(in srgb, var(--true-color-blue, #0969da) 40%, #8250df));
  color: #fff; font-weight: 700; font-size: 18px;
}
h1 { margin: 0; font-size: var(--text-title-large, 24px); line-height: 1.1; }
.subtitle { margin: 3px 0 0; }

.controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.field { display: grid; gap: 5px; }
.field > span { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; color: var(--text-color-muted, #656d76); padding-left: 2px; }
.control {
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 12px;
  background-color: var(--background-color-default, #fff);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path fill='none' stroke='%23808895' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/></svg>");
  background-repeat: no-repeat; background-position: right 10px center; background-size: 15px;
  padding: 9px 32px 9px 12px; min-width: 128px; cursor: pointer;
  font-size: 13px; font-weight: 600; color: var(--text-color-default, #1f2328);
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
}
.control:hover { border-color: color-mix(in srgb, var(--true-color-blue, #0969da) 55%, var(--border-color-default, #d0d7de)); background-color: color-mix(in srgb, var(--true-color-blue, #0969da) 5%, var(--background-color-default, #fff)); }
.control:focus-visible, .control:focus { outline: none; border-color: var(--true-color-blue, #0969da); box-shadow: 0 0 0 3px color-mix(in srgb, var(--true-color-blue, #0969da) 22%, transparent); }
.control option { font-weight: 500; }
/* mood/time/bandwidth/focus read as one modern segmented cluster */
.controls .field:nth-child(-n+4) .control { background-color: color-mix(in srgb, var(--text-color-muted, #656d76) 6%, var(--background-color-default, #fff)); border-radius: 999px; box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent); }
.controls .field:nth-child(-n+4) .control:hover { background-color: color-mix(in srgb, var(--true-color-blue, #0969da) 8%, var(--background-color-default, #fff)); }
.btn {
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px;
  background: var(--background-color-default, #fff); padding: 8px 12px; cursor: pointer;
  font-weight: var(--font-weight-semibold, 600);
}
.btn:hover { border-color: var(--true-color-blue, #0969da); }
.btn.primary { background: var(--true-color-blue, #0969da); color: #fff; border-color: var(--true-color-blue, #0969da); }
.btn:disabled { opacity: .55; cursor: default; }

.tabs { display: flex; gap: 4px; margin-top: 14px; }
.tab {
  border: none; background: transparent; padding: 10px 14px; cursor: pointer;
  border-bottom: 2px solid transparent; color: var(--text-color-muted, #656d76); font-weight: 600;
  display: flex; align-items: center; gap: 7px;
}
.tab.active { color: var(--text-color-default, #1f2328); border-bottom-color: var(--true-color-blue, #0969da); }
.tab .count {
  font-size: 11px; background: color-mix(in srgb, var(--text-color-muted, #656d76) 18%, transparent);
  border-radius: 999px; padding: 1px 7px; font-weight: 700;
}

main { padding: 18px 20px 40px; max-width: 1180px; margin: 0 auto; }
.view { display: none; }
.view.active { display: block; }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 10px; margin-bottom: 18px; }
.stat {
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 14px; padding: 12px 14px;
  background: color-mix(in srgb, var(--background-color-default, #fff) 94%, var(--text-color-default, #1f2328) 6%);
  cursor: pointer; transition: transform .08s ease, border-color .08s ease;
}
.stat:hover { transform: translateY(-2px); border-color: var(--true-color-blue, #0969da); }
.stat strong { display: block; font-size: 26px; line-height: 30px; }
.stat span { font-size: 12px; color: var(--text-color-muted, #656d76); }
.stat.alert strong { color: #cf222e; }
.stat.warn strong { color: #9a6700; }

.toolbar {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px;
}
.search {
  flex: 1 1 240px; min-width: 200px; display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; padding: 8px 10px;
  background: var(--background-color-default, #fff);
}
.search input { border: none; outline: none; background: transparent; width: 100%; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 999px; padding: 5px 11px;
  background: var(--background-color-default, #fff); cursor: pointer; font-size: 12px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.chip:hover { border-color: var(--true-color-blue, #0969da); }
.chip.active { background: var(--true-color-blue, #0969da); color: #fff; border-color: var(--true-color-blue, #0969da); }
.chip .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .6; }

.list { display: grid; gap: 10px; }
.card {
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 14px; padding: 14px;
  background: var(--background-color-default, #fff);
}
.item { border-left: 3px solid transparent; }
.item.kind-pr { border-left-color: #8250df; }
.item.kind-issue { border-left-color: #1a7f37; }
.item.kind-release { border-left-color: #9a6700; }
.item.kind-deploy { border-left-color: #bf3989; }
.item.kind-session { border-left-color: #0969da; }
.item-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.item-title { font-weight: 600; }
.kindtag {
  font-size: 10px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700;
  border-radius: 6px; padding: 2px 6px; margin-right: 8px;
  background: color-mix(in srgb, var(--text-color-muted, #656d76) 15%, transparent);
}
.badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.badge {
  font-size: 11px; border-radius: 999px; padding: 2px 8px; font-weight: 600;
  border: 1px solid var(--border-color-default, #d0d7de);
}
.badge.needs-review { color: #9a6700; border-color: #d4a72c; }
.badge.failing-checks { color: #cf222e; border-color: #cf222e; }
.badge.human { color: #8250df; border-color: #8250df; }
.badge.assigned { color: #0969da; border-color: #0969da; }
.badge.stale-release { color: #9a6700; }
.badge.failing-deploy { color: #bf3989; border-color: #bf3989; }
.badge.active-session { color: #0969da; }
.badge.triage { color: #8250df; border-color: #8250df; }
.badge.stale-session { color: #9a6700; border-color: #d4a72c; }
.deploy-line { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.deploy-state { font-size: 11px; border-radius: 999px; padding: 2px 8px; font-weight: 600; border: 1px solid var(--border-color-default, #d0d7de); }
.deploy-state.success { color: #1a7f37; border-color: #1a7f37; }
.deploy-state.failure, .deploy-state.error { color: #cf222e; border-color: #cf222e; }
.deploy-state.in_progress, .deploy-state.queued, .deploy-state.pending { color: #9a6700; border-color: #d4a72c; }
.deploy-state.inactive, .deploy-state.unknown { color: var(--text-color-muted, #656d76); }
.score { border-radius: 999px; padding: 2px 9px; border: 1px solid var(--border-color-default, #d0d7de); white-space: nowrap; font-size: 12px; font-weight: 600; }

.badge.bkt-fresh { color: #1a7f37; border-color: #1a7f37; }
.badge.bkt-aging { color: #0969da; border-color: #0969da; }
.badge.bkt-stale { color: #9a6700; border-color: #d4a72c; }
.badge.bkt-ancient { color: #cf222e; border-color: #cf222e; }
.badge.orphan { color: #bf3989; border-color: #bf3989; }
.btn.danger { color: #cf222e; border-color: color-mix(in srgb, #cf222e 45%, var(--border-color-default, #d0d7de)); }
.btn.danger:hover:not(:disabled) { background: #cf222e; color: #fff; border-color: #cf222e; }
.cleanup-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 12px; margin-bottom: 12px;
  border: 1px solid var(--border-color-default, #d0d7de); border-radius: 12px; background: color-mix(in srgb, var(--text-color-muted, #656d76) 5%, var(--background-color-default, #fff)); }
.cleanup-bar .spacer { flex: 1; }
.cleanup-bar .selall { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.cleanup-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 12px; background: var(--background-color-default, #fff); transition: border-color .15s ease, background .15s ease; }
.cleanup-row + .cleanup-row { margin-top: 8px; }
.cleanup-row:hover { border-color: color-mix(in srgb, var(--true-color-blue, #0969da) 45%, var(--border-color-default, #d0d7de)); }
.cleanup-row.selected { border-color: var(--true-color-blue, #0969da); background: color-mix(in srgb, var(--true-color-blue, #0969da) 6%, var(--background-color-default, #fff)); }
.crow-check { padding-top: 2px; }
.crow-check input, .cleanup-bar input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--true-color-blue, #0969da); }
.crow-main { flex: 1; min-width: 0; }
.crow-title { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crow-meta { margin-top: 3px; }
.crow-meta code { font-size: 11px; }
.crow-side { display: flex; align-items: center; gap: 8px; flex-shrink: 0; position: relative; }
.tiny-btn { font-size: 12px; padding: 4px 9px; }
.cleanup-row.archived { opacity: .82; background: color-mix(in srgb, #bf3989 4%, var(--background-color-default, #fff)); }
.cleanup-row.archived .crow-title { text-decoration: none; }
.crow-manage { position: relative; }
.crow-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; display: none; min-width: 190px;
  background: var(--background-color-default, #fff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.18); padding: 5px; }
.crow-menu.open { display: grid; gap: 2px; }
.menu-item { display: block; width: 100%; text-align: left; background: none; border: none; cursor: pointer;
  padding: 7px 9px; border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--text-color-default, #1f2328); }
.menu-item:hover { background: color-mix(in srgb, var(--true-color-blue, #0969da) 10%, transparent); }
.menu-item.danger { color: #cf222e; }
.menu-item.danger:hover { background: color-mix(in srgb, #cf222e 12%, transparent); }
.menu-note { padding: 6px 9px; color: var(--text-color-muted, #656d76); }

.repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.repo-card { display: grid; gap: 10px; }
.repo-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.repo-title { font-weight: 700; font-size: 15px; }
.pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 600; border: 1px solid var(--border-color-default, #d0d7de); }
.pill .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.tone-good { color: #1a7f37; }
.tone-attention { color: #9a6700; }
.tone-danger { color: #cf222e; }
.tone-active { color: #0969da; }
.tone-neutral, .tone-muted { color: var(--text-color-muted, #656d76); }
.repo-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.metric { border-radius: 10px; padding: 8px; text-align: center; background: color-mix(in srgb, var(--background-color-default, #fff) 88%, var(--text-color-default, #1f2328) 12%); }
.metric strong { display: block; font-size: 16px; }
.metric span { font-size: 11px; color: var(--text-color-muted, #656d76); }
.repo-expand { display: none; border-top: 1px dashed var(--border-color-default, #d0d7de); padding-top: 10px; margin-top: 4px; }
.repo-card.open .repo-expand { display: grid; gap: 6px; }
.sub-item { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 4px 0; }
.actionable-sub { cursor: pointer; border-radius: 8px; padding: 6px 8px; margin: 0 -8px; transition: background .1s ease; }
.actionable-sub:hover { background: color-mix(in srgb, var(--true-color-blue, #0969da) 8%, transparent); }
.sub-item .sub-link { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-right { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sub-gh { text-decoration: none; color: var(--text-color-muted, #656d76); font-weight: 700; padding: 0 2px; }
.sub-gh:hover { color: var(--true-color-blue, #0969da); }
.di-head { display: flex; align-items: baseline; gap: 6px; }
.di-head .sub-gh { margin-left: auto; }
.di-cta { color: var(--true-color-blue, #0969da); font-weight: 600; opacity: 0; transition: opacity .1s ease; }
.actionable-sub:hover .di-cta { opacity: 1; }
.expand-btn { background: none; border: none; cursor: pointer; color: var(--true-color-blue, #0969da); font-weight: 600; padding: 0; text-align: left; }

.manage-add { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.manage-add input { flex: 1 1 220px; }
.tracked-list { display: grid; gap: 8px; margin-bottom: 22px; }
.tracked-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.discover-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.discover-card { display: grid; gap: 6px; }
.discover-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.onboarding { display: grid; gap: 12px; margin-bottom: 16px; border-color: color-mix(in srgb, var(--true-color-blue, #0969da) 42%, var(--border-color-default, #d0d7de)); background: color-mix(in srgb, var(--true-color-blue, #0969da) 5%, var(--background-color-default, #fff)); }
.onboard-title { font-size: 18px; font-weight: 700; }
.onboard-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.pick-card { display: flex; align-items: flex-start; gap: 9px; padding: 10px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; background: var(--background-color-default, #fff); }
.pick-card input { margin-top: 3px; accent-color: var(--true-color-blue, #0969da); }
.section-label { margin: 14px 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-color-muted, #656d76); }

.empty { border: 1px dashed var(--border-color-default, #d0d7de); border-radius: 12px; padding: 20px; text-align: center; color: var(--text-color-muted, #656d76); }
.error { border-left: 3px solid #cf222e; padding: 6px 10px; border-radius: 4px; background: color-mix(in srgb, #cf222e 8%, transparent); }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.skeleton { border-radius: 12px; height: 74px; background: linear-gradient(90deg, color-mix(in srgb, var(--text-color-muted,#656d76) 8%, transparent), color-mix(in srgb, var(--text-color-muted,#656d76) 16%, transparent), color-mix(in srgb, var(--text-color-muted,#656d76) 8%, transparent)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

.overlay { position: fixed; inset: 0; z-index: 50; display: none; }
.overlay.open { display: block; }
.overlay-bg { position: absolute; inset: 0; background: color-mix(in srgb, #000 42%, transparent); }
.drawer {
  position: absolute; top: 0; right: 0; height: 100%; width: min(620px, 94vw);
  background: var(--background-color-default, #fff); border-left: 1px solid var(--border-color-default, #d0d7de);
  box-shadow: -12px 0 40px rgba(0,0,0,.22); overflow-y: auto; padding: 20px;
  transform: translateX(20px); animation: slideIn .16s ease forwards;
}
@keyframes slideIn { to { transform: translateX(0); } }
.drawer-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 6px; }
.drawer h2 { margin: 0; font-size: 20px; }
.close-x { border: none; background: none; font-size: 22px; cursor: pointer; color: var(--text-color-muted, #656d76); line-height: 1; }
.drawer section { margin-top: 18px; }
.drawer h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-color-muted, #656d76); }
.detail-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.deploy-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid color-mix(in srgb, var(--border-color-default,#d0d7de) 60%, transparent); }
.detail-item { display: block; padding: 8px 0; border-bottom: 1px solid color-mix(in srgb, var(--border-color-default,#d0d7de) 60%, transparent); }
.repo-link { border: none; background: none; padding: 0; font: inherit; color: var(--text-color-link, #0969da); cursor: pointer; text-decoration: none; }
.repo-link:hover { text-decoration: underline; }
.item.actionable { cursor: pointer; transition: transform .08s ease, box-shadow .08s ease; }
.item.actionable:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.12); }
.open-hint { margin-top: 6px; color: var(--text-color-link, #0969da); font-weight: 600; opacity: 0; transition: opacity .1s ease; }
.item.actionable:hover .open-hint { opacity: 1; }
.guidance { margin-top: 8px; display: grid; gap: 4px; padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--true-color-blue, #0969da) 6%, transparent); }
.guidance div { font-size: 12px; color: var(--text-color-muted, #656d76); }
.guidance strong { color: var(--text-color-default, #1f2328); }
.item-pane { width: min(560px, 94vw); }
.pane-body { white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.5; max-height: 260px; overflow-y: auto; padding: 10px 12px; border: 1px solid var(--border-color-default,#d0d7de); border-radius: 8px; background: color-mix(in srgb, var(--text-color-muted,#656d76) 5%, transparent); }
.act-row { display: flex; flex-wrap: wrap; gap: 8px; }
.act-btn { border: 1px solid var(--border-color-default,#d0d7de); background: var(--background-color-default,#fff); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.act-btn:hover { background: color-mix(in srgb, var(--text-color-muted,#656d76) 8%, transparent); }
.act-btn.primary { border-color: #1a7f37; color: #1a7f37; }
.act-btn.accent { border-color: #0969da; background: #0969da; color: #fff; }
.act-btn.accent:hover { background: #0860c9; }
.act-btn.danger { border-color: #cf222e; color: #cf222e; }
.act-btn.warn { border-color: #9a6700; color: #9a6700; }
.act-btn:disabled { opacity: .5; cursor: default; }
.comment-box { width: 100%; box-sizing: border-box; min-height: 72px; border: 1px solid var(--border-color-default,#d0d7de); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; resize: vertical; }
.act-status { font-size: 12px; margin-top: 6px; min-height: 16px; }
.act-status.ok { color: #1a7f37; }
.act-status.err { color: #cf222e; }
.comment-item { padding: 8px 0; border-bottom: 1px solid color-mix(in srgb, var(--border-color-default,#d0d7de) 60%, transparent); }
.comment-item .body { white-space: pre-wrap; word-break: break-word; font-size: 13px; margin-top: 3px; }
@media (max-width: 720px) { .repo-metrics, .detail-metrics { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="top-row">
      <div class="brand">
        <div class="logo">WH</div>
        <div>
          <h1>Work Hub</h1>
          <p class="subtitle tiny" id="subtitle">Loading your command center…</p>
        </div>
      </div>
      <div class="controls">
        <label class="field"><span>Mood</span>
          <select class="control" id="mood">
            <option value="focused">🎯 Focused</option>
            <option value="low-energy">🔋 Low energy</option>
            <option value="maintenance">🧹 Maintenance</option>
            <option value="creative">✨ Creative</option>
            <option value="urgent">🚨 Urgent</option>
          </select>
        </label>
        <label class="field"><span>Time</span>
          <select class="control" id="minutes">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </label>
        <label class="field"><span>Bandwidth</span>
          <select class="control" id="busyness">
            <option value="busy">Busy</option>
            <option value="normal">Normal</option>
            <option value="open">Wide open</option>
          </select>
        </label>
        <label class="field"><span>Focus on refresh</span>
          <select class="control" id="focusIntent">
            <option value="balanced">⚖️ Balanced</option>
            <option value="prs">🔀 PRs / reviews</option>
            <option value="new-code">🛠 New code</option>
            <option value="issue-triage">🧭 Issue triage</option>
            <option value="maintenance">🧹 Maintenance</option>
          </select>
        </label>
        <button class="btn primary" id="refresh">↻ Refresh</button>
      </div>
    </div>
    <nav class="tabs" id="tabs">
      <button class="tab active" data-tab="focus">Focus plan</button>
      <button class="tab" data-tab="work">Work explorer <span class="count" id="workCount">0</span></button>
      <button class="tab" data-tab="repos">Repositories <span class="count" id="repoCount">0</span></button>
      <button class="tab" data-tab="cleanup">Session cleanup <span class="count" id="cleanupCount">0</span></button>
      <button class="tab" data-tab="manage">Manage repos</button>
    </nav>
  </header>

  <main>
    <section class="view active" data-view="focus">
      <div id="onboardingPanel"></div>
      <div class="stats" id="stats"></div>
      <div class="card" style="margin-bottom:14px">
        <div class="tiny" id="planSummary">Building a plan for your available time…</div>
      </div>
      <div class="list" id="focusList"><div class="skeleton"></div><div class="skeleton"></div></div>
    </section>

    <section class="view" data-view="work">
      <div class="toolbar">
        <div class="search">🔎 <input id="search" type="text" placeholder="Search titles, repos, authors…" /></div>
        <select class="control" id="repoFilter"><option value="">All repos</option></select>
        <select class="control" id="sort">
          <option value="priority">Sort: Priority</option>
          <option value="recent">Sort: Recently updated</option>
          <option value="repo">Sort: Repository</option>
        </select>
      </div>
      <div class="chips" id="chips" style="margin-bottom:14px"></div>
      <div class="list" id="workList"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
    </section>

    <section class="view" data-view="repos">
      <div class="toolbar">
        <div class="search">🔎 <input id="repoSearch" type="text" placeholder="Filter repositories…" /></div>
        <select class="control" id="repoSort">
          <option value="attention">Sort: Needs attention</option>
          <option value="release">Sort: Oldest release</option>
          <option value="work">Sort: Most open work</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>
      <div class="repo-grid" id="repoGrid"><div class="skeleton"></div><div class="skeleton"></div></div>
    </section>

    <section class="view" data-view="cleanup">
      <div class="stats" id="cleanupStats"></div>
      <div class="toolbar">
        <div class="search">🔎 <input id="cleanupSearch" type="text" placeholder="Search sessions, repos, branches…" /></div>
        <select class="control" id="cleanupRepo"><option value="">All repos</option></select>
        <select class="control" id="cleanupSort">
          <option value="oldest">Sort: Oldest first</option>
          <option value="newest">Sort: Newest first</option>
          <option value="repo">Sort: Repository</option>
        </select>
      </div>
      <div class="chips" id="cleanupChips" style="margin-bottom:12px"></div>
      <div class="cleanup-bar" id="cleanupBar">
        <label class="tiny selall"><input type="checkbox" id="cleanupAll" /> Select all shown</label>
        <span class="tiny" id="cleanupSelInfo">0 selected</span>
        <span class="spacer"></span>
        <button class="btn" id="cleanupSelectStale">Select stale &amp; older</button>
        <button class="btn danger" id="cleanupDelete" disabled>🗑 Clean up selected</button>
      </div>
      <div class="list" id="cleanupList"><div class="skeleton"></div><div class="skeleton"></div></div>
    </section>

    <section class="view" data-view="manage">
      <div class="card" style="margin-bottom:16px">
        <div class="manage-add">
          <input class="control" id="manualRepo" type="text" placeholder="owner/repo (e.g. octocat/hello-world)" />
          <button class="btn primary" id="addManual">＋ Track repo</button>
          <button class="btn" id="reloadDiscover">↻ Reload my repos</button>
        </div>
        <div class="tiny">Tracked repos are stored in <code>~/.copilot/extensions/work-hub/artifacts/config.json</code>. Local checkouts under <code>~/Projects</code> are auto-detected.</div>
      </div>
      <h3 style="margin:0 0 8px">Tracked (<span id="trackedCount">0</span>)</h3>
      <div class="tracked-list" id="trackedList"></div>
      <h3 style="margin:0 0 8px">Discover your repos</h3>
      <div class="toolbar"><div class="search">🔎 <input id="discoverSearch" type="text" placeholder="Filter your GitHub repos…" /></div></div>
      <div class="discover-grid" id="discoverGrid"><div class="empty">Open this tab to load your repositories.</div></div>
    </section>

    <section style="margin-top:22px">
      <details>
        <summary class="tiny" style="cursor:pointer">Data quality (<span id="errorCount">0</span> warnings)</summary>
        <div class="list" id="errorList" style="margin-top:10px"></div>
      </details>
    </section>
  </main>
  <div class="overlay" id="detailOverlay"><div class="overlay-bg" id="detailBg"></div><div class="drawer" id="detailDrawer"></div></div>
  <div class="overlay" id="itemOverlay"><div class="overlay-bg" id="itemBg"></div><div class="drawer item-pane" id="itemDrawer"></div></div>
</div>
<script>${clientScript()}</script>
</body>
</html>`;
}

function clientScript() {
    return `
const state = { model: null, tab: "focus", loading: false, discover: null, discoverLoading: false,
  filters: { text: "", repo: "", sort: "priority", chips: new Set(), repoText: "", repoSort: "attention", discoverText: "" },
  cleanup: { text: "", repo: "", sort: "oldest", buckets: new Set(), selected: new Set() },
  onboarding: { selected: new Set() } };
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

const CHIP_DEFS = [
  { id: "open-pr", label: "Open PRs", kind: "pr" },
  { id: "open-issue", label: "Open issues", kind: "issue" },
  { id: "needs-review", label: "Needs review" },
  { id: "human", label: "Human authored" },
  { id: "failing-checks", label: "Failing checks" },
  { id: "assigned", label: "Assigned to me" },
  { id: "stale-release", label: "Stale release" },
  { id: "failing-deploy", label: "Failed deploy" },
  { id: "active-session", label: "Active session" },
  { id: "triage", label: "Session triage" },
];
const CHIP_KINDS = Object.fromEntries(CHIP_DEFS.filter((c) => c.kind).map((c) => [c.id, c.kind]));

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

function setLoading(v) {
  state.loading = v;
  $("refresh").innerHTML = v ? '<span class="spinner"></span> Loading' : "↻ Refresh";
  $("refresh").disabled = v;
}

async function load(force = false) {
  setLoading(true);
  try {
    state.model = force ? await api("/api/refresh", { method: "POST" }) : await api("/api/state");
    render();
  } catch (e) { $("subtitle").textContent = e.message; }
  finally { setLoading(false); }
}

async function saveFocus() {
  setLoading(true);
  try {
    state.model = await api("/api/focus", { method: "POST", body: JSON.stringify({ mood: $("mood").value, minutes: Number($("minutes").value), busyness: $("busyness").value, focusIntent: $("focusIntent").value }) });
    render();
  } catch (e) { $("subtitle").textContent = e.message; }
  finally { setLoading(false); }
}

function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.dataset.view === tab));
  if (tab === "manage" && !state.discover && !state.discoverLoading) loadDiscover(false);
  if (tab === "manage") renderManage();
}

function render() {
  const m = state.model; if (!m) return;
  $("subtitle").innerHTML = "Updated " + new Date(m.generatedAt).toLocaleTimeString() + (m.currentLogin ? " · @" + esc(m.currentLogin) : "") + " · " + m.summary.repoCount + " repos";
  $("mood").value = m.preferences.mood;
  $("minutes").value = String(m.preferences.minutes);
  $("busyness").value = m.preferences.busyness;
  $("focusIntent").value = m.preferences.focusIntent || "balanced";
  $("workCount").textContent = m.focusItems.length;
  $("repoCount").textContent = m.repos.length;
  $("cleanupCount").textContent = (m.sessionInventory || []).length;
  $("errorCount").textContent = m.errors.length;
  renderRepoFilter(m.repos);
  renderOnboarding();
  renderStats(m.summary);
  renderPlan(m);
  renderChips();
  renderWork();
  renderRepos();
  renderCleanup();
  renderErrors(m.errors);
  if (state.tab === "manage") renderManage();
}

function discoverItems() {
  if (!state.discover) return [];
  const repos = (state.discover.repos || []).map((r) => ({ ...r, source: "github" }));
  const projects = (state.discover.projects || []).map((r) => ({ ...r, source: "local" }));
  const seen = new Set();
  const items = [];
  for (const item of [...projects, ...repos]) {
    const key = (item.slug || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function encodedRepo(item) {
  return JSON.stringify({ slug: item.slug, path: item.path || null });
}

function renderOnboarding() {
  const panel = $("onboardingPanel");
  const m = state.model; if (!m || m.onboarded) { panel.innerHTML = ""; return; }
  const items = discoverItems().slice(0, 12);
  const picks = items.length ? '<div class="pick-grid">' + items.map((r, i) => {
    const id = "onboardPick" + i;
    const value = encodedRepo(r);
    return '<label class="pick-card" for="' + id + '"><input id="' + id + '" type="checkbox" data-onboard-pick="' + esc(value) + '" ' + (state.onboarding.selected.has(value) ? "checked" : "") + ' /><span><strong>' + esc(r.slug) + '</strong>' + (r.source === "local" ? ' <span class="badge">local project</span>' : ' <span class="badge">GitHub</span>') + '<div class="tiny">' + esc(r.description || r.path || "No description") + '</div></span></label>';
  }).join("") + '</div>' : '<div class="empty">Discover repositories and local projects to start picking what this hub should track.</div>';
  panel.innerHTML = '<div class="card onboarding"><div><div class="onboard-title">Set up your Work Hub</div><div class="tiny">Pick GitHub repositories or local projects to track. Your choices stay local under <code>~/.copilot/extensions/work-hub/artifacts</code>.</div></div><div class="onboard-actions"><button class="btn primary" id="onboardDiscover">' + (state.discoverLoading ? "Discovering…" : "Discover repos & projects") + '</button><button class="btn" id="onboardManage">Manage manually</button><button class="btn primary" id="onboardTrack" ' + (state.onboarding.selected.size ? "" : "disabled") + '>Start tracking selected (' + state.onboarding.selected.size + ')</button></div>' + picks + '</div>';
  $("onboardDiscover").addEventListener("click", () => loadDiscover(true));
  $("onboardManage").addEventListener("click", () => switchTab("manage"));
  $("onboardTrack").addEventListener("click", trackSelectedOnboarding);
  panel.querySelectorAll("[data-onboard-pick]").forEach((el) => el.addEventListener("change", () => {
    if (el.checked) state.onboarding.selected.add(el.dataset.onboardPick);
    else state.onboarding.selected.delete(el.dataset.onboardPick);
    renderOnboarding();
  }));
}

function renderStats(s) {
  const cards = [
    { v: s.repoCount, l: "repos", tab: "repos" },
    { v: s.needsHumanPrCount, l: "PRs need review", cls: s.needsHumanPrCount ? "alert" : "", chip: "needs-review" },
    { v: s.humanIssueCount, l: "human issues", cls: s.humanIssueCount ? "warn" : "", chip: "human" },
    { v: s.openPrCount, l: "open PRs", chip: "open-pr" },
    { v: s.openIssueCount, l: "open issues", chip: "open-issue" },
    { v: s.staleReleaseCount, l: "stale releases", cls: s.staleReleaseCount ? "warn" : "", chip: "stale-release" },
    { v: s.failedDeployCount, l: "failed deploys", cls: s.failedDeployCount ? "alert" : "", chip: "failing-deploy" },
    { v: s.activeSessionCount, l: "recent sessions", chip: "active-session" },
  ];
  $("stats").innerHTML = cards.map((c, i) => '<div class="stat ' + (c.cls || "") + '" data-i="' + i + '"><strong>' + esc(c.v) + '</strong><span>' + esc(c.l) + '</span></div>').join("");
  $("stats").querySelectorAll(".stat").forEach((el) => el.addEventListener("click", () => {
    const c = cards[Number(el.dataset.i)];
    if (c.tab) { switchTab(c.tab); return; }
    if (c.chip) { state.filters.chips = new Set([c.chip]); renderChips(); renderWork(); switchTab("work"); }
  }));
}

function renderPlan(m) {
  const total = m.recommendations.reduce((a, r) => a + r.plannedMinutes, 0);
  const intentLabels = { balanced: "balanced priorities", prs: "PRs and reviews", "new-code": "new code", "issue-triage": "issue triage", maintenance: "maintenance" };
  const intent = intentLabels[m.preferences.focusIntent || "balanced"] || "balanced priorities";
  $("planSummary").innerHTML = m.recommendations.length
    ? "Given you're <strong>" + esc(m.preferences.mood) + "</strong> with <strong>" + esc(m.preferences.minutes) + " min</strong> (" + esc(m.preferences.busyness) + ") and want <strong>" + esc(intent) + "</strong>, here's what to do and how (~" + total + " min):"
    : "No focus items right now — you're all caught up. 🎉";
  $("focusList").innerHTML = m.recommendations.length
    ? m.recommendations.map((it, i) => itemHtml(it, { rank: i + 1, planned: it.plannedMinutes })).join("")
    : '<div class="empty">Nothing needs your attention. Enjoy the calm.</div>';
  wireRepoLinks($("focusList"));
  wireItemCards($("focusList"));
}

function wireRepoLinks(root) {
  root.querySelectorAll(".repo-link[data-detail]").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); openRepoDetail(el.dataset.detail); }));
}

function itemHtml(it, opts = {}) {
  const badges = (it.tags || []).map((t) => '<span class="badge ' + esc(t) + '">' + esc(t.replace(/-/g, " ")) + '</span>').join("");
  const rank = opts.rank ? '<span class="score">#' + opts.rank + '</span>' : "";
  const right = opts.planned ? '<span class="score">' + esc(opts.planned) + ' min</span>' : '<span class="score">' + esc(it.minutes) + ' min</span>';
  const link = it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + esc(it.title) + '</a>' : esc(it.title);
  const actionable = (it.kind === "pr" || it.kind === "issue") && it.number;
  const jumpable = it.kind === "session" && it.sessionId;
  const attrs = actionable ? ' class="card item actionable kind-' + esc(it.kind) + '" data-item-repo="' + esc(it.repo) + '" data-item-type="' + esc(it.kind) + '" data-item-number="' + esc(it.number) + '"' : ' class="card item kind-' + esc(it.kind) + '"';
  const guidance = opts.rank && (it.what || it.how) ? '<div class="guidance">' + (it.what ? '<div><strong>What:</strong> ' + esc(it.what) + '</div>' : "") + (it.how ? '<div><strong>How:</strong> ' + esc(it.how) + '</div>' : "") + '</div>' : "";
  return '<article' + attrs + '>' +
    '<div class="item-top"><div class="item-title"><span class="kindtag">' + esc(it.kind) + '</span>' + link + '</div><div style="display:flex;gap:6px">' + rank + right + '</div></div>' +
    '<div class="tiny" style="margin-top:4px"><button class="repo-link" data-detail="' + esc(it.repo) + '">' + esc(it.repo) + '</button> · ' + esc(it.detail) + '</div>' +
    (badges ? '<div class="badges">' + badges + '</div>' : "") +
    (it.reasons && it.reasons.length ? '<div class="tiny" style="margin-top:6px">Why now: ' + esc(it.reasons.join(", ")) + (opts.rank ? '' : ' · score ' + esc(it.score)) + '</div>' : "") +
    guidance +
    (actionable ? '<div class="tiny open-hint">Click to view &amp; act →</div>' : "") +
    (jumpable ? '<div class="act-row" style="margin-top:8px"><button class="act-btn accent jump-btn" data-jump="' + esc(it.sessionId) + '" data-jump-repo="' + esc(it.repo) + '" data-jump-branch="' + esc(it.branch || "") + '">↪ Jump to session</button></div>' : "") +
    '</article>';
}

function wireItemCards(root) {
  root.querySelectorAll(".item.actionable").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest("a, .repo-link")) return;
    openItemDetail(el.dataset.itemRepo, el.dataset.itemType, el.dataset.itemNumber);
  }));
  root.querySelectorAll(".jump-btn").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); jumpToSession(el); }));
}

async function jumpToSession(btn) {
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Jumping…";
  try {
    const res = await api("/api/session/jump", { method: "POST", body: JSON.stringify({ sessionId: btn.dataset.jump, repo: btn.dataset.jumpRepo, branch: btn.dataset.jumpBranch }) });
    btn.textContent = "✓ " + (res.message || "Requested");
  } catch (e) {
    btn.textContent = "⚠ " + e.message; btn.disabled = false;
    setTimeout(() => { btn.textContent = original; }, 3000);
  }
}

function renderRepoFilter(repos) {
  const cur = state.filters.repo;
  $("repoFilter").innerHTML = '<option value="">All repos</option>' + repos.map((r) => '<option value="' + esc(r.slug) + '">' + esc(r.slug) + '</option>').join("");
  $("repoFilter").value = cur;
}

function renderChips() {
  $("chips").innerHTML = CHIP_DEFS.map((c) => '<button class="chip ' + (state.filters.chips.has(c.id) ? "active" : "") + '" data-chip="' + c.id + '"><span class="dot"></span>' + esc(c.label) + '</button>').join("") +
    (state.filters.chips.size ? '<button class="chip" data-chip="__clear">✕ Clear</button>' : "");
  $("chips").querySelectorAll(".chip").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.chip;
    if (id === "__clear") state.filters.chips.clear();
    else if (state.filters.chips.has(id)) state.filters.chips.delete(id);
    else state.filters.chips.add(id);
    renderChips(); renderWork();
  }));
}

function renderWork() {
  const m = state.model; if (!m) return;
  const f = state.filters;
  let items = m.focusItems.slice();
  if (f.repo) items = items.filter((it) => it.repo === f.repo);
  if (f.text) { const q = f.text.toLowerCase(); items = items.filter((it) => (it.title + " " + it.repo + " " + it.detail).toLowerCase().includes(q)); }
  if (f.chips.size) {
    const kindChips = [...f.chips].filter((c) => CHIP_KINDS[c]).map((c) => CHIP_KINDS[c]);
    const tagChips = [...f.chips].filter((c) => !CHIP_KINDS[c]);
    if (kindChips.length) items = items.filter((it) => kindChips.includes(it.kind));
    if (tagChips.length) items = items.filter((it) => tagChips.every((c) => (it.tags || []).includes(c)));
  }
  if (f.sort === "recent") items.sort((a, b) => (a.updatedAgeDays ?? 999) - (b.updatedAgeDays ?? 999));
  else if (f.sort === "repo") items.sort((a, b) => a.repo.localeCompare(b.repo) || b.score - a.score);
  else items.sort((a, b) => b.score - a.score);
  $("workList").innerHTML = items.length ? items.map((it) => itemHtml(it)).join("") : '<div class="empty">No work matches these filters.</div>';
  wireRepoLinks($("workList"));
  wireItemCards($("workList"));
}

const CLEANUP_BUCKETS = [
  { id: "fresh", label: "Fresh (<2d)" },
  { id: "aging", label: "Aging (2–7d)" },
  { id: "stale", label: "Stale (7–30d)" },
  { id: "ancient", label: "Ancient (30d+)" },
  { id: "orphaned", label: "Archived (worktree gone)" },
];

function cleanupInventory() {
  const m = state.model; if (!m) return [];
  return (m.sessionInventory || []).slice();
}

function cleanupFiltered() {
  const c = state.cleanup;
  let items = cleanupInventory();
  if (c.repo) items = items.filter((s) => s.repository === c.repo);
  if (c.text) { const q = c.text.toLowerCase(); items = items.filter((s) => (s.summary + " " + s.repository + " " + s.branch + " " + s.cwd).toLowerCase().includes(q)); }
  if (c.buckets.size) items = items.filter((s) => c.buckets.has(s.orphaned ? "orphaned" : s.bucket) || (c.buckets.has("orphaned") && s.orphaned));
  if (c.sort === "newest") items.sort((a, b) => (a.ageDays ?? 1e9) - (b.ageDays ?? 1e9));
  else if (c.sort === "repo") items.sort((a, b) => a.repository.localeCompare(b.repository) || (b.ageDays ?? 0) - (a.ageDays ?? 0));
  else items.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
  return items;
}

function renderCleanup() {
  const m = state.model; if (!m) return;
  const all = cleanupInventory();
  // repo filter options
  const repos = [...new Set(all.map((s) => s.repository))].sort();
  const sel = state.cleanup.repo;
  $("cleanupRepo").innerHTML = '<option value="">All repos (' + all.length + ')</option>' + repos.map((r) => '<option value="' + esc(r) + '"' + (r === sel ? " selected" : "") + '>' + esc(r) + '</option>').join("");
  // stats
  const s = m.summary;
  const orphaned = all.filter((x) => x.orphaned).length;
  const ancient = all.filter((x) => x.bucket === "ancient").length;
  const cards = [
    { v: all.length, l: "total sessions" },
    { v: s.staleSessionCount ?? 0, l: "stale or older", cls: (s.staleSessionCount ? "warn" : "") },
    { v: ancient, l: "30d+ ancient", cls: ancient ? "warn" : "" },
    { v: orphaned, l: "archived (worktree gone)", cls: orphaned ? "alert" : "" },
  ];
  $("cleanupStats").innerHTML = cards.map((c) => '<div class="stat ' + (c.cls || "") + '"><strong>' + esc(c.v) + '</strong><span>' + esc(c.l) + '</span></div>').join("");
  // bucket chips
  const cnt = (id) => all.filter((x) => id === "orphaned" ? x.orphaned : x.bucket === id).length;
  $("cleanupChips").innerHTML = CLEANUP_BUCKETS.map((b) => '<button class="chip ' + (state.cleanup.buckets.has(b.id) ? "active" : "") + '" data-cbucket="' + b.id + '"><span class="dot"></span>' + esc(b.label) + ' <span class="tiny">' + cnt(b.id) + '</span></button>').join("") +
    (state.cleanup.buckets.size ? '<button class="chip" data-cbucket="__clear">✕ Clear</button>' : "");
  $("cleanupChips").querySelectorAll(".chip").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.cbucket;
    if (id === "__clear") state.cleanup.buckets.clear();
    else if (state.cleanup.buckets.has(id)) state.cleanup.buckets.delete(id);
    else state.cleanup.buckets.add(id);
    renderCleanup();
  }));
  // prune stale selections
  const validIds = new Set(all.map((x) => x.id));
  for (const id of [...state.cleanup.selected]) if (!validIds.has(id)) state.cleanup.selected.delete(id);
  // list
  const items = cleanupFiltered();
  $("cleanupList").innerHTML = items.length ? items.map(cleanupRowHtml).join("") : '<div class="empty">No sessions match these filters. 🎉</div>';
  wireCleanupRows();
  // select-all reflects shown selection
  const shownIds = items.map((x) => x.id);
  $("cleanupAll").checked = shownIds.length > 0 && shownIds.every((id) => state.cleanup.selected.has(id));
  updateCleanupBar();
}

function cleanupRowHtml(sn) {
  const checked = state.cleanup.selected.has(sn.id) ? " checked" : "";
  const archived = sn.orphaned;
  const badge = archived ? '<span class="badge orphan" title="The worktree folder is gone — this session was very likely closed/archived.">📦 archived</span>' : '<span class="badge bkt-' + esc(sn.bucket) + '">' + esc(sn.bucket) + '</span>';
  const where = archived ? "worktree removed" : (sn.isWorktree ? "worktree" : "main checkout");
  const openBtn = archived
    ? '<button class="act-btn tiny-btn" disabled title="No live session to open — worktree is gone.">↪ Open</button>'
    : '<button class="act-btn tiny-btn" data-cjump="' + esc(sn.id) + '" data-jump-repo="' + esc(sn.repository) + '" data-jump-branch="' + esc(sn.branch) + '">↪ Open</button>';
  const menu = '<div class="crow-manage">' +
      '<button class="act-btn tiny-btn" data-cmenu="' + esc(sn.id) + '" aria-label="Manage session">⋯</button>' +
      '<div class="crow-menu" data-menu-for="' + esc(sn.id) + '">' +
        (archived ? '<div class="menu-note tiny">Already archived (worktree removed).</div>' : '<button class="menu-item" data-cjump2="' + esc(sn.id) + '" data-jump-repo="' + esc(sn.repository) + '" data-jump-branch="' + esc(sn.branch) + '">↪ Open &amp; triage</button>') +
        '<button class="menu-item danger" data-cdel="' + esc(sn.id) + '">🗑 Delete session</button>' +
        (sn.branch ? '<button class="menu-item" data-copybranch="' + esc(sn.branch) + '">⧉ Copy branch name</button>' : '') +
      '</div>' +
    '</div>';
  return '<div class="cleanup-row ' + (checked ? "selected " : "") + (archived ? "archived" : "") + '" data-id="' + esc(sn.id) + '">' +
    '<label class="crow-check"><input type="checkbox" data-cselect="' + esc(sn.id) + '"' + checked + ' /></label>' +
    '<div class="crow-main">' +
      '<div class="crow-title">' + esc(sn.summary) + '</div>' +
      '<div class="crow-meta tiny">' + esc(sn.repository) + (sn.branch ? ' · <code>' + esc(sn.branch) + '</code>' : "") + ' · ' + where + ' · last active ' + esc(sn.ageLabel) + ' ago</div>' +
    '</div>' +
    '<div class="crow-side">' + badge + openBtn + menu + '</div>' +
  '</div>';
}

function closeCleanupMenus() {
  document.querySelectorAll(".crow-menu.open").forEach((el) => el.classList.remove("open"));
}

function wireCleanupRows() {
  $("cleanupList").querySelectorAll("[data-cselect]").forEach((el) => el.addEventListener("change", () => {
    const id = el.dataset.cselect;
    if (el.checked) state.cleanup.selected.add(id); else state.cleanup.selected.delete(id);
    el.closest(".cleanup-row").classList.toggle("selected", el.checked);
    updateCleanupBar();
    const items = cleanupFiltered(); const shownIds = items.map((x) => x.id);
    $("cleanupAll").checked = shownIds.length > 0 && shownIds.every((x) => state.cleanup.selected.has(x));
  }));
  const doJump = (el) => { el.dataset.jump = el.dataset.cjump || el.dataset.cjump2; jumpToSession(el); };
  $("cleanupList").querySelectorAll("[data-cjump]").forEach((el) => el.addEventListener("click", () => doJump(el)));
  $("cleanupList").querySelectorAll("[data-cjump2]").forEach((el) => el.addEventListener("click", () => { closeCleanupMenus(); doJump(el); }));
  $("cleanupList").querySelectorAll("[data-cmenu]").forEach((el) => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = $("cleanupList").querySelector('[data-menu-for="' + CSS.escape(el.dataset.cmenu) + '"]');
    const wasOpen = menu.classList.contains("open");
    closeCleanupMenus();
    if (!wasOpen) menu.classList.add("open");
  }));
  $("cleanupList").querySelectorAll("[data-cdel]").forEach((el) => el.addEventListener("click", () => { closeCleanupMenus(); deleteOneSession(el.dataset.cdel); }));
  $("cleanupList").querySelectorAll("[data-copybranch]").forEach((el) => el.addEventListener("click", () => {
    navigator.clipboard?.writeText(el.dataset.copybranch);
    el.textContent = "✓ Copied"; setTimeout(() => { el.textContent = "⧉ Copy branch name"; closeCleanupMenus(); }, 900);
  }));
}

async function requestSessionCleanup(list, btn, original) {
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Requesting…';
  try {
    const payload = { sessions: list.map((s) => ({ id: s.id, repo: s.repository, branch: s.branch, summary: s.summary, ageLabel: s.ageLabel, archived: s.orphaned })) };
    const res = await api("/api/session/cleanup", { method: "POST", body: JSON.stringify(payload) });
    btn.innerHTML = "✓ " + (res.message || "Requested");
    list.forEach((s) => state.cleanup.selected.delete(s.id));
    setTimeout(() => { load(true); }, 500);
  } catch (e) {
    btn.disabled = false; btn.innerHTML = original;
    $("cleanupSelInfo").textContent = e.message;
  }
}

function deleteOneSession(id) {
  const sn = cleanupInventory().find((s) => s.id === id);
  if (!sn) return;
  if (!confirm('Clean up this session?\\n\\n' + sn.repository + (sn.branch ? ' · ' + sn.branch : '') + '\\n"' + sn.summary + '"' + (sn.orphaned ? '\\n\\n(Already archived — this removes the leftover record/worktree.)' : ''))) return;
  requestSessionCleanup([sn], $("cleanupDelete"), $("cleanupDelete").innerHTML);
}

function updateCleanupBar() {
  const n = state.cleanup.selected.size;
  $("cleanupSelInfo").textContent = n + " selected";
  $("cleanupDelete").disabled = n === 0;
  $("cleanupDelete").innerHTML = n ? "🗑 Clean up " + n + " selected" : "🗑 Clean up selected";
}

async function deleteSelectedSessions() {
  const all = cleanupInventory();
  const chosen = all.filter((s) => state.cleanup.selected.has(s.id));
  if (!chosen.length) return;
  requestSessionCleanup(chosen, $("cleanupDelete"), $("cleanupDelete").innerHTML);
}

function renderRepos() {
  const m = state.model; if (!m) return;
  const f = state.filters;
  let repos = m.repos.slice();
  if (f.repoText) { const q = f.repoText.toLowerCase(); repos = repos.filter((r) => (r.slug + " " + (r.description || "") + " " + (r.language || "")).toLowerCase().includes(q)); }
  const toneRank = { danger: 0, attention: 1, active: 2, neutral: 3, good: 4, muted: 5 };
  if (f.repoSort === "release") repos.sort((a, b) => (b.releaseAgeDays ?? 1e9) - (a.releaseAgeDays ?? 1e9));
  else if (f.repoSort === "work") repos.sort((a, b) => (b.openPrCount + b.openIssueCount) - (a.openPrCount + a.openIssueCount));
  else if (f.repoSort === "name") repos.sort((a, b) => a.slug.localeCompare(b.slug));
  else repos.sort((a, b) => (toneRank[a.status.tone] ?? 9) - (toneRank[b.status.tone] ?? 9) || b.needsHumanPrCount - a.needsHumanPrCount);
  $("repoGrid").innerHTML = repos.map(repoHtml).join("");
  $("repoGrid").querySelectorAll("[data-detail]").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); openRepoDetail(el.dataset.detail); }));
  $("repoGrid").querySelectorAll(".expand-btn:not([data-detail])").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); el.closest(".repo-card").classList.toggle("open"); }));
  $("repoGrid").querySelectorAll(".repo-card").forEach((el) => el.addEventListener("click", (e) => { if (e.target.closest("a,button")) return; openRepoDetail(el.dataset.repo); }));
  wireSubItems($("repoGrid"));
}

function wireSubItems(root) {
  root.querySelectorAll(".actionable-sub").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    e.stopPropagation();
    openItemDetail(el.dataset.openRepo, el.dataset.openType, el.dataset.openNumber);
  }));
}

function repoHtml(r) {
  const sub = [
    ...r.prs.map((p) => ({ t: "PR #" + p.number + " " + p.title, u: p.url, m: p.author, type: "pr", n: p.number })),
    ...r.issues.map((i) => ({ t: "Issue #" + i.number + " " + i.title, u: i.url, m: i.author, type: "issue", n: i.number })),
  ];
  const subHtml = sub.length ? sub.slice(0, 12).map((s) => '<div class="sub-item actionable-sub" data-open-repo="' + esc(r.slug) + '" data-open-type="' + esc(s.type) + '" data-open-number="' + esc(s.n) + '"><span class="sub-link">' + esc(s.t) + '</span><span class="sub-right"><span class="tiny">' + esc(s.m) + '</span><a class="sub-gh" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer" title="Open on GitHub">↗</a></span></div>').join("") : '<div class="tiny">No open PRs or issues.</div>';
  const local = r.localGit && r.localGit.available ? ((r.localGit.branchLine || "git").replace(/^## /, "") + " · " + (r.localGit.dirtyCount || 0) + " changed") : "no local checkout";
  return '<article class="card repo-card" data-repo="' + esc(r.slug) + '">' +
    '<div class="repo-head"><div><a class="repo-title" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.slug) + '</a>' + (r.isPrivate ? ' <span class="badge">private</span>' : "") + '<div class="tiny" style="margin-top:2px">' + esc(r.description || r.language || r.defaultBranch) + '</div></div>' +
    '<span class="pill tone-' + esc(r.status.tone) + '"><span class="dot"></span>' + esc(r.status.label) + '</span></div>' +
    '<div class="repo-metrics">' + metric(r.openPrCount, "PRs") + metric(r.openIssueCount, "Issues") + metric(r.needsHumanPrCount, "Review") + metric(r.releaseAgeLabel, "Release") + '</div>' +
    '<div class="tiny">' + esc(r.status.detail) + '</div>' +
    (r.latestDeploy ? '<div class="tiny deploy-line">🚀 ' + esc(r.latestDeploy.environment) + ' <span class="deploy-state ' + esc(r.latestDeploy.state) + '">' + esc(r.latestDeploy.state) + '</span> ' + esc(ageLabelClient(r.latestDeploy.ageDays)) + ' ago' + (r.deployments.length > 1 ? ' <span class="tiny">+' + (r.deployments.length - 1) + ' env</span>' : "") + '</div>' : '<div class="tiny">🚀 no deployments</div>') +
    '<div class="tiny">🖥 ' + esc(local) + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:2px">' +
      '<button class="expand-btn" data-detail="' + esc(r.slug) + '">Details →</button>' +
      (sub.length ? '<button class="expand-btn">▸ ' + sub.length + ' open items</button>' : "") +
    '</div>' +
    '<div class="repo-expand">' + subHtml + '</div>' +
    '</article>';
}

function ageLabelClient(days) {
  if (days === null || days === undefined) return "unknown";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return days + " days";
  const months = Math.floor(days / 30);
  if (months < 18) return months + " mo";
  return Math.floor(days / 365) + " yr";
}

function metric(v, l) { return '<div class="metric"><strong>' + esc(v) + '</strong><span>' + esc(l) + '</span></div>'; }

function renderErrors(errors) {
  $("errorList").innerHTML = errors.length ? errors.slice(0, 20).map((e) => '<div class="error tiny"><strong>' + esc(e.repo || e.source || "source") + '</strong>: ' + esc(e.message) + '</div>').join("") : '<div class="tiny">All data sources returned successfully.</div>';
}

/* ---- repo detail drawer ---- */
function openRepoDetail(slug) {
  const m = state.model; if (!m) return;
  const r = m.repos.find((x) => x.slug === slug); if (!r) return;
  const rel = r.latestRelease;
  const deployHtml = r.deployments && r.deployments.length
    ? r.deployments.map((d) => '<div class="deploy-row"><div>' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(d.environment) + '</strong></a>' : '<strong>' + esc(d.environment) + '</strong>') + '<div class="tiny">ref ' + esc(d.ref || "—") + '</div></div><div style="text-align:right"><span class="deploy-state ' + esc(d.state) + '">' + esc(d.state) + '</span><div class="tiny">' + esc(ageLabelClient(d.ageDays)) + ' ago</div></div></div>').join("")
    : '<div class="tiny">No deployments found.</div>';
  const prHtml = r.prs.length ? r.prs.map((p) => '<div class="detail-item actionable-sub" data-open-repo="' + esc(r.slug) + '" data-open-type="pr" data-open-number="' + p.number + '"><div class="di-head"><strong>#' + p.number + '</strong> ' + esc(p.title) + '<a class="sub-gh" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" title="Open on GitHub">↗</a></div><div class="tiny">' + esc(p.author) + ' · ' + esc(p.reviewDecision) + (p.failingChecks ? ' · ⚠ checks failing' : '') + (p.isDraft ? ' · draft' : '') + ' · <span class="di-cta">View &amp; act →</span></div></div>').join("") : '<div class="tiny">No open PRs.</div>';
  const issueHtml = r.issues.length ? r.issues.map((i) => '<div class="detail-item actionable-sub" data-open-repo="' + esc(r.slug) + '" data-open-type="issue" data-open-number="' + i.number + '"><div class="di-head"><strong>#' + i.number + '</strong> ' + esc(i.title) + '<a class="sub-gh" href="' + esc(i.url) + '" target="_blank" rel="noopener noreferrer" title="Open on GitHub">↗</a></div><div class="tiny">' + esc(i.author) + ' · ' + i.comments + ' comments' + (i.assignedToJames ? ' · assigned to you' : '') + ' · <span class="di-cta">View &amp; act →</span></div></div>').join("") : '<div class="tiny">No open issues.</div>';
  const g = r.localGit || {};
  const localHtml = g.available
    ? '<div class="tiny">Branch: <strong>' + esc((g.branchLine || "").replace(/^## /, "") || "?") + '</strong></div><div class="detail-metrics" style="margin-top:8px">' + metric(g.dirtyCount || 0, "changed") + metric(g.ahead || 0, "ahead") + metric(g.behind || 0, "behind") + metric(ageLabelClient(g.lastCommitAgeDays), "last commit") + '</div><div class="tiny" style="margin-top:6px">' + esc(g.path || "") + '</div>'
    : '<div class="tiny">No local checkout detected under ~/Projects.</div>';
  const sessionHtml = r.activeSessions && r.activeSessions.length
    ? r.activeSessions.map((s) => '<div class="detail-item"><strong>' + esc(s.summary) + '</strong><div class="tiny">' + esc(s.branch || "?") + ' · updated ' + esc(ageLabelClient(s.ageDays)) + ' ago</div></div>').join("")
    : '<div class="tiny">No recent sessions.</div>';

  $("detailDrawer").innerHTML =
    '<div class="drawer-head"><div><h2>' + esc(r.slug) + '</h2><div class="tiny">' + esc(r.description || r.language || r.defaultBranch) + '</div></div><button class="close-x" id="detailClose">✕</button></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px">' +
      '<span class="pill tone-' + esc(r.status.tone) + '"><span class="dot"></span>' + esc(r.status.label) + '</span>' +
      '<a class="btn" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">Open on GitHub ↗</a>' +
      (r.isPrivate ? '<span class="badge">private</span>' : '') + (r.language ? '<span class="badge">' + esc(r.language) + '</span>' : '') + '<span class="badge">★ ' + (r.stars || 0) + '</span>' +
    '</div>' +
    '<div class="tiny" style="margin-top:8px">' + esc(r.status.detail) + '</div>' +
    '<section><h3>Overview</h3><div class="detail-metrics">' + metric(r.openPrCount, "Open PRs") + metric(r.openIssueCount, "Open issues") + metric(r.needsHumanPrCount, "Need review") + metric(ageLabelClient(r.pushedAgeDays), "Last push") + '</div></section>' +
    '<section><h3>Deployments</h3>' + deployHtml + '</section>' +
    '<section><h3>Latest release</h3>' + (rel ? '<div class="detail-item">' + (rel.url ? '<a href="' + esc(rel.url) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(rel.tagName || rel.name) + '</strong></a>' : '<strong>' + esc(rel.tagName || rel.name) + '</strong>') + '<div class="tiny">' + esc(rel.kind) + ' · ' + esc(ageLabelClient(r.releaseAgeDays)) + ' ago</div></div>' : '<div class="tiny">No release or tag found.</div>') + '</section>' +
    '<section><h3>Open PRs (' + r.prs.length + ')</h3>' + prHtml + '</section>' +
    '<section><h3>Open issues (' + r.issues.length + ')</h3>' + issueHtml + '</section>' +
    '<section><h3>Local checkout</h3>' + localHtml + '</section>' +
    '<section><h3>Recent sessions</h3>' + sessionHtml + '</section>';
  $("detailOverlay").classList.add("open");
  $("detailClose").addEventListener("click", closeRepoDetail);
  wireSubItems($("detailDrawer"));
}

function closeRepoDetail() { $("detailOverlay").classList.remove("open"); }

/* ---- item detail + actions ---- */
let itemCtx = null;

async function openItemDetail(repo, type, number) {
  itemCtx = { repo, type, number };
  $("itemDrawer").innerHTML = '<div class="drawer-head"><div><h2>' + esc(type.toUpperCase()) + ' #' + esc(number) + '</h2><div class="tiny">' + esc(repo) + '</div></div><button class="close-x" id="itemClose">✕</button></div><div class="skeleton" style="margin-top:16px"></div><div class="skeleton" style="margin-top:10px"></div>';
  $("itemOverlay").classList.add("open");
  $("itemClose").addEventListener("click", closeItemDetail);
  try {
    const it = await api("/api/item?repo=" + encodeURIComponent(repo) + "&type=" + encodeURIComponent(type) + "&number=" + encodeURIComponent(number));
    renderItemPane(it);
  } catch (e) {
    $("itemDrawer").innerHTML = '<div class="drawer-head"><h2>Could not load</h2><button class="close-x" id="itemClose">✕</button></div><div class="tiny err" style="margin-top:12px">' + esc(e.message) + '</div>';
    $("itemClose").addEventListener("click", closeItemDetail);
  }
}

function renderItemPane(it) {
  const isPr = it.type === "pr";
  const stateLabel = it.state + (it.isDraft ? " · draft" : "");
  const meta = [];
  meta.push('<span class="badge">' + esc(stateLabel) + '</span>');
  if (isPr) {
    meta.push('<span class="badge">' + esc(it.reviewDecision) + '</span>');
    if (it.checksTotal) meta.push('<span class="badge ' + (it.checksFailing ? 'failing-checks' : '') + '">' + (it.checksFailing ? it.checksFailing + ' failing' : 'checks ok') + '</span>');
    meta.push('<span class="badge">' + esc(it.mergeable) + '</span>');
  }
  it.labels.forEach((l) => meta.push('<span class="badge">' + esc(l) + '</span>'));
  const metrics = isPr
    ? '<div class="detail-metrics">' + metric('+' + (it.additions ?? 0), "additions") + metric('-' + (it.deletions ?? 0), "deletions") + metric(it.changedFiles ?? 0, "files") + metric(ageLabelClient(it.ageDays), "updated") + '</div>'
    : '<div class="detail-metrics">' + metric(it.comments.length, "comments") + metric(it.assignees.length, "assignees") + metric(ageLabelClient(it.ageDays), "updated") + '</div>';
  const branchLine = isPr ? '<div class="tiny" style="margin-top:6px">' + esc(it.headRefName) + ' → ' + esc(it.baseRefName) + '</div>' : '';
  const assignLine = it.assignees.length ? '<div class="tiny" style="margin-top:6px">Assignees: ' + esc(it.assignees.join(", ")) + '</div>' : '';
  const bodyHtml = it.body.trim() ? '<div class="pane-body">' + esc(it.body) + '</div>' : '<div class="tiny">No description.</div>';
  const commentsHtml = it.comments.length
    ? it.comments.map((c) => '<div class="comment-item"><div class="tiny"><strong>' + esc(c.author || "unknown") + '</strong> · ' + esc(ageLabelClient(c.ageDays)) + ' ago</div><div class="body">' + esc(c.body) + '</div></div>').join("")
    : '<div class="tiny">No comments yet.</div>';

  const actions = [];
  actions.push('<button class="act-btn" data-act="open-gh">Open on GitHub ↗</button>');
  if (isPr) {
    if (it.isDraft) actions.push('<button class="act-btn" data-act="ready">Mark ready</button>');
    actions.push('<button class="act-btn primary" data-act="approve">Approve</button>');
    actions.push('<button class="act-btn accent" data-act="copilot-review">🤖 Request Copilot review</button>');
    actions.push('<button class="act-btn" data-act="request-me">Request my review</button>');
    actions.push('<button class="act-btn primary" data-act="merge">Squash &amp; merge</button>');
  } else {
    if (it.assignees.map((a) => a.toLowerCase()).includes((state.model.currentLogin || "").toLowerCase())) actions.push('<button class="act-btn" data-act="unassign-me">Unassign me</button>');
    else actions.push('<button class="act-btn" data-act="assign-me">Assign to me</button>');
  }
  if (it.state && it.state.toUpperCase() === "OPEN") actions.push('<button class="act-btn danger" data-act="close">Close</button>');
  else actions.push('<button class="act-btn" data-act="reopen">Reopen</button>');

  $("itemDrawer").innerHTML =
    '<div class="drawer-head"><div><h2>' + esc(it.title) + '</h2><div class="tiny">' + esc(it.repo) + ' · ' + esc(it.type.toUpperCase()) + ' #' + it.number + ' · by ' + esc(it.author || "unknown") + '</div></div><button class="close-x" id="itemClose">✕</button></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + meta.join("") + '</div>' +
    branchLine + assignLine +
    '<section>' + metrics + '</section>' +
    '<section><h3>Description</h3>' + bodyHtml + '</section>' +
    '<section><h3>Work on this</h3><div class="act-row"><button class="act-btn accent" data-act="create-session" data-mode="plan">🧭 Plan mode</button><button class="act-btn" data-act="create-session" data-mode="implement">⚡ Implement now</button>' + (isPr ? "" : '<button class="act-btn" data-act="create-session" data-mode="spec">📝 Refine spec</button><button class="act-btn accent" data-act="create-session" data-mode="cloud">☁ Assign to cloud session</button>') + '</div><div class="tiny" style="margin-top:6px">Plan proposes an approach; Implement starts coding' + (isPr ? "" : "; Refine spec sharpens requirements; Cloud assigns the issue to a remote coding session") + '. New session in the ' + esc(it.repo) + ' project.</div></section>' +
    '<section><h3>Actions</h3><div class="act-row">' + actions.join("") + '</div><div class="act-status" id="actStatus"></div>' +
      '<textarea class="comment-box" id="commentBox" placeholder="Write a comment…" style="margin-top:10px"></textarea>' +
      '<div class="act-row" style="margin-top:8px"><button class="act-btn primary" data-act="comment">Comment</button></div></section>' +
    '<section><h3>Recent comments (' + it.comments.length + ')</h3>' + commentsHtml + '</section>';

  $("itemClose").addEventListener("click", closeItemDetail);
  $("itemDrawer").querySelectorAll("[data-act]").forEach((el) => el.addEventListener("click", () => runAct(el.dataset.act, it, el)));
}

async function runAct(act, it, btn) {
  const status = $("actStatus");
  if (act === "open-gh") { window.open(it.url, "_blank", "noopener,noreferrer"); return; }
  if (act === "create-session") {
    const mode = btn && ["implement", "spec", "cloud"].includes(btn.dataset.mode) ? btn.dataset.mode : "plan";
    const label = mode === "implement" ? "build" : mode === "spec" ? "spec-refinement" : mode === "cloud" ? "cloud" : "planning";
    status.className = "act-status"; status.textContent = "Requesting a " + label + " session…";
    $("itemDrawer").querySelectorAll("[data-act]").forEach((b) => b.disabled = true);
    try {
      const res = await api("/api/item/session", { method: "POST", body: JSON.stringify({ repo: it.repo, type: it.type, number: it.number, title: it.title, mode }) });
      status.className = "act-status ok"; status.textContent = res.message || "Session requested — check your chat.";
    } catch (e) {
      status.className = "act-status err"; status.textContent = e.message;
    } finally {
      $("itemDrawer").querySelectorAll("[data-act]").forEach((b) => b.disabled = false);
    }
    return;
  }
  if ((act === "merge" || act === "close") && !confirm("Are you sure you want to " + act + " " + it.type.toUpperCase() + " #" + it.number + "?")) return;
  const body = act === "comment" ? ($("commentBox") ? $("commentBox").value.trim() : "") : "";
  if (act === "comment" && !body) { status.className = "act-status err"; status.textContent = "Enter a comment first."; return; }
  status.className = "act-status"; status.textContent = "Working…";
  $("itemDrawer").querySelectorAll("[data-act]").forEach((b) => b.disabled = true);
  try {
    const res = await api("/api/item/action", { method: "POST", body: JSON.stringify({ repo: it.repo, type: it.type, number: it.number, action: act, body }) });
    status.className = "act-status ok"; status.textContent = (res.output || (act + " succeeded.")) + " · refreshing…";
    const fresh = await api("/api/item?repo=" + encodeURIComponent(it.repo) + "&type=" + encodeURIComponent(it.type) + "&number=" + encodeURIComponent(it.number));
    renderItemPane(fresh);
    await load(true);
    const s2 = $("actStatus"); if (s2) { s2.className = "act-status ok"; s2.textContent = res.output || (act + " succeeded."); }
  } catch (e) {
    status.className = "act-status err"; status.textContent = e.message;
    $("itemDrawer").querySelectorAll("[data-act]").forEach((b) => b.disabled = false);
  }
}

function closeItemDetail() { $("itemOverlay").classList.remove("open"); itemCtx = null; }

/* ---- manage ---- */
async function loadDiscover(force) {
  state.discoverLoading = true;
  $("discoverGrid").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  try { state.discover = await api("/api/available-repos" + (force ? "?force=1" : "")); }
  catch (e) { $("discoverGrid").innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; }
  finally { state.discoverLoading = false; renderManage(); renderOnboarding(); }
}

function renderManage() {
  const m = state.model; if (!m) return;
  const tracked = m.repos;
  $("trackedCount").textContent = tracked.length;
  $("trackedList").innerHTML = tracked.map((r) => '<div class="card tracked-row"><div><strong>' + esc(r.slug) + '</strong>' + (r.path ? ' <span class="badge">local</span>' : "") + '<div class="tiny">' + esc(r.status ? r.status.label : "") + ' · ' + r.openPrCount + ' PRs · ' + r.openIssueCount + ' issues</div></div><button class="btn" data-remove="' + esc(r.slug) + '">Remove</button></div>').join("") || '<div class="empty">No repos tracked yet.</div>';
  $("trackedList").querySelectorAll("[data-remove]").forEach((el) => el.addEventListener("click", () => removeRepo(el.dataset.remove)));

  if (!state.discover) { if (!state.discoverLoading) $("discoverGrid").innerHTML = '<div class="empty">Click “Reload my repos”.</div>'; return; }
  const trackedSet = new Set(tracked.map((r) => r.slug.toLowerCase()));
  const q = state.filters.discoverText.toLowerCase();
  const repos = discoverItems().filter((r) => !q || (r.slug + " " + (r.description || "") + " " + (r.path || "")).toLowerCase().includes(q));
  $("discoverGrid").innerHTML = repos.slice(0, 120).map((r) => {
    const isTracked = trackedSet.has(r.slug.toLowerCase());
    const payload = esc(encodedRepo(r));
    return '<article class="card discover-card"><div class="discover-head"><strong>' + esc(r.slug) + '</strong>' +
      (isTracked ? '<span class="pill tone-good"><span class="dot"></span>tracked</span>' : '<button class="btn primary" data-add-repo="' + payload + '">Track</button>') + '</div>' +
      '<div class="tiny">' + esc(r.description || "No description") + '</div>' +
      '<div class="tiny">' + (r.source === "local" ? "local project · " + esc(r.path || "") : (r.isPrivate ? "private · " : "") + (r.isFork ? "fork · " : "") + "★ " + (r.stars || 0) + " · pushed " + esc(r.pushedAgeDays === null ? "?" : r.pushedAgeDays + "d ago")) + '</div></article>';
  }).join("") || '<div class="empty">No repositories match.</div>';
  $("discoverGrid").querySelectorAll("[data-add-repo]").forEach((el) => el.addEventListener("click", () => addRepo(JSON.parse(el.dataset.addRepo))));
}

async function trackSelectedOnboarding() {
  const repos = [...state.onboarding.selected].map((value) => JSON.parse(value));
  if (!repos.length) return;
  try {
    await api("/api/repos/set", { method: "POST", body: JSON.stringify({ repos, onboarded: true }) });
    state.onboarding.selected.clear();
    await load(true);
  } catch (e) { alert(e.message); }
}

async function addRepo(slug) {
  const repo = typeof slug === "string" ? { slug } : slug;
  try { await api("/api/repos/add", { method: "POST", body: JSON.stringify({ repos: [repo] }) }); await load(true); switchTab("manage"); }
  catch (e) { alert(e.message); }
}
async function removeRepo(slug) {
  try { await api("/api/repos/remove", { method: "POST", body: JSON.stringify({ slug }) }); await load(true); switchTab("manage"); }
  catch (e) { alert(e.message); }
}

/* ---- wiring ---- */
$("refresh").addEventListener("click", () => load(true));
["mood", "minutes", "busyness", "focusIntent"].forEach((id) => $(id).addEventListener("change", saveFocus));
document.querySelectorAll(".tab").forEach((el) => el.addEventListener("click", () => switchTab(el.dataset.tab)));
$("search").addEventListener("input", (e) => { state.filters.text = e.target.value; renderWork(); });
$("repoFilter").addEventListener("change", (e) => { state.filters.repo = e.target.value; renderWork(); });
$("sort").addEventListener("change", (e) => { state.filters.sort = e.target.value; renderWork(); });
$("repoSearch").addEventListener("input", (e) => { state.filters.repoText = e.target.value; renderRepos(); });
$("repoSort").addEventListener("change", (e) => { state.filters.repoSort = e.target.value; renderRepos(); });
$("cleanupSearch").addEventListener("input", (e) => { state.cleanup.text = e.target.value; renderCleanup(); });
$("cleanupRepo").addEventListener("change", (e) => { state.cleanup.repo = e.target.value; renderCleanup(); });
$("cleanupSort").addEventListener("change", (e) => { state.cleanup.sort = e.target.value; renderCleanup(); });
$("cleanupAll").addEventListener("change", (e) => {
  const items = cleanupFiltered();
  if (e.target.checked) items.forEach((s) => state.cleanup.selected.add(s.id));
  else items.forEach((s) => state.cleanup.selected.delete(s.id));
  renderCleanup();
});
$("cleanupSelectStale").addEventListener("click", () => {
  cleanupInventory().forEach((s) => { if (s.orphaned || s.bucket === "stale" || s.bucket === "ancient") state.cleanup.selected.add(s.id); });
  renderCleanup();
});
$("cleanupDelete").addEventListener("click", deleteSelectedSessions);
$("discoverSearch").addEventListener("input", (e) => { state.filters.discoverText = e.target.value; renderManage(); });
$("reloadDiscover").addEventListener("click", () => loadDiscover(true));
$("addManual").addEventListener("click", () => { const v = $("manualRepo").value.trim(); if (v) { $("manualRepo").value = ""; addRepo(v); } });
$("manualRepo").addEventListener("keydown", (e) => { if (e.key === "Enter") $("addManual").click(); });
$("detailBg").addEventListener("click", closeRepoDetail);
$("itemBg").addEventListener("click", closeItemDetail);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeItemDetail(); closeRepoDetail(); closeCleanupMenus(); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".crow-manage")) closeCleanupMenus(); });

const events = new EventSource("/events");
events.addEventListener("state", () => load(false));
load(false);
`;
}
