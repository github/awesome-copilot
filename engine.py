from __future__ import annotations

import datetime as dt
import difflib
import gzip
import hashlib
import io
import json
import math
import os
import plistlib
import re
import shutil
import sqlite3
import struct
import tempfile
import threading
import time
import wave
import zipfile
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path, PureWindowsPath

import numpy as np
import soundfile as sf

from ultra_audio import (audio_fingerprint, estimate_tempo, producer_report, silence_markers)
from god_audio import adaptive_similarity

try:
    import pyflp
    # PyFLP 2.2.1's empty EventEnum base trips Python 3.13's stricter Enum call path.
    # Add a private out-of-range sentinel so its documented _missing_ implementation
    # can dispatch real IDs to the format-specific enums. It does not alter FLP data.
    try:
        import importlib
        _event_enum = importlib.import_module('pyflp._events').EventEnum
        if not _event_enum.__members__:
            _sentinel = int.__new__(_event_enum, 256)
            _sentinel._name_, _sentinel._value_ = '_DAWBRIDGE_SENTINEL', 256
            _event_enum._member_names_.append('_DAWBRIDGE_SENTINEL')
            _event_enum._member_map_['_DAWBRIDGE_SENTINEL'] = _sentinel
            _event_enum._value2member_map_[256] = _sentinel
    except Exception:
        pass
except ImportError:
    pyflp = None
try:
    import psutil
except ImportError:
    psutil = None

FORMATS = {'.rpp': 'Reaper', '.flp': 'FL Studio', '.als': 'Ableton Live',
           '.logicx': 'Logic Pro', '.cpr': 'Cubase', '.song': 'Studio One'}
AUDIO = {'.wav', '.aif', '.aiff', '.flac', '.mp3', '.ogg', '.m4a', '.opus'}
MAX_PROJECT = 32 * 1024 * 1024
MAX_SCAN_FILES = 50_000
MAX_AUDIO_SECONDS = 1800
MAX_XML_MEMBERS = 256
MAX_XML_TOTAL = 128 * 1024 * 1024
FINGERPRINT_BINS = 48
DAW_PROCESSES = {'.rpp': ('reaper',), '.flp': ('fl studio', 'fl64.exe', 'fl.exe'),
                 '.als': ('ableton live',), '.cpr': ('cubase', 'nuendo'),
                 '.song': ('studio one',), '.logicx': ('logic pro', 'logic pro x')}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()


def safe(root: Path, path: Path) -> Path:
    resolved = Path(path).resolve()
    resolved.relative_to(Path(root).resolve())
    return resolved


def read_project(path: Path) -> bytes:
    if path.stat().st_size > MAX_PROJECT: raise ValueError(f'Projekt przekracza limit {MAX_PROJECT // 1024 // 1024} MB.')
    return path.read_bytes()


def file_key(path: Path) -> str: return os.path.normcase(str(path))


def basename_ref(value: str) -> str: return PureWindowsPath(str(value).replace('/', '\\')).name


def xml_guard(raw: bytes) -> None:
    if b'<!DOCTYPE' in raw[:MAX_PROJECT].upper() or b'<!ENTITY' in raw[:MAX_PROJECT].upper():
        raise ValueError('XML z DTD/ENTITY jest odrzucany.')
    if len(raw) > MAX_XML_TOTAL: raise ValueError('XML przekracza limit.')


def local_tag(tag: str) -> str: return str(tag).split('}')[-1].split(':')[-1]


def num(value):
    try:
        if value is None: return None
        result = float(value) if isinstance(value, (int, float)) else float(str(value).strip().replace(',', '.'))
        return result if math.isfinite(result) else None
    except (TypeError, ValueError): return None


def attr_ci(el: ET.Element, names):
    wanted = {n.casefold() for n in names}
    for key, value in el.attrib.items():
        if local_tag(key).casefold() in wanted: return value
    return None


def value_of(el: ET.Element):
    return attr_ci(el, ('value', 'name', 'text', 'displayname', 'effectivename', 'username')) or (el.text or '').strip() or None


def children_map(root):
    parents = {}
    for parent in root.iter():
        for child in parent: parents[child] = parent
    return parents


def ancestors(node, parents, limit=32):
    out = []
    while node in parents and len(out) < limit:
        node = parents[node]; out.append(node)
    return out


def plugin_strings(raw: bytes, max_items=100):
    text = raw.decode('latin1', errors='ignore')
    patterns = [r'(?im)^\s*<(?:VST3?|AU|LV2|CLAP|JS|PLUGIN|FX|EFFECT)[^\r\n]*',
                r'(?i)(?:PluginName|Plugin|VstName|EffectName|InstrumentName)[^\x00\r\n]{0,4}[\x00\s:=]+([^\x00\r\n]{2,100})']
    found = []
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            s = match.group(0).strip().lstrip('<').strip()
            s = re.sub(r'^[A-Z0-9_]+\s*', '', s, flags=re.I).strip(' "\t').split('\x00', 1)[0].strip(' "\t')
            if 2 <= len(s) <= 100 and not s.startswith(('PLUGINID', 'FXID')) and s not in found:
                found.append(s)
                if len(found) >= max_items: return found
    return found


def parse_rpp(raw: bytes):
    text = raw.decode('utf-8', errors='surrogateescape')
    stack, refs, tracks, markers, regions, plugins, routing = [], [], [], [], [], [], []
    active_track = None; active_item = None; pending_source = None
    tempo, signature = None, None
    for line in text.splitlines(keepends=True):
        s = line.strip()
        if s.startswith('<'):
            tag = s.split()[0][1:]; stack.append(tag)
            if tag == 'TRACK':
                active_track = len(tracks)
                tracks.append({'name': f'Track {len(tracks)+1}', 'kind': 'audio', 'plugins': [], 'regions': [], 'refs': [], 'routing': []})
            elif tag == 'ITEM' and active_track is not None:
                active_item = {'track': active_track, 'start': 0.0, 'length': None, 'unit': 'seconds', 'source': None, 'offset': 0.0}
            elif tag == 'SOURCE' and active_item is not None: pending_source = active_item
            m = re.match(r'<(?:VST3?|AU|JS|CLAP|LV2|VIDEO_EFFECT)\s+"([^"]+)', s, re.I)
            if m and active_track is not None:
                name = m.group(1).strip()
                if name and name not in tracks[active_track]['plugins']: tracks[active_track]['plugins'].append(name)
        elif s == '>':
            if stack:
                closing = stack.pop()
                if closing == 'SOURCE': pending_source = None
                elif closing == 'ITEM' and active_item is not None:
                    if active_item.get('source'):
                        idx = len(refs)
                        refs.append({'path': active_item['source'], 'track': active_item['track'],
                                     'region': len(regions) if active_item.get('length') else None})
                        tracks[active_item['track']]['refs'].append(idx)
                        if active_item.get('length') is not None and active_item['length'] > 0:
                            regions.append({'track': active_item['track'], 'name': tracks[active_item['track']]['name'],
                                            'start': active_item['start'], 'length': active_item['length'], 'unit': 'seconds',
                                            'sourceOffset': active_item['offset'], 'ref': idx, 'muted': False})
                    active_item = None
                elif closing == 'TRACK': active_track = None
        elif stack and stack[-1] == 'TRACK' and s.startswith('NAME ') and active_track is not None:
            tracks[active_track]['name'] = s[5:].strip().strip('"') or f'Track {active_track+1}'
        elif stack and stack[-1] == 'TRACK' and s.startswith('ISBUS ') and active_track is not None:
            parts = s.split()
            folder_depth = num(parts[1]) if len(parts) > 1 else None
            tracks[active_track]['isBus'] = bool(folder_depth and folder_depth > 0)
            if folder_depth and folder_depth > 0:
                tracks[active_track]['kind'] = 'folder-bus'
        elif stack and stack[-1] == 'SOURCE':
            m = re.match(r'\s*FILE\s+("[^"\r\n]*"|[^\s]+)', line)
            if m and pending_source is not None: pending_source['source'] = m.group(1).strip('"')
        elif active_item is not None and 'ITEM' in stack:
            if s.startswith('POSITION '): active_item['start'] = num(s.split(None, 1)[1]) or 0.0
            elif s.startswith('LENGTH '): active_item['length'] = num(s.split(None, 1)[1])
            elif s.startswith('SOFFS '): active_item['offset'] = num(s.split(None, 1)[1]) or 0.0
        if active_track is not None and s.startswith('AUXRECV '):
            parts=s.split()
            if len(parts)>=2:
                source=num(parts[1])
                if source is not None:
                    route={'sourceTrack':int(source),'targetTrack':active_track,'type':'aux-receive','confidence':'RPP parsed'}
                    routing.append(route);tracks[active_track]['routing'].append(route)
        if stack == ['REAPER_PROJECT']:
            if s.startswith('TEMPO '):
                parts = s.split(); tempo = num(parts[1]) if len(parts) > 1 else tempo
                if len(parts) >= 4: signature = [int(num(parts[2]) or 4), int(num(parts[3]) or 4)]
            elif s.startswith(('MARKER ', 'REGION ')):
                pat = re.match(r'(MARKER|REGION)\s+(\S+)\s+(\S+)\s+("[^"]*"|\S+)(.*)', s)
                if pat:
                    markers.append({'name': pat.group(4).strip('"'), 'position': num(pat.group(3)), 'unit': 'seconds',
                                    'type': 'marker' if pat.group(1) == 'MARKER' else 'region'})
    return {'tracks': tracks, 'refs': refs, 'markers': markers, 'regions': regions, 'tempoBpm': tempo,
            'timeSignature': signature, 'plugins': plugins, 'routing': routing, 'parser': 'RPP text'}


def _xml_tracks(root, default_unit='beats'):
    parents = children_map(root); tracks, refs, regions, markers, plugins = [], [], [], [], []
    track_tags = {'audiotrack', 'miditrack', 'grouptrack', 'instrumenttrack', 'mediatrack', 'foldertrack', 'returntrack'}
    track_nodes = [node for node in root.iter() if local_tag(node.tag).casefold() in track_tags or
                   (local_tag(node.tag).casefold().endswith('track') and local_tag(node.tag).casefold() not in {'mastertrack','markertrack','tempotrack'})]
    track_by_node = {node: i for i, node in enumerate(track_nodes)}
    for i, node in enumerate(track_nodes):
        name = attr_ci(node, ('name', 'title', 'displayName'))
        if not name:
            for child in node.iter():
                if local_tag(child.tag).casefold() in {'name', 'effectivename', 'username'}:
                    name = value_of(child)
                    if name: break
        tracks.append({'name': name or f'Track {i+1}', 'kind': local_tag(node.tag).replace('Track','').lower() or 'track',
                       'plugins': [], 'regions': [], 'refs': [], 'routing': []})
    def parent_track(node):
        if node in track_by_node: return track_by_node[node]
        for parent in ancestors(node, parents):
            if parent in track_by_node: return track_by_node[parent]
        return None
    tempo, signature, tempo_map = None, None, []
    routing = []
    if node_tempo := num(attr_ci(root, ('tempo',))):
        if 20 <= node_tempo <= 400: tempo = node_tempo
    for node in root.iter():
        tag = local_tag(node.tag).casefold()
        if 'tempo' in tag:
            value = num(attr_ci(node, ('value', 'tempo', 'bpm')) or (node.text or '').strip())
            if value and 20 <= value <= 400:
                pos = num(attr_ci(node, ('position', 'time', 'start', 'beat')))
                if pos is None: tempo = tempo or value
                else: tempo_map.append({'position': pos, 'bpm': value, 'unit': default_unit})
        if 'timesignature' in tag or tag in {'signature','meter'}:
            n = num(attr_ci(node, ('numerator','num','beats'))); d = num(attr_ci(node, ('denominator','den','beatunit')))
            if n and d and signature is None: signature = [int(n), int(d)]
        if 'marker' in tag or 'locator' in tag or 'arrangersection' in tag:
            if tag in {'markertrack','markertrackevent'}: continue
            name = attr_ci(node, ('name','title','label'))
            pos = num(attr_ci(node, ('position','time','start','starttime','barposition')))
            if pos is None:
                for c in node:
                    ctag = local_tag(c.tag).casefold()
                    if ctag in {'time','position','start'}: pos = num(attr_ci(c, ('value',)) or c.text)
                    elif ctag in {'name','label'}: name = name or value_of(c)
            if name or pos is not None: markers.append({'name': name or 'Marker', 'position': pos or 0.0, 'unit': default_unit, 'type': 'marker'})
        if any(token in tag for token in ('plugin','vst','effect','insert','instrument')):
            pname = attr_ci(node, ('pluginName','name','displayName','className','id')) or value_of(node)
            if pname and len(str(pname)) < 160:
                ti = parent_track(node); entry = {'name': str(pname), 'confidence': 'xml-structure'}
                if ti is None: plugins.append(entry)
                elif entry not in tracks[ti]['plugins']: tracks[ti]['plugins'].append(entry)
    for node in root.iter():
        tag = local_tag(node.tag).casefold()
        if any(token in tag for token in ('send', 'routing', 'route', 'bus', 'output')):
            ti = parent_track(node)
            target = attr_ci(node, ('target','destination','bus','track','sendto','output','channel'))
            if target and ti is not None:
                entry={'track':ti,'target':str(target)[:200],'type':tag,'confidence':'XML heuristic'}
                routing.append(entry);tracks[ti]['routing'].append(entry)
        vals = [attr_ci(node, ('path','filepath','url','filename','mediafile','sourcefile'))]
        if tag in {'path','filepath','filename','mediafile','sourcefile','url'}: vals.append(value_of(node))
        for value in vals:
            if not value or len(str(value)) > 2048: continue
            value = str(value).strip()
            if Path(value.replace('\\','/')).suffix.casefold() not in AUDIO: continue
            ti = parent_track(node); index = len(refs); refs.append({'path': value, 'track': ti})
            if ti is not None: tracks[ti]['refs'].append(index)
    for node in root.iter():
        tag = local_tag(node.tag).casefold()
        if not any(token in tag for token in ('clip','event','region','part')) or any(t in tag for t in ('eventlist','eventfolder','regionlist')): continue
        ti = parent_track(node)
        if ti is None: continue
        start = num(attr_ci(node, ('start','position','time','starttime','barposition')))
        length = num(attr_ci(node, ('length','duration','endtime')))
        if start is None and length is None: continue
        if length is None:
            end = num(attr_ci(node, ('end','endtime')))
            if end is not None and start is not None: length = max(0.0, end-start)
        if not length or length <= 0: continue
        name = attr_ci(node, ('name','title','label')) or f"{tracks[ti]['name']} region"
        region = {'track': ti, 'name': str(name), 'start': start or 0.0, 'length': length, 'unit': default_unit,
                  'ref': None, 'muted': str(attr_ci(node, ('muted','mute')) or '').lower() in {'1','true','yes'}}
        for child in node.iter():
            ctag = local_tag(child.tag).casefold()
            if ctag in {'path','filepath','filename','mediafile','sourcefile','file','sample'}:
                path = attr_ci(child, ('path','filepath','filename','sourcefile')) or value_of(child)
                if path and Path(str(path).replace('\\','/')).suffix.casefold() in AUDIO:
                    ref = next((i for i,r in enumerate(refs) if r['path']==path and r.get('track')==ti), None)
                    if ref is None: ref=len(refs); refs.append({'path':str(path),'track':ti}); tracks[ti]['refs'].append(ref)
                    region['ref']=ref; break
        regions.append(region); tracks[ti]['regions'].append(len(regions)-1)
    return {'tracks': tracks, 'refs': refs, 'regions': regions, 'markers': markers, 'tempoBpm': tempo,
            'tempoMap': tempo_map, 'timeSignature': signature, 'plugins': plugins, 'routing': routing}


def parse_als(raw: bytes):
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream: xml = stream.read(MAX_PROJECT+1)
        if len(xml) > MAX_PROJECT: raise ValueError('Rozpakowany ALS przekracza limit 32 MB.')
    except (OSError, EOFError): xml = raw
    xml_guard(xml); root = ET.fromstring(xml); result = _xml_tracks(root, 'beats')
    parents = children_map(root); refs, regions = [], []; tracks = result['tracks']
    for track in tracks: track['refs'] = []; track['regions'] = []
    track_nodes = [n for n in root.iter() if local_tag(n.tag).casefold() in {'audiotrack','miditrack','grouptrack'}]
    node_to_idx = {n:i for i,n in enumerate(track_nodes)}
    def parent_track(node):
        if node in node_to_idx: return node_to_idx[node]
        for parent in ancestors(node, parents):
            if parent in node_to_idx: return node_to_idx[parent]
        return None
    def val(node, names):
        wanted={n.casefold() for n in names}
        for child in node.iter():
            if local_tag(child.tag).casefold() in wanted:
                value=attr_ci(child, ('value',)) or (child.text or '').strip()
                if value: return value
        return None
    for file_ref in (n for n in root.iter() if local_tag(n.tag).casefold()=='fileref'):
        path=None
        for child in file_ref.iter():
            if local_tag(child.tag).casefold() in {'path','relativepath','absolutepath'}:
                path=attr_ci(child, ('value',)) or (child.text or '').strip()
                if path: break
        if path:
            ti=parent_track(file_ref); idx=len(refs); refs.append({'path':str(path),'track':ti})
            if ti is not None: tracks[ti]['refs'].append(idx)
    for ti,node in enumerate(track_nodes):
        nn=next((n for n in node.iter() if local_tag(n.tag).casefold() in {'effectivename','username'}),None)
        if nn is not None: tracks[ti]['name']=attr_ci(nn, ('value',)) or value_of(nn) or tracks[ti]['name']
    for clip in (n for n in root.iter() if local_tag(n.tag).casefold() in {'audioclip','midiclip','audioevent','midievent'}):
        ti=parent_track(clip)
        if ti is None: continue
        start=num(val(clip,('CurrentStart','Time','Start','Position'))); end=num(val(clip,('CurrentEnd','End')))
        length=num(val(clip,('CurrentLength','Length','Duration')))
        if length is None and start is not None and end is not None: length=end-start
        if start is None and length is None: continue
        name=val(clip,('EffectiveName','UserName','Name')) or tracks[ti]['name']; ref_index=None
        for child in clip.iter():
            if local_tag(child.tag).casefold()=='fileref':
                path=next((attr_ci(c,('value',)) or (c.text or '').strip() for c in child.iter()
                           if local_tag(c.tag).casefold() in {'path','relativepath','absolutepath'}),None)
                if path:
                    ref_index=next((i for i,r in enumerate(refs) if r['path']==path and r.get('track')==ti),None)
                    if ref_index is None: ref_index=len(refs); refs.append({'path':path,'track':ti}); tracks[ti]['refs'].append(ref_index)
                    break
        region={'track':ti,'name':str(name),'start':start or 0.0,'length':max(0,length or 0),'unit':'beats','ref':ref_index,
                'muted':(val(clip,('IsAudioClip','Muted')) or '').lower() in {'true','1'}}
        if region['length']>0: regions.append(region); tracks[ti]['regions'].append(len(regions)-1)
    result.update(refs=refs,regions=regions)
    locators=[]
    for node in root.iter():
        if local_tag(node.tag).casefold()!='locator': continue
        name=val(node,('Name','UserName')) or attr_ci(node,('name',)); pos=num(val(node,('Time','Position')))
        if name or pos is not None: locators.append({'name':str(name or 'Locator'),'position':pos or 0.0,'unit':'beats','type':'marker'})
    if locators: result['markers']=locators
    for node in root.iter():
        if local_tag(node.tag).casefold()=='tempo':
            value=None
            for child in node.iter():
                if local_tag(child.tag).casefold()=='manual': value=num(attr_ci(child,('value',)))
            if value and 20<=value<=400: result['tempoBpm']=value; break
    result['parser']='Ableton gzip/XML (częściowe pola strukturalne)'; result['partial']=True
    return result


def parse_studio_one(path: Path):
    if path.stat().st_size > MAX_PROJECT: raise ValueError('Projekt .song przekracza limit pliku 32 MB.')
    if not zipfile.is_zipfile(path): raise ValueError('Studio One .song nie jest poprawnym archiwum ZIP/XML.')
    candidates=[]
    with zipfile.ZipFile(path) as archive:
        infos=[i for i in archive.infolist() if not i.is_dir() and i.filename.lower().endswith(('.xml','.song'))]
        if len(infos)>MAX_XML_MEMBERS or sum(i.file_size for i in infos)>MAX_XML_TOTAL: raise ValueError('Archiwum .song przekracza limity parsera.')
        for info in sorted(infos,key=lambda i:(0 if 'document' in i.filename.casefold() else 1,i.filename.casefold())):
            if info.file_size>MAX_PROJECT: continue
            with archive.open(info) as member: raw=member.read(MAX_PROJECT+1)
            if len(raw)>MAX_PROJECT: raise ValueError('Element XML w .song przekracza limit 32 MB.')
            xml_guard(raw)
            try: root=ET.fromstring(raw)
            except ET.ParseError: continue
            parsed=_xml_tracks(root,'beats'); score=len(parsed['tracks'])*4+len(parsed['regions'])*2+len(parsed['refs'])+len(parsed['markers'])
            candidates.append((score,info.filename,parsed))
    if not candidates: raise ValueError('Nie znaleziono parsowalnego XML w archiwum Studio One .song.')
    score,part,result=max(candidates,key=lambda x:(x[0],'document' in x[1].casefold()))
    result.update(parser='Studio One .song ZIP/XML (strukturalne pola timeline; schema/version dependent)',
                  xmlParts=[name for _,name,_ in candidates],selectedXml=part,partial=True)
    return result


def parse_cpr(raw: bytes):
    candidates=[raw]
    try:
        import zlib
        for offset in (0,4,8,12,16,20,24,32):
            try:
                dec=zlib.decompressobj(); payload=dec.decompress(raw[offset:],MAX_PROJECT+1)
                if len(payload)<=MAX_PROJECT and dec.eof: candidates.append(payload)
            except zlib.error: continue
    except ImportError: pass
    tree=None
    for candidate in candidates:
        stripped=candidate.lstrip(b'\xef\xbb\xbf\x00\r\n\t ')
        if not stripped.startswith((b'<?xml',b'<Project',b'<project',b'<Cubase')): continue
        try: xml_guard(stripped); tree=ET.fromstring(stripped); break
        except (ET.ParseError,ValueError): continue
    if tree is not None:
        result=_xml_tracks(tree,'beats'); result.update(parser='CPR: czytelny XML snapshot (nie typowy binarny CPR)',cprXml=True,partial=True)
        return result
    strings=re.findall(rb'[ -~]{5,100}',raw); visible=[]
    for item in strings:
        text=item.decode('latin1','ignore').strip()
        if re.search(r'\.(?:wav|aif|aiff|flac|mp3|ogg|m4a)$',text,re.I): visible.append({'path':text,'track':None})
    plugins=[{'name':s.decode('latin1','ignore').strip(),'confidence':'binary-string heuristic'}
             for s in strings if re.search(rb'(?:VST|Plugin|AudioUnit|AUComponent)',s,re.I)][:100]
    return {'tracks':[],'refs':visible,'regions':[],'markers':[],'tempoBpm':None,'timeSignature':None,'tempoMap':[],
            'plugins':plugins,'parser':'CPR opaque binary: bounded path/plugin string scan only','partial':True}


def parse_flp(path: Path):
    if pyflp is None: raise ValueError('Brak PyFLP. Zainstaluj requirements.txt.')
    project=pyflp.parse(str(path)); tempo=num(getattr(project,'tempo',None)); ppq=int(getattr(project,'ppq',96) or 96)
    channel_by_iid,channel_rows={},[]
    try: channels=list(project.channels)
    except Exception: channels=[]
    for channel in channels[:2000]:
        name=getattr(channel,'display_name',None) or getattr(channel,'name',None) or getattr(channel,'internal_name',None) or 'FL Channel'
        kind=type(channel).__name__; sample=getattr(channel,'sample_path',None); plugin=getattr(channel,'plugin',None); plug=[]
        if plugin is not None: plug.append({'name':str(getattr(plugin,'name',None) or getattr(plugin,'id',None) or type(plugin).__name__),'confidence':'PyFLP model'})
        row={'name':str(name),'kind':kind,'plugins':plug,'regions':[],'refs':[],'iid':getattr(channel,'iid',None)}
        channel_rows.append(row)
        if row['iid'] is not None: channel_by_iid[row['iid']]=(channel,row)
        if sample: row['_samplePath']=str(sample)
    tracks,refs,regions,markers,plugin_list=[],[],[],[],[]
    try: arrangements=list(project.arrangements)
    except Exception: arrangements=[]
    arrangement=getattr(getattr(project,'arrangements',None),'current',None) or (arrangements[0] if arrangements else None)
    if arrangement is not None:
        try:
            for playlist_track in arrangement.tracks:
                row={'name':str(getattr(playlist_track,'name',None) or f'Playlist {len(tracks)+1}'),'kind':'playlist','plugins':[],'regions':[],'refs':[]}
                tracks.append(row)
                try: items=list(playlist_track)
                except Exception: items=[]
                for item in items:
                    ch=getattr(item,'channel',None); sample=getattr(ch,'sample_path',None) if ch is not None else None
                    ch_name=getattr(ch,'name',None) if ch is not None else None
                    if sample:
                        idx=len(refs); refs.append({'path':str(sample),'track':len(tracks)-1}); row['refs'].append(idx)
                        pos=num(getattr(item,'position',0)) or 0.0; length=num(getattr(item,'length',0)) or 0.0
                        regions.append({'track':len(tracks)-1,'name':str(ch_name or row['name']),'start':pos/ppq,'length':length/ppq,
                                        'unit':'beats','sourceOffset':0.0,'ref':idx,'muted':bool(getattr(item,'muted',False))})
                        row['regions'].append(len(regions)-1)
                    else:
                        pattern=getattr(item,'pattern',None)
                        if pattern is not None:
                            row['kind']='midi/pattern'; pos=num(getattr(item,'position',0)) or 0.0; length=num(getattr(item,'length',0)) or 0.0
                            regions.append({'track':len(tracks)-1,'name':str(getattr(pattern,'name',None) or row['name']),'start':pos/ppq,
                                            'length':length/ppq,'unit':'beats','ref':None,'muted':bool(getattr(item,'muted',False))})
                            row['regions'].append(len(regions)-1)
            for marker in arrangement.timemarkers:
                pos=num(getattr(marker,'position',None))
                if pos is not None: markers.append({'name':str(getattr(marker,'name',None) or 'Marker'),'position':pos/ppq,'unit':'beats',
                                                    'type':str(getattr(getattr(marker,'type',None),'name','marker'))})
        except Exception: pass
    represented={r['path'] for r in refs}
    for row in channel_rows:
        sp=row.pop('_samplePath',None)
        if sp and sp not in represented:
            idx=len(refs); refs.append({'path':sp,'track':len(tracks)}); row['refs'].append(idx); tracks.append(row)
        plugin_list.extend(row['plugins'])
    if not tracks: tracks=[{k:v for k,v in row.items() if not k.startswith('_')} for row in channel_rows]
    try:
        for plugin in getattr(project,'mixer',[]):
            pname=getattr(plugin,'name',None) or getattr(plugin,'plugin',None)
            if pname: plugin_list.append({'name':str(pname),'confidence':'PyFLP model'})
    except Exception: pass
    return {'tracks':tracks,'refs':refs,'regions':regions,'markers':markers,'tempoBpm':tempo,'timeSignature':None,'tempoMap':[],
            'plugins':plugin_list,'ppq':ppq,'parser':'PyFLP 2.2 binary event parser (version/plugin coverage is upstream-dependent)',
            'partial':True,'_pyflpProject':project}


def parse_logicx(path: Path):
    meta,pdata={},[]; seen_files=0
    for base,dirs,names in os.walk(path,followlinks=False):
        dirs[:]=[d for d in dirs if not (Path(base)/d).is_symlink()]
        for name in names:
            p=Path(base)/name
            if p.is_symlink() or not p.is_file(): continue
            seen_files+=1
            if seen_files>MAX_SCAN_FILES: raise ValueError('Logic bundle przekracza limit 50 000 plików.')
            if p.name.casefold() in {'metadata.plist','projectinformation.plist'} and p.stat().st_size<=MAX_PROJECT:
                try:
                    with p.open('rb') as f: meta[p.name]=plistlib.load(f)
                except Exception: pass
            if p.name=='ProjectData' and p.stat().st_size<=MAX_PROJECT: pdata.append(p.read_bytes())
    flattened=[]
    def walk(value,prefix=''):
        if isinstance(value,dict):
            for k,v in value.items(): key=str(k);flattened.append((key.casefold(),v));walk(v,prefix+'/'+key)
        elif isinstance(value,(list,tuple)):
            for v in value: walk(v,prefix)
    for value in meta.values(): walk(value)
    tempo=None;signature=None
    for key,value in flattened:
        if 'tempo' in key:
            n=num(value)
            if n and 20<=n<=400: tempo=n;break
    for key,value in flattened:
        if 'time' in key and 'signature' in key and isinstance(value,(list,tuple)) and len(value)>=2:
            n,d=num(value[0]),num(value[1])
            if n and d: signature=[int(n),int(d)];break
    refs,plugins,tracks,markers,regions=[],[],[],[],[]
    for raw in pdata:
        for match in re.findall(rb'[ -~]{5,240}',raw):
            s=match.decode('latin1','ignore').strip().strip('\x00')
            if re.search(r'\.(?:wav|aif|aiff|flac|mp3|ogg|m4a)$',s,re.I): refs.append({'path':s.replace('\\','/'),'track':None})
            if re.search(r'(?:AUAudioUnit|AudioUnit|VST|Plugin|Instrument)',s,re.I) and len(s)<160:
                plugins.append({'name':s,'confidence':'ProjectData string heuristic'})
    unique_refs,seen=[],set()
    for r in refs:
        if r['path'] not in seen: seen.add(r['path']);unique_refs.append(r)
    unique_plugins,seen=[],set()
    for p in plugins:
        if p['name'] not in seen: seen.add(p['name']);unique_plugins.append(p)
    media_dir=path/'Media'
    if media_dir.is_dir():
        for base,dirs,names in os.walk(media_dir,followlinks=False):
            dirs[:]=[d for d in dirs if not (Path(base)/d).is_symlink()]
            for name in names:
                f=Path(base)/name
                if f.is_file() and not f.is_symlink() and f.suffix.lower() in AUDIO:
                    rel=f.relative_to(path).as_posix()
                    if rel not in seen: unique_refs.append({'path':rel,'track':None});seen.add(rel)
    return {'tracks':tracks,'refs':unique_refs,'regions':regions,'markers':markers,'tempoBpm':tempo,'timeSignature':signature,
            'tempoMap':[],'plugins':unique_plugins,'parser':'Logic bundle: plist metadata + bounded ProjectData string/chunk hints (read-only)',
            'partial':True,'metadataFiles':list(meta)}


class Cache:
    def __init__(self, root: Path):
        folder=root/'.dawbridge';folder.mkdir(parents=True,exist_ok=True)
        self.db=sqlite3.connect(folder/'cache.sqlite3',timeout=20,check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=NORMAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY,size INTEGER,mtime INTEGER,sha TEXT,audio TEXT,fp TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS ref_signatures (project TEXT,ref TEXT,signature TEXT,updated TEXT,PRIMARY KEY(project,ref))')
        self.db.commit();self.lock=threading.RLock();self.stats={'hits':0,'misses':0,'writes':0}

    def file(self,p:Path):
        st=p.stat();key=file_key(p)
        with self.lock: row=self.db.execute('SELECT size,mtime,sha,audio,fp FROM files WHERE path=?',(key,)).fetchone()
        if row and row[0]==st.st_size and row[1]==st.st_mtime_ns:
            with self.lock:self.stats['hits']+=1
            return {'sha256':row[2],'audio':json.loads(row[3]) if row[3] else None,'fingerprint':json.loads(row[4]) if row[4] else None,'size':st.st_size,'mtime':st.st_mtime_ns}
        with self.lock:self.stats['misses']+=1
        return {'sha256':None,'audio':None,'fingerprint':None,'size':st.st_size,'mtime':st.st_mtime_ns}

    def put_file(self,p:Path,sha=None,audio=None,fp=None):
        st=p.stat();key=file_key(p)
        with self.lock:
            old=self.db.execute('SELECT sha,audio,fp,size,mtime FROM files WHERE path=?',(key,)).fetchone()
            if old and (old[3]!=st.st_size or old[4]!=st.st_mtime_ns): old=None
            values=(key,st.st_size,st.st_mtime_ns,sha if sha is not None else (old[0] if old else None),
                    json.dumps(audio,separators=(',',':')) if audio is not None else (old[1] if old else None),
                    json.dumps(fp,separators=(',',':')) if fp is not None else (old[2] if old else None))
            self.db.execute('INSERT OR REPLACE INTO files VALUES(?,?,?,?,?,?)',values);self.db.commit();self.stats['writes']+=1

    def get_ref(self,project:str,ref:str):
        with self.lock: row=self.db.execute('SELECT signature FROM ref_signatures WHERE project=? AND ref=?',(project,ref)).fetchone()
        return json.loads(row[0]) if row else None

    def put_ref(self,project:str,ref:str,signature):
        with self.lock:
            self.db.execute('INSERT OR REPLACE INTO ref_signatures VALUES(?,?,?,?)',
                            (project,ref,json.dumps(signature,separators=(',',':')),dt.datetime.now().isoformat()));self.db.commit()

    def refs_by_basename(self,basename:str):
        with self.lock: rows=self.db.execute('SELECT project,ref,signature FROM ref_signatures').fetchall()
        target=basename.casefold()
        return [(project,ref,json.loads(signature)) for project,ref,signature in rows if basename_ref(ref).casefold()==target]

    def close(self):
        with self.lock: self.db.close()


class Engine:
    def __init__(self,root,watch=False):
        self.root=Path(root).resolve()
        if not self.root.is_dir(): raise ValueError('Folder roboczy nie istnieje.')
        self.cache=Cache(self.root);self.state={};self.projects={};self.audio=[];self.files=[]
        self._perf_lock=threading.Lock();self._perf={'bytesHashed':0,'hashesComputed':0,'audioAnalyses':0,'lastScanSeconds':None}
        self._watch_stop=threading.Event();self._watch_thread=None;self._watch_interval=4.0
        self._watch_state={'enabled':False,'lastPoll':None,'files':0,'dirtyProjects':[],'changes':0}
        self._watch_snapshot_data={};self.watch_conflicts=set();self._snapshots=[];self._watch_pending={};self._watch_auto_lock=threading.Lock()
        self._event_lock=threading.Lock();self._events=[];self._event_id=0
        monitor=self.root/'.dawbridge'/'monitor.jsonl'
        if monitor.exists():
            for line in monitor.read_text(encoding='utf-8',errors='replace').splitlines()[-200:]:
                try: event=json.loads(line);self._events.append(event);self._event_id=max(self._event_id,int(event.get('id',0)))
                except (json.JSONDecodeError,TypeError,ValueError): continue
        self.downloads={}
        self._load_snapshots()
        if watch:self.start_watcher()

    def emit(self,level,action,message,**extra):
        with self._event_lock:
            self._event_id+=1;item={'id':self._event_id,'time':dt.datetime.now().isoformat(timespec='seconds'),
                                    'level':level,'action':action,'message':str(message)[:1000],**extra}
            self._events.append(item);self._events=self._events[-300:]
        try:
            with open(self.root/'.dawbridge'/'monitor.jsonl','a',encoding='utf-8') as f: f.write(json.dumps(item,ensure_ascii=True)+'\n')
        except OSError: pass
        return item

    def debug_event(self,action,message,**extra):
        try:
            metadata=self._read_metadata_raw() if hasattr(self,'_read_metadata_raw') else {}
            preferences=metadata.get('preferences',{}) if isinstance(metadata,dict) else {}
            enabled=isinstance(preferences,dict) and preferences.get('logLevel','info')=='debug'
        except Exception:enabled=False
        if enabled:return self.emit('debug',action,message,**extra)
        return None

    def monitor(self,since=0):
        with self._event_lock: return [e for e in self._events if e['id']>since]

    def _audio_meta(self,p:Path):
        p=safe(self.root,p)
        if not p.is_file():raise ValueError('Plik audio nie istnieje lub jest poza root.')
        cached=self.cache.file(p)
        if cached['audio'] is not None:return cached['audio']
        info=sf.info(str(p));result={'duration':round(float(info.duration),4),'frames':int(info.frames),'sampleRate':int(info.samplerate),
                                    'channels':int(info.channels),'format':str(info.format),'subtype':str(info.subtype),'size':p.stat().st_size}
        self.cache.put_file(p,audio=result);return result

    def _hash(self,p:Path):
        p=safe(self.root,p)
        if not p.is_file():raise ValueError('Nie można hashować pliku spoza root lub nieistniejącego.')
        cached=self.cache.file(p)
        if cached['sha256']:return cached['sha256']
        h=digest(p);self.cache.put_file(p,sha=h)
        try:
            with self._perf_lock:self._perf['bytesHashed']+=p.stat().st_size;self._perf['hashesComputed']+=1
        except OSError:pass
        return h

    def _hash_many(self,paths):
        paths=list(dict.fromkeys(Path(p) for p in paths))
        if not paths:return {}
        workers=min(8,max(1,os.cpu_count() or 1),len(paths))
        with ThreadPoolExecutor(max_workers=workers) as pool: results=list(pool.map(self._hash,paths))
        return {str(p):h for p,h in zip(paths,results)}

    def _fingerprint(self,p:Path):
        cached=self.cache.file(p)
        if cached['fingerprint']:return cached['fingerprint']
        try:
            with sf.SoundFile(str(p)) as audio:
                frames,rate,channels=len(audio),audio.samplerate,audio.channels
                if rate<=0 or frames<=0:raise ValueError('Pusty lub nieprawidłowy plik audio.')
                rmses,peaks=[],[];span=min(2048,max(256,rate//12))
                for i in range(FINGERPRINT_BINS):
                    start=min(max(0,int((i+.5)*frames/FINGERPRINT_BINS)-span//2),max(0,frames-span));audio.seek(start)
                    x=audio.read(frames=min(span,frames-start),dtype='float32',always_2d=True)
                    if x.size:rmses.append(float(np.sqrt(np.mean(np.square(x,dtype=np.float64)))));peaks.append(float(np.max(np.abs(x))))
                    else:rmses.append(0.);peaks.append(0.)
                result={'duration':round(frames/rate,5),'sampleRate':int(rate),'channels':int(channels),
                        'rms':float(np.sqrt(np.mean(np.square(np.asarray(rmses,dtype=np.float64))))),
                        'peak':max(peaks,default=0.),'rmsBins':rmses,'peakBins':peaks,
                        'method':'48 równomiernie rozmieszczonych okien; RMS/peak, bez ML'}
        except Exception as exc: raise ValueError(f'Nie udało się odczytać audio {p.name}: {exc}') from exc
        self.cache.put_file(p,fp=result);return result

    def project_snapshot_hash(self,p:Path):
        p=safe(self.root,p)
        if p.is_file():
            # Safety snapshots bypass the stat-only metadata cache: same-size edits with a
            # deliberately preserved mtime must still invalidate an operation.
            h=digest(p);self.cache.put_file(p,sha=h)
            try:
                with self._perf_lock:self._perf['bytesHashed']+=p.stat().st_size;self._perf['hashesComputed']+=1
            except (AttributeError,OSError):pass
            return h
        if not p.is_dir():raise ValueError(f'Projekt nie istnieje lub nie jest plikiem/katalogiem: {p.name}.')
        parts=[]
        def walk_error(exc):raise ValueError(f'Nie można w całości sprawdzić katalogu projektu: {exc}')
        for base,dirs,names in os.walk(p,followlinks=False,onerror=walk_error):
            dirs.sort(key=str.casefold)
            for name in dirs:
                child=Path(base)/name
                if child.is_symlink() or (hasattr(child,'is_junction') and child.is_junction()):
                    raise ValueError(f'Projekt zawiera symlink/junction: {child.name}.')
                parts.append('DIR\\0'+child.relative_to(p).as_posix())
            for name in sorted(names,key=str.casefold):
                f=Path(base)/name
                if f.is_symlink():raise ValueError(f'Projekt zawiera symlink: {f.name}.')
                try:
                    st=f.stat()
                    if not f.is_file():raise ValueError(f'Nieobsługiwany wpis w projekcie: {f.name}.')
                    signature=''
                    if f.name.casefold() in {'projectdata','metadata.plist','projectinformation.plist'} or (st.st_size<=8*1024*1024 and f.suffix.casefold() not in AUDIO):
                        signature=digest(f)
                    elif st.st_size:
                        with f.open('rb') as stream:
                            head=stream.read(4096);stream.seek(max(0,st.st_size-4096));tail=stream.read(4096)
                        signature=hashlib.sha256(head+tail).hexdigest()
                    parts.append(f'FILE\\0{f.relative_to(p).as_posix()}\\0{st.st_size}\\0{st.st_mtime_ns}\\0{signature}')
                except OSError as exc:raise ValueError(f'Nie można sprawdzić projektu {f.name}: {exc}') from exc
        return hashlib.sha256('\n'.join(sorted(parts)).encode()).hexdigest()

    def _walk_files(self):
        files=[];logic_packages=[]
        def walk_error(exc):raise ValueError(f'Nie można przeskanować całego folderu roboczego: {exc}')
        for base,dirs,names in os.walk(self.root,followlinks=False,onerror=walk_error):
            keep=[]
            for name in dirs:
                p=Path(base)/name
                if name in {'.dawbridge','node_modules','.git','__pycache__'} or p.is_symlink() or (hasattr(p,'is_junction') and p.is_junction()):continue
                if p.suffix.casefold()=='.logicx':
                    files.append(p);logic_packages.append(p)
                    for inner,subdirs,innames in os.walk(p,followlinks=False,onerror=walk_error):
                        subdirs[:]=[d for d in subdirs if not (Path(inner)/d).is_symlink()]
                        for n in innames:
                            f=Path(inner)/n
                            if f.is_file() and not f.is_symlink() and f.suffix.casefold() in AUDIO:files.append(f)
                            if len(files)>MAX_SCAN_FILES:raise ValueError(f'Limit {MAX_SCAN_FILES:,} plików w folderze roboczym.')
                    continue
                keep.append(name)
            dirs[:]=keep
            for name in names:
                p=Path(base)/name
                if p.is_file() and not p.is_symlink():files.append(p)
            if len(files)>MAX_SCAN_FILES:raise ValueError(f'Limit {MAX_SCAN_FILES:,} plików. Wybierz mniejszy folder.')
        return list(dict.fromkeys(files)),set(logic_packages)

    def _resolve(self,project:Path,value:str):
        v=str(value).replace('\\','/');win=PureWindowsPath(value)
        if win.drive or str(value).startswith('\\\\'):
            if os.name!='nt':return None,True
            p=Path(value)
        else:
            p=Path(v)
            if not p.is_absolute():p=(project if project.is_dir() else project.parent)/p
        try:resolved=safe(self.root,p)
        except (ValueError,OSError):
            try:return (p.resolve() if p.is_file() else None),True
            except OSError:return None,True
        try:return (resolved if resolved.is_file() else None),False
        except OSError:return None,False

    def _parse_project(self,p:Path,ext:str):
        if ext=='.rpp':return parse_rpp(read_project(p))
        if ext=='.als':return parse_als(read_project(p))
        if ext=='.flp':return parse_flp(p)
        if ext=='.song':return parse_studio_one(p)
        if ext=='.cpr':return parse_cpr(read_project(p))
        if ext=='.logicx':return parse_logicx(p)
        raise ValueError('Nieobsługiwany format.')

    def scan(self,mode=None):
        started=time.perf_counter()
        raw_settings=self._read_metadata_raw() if hasattr(self,'_read_metadata_raw') else {}
        preferences=raw_settings.get('preferences',{}) if isinstance(raw_settings,dict) else {}
        if not isinstance(preferences,dict):preferences={}
        aliases={'light':'turbo','light-mode':'turbo','basic':'turbo','fast':'turbo','turbo-scan':'turbo',
                 'standard':'full','full-scan':'full','deep-scan':'deep'}
        configured=preferences.get('scanMode')
        if configured not in {'turbo','full','deep'}:
            configured='turbo' if preferences.get('lightMode') is True else 'full'
        scan_mode=aliases.get(str(mode).strip().casefold(),str(mode).strip().casefold()) if mode is not None else configured
        if scan_mode not in {'turbo','full','deep'}:
            raise ValueError('Skan mode musi być turbo, full albo deep.')
        light_mode=scan_mode=='turbo';self._god_light_mode=light_mode
        self.emit('info','scan','Rozpoczęto indeksowanie folderu.',scanMode=scan_mode)
        self.debug_event('scan-start',f'Scan mode={scan_mode}.')
        files,logic_packages=self._walk_files();audio=[p for p in files if p.is_file() and p.suffix.casefold() in AUDIO]
        self.debug_event('scan-indexed-paths',f'Zebrano {len(files)} ścieżek i {len(audio)} audio; rozpoczynam parsing projektów.',files=len(files),audio=len(audio))
        self.files=list(files);self.audio=sorted(audio,key=lambda p:str(p).casefold());warnings=[]
        audio_index={}
        for p in self.audio:audio_index.setdefault(p.name.casefold(),[]).append(p)
        project_specs=[(p,'.logicx' if p in logic_packages else p.suffix.casefold()) for p in files
                       if ('.logicx' if p in logic_packages else p.suffix.casefold()) in FORMATS]
        def project_job(spec):
            project_path,format_ext=spec
            parsed=None;parse_error=None;project_hash=None;hash_error=None
            try:parsed=self._parse_project(project_path,format_ext)
            except Exception as exc:parse_error=exc
            try:project_hash=self.project_snapshot_hash(project_path)
            except Exception as exc:hash_error=exc
            return project_path,parsed,project_hash,parse_error,hash_error
        parsed_workers=min(4,max(1,os.cpu_count() or 1),max(1,len(project_specs)))
        if project_specs:
            with ThreadPoolExecutor(max_workers=parsed_workers) as pool:
                project_rows=list(pool.map(project_job,project_specs))
        else:project_rows=[]
        parsed_by_path={row[0]:row[1:] for row in project_rows}
        self.debug_event('scan-project-parse',f'Projects parsed with {parsed_workers} bounded worker(s) before audio metadata.',
                         projects=len(project_specs),workers=parsed_workers)
        projects={}
        for p in files:
            ext='.logicx' if p in logic_packages else p.suffix.casefold()
            if ext not in FORMATS:continue
            pid=hashlib.sha256(file_key(p).encode()).hexdigest()[:16]
            try:rel=p.relative_to(self.root).as_posix()
            except ValueError:continue
            item={'id':pid,'name':p.stem,'path':rel,'daw':FORMATS[ext],'format':ext,'tracks':[],'refs':[],'regions':[],'markers':[],
                  'plugins':[],'support':'Parser nieuruchomiony','hash':None,'tempoBpm':None,'timeSignature':None,'tempoMap':[],'errors':[],'warnings':[]}
            parsed,project_hash,parse_error,hash_error=parsed_by_path.get(p,(None,None,ValueError('Projekt nie został sparsowany.'),None))
            try:
                if parse_error:raise parse_error
                item.update({k:parsed[k] for k in ('tracks','refs','regions','markers','tempoBpm','timeSignature','tempoMap','plugins','routing') if k in parsed})
                item['parser']=parsed.get('parser','unknown');item['partial']=bool(parsed.get('partial'))
                item.setdefault('routing',[])
                if item['partial']:item['warnings'].append('Odczyt częściowy; pola nieznalezione przez ten adapter mogą istnieć w projekcie.')
                item['xmlParts']=parsed.get('xmlParts',[]);item['hash']=project_hash
                if hash_error:
                    item['warnings'].append(f'Hash projektu niedostępny: {hash_error}; zapisy pozostają zablokowane.')
                    warnings.append(f'{rel}: hash niedostępny ({hash_error})')
                item['support']={'.rpp':'RPP: odczyt wspieranych pól tekstowych + wybrane naprawy/eksport',
                                 '.als':'ALS: częściowy gzip/XML; wybrane ścieżki/markery/regiony',
                                 '.flp':'FLP: PyFLP parser; zależny od wersji/obsługiwanych zdarzeń',
                                 '.song':'Studio One: ZIP/XML strukturalny; pola zależne od wersji',
                                 '.cpr':'Cubase CPR: heurystyka binarna; XML snapshot tylko jeśli jawnie XML',
                                 '.logicx':'Logic: plist + heurystyka ProjectData; tylko odczyt'}[ext]
                for ri,ref in enumerate(item['refs']):
                    value=str(ref.get('path',''));found,external=self._resolve(p,value);inside=bool(found and found.is_relative_to(self.root))
                    ref['index']=ri;ref['external']=bool(external or (found and not inside));ref['exists']=inside
                    ref['resolved']=found.relative_to(self.root).as_posix() if inside else None
                    ref['status']='OK' if inside else ('Ścieżka zewnętrzna/poza zakresem' if ref['external'] else 'Brak')
                    candidates=[] if inside else audio_index.get(basename_ref(value).casefold(),[])
                    ref['candidates']=[c.relative_to(self.root).as_posix() for c in candidates[:30]]
                    ref['candidateSnapshots']=[]
                    for candidate in candidates[:30]:
                        try:
                            candidate_stat=candidate.stat()
                            ref['candidateSnapshots'].append({'path':candidate.relative_to(self.root).as_posix(),
                                                              'size':candidate_stat.st_size,'mtimeNs':candidate_stat.st_mtime_ns})
                        except OSError:
                            continue
                    ref['candidateScores']=[]
                    ref['signatureAvailable']=bool(self.cache.get_ref(rel,value))
                    if inside and found and found.suffix.casefold() in AUDIO:
                        meta=self.cache.file(found)
                        old_sig=self.cache.get_ref(rel,value) or {}
                        source_stat=found.stat()
                        self.cache.put_ref(rel,value,{**old_sig,'path':found.relative_to(self.root).as_posix(),'size':source_stat.st_size,
                                                       'mtimeNs':source_stat.st_mtime_ns,'audio':meta.get('audio'),'lastSeen':dt.datetime.now().isoformat(),
                                                       'audioMetadataPending':bool(light_mode and meta.get('audio') is None)})
                for region in item['regions']:
                    ri=region.get('ref')
                    if ri is not None and 0<=int(ri)<len(item['refs']):
                        region['source']=item['refs'][int(ri)].get('resolved');region['sourcePath']=item['refs'][int(ri)].get('path')
                    region['startSeconds']=self._to_seconds(region.get('start',0),region.get('unit','beats'),item.get('tempoBpm'))
                    region['lengthSeconds']=self._to_seconds(region.get('length',0),region.get('unit','beats'),item.get('tempoBpm'))
                    if region.get('startSeconds') is not None and region.get('lengthSeconds') is not None:
                        region['endSeconds']=region['startSeconds']+region['lengthSeconds']
                durations={}
                for region in item['regions']:
                    ti=region.get('track')
                    if ti is not None and region.get('endSeconds') is not None:
                        durations[str(ti)]=max(durations.get(str(ti),0.0),float(region['endSeconds']))
                item['trackDurations']={int(k):round(v,4) for k,v in durations.items()}
                item['timelineLengthSeconds']=round(max(durations.values(),default=0.0),4)
            except Exception as exc:
                item['errors'].append(str(exc));warnings.append(f'{rel}: {exc}');item['hash']=project_hash
                if hash_error:item['warnings'].append(f'Hash projektu niedostępny: {hash_error}; zapisy pozostają zablokowane.')
                item['support']='Parser error — tylko wykrycie'
            demo_marker=(p/'BRIDGE-DEMO.txt').exists() if p.is_dir() else p.with_name(p.name+'.demo.txt').exists()
            if demo_marker:item['demoFixture']=True
            projects[pid]=item
        self.debug_event('scan-projects-parsed',f'Przetworzono projekty przed audio metadata: {len(projects)}.',projects=len(projects))
        # Priority order: parse project timelines first; only then inspect audio headers.
        def meta_job(p):
            try:return self._audio_meta(p),None
            except Exception as exc:return None,f'{p.name}: metadane audio niedostępne ({exc})'
        if scan_mode in {'full','deep'} and self.audio:
            workers=min(8,max(1,os.cpu_count() or 1),len(self.audio))
            with ThreadPoolExecutor(max_workers=workers) as pool:
                audio_meta=list(pool.map(meta_job,self.audio))
            for _,warning in audio_meta:
                if warning:warnings.append(warning)
            for item in projects.values():
                for ref in item.get('refs',[]):
                    rel=ref.get('resolved')
                    if not rel:continue
                    path=self.root/rel
                    if path.suffix.casefold() not in AUDIO:continue
                    meta=self.cache.file(path);signature=self.cache.get_ref(item['path'],ref['path']) or {}
                    self.cache.put_ref(item['path'],ref['path'],{**signature,'audio':meta.get('audio'),'audioMetadataPending':False})
            self.debug_event('scan-audio-metadata',f'Header metadata checked for {len(self.audio)} files after parsing projects.',audio=len(self.audio),workers=workers)
        elif light_mode:
            warnings.append('Turbo Scan: pominięto nagłówki audio i ciężkie analizy.')
            self.debug_event('scan-light-mode','Turbo Scan pominął nagłówki audio i ciężkie analizy.')
        deep_summary=None
        if scan_mode=='deep':
            deep_summary=self.deep_scan_audio(projects)
            if (deep_summary.get('failedFiles') or deep_summary.get('skippedFiles')
                    or deep_summary.get('notSelectedCount')):
                warnings.append(f'Deep Scan częściowy: {deep_summary.get("analyzedFiles",0)} plików przeanalizowano, '
                                f'{deep_summary.get("notSelectedCount",0)} nie wybrano, '
                                f'{len(deep_summary.get("failedFiles",[]))} błędów, '
                                f'{len(deep_summary.get("skippedFiles",[]))} pominięto.')
        self.projects=projects;dirs_map=self.folder_mappings();missing=sum(not r['exists'] for p in projects.values() for r in p['refs'])
        elapsed=round(time.perf_counter()-started,3)
        self.state={'root':str(self.root),'projects':list(projects.values()),'audioCount':len(self.audio),'warnings':warnings,
                    'scannedAt':dt.datetime.now().isoformat(timespec='seconds'),'missing':missing,'folderMappings':dirs_map,
                    'durationSeconds':elapsed,'safeMode':True,'scanMode':scan_mode,
                    'deepAnalysis':deep_summary,
                    'cache':'SQLite stat/hash/audio/fingerprint/spectral cache',
                    'watcher':self.watcher_status(),'performance':self.performance_stats()}
        self._perf['lastScanSeconds']=elapsed
        remaining_conflicts=set()
        for conflict in list(self.watch_conflicts):
            current_item=next((x for x in projects.values() if x.get('path')==conflict),None)
            if current_item:
                try:
                    if self.project_snapshot_hash(self.root/current_item['path'])!=current_item.get('hash'):
                        remaining_conflicts.add(conflict)
                except OSError:remaining_conflicts.add(conflict)
        self.watch_conflicts=remaining_conflicts
        self._watch_state['dirtyProjects']=sorted(remaining_conflicts)
        self._record_project_snapshots(projects)
        self.state['watcher']=self.watcher_status()
        self.state['performance']=self.performance_stats()
        self.emit('info' if not warnings else 'warning','scan',f'Skan zakończony: {len(projects)} projektów, {len(self.audio)} plików audio, {elapsed:.2f} s.',
                  projects=len(projects),audio=len(self.audio),warnings=len(warnings),scanMode=scan_mode)
        return self.state

    @staticmethod
    def _to_seconds(value,unit,bpm):
        n=num(value) or 0.0
        if str(unit).casefold() in {'beats','beat','ticks','qn'}:return n*60/bpm if bpm and bpm>0 else None
        return n

    def current(self,pid,expected=None):
        item=self.projects.get(str(pid))
        if not item:raise ValueError('Projekt nie należy do bieżącego skanu. Skanuj ponownie.')
        p=safe(self.root,self.root/item['path']);current_hash=self.project_snapshot_hash(p)
        if expected and current_hash!=expected:raise ValueError('Projekt zmienił się od skanu. Safe Mode blokuje operację; skanuj ponownie.')
        if item.get('hash') and current_hash!=item['hash']:raise ValueError('Projekt zmienił się od skanu. Safe Mode blokuje operację; skanuj ponownie.')
        return item,p

    def _matching_daw_processes(self,item):
        if psutil is None:raise ValueError('Safe Mode: psutil nie jest dostępny; zapis zablokowany.')
        patterns={'.rpp':r'^reaper(?:64|_x64)?(?:\.exe)?$',
                  '.flp':r'^(?:fl64|fl|flstudio|fl studio)(?:[ _-].*)?(?:\.exe)?$',
                  '.als':r'^ableton live(?:[ _-].*)?(?:\.exe)?$',
                  '.cpr':r'^(?:cubase|nuendo)(?:[ _-]?[0-9].*)?(?:\.exe)?$',
                  '.song':r'^studio one(?:[ _-].*)?(?:\.exe)?$',
                  '.logicx':r'^logic pro(?: x)?(?:\.app)?$'}
        pattern=re.compile(patterns.get(item.get('format'),r'(?!)'),re.I);matching=[]
        try:
            for proc in psutil.process_iter(['name','cmdline']):
                try:
                    name=(proc.info.get('name') or '').strip();args=proc.info.get('cmdline') or []
                    candidates=[name]
                    for arg in args:
                        if arg and ('.exe' in str(arg).casefold() or '.app' in str(arg).casefold()):
                            candidates.extend((Path(arg).name,PureWindowsPath(str(arg)).name))
                    if any(pattern.fullmatch(str(candidate).strip()) for candidate in candidates):
                        matching.append(name or str(proc.pid))
                except (psutil.NoSuchProcess,psutil.AccessDenied,psutil.ZombieProcess):continue
        except Exception as exc:raise ValueError(f'Safe Mode nie może sprawdzić procesów DAW: {exc}')
        return sorted(set(matching))

    def _assert_daw_closed(self,item,p):
        if item.get('path') in self.watch_conflicts:
            raise ValueError('Safe Mode: watcher wykrył zmianę/konflikt od skanu. Skanuj ponownie przed operacją.')
        matching=self._matching_daw_processes(item)
        if matching:
            raise ValueError(f'Safe Mode: wykryto uruchomiony proces {item["daw"]} ({", ".join(matching)}). zamknij DAW przed zapisem lub eksportem; Bridge blokuje także wtedy, gdy otwarty jest inny projekt.')
        if self.project_snapshot_hash(p)!=item.get('hash'):
            raise ValueError('Safe Mode: projekt zmienił się od skanu. Skanuj ponownie.')

    def _project_tree_size(self,p,max_files=MAX_SCAN_FILES):
        p=Path(p)
        if p.is_file():
            try:return int(p.stat().st_size)
            except OSError as exc:raise ValueError(f'Nie można odczytać rozmiaru projektu {p.name}: {exc}') from exc
        if not p.is_dir():raise ValueError(f'Projekt nie istnieje lub nie jest czytelnym plikiem/katalogiem: {p.name}.')
        def walk_error(exc):raise ValueError(f'Nie można w całości sprawdzić katalogu projektu: {exc}')
        total=0;count=0
        for base,dirs,names in os.walk(p,followlinks=False,onerror=walk_error):
            for name in dirs:
                child=Path(base)/name
                if child.is_symlink() or (hasattr(child,'is_junction') and child.is_junction()):
                    raise ValueError(f'Projekt zawiera symlink/junction; Safe Mode nie kopiuje ścieżek pośrednich: {child.name}.')
            for name in names:
                f=Path(base)/name
                if f.is_symlink():raise ValueError(f'Projekt zawiera symlink; Safe Mode nie kopiuje ścieżek pośrednich: {f.name}.')
                try:
                    if not f.is_file():raise ValueError(f'Nieobsługiwany wpis w projekcie: {f.name}.')
                    total+=f.stat().st_size;count+=1
                except OSError as exc:raise ValueError(f'Nie można sprawdzić projektu {f.name}: {exc}') from exc
                if count>max_files:raise ValueError(f'Projekt przekracza limit liczenia rozmiaru backupu: {max_files:,} plików.')
        return total

    def _content_tree_hash(self,p,max_files=MAX_SCAN_FILES):
        p=Path(p)
        if p.is_file():return digest(p)
        total=hashlib.sha256();count=0
        def walk_error(exc):raise ValueError(f'Nie można odczytać całego projektu do weryfikacji backupu: {exc}')
        for base,dirs,names in os.walk(p,followlinks=False,onerror=walk_error):
            dirs.sort(key=str.casefold)
            for name in dirs:
                child=Path(base)/name
                if child.is_symlink() or (hasattr(child,'is_junction') and child.is_junction()):
                    raise ValueError(f'Projekt zawiera symlink/junction: {child.name}.')
                rel_dir=child.relative_to(p).as_posix().encode('utf-8','surrogateescape')
                total.update(b'D');total.update(len(rel_dir).to_bytes(4,'big'));total.update(rel_dir)
            for name in sorted(names,key=str.casefold):
                f=Path(base)/name
                if f.is_symlink():raise ValueError(f'Projekt zawiera symlink: {f.name}.')
                count+=1
                if count>max_files:raise ValueError(f'Projekt przekracza limit weryfikacji backupu: {max_files:,} plików.')
                rel=f.relative_to(p).as_posix().encode('utf-8','surrogateescape')
                try:size=f.stat().st_size;file_hash=digest(f)
                except OSError as exc:raise ValueError(f'Nie można zweryfikować {f.name}: {exc}') from exc
                total.update(len(rel).to_bytes(4,'big'));total.update(rel);total.update(size.to_bytes(8,'big'));total.update(bytes.fromhex(file_hash))
        return total.hexdigest()

    def _backup(self,p,item):
        p=safe(self.root,Path(p))
        if not p.exists() or (not p.is_file() and not p.is_dir()):raise ValueError('Safe Mode: projekt do backupu nie istnieje lub ma nieobsługiwany typ.')
        before=self.project_snapshot_hash(p)
        if before!=item.get('hash'):raise ValueError('Safe Mode: projekt zmienił się przed utworzeniem backupu.')
        size=self._project_tree_size(p)
        needed=max(1024*1024,int(size*1.10))
        folder=self.root/'.dawbridge'/'backups';folder.mkdir(parents=True,exist_ok=True)
        try:free=shutil.disk_usage(folder).free
        except OSError as exc:raise ValueError(f'Safe Mode: nie można sprawdzić wolnego miejsca na backup: {exc}') from exc
        if free<needed:raise ValueError(f'Safe Mode: za mało miejsca na backup ({free:,} B wolne, ok. {needed:,} B potrzebne). Oryginał nie został zmieniony.')
        stamp=dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f');target=folder/f'{stamp}-{p.name}'
        manifest_path=target.with_name(target.name+'.manifest.json');temp_manifest=None
        try:
            original_content_hash=self._content_tree_hash(p)
            if p.is_dir():shutil.copytree(p,target)
            else:shutil.copy2(p,target)
            copied_content_hash=self._content_tree_hash(target)
            if copied_content_hash!=original_content_hash:raise ValueError('Weryfikacja zawartości backupu nie powiodła się; oryginał nie został zmieniony.')
            if self.project_snapshot_hash(p)!=before:raise ValueError('Projekt zmienił się podczas backupu; operacja została przerwana.')
            manifest={'schema':'dawbridge.verified-backup','version':1,'project':item['path'],
                      'createdAt':dt.datetime.now().isoformat(timespec='seconds'),'projectSnapshotHash':before,
                      'originalContentHash':original_content_hash,'backupContentHash':copied_content_hash,
                      'sizeBytes':size,'kind':'directory' if p.is_dir() else 'file'}
            fd,temp_manifest=tempfile.mkstemp(dir=folder,prefix='.backup-manifest-',suffix='.tmp')
            with os.fdopen(fd,'w',encoding='utf-8') as stream:
                json.dump(manifest,stream,ensure_ascii=False,indent=2);stream.flush();os.fsync(stream.fileno())
            os.replace(temp_manifest,manifest_path);temp_manifest=None
            try:verified=json.loads(manifest_path.read_text(encoding='utf-8'))
            except Exception as exc:raise ValueError(f'Nie można ponownie odczytać manifestu backupu: {exc}') from exc
            if verified.get('backupContentHash')!=self._content_tree_hash(target):
                raise ValueError('Weryfikacja manifestu backupu nie powiodła się.')
            return target
        except Exception:
            if temp_manifest and os.path.exists(temp_manifest):os.unlink(temp_manifest)
            if manifest_path.exists():manifest_path.unlink(missing_ok=True)
            if target.is_dir():shutil.rmtree(target,ignore_errors=True)
            else:target.unlink(missing_ok=True)
            raise

    def _write_atomic(self,p:Path,data:bytes,expected:str):
        fd,tmp=tempfile.mkstemp(dir=p.parent,prefix='.bridge-',suffix=p.suffix)
        try:
            with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
            if self.project_snapshot_hash(p)!=expected:raise ValueError('Projekt zmienił się w trakcie zapisu; plik nietknięty.')
            os.replace(tmp,p)
        finally:
            if os.path.exists(tmp):os.unlink(tmp)

    def repair(self,pid,expected,selections,confirm=False):
        if confirm is not True:
            raise ValueError('Naprawa wymaga ręcznego confirm=true po sprawdzeniu każdej zmiany old path → new path.')
        item,p=self.current(pid,expected)
        if item['format']!='.rpp':raise ValueError('Natychmiastowa naprawa ścieżek obsługiwana wyłącznie w RPP.')
        self._assert_daw_closed(item,p);parsed=parse_rpp(read_project(p));refs=parsed['refs'];changes={};path_changes=[]
        if not isinstance(selections,dict):raise ValueError('Nieprawidłowy wybór kandydatów.')
        for key,value in selections.items():
            i=int(key)
            if not 0<=i<len(item['refs']):raise ValueError('Indeks odwołania poza zakresem.')
            r=item['refs'][i]
            if r['exists'] or value not in r['candidates']:raise ValueError('Nieprawidłowy kandydat. Skanuj ponownie.')
            snapshot=next((x for x in r.get('candidateSnapshots',[]) if x.get('path')==value),None)
            if not snapshot:raise ValueError('Kandydat nie ma statystyki z ostatniego skanu; skanuj ponownie.')
            source=safe(self.root,self.root/value);source_stat=source.stat()
            if source.is_symlink() or not source.is_file() or source_stat.st_size<=0:raise ValueError('Plik źródłowy już nie istnieje lub nie jest czytelnym plikiem.')
            if source_stat.st_size!=int(snapshot.get('size',-1)) or source_stat.st_mtime_ns!=int(snapshot.get('mtimeNs',-1)):
                raise ValueError('Kandydat zmienił się od skanu. Skanuj ponownie przed naprawą.')
            with source.open('rb') as stream:stream.read(1)
            with sf.SoundFile(str(source)) as audio:
                if len(audio)<=0 or audio.samplerate<=0 or audio.channels<=0:raise ValueError('Nieprawidłowy nagłówek źródła audio.')
            changes[i]=os.path.relpath(source,p.parent).replace('\\','/')
            path_changes.append({'index':i,'oldPath':r.get('path'),'newPath':changes[i]})
        if not changes:raise ValueError('Nie wybrano napraw.')
        patched=self._rewrite_rpp(read_project(p),refs,changes);backup=self._backup(p,item)
        for key,value in selections.items():
            ref=item['refs'][int(key)];snapshot=next(x for x in ref.get('candidateSnapshots',[]) if x.get('path')==value)
            source=safe(self.root,self.root/value);source_stat=source.stat()
            if source_stat.st_size!=int(snapshot['size']) or source_stat.st_mtime_ns!=int(snapshot['mtimeNs']):
                raise ValueError('Kandydat zmienił się w trakcie backupu; projekt nie został zmieniony.')
        self._assert_daw_closed(item,p)
        self._write_atomic(p,patched,expected)
        event={'time':dt.datetime.now().isoformat(),'action':'repair','project':item['path'],
               'backup':backup.relative_to(self.root).as_posix(),'before':expected,'after':digest(p),
               'changes':changes,'pathChanges':path_changes}
        self.log(event);self.emit('success','repair',f'Naprawiono {len(changes)} odwołań RPP: {item["path"]}.',project=item['path'])
        self.scan()
        refreshed=self.projects.get(str(pid),{})
        missing_after=sum(not ref.get('exists') for ref in refreshed.get('refs',[]))
        parser_errors=list(refreshed.get('errors',[]))
        post_status=('verified' if refreshed and not parser_errors and missing_after==0
                     else 'needs-review' if refreshed else 'not-available')
        event['postOperationStatus']={'status':post_status,
            'projectHash':refreshed.get('hash'),'missingReferences':missing_after,
            'parserErrors':parser_errors,'projectRescanned':bool(refreshed),
            'message':'Projekt został ponownie przeskanowany po operacji; sprawdź pozostałe brakujące odwołania i odsłuchuj w DAW.'}
        self.log({'time':dt.datetime.now().isoformat(),'action':'repair-post-check','project':item['path'],
                  **event['postOperationStatus']})
        return event

    @staticmethod
    def _rewrite_rpp(raw,refs,replacements):
        text=raw.decode('utf-8',errors='surrogateescape');found=[];stack=[];off=0
        for line in text.splitlines(keepends=True):
            s=line.strip()
            if s.startswith('<'):stack.append(s.split()[0][1:])
            elif s=='>':
                if stack:stack.pop()
            elif stack and stack[-1]=='SOURCE':
                m=re.match(r'\s*FILE\s+("[^"\r\n]*"|[^\s]+)',line)
                if m:found.append({'start':off+m.start(1),'end':off+m.end(1)})
            off+=len(line)
        if len(found)!=len(refs):raise ValueError('Liczba ścieżek różni się od skanu; nic nie zapisano.')
        for i,value in sorted(replacements.items(),key=lambda pair:found[pair[0]]['start'],reverse=True):
            if any(ch in value for ch in ('"','\n','\r','\0')):raise ValueError('Niedozwolony znak w ścieżce.')
            r=found[i];text=text[:r['start']]+'"'+value+'"'+text[r['end']:]
        return text.encode('utf-8',errors='surrogateescape')

    def save_flp_tempo_copy(self,pid,expected,tempo,confirm=False):
        if confirm is not True:raise ValueError('FLP tempo-copy wymaga jawnego confirm=true po sprawdzeniu nowej kopii.')
        item,p=self.current(pid,expected)
        if item['format']!='.flp':raise ValueError('Zmiana tempa przez PyFLP jest dostępna tylko dla FLP.')
        if not 20<=float(tempo)<=999:raise ValueError('Tempo poza obsługiwanym zakresem 20–999 BPM.')
        self._assert_daw_closed(item,p)
        if pyflp is None:raise ValueError('Brak PyFLP.')
        obj=pyflp.parse(str(p))
        try:obj.tempo=float(tempo)
        except Exception as exc:raise ValueError(f'PyFLP nie może zmienić pola tempo w tej wersji projektu: {exc}')
        stamp=dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f');out=p.with_name(f'{p.stem}.bridge-{stamp}.flp')
        fd,temp_name=tempfile.mkstemp(dir=p.parent,prefix='.bridge-',suffix='.flp');os.close(fd)
        try:
            pyflp.save(obj,temp_name);check=pyflp.parse(temp_name)
            if abs(float(check.tempo)-float(tempo))>.01:raise ValueError('Weryfikacja zapisanego FLP nie powiodła się.')
            self._backup(p,item)
            self._assert_daw_closed(item,p)
            if self.project_snapshot_hash(p)!=expected:raise ValueError('Projekt zmienił się podczas edycji; oryginał pozostał nietknięty.')
            os.replace(temp_name,out)
        finally:
            if os.path.exists(temp_name):os.unlink(temp_name)
        event={'time':dt.datetime.now().isoformat(),'action':'flp-tempo-copy','project':item['path'],
               'destination':out.relative_to(self.root).as_posix(),'tempoBpm':float(tempo),'before':expected,'after':digest(out)}
        self.log(event);self.emit('success','flp-tempo-copy',f'Zapisano kopię FLP z tempem {tempo} BPM.',project=item['path'])
        self.scan();return event

    def save_song_tempo_copy(self,pid,expected,tempo):
        raise ValueError('Studio One .song pozostaje read-only: adapter jest częściowy i zależny od wersji.')

    def log(self,event):
        d=self.root/'.dawbridge';d.mkdir(exist_ok=True)
        with open(d/'history.jsonl','a',encoding='utf-8') as f:f.write(json.dumps(event,ensure_ascii=True)+'\n')

    def history(self):
        p=self.root/'.dawbridge'/'history.jsonl'
        if not p.exists():return []
        out=[]
        for line in p.read_text(encoding='utf-8',errors='replace').splitlines()[-500:]:
            try:out.append(json.loads(line))
            except json.JSONDecodeError:continue
        return out[::-1][:100]

    def duplicates(self):
        sizes={}
        for p in self.audio:
            try:sizes.setdefault(p.stat().st_size,[]).append(p)
            except OSError:continue
        groups={}
        for paths in sizes.values():
            if len(paths)<2:continue
            for p,h in self._hash_many(paths).items():groups.setdefault(h,[]).append(Path(p).relative_to(self.root).as_posix())
        result=[{'sha256':h,'files':paths,'size':self._size_from_hash_group(paths)} for h,paths in groups.items() if len(paths)>1]
        self.emit('info','duplicates',f'Znaleziono {len(result)} grup identycznych plików.')
        return result

    def _size_from_hash_group(self,paths):
        try:return (self.root/paths[0]).stat().st_size
        except OSError:return None

    def export(self,pid,expected,confirm=False):
        if confirm is not True:raise ValueError('Pakiet portable wymaga jawnego confirm=true.')
        item,project=self.current(pid,expected)
        if item['format']!='.rpp':raise ValueError('Pakiet przenośny jest obecnie dostępny tylko dla RPP.')
        self._assert_daw_closed(item,project);raw=read_project(project);refs=parse_rpp(raw)['refs'];sources=[]
        for ref in refs:
            source,external=self._resolve(project,ref['path'])
            if not source or external or not source.is_relative_to(self.root):raise ValueError(f'Najpierw rozwiąż brakujące/zewnętrzne odwołanie: {ref["path"]}')
            sources.append(source)
        folder=self.root/'.dawbridge'/'exports';folder.mkdir(parents=True,exist_ok=True)
        dest=Path(tempfile.mkdtemp(prefix='portable-',dir=folder));media=dest/'Media';media.mkdir();replacements={};manifest=[]
        try:
            required=sum(s.stat().st_size for s in set(sources))
            if shutil.disk_usage(dest).free<required*1.1:raise ValueError('Za mało miejsca na kopię mediów.')
            for i,source in enumerate(sources):
                h=digest(source);name=h+source.suffix.lower();target=media/name
                if not target.exists():shutil.copy2(source,target)
                if digest(target)!=h or digest(source)!=h:raise ValueError('Kopia mediów lub źródło zmieniły się podczas eksportu; weryfikacja SHA-256 nie powiodła się.')
                replacements[i]='Media/'+name
                manifest.append({'original':refs[i]['path'],'file':replacements[i],'sha256':h,'track':refs[i].get('track')})
            self._assert_daw_closed(item,project)
            (dest/'Project.rpp').write_bytes(self._rewrite_rpp(raw,refs,replacements))
            (dest/'manifest.json').write_text(json.dumps({'version':2,'source':item['path'],'media':manifest,
                'markers':item['markers'],'tracks':item['tracks'],'tempoBpm':item.get('tempoBpm'),
                'limitations':['Audio source files only; plugin/sample libraries are not included.','Portable Reaper package, not cross-DAW conversion.']},
                indent=2,ensure_ascii=False),encoding='utf-8')
        except Exception:shutil.rmtree(dest,ignore_errors=True);raise
        event={'time':dt.datetime.now().isoformat(),'action':'portable-export','project':item['path'],'destination':dest.relative_to(self.root).as_posix()}
        self.log(event);self.emit('success','portable-export',f'Pakiet RPP: {event["destination"]}.')
        return event

    def _signature(self,p):
        meta=self._audio_meta(p);sha=self._hash(p);fp=self._fingerprint(p)
        return {'path':p.relative_to(self.root).as_posix(),'sha256':sha,'size':p.stat().st_size,'audio':meta,'fingerprint':fp}

    def smart_index(self):
        if not self.projects:raise ValueError('Najpierw wykonaj skan.')
        todo=[];seen=set()
        for item in self.projects.values():
            for ref in item['refs']:
                if not ref.get('exists') or not ref.get('resolved'):continue
                p=self.root/ref['resolved'];key=(item['path'],ref['path'])
                if p.suffix.casefold() not in AUDIO or key in seen:continue
                seen.add(key);todo.append((item['path'],ref['path'],p))
        self.emit('info','smart-index',f'Buduję fingerprint dla {len(todo)} używanych mediów.')
        done=0;failed=[]
        def index_one(entry):
            project,ref,p=entry
            try:return project,ref,self._signature(p),None
            except Exception as exc:return project,ref,None,f'{p.name}: {exc}'
        workers=min(4,max(1,os.cpu_count() or 1),max(1,len(todo)))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for project,ref,signature,error in pool.map(index_one,todo):
                if error:failed.append(error)
                else:self.cache.put_ref(project,ref,signature);done+=1
        self.emit('success' if not failed else 'warning','smart-index',f'Indeks: {done} referencji, błędy: {len(failed)}.')
        return {'indexed':done,'failed':failed[:50],'note':'Indeks referencji zapisany lokalnie w .dawbridge/cache.sqlite3.'}

    def smart_resolve(self,pid):
        item,project=self.current(pid);results=[];audio_paths=[p for p in self.audio if p.is_file()]
        for ri,ref in enumerate(item['refs']):
            if ref.get('exists'):continue
            expected=self.cache.get_ref(item['path'],ref['path']) or {};seeded_elsewhere=False;ambiguous_cache=False
            if not expected.get('sha256'):
                known=self.cache.refs_by_basename(basename_ref(ref['path']));by_hash={}
                for _,_,sig in known:
                    if sig.get('sha256'):by_hash.setdefault(sig['sha256'],sig)
                if len(by_hash)==1:expected={**expected,**next(iter(by_hash.values()))};seeded_elsewhere=True
                elif len(by_hash)>1:ambiguous_cache=True
            if expected.get('sha256'):
                size_matches=[]
                for candidate in audio_paths:
                    try:
                        if candidate.stat().st_size==expected.get('size'):size_matches.append(candidate)
                    except OSError:pass
                hashes=self._hash_many(size_matches);exact=[p for p in size_matches if hashes.get(str(p))==expected['sha256']]
            else:exact=[]
            name=basename_ref(ref['path']).casefold();pool=exact or audio_paths
            expected_audio=expected.get('audio') or {};expected_fp=expected.get('fingerprint');prelim=[]
            for p in pool:
                try:
                    meta=self._audio_meta(p);name_score=difflib.SequenceMatcher(None,name,p.name.casefold()).ratio();size_match=bool(expected.get('size') is not None and p.stat().st_size==expected.get('size'))
                    duration=meta.get('duration');exp_duration=expected_audio.get('duration')
                    dur_score=max(0.,1-abs(duration-exp_duration)/max(duration,exp_duration,.1)) if duration is not None and exp_duration else None
                    prelim_score=.45*name_score+.2*(1 if size_match else 0)+.35*(dur_score or 0)
                    prelim.append((prelim_score,p,meta,name_score,size_match,dur_score))
                except Exception:continue
            prelim.sort(key=lambda x:x[0],reverse=True);finalists=exact or [x[1] for x in prelim[:24]];finalist_set=set(finalists);scored=[]
            for _,p,meta,name_score,size_match,dur_score in prelim:
                if p not in finalist_set:continue
                signals={'name':round(name_score,3),'sizeMatch':size_match,'duration':round(dur_score,3) if dur_score is not None else None,'sha256Match':False,'waveform':None}
                if expected.get('sha256'):
                    signals['sha256Match']=self._hash(p)==expected['sha256']
                fp_score=None;fp_components=None
                if expected_fp:
                    try:
                        fp_components=adaptive_similarity(expected_fp,self._fingerprint(p));fp_score=fp_components['similarity']
                    except Exception:pass
                signals['waveform']=round(fp_score,3) if fp_score is not None else None
                signals['spectral']=round(fp_components['spectral'],3) if fp_components and fp_components.get('spectral') is not None else None
                signals['spectralHash']=round(fp_components['spectralHash'],3) if fp_components and fp_components.get('spectralHash') is not None else None
                signals['harmonicBands']=round(fp_components['harmonicBands'],3) if fp_components and fp_components.get('harmonicBands') is not None else None
                signals['rhythm']=round(fp_components['rhythm'],3) if fp_components and fp_components.get('rhythm') is not None else None
                if signals['sha256Match']:score=1.
                else:
                    terms=[name_score];weights=[.15]
                    if expected.get('size') is not None:terms.append(1. if size_match else 0.);weights.append(.12)
                    if dur_score is not None:terms.append(dur_score);weights.append(.23)
                    if fp_score is not None:terms.append(fp_score);weights.append(.5)
                    score=sum(a*b for a,b in zip(terms,weights))/sum(weights)
                scored.append({'path':p.relative_to(self.root).as_posix(),'score':round(score,4),'signals':signals,
                               'duration':meta.get('duration'),'size':meta.get('size')})
            scored.sort(key=lambda x:x['score'],reverse=True)
            ref['expected']={'available':bool(expected),'hasSha256':bool(expected.get('sha256')),'duration':(expected.get('audio') or {}).get('duration'),
                             'size':expected.get('size'),'seededFromOtherProject':seeded_elsewhere,'ambiguousCachedVersions':ambiguous_cache}
            ref['candidateScores']=scored[:12];ref['candidates']=[c['path'] for c in scored[:12]] or ref['candidates']
            if ambiguous_cache:note='Inne projekty mają różne wersje pliku o tej nazwie; nie wybrano odcisku automatycznie.'
            elif seeded_elsewhere:note='Użyto odcisku identycznie nazwanego źródła zapisanego w innym projekcie; sprawdź wersję.'
            elif expected:note='Dopasowanie używa zapamiętanego odcisku źródła.'
            else:note='Brak historycznego odcisku; ranking bazuje głównie na nazwie i dostępnych metadanych.'
            ref['resolverNote']=note
            results.append({'index':ri,'path':ref['path'],'expected':ref['expected'],'candidates':ref['candidateScores'],'note':note})
        self.emit('info','smart-resolver',f'Ranking Smart Media Resolver: {len(results)} brakujących odwołań.',project=item['path'])
        return {'project':item['path'],'missing':results}

    @staticmethod
    def fingerprint_similarity(a,b):
        def cos(x,y):
            x,y=np.asarray(x,dtype=np.float64),np.asarray(y,dtype=np.float64)
            if x.size!=y.size or not x.size:return 0.
            nx,ny=np.linalg.norm(x),np.linalg.norm(y)
            if nx<1e-10 or ny<1e-10:return 1. if nx==ny else 0.
            return float(np.dot(x,y)/(nx*ny))
        rms=cos(a.get('rmsBins',[]),b.get('rmsBins',[]));peak=cos(a.get('peakBins',[]),b.get('peakBins',[]))
        da,db=a.get('duration'),b.get('duration');duration=max(0.,1-abs(da-db)/max(da,db,.1)) if da and db else 0.
        ra,rb=a.get('rms',0),b.get('rms',0);gain=max(0.,1-abs(math.log10((ra+1e-9)/(rb+1e-9)))/2) if ra and rb else 0.
        return max(0.,min(1.,.38*rms+.22*peak+.25*duration+.15*gain))

    def fingerprint_compare(self,path_a,path_b):
        a=safe(self.root,self.root/str(path_a));b=safe(self.root,self.root/str(path_b))
        if a.suffix.casefold() not in AUDIO or b.suffix.casefold() not in AUDIO or not a.is_file() or not b.is_file():
            raise ValueError('Wybierz dwa pliki audio wewnątrz folderu roboczego.')
        fa,fb=self._fingerprint(a),self._fingerprint(b)
        result={'a':a.relative_to(self.root).as_posix(),'b':b.relative_to(self.root).as_posix(),
                'similarity':round(self.fingerprint_similarity(fa,fb),4),'method':fa['method'],'durationA':fa['duration'],'durationB':fb['duration'],
                'sha256Identical':self._hash(a)==self._hash(b),'caveat':'To szybki fingerprint RMS/peak; podobny przebieg nie dowodzi, że pliki są tym samym nagraniem.'}
        self.emit('info','fingerprint',f'Porównanie audio: {result["similarity"]:.0%} podobieństwa.',a=result['a'],b=result['b'])
        return result

    def folder_mappings(self):
        categories={'audio_library':('audio','samples','sample','media','sounds','library','biblioteka'),
                    'renders_stems':('stem','stems','bounce','render','export','mixdown','master'),
                    'recordings':('record','recordings','takes','nagran','vocal'),
                    'presets':('preset','presets','patch','patches'),
                    'projects':('session','sessions','project','projects','song','songs')}
        counts={}
        for p in self.audio:
            try:rel=p.parent.relative_to(self.root).as_posix()
            except ValueError:continue
            if rel=='.' or any(part.casefold().endswith('.logicx') for part in Path(rel).parts):continue
            counts[rel]=counts.get(rel,0)+1
        proposals=[]
        for rel,count in counts.items():
            parts=[x.casefold() for x in Path(rel).parts];matches=[]
            for category,keys in categories.items():
                hit=[part for part in parts if any(key in part for key in keys)]
                if hit:matches.append((len(hit),category,hit))
            if matches:
                n,category,hit=sorted(matches,reverse=True)[0];confidence=min(.98,.58+.12*n+(.12 if count>=10 else 0))
                proposals.append({'source':rel,'category':category,'confidence':round(confidence,2),'audioFiles':count,'matchedWords':sorted(set(hit)),'automatic':False})
        proposals.sort(key=lambda x:(-x['confidence'],-x['audioFiles'],x['source'].casefold()))
        return proposals[:100]

    def health_check(self,pid=None):
        if not self.projects:raise ValueError('Najpierw wykonaj skan.')
        if pid and pid not in self.projects:raise ValueError('Projekt spoza bieżącego skanu.')
        selected=[self.projects[pid]] if pid else list(self.projects.values());issues=[]
        for item in selected:
            for error in item.get('errors',[]):issues.append({'severity':'error','project':item['path'],'type':'parser','message':error})
            for warning in item.get('warnings',[]):issues.append({'severity':'warning','project':item['path'],'type':'project-warning','message':warning})
            seen_refs={}
            for r in item['refs']:
                if not r.get('exists'):issues.append({'severity':'error','project':item['path'],'type':'external' if r.get('external') else 'missing','message':f'{r["path"]} — {r["status"]}'})
                elif r.get('resolved'):seen_refs[r['resolved']]=seen_refs.get(r['resolved'],0)+1
            for path,count in seen_refs.items():
                if count>1:issues.append({'severity':'warning','project':item['path'],'type':'duplicate-reference','message':f'{path} użyte {count} razy'})
            checked=set()
            for r in item['refs']:
                if not r.get('resolved') or not r['resolved'].lower().endswith('.wav') or r['resolved'] in checked:continue
                checked.add(r['resolved'])
                if len(checked)>80:break
                try:
                    report=analyze_wav(self.root/r['resolved'])
                    if report['fullScaleSamples']:issues.append({'severity':'warning','project':item['path'],'type':'full-scale',
                        'message':f'{r["resolved"]}: {report["fullScaleSamples"]} próbek na pełnej skali (nie dowodzi clippingu)'})
                except Exception as exc:issues.append({'severity':'warning','project':item['path'],'type':'audio-analysis','message':f'{r["resolved"]}: {exc}'})
        result={'checkedProjects':len(selected),'issueCount':len(issues),'issues':issues[:1000],
                'summary':{level:sum(i['severity']==level for i in issues) for level in ('error','warning','info')},
                'note':'Pełna skala jest heurystyką próbek; XML parser errors są wykrywane podczas skanu. Nie mierzy LUFS ani true peak.'}
        self.emit('warning' if issues else 'success','health-check',f'Health Check: {len(selected)} projektów, {len(issues)} problemów.')
        return result

    def cross_sync(self,source_id,target_id):
        source,_=self.current(source_id);target,_=self.current(target_id)
        def track_hashes(item):
            out=[]
            for track in item['tracks']:
                hashes=set()
                for idx in track.get('refs',[]):
                    if idx>=len(item['refs']):continue
                    ref=item['refs'][idx]
                    if ref.get('resolved'):
                        try:hashes.add(self._hash(self.root/ref['resolved']))
                        except OSError:pass
                out.append(hashes)
            return out
        sh,th=track_hashes(source),track_hashes(target);matches=[];used=set()
        for i,a in enumerate(source['tracks']):
            best=None
            for j,b in enumerate(target['tracks']):
                if j in used:continue
                an,bn=str(a['name']).casefold().strip(),str(b['name']).casefold().strip();name_score=difflib.SequenceMatcher(None,an,bn).ratio()
                union=sh[i]|th[j];media_score=len(sh[i]&th[j])/len(union) if union else 0.
                score=.55*name_score+.45*media_score
                if best is None or score>best['score']:
                    best={'sourceTrack':i,'targetTrack':j,'sourceName':a['name'],'targetName':b['name'],'score':score,
                          'nameSimilarity':name_score,'sharedMedia':len(sh[i]&th[j]),'mediaSimilarity':media_score,'accepted':score>=.32}
            if best and best['score']>=.22:
                best['score']=round(best['score'],4);best['nameSimilarity']=round(best['nameSimilarity'],4);best['mediaSimilarity']=round(best['mediaSimilarity'],4)
                matches.append(best)
                if best['accepted']:used.add(best['targetTrack'])
        def marker_time(m,item):return self._to_seconds(m.get('position',0),m.get('unit'),item.get('tempoBpm'))
        sm={str(m.get('name','')).casefold():m for m in source['markers']};tm={str(m.get('name','')).casefold():m for m in target['markers']};marker_matches=[]
        for key in sorted(sm.keys()&tm.keys()):
            a,b=sm[key],tm[key];marker_matches.append({'name':a.get('name'),'sourceSeconds':marker_time(a,source),'targetSeconds':marker_time(b,target)})
        result={'source':self._timeline_summary(source),'target':self._timeline_summary(target),'trackMappings':matches,'markerMatches':marker_matches,
                'differences':{'tempoBpm':[source.get('tempoBpm'),target.get('tempoBpm')],'timeSignature':[source.get('timeSignature'),target.get('timeSignature')],
                               'markerCount':[len(source['markers']),len(target['markers'])]},
                'limitations':['Sugestie mapowania nazw/identycznych mediów, bez automatycznego zapisu do DAW.',
                               'Tempo-map, warping, automation, MIDI, routing i plug-iny nie są synchronizowane.',
                               'Timeline only includes fields parsed for each source format.']}
        self.emit('info','cross-sync',f'Porównano {source["path"]} ↔ {target["path"]}: {len(matches)} sugestii ścieżek.')
        return result

    def _timeline_summary(self,item):
        return {'id':item['id'],'project':item['path'],'daw':item['daw'],'tempoBpm':item.get('tempoBpm'),
                'timeSignature':item.get('timeSignature'),'markers':item['markers'],
                'timelineLengthSeconds':item.get('timelineLengthSeconds',0),'trackDurations':item.get('trackDurations',{}),
                'routing':item.get('routing',[]),
                'tracks':[{'name':t['name'],'kind':t.get('kind','track'),'plugins':t.get('plugins',[]),
                           'routing':t.get('routing',[]),'durationSeconds':item.get('trackDurations',{}).get(i,0),
                           'regions':[item['regions'][i] for i in t.get('regions',[]) if i<len(item['regions'])]} for i,t in enumerate(item['tracks'])]}

    def sync_export(self,source_id,target_id):
        data=self.cross_sync(source_id,target_id);data.update(version=2,generatedAt=dt.datetime.now().isoformat(),format='DAW Bridge neutral sync map')
        folder=self.root/'.dawbridge'/'exports';folder.mkdir(parents=True,exist_ok=True)
        name=f'cross-daw-sync-{dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.json';path=folder/name
        path.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf-8')
        event={'time':dt.datetime.now().isoformat(),'action':'cross-sync-export','project':data['source']['project'],'destination':path.relative_to(self.root).as_posix()}
        self.log(event);self.emit('success','cross-sync','Wyeksportowano neutralny sync map v2.')
        return {'file':event['destination'],'mappingCount':len(data['trackMappings']),'data':data}

    def session_export(self,pid,expected,sample_rate=48000,confirm=False):
        if confirm is not True:raise ValueError('Eksport stemów wymaga jawnego confirm=true.')
        item,project=self.current(pid,expected);self._assert_daw_closed(item,project)
        if not self.projects.get(pid):raise ValueError('Wykonaj skan.')
        if not item['regions']:raise ValueError('Brak sparsowanych regionów audio; nie można złożyć stemów.')
        if item.get('tempoMap'):raise ValueError('Projekt ma tempo mapę; MVP eksportuje tylko stałe tempo, aby nie przesunąć materiału.')
        output_root=self.root/'.dawbridge'/'exports';output_root.mkdir(parents=True,exist_ok=True)
        temp_dir=Path(tempfile.mkdtemp(prefix='stems-',dir=output_root))
        manifest={'version':3,'format':'DAW Bridge Neutral Session','sourceProject':item['path'],'daw':item['daw'],'projectHash':item.get('hash'),
                  'tempoBpm':item.get('tempoBpm'),'tempoMap':item.get('tempoMap',[]),'timeSignature':item.get('timeSignature'),
                  'markers':item['markers'],'regions':item['regions'],'tracks':item['tracks'],'routing':item.get('routing',[]),
                  'plugins':item.get('plugins',[]),'trackDurations':item.get('trackDurations',{}),
                  'timelineLengthSeconds':item.get('timelineLengthSeconds',0),'commonOriginSeconds':0,'sampleRate':sample_rate,
                  'metadata':{'project':item['name'],'parser':item.get('parser'),'support':item.get('support')},
                  'renderMode':'raw-source-media consolidation; no DAW/plugin rendering',
                  'warnings':['Nie są renderowane instrumenty, plug-iny, gain/pan, automatyka, fades, warp/stretch ani sidechain.',
                              'Nakładające się źródła są sumowane jako float WAV; sprawdź poziom i miks w DAW.'],
                  'stems':[],'exportedItems':{'stemFiles':[],'archiveFiles':[],'validatedSourceInputs':[]},'missingSourceWarnings':[]}
        open_maps=[];source_signatures={}
        try:
            used_track_regions={}
            for region in item['regions']: 
                if region.get('muted'):continue
                ti=int(region.get('track',0));ref_i=region.get('ref')
                if ref_i is None or not 0<=int(ref_i)<len(item['refs']):continue
                ref=item['refs'][int(ref_i)]
                if not ref.get('resolved'):raise ValueError(f'Brak lub ścieżka zewnętrzna: {ref["path"]}.')
                source=safe(self.root,self.root/ref['resolved'])
                try:
                    source_stat=source.stat()
                    if source.is_symlink() or not source.is_file() or source_stat.st_size<=0:
                        raise ValueError('source file missing, empty or unsafe')
                    signature=self.cache.get_ref(item['path'],str(ref.get('path',''))) or {}
                    if signature.get('size') is None or signature.get('mtimeNs') is None:
                        raise ValueError('source scan signature is unavailable; rescan')
                    if int(signature['size'])!=source_stat.st_size or int(signature['mtimeNs'])!=source_stat.st_mtime_ns:
                        raise ValueError('source changed since scan; rescan')
                    with sf.SoundFile(str(source)) as source_audio:
                        if len(source_audio)<=0 or source_audio.samplerate<=0 or source_audio.channels<=0:
                            raise ValueError('audio header is invalid')
                except Exception as exc:raise ValueError(f'Nieobsługiwany media source {ref["resolved"]}: {exc}') from exc
                source_signatures[source.relative_to(self.root).as_posix()]=(source_stat.st_size,source_stat.st_mtime_ns)
                start,length=region.get('startSeconds'),region.get('lengthSeconds')
                if start is None or length is None or length<=0:raise ValueError('Region bez możliwego do przeliczenia czasu; potrzebne stałe BPM.')
                used_track_regions.setdefault(ti,[]).append((region,source,float(start),float(length)))
            if not used_track_regions:raise ValueError('Brak regionów ze źródłami audio możliwymi do konsolidacji.')
            total_regions=0
            for ti,entries in sorted(used_track_regions.items()):
                track_name=item['tracks'][ti]['name'] if ti<len(item['tracks']) else f'Track {ti+1}'
                end=max(start+length for _,_,start,length in entries)
                if end>MAX_AUDIO_SECONDS:raise ValueError('Limit stemu: 30 minut od wspólnego początku.')
                frames=int(math.ceil(end*sample_rate));work=temp_dir/f'.work-{ti}.f32';estimated=frames*2*4
                if shutil.disk_usage(output_root).free<estimated*1.15:raise ValueError('Za mało miejsca na bezpieczne przygotowanie stemu float WAV.')
                mmap=np.memmap(work,dtype='float32',mode='w+',shape=(frames,2));open_maps.append(mmap);mmap[:]=0
                for region,source,start,length in entries:
                    if start<0:raise ValueError('Ujemny pre-roll nie jest obsługiwany w eksporcie MVP.')
                    with sf.SoundFile(str(source)) as audio:
                        source_rate,source_frames,channels=audio.samplerate,len(audio),audio.channels
                        source_offset=int(max(0,float(region.get('sourceOffset') or 0.))*source_rate)
                        out_start=int(round(start*sample_rate));out_count=min(int(round(length*sample_rate)),frames-out_start)
                        if out_count<=0:continue
                        chunk_out=max(1024,sample_rate*2);written=0
                        while written<out_count:
                            nout=min(chunk_out,out_count-written);x0=int(written*source_rate/sample_rate)
                            x1=min(source_frames-source_offset,int(math.ceil((written+nout)*source_rate/sample_rate))+2)
                            audio.seek(min(source_frames,source_offset+x0));chunk=audio.read(frames=max(0,x1-x0),dtype='float32',always_2d=True)
                            if not chunk.size:break
                            positions=np.arange(nout,dtype=np.float64)*source_rate/sample_rate+(written*source_rate/sample_rate)-x0
                            base=np.arange(len(chunk),dtype=np.float64)
                            left=np.interp(positions,base,chunk[:,0]);right=np.interp(positions,base,chunk[:,1] if channels>1 else chunk[:,0])
                            mmap[out_start+written:out_start+written+nout,0]+=left.astype('float32')
                            mmap[out_start+written:out_start+written+nout,1]+=right.astype('float32');written+=nout
                        total_regions+=1
                mmap.flush();mmap._mmap.close();open_maps.remove(mmap);del mmap
                safe_name=re.sub(r'[^A-Za-z0-9._ -]+','_',track_name).strip(' .')[:80] or f'Track {ti+1}'
                stem_name=f'{ti+1:02d}-{safe_name}.wav';stem=temp_dir/stem_name
                data=np.memmap(work,dtype='float32',mode='r',shape=(frames,2));open_maps.append(data)
                sf.write(str(stem),data,sample_rate,subtype='FLOAT',format='WAV')
                data._mmap.close();open_maps.remove(data);del data;work.unlink(missing_ok=True)
                manifest['stems'].append({'track':track_name,'file':stem_name,'regions':len(entries),'duration':round(frames/sample_rate,3)})
            manifest['regionsConsolidated']=total_regions
            for source_rel,signature in source_signatures.items():
                source=safe(self.root,self.root/source_rel);st=source.stat()
                if (st.st_size,st.st_mtime_ns)!=signature:
                    raise ValueError(f'Safe Mode: source changed during stem export ({source_rel}); export cancelled.')
            media_manifest=[]
            for ref in item.get('refs',[]):
                record={'sourcePath':ref.get('path'),'path':ref.get('resolved'),'exists':False}
                if ref.get('resolved'):
                    try:
                        media_path=safe(self.root,self.root/ref['resolved'])
                        if not media_path.is_file() or media_path.is_symlink():raise ValueError('source file no longer exists or is unsafe')
                        meta=self._audio_meta(media_path)
                        record.update(exists=True,size=media_path.stat().st_size,duration=meta.get('duration'),
                                      sampleRate=meta.get('sampleRate'),channels=meta.get('channels'))
                    except Exception as exc:record['metadataWarning']=str(exc)[:200]
                if not record['exists']:
                    manifest['missingSourceWarnings'].append({'sourcePath':record.get('sourcePath'),
                        'reason':record.get('metadataWarning') or 'Source unavailable at export time.'})
                media_manifest.append(record)
            manifest['media']=media_manifest
            manifest['exportedItems']={'stemFiles':[x['file'] for x in manifest['stems']],
                                       'archiveFiles':[x['file'] for x in manifest['stems']]+['session.json','manifest.json'],
                                       'validatedSourceInputs':[x for x in media_manifest if x.get('exists')]}
            neutral={'schema':'dawbridge.neutral-session','version':3,'generatedAt':dt.datetime.now().isoformat(),
                     'project':item['path'],'daw':item['daw'],'tempoBpm':item.get('tempoBpm'),
                     'timeSignature':item.get('timeSignature'),'tempoMap':item.get('tempoMap',[]),
                     'timelineLengthSeconds':item.get('timelineLengthSeconds',0),'markers':item['markers'],
                     'tracks':item['tracks'],'regions':item['regions'],'routing':item.get('routing',[]),
                     'plugins':item.get('plugins',[]),'stemFiles':[x['file'] for x in manifest['stems']],
                     'media':media_manifest,
                     'limitations':manifest['warnings']}
            (temp_dir/'session.json').write_text(json.dumps(neutral,indent=2,ensure_ascii=False),encoding='utf-8')
            (temp_dir/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
            self._assert_daw_closed(item,project)
            if self.project_snapshot_hash(project)!=item.get('hash'):raise ValueError('Safe Mode: projekt zmienił się podczas składania stemów; eksport przerwany.')
            archive_id=hashlib.sha256(f'{pid}:{time.time_ns()}'.encode()).hexdigest()[:20];archive=output_root/f'session-export-{archive_id}.zip'
            with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED,allowZip64=True) as z:
                for f in sorted(temp_dir.iterdir()):
                    if f.is_file() and not f.name.startswith('.work-'):z.write(f,f.name)
            with zipfile.ZipFile(archive) as check_zip:
                if check_zip.testzip() is not None:raise ValueError('Weryfikacja ZIP nie powiodła się.')
            self.downloads[archive_id]=archive
            event={'time':dt.datetime.now().isoformat(),'action':'session-export-plus','project':item['path'],
                   'destination':archive.relative_to(self.root).as_posix(),'regions':total_regions}
            self.log(event);self.emit('success','session-export',f'Złożono {len(manifest["stems"])} stems/raw-media WAV.',project=item['path'])
            return {'file':event['destination'],'downloadId':archive_id,'stems':manifest['stems'],'manifest':manifest}
        except Exception as exc:self.emit('error','session-export',str(exc),project=item['path']);raise
        finally:
            for mapped in open_maps:
                try:mapped._mmap.close()
                except Exception:pass
            shutil.rmtree(temp_dir,ignore_errors=True)

    def analyze_audio_path(self,rel):
        p=safe(self.root,self.root/str(rel))
        if p.suffix.casefold()!='.wav' or '.dawbridge' in p.relative_to(self.root).parts or not p.is_file():
            raise ValueError('Wybierz źródłowy WAV w folderze roboczym.')
        result=analyze_wav(p);self.emit('info','audio-analysis',f'Przeanalizowano WAV: {Path(rel).name}.');return result

    def get_settings(self):
        p=self.root/'.dawbridge'/'settings-v2.json'
        if p.exists():
            try:data=json.loads(p.read_text(encoding='utf-8'))
            except Exception:data={}
        else:
            legacy=self.root/'.dawbridge'/'settings.json'
            try:data=json.loads(legacy.read_text(encoding='utf-8')) if legacy.exists() else {}
            except Exception:data={}
        return {'version':2,'folderMappings':data.get('folderMappings',[]),'presets':data.get('presets',{}),
                'metadata':data.get('metadata',{}),'markers':data.get('markers',[]),'projectMappings':data.get('projectMappings',[])}

    def save_settings(self,data):
        if not isinstance(data,dict) or data.get('version') not in (1,2):raise ValueError('Oczekiwana wersja JSON 1 lub 2.')
        allowed={'version','folderMappings','presets','metadata','markers','projectMappings'}
        if set(data)-allowed:raise ValueError('Nieznane pole JSON v2.')
        out={'version':2,'folderMappings':data.get('folderMappings',[]),'presets':data.get('presets',{}),
             'metadata':data.get('metadata',{}),'markers':data.get('markers',[]),'projectMappings':data.get('projectMappings',[])}
        if not isinstance(out['folderMappings'],list) or not isinstance(out['markers'],list) or not isinstance(out['presets'],dict) or not isinstance(out['metadata'],dict) or not isinstance(out['projectMappings'],list):
            raise ValueError('Nieprawidłowy schemat JSON v2.')
        if any(len(v)>10000 for v in (out['folderMappings'],out['markers'],out['projectMappings'])):raise ValueError('Za dużo elementów JSON.')
        folder=self.root/'.dawbridge';folder.mkdir(exist_ok=True);tmp=folder/'settings-v2.tmp'
        tmp.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');os.replace(tmp,folder/'settings-v2.json')
        event={'time':dt.datetime.now().isoformat(),'action':'metadata-sync-v2','project':'Bridge library','destination':'.dawbridge/settings-v2.json'}
        self.log(event);self.emit('success','metadata-sync','Zapisano neutralne metadane Bridge v2.')
        return {'saved':True,'version':2,'note':'Neutralny JSON Bridge; nie zapisuje markerów/presetów do natywnych sesji DAW.'}

    def restore_backup(self,rel_backup,project_rel,confirm=False):
        if confirm is not True:raise ValueError('Odtworzenie backupu wymaga jawnego confirm=true.')
        backup=safe(self.root,self.root/str(rel_backup));target=safe(self.root,self.root/str(project_rel))
        backup_root=(self.root/'.dawbridge'/'backups').resolve()
        if not backup.is_relative_to(backup_root) or not backup.is_file():raise ValueError('Nieprawidłowa kopia zapasowa; wymagany jest plik pod .dawbridge/backups.')
        try:manifest=json.loads(backup.with_name(backup.name+'.manifest.json').read_text(encoding='utf-8'))
        except Exception as exc:raise ValueError(f'Backup nie ma czytelnego manifestu integralności: {exc}') from exc
        if manifest.get('schema')!='dawbridge.verified-backup' or manifest.get('version')!=1 or manifest.get('kind')!='file':
            raise ValueError('Backup nie ma wspieranego manifestu zweryfikowanego pliku.')
        if manifest.get('project')!=project_rel:raise ValueError('Manifest backupu wskazuje inny projekt.')
        if self._content_tree_hash(backup)!=manifest.get('backupContentHash'):
            raise ValueError('Backup nie przeszedł weryfikacji SHA-256; przywracanie zablokowane.')
        pid=next((i for i,x in self.projects.items() if x['path']==project_rel),None)
        if pid is None:raise ValueError('Projekt spoza ostatniego skanu.')
        item=self.projects[pid]
        if target.is_symlink() or not target.is_file():raise ValueError('Projekt docelowy musi być plikiem lokalnym.')
        self._assert_daw_closed(item,target);current=self.project_snapshot_hash(target)
        if current!=item.get('hash'):raise ValueError('Projekt zmienił się od skanu; przywracanie zablokowane.')
        if manifest.get('backupContentHash')==self._content_tree_hash(target):
            return {'restored':False,'message':'Backup jest już aktualną wersją.','verifiedBackup':True}
        newbackup=self._backup(target,item)
        fd,tmp=tempfile.mkstemp(dir=target.parent,prefix='.bridge-restore-',suffix=target.suffix)
        try:
            with os.fdopen(fd,'wb') as f:
                with open(backup,'rb') as src:shutil.copyfileobj(src,f)
                f.flush();os.fsync(f.fileno())
            if self._content_tree_hash(Path(tmp))!=manifest.get('backupContentHash'):
                raise ValueError('Weryfikacja tymczasowej kopii odtwarzanej nie powiodła się.')
            self._assert_daw_closed(item,target)
            if self.project_snapshot_hash(target)!=item['hash']:raise ValueError('Projekt zmienił się od skanu.')
            os.replace(tmp,target)
            if self._content_tree_hash(target)!=manifest.get('backupContentHash'):
                raise ValueError('Weryfikacja po odtworzeniu nie powiodła się; sprawdź kopię bezpieczeństwa.')
        finally:
            if os.path.exists(tmp):os.unlink(tmp)
        event={'time':dt.datetime.now().isoformat(),'action':'restore-backup','project':project_rel,'backup':rel_backup,
               'backupContentHash':manifest.get('backupContentHash'),'safetyBackup':newbackup.relative_to(self.root).as_posix(),
               'verified':True}
        self.log(event);self.emit('success','restore',f'Odtworzono zweryfikowany backup dla {project_rel}.');self.scan();return event


def analyze_wav(path:Path):
    with wave.open(str(path),'rb') as w:
        channels,width,rate,total=w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes()
        if width not in (1,2,3,4):raise ValueError('Obsługiwane PCM WAV: 8/16/24/32 bit; bez IEEE float.')
        if rate<=0 or total/rate>MAX_AUDIO_SECONDS:raise ValueError('Limit analizy: 30 minut na plik.')
        count=0;energy=0.;peak_i=0;clipped=0;envelope=[];scale=2**(width*8-1)
        while True:
            block=w.readframes(max(1,rate//5))
            if not block:break
            if width==1:values=np.frombuffer(block,dtype=np.uint8).astype(np.int32)-128
            elif width==2:values=np.frombuffer(block,dtype='<i2').astype(np.int32)
            elif width==3:
                b=np.frombuffer(block,dtype=np.uint8).reshape(-1,3).astype(np.int32)
                values=b[:,0]|(b[:,1]<<8)|(b[:,2]<<16);values=(values^0x800000)-0x800000
            else:values=np.frombuffer(block,dtype='<i4').astype(np.int64)
            if not values.size:continue
            absolute=np.abs(values.astype(np.int64));local_energy=float(np.dot(values.astype(np.float64),values.astype(np.float64)))
            energy+=local_energy;count+=int(values.size);peak_i=max(peak_i,int(absolute.max()));clipped+=int(np.count_nonzero(absolute>=scale-1))
            envelope.append(math.sqrt(local_energy/values.size)/scale)
        rms=math.sqrt(energy/count)/scale if count else 0.;peak=peak_i/scale
        db=lambda x:round(20*math.log10(x),2) if x>0 else None
        return {'file':path.name,'duration':round(total/rate,2),'channels':channels,'sampleRate':rate,'bits':width*8,
                'peakDbfs':db(peak),'rmsDbfs':db(rms),'crestDb':round(20*math.log10(peak/rms),2) if rms else None,
                'fullScaleSamples':clipped,'envelope':envelope,'sha256':digest(path),
                'tags':[('stereo' if channels==2 else 'mono' if channels==1 else 'multichannel'),str(rate)+'Hz',('full-scale' if clipped else 'no-full-scale')],
                'note':'Próbki pełnej skali nie dowodzą clippingu. RMS/crest nie są LUFS ani EBU. SHA-256 to identyczność bajtowa.'}


# DAW Bridge 3.0 adds isolated local analysis/automation methods without replacing
# the mature 2.0 parser and safety core.
from ultra_engine import install_ultra
install_ultra(Engine)
from god_engine import install_god
install_god(Engine)
