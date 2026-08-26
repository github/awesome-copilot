# Copyright 2026 Fastah Inc.
"""Secure, offline-first HTML dashboard rendered only from validated Analysis IR."""

# Embedded assets are intentionally compact to bound portable dashboard size.
# ruff: noqa: E501

from __future__ import annotations

import base64
import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .geojson_renderer import export_geojson_analysis
from .models import Analysis, McpRowStatus, RdapAssessment, RowKind
from .schema import validate_document

MAPBOX_GL_VERSION = "3.28.1"
MAPBOX_CDN = f"https://api.mapbox.com/mapbox-gl-js/v{MAPBOX_GL_VERSION}"
MAPBOX_STYLE_PATTERN = re.compile(
    r"^(?:mapbox://styles/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+|"
    r"https://api\.mapbox\.com/styles/v1/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+)$"
)
MAPBOX_TOKEN_PATTERN = re.compile(r"^pk\.[A-Za-z0-9._-]{20,}$")
PAGE_SIZE = 100


@dataclass(frozen=True)
class MapboxOptions:
    token: str
    style: str

    def __post_init__(self) -> None:
        if not MAPBOX_TOKEN_PATTERN.fullmatch(self.token):
            raise ValueError("Mapbox token must be a public token beginning with 'pk.'")
        if not MAPBOX_STYLE_PATTERN.fullmatch(self.style):
            raise ValueError("Mapbox style must be a mapbox:// style or api.mapbox.com style URL")


def _design_asset(relative_path: str) -> bytes:
    module = Path(__file__).resolve()
    package_asset = module.parents[2] / "assets" / relative_path
    repository_asset = module.parents[4] / relative_path
    for path in (package_asset, repository_asset):
        if path.is_file():
            return path.read_bytes()
    raise OSError(f"required Design Library asset is unavailable: {relative_path}")


def _data_uri(media_type: str, content: bytes) -> str:
    return f"data:{media_type};base64,{base64.b64encode(content).decode('ascii')}"


def _safe_json(value: Any) -> str:
    serialized = json.dumps(value, ensure_ascii=True, separators=(",", ":"))
    return serialized.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")


def _dashboard_metrics(analysis: Analysis) -> dict[str, Any]:
    data_rows = [row for row in analysis.rows if row.kind == RowKind.DATA]
    families: Counter[str] = Counter()
    prefix_lengths: Counter[str] = Counter()
    granularity: Counter[str] = Counter()
    for row in data_rows:
        if row.prefix and row.prefix.address_family:
            families[row.prefix.address_family.value] += 1
        if row.prefix and row.prefix.canonical and "/" in row.prefix.canonical:
            prefix_lengths[row.prefix.canonical.rsplit("/", 1)[1]] += 1
        location = row.location
        if location and location.city:
            granularity["city"] += 1
        elif location and location.region:
            granularity["region"] += 1
        elif location and location.country and location.country != "ZZ":
            granularity["country"] += 1
        else:
            granularity["none / do not geolocate"] += 1

    mcp = Counter(item.status.value for item in analysis.enrichment.mcp_observations)
    rdap = Counter(item.assessment.value for item in analysis.enrichment.observations)
    return {
        "summary": {
            "dataRows": analysis.statistics.data_rows,
            "validRows": analysis.statistics.valid_rows,
            "invalidRows": analysis.statistics.invalid_rows,
            "findings": len(analysis.findings),
            "relationships": len(analysis.relationships),
            "geographicFeatures": len(export_geojson_analysis(analysis).features),
        },
        "findingCategories": analysis.statistics.finding_counts.model_dump(),
        "severities": analysis.statistics.severity_counts.model_dump(),
        "addressFamilies": dict(sorted(families.items())),
        "prefixLengths": dict(sorted(prefix_lengths.items(), key=lambda item: int(item[0]))),
        "granularity": dict(sorted(granularity.items())),
        "mcpStatuses": {status.value: mcp[status.value] for status in McpRowStatus},
        "rdapAssessments": {
            assessment.value: rdap[assessment.value] for assessment in RdapAssessment
        },
        "relationships": analysis.statistics.relationship_counts.model_dump(),
        "denominators": {
            "findingCategories": len(analysis.findings),
            "severities": len(analysis.findings),
            "addressFamilies": analysis.statistics.data_rows,
            "prefixLengths": analysis.statistics.data_rows,
            "granularity": analysis.statistics.data_rows,
            "mcpStatuses": len(analysis.enrichment.mcp_observations),
            "rdapAssessments": len(analysis.enrichment.observations),
            "relationships": len(analysis.relationships),
        },
    }


CSS = r"""
@font-face{font-family:Sora;src:url(__SORA__) format('truetype');font-weight:100 800;font-style:normal;font-display:swap}
:root{--green-50:#E9F8EF;--green-500:#009245;--green-600:#007D3B;--green-700:#016331;--teal-500:#1FA39E;--gold-500:#FABF30;--orange-500:#F2753C;--red-100:#FCE3E1;--red-500:#E23D30;--red-600:#C22B20;--blue-100:#DCEBFE;--blue-500:#2F73D8;--blue-600:#205CB8;--slate-0:#FFF;--slate-50:#F5F7F9;--slate-100:#EDF0F3;--slate-200:#DFE4E9;--slate-300:#C7CFD7;--slate-400:#9AA6B2;--slate-500:#6B7885;--slate-600:#4C5967;--slate-700:#34404C;--slate-800:#212B35;--slate-900:#131B22;--ink:#0C1512;--color-brand:var(--green-500);--text-strong:var(--slate-900);--text-body:var(--slate-700);--text-muted:var(--slate-500);--text-brand:var(--green-600);--surface-page:var(--slate-50);--surface-card:#FFF;--surface-sunken:var(--slate-100);--border-subtle:var(--slate-200);--border-default:var(--slate-300);--font-display:Sora,"Helvetica Neue",Arial,sans-serif;--font-sans:Inter,"Helvetica Neue",Arial,sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;--radius-sm:6px;--radius-md:10px;--radius-lg:14px;--radius-xl:20px;--radius-pill:999px;--shadow-xs:0 1px 2px rgba(19,27,34,.06);--shadow-sm:0 1px 3px rgba(19,27,34,.08),0 1px 2px rgba(19,27,34,.05);--focus-ring:0 0 0 3px rgba(0,146,69,.35)}
*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:var(--font-sans);font-size:16px;line-height:1.5;color:var(--text-body);background:var(--surface-page);-webkit-font-smoothing:antialiased}a{color:var(--green-600)}a:hover{text-decoration:underline}button,input,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid rgba(0,146,69,.38);outline-offset:2px}.skip{position:absolute;left:12px;top:-60px;background:#fff;padding:10px 14px;z-index:99;border-radius:8px}.skip:focus{top:12px}.top{background:var(--ink);color:#EAF2ED;padding:18px 24px}.top-inner,.container{max-width:1200px;margin:auto}.top-inner{display:flex;align-items:center;justify-content:space-between;gap:24px}.logo{width:142px;height:auto}.top-meta{font:12px var(--font-mono);color:#9DB0A6;text-align:right}.hero{background:linear-gradient(135deg,#0C1512 0%,#0B2C1B 72%,#016331 100%);color:#EAF2ED;padding:54px 24px 72px}.hero h1{font:700 clamp(34px,5vw,58px)/1.08 var(--font-display);letter-spacing:-.03em;margin:8px 0 12px}.hero p{max-width:760px;color:#BFD0C7;font-size:18px}.eyebrow{font:600 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:#5FD3C6}.container{padding:0 24px 64px}.stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-top:-34px}.stat,.card{background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}.stat{padding:18px}.stat-label{font-size:13px;color:var(--text-muted);font-weight:600}.stat-value{font:700 30px var(--font-display);color:var(--text-strong);letter-spacing:-.02em;margin-top:4px}.notice{margin:20px 0;padding:14px 16px;background:#FDF0E7;border-left:4px solid var(--orange-500);border-radius:var(--radius-md)}section{margin-top:46px;scroll-margin-top:16px}h2{font:700 28px/1.15 var(--font-display);letter-spacing:-.02em;color:var(--text-strong);margin:0 0 8px}h3{font:700 18px var(--font-display);color:var(--text-strong);margin:0 0 14px}.section-intro{color:var(--text-muted);margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{padding:22px;min-width:0}.chart{display:grid;gap:10px}.bar-row{display:grid;grid-template-columns:minmax(125px,1.4fr) minmax(100px,3fr) auto;align-items:center;gap:10px;font-size:13px}.bar-label{overflow-wrap:anywhere}.bar-track{height:10px;background:var(--slate-100);border-radius:var(--radius-pill);overflow:hidden}.bar{height:100%;background:var(--green-500);min-width:0}.bar-row:nth-child(3n+2) .bar{background:var(--teal-500)}.bar-row:nth-child(3n+3) .bar{background:var(--gold-500)}.bar-count{font:12px var(--font-mono);color:var(--text-muted);white-space:nowrap}.empty{padding:18px;background:var(--slate-50);border-radius:var(--radius-md);color:var(--text-muted)}.map-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:16px}.map-grid.fallback-only{grid-template-columns:1fr}.map-shell{height:430px;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border-subtle);background:var(--slate-100)}#map{height:100%}.map-status{font-size:14px;padding:10px 12px;background:var(--green-50);border-radius:var(--radius-md);margin-bottom:12px}.geo-list{max-height:370px;overflow:auto}.geo-item{padding:10px 0;border-bottom:1px solid var(--border-subtle)}.geo-item strong{display:block;color:var(--text-strong)}.geo-item span{font-size:13px;color:var(--text-muted)}.toolbar{display:grid;grid-template-columns:minmax(220px,2fr) repeat(2,minmax(150px,1fr));gap:12px;margin-bottom:14px}.field label{display:block;font-size:13px;font-weight:600;color:var(--text-strong);margin-bottom:5px}.field input,.field select{width:100%;height:42px;border:1px solid var(--border-default);background:#fff;border-radius:var(--radius-md);padding:0 12px;color:var(--text-strong)}.table-wrap{overflow:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);background:#fff}table{width:100%;border-collapse:collapse;font-size:14px}caption{text-align:left;padding:12px 14px;font-weight:600;color:var(--text-muted)}th{position:sticky;top:0;background:var(--slate-100);text-align:left;padding:10px 12px;font:600 12px var(--font-sans);text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);z-index:1}td{padding:12px;border-top:1px solid var(--border-subtle);vertical-align:top}code{font-family:var(--font-mono);font-size:.92em;color:var(--slate-800);overflow-wrap:anywhere}.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:var(--radius-pill);background:var(--slate-100);color:var(--slate-700);font-size:12px;font-weight:700}.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--slate-500)}.badge.error{background:var(--red-100);color:var(--red-600)}.badge.error::before{background:var(--red-500)}.badge.warning{background:#FDF0E7;color:#A84419}.badge.warning::before{background:var(--orange-500)}.badge.info,.badge.matched,.badge.consistent{background:var(--green-50);color:var(--green-700)}.badge.info::before,.badge.matched::before,.badge.consistent::before{background:var(--green-500)}details{margin:4px 0}summary{color:var(--green-700);font-weight:700;cursor:pointer}.details{margin-top:8px;padding:10px;background:var(--slate-50);border-radius:var(--radius-md);font-size:13px;min-width:280px}.details dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 10px;margin:0}.details dt{font-weight:700;color:var(--text-muted)}.details dd{margin:0;overflow-wrap:anywhere}.pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}.btns{display:flex;gap:8px;flex-wrap:wrap}.button{border:1px solid var(--border-default);background:#fff;color:var(--text-strong);border-radius:var(--radius-md);padding:9px 13px;font-weight:700}.button.primary{background:var(--green-500);border-color:var(--green-500);color:#fff}.button:disabled{opacity:.45;cursor:not-allowed}.relationship-list{display:grid;gap:8px;max-height:430px;overflow:auto}.relationship{border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:12px}.relationship p{margin:4px 0 0;font-size:13px}.downloads{display:flex;gap:10px;flex-wrap:wrap}.legal{background:var(--blue-100);border-left:4px solid var(--blue-500);padding:14px 16px;border-radius:var(--radius-md)}footer{margin-top:54px;border-top:1px solid var(--border-subtle);padding-top:22px;color:var(--text-muted);font-size:13px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.hidden{display:none!important}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:960px){.stats{grid-template-columns:repeat(3,1fr)}.map-grid{grid-template-columns:1fr}.map-shell{height:360px}}@media(max-width:720px){.stats,.grid{grid-template-columns:1fr 1fr}.toolbar{grid-template-columns:1fr}.hero{padding-top:38px}.top-inner{align-items:flex-start}.top-meta{display:none}.bar-row{grid-template-columns:minmax(105px,1.3fr) minmax(70px,2fr) auto}}@media(max-width:480px){.stats,.grid{grid-template-columns:1fr}.container{padding-left:14px;padding-right:14px}.top,.hero{padding-left:14px;padding-right:14px}.card{padding:16px}td,th{padding:9px}.logo{width:120px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
"""


APP_JS = r"""(() => {
'use strict';
const parse = id => JSON.parse(document.getElementById(id).textContent);
const IR=parse('analysis-data'), METRICS=parse('metrics-data'), GEO=parse('geojson-data'), MAP=parse('mapbox-data');
const byId=id=>document.getElementById(id);
const node=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=String(text);return n;};
const label=s=>String(s).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
function badge(value){const b=node('span','badge '+String(value).toLowerCase(),label(value));return b;}
function renderStats(){const entries=[['Data rows','dataRows'],['Valid rows','validRows'],['Invalid rows','invalidRows'],['Findings','findings'],['Relationships','relationships'],['Map features','geographicFeatures']];const root=byId('summary-stats');for(const [name,key] of entries){const card=node('div','stat');card.append(node('div','stat-label',name),node('div','stat-value',METRICS.summary[key]));root.append(card);}}
function renderBars(id,values,denominator){const root=byId(id);const total=Number(denominator);root.setAttribute('data-denominator',String(total));if(!total){root.append(node('div','empty','No observations in this analysis.'));return;}for(const [name,countValue] of Object.entries(values)){const count=Number(countValue);const row=node('div','bar-row');const nameNode=node('span','bar-label',label(name));const track=node('span','bar-track');track.setAttribute('role','img');track.setAttribute('aria-label',`${label(name)}: ${count} of ${total}`);const bar=node('span','bar');bar.style.width=`${Math.min(100,(count/total)*100)}%`;track.append(bar);row.append(nameNode,track,node('span','bar-count',`${count} / ${total}`));root.append(row);}}
function renderCharts(){const charts=[['finding-categories','findingCategories'],['severity-counts','severities'],['address-families','addressFamilies'],['prefix-lengths','prefixLengths'],['granularity','granularity'],['mcp-statuses','mcpStatuses'],['rdap-assessments','rdapAssessments'],['relationship-counts','relationships']];for(const [id,key] of charts)renderBars(id,METRICS[key],METRICS.denominators[key]);}
const findings=new Map(IR.findings.map(x=>[x.id,x]));const mcp=new Map(IR.enrichment.mcp_observations.map(x=>[x.target_row_id,x]));const rdap=new Map();for(const item of IR.enrichment.observations)for(const rowId of item.target_row_ids){const list=rdap.get(rowId)||[];list.push(item);rdap.set(rowId,list);}const relationships=new Map();for(const item of IR.relationships){for(const rowId of [item.source_row_id,item.target_row_id]){const list=relationships.get(rowId)||[];list.push(item);relationships.set(rowId,list);}}
function highest(row){const levels=row.finding_ids.map(id=>findings.get(id)?.severity);return levels.includes('error')?'error':levels.includes('warning')?'warning':levels.includes('info')?'info':'none';}
function addPair(dl,term,value){dl.append(node('dt','',term),node('dd','',value===null||value===undefined||value===''?'—':value));}
function rowDetails(row){const details=document.createElement('details');details.append(node('summary','','Evidence and values'));const body=node('div','details');const dl=document.createElement('dl');const loc=row.location||{};addPair(dl,'Authored prefix',row.prefix?.raw||'—');addPair(dl,'Canonical prefix',row.prefix?.canonical||'—');addPair(dl,'Authored location',[loc.raw_country,loc.raw_region,loc.raw_city].filter(Boolean).join(' / ')||'—');addPair(dl,'Normalized location',[loc.country,loc.region,loc.city].filter(Boolean).join(' / ')||'—');const obs=mcp.get(row.id);if(obs){addPair(dl,'MCP status',obs.status);addPair(dl,'MCP search mode',obs.search_mode);if(obs.matches[0]){const match=obs.matches[0];addPair(dl,'Advisory best match',`${match.place_name} (${match.place_type})`);addPair(dl,'Approximate radius',`${match.approximate_radius_km} km — extent, not confidence`);addPair(dl,'Population weight',`${match.population_weight_percent}% — ordering weight, not confidence`);}}for(const item of rdap.get(row.id)||[]){addPair(dl,'RDAP assessment',`${item.assessment} — does not prove ownership`);addPair(dl,'RDAP source',[item.rir,item.endpoint].filter(Boolean).join(' · '));addPair(dl,'RDAP basis',item.explanation);}const rowFindings=row.finding_ids.map(id=>findings.get(id)).filter(Boolean);for(const item of rowFindings)addPair(dl,`${item.rule_id} (${item.severity})`,`${item.message} Evidence: ${item.evidence_ids.join(', ')}`);for(const item of relationships.get(row.id)||[])addPair(dl,`Relationship ${item.type}`,`${item.source_row_id} ${item.source_prefix} → ${item.target_row_id} ${item.target_prefix}${item.geolocation_conflict?' · conflicting location':''}`);if(!obs&&!rdap.has(row.id)&&!rowFindings.length&&!relationships.has(row.id))addPair(dl,'Details','No linked findings, enrichment, or relationships.');body.append(dl);details.append(body);return details;}
let page=0;const dataRows=IR.rows.filter(row=>row.kind==='data');
function filteredRows(){const query=byId('row-search').value.trim().toLowerCase();const state=byId('state-filter').value;const severity=byId('severity-filter').value;return dataRows.filter(row=>{const loc=row.location||{};const hay=[row.id,row.prefix?.raw,row.prefix?.canonical,loc.raw_country,loc.raw_region,loc.raw_city,loc.country,loc.region,loc.city,row.state].filter(Boolean).join(' ').toLowerCase();return(!query||hay.includes(query))&&(!state||row.state===state)&&(!severity||highest(row)===severity);});}
function renderRows(){const rows=filteredRows();const pages=Math.max(1,Math.ceil(rows.length/__PAGE_SIZE__));page=Math.min(page,pages-1);const body=byId('row-body');body.replaceChildren();for(const row of rows.slice(page*__PAGE_SIZE__,(page+1)*__PAGE_SIZE__)){const tr=document.createElement('tr');const loc=row.location||{};const values=[row.line_number,row.id,row.prefix?.canonical||row.prefix?.raw||'—',[loc.country,loc.region,loc.city].filter(Boolean).join(' / ')||'—'];for(const value of values)tr.append(node('td','',value));const stateCell=document.createElement('td');stateCell.append(badge(row.state));tr.append(stateCell);const findingCell=document.createElement('td');const severity=highest(row);findingCell.append(severity==='none'?node('span','',String(row.finding_ids.length)):badge(`${severity} · ${row.finding_ids.length}`));tr.append(findingCell);const detailCell=document.createElement('td');detailCell.append(rowDetails(row));tr.append(detailCell);body.append(tr);}byId('row-caption').textContent=`${rows.length} matching data rows · page ${page+1} of ${pages}`;byId('page-status').textContent=`Page ${page+1} of ${pages}`;byId('prev-page').disabled=page===0;byId('next-page').disabled=page>=pages-1;}
function renderRelationships(){const root=byId('relationship-list');if(!IR.relationships.length){root.append(node('div','empty','No prefix relationships.'));return;}for(const item of IR.relationships.slice(0,500)){const card=node('article','relationship');card.append(badge(item.type));card.append(node('p','',`${item.source_row_id} ${item.source_prefix} → ${item.target_row_id} ${item.target_prefix}${item.geolocation_conflict?' · conflicting location':''}`));root.append(card);}if(IR.relationships.length>500)root.append(node('p','',`Showing 500 of ${IR.relationships.length}; use the row table for linked details.`));}
function renderCorrections(){const root=byId('correction-list');const decisions=new Map();for(const approval of IR.corrections.approvals)for(const decision of approval.decisions)decisions.set(decision.proposal_id,decision.action);if(!IR.corrections.proposals.length){root.append(node('div','empty','No correction proposals. Nothing is approved or applied.'));return;}for(const item of IR.corrections.proposals){const card=node('article','relationship');card.append(badge(decisions.get(item.id)||'pending'));card.append(node('p','',`${item.row_id} · ${item.field}: “${item.old_value}” → “${item.proposed_value}” · ${item.confidence}`));card.append(node('p','',`${item.rule_id}: ${item.rationale}`));root.append(card);}}
function renderGeoList(){const points=GEO.features.filter(x=>x.geometry.type==='Point');const root=byId('geo-list');byId('map-status').textContent=MAP.enabled?'Mapbox enhancement configured. The text list remains the accessible fallback.':'Offline map fallback active. Configure Mapbox explicitly to add an interactive map.';if(!points.length){root.append(node('div','empty','No validated MCP coordinates are present. No geometry was invented.'));return;}for(const feature of points.slice(0,100)){const item=node('div','geo-item');item.append(node('strong','',feature.properties.placeName||feature.properties.rowId));item.append(node('span','',`${feature.properties.rowId} · ${feature.properties.prefix} · ${feature.geometry.coordinates.join(', ')}`));root.append(item);}if(points.length>100)root.append(node('p','',`Showing 100 of ${points.length} point features. Download GeoJSON for all features.`));}
function download(name,value,type){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
function initDownloads(){byId('download-json').addEventListener('click',()=>download(`${IR.analysis_id}.json`,IR,'application/json'));byId('download-geojson').addEventListener('click',()=>download(`${IR.analysis_id}.geojson`,GEO,'application/geo+json'));}
function initMap(){const shell=byId('map-shell');const fallback=()=>{shell.classList.add('hidden');shell.parentElement.classList.add('fallback-only');};if(!MAP.enabled||!GEO.features.length){fallback();return;}if(typeof window.mapboxgl==='undefined'){byId('map-status').textContent='Mapbox could not load. The offline geographic list remains available.';fallback();return;}try{window.mapboxgl.accessToken=MAP.token;const map=new window.mapboxgl.Map({container:'map',style:MAP.style,center:[0,20],zoom:1,attributionControl:true,performanceMetricsCollection:false});map.addControl(new window.mapboxgl.NavigationControl(),'top-right');map.on('load',()=>{map.addSource('fastah-evidence',{type:'geojson',data:GEO,attribution:'GeoNames'});map.addLayer({id:'fastah-bounds',type:'fill',source:'fastah-evidence',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#1FA39E','fill-opacity':.16,'fill-outline-color':'#16847F'}});map.addLayer({id:'fastah-points',type:'circle',source:'fastah-evidence',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':7,'circle-color':'#009245','circle-stroke-color':'#fff','circle-stroke-width':2}});const bounds=new window.mapboxgl.LngLatBounds();for(const feature of GEO.features){if(feature.geometry.type==='Point')bounds.extend(feature.geometry.coordinates);else for(const point of feature.geometry.coordinates[0])bounds.extend(point);}if(!bounds.isEmpty())map.fitBounds(bounds,{padding:42,maxZoom:8,duration:0});byId('map-status').textContent='Interactive Mapbox enhancement loaded. Geometry remains advisory GeoNames-derived evidence.';});map.on('error',()=>{byId('map-status').textContent='Mapbox network/style error. The offline geographic list remains complete.';});}catch(_error){byId('map-status').textContent='Mapbox initialization failed. The offline geographic list remains complete.';fallback();}}
function init(){renderStats();renderCharts();renderRelationships();renderCorrections();renderGeoList();renderRows();initDownloads();initMap();for(const id of ['row-search','state-filter','severity-filter'])byId(id).addEventListener('input',()=>{page=0;renderRows();});byId('prev-page').addEventListener('click',()=>{page--;renderRows();});byId('next-page').addEventListener('click',()=>{page++;renderRows();});}
init();
})();"""


def _csp(scripts: list[str], css: str, mapbox: bool) -> str:
    script_sources = [
        f"'sha256-{base64.b64encode(hashlib.sha256(value.encode()).digest()).decode()}'"
        for value in scripts
    ]
    css_digest = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
    style_sources = [f"'sha256-{css_digest}'"]
    connect_sources = ["'none'"]
    img_sources = ["data:"]
    worker_sources = ["'none'"]
    if mapbox:
        script_sources.extend([f"{MAPBOX_CDN}/", "'wasm-unsafe-eval'"])
        style_sources.extend([f"{MAPBOX_CDN}/", "'unsafe-inline'"])
        connect_sources = ["https://api.mapbox.com", "https://events.mapbox.com"]
        img_sources.append("blob:")
        worker_sources = ["blob:"]
    return "; ".join(
        [
            "default-src 'none'",
            f"script-src {' '.join(script_sources)}",
            f"style-src {' '.join(style_sources)}",
            "font-src data:",
            f"img-src {' '.join(img_sources)}",
            f"connect-src {' '.join(connect_sources)}",
            f"worker-src {' '.join(worker_sources)}",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'none'",
            "frame-src 'none'",
        ]
    )


def render_html_analysis(analysis: Analysis, mapbox_options: MapboxOptions | None = None) -> str:
    font_uri = _data_uri(
        "font/ttf", _design_asset("design/assets/fonts/Sora-VariableFont_wght.ttf")
    )
    logo_uri = _data_uri(
        "image/svg+xml", _design_asset("design/assets/logos/fastah-lockup-ondark.svg")
    )
    css = CSS.replace("__SORA__", font_uri)
    script = APP_JS.replace("__PAGE_SIZE__", str(PAGE_SIZE))
    mapbox = mapbox_options is not None
    mapbox_data = (
        {"enabled": True, "token": mapbox_options.token, "style": mapbox_options.style}
        if mapbox_options
        else {"enabled": False, "token": "", "style": ""}
    )
    geojson = export_geojson_analysis(analysis).model_dump(mode="json")
    analysis_json = _safe_json(analysis.model_dump(mode="json"))
    metrics_json = _safe_json(_dashboard_metrics(analysis))
    geojson_json = _safe_json(geojson)
    mapbox_json = _safe_json(mapbox_data)
    mapbox_tags = ""
    if mapbox:
        mapbox_tags = (
            f'<link rel="stylesheet" href="{MAPBOX_CDN}/mapbox-gl.css">'
            f'<script src="{MAPBOX_CDN}/mapbox-gl.js"></script>'
        )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="{"origin" if mapbox else "no-referrer"}"><meta http-equiv="Content-Security-Policy" content="{_csp([analysis_json, metrics_json, geojson_json, mapbox_json, script], css, mapbox)}">
<title>Geofeed quality dashboard · {analysis.analysis_id}</title>{mapbox_tags}<style>{css}</style></head>
<body><a class="skip" href="#main">Skip to dashboard</a><header class="top"><div class="top-inner"><img class="logo" src="{logo_uri}" alt="Fastah"><div class="top-meta">Fastah NetOps Tools<br>{analysis.analysis_id}</div></div></header>
<div class="hero"><div class="top-inner"><div><div class="eyebrow">// tuning-geofeeds analysis</div><h1>Geofeed quality dashboard</h1><p>Validated RFC 8805 findings, prefix relationships, and advisory enrichment evidence. Source values are never silently changed.</p></div></div></div>
<main id="main" class="container"><div id="summary-stats" class="stats" aria-label="Executive summary"></div><div class="notice" role="note"><strong>Interpretation:</strong> MCP matches are advisory. Radius and population weight are not confidence. RDAP consistency does not prove legal ownership. Proposed corrections, when supported, remain separate until explicitly approved.</div>
<section aria-labelledby="breakdowns-title"><h2 id="breakdowns-title">Quality breakdowns</h2><p class="section-intro">Counts use the denominators shown beside each bar; zero-observation charts show an explicit empty state.</p><div class="grid">
<article class="card"><h3>Finding categories</h3><div id="finding-categories" class="chart" aria-label="Findings by category"></div></article><article class="card"><h3>Severity</h3><div id="severity-counts" class="chart" aria-label="Findings by severity"></div></article>
<article class="card"><h3>Address families</h3><div id="address-families" class="chart" aria-label="Rows by address family"></div></article><article class="card"><h3>Prefix lengths</h3><div id="prefix-lengths" class="chart" aria-label="Rows by prefix length"></div></article>
<article class="card"><h3>Geolocation granularity</h3><div id="granularity" class="chart" aria-label="Rows by authored geolocation granularity"></div></article><article class="card"><h3>MCP status</h3><div id="mcp-statuses" class="chart" aria-label="MCP observations by status"></div></article>
<article class="card"><h3>RDAP assessment</h3><div id="rdap-assessments" class="chart" aria-label="RDAP observations by assessment"></div></article><article class="card"><h3>Prefix relationships</h3><div id="relationship-counts" class="chart" aria-label="Prefix relationships by type"></div></article></div></section>
<section aria-labelledby="geography-title"><h2 id="geography-title">Geographic evidence</h2><p class="section-intro">Only coordinates already present in the best MCP match are rendered. No coordinates or boundaries are inferred.</p><div id="map-status" class="map-status" role="status"></div><div class="map-grid"><div id="map-shell" class="map-shell"><div id="map" aria-label="Interactive geographic evidence map"></div></div><aside class="card"><h3>Textual map equivalent</h3><div id="geo-list" class="geo-list"></div></aside></div></section>
<section aria-labelledby="relationships-title"><h2 id="relationships-title">Relationship evidence</h2><p class="section-intro">Duplicate, equal, immediate parent/carved-child, overlap, and conflicting-location edges from the IR.</p><div class="card"><div id="relationship-list" class="relationship-list"></div></div></section>
<section aria-labelledby="corrections-title"><h2 id="corrections-title">Correction proposals</h2><p class="section-intro">This dashboard is review-only and cannot approve or apply a proposal. Pending is the default; only a separate validated approval artifact can record a decision.</p><div class="card"><div id="correction-list" class="relationship-list"></div></div></section>
<section aria-labelledby="rows-title"><h2 id="rows-title">Feed rows</h2><p class="section-intro">Search and filter validated data rows. Details distinguish authored values, normalized values, MCP advice, RDAP evidence, and linked findings.</p><div class="toolbar"><div class="field"><label for="row-search">Search rows</label><input id="row-search" type="search" placeholder="Row ID, prefix, country, region, or city"></div><div class="field"><label for="state-filter">Row state</label><select id="state-filter"><option value="">All states</option><option value="invalid">Invalid</option><option value="valid_unresolved">Valid unresolved</option><option value="valid_do_not_geolocate">Do not geolocate</option><option value="not_applicable">Not applicable</option></select></div><div class="field"><label for="severity-filter">Highest severity</label><select id="severity-filter"><option value="">All severities</option><option value="error">Error</option><option value="warning">Warning</option><option value="info">Info</option><option value="none">No findings</option></select></div></div>
<div class="table-wrap"><table><caption id="row-caption">Data rows</caption><thead><tr><th scope="col">Line</th><th scope="col">Row</th><th scope="col">Prefix</th><th scope="col">Normalized location</th><th scope="col">State</th><th scope="col">Findings</th><th scope="col">Evidence</th></tr></thead><tbody id="row-body"></tbody></table></div><div class="pager"><span id="page-status" aria-live="polite"></span><div class="btns"><button id="prev-page" class="button" type="button">Previous</button><button id="next-page" class="button" type="button">Next</button></div></div></section>
<section aria-labelledby="downloads-title"><h2 id="downloads-title">Downloads</h2><p class="section-intro">Downloads are generated locally from the validated IR embedded in this dashboard.</p><div class="downloads"><button id="download-json" class="button primary" type="button">Download analysis JSON</button><button id="download-geojson" class="button" type="button">Download GeoJSON</button></div></section>
<section class="legal" aria-labelledby="sources-title"><h2 id="sources-title">Data sources and limits</h2><p>Place evidence contains information derived from <a href="https://www.geonames.org/" rel="noreferrer">GeoNames</a>. When enabled, the interactive map uses <a href="https://www.mapbox.com/about/maps/" rel="noreferrer">Mapbox</a> and its on-map attribution. RDAP assessments are consistency observations only and do not establish ownership.</p></section>
<footer><span>Schema {analysis.schema_version} · Source SHA-256 <code>{analysis.source.sha256}</code></span><span>Rendered from validated Analysis IR only.</span></footer></main>
<script id="analysis-data" type="application/json">{analysis_json}</script><script id="metrics-data" type="application/json">{metrics_json}</script><script id="geojson-data" type="application/json">{geojson_json}</script><script id="mapbox-data" type="application/json">{mapbox_json}</script><script>{script}</script></body></html>"""


def render_html_document(document: Any, mapbox_options: MapboxOptions | None = None) -> str:
    validate_document(document)
    analysis = Analysis.model_validate(document)
    return render_html_analysis(analysis, mapbox_options)


def render_html_file(path: Path | str, mapbox_options: MapboxOptions | None = None) -> str:
    document = json.loads(Path(path).read_text(encoding="utf-8"))
    return render_html_document(document, mapbox_options)
