import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const servers = new Map();

const characters = {
    mr: { name: "Mr. Pac-Man", color: "#ffd43b" },
    mrs: { name: "Mrs. Pac-Man", color: "#ff78b7" },
};
const milestoneThresholds = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

function createState() {
    return {
        credits: 0,
        limit: 100,
        character: "mr",
        dead: false,
        achievements: [],
        fruit: null,
        fruitVersion: 0,
        entitlement: null,
        runVersion: 0,
    };
}

function nextMilestone(credits) {
    return milestoneThresholds.find((threshold) => threshold > credits) || milestoneThresholds[milestoneThresholds.length - 1];
}

function snapshot(entry) {
    const { state } = entry;
    return {
        ...state,
        percent: Math.min(100, Math.round((state.credits / state.limit) * 100)),
        character: characters[state.character],
        nextMilestone: nextMilestone(state.credits),
    };
}

function broadcast(entry) {
    const message = `data: ${JSON.stringify(snapshot(entry))}\n\n`;
    for (const client of entry.clients) client.write(message);
}

function applyUsage(entry, totalCredits) {
    const { state } = entry;
    const safeTotal = Math.max(0, Number(totalCredits) || 0);
    const before = state.credits;
    state.credits = safeTotal;
    const awarded = [];
    for (const threshold of milestoneThresholds) {
        if (threshold <= state.credits && threshold > before) {
            awarded.push(threshold);
        }
    }
    for (const threshold of awarded) {
        state.fruit = ["🍒", "🍓", "🍊", "🍎", "🍇"][Math.min(4, Math.floor((milestoneThresholds.indexOf(threshold)) / 2))];
        state.fruitVersion += 1;
        state.achievements.unshift({ label: `${threshold.toLocaleString()} session credits munched`, fruit: state.fruit });
        state.achievements = state.achievements.slice(0, 5);
    }
    state.dead = state.credits >= state.limit;
    broadcast(entry);
}

async function syncUsage(entry) {
    const metrics = await session.rpc.usage.getMetrics();
    const nanoAiu = Number(metrics.totalNanoAiu) || entry.eventNanoAiu;
    const credits = nanoAiu > 0 ? nanoAiu / 1_000_000_000 : Number(metrics.totalPremiumRequestCost) || 0;
    applyUsage(entry, credits);
}

// Pull the authenticated user's real Copilot entitlement (premium request quota).
async function syncQuota(entry) {
    try {
        const result = await session.connection.sendRequest("account.getQuota", {});
        const snaps = result?.quotaSnapshots || {};
        const snap = snaps.premium_interactions || snaps.chat || Object.values(snaps)[0];
        if (!snap) return;
        entry.state.entitlement = {
            type: snaps.premium_interactions ? "Premium requests" : (snaps.chat ? "Chat requests" : "Requests"),
            unlimited: !!snap.isUnlimitedEntitlement,
            max: Number(snap.entitlementRequests),
            used: Number(snap.usedRequests) || 0,
            remainingPercentage: Number(snap.remainingPercentage),
            overage: Number(snap.overage) || 0,
            resetDate: snap.resetDate || null,
        };
        broadcast(entry);
    } catch (err) {
        await session.log(`Token Pac-Man: quota lookup unavailable (${err?.message || err})`, { level: "warning", ephemeral: true });
    }
}

function getOpenEntry(instanceId) {
    const entry = servers.get(instanceId);
    if (!entry) throw new Error("Token Pac-Man canvas is not open.");
    return entry;
}

function json(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}

function renderHtml() {
    return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Token Pac-Man</title>
<style>
:root{color-scheme:dark;--ink:#f5f7ff;--muted:#a9b0c7;--panel:#17182c;--line:#303458;--blue:#4d7cff;--yellow:#ffd43b;--pink:#ff78b7}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,#25264b,#0d0e1d 75%);color:var(--ink);font:14px system-ui,-apple-system,sans-serif;min-height:100vh;padding:20px}
.wrap{max-width:740px;margin:auto}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.eyebrow{color:#82a2ff;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:11px}h1{margin:4px 0;font-size:28px}p{color:var(--muted);margin:4px 0 18px}.pill{border:1px solid var(--line);border-radius:999px;padding:7px 11px;color:#cbd2ee;white-space:nowrap}
.panel{background:color-mix(in srgb,var(--panel) 92%,transparent);border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:14px;box-shadow:0 16px 50px #0004}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.stat{background:#101124;border-radius:12px;padding:12px}.label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.value{font-size:22px;font-weight:800;margin-top:4px}.bar{height:13px;background:#2a2b48;border-radius:99px;overflow:hidden;margin:14px 0 8px}.fill{height:100%;background:linear-gradient(90deg,#38d996,#ffd43b,#ff5964);border-radius:99px;transition:width .35s}.meter{display:flex;justify-content:space-between;color:var(--muted);font-size:12px}
.maze{margin-top:16px;border:3px solid #3758dc;border-radius:12px;padding:8px;background:#090b20;position:relative;overflow:hidden}.maze canvas{display:block;width:100%;height:auto;border-radius:7px}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}.controls button,.controls input,.controls select{background:#222542;border:1px solid #414875;color:var(--ink);border-radius:9px;padding:9px 11px;font:inherit}.controls button{cursor:pointer}.controls button:hover{border-color:#8395ff}.controls button.active{outline:2px solid var(--blue)}.controls input,.controls select{width:120px}.help{color:var(--muted);font-size:12px;margin-top:8px}.achievements{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.badge{background:#292440;border:1px solid #5b4774;border-radius:999px;padding:7px 10px;color:#f3d7ff}.dead{color:#ff7c87;font-weight:800}.alive{color:#6ff0ba;font-weight:700}.quota{margin-top:12px;padding-top:12px;border-top:1px dashed #303458}.qhead{display:flex;justify-content:space-between;align-items:center}.qreset{color:var(--muted);font-size:11px}.fill.qf{background:linear-gradient(90deg,#4d7cff,#8f5bff,#ff5964)}
@media(max-width:560px){body{padding:12px}.stats{grid-template-columns:1fr 1fr}.stats .stat:last-child{grid-column:span 2}.top{display:block}.pill{display:inline-block;margin-top:10px}}
</style></head><body><main class="wrap">
<div class="top"><div><div class="eyebrow">Live AI credit arcade</div><h1>Token Pac-Man</h1><p>Chomp this session's AI credits. Dodge the ghosts. Chase your next fruit.</p></div><div id="status" class="pill">🟢 Running</div></div>
<section class="panel"><div class="stats"><div class="stat"><div class="label">Session credits munched</div><div id="used" class="value">0.00</div></div><div class="stat"><div class="label">Session credit limit</div><div id="limit" class="value">100.00</div></div><div class="stat"><div class="label">Next fruit</div><div id="next" class="value">10.00</div></div></div>
<div class="bar"><div id="fill" class="fill" style="width:0%"></div></div><div class="meter"><span id="percent">0%</span><span>💊 ghost pressure</span></div>
<div id="quotaWrap" class="quota" hidden><div class="qhead"><span class="label" id="qtype">Plan entitlement</span><span id="qreset" class="qreset"></span></div><div class="bar"><div id="qfill" class="fill qf" style="width:0%"></div></div><div class="meter"><span id="qused">–</span><span id="qmax">–</span></div></div>
<div class="maze"><canvas id="board" width="570" height="330" aria-label="Animated Pac-Man maze"></canvas></div>
<div class="controls"><span class="label">Player</span><button id="mr" onclick="choose('mr')">Mr. Pac-Man</button><button id="mrs" onclick="choose('mrs')">Mrs. Pac-Man</button><span class="label">Limit</span><select id="limitPreset"><option value="100" selected>100</option><option value="200">200</option><option value="500">500</option><option value="1000">1,000</option><option value="2500">2,500</option><option value="5000">5,000</option><option value="10000">10,000</option><option value="25000">25,000</option><option value="50000">50,000</option><option value="100000">100,000</option><option value="custom">Custom…</option></select><input id="limitInput" type="number" min="1" placeholder="Custom limit" hidden><button onclick="setLimit()">Apply limit</button><button onclick="resetRun()">↺ New run</button></div><div class="help">New run clears the visible fruit streak and starts a fresh chase without changing your live session credits.</div></section>
<section class="panel"><div class="label">Achievements</div><div id="achievements" class="achievements"><span class="badge">🍒 Ready for your first 1,000</span></div></section>
</main><script>
const $=id=>document.getElementById(id);
const cvs=$('board'), ctx=cvs.getContext('2d');
// ===== Maze grid (1=wall, 0=path). Fully connected, hand-tuned. =====
const maze=["1111111111111111111","1000000010000000001","1011110111011011101","1010000000000001001","1010110111101101011","1000100000000100001","1110101111101010111","1000100010001000001","1011111010101111101","1000000010001000001","1111111111111111111"];
const H=maze.length, W=maze[0].length;
const isOpen=(x,y)=>y>=0&&y<H&&x>=0&&x<W&&maze[y][x]==='0';
// Direction priority: up, left, down, right (classic tie-break order)
const DIRS=[[0,-1],[-1,0],[0,1],[1,0]];
function neighbors(x,y){return DIRS.filter(([dx,dy])=>isOpen(x+dx,y+dy));}
// BFS: return the first STEP tile on the shortest path toward the nearest cell matching isGoal.
function bfsStep(sx,sy,isGoal,isBlocked=()=>false){
  const k=(x,y)=>x+','+y, prev=new Map(), q=[[sx,sy]]; prev.set(k(sx,sy),null);
  while(q.length){const [x,y]=q.shift();
    if(isGoal(x,y)&&!(x===sx&&y===sy)){let cur=[x,y];
      while(prev.get(k(cur[0],cur[1]))){const p=prev.get(k(cur[0],cur[1])); if(p[0]===sx&&p[1]===sy)return cur; cur=p;} return cur;}
    for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy; if(isOpen(nx,ny)&&!isBlocked(nx,ny)&&!prev.has(k(nx,ny))){prev.set(k(nx,ny),[x,y]);q.push([nx,ny]);}}}
  return [sx,sy];
}
// Ghost: greedy pick of neighbor minimizing squared distance to target tile, no reversing.
function ghostStep(gx,gy,dir,tx,ty){
  let best=null,bd=Infinity;
  for(const [dx,dy] of DIRS){ if(dir&&dx===-dir[0]&&dy===-dir[1])continue; if(!isOpen(gx+dx,gy+dy))continue;
    const nx=gx+dx,ny=gy+dy,d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty); if(d<bd){bd=d;best=[dx,dy];}}
  if(!best){for(const [dx,dy] of DIRS)if(isOpen(gx+dx,gy+dy)){best=[dx,dy];break;}}
  return best;
}
function manhattan(ax,ay,bx,by){return Math.abs(ax-bx)+Math.abs(ay-by);}
const tileKey=(x,y)=>x+','+y;
function ghostTile(x,y){return ghosts.some(g=>g.x===x&&g.y===y);}
function ghostStepAvoid(g,tx,ty,reserved){
  let best=null,bd=Infinity;
  for(const [dx,dy] of DIRS){if(g.dir&&dx===-g.dir[0]&&dy===-g.dir[1])continue;const nx=g.x+dx,ny=g.y+dy,key=tileKey(nx,ny);if(!isOpen(nx,ny)||reserved.has(key))continue;const d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty);if(d<bd){bd=d;best=[dx,dy];}}
  if(!best){for(const [dx,dy] of DIRS){const nx=g.x+dx,ny=g.y+dy,key=tileKey(nx,ny);if(isOpen(nx,ny)&&!reserved.has(key)){best=[dx,dy];break;}}}
  return best;
}
function emptyRoamStep(){
  const empty=(x,y)=>isOpen(x,y)&&!pellets.has(tileKey(x,y))&&!ghostTile(x,y);
  if(!empty(pac.x,pac.y))return bfsStep(pac.x,pac.y,empty,ghostTile);
  const opts=DIRS.filter(([dx,dy])=>empty(pac.x+dx,pac.y+dy)&&!(dx===-pac.dir[0]&&dy===-pac.dir[1]));
  if(opts.length){const straight=opts.find(([dx,dy])=>dx===pac.dir[0]&&dy===pac.dir[1]);const mv=straight||opts[0];return [pac.x+mv[0],pac.y+mv[1]];}
  const back=[pac.x-pac.dir[0],pac.y-pac.dir[1]];
  if(empty(back[0],back[1]))return back;
  return [pac.x,pac.y];
}

// ===== Entities =====
const spawn=(x,y,dx,dy)=>({x,y,px:x,py:y,dir:[dx,dy],prog:1,eatOnArrival:false,fruitOnArrival:false});
let pac, ghosts, pellets, totalPellets=0;
const GHOST_META=[
  {name:'blinky',color:'#ff5b6e',scatter:[W-2,1]},   // chases Pac-Man directly
  {name:'pinky', color:'#ff9f43',scatter:[1,1]},     // aims 4 tiles ahead
  {name:'inky',  color:'#61e2ff',scatter:[W-2,H-2]}, // mirror vector via Blinky
  {name:'clyde', color:'#ffb8de',scatter:[1,H-2]}    // shy: far=chase, near=flee
];
function resetPellets(){pellets=new Set();for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(isOpen(x,y))pellets.add(x+','+y);totalPellets=pellets.size;}
function initGame(){pac=spawn(1,1,1,0);ghosts=[spawn(W-2,1,-1,0),spawn(9,3,1,0),spawn(W-2,H-2,0,-1),spawn(1,H-2,0,1)];resetPellets();}
initGame();

let game={state:{credits:0,limit:100,runVersion:0,fruitVersion:0,character:{name:'Mr. Pac-Man',color:'#ffd43b'},fruit:null,dead:false,percent:0}};
let anim=0, mouth=0;
let fruitPickup=null; // {x,y,emoji} — an uncollected milestone fruit sitting on the board
let lastFruitVersion=null; // monotonic fruit counter last seen, to detect a newly-earned fruit
const FRUIT_TILE=[9,5]; // open junction where a fruit appears

// ===== One logical tick: advance everyone by one tile using AI =====
function targetFor(i){
  const bl=ghosts[0];
  let t;
  if(i===0)t=[pac.x,pac.y];
  else if(i===1)t=[pac.x+pac.dir[0]*4,pac.y+pac.dir[1]*4];
  else if(i===2){const ax=pac.x+pac.dir[0]*2,ay=pac.y+pac.dir[1]*2;t=[ax+(ax-bl.x),ay+(ay-bl.y)];}
  else t=manhattan(ghosts[3].x,ghosts[3].y,pac.x,pac.y)>8?[pac.x,pac.y]:GHOST_META[3].scatter;
  return [Math.max(0,Math.min(W-1,t[0])),Math.max(0,Math.min(H-1,t[1]))];
}
function tick(){
  const dead=game.state.dead;
  if(!dead){
    if(pac.eatOnArrival){pellets.delete(pac.x+','+pac.y);pac.eatOnArrival=false;}
    if(fruitPickup&&pac.x===fruitPickup.x&&pac.y===fruitPickup.y){fruitPickup=null;pac.fruitOnArrival=false;}
    const frac=game.state.limit>0?game.state.credits/game.state.limit:0;
    const eatTarget=Math.min(totalPellets,Math.floor(frac*totalPellets));
    const deficit=eatTarget-(totalPellets-pellets.size);
    const fruitActive=fruitPickup!==null;
    // Priority: grab fruit, then consume needed pellets, otherwise roam only across already-cleared tiles.
    const step=fruitActive
      ? (ghostTile(fruitPickup.x,fruitPickup.y) ? emptyRoamStep() : bfsStep(pac.x,pac.y,(x,y)=>x===fruitPickup.x&&y===fruitPickup.y,ghostTile))
      : (deficit>0 ? bfsStep(pac.x,pac.y,(x,y)=>pellets.has(tileKey(x,y))&&!ghostTile(x,y),ghostTile) : emptyRoamStep());
    pac.dir=[step[0]-pac.x,step[1]-pac.y]; pac.px=pac.x; pac.py=pac.y; pac.x=step[0]; pac.y=step[1]; pac.prog=0;
    pac.eatOnArrival=deficit>0&&pellets.has(pac.x+','+pac.y);
    pac.fruitOnArrival=fruitActive&&pac.x===fruitPickup.x&&pac.y===fruitPickup.y;
  }
  // Ghosts (move only while the board is animating: when Pac is chasing pellets, or on death)
  const reserved=new Set([tileKey(pac.x,pac.y),tileKey(pac.px,pac.py)]);
  ghosts.forEach(g=>reserved.add(tileKey(g.x,g.y)));
  ghosts.forEach((g,i)=>{
    if(dead){ // limit hit: home in on Pac-Man via true shortest path and catch him
      const step=bfsStep(g.x,g.y,(x,y)=>x===pac.x&&y===pac.y);
      g.px=g.x;g.py=g.y;g.dir=[step[0]-g.x,step[1]-g.y];g.x=step[0];g.y=step[1];g.prog=0;return;
    }
    reserved.delete(tileKey(g.x,g.y));
    const [tx,ty]=targetFor(i);
    const mv=ghostStepAvoid(g,tx,ty,reserved); if(!mv){reserved.add(tileKey(g.x,g.y));return;}
    const nx=g.x+mv[0],ny=g.y+mv[1];
    if(nx===pac.x&&ny===pac.y){reserved.add(tileKey(g.x,g.y));return;} // alive: never actually land on Pac-Man — only catch on limit
    g.px=g.x;g.py=g.y;g.dir=mv;g.x=nx;g.y=ny;g.prog=0;
    reserved.add(tileKey(g.x,g.y));
  });
}

// ===== Drawing =====
function drawPac(x,y,size,color,dir){
  const ang=Math.atan2(dir[1],dir[0]); const m=.05+Math.abs(Math.sin(mouth))*.30;
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,size,m,-m,false);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#17182c';ctx.beginPath();ctx.arc(size*.1,-size*.5,size*.12,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawGhost(x,y,size,color,dir,frightened){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=frightened?'#3b4fd6':color;
  ctx.beginPath();ctx.arc(0,-size*.1,size,Math.PI,0);ctx.lineTo(size,size*.75);
  for(let i=0;i<4;i++){const sx=size-(i*2+1)*size/4;ctx.lineTo(sx,size*(i%2?.75:.5));}
  ctx.lineTo(-size,size*.75);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';const ex=dir[0]*size*.12,ey=dir[1]*size*.12;
  for(const s of[-.35,.35]){ctx.beginPath();ctx.arc(s*size,-size*.15,size*.26,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#26316c';for(const s of[-.35,.35]){ctx.beginPath();ctx.arc(s*size+ex,-size*.15+ey,size*.12,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function lerp(a,b,t){return a+(b-a)*t;}
function draw(){
  const w=cvs.width,h=cvs.height,cw=w/W,ch=h/H,cell=Math.min(cw,ch);
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#07091b';ctx.fillRect(0,0,w,h);
  // walls
  ctx.strokeStyle='#3452d6';ctx.lineWidth=Math.max(2,cell*.14);ctx.lineCap='round';
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(maze[y][x]!=='1')continue;const cx=x*cw+cw/2,cy=y*ch+ch/2;
    for(const [dx,dy] of [[1,0],[0,1]]){if(x+dx<W&&y+dy<H&&maze[y+dy][x+dx]==='1'){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+dx*cw,cy+dy*ch);ctx.stroke();}}
    let iso=true;for(const [dx,dy] of DIRS)if(x+dx>=0&&x+dx<W&&y+dy>=0&&y+dy<H&&maze[y+dy][x+dx]==='1')iso=false;
    if(iso){ctx.fillStyle='#3452d6';ctx.beginPath();ctx.arc(cx,cy,cell*.12,0,Math.PI*2);ctx.fill();}}
  // pellets
  ctx.fillStyle='#ffe27a';for(const p of pellets){const [x,y]=p.split(',').map(Number);ctx.beginPath();ctx.arc(x*cw+cw/2,y*ch+ch/2,Math.max(1.5,cell*.09),0,Math.PI*2);ctx.fill();}
  // fruit pickup: a milestone reward sitting on the board until Pac-Man grabs it
  if(fruitPickup){const fx=fruitPickup.x*cw+cw/2,fy=fruitPickup.y*ch+ch/2;const pulse=1+Math.sin(anim*.15)*.08;ctx.save();ctx.shadowColor='#ffd43b';ctx.shadowBlur=16;ctx.font=(cell*1.15*pulse)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fruitPickup.emoji,fx,fy);ctx.restore();}
  // entities (interpolated)
  const dead=game.state.dead;
  ghosts.forEach((g,i)=>{const gx=lerp(g.px,g.x,g.prog)*cw+cw/2,gy=lerp(g.py,g.y,g.prog)*ch+ch/2;drawGhost(gx,gy,cell*.4,GHOST_META[i].color,g.dir,false);});
  const pxp=lerp(pac.px,pac.x,pac.prog)*cw+cw/2,pyp=lerp(pac.py,pac.y,pac.prog)*ch+ch/2;
  if(!(dead&&Math.floor(anim/8)%2===0))drawPac(pxp,pyp,cell*.44,game.state.character.color,pac.dir);
  if(dead){ctx.fillStyle='rgba(9,11,32,.55)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ff7c87';ctx.font='bold '+cell*1.3+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GAME OVER',w/2,h/2);}
}

const TICK_FRAMES=20; // frames per tile move (movement speed; higher = slower)
function loop(){
  anim++;
  mouth+=.35;
  const inc=1/TICK_FRAMES;
  pac.prog=Math.min(1,pac.prog+inc);ghosts.forEach(g=>g.prog=Math.min(1,g.prog+inc));
  if(pac.prog>=1&&ghosts.every(g=>g.prog>=1)){tick();}
  draw();requestAnimationFrame(loop);
}

function paint(s){
  const didReset = game.state.runVersion !== s.runVersion;
  game.state=s;
  if(didReset){initGame();anim=0;mouth=0;fruitPickup=null;lastFruitVersion=s.fruitVersion;}
  else{
    if(lastFruitVersion===null)lastFruitVersion=s.fruitVersion; // first paint: don't spawn for pre-existing milestones
    else if(s.fruitVersion>lastFruitVersion&&s.fruit){fruitPickup={x:FRUIT_TILE[0],y:FRUIT_TILE[1],emoji:s.fruit};}
    lastFruitVersion=s.fruitVersion;
  }
  $('used').textContent=s.credits.toFixed(2);$('limit').textContent=s.limit.toFixed(2);$('next').textContent=s.nextMilestone.toFixed(2);$('percent').textContent=s.percent+'%';$('fill').style.width=s.percent+'%';
  {const sel=$('limitPreset');const match=[...sel.options].some(o=>o.value===String(s.limit));if(match&&document.activeElement!==sel){sel.value=String(s.limit);updateLimitInput();}}$('mr').classList.toggle('active',s.character.name==='Mr. Pac-Man');$('mrs').classList.toggle('active',s.character.name==='Mrs. Pac-Man');$('status').textContent=s.dead?'💀 Limit busted':'🟢 Running';$('status').className='pill '+(s.dead?'dead':'alive');$('achievements').innerHTML=s.achievements.length?s.achievements.map(a=>'<span class="badge">'+a.fruit+' '+a.label+'</span>').join(''):'<span class="badge">🍒 Ready for your first 10 session credits</span>';
  const e=s.entitlement;const qw=$('quotaWrap');
  if(e){qw.hidden=false;$('qtype').textContent=e.type+' this period';
    if(e.unlimited||e.max<0){$('qused').textContent=e.used.toLocaleString()+' used';$('qmax').textContent='∞ unlimited';$('qfill').style.width='100%';}
    else{const usedPct=Math.max(0,Math.min(100,100-(isFinite(e.remainingPercentage)?e.remainingPercentage:100)));$('qfill').style.width=usedPct+'%';$('qused').textContent=e.used.toLocaleString()+(e.overage?(' (+'+e.overage.toLocaleString()+' overage)'):'')+' used';$('qmax').textContent='max '+e.max.toLocaleString()+' • '+usedPct.toFixed(0)+'%';}
    $('qreset').textContent=e.resetDate?('resets '+new Date(e.resetDate).toLocaleDateString()):'';
  }else{qw.hidden=true;}
}
async function post(path,body){await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})})}
function choose(character){post('/choose',{character})}
function updateLimitInput(){const custom=$('limitPreset').value==='custom';$('limitInput').hidden=!custom;$('limitInput').placeholder=custom?'Custom session limit':'Custom limit';}
function setLimit(){const preset=$('limitPreset').value;const limit=preset==='custom'?Number($('limitInput').value):Number(preset);if(limit>0)post('/limit',{limit})}
function resetRun(){post('/reset')}
$('limitPreset').addEventListener('change',updateLimitInput);updateLimitInput();
const events=new EventSource('/events');events.onmessage=e=>paint(JSON.parse(e.data));fetch('/state').then(r=>r.json()).then(paint);requestAnimationFrame(loop);
</script></body></html>`;
}

async function startServer(instanceId) {
    const entry = {
        server: null,
        url: null,
        state: createState(),
        clients: new Set(),
        eventNanoAiu: 0,
        quotaInterval: null,
    };
    const server = createServer(async (req, res) => {
        if (req.url === "/events") {
            res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
            res.write(`data: ${JSON.stringify(snapshot(entry))}\n\n`);
            entry.clients.add(res);
            req.on("close", () => entry.clients.delete(res));
            return;
        }
        if (req.url === "/state") return json(res, 200, snapshot(entry));
        if (req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            let input = {};
            try {
                input = body ? JSON.parse(body) : {};
            } catch {
                return json(res, 400, { error: "Invalid JSON request body." });
            }

            const { state } = entry;
            if (req.url === "/choose" && characters[input.character]) state.character = input.character;
            else if (req.url === "/limit" && Number(input.limit) > 0) { state.limit = Number(input.limit); state.dead = state.credits >= state.limit; state.runVersion += 1; }
            else if (req.url === "/reset") { state.achievements = []; state.fruit = null; state.runVersion += 1; state.dead = state.credits >= state.limit; await syncUsage(entry); }
            broadcast(entry);
            return json(res, 200, snapshot(entry));
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    entry.server = server;
    entry.url = `http://127.0.0.1:${port}/`;
    entry.quotaInterval = setInterval(() => { void syncQuota(entry); }, 60_000);
    return entry;
}

const session = await joinSession({
    canvases: [createCanvas({
        id: "token-pacman",
        displayName: "Token Pac-Man",
        description: "Live Pac-Man-style token consumption tracker with character choice, fruit achievements, and API limit tracking.",
        inputSchema: { type: "object", properties: {} },
        actions: [
            { name: "sync_usage", description: "Refresh the canvas from the active session's accumulated AI credit usage and the user's plan entitlement.", handler: async (ctx) => { const entry = getOpenEntry(ctx.instanceId); await syncUsage(entry); await syncQuota(entry); return snapshot(entry); } },
            { name: "set_limit", description: "Set the AI credit limit that triggers game over. Resyncs the pellet board to the new limit.", inputSchema: { type: "object", properties: { limit: { type: "number", minimum: 0.01 } }, required: ["limit"] }, handler: async (ctx) => { const entry = getOpenEntry(ctx.instanceId); const { state } = entry; state.limit = Number(ctx.input.limit); state.dead = state.credits >= state.limit; state.runVersion += 1; broadcast(entry); return snapshot(entry); } },
            { name: "reset_run", description: "Start a fresh visible run by clearing fruit streaks and resetting the board, without changing your live session credit total.", handler: async (ctx) => { const entry = getOpenEntry(ctx.instanceId); const { state } = entry; state.achievements = []; state.fruit = null; state.runVersion += 1; state.dead = state.credits >= state.limit; await syncUsage(entry); return snapshot(entry); } },
        ],
        open: async (ctx) => {
            let entry = servers.get(ctx.instanceId);
            if (!entry) { entry = await startServer(ctx.instanceId); servers.set(ctx.instanceId, entry); }
            await syncUsage(entry);
            await syncQuota(entry);
            return { title: "Token Pac-Man", url: entry.url, status: entry.state.dead ? "Session limit busted" : `${entry.state.credits.toFixed(2)} session credits munched` };
        },
        onClose: async (ctx) => {
            const entry = servers.get(ctx.instanceId);
            if (entry) {
                servers.delete(ctx.instanceId);
                clearInterval(entry.quotaInterval);
                entry.clients.clear();
                await new Promise((resolve) => entry.server.close(resolve));
            }
        },
    })],
});

session.on("assistant.usage", (event) => {
    const nanoAiu = Number(event.data?.copilotUsage?.totalNanoAiu) || 0;
    for (const entry of servers.values()) {
        entry.eventNanoAiu += nanoAiu;
        void syncUsage(entry);
        void syncQuota(entry);
    }
});
