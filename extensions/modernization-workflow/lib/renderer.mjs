function serialize(value) {
    return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderHtml(initialState, token) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Modernization Workflow</title>
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--background-color-default, #0d1117);
  color: var(--text-color-default, #f0f6fc);
  font: var(--text-body-medium, 14px)/var(--leading-body-medium, 20px) var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
.shell { min-height: 100vh; }
header {
  padding: 28px 32px 26px;
  background: linear-gradient(125deg, #071a2d 0%, #0c3452 55%, #0d4757 100%);
  color: #fff; border-bottom: 1px solid rgba(255,255,255,.14);
}
.eyebrow { display:flex; align-items:center; gap:9px; text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; color:#7ee7d8; }
.mark { width:9px; height:9px; border-radius:50%; background:#2bd4bd; box-shadow:0 0 0 5px rgba(43,212,189,.13); }
h1 { margin: 12px 0 7px; font-size: var(--text-title-large, 28px); line-height: 1.15; letter-spacing:-.03em; }
.subtitle { margin:0; max-width:720px; color:#bdd3e0; }
.header-row { display:flex; justify-content:space-between; align-items:end; gap:20px; }
.progress-wrap { min-width:180px; text-align:right; }
.progress-value { font-size:26px; font-weight:700; }
.progress-track { height:7px; margin-top:7px; border-radius:8px; background:rgba(255,255,255,.16); overflow:hidden; }
.progress-bar { height:100%; background:#2bd4bd; transition:width .25s ease; }
main { padding:24px 32px 40px; max-width:1280px; margin:auto; }
.notice { display:none; margin-bottom:18px; padding:11px 13px; border:1px solid #9a6700; border-radius:8px; background:rgba(187,128,9,.12); color:var(--text-color-default,#f0f6fc); }
.grid { display:grid; grid-template-columns:minmax(0, 1.45fr) minmax(280px, .75fr); gap:20px; }
.panel { background:var(--background-color-muted,#161b22); border:1px solid var(--border-color-default,#30363d); border-radius:12px; overflow:hidden; }
.panel-head { padding:16px 18px; border-bottom:1px solid var(--border-color-default,#30363d); display:flex; justify-content:space-between; align-items:center; gap:12px; }
.panel-head h2 { margin:0; font-size:16px; }
.panel-body { padding:18px; }
.workflow { display:grid; gap:12px; }
.step { border:1px solid var(--border-color-default,#30363d); border-radius:10px; padding:16px; background:var(--background-color-default,#0d1117); }
.step-top { display:flex; gap:12px; align-items:flex-start; }
.number { flex:0 0 32px; height:32px; display:grid; place-items:center; border-radius:50%; background:#173e54; color:#9ce7e0; font-weight:700; }
.step.complete .number { background:#1f6f58; color:#fff; }
.step.active { border-color:#2bd4bd; box-shadow:0 0 0 1px rgba(43,212,189,.22); }
.step h3 { margin:1px 0 3px; font-size:15px; }
.step p { margin:0; color:var(--text-color-muted,#8b949e); font-size:12px; }
.status { margin-left:auto; padding:3px 8px; border-radius:99px; font-size:11px; text-transform:capitalize; border:1px solid var(--border-color-default,#30363d); }
.status.complete { color:#56d6a1; border-color:#238636; background:rgba(35,134,54,.12); }
.status.active { color:#7ee7d8; border-color:#2bd4bd; }
.status.blocked { color:#ffb8b0; border-color:#f85149; }
.command { display:flex; align-items:center; gap:10px; margin:13px 0 10px 44px; padding:10px 11px; border-radius:7px; background:#050b10; border:1px solid #26323d; }
code { flex:1; min-width:0; overflow:auto; color:#d8f4f0; font:12px/18px var(--font-mono, Consolas, monospace); white-space:nowrap; }
.copy, .small-btn { flex:0 0 auto; border:1px solid var(--border-color-default,#30363d); background:var(--background-color-muted,#161b22); color:inherit; border-radius:6px; padding:6px 9px; }
.actions { margin-left:44px; display:flex; gap:7px; flex-wrap:wrap; }
.primary { border-color:#238636; background:#238636; color:#fff; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
label { display:grid; gap:5px; color:var(--text-color-muted,#8b949e); font-size:12px; }
label.wide { grid-column:1/-1; }
input, select, textarea { width:100%; border:1px solid var(--border-color-default,#30363d); border-radius:7px; padding:8px 9px; background:var(--background-color-default,#0d1117); color:var(--text-color-default,#f0f6fc); }
textarea { min-height:65px; resize:vertical; }
.save-row { display:flex; justify-content:flex-end; margin-top:12px; }
.meta { display:grid; gap:10px; margin:0; }
.meta div { display:grid; grid-template-columns:105px 1fr; gap:10px; }
.meta dt { color:var(--text-color-muted,#8b949e); }
.meta dd { margin:0; overflow-wrap:anywhere; }
.artifact-list { margin:0; padding:0; list-style:none; display:grid; gap:7px; }
.artifact-list li { padding:8px 9px; border-radius:6px; background:var(--background-color-default,#0d1117); font:11px/16px var(--font-mono,Consolas,monospace); overflow-wrap:anywhere; }
.empty { color:var(--text-color-muted,#8b949e); font-size:12px; }
.links { display:flex; gap:8px; flex-wrap:wrap; }
.links a { color:#58a6ff; text-decoration:none; }
.stack { display:grid; gap:20px; }
.toast { position:fixed; right:20px; bottom:20px; padding:9px 12px; border-radius:7px; background:#238636; color:#fff; opacity:0; transform:translateY(8px); transition:.2s; pointer-events:none; }
.toast.show { opacity:1; transform:none; }
@media (max-width:850px) { .grid { grid-template-columns:1fr; } .header-row { align-items:start; } .progress-wrap { min-width:130px; } }
@media (max-width:560px) { header, main { padding-left:18px; padding-right:18px; } .form-grid { grid-template-columns:1fr; } label.wide { grid-column:auto; } .command,.actions { margin-left:0; } }
</style>
</head>
<body>
<div class="shell">
<header>
  <div class="header-row">
    <div>
      <div class="eyebrow"><span class="mark"></span> GitHub Copilot modernization</div>
      <h1>Modernization Workflow</h1>
      <p class="subtitle">Move from evidence to an approved plan and validated code changes with the Modernize CLI.</p>
    </div>
    <div class="progress-wrap"><div class="progress-value" id="progressValue">0%</div><div class="progress-track"><div class="progress-bar" id="progressBar"></div></div></div>
  </div>
</header>
<main>
  <div class="notice" id="notice"></div>
  <div class="grid">
    <section class="panel">
      <div class="panel-head"><h2>Assess → Plan → Execute</h2><button class="small-btn" id="refresh">Refresh artifacts</button></div>
      <div class="panel-body">
        <div class="workflow" id="workflow"></div>
        <div class="step" style="margin-top:12px">
          <div class="step-top"><div class="number">↗</div><div><h3>Upgrade fast path</h3><p>Run the documented end-to-end plan-and-execute workflow when a separate plan review is not required.</p></div></div>
          <div class="command"><code id="upgradeCommand"></code><button class="copy" data-command="upgrade">Copy</button></div>
        </div>
      </div>
    </section>
    <div class="stack">
      <section class="panel">
        <div class="panel-head"><h2>Workflow setup</h2></div>
        <div class="panel-body">
          <form id="config">
            <div class="form-grid">
              <label>Technology<select name="language"><option value="auto">Auto-detect</option><option value="dotnet">.NET</option><option value="java">Java</option><option value="cpp">C++</option></select></label>
              <label>Execution<select name="delegate"><option value="local">Local</option><option value="cloud">Cloud agent</option></select></label>
              <label class="wide">Source<input name="source" required></label>
              <label class="wide">Modernization goal<textarea name="goal" required></textarea></label>
              <label class="wide">Upgrade target (optional)<input name="upgradeTarget" placeholder="Java 21, Spring Boot 3.2, or .NET 10"></label>
              <label class="wide">Plan name<input name="planName" pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}" required></label>
            </div>
            <div class="save-row"><button class="small-btn primary" type="submit">Save configuration</button></div>
          </form>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Repository signal</h2></div>
        <div class="panel-body"><dl class="meta" id="meta"></dl></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Detected artifacts</h2></div>
        <div class="panel-body"><ul class="artifact-list" id="artifacts"></ul></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Reference</h2></div>
        <div class="panel-body links">
          <a href="https://github.com/microsoft/modernize-cli" target="_blank" rel="noreferrer">Modernize CLI</a>
          <a href="https://learn.microsoft.com/azure/developer/github-copilot-app-modernization/modernization-agent/overview" target="_blank" rel="noreferrer">Overview</a>
          <a href="https://learn.microsoft.com/azure/developer/github-copilot-app-modernization/modernization-agent/cli-commands" target="_blank" rel="noreferrer">CLI commands</a>
        </div>
      </section>
    </div>
  </div>
</main>
</div>
<div class="toast" id="toast"></div>
<script>
const TOKEN=${serialize(token)};
let state=${serialize(initialState)};
const definitions={
  assess:{title:"Assess",description:"Analyze source, dependencies, risks, and cloud readiness.",number:1},
  plan:{title:"Plan",description:"Create and review an ordered plan with tasks and success criteria.",number:2},
  execute:{title:"Execute",description:"Apply transformations, validate builds, scan CVEs, and summarize.",number:3}
};
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const el=document.querySelector("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1500);}
async function post(path,body={}){const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","x-canvas-token":TOKEN},body:JSON.stringify(body)});const value=await response.json();if(!response.ok)throw new Error(value.error||"Request failed");state=value;render();}
function render(){
  const complete=Object.values(state.steps).filter(s=>s.status==="complete").length;
  const percent=Math.round(complete/3*100);
  document.querySelector("#progressValue").textContent=percent+"%";
  document.querySelector("#progressBar").style.width=percent+"%";
  const notice=document.querySelector("#notice");
  notice.style.display=state.compatibilityNotice?"block":"none";notice.textContent=state.compatibilityNotice||"";
  document.querySelector("#workflow").innerHTML=Object.entries(definitions).map(([key,d])=>{
    const status=state.steps[key].status;
    return '<article class="step '+esc(status)+'"><div class="step-top"><div class="number">'+d.number+'</div><div><h3>'+d.title+'</h3><p>'+d.description+'</p></div><span class="status '+esc(status)+'">'+esc(status)+'</span></div><div class="command"><code>'+esc(state.commands[key])+'</code><button class="copy" data-command="'+key+'">Copy</button></div><div class="actions"><button class="small-btn" data-step="'+key+'" data-status="active">Set active</button><button class="small-btn primary" data-step="'+key+'" data-status="complete">Mark complete</button><button class="small-btn" data-step="'+key+'" data-status="blocked">Blocked</button></div></article>';
  }).join("");
  document.querySelector("#upgradeCommand").textContent=state.commands.upgrade;
  const form=document.querySelector("#config");
  for(const name of ["language","delegate","source","goal","upgradeTarget","planName"]) form.elements[name].value=state[name];
  document.querySelector("#meta").innerHTML=[
    ["Workspace",state.workspace],["Detected",state.detectedLanguage],["Using",state.effectiveLanguage],["State",state.stateId]
  ].map(([a,b])=>"<div><dt>"+esc(a)+"</dt><dd>"+esc(b)+"</dd></div>").join("");
  const artifacts=[...state.artifacts.assessment,...state.artifacts.plan,...state.artifacts.execution];
  document.querySelector("#artifacts").innerHTML=artifacts.length?artifacts.slice(0,12).map(x=>"<li>"+esc(x)+"</li>").join(""):'<li class="empty">No Modernize CLI output detected yet.</li>';
}
document.addEventListener("click",async event=>{
  const copy=event.target.closest("[data-command]");
  if(copy){await navigator.clipboard.writeText(state.commands[copy.dataset.command]);toast("Command copied");}
  const step=event.target.closest("[data-step]");
  if(step){try{await post("/api/step",{step:step.dataset.step,status:step.dataset.status});toast("Progress updated");}catch(error){toast(error.message);}}
});
document.querySelector("#refresh").addEventListener("click",async()=>{try{await post("/api/refresh");toast("Artifacts refreshed");}catch(error){toast(error.message);}});
document.querySelector("#config").addEventListener("submit",async event=>{event.preventDefault();try{await post("/api/configure",Object.fromEntries(new FormData(event.target)));toast("Configuration saved");}catch(error){toast(error.message);}});
const events=new EventSource("/events");events.addEventListener("state",event=>{state=JSON.parse(event.data);render();});
render();
</script>
</body>
</html>`;
}
