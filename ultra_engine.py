"""DAW Bridge 3.0 local heuristics and automation layer.

This module intentionally does not contact an AI service. The word "AI" in the
UI describes bounded, explainable local ranking/rule automation, not an LLM.
"""
from __future__ import annotations

import datetime as dt
import difflib
import hashlib
import json
import math
import os
import re
import tempfile
import time
from pathlib import Path, PureWindowsPath
from concurrent.futures import ThreadPoolExecutor

from ultra_audio import audio_fingerprint, estimate_tempo, fingerprint_components, producer_report, silence_markers


def install_ultra(engine_class):
    """Install the 3.0 methods after engine.py has defined its stable 2.0 core."""
    import engine as core

    def _fingerprint(self, p):
        p = core.safe(self.root, Path(p))
        if not p.is_file():
            raise ValueError('Audio nie istnieje lub jest poza root.')
        cached = self.cache.file(p)
        # Rebuild v2 signatures when first opened by v3 so cache migration is transparent.
        if cached.get('fingerprint') and cached['fingerprint'].get('bandEnergy') and cached['fingerprint'].get('spectralHash'):
            return cached['fingerprint']
        try:
            result = audio_fingerprint(p)
        except Exception as exc:
            raise ValueError(f'Nie udało się odczytać audio {p.name}: {exc}') from exc
        self.cache.put_file(p, fp=result)
        return result

    def technical_media_tags(self, path):
        """Return only measured/estimated technical tags; never infer semantic labels from filenames."""
        p = core.safe(self.root, Path(path))
        if p.suffix.casefold() not in core.AUDIO or not p.is_file() or p.is_symlink():
            raise ValueError('Wybierz czytelny plik audio w folderze roboczym.')
        tags = [f'source_type:{p.suffix.casefold().lstrip(".")}']
        details = {'sourceType': p.suffix.casefold().lstrip('.'), 'bpm': None, 'key': None,
                   'energyRmsDbfs': None, 'energyBand': None}
        try:
            profile = self._fingerprint(p)
            tempo = profile.get('rhythmTempo') or {}
            bpm = tempo.get('bpm')
            if bpm is not None and float(tempo.get('confidence') or 0) >= 0.04:
                details['bpm'] = round(float(bpm), 1)
                tags.append(f'bpm:{details["bpm"]:g}')
            tonality = profile.get('tonality') or {}
            key = tonality.get('key')
            mode = tonality.get('mode')
            if key and mode and float(tonality.get('confidence') or 0) >= 0.015:
                details['key'] = f'{key} {mode}'
                tags.append(f'key:{details["key"]}')
            rms = float(profile.get('rms') or 0.0)
            if rms > 0:
                rms_dbfs = 20.0 * math.log10(rms)
                band = 'low' if rms_dbfs < -30 else 'medium' if rms_dbfs < -16 else 'high'
                details['energyRmsDbfs'] = round(rms_dbfs, 2)
                details['energyBand'] = band
                tags.append(f'energy:{band}')
        except Exception as exc:
            details['analysisWarning'] = str(exc)[:180]
        return {'path': p.relative_to(self.root).as_posix(), 'tags': tags,
                'details': details,
                'note': 'Tagi techniczne: source type z rozszerzenia; BPM/key są lokalnymi estymacjami; energy to bucket z RMS, nie ocena percepcyjna.'}

    def fingerprint_similarity(a, b):
        return fingerprint_components(a, b)['similarity']

    def fingerprint_compare(self, path_a, path_b):
        a = core.safe(self.root, self.root / str(path_a))
        b = core.safe(self.root, self.root / str(path_b))
        if a.suffix.casefold() not in core.AUDIO or b.suffix.casefold() not in core.AUDIO or not a.is_file() or not b.is_file():
            raise ValueError('Wybierz dwa pliki audio wewnątrz folderu roboczego.')
        fa, fb = self._fingerprint(a), self._fingerprint(b)
        components = fingerprint_components(fa, fb)
        result = {
            'a': a.relative_to(self.root).as_posix(), 'b': b.relative_to(self.root).as_posix(),
            'similarity': round(components['similarity'], 4), 'components': components,
            'method': fa['method'], 'durationA': fa['duration'], 'durationB': fb['duration'],
            'sha256Identical': self._hash(a) == self._hash(b),
            'spectralHashA': fa.get('spectralHash'), 'spectralHashB': fb.get('spectralHash'),
            'caveat': 'Segmentacja RMS/peak i energia 8 pasm FFT; podobieństwo jest rankingiem, nie dowodem tożsamości audio.',
        }
        self.emit('info', 'fingerprint-pro', f'Waveform Fingerprinting Pro: {result["similarity"]:.0%}.',
                  a=result['a'], b=result['b'], spectral=components.get('spectral'))
        return result

    def folder_mappings(self):
        categories = {
            'audio_library': ('samples', 'sample library', 'audio library', 'audio', 'media', 'sounds', 'bibliotek', 'sample'),
            'renders_stems': ('stem', 'bounce', 'render', 'export', 'mixdown', 'master', 'print'),
            'recordings': ('record', 'takes', 'tracking', 'nagran', 'vocal', 'voice'),
            'presets': ('preset', 'patch', 'program', 'soundbank'),
            'impulse_responses': ('impulse', 'impulses', 'convolution', ' reverb', 'ir library'),
            'instruments': ('instrument', 'soundfont', 'sf2', 'sfz', 'kontakt', 'library'),
            'projects': ('session', 'sessions', 'project', 'projects', 'song', 'songs'),
            'midi_library': ('midi', 'midifiles', 'patterns', 'grooves'),
        }
        preset_ext = {'.fxp', '.fxb', '.vstpreset', '.aupreset', '.nksf', '.nki', '.adg', '.adv', '.fst'}
        instrument_ext = {'.sf2', '.sfz', '.nki', '.gig', '.dwp'}
        impulse_ext = {'.ir', '.wav', '.aif', '.aiff', '.flac'}
        midi_ext = {'.mid', '.midi'}
        inventory = {}
        for p in getattr(self, 'files', []):
            try:
                rel = p.relative_to(self.root)
            except (ValueError, OSError):
                continue
            if '.dawbridge' in rel.parts or any(part.casefold().endswith('.logicx') for part in rel.parts[:-1]):
                continue
            folder = rel.parent.as_posix()
            if folder in ('', '.'):
                continue
            row = inventory.setdefault(folder, {'files': 0, 'audioFiles': 0, 'presetFiles': 0,
                                                'instrumentFiles': 0, 'impulseFiles': 0, 'midiFiles': 0,
                                                'extensions': set()})
            ext = p.suffix.casefold()
            row['files'] += 1
            row['extensions'].add(ext)
            if ext in core.AUDIO:
                row['audioFiles'] += 1
            if ext in preset_ext:
                row['presetFiles'] += 1
            if ext in instrument_ext:
                row['instrumentFiles'] += 1
            if ext == '.ir' or ('impulse' in folder.casefold() and ext in impulse_ext):
                row['impulseFiles'] += 1
            if ext in midi_ext:
                row['midiFiles'] += 1
        proposals = []
        for folder, row in inventory.items():
            text = folder.casefold().replace('_', ' ').replace('-', ' ')
            matched = []
            scores = []
            for category, keys in categories.items():
                hits = [key.strip() for key in keys if key.strip() and key in text]
                if hits:
                    matched.extend(hits)
                    scores.append((len(hits), category, hits))
            ext_counts = {
                'presets': row['presetFiles'], 'instruments': row['instrumentFiles'],
                'impulse_responses': row['impulseFiles'], 'midi_library': row['midiFiles'],
            }
            for category, count in ext_counts.items():
                if count:
                    scores.append((min(3, count), category, ['file-extension evidence']))
            if row['audioFiles'] >= 2:
                scores.append((1, 'audio_library', ['audio files']))
            if not scores:
                continue
            scores.sort(key=lambda x: (x[0], x[1] in {'presets', 'impulse_responses', 'instruments'}), reverse=True)
            hits, category, evidence = scores[0]
            evidence_count = max(row['files'], 1)
            confidence = min(0.98, 0.48 + min(0.24, 0.09 * hits) + (0.12 if evidence[0] == 'file-extension evidence' else 0.0)
                             + (0.08 if evidence_count >= 10 else 0.0))
            extensions = sorted(x for x in row['extensions'] if x)
            proposals.append({
                'source': folder, 'category': category, 'confidence': round(confidence, 2),
                'files': row['files'], 'audioFiles': row['audioFiles'], 'presetFiles': row['presetFiles'],
                'instrumentFiles': row['instrumentFiles'], 'impulseFiles': row['impulseFiles'],
                'midiFiles': row['midiFiles'], 'matchedWords': sorted(set(matched + evidence)),
                'extensions': extensions[:20], 'automatic': False,
                'note': 'Propozycja lokalnej heurystyki; nic nie przeniesiono ani nie przemianowano.',
            })
        proposals.sort(key=lambda x: (-x['confidence'], -x['files'], x['source'].casefold()))
        return proposals[:200]

    def health_check(self, pid=None):
        if not self.projects:
            raise ValueError('Najpierw wykonaj skan.')
        if pid and str(pid) not in self.projects:
            raise ValueError('Projekt spoza bieżącego skanu.')
        selected = [self.projects[str(pid)]] if pid else list(self.projects.values())
        issues = []
        def issue(severity, item, kind, message, **extra):
            issues.append({'severity': severity, 'project': item['path'], 'type': kind, 'message': str(message)[:600], **extra})
        duplicate_lookup = {}
        try:
            for group in self.duplicates():
                for rel in group.get('files', []):
                    duplicate_lookup[rel] = group
        except Exception as exc:
            duplicate_lookup = {}
            for item in selected:
                issue('warning', item, 'duplicate-scan', f'Nie udało się dokończyć indeksu SHA duplikatów: {exc}')
        for item in selected:
            for error in item.get('errors', []):
                kind = 'xml-parse' if item.get('format') in {'.als', '.song', '.cpr'} else 'parser'
                issue('error', item, kind, error)
            for warning in item.get('warnings', []):
                issue('warning', item, 'project-warning', warning)
            seen_refs = {}
            used_paths = set()
            for ref in item.get('refs', []):
                value = str(ref.get('path') or '')
                if not value or len(value) > 2048 or any(ord(ch) < 32 for ch in value):
                    issue('error', item, 'invalid-reference', 'Odwołanie puste, nadmiernie długie lub zawiera znaki kontrolne.')
                if not ref.get('exists'):
                    kind = 'external' if ref.get('external') else 'missing'
                    issue('error', item, kind, f'{value or "(pusta ścieżka)"} — {ref.get("status", "brak")}', candidates=ref.get('candidates', [])[:5])
                elif ref.get('resolved'):
                    rel = ref['resolved']
                    used_paths.add(rel)
                    seen_refs[rel] = seen_refs.get(rel, 0) + 1
                    duplicate = duplicate_lookup.get(rel)
                    if duplicate:
                        issue('warning', item, 'duplicate-media', f'{rel}: identyczne bajty w {len(duplicate["files"])} lokalnych plikach.', files=duplicate['files'])
            for rel, count in seen_refs.items():
                if count > 1:
                    issue('warning', item, 'duplicate-reference', f'{rel} użyte {count} razy')
            track_count = len(item.get('tracks', []))
            for route in item.get('routing', []):
                source, target = route.get('sourceTrack'), route.get('targetTrack')
                if source is not None and (int(source) < 0 or int(source) >= track_count):
                    issue('error', item, 'invalid-routing', f'Routing wskazuje nieistniejącą ścieżkę źródłową {source}.', routing=route)
                elif target is not None and (int(target) < 0 or int(target) >= track_count):
                    issue('error', item, 'invalid-routing', f'Routing wskazuje nieistniejącą ścieżkę docelową {target}.', routing=route)
                elif route.get('confidence') != 'RPP parsed':
                    issue('info', item, 'routing-unverified', f'Routing {route.get("type", "route")} wykryty heurystycznie; cel nie został zweryfikowany.', routing=route)
            if item.get('tracks') and not item.get('routing'):
                issue('info', item, 'routing-unknown', 'Adapter nie dostarczył kompletnego grafu routingu; brak wpisu nie oznacza braku routingu.')
            plugin_names = []
            for plugin in item.get('plugins', []):
                name = plugin.get('name') if isinstance(plugin, dict) else str(plugin)
                if name and name not in plugin_names:
                    plugin_names.append(str(name))
            for track in item.get('tracks', []):
                for plugin in track.get('plugins', []):
                    name = plugin.get('name') if isinstance(plugin, dict) else str(plugin)
                    if name and name not in plugin_names:
                        plugin_names.append(str(name))
            for name in plugin_names[:80]:
                issue('info', item, 'plugin-unverified', f'{name}: zależność wykryta, instalacja/kompatybilność nie jest sprawdzana lokalnie.')
            for region in item.get('regions', []):
                try:
                    ti = int(region.get('track', -1))
                    if ti < 0 or ti >= track_count:
                        issue('error', item, 'invalid-region-track', f'Region {region.get("name", "")} wskazuje nieistniejącą ścieżkę {ti}.')
                    if float(region.get('length', 0)) < 0 or float(region.get('start', 0)) < 0:
                        issue('warning', item, 'invalid-region', f'Region {region.get("name", "")} ma ujemny start lub długość.')
                    ref_i = region.get('ref')
                    if ref_i is not None and not 0 <= int(ref_i) < len(item.get('refs', [])):
                        issue('error', item, 'invalid-region-reference', f'Region {region.get("name", "")} wskazuje nieistniejący indeks media.')
                except (TypeError, ValueError):
                    issue('warning', item, 'invalid-region', 'Pola regionu nie są numeryczne.')
            for rel in sorted(used_paths):
                try:
                    path = core.safe(self.root, self.root / rel)
                except (ValueError, OSError):
                    issue('error', item, 'external', f'{rel}: zmienił się cel symlink/ścieżki poza root po skanie.')
                    continue
                if not path.is_file() or path.suffix.casefold() not in core.AUDIO:
                    continue
                try:
                    report = producer_report(path)
                    if report['nearFullScaleSamples']:
                        issue('warning', item, 'full-scale',
                              f'{rel}: {report["nearFullScaleSamples"]} próbek ≥ −0.01 dBFS; nie jest to dowód clippingu/true-peak.')
                    if report['peakDbfs'] is not None and report['peakDbfs'] > 0:
                        issue('error', item, 'over-full-scale', f'{rel}: próbki przekraczają 0 dBFS w pliku float.')
                except Exception as exc:
                    issue('warning', item, 'audio-analysis', f'{rel}: {exc}')
        summary = {level: sum(row['severity'] == level for row in issues) for level in ('error', 'warning', 'info')}
        result = {
            'checkedProjects': len(selected), 'issueCount': len(issues), 'issues': issues[:1500], 'summary': summary,
            'coverage': {'missingAndExternalRefs': True, 'xmlAndParserErrors': True, 'sha256DuplicateFiles': True,
                         'samplePeakAndRms': True, 'routingReferences': 'only when parser exposes them',
                         'pluginInstallState': False, 'truePeakAndLUFS': False},
            'note': 'Raport obejmuje dane udostępnione przez parsery. Pluginy są oznaczone jako niezweryfikowane; Bridge nie skanuje rejestru/systemowych katalogów. Próbki blisko pełnej skali nie dowodzą clippingu; brak LUFS/true-peak i oceny odsłuchowej.',
        }
        self.emit('warning' if summary['error'] or summary['warning'] else 'success', 'health-check-pro',
                  f'Health Check Pro: {len(selected)} projektów, {len(issues)} wpisów.', issues=len(issues))
        return result

    def cross_sync(self, source_id, target_id):
        source, _ = self.current(source_id)
        target, _ = self.current(target_id)
        def track_hashes(item):
            rows = []
            for track in item.get('tracks', []):
                hashes = set()
                for idx in track.get('refs', []):
                    if 0 <= idx < len(item.get('refs', [])):
                        rel = item['refs'][idx].get('resolved')
                        if rel:
                            try:
                                hashes.add(self._hash(self.root / rel))
                            except OSError:
                                pass
                rows.append(hashes)
            return rows
        sh, th = track_hashes(source), track_hashes(target)
        matches, used = [], set()
        source_to_target = {}
        for i, a in enumerate(source.get('tracks', [])):
            best = None
            for j, b in enumerate(target.get('tracks', [])):
                if j in used:
                    continue
                an, bn = str(a.get('name', '')).casefold().strip(), str(b.get('name', '')).casefold().strip()
                name_score = difflib.SequenceMatcher(None, an, bn).ratio()
                union = sh[i] | th[j]
                media_score = len(sh[i] & th[j]) / len(union) if union else 0.0
                score = 0.52 * name_score + 0.48 * media_score
                if best is None or score > best['score']:
                    best = {'sourceTrack': i, 'targetTrack': j, 'sourceName': a.get('name', f'Track {i+1}'),
                            'targetName': b.get('name', f'Track {j+1}'), 'score': score,
                            'nameSimilarity': name_score, 'sharedMedia': len(sh[i] & th[j]),
                            'mediaSimilarity': media_score,
                            'sourceLengthSeconds': source.get('trackDurations', {}).get(i, 0),
                            'targetLengthSeconds': target.get('trackDurations', {}).get(j, 0)}
            if best and best['score'] >= 0.22:
                best['accepted'] = best['score'] >= 0.42
                if best['accepted']:
                    source_to_target[i] = best['targetTrack']
                    used.add(best['targetTrack'])
                source_len, target_len = best['sourceLengthSeconds'], best['targetLengthSeconds']
                best['lengthDifferenceSeconds'] = round(float(target_len or 0) - float(source_len or 0), 4)
                for key in ('score', 'nameSimilarity', 'mediaSimilarity'):
                    best[key] = round(best[key], 4)
                matches.append(best)
        def marker_seconds(marker, item):
            return self._to_seconds(marker.get('position', 0), marker.get('unit'), item.get('tempoBpm'))
        source_markers = {str(m.get('name', '')).casefold(): m for m in source.get('markers', [])}
        target_markers = {str(m.get('name', '')).casefold(): m for m in target.get('markers', [])}
        marker_matches = []
        for key in sorted(source_markers.keys() & target_markers.keys()):
            a, b = source_markers[key], target_markers[key]
            marker_matches.append({'name': a.get('name'), 'sourceSeconds': marker_seconds(a, source),
                                   'targetSeconds': marker_seconds(b, target)})
        def route_key(route, item, side):
            source_track, target_track = route.get('sourceTrack'), route.get('targetTrack')
            if source_track is not None or target_track is not None:
                tracks = item.get('tracks', [])
                sn = tracks[int(source_track)].get('name') if source_track is not None and 0 <= int(source_track) < len(tracks) else str(source_track)
                tn = tracks[int(target_track)].get('name') if target_track is not None and 0 <= int(target_track) < len(tracks) else str(target_track)
                return (str(sn).casefold(), str(tn).casefold(), str(route.get('type', 'route')))
            return (str(route.get('track', '')).casefold(), str(route.get('target', '')).casefold(), str(route.get('type', 'route')))
        routes_source = {route_key(r, source, 'source') for r in source.get('routing', [])}
        routes_target = {route_key(r, target, 'target') for r in target.get('routing', [])}
        routing_matches = []
        for src_idx, tgt_idx in source_to_target.items():
            src_routes = [r for r in source.get('routing', []) if r.get('sourceTrack') == src_idx or r.get('targetTrack') == src_idx]
            tgt_routes = [r for r in target.get('routing', []) if r.get('sourceTrack') == tgt_idx or r.get('targetTrack') == tgt_idx]
            for route in src_routes:
                routing_matches.append({'sourceTrack': source['tracks'][src_idx].get('name'),
                                        'targetTrack': target['tracks'][tgt_idx].get('name'),
                                        'sourceRouting': route, 'targetRoutingCandidates': tgt_routes,
                                        'confidence': 'heuristic; review manually'})
        result = {
            'schema': 'dawbridge.cross-daw-sync-pro', 'version': 3,
            'source': self._timeline_summary(source), 'target': self._timeline_summary(target),
            'trackMappings': matches, 'markerMatches': marker_matches, 'routingSuggestions': routing_matches,
            'differences': {
                'tempoBpm': [source.get('tempoBpm'), target.get('tempoBpm')],
                'timeSignature': [source.get('timeSignature'), target.get('timeSignature')],
                'markerCount': [len(source.get('markers', [])), len(target.get('markers', []))],
                'trackCount': [len(source.get('tracks', [])), len(target.get('tracks', []))],
                'timelineLengthSeconds': [source.get('timelineLengthSeconds', 0), target.get('timelineLengthSeconds', 0)],
                'routingEdgeCount': [len(source.get('routing', [])), len(target.get('routing', []))],
            },
            'timelineAlignment': {'originSeconds': 0, 'sourceLengthSeconds': source.get('timelineLengthSeconds', 0),
                                  'targetLengthSeconds': target.get('timelineLengthSeconds', 0),
                                  'scaleSuggestion': None if not source.get('timelineLengthSeconds') else round(float(target.get('timelineLengthSeconds', 0)) / max(float(source['timelineLengthSeconds']), 1e-9), 5)},
            'limitations': [
                'Wynik to neutralna propozycja, nie zapis do natywnego DAW.',
                'Routing jest porównywany wyłącznie tam, gdzie adapter parsera go ujawnił; nazwy/indeksy wymagają ręcznej kontroli.',
                'Nie są synchronizowane pluginy, presety, automatyzacja, MIDI, warping, sidechain ani zachowanie mixerów.',
                'Timeline obejmuje wyłącznie parsowane regiony i stałe tempo; wynik zależy od wersji/formatu parsera.',
            ],
        }
        self.emit('info', 'cross-sync-pro', f'Porównano projekty: {len(matches)} propozycji ścieżek, {len(routing_matches)} wskazówek routing.',
                  source=source['path'], target=target['path'])
        return result

    def sync_export(self, source_id, target_id):
        data = self.cross_sync(source_id, target_id)
        data['generatedAt'] = dt.datetime.now().isoformat()
        folder = self.root / '.dawbridge' / 'exports'
        folder.mkdir(parents=True, exist_ok=True)
        name = f'cross-daw-sync-v3-{dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.json'
        path = folder / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
        event = {'time': dt.datetime.now().isoformat(), 'action': 'cross-sync-export-v3',
                 'project': data['source']['project'], 'destination': path.relative_to(self.root).as_posix()}
        self.log(event)
        self.emit('success', 'cross-sync-pro', 'Wyeksportowano neutralną mapę sync v3.')
        return {'file': event['destination'], 'mappingCount': len(data['trackMappings']), 'data': data}

    def _timeline_summary(self, item):
        return {
            'id': item['id'], 'project': item['path'], 'daw': item['daw'], 'tempoBpm': item.get('tempoBpm'),
            'timeSignature': item.get('timeSignature'), 'markers': item.get('markers', []),
            'tempoMap': item.get('tempoMap', []), 'timelineLengthSeconds': item.get('timelineLengthSeconds', 0),
            'trackDurations': item.get('trackDurations', {}), 'routing': item.get('routing', []),
            'tracks': [{'name': t.get('name', f'Track {i+1}'), 'kind': t.get('kind', 'track'),
                        'plugins': t.get('plugins', []), 'routing': t.get('routing', []),
                        'durationSeconds': item.get('trackDurations', {}).get(i, 0),
                        'regions': [item['regions'][j] for j in t.get('regions', []) if 0 <= j < len(item.get('regions', []))]}
                       for i, t in enumerate(item.get('tracks', []))],
        }

    def _metadata_file(self):
        return self.root / '.dawbridge' / 'settings-v3.json'

    def _read_metadata_raw(self):
        folder = self.root / '.dawbridge'
        for name in ('settings-v3.json', 'settings-v2.json', 'settings.json'):
            path = folder / name
            if path.is_file():
                try:
                    data = json.loads(path.read_text(encoding='utf-8'))
                    if isinstance(data, dict):
                        return data
                except (OSError, json.JSONDecodeError):
                    continue
        return {}

    def get_settings(self):
        data = self._read_metadata_raw()
        result = {
            'version': 3,
            'folderMappings': data.get('folderMappings', []),
            'presets': data.get('presets', {}),
            'metadata': data.get('metadata', {}),
            'markers': data.get('markers', []),
            'projectMappings': data.get('projectMappings', []),
            'tags': data.get('tags', {}),
            'automation': {**{'runOnChange': False, 'autoFingerprintNewMedia': False, 'autoTagNewMedia': False},
                            **(data.get('automation', {}) if isinstance(data.get('automation'), dict) else {})},
            'history': self.history()[:100] if hasattr(self, 'history') else [],
            'snapshots': self.snapshot_history()[:100] if hasattr(self, 'snapshot_history') else [],
        }
        # Carry forward user-provided optional v3 fields without allowing them to replace the live audit log.
        preferences = data.get('preferences', {}) if isinstance(data.get('preferences'), dict) else {}
        scan_mode = preferences.get('scanMode')
        if scan_mode not in {'turbo', 'full', 'deep'}:
            scan_mode = 'turbo' if preferences.get('lightMode') is True else 'full'
        result['preferences'] = {**preferences, 'scanMode': scan_mode,
                                 'lightMode': scan_mode == 'turbo',
                                 'logLevel': preferences.get('logLevel') if preferences.get('logLevel') in {'info', 'debug'} else 'info'}
        return result

    def save_settings(self, data):
        if not isinstance(data, dict) or data.get('version') not in (1, 2, 3):
            raise ValueError('Oczekiwana wersja Bridge JSON 1, 2 lub 3.')
        allowed = {'version', 'folderMappings', 'presets', 'metadata', 'markers', 'projectMappings',
                   'tags', 'automation', 'history', 'snapshots', 'preferences'}
        if set(data) - allowed:
            raise ValueError('Nieznane pole JSON Metadata Sync v3.')
        out = {
            'version': 3,
            'folderMappings': data.get('folderMappings', []),
            'presets': data.get('presets', {}), 'metadata': data.get('metadata', {}),
            'markers': data.get('markers', []), 'projectMappings': data.get('projectMappings', []),
            'tags': data.get('tags', {}), 'automation': data.get('automation', {}),
            'preferences': data.get('preferences', {}),
        }
        if (not isinstance(out['folderMappings'], list) or not isinstance(out['markers'], list)
                or not isinstance(out['projectMappings'], list) or not isinstance(out['presets'], dict)
                or not isinstance(out['metadata'], dict) or not isinstance(out['tags'], (dict, list))
                or not isinstance(out['automation'], dict) or not isinstance(out['preferences'], dict)):
            raise ValueError('Nieprawidłowy schemat JSON v3.')
        legacy_turbo = out['preferences'].get('lightMode') is True
        out['preferences'] = {'scanMode': 'turbo' if legacy_turbo else 'full',
                              'lightMode': legacy_turbo, 'logLevel': 'info', **out['preferences']}
        if (not isinstance(out['preferences'].get('lightMode'), bool)
                or out['preferences'].get('scanMode') not in {'turbo', 'full', 'deep'}
                or out['preferences'].get('logLevel') not in {'info', 'debug'}):
            raise ValueError('Preferences: scanMode to turbo/full/deep, logLevel to info/debug.')
        out['preferences']['lightMode'] = out['preferences']['scanMode'] == 'turbo'
        automation_keys = {'runOnChange', 'autoFingerprintNewMedia', 'autoTagNewMedia'}
        if set(out['automation']) - automation_keys or any(not isinstance(v, bool) for v in out['automation'].values()):
            raise ValueError('Nieprawidłowe przełączniki automatyzacji JSON v3.')
        out['automation'] = {'runOnChange': False, 'autoFingerprintNewMedia': False, 'autoTagNewMedia': False, **out['automation']}
        if any(len(v) > 10000 for v in (out['folderMappings'], out['markers'], out['projectMappings'])):
            raise ValueError('Za dużo elementów w JSON v3.')
        for key in ('markers', 'folderMappings', 'projectMappings'):
            encoded = json.dumps(out[key], ensure_ascii=False)
            if len(encoded) > 750_000:
                raise ValueError(f'Pole {key} przekracza limit JSON v3.')
        folder = self.root / '.dawbridge'
        folder.mkdir(exist_ok=True)
        target = self._metadata_file()
        fd, temp_name = tempfile.mkstemp(dir=folder, prefix='.settings-v3-', suffix='.tmp')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(out, stream, ensure_ascii=False, indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, target)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        event = {'time': dt.datetime.now().isoformat(), 'action': 'metadata-sync-v3',
                 'project': 'Bridge library', 'destination': '.dawbridge/settings-v3.json'}
        self.log(event)
        self.emit('success', 'metadata-sync-v3', 'Zapisano neutralne metadane Bridge v3.')
        return {'saved': True, 'version': 3, 'note': 'JSON v3 jest metadanymi Bridge; nie zapisuje markerów/presetów do natywnych sesji DAW.'}

    def _load_snapshots(self):
        path = self.root / '.dawbridge' / 'snapshots.jsonl'
        self._snapshots = []
        if path.is_file():
            try:
                for line in path.read_text(encoding='utf-8', errors='replace').splitlines()[-1000:]:
                    try:
                        entry = json.loads(line)
                        if isinstance(entry, dict):
                            self._snapshots.append(entry)
                    except json.JSONDecodeError:
                        continue
            except OSError:
                pass
        self._snapshot_keys = {(x.get('project'), x.get('hash')) for x in self._snapshots}

    def snapshot_history(self):
        return list(reversed(self._snapshots[-500:]))

    def _record_project_snapshots(self, projects):
        path = self.root / '.dawbridge' / 'snapshots.jsonl'
        path.parent.mkdir(parents=True, exist_ok=True)
        changed = []
        for item in projects.values():
            key = (item.get('path'), item.get('hash'))
            if not item.get('hash') or key in self._snapshot_keys:
                continue
            entry = {
                'id': hashlib.sha256(f'{key[0]}\0{key[1]}'.encode()).hexdigest()[:20],
                'capturedAt': dt.datetime.now().isoformat(timespec='seconds'), 'project': item.get('path'),
                'hash': item.get('hash'), 'daw': item.get('daw'), 'tempoBpm': item.get('tempoBpm'),
                'tracks': len(item.get('tracks', [])), 'regions': len(item.get('regions', [])),
                'markers': len(item.get('markers', [])), 'refs': len(item.get('refs', [])),
                'missing': sum(not r.get('exists') for r in item.get('refs', [])), 'source': 'scan',
            }
            changed.append(entry)
            self._snapshot_keys.add(key)
            self._snapshots.append(entry)
        if changed:
            with open(path, 'a', encoding='utf-8') as stream:
                for entry in changed:
                    stream.write(json.dumps(entry, ensure_ascii=True) + '\n')
            self._snapshots = self._snapshots[-1000:]

    def create_snapshot(self, pid):
        item, project = self.current(pid)
        folder = self.root / '.dawbridge' / 'snapshots'
        folder.mkdir(parents=True, exist_ok=True)
        now = dt.datetime.now().isoformat(timespec='seconds')
        snapshot = {
            'schema': 'dawbridge.project-snapshot', 'version': 3, 'capturedAt': now,
            'project': item['path'], 'hash': item.get('hash'), 'daw': item['daw'],
            'parser': item.get('parser'), 'tempoBpm': item.get('tempoBpm'),
            'timeSignature': item.get('timeSignature'), 'timelineLengthSeconds': item.get('timelineLengthSeconds', 0),
            'tracks': item.get('tracks', []), 'regions': item.get('regions', []), 'markers': item.get('markers', []),
            'routing': item.get('routing', []), 'plugins': item.get('plugins', []), 'refs': item.get('refs', []),
        }
        stamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        name = f'{item["id"]}-{stamp}.json'
        out = folder / name
        out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding='utf-8')
        summary = {'id': hashlib.sha256(f'{item["path"]}\0{item.get("hash")}\0{now}'.encode()).hexdigest()[:20],
                   'capturedAt': now, 'project': item['path'], 'hash': item.get('hash'),
                   'file': out.relative_to(self.root).as_posix(), 'source': 'manual'}
        self._snapshots.append(summary)
        self._snapshot_keys.add((item['path'], item.get('hash')))
        with open(self.root / '.dawbridge' / 'snapshots.jsonl', 'a', encoding='utf-8') as stream:
            stream.write(json.dumps(summary, ensure_ascii=True) + '\n')
        self.log({'time': now, 'action': 'project-snapshot', 'project': item['path'], 'destination': summary['file']})
        self.emit('success', 'snapshot', f'Utworzono snapshot: {item["path"]}.')
        return summary

    def watcher_status(self):
        state = dict(getattr(self, '_watch_state', {}) or {})
        state['dirtyProjects'] = sorted(set(state.get('dirtyProjects', [])))
        state['conflicts'] = sorted(set(getattr(self, 'watch_conflicts', set())))
        return state

    def start_watcher(self, interval=4.0):
        if self._watch_thread and self._watch_thread.is_alive():
            return self.watcher_status()
        self._watch_interval = max(1.0, min(30.0, float(interval)))
        self._watch_stop.clear()
        try:
            self._watch_snapshot_data = self._watch_file_state()
            self._watch_state['lastError'] = None
        except Exception as exc:
            self._watch_snapshot_data = {}
            self._watch_state['lastError'] = str(exc)[:300]
            self.emit('warning', 'watcher', f'Nie można zainicjować folder watchera: {exc}')
        self._watch_state.update(enabled=True, lastPoll=dt.datetime.now().isoformat(timespec='seconds'),
                                 files=len(self._watch_snapshot_data), dirtyProjects=[])
        self._watch_thread = __import__('threading').Thread(target=self._watch_loop, name='DAWBridgeFolderWatcher', daemon=True)
        self._watch_thread.start()
        self.emit('info', 'watcher', f'Folder watcher aktywny; interwał {self._watch_interval:g} s.')
        return self.watcher_status()

    def stop_watcher(self):
        self._watch_stop.set()
        thread = getattr(self, '_watch_thread', None)
        if thread and thread.is_alive():
            thread.join(timeout=2.0)
        self._watch_state['enabled'] = False
        return self.watcher_status()

    def _watch_file_state(self):
        found = {}
        count = 0
        def walk_error(exc):raise ValueError(f'Watcher nie może sprawdzić całego folderu: {exc}')
        for base, dirs, names in os.walk(self.root, followlinks=False, onerror=walk_error):
            dirs[:] = [name for name in dirs if name not in {'.dawbridge', '.git', 'node_modules', '__pycache__'}
                       and not (Path(base) / name).is_symlink()
                       and not (hasattr(Path(base) / name, 'is_junction') and (Path(base) / name).is_junction())]
            for name in names:
                p = Path(base) / name
                if p.is_symlink() or not p.is_file():
                    continue
                try:
                    st = p.stat()
                    rel = p.relative_to(self.root).as_posix()
                    found[rel] = (st.st_size, st.st_mtime_ns)
                    count += 1
                    if count > 50000:
                        raise ValueError('Limit watcher: 50 000 plików.')
                except OSError as exc:
                    raise ValueError(f'Watcher nie może sprawdzić pliku {p.name}: {exc}') from exc
        return found

    @staticmethod
    def _watch_kind(rel):
        parts = Path(rel).parts
        for i, part in enumerate(parts):
            if part.casefold().endswith('.logicx'):
                bundle = Path(*parts[:i + 1]).as_posix()
                return ('project' if Path(rel).suffix.casefold() not in {'.wav', '.aif', '.aiff', '.flac', '.mp3', '.ogg', '.m4a', '.opus'}
                        else 'media-in-project'), bundle
        ext = Path(rel).suffix.casefold()
        if ext in {'.rpp', '.flp', '.als', '.cpr', '.song'}:
            return 'project', rel
        if ext in {'.wav', '.aif', '.aiff', '.flac', '.mp3', '.ogg', '.m4a', '.opus'}:
            return 'media', None
        return 'file', None

    def _auto_on_change(self, ready_paths):
        policy = self._read_metadata_raw().get('automation', {})
        if not isinstance(policy, dict) or not policy.get('runOnChange'):
            return
        if not policy.get('autoFingerprintNewMedia') and not policy.get('autoTagNewMedia'):
            return
        if not self._watch_auto_lock.acquire(blocking=False):
            self.emit('warning', 'automation-queue', 'Zmiana wykryta, ale trwa inna automatyzacja; wykonaj skan lub uruchom workflow ręcznie.')
            return
        try:
            for rel in ready_paths[:30]:
                try:
                    path = core.safe(self.root, self.root / rel)
                    if path.suffix.casefold() not in core.AUDIO or not path.is_file():
                        continue
                    if policy.get('autoFingerprintNewMedia'):
                        self._hash(path)
                        self._fingerprint(path, priority=1)
                        self.emit('success', 'auto-fingerprint-change', f'Automatycznie zindeksowano stabilny plik: {rel}.', path=rel)
                    if policy.get('autoTagNewMedia'):
                        tag_result = self.technical_media_tags(path)
                        settings = self.get_settings()
                        tag_map = settings.get('tags', {})
                        if not isinstance(tag_map, dict):
                            tag_map = {}
                        tag_map[rel] = tag_result['tags']
                        settings['tags'] = tag_map
                        settings['metadata'] = {**settings.get('metadata', {}), 'autoTaggingUpdatedAt': dt.datetime.now().isoformat()}
                        self.save_settings(settings)
                        self.emit('success', 'auto-tagging-change', f'Zapisano wyłącznie tagi techniczne: {rel}.', path=rel,
                                  tags=tag_result['tags'])
                except Exception as exc:
                    self.emit('warning', 'automation-change-warning', f'{rel}: automatyzacja nie została wykonana ({exc}).', path=rel)
        finally:
            self._watch_auto_lock.release()

    def _poll_watch(self):
        now = dt.datetime.now().isoformat(timespec='seconds')
        current = self._watch_file_state()
        previous = self._watch_snapshot_data
        changes = []
        for rel in current.keys() - previous.keys():
            changes.append(('added', rel))
        for rel in previous.keys() - current.keys():
            changes.append(('removed', rel))
        for rel in current.keys() & previous.keys():
            if current[rel] != previous[rel]:
                changes.append(('modified', rel))
        dirty = set(self._watch_state.get('dirtyProjects', []))
        changed_this_poll = set()
        for change, rel in changes:
            kind, _ = self._watch_kind(rel)
            if kind == 'media' and change in {'added', 'modified'} and rel in current:
                self._watch_pending[rel] = {'signature': current[rel], 'stable': 0}
                changed_this_poll.add(rel)
            elif change == 'removed':
                self._watch_pending.pop(rel, None)
        ready_paths = []
        for rel, pending in list(self._watch_pending.items()):
            signature = current.get(rel)
            if signature is None:
                self._watch_pending.pop(rel, None)
            elif signature != pending['signature']:
                pending.update(signature=signature, stable=0)
                changed_this_poll.add(rel)
            elif rel not in changed_this_poll:
                pending['stable'] += 1
                if pending['stable'] >= 1:
                    ready_paths.append(rel)
                    self._watch_pending.pop(rel, None)
        for change, rel in sorted(changes)[:200]:
            kind, bundle = self._watch_kind(rel)
            project_rel = bundle or (rel if kind == 'project' else None)
            if project_rel:
                dirty.add(project_rel)
                self.watch_conflicts.add(project_rel)
                level = 'warning'
                message = f'{change}: projekt DAW zmienił się poza Bridge; wymagany ponowny skan.'
            else:
                level = 'info' if change == 'added' else 'warning'
                message = f'{change}: {kind} {rel}; wykonaj skan, by odświeżyć indeks.'
            self.emit(level, 'watch-change', message, path=rel, project=project_rel, change=change, kind=kind)
        self._watch_snapshot_data = current
        self._watch_state.update(enabled=True, lastPoll=now, lastError=None, files=len(current), changes=int(self._watch_state.get('changes', 0)) + len(changes),
                                 polls=int(self._watch_state.get('polls', 0)) + 1, dirtyProjects=sorted(dirty))
        if self.state:
            self.state['watcher'] = self.watcher_status()
        if ready_paths:
            self._auto_on_change(ready_paths)
        return changes

    def _watch_loop(self):
        while not self._watch_stop.wait(self._watch_interval):
            try:
                self._poll_watch()
            except Exception as exc:
                self._watch_state['lastError'] = str(exc)[:300]
                self.emit('warning', 'watcher', f'Folder watcher nie wykonał cyklu: {exc}')

    def close(self):
        self.stop_watcher()
        self.cache.close()

    def performance_stats(self):
        with self._perf_lock:
            perf = dict(self._perf)
        with self.cache.lock:
            cache = dict(self.cache.stats)
        try:
            with self.cache.lock:
                rows = self.cache.db.execute('SELECT COUNT(*) FROM files').fetchone()[0]
        except Exception:
            rows = 0
        load = {'processCpuPercent': None, 'processRssBytes': None, 'processMemoryPercent': None, 'processThreads': None}
        try:
            if core.psutil is not None:
                process = core.psutil.Process()
                with process.oneshot():
                    load = {'processCpuPercent': round(process.cpu_percent(interval=None), 1),
                            'processRssBytes': int(process.memory_info().rss),
                            'processMemoryPercent': round(process.memory_percent(), 2),
                            'processThreads': int(process.num_threads())}
        except Exception:
            pass
        return {
            **perf, 'cache': cache, 'cacheRows': rows, 'load': load,
            'indexedFiles': len(getattr(self, 'files', [])), 'audioFiles': len(getattr(self, 'audio', [])),
            'watcherPolls': self._watch_state.get('polls', 0),
        }

    def producer_analysis(self, rel):
        p = core.safe(self.root, self.root / str(rel))
        if (p.suffix.casefold() not in core.AUDIO or '.dawbridge' in p.relative_to(self.root).parts
                or not p.is_file() or p.is_symlink()):
            raise ValueError('Wybierz czytelne audio wewnątrz wybranego folderu roboczego.')
        result = producer_report(p)
        result['sha256'] = self._hash(p)
        result['reportType'] = 'local technical measurements and threshold-based flags'
        result['listeningRequired'] = True
        result['limitations'] = ['Not a replacement for listening or DAW metering.',
                                 'No loudness standard LUFS, true-peak, mastering advice, or artistic assessment.',
                                 'Flags are prompts to verify in context, not diagnoses.']
        try:
            with self._perf_lock:
                self._perf['audioAnalyses'] += 1
        except Exception:
            pass
        self.emit('info', 'producer-analysis', f'Producer AI Assist przeanalizował {p.name}.', path=p.relative_to(self.root).as_posix())
        return result

    def auto_tempo(self, rel):
        p = core.safe(self.root, self.root / str(rel))
        if p.suffix.casefold() not in core.AUDIO or '.dawbridge' in p.relative_to(self.root).parts or not p.is_file():
            raise ValueError('Wybierz czytelne audio w folderze roboczym.')
        result = estimate_tempo(p)
        result['path'] = p.relative_to(self.root).as_posix()
        self.emit('info', 'auto-tempo', f'Auto-Tempo: {result.get("bpm") or "brak pewnego wyniku"} BPM · {p.name}.',
                  confidence=result.get('confidence'))
        return result

    def auto_markers(self, rel):
        p = core.safe(self.root, self.root / str(rel))
        if p.suffix.casefold() not in core.AUDIO or '.dawbridge' in p.relative_to(self.root).parts or not p.is_file():
            raise ValueError('Wybierz czytelne audio w folderze roboczym.')
        result = silence_markers(p)
        result['path'] = p.relative_to(self.root).as_posix()
        return result

    def plugin_awareness(self, pid):
        item, project = self.current(pid)
        discovered, seen = [], set()
        def add(name, source='parser'):
            clean = str(name or '').strip().strip('\x00"\' ')
            if not clean or len(clean) > 180:
                return
            key = clean.casefold()
            if key not in seen:
                seen.add(key)
                discovered.append({'name': clean, 'source': source, 'installedStatus': 'not-checked'})
        for plugin in item.get('plugins', []):
            add(plugin.get('name') if isinstance(plugin, dict) else plugin,
                plugin.get('confidence', 'parser') if isinstance(plugin, dict) else 'parser')
        for track in item.get('tracks', []):
            for plugin in track.get('plugins', []):
                add(plugin.get('name') if isinstance(plugin, dict) else plugin,
                    plugin.get('confidence', 'track parser') if isinstance(plugin, dict) else 'track parser')
        raw_parts = []
        if project.is_file():
            try:
                with project.open('rb') as stream:
                    raw_parts.append(stream.read(core.MAX_PROJECT))
            except OSError:
                pass
        elif project.is_dir():
            count = 0
            for base, dirs, names in os.walk(project, followlinks=False):
                dirs[:] = [d for d in dirs if not (Path(base) / d).is_symlink()]
                for name in names:
                    p = Path(base) / name
                    if p.name.casefold() not in {'projectdata', 'metadata.plist', 'projectinformation.plist'}:
                        continue
                    try:
                        if p.stat().st_size <= core.MAX_PROJECT:
                            raw_parts.append(p.read_bytes())
                            count += 1
                    except OSError:
                        continue
                    if count >= 4:
                        break
                if count >= 4:
                    break
        raw = b'\n'.join(raw_parts)
        for name in core.plugin_strings(raw, max_items=200):
            add(name, 'bounded string heuristic')
        text = raw.decode('latin1', errors='ignore')
        asset_pattern = re.compile(r'(?i)([^\x00\r\n"<>]{1,180}\\?[^\x00\r\n"<>]{0,120}\.(?:vstpreset|fxp|fxb|aupreset|nksf|nki|sf2|sfz|ir|vst3|component|dll|clap|aaxplugin))')
        assets, asset_seen = [], set()
        for match in asset_pattern.finditer(text):
            value = match.group(1).strip().replace('\\', '/')
            base = PureWindowsPath(value).name
            if base.casefold() not in asset_seen:
                asset_seen.add(base.casefold())
                ext = Path(base).suffix.casefold()
                category = 'preset' if ext in {'.vstpreset', '.fxp', '.fxb', '.aupreset', '.nksf', '.nki'} else 'instrument_or_sample' if ext in {'.sf2', '.sfz'} else 'impulse_or_plugin_dependency'
                assets.append({'name': base, 'pathHint': value[:220], 'category': category, 'confidence': 'string heuristic'})
            if len(assets) >= 200:
                break
        result = {
            'project': item['path'], 'plugins': discovered, 'assets': assets,
            'pluginCount': len(discovered), 'assetCount': len(assets),
            'dependencies': [{'path': r.get('path'), 'status': r.get('status'), 'external': r.get('external', False)} for r in item.get('refs', [])],
            'installationStatus': 'not checked; no scan of system plugin directories or registry',
            'note': 'Plugin Awareness Pro: parser fields plus bounded local string hints. No plugin/preset conversion; an absent hint does not prove the project has no dependencies.',
        }
        self.emit('info', 'plugin-awareness', f'Plugin Awareness: {len(discovered)} nazw i {len(assets)} asset hints.', project=item['path'])
        return result

    def metadata_brain(self, pid):
        item, _ = self.current(pid)
        tags = [item.get('daw', '').casefold().replace(' ', '-')]
        if item.get('tempoBpm'):
            tags.append(f'tempo-{round(float(item["tempoBpm"]))}bpm')
        if item.get('timeSignature'):
            tags.append(f'meter-{item["timeSignature"][0]}-{item["timeSignature"][1]}')
        words = re.findall(r'[A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+', item.get('name', ''))
        tags.extend(x.casefold() for x in words if len(x) > 2)
        tags = list(dict.fromkeys(tags))[:30]
        track_names = []
        for i, track in enumerate(item.get('tracks', [])):
            current = str(track.get('name') or '').strip()
            generic = bool(re.fullmatch(r'(?:track|audio|midi|playlist)\s*\d*', current, flags=re.I))
            proposed = current
            if generic:
                refs = [item['refs'][idx].get('path') for idx in track.get('refs', []) if 0 <= idx < len(item.get('refs', []))]
                base = Path(refs[0]).stem if refs else ''
                proposed = re.sub(r'[_-]+', ' ', base).strip().title() if base else f'Track {i+1}'
            track_names.append({'track': i, 'current': current or f'Track {i+1}', 'suggested': proposed,
                                'changed': proposed != current, 'confidence': 'filename/structure heuristic'})
        description = (f'{item.get("daw", "DAW")} session · {len(item.get("tracks", []))} tracks · '
                       f'{len(item.get("regions", []))} parsed regions · '
                       f'{float(item["tempoBpm"]):g} BPM' if item.get('tempoBpm') else
                       f'{item.get("daw", "DAW")} session · {len(item.get("tracks", []))} tracks · {len(item.get("regions", []))} parsed regions')
        return {
            'project': item['path'], 'sourceHash': item.get('hash'), 'generatedAt': dt.datetime.now().isoformat(),
            'metadata': {'titleSuggestion': item.get('name'), 'descriptionSuggestion': description,
                         'tags': tags, 'tempoBpm': item.get('tempoBpm'), 'timeSignature': item.get('timeSignature'),
                         'timelineLengthSeconds': item.get('timelineLengthSeconds', 0), 'daw': item.get('daw')},
            'trackNameSuggestions': track_names,
            'markerSuggestions': item.get('markers', []),
            'limitations': ['Sugestie deterministyczne z nazw i sparsowanych pól; brak generatywnego modelu.',
                            'Nic nie zapisuje się do natywnej sesji bez osobnej, jawnej operacji.'],
        }

    def library_optimizer(self):
        folders = self.folder_mappings()
        try:
            duplicate_groups = self.duplicates()
        except Exception:
            duplicate_groups = []
        suggestions = []
        for row in folders[:20]:
            if row['confidence'] >= 0.72:
                suggestions.append({'type': 'folder-role', 'path': row['source'], 'role': row['category'],
                                    'confidence': row['confidence'], 'action': 'review-and-map'})
        for group in duplicate_groups[:30]:
            suggestions.append({'type': 'identical-media', 'files': group['files'], 'sha256': group['sha256'],
                                'size': group['size'], 'action': 'review; no deletion'})
        return {'folders': folders, 'duplicateGroups': duplicate_groups, 'suggestions': suggestions,
                'safe': True, 'note': 'Optymalizator proponuje strukturę; nie przenosi, nie kasuje ani nie zmienia nazw plików.'}

    def ai_assist(self, pid=None):
        health = self.health_check(pid)
        selected = [self.projects[str(pid)]] if pid else list(self.projects.values())
        suggestions = []
        for row in health['issues']:
            kind = row['type']
            if kind in {'missing', 'external'}:
                suggestions.append({'priority': 'high', 'action': 'smart-resolve', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
            elif kind in {'xml-parse', 'parser'}:
                suggestions.append({'priority': 'high', 'action': 'review-format-support', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
            elif kind == 'invalid-reference':
                suggestions.append({'priority': 'high', 'action': 'review-invalid-reference', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
            elif kind in {'duplicate-media', 'duplicate-reference'}:
                suggestions.append({'priority': 'low', 'action': 'review-duplicate', 'project': row['project'],
                                    'reason': row['message'], 'files': row.get('files', []),
                                    'automatic': False, 'note': 'Nie kasuj pliku bez ręcznego sprawdzenia użycia w sesjach.'})
            elif kind in {'near-full-scale-samples', 'full-scale', 'over-full-scale'}:
                suggestions.append({'priority': 'medium', 'action': 'producer-analysis', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
            elif kind in {'invalid-routing', 'routing-unverified', 'routing-unknown'}:
                suggestions.append({'priority': 'medium', 'action': 'review-routing', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
            elif kind == 'plugin-unverified':
                suggestions.append({'priority': 'low', 'action': 'plugin-awareness', 'project': row['project'],
                                    'reason': row['message'], 'automatic': False})
        for folder in self.folder_mappings()[:5]:
            suggestions.append({'priority': 'low', 'action': 'review-folder-map', 'path': folder['source'],
                                'role': folder['category'], 'confidence': folder['confidence'], 'automatic': False})
        for item in selected:
            if item.get('regions') and all(r.get('exists') for r in item.get('refs', [])):
                suggestions.append({'priority': 'low', 'action': 'session-export', 'project': item['path'],
                                    'reason': 'Są parsowane regiony i wszystkie refs istnieją; eksport źródłowych stemów może być dostępny.',
                                    'automatic': False})
        order = {'high': 0, 'medium': 1, 'low': 2}
        suggestions.sort(key=lambda x: (order.get(x['priority'], 9), x.get('project', ''), x.get('path', '')))
        return {
            'engine': 'Bridge AI Assist · local deterministic rules v3', 'modelUsed': False,
            'checkedProjects': len(selected), 'issueCount': health['issueCount'], 'suggestions': suggestions[:300],
            'watchdog': {'safeMode': True, 'activeConflicts': self.watcher_status().get('conflicts', []),
                         'policy': 'writes require explicit user confirmation; no automatic deletion or native DAW mutation'},
            'performance': self.performance_stats(),
            'limitations': ['Brak wysyłania danych i brak chmurowego LLM.',
                            'Rankingi/raport są heurystyczne i ograniczone przez dostępność pól parsera.'],
        }

    def run_workflow(self, workflow, pid=None, path=None, expected_hash=None, confirm=False, selections=None):
        workflow = str(workflow or '').strip().casefold().replace('_', '-')
        started = time.perf_counter()
        self.emit('info', 'automation-start', f'Workflow {workflow} rozpoczęty.', project=(self.projects.get(str(pid), {}).get('path') if pid else None))
        try:
            if workflow in {'auto-fingerprint', 'fingerprint'}:
                result = self.smart_index()
                output = {'workflow': 'Auto-Fingerprint', 'status': 'completed', **result}
            elif workflow in {'auto-repair', 'repair'}:
                if not pid:
                    raise ValueError('Auto-Repair wymaga id projektu.')
                item, _ = self.current(pid, expected_hash)
                if selections:
                    if not confirm:
                        raise ValueError('Zastosowanie wymaga jawnego confirm=true po ręcznym wyborze każdego pliku.')
                    event = self.repair(item['id'], item['hash'], selections, confirm=True)
                    output = {'workflow': 'Auto-Repair', 'status': 'applied-with-backup', 'event': event,
                              'note': 'Naprawiono wyłącznie ręcznie wskazane refs RPP; inne formaty są read-only.'}
                else:
                    plan = self.smart_resolve(item['id'])
                    output = {'workflow': 'Auto-Repair', 'status': 'proposal-only', 'project': item['path'],
                              'missing': plan['missing'], 'writes': False,
                              'note': 'Nie zmieniono projektu. Wybierz kandydata i zatwierdź naprawę RPP osobno.'}
            elif workflow in {'auto-export', 'auto-stems', 'stems'}:
                if not pid:
                    raise ValueError('Auto-Export/Auto-Stems wymaga id projektu.')
                if confirm is not True:
                    raise ValueError('Eksport wymaga jawnego confirm=true; Safe Mode sprawdzi proces DAW i hash projektu.')
                item, _ = self.current(pid, expected_hash)
                result = self.session_export(item['id'], item['hash'], confirm=True)
                output = {'workflow': 'Auto-Export' if workflow == 'auto-export' else 'Auto-Stems', 'status': 'completed', **result}
            elif workflow in {'auto-tempo', 'tempo'}:
                selected = path
                if not selected and pid:
                    item, _ = self.current(pid, expected_hash)
                    choices = []
                    for ref in item.get('refs', []):
                        if ref.get('resolved'):
                            p = self.root / ref['resolved']
                            try:
                                choices.append((self._audio_meta(p).get('duration', 0), p.relative_to(self.root).as_posix()))
                            except Exception:
                                continue
                    if choices:
                        selected = max(choices)[1]
                if not selected:
                    raise ValueError('Auto-Tempo wymaga path audio lub projektu z czytelnym źródłem audio.')
                output = {'workflow': 'Auto-Tempo', 'status': 'suggestion', **self.auto_tempo(selected)}
            elif workflow in {'auto-markers', 'markers'}:
                if confirm is not True:
                    raise ValueError('Zapis propozycji Auto-Markers do Bridge JSON v3 wymaga jawnego confirm=true.')
                if not path:
                    raise ValueError('Auto-Markers wymaga path do pliku audio.')
                result = self.auto_markers(path)
                settings = self.get_settings()
                project_label = self.projects.get(str(pid), {}).get('path') if pid else None
                additions = [{**m, 'sourceAudio': result['path'], 'project': project_label, 'generatedBy': 'Auto-Markers'}
                             for m in result['markers']]
                settings['markers'] = (settings.get('markers', []) + additions)[-10000:]
                settings['version'] = 3
                self.save_settings(settings)
                output = {'workflow': 'Auto-Markers', 'status': 'metadata-only', **result,
                          'savedTo': '.dawbridge/settings-v3.json'}
            elif workflow in {'auto-tagging', 'tagging'}:
                if confirm is not True:
                    raise ValueError('Zapis Auto-Tagging do Bridge JSON v3 wymaga jawnego confirm=true.')
                targets = []
                if path:
                    targets = [core.safe(self.root, self.root / str(path))]
                elif pid:
                    item, _ = self.current(pid, expected_hash)
                    targets = [self.root / r['resolved'] for r in item.get('refs', []) if r.get('resolved')]
                else:
                    targets = list(getattr(self, 'audio', []))
                tags, details = {}, {}
                for audio_path in targets[:500]:
                    try:
                        result = self.technical_media_tags(audio_path)
                    except (ValueError, OSError):
                        continue
                    tags[result['path']] = result['tags']
                    details[result['path']] = result['details']
                settings = self.get_settings()
                existing = settings.get('tags', {})
                if not isinstance(existing, dict):
                    existing = {}
                existing.update(tags)
                settings['tags'] = existing
                settings['metadata'] = {**settings.get('metadata', {}), 'autoTaggingUpdatedAt': dt.datetime.now().isoformat()}
                self.save_settings(settings)
                output = {'workflow': 'Auto-Tagging', 'status': 'metadata-only', 'tagged': len(tags), 'tags': tags,
                          'details': details,
                          'note': 'Tylko source_type, BPM, key i RMS-derived energy; BPM/key są heurystyczne, energy nie jest oceną percepcyjną.',
                          'savedTo': '.dawbridge/settings-v3.json'}
            else:
                raise ValueError('Workflow nieobsługiwany. Wybierz Auto-Repair, Export, Stems, Markers, Tempo, Tagging lub Fingerprint.')
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            output['elapsedMs'] = elapsed
            self.emit('success', 'automation-complete', f'Workflow {workflow}: {output.get("status", "completed")}.',
                      elapsedMs=elapsed, project=(self.projects.get(str(pid), {}).get('path') if pid else None))
            return output
        except Exception as exc:
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            self.emit('error', 'automation-error', f'{workflow}: {exc}', elapsedMs=elapsed)
            raise

    def automation_status(self):
        policy = self._read_metadata_raw().get('automation', {})
        if not isinstance(policy, dict):
            policy = {}
        policy = {'runOnChange': False, 'autoFingerprintNewMedia': False, 'autoTagNewMedia': False, **policy}
        return {
            'watcher': self.watcher_status(), 'safeMode': True, 'policy': policy,
            'workflows': [
                {'id': 'auto-repair', 'mode': 'suggestion + explicit manual selection', 'nativeWrite': 'RPP only'},
                {'id': 'auto-export', 'mode': 'explicit confirmation + Safe Mode', 'nativeWrite': False},
                {'id': 'auto-stems', 'mode': 'explicit confirmation + Safe Mode', 'nativeWrite': False},
                {'id': 'auto-markers', 'mode': 'local metadata only', 'nativeWrite': False},
                {'id': 'auto-tempo', 'mode': 'suggestion only', 'nativeWrite': False},
                {'id': 'auto-tagging', 'mode': 'Bridge JSON v3 only', 'nativeWrite': False},
                {'id': 'auto-fingerprint', 'mode': 'local cache only', 'nativeWrite': False},
            ],
            'automationOnFileChanges': 'watcher reports changes; only opt-in Auto-Fingerprint/Auto-Tagging run on stable new audio; repair/export/stems remain manual',
        }

    def _library_summary(self):
        return self.library_optimizer()

    engine_class._fingerprint = _fingerprint
    engine_class.fingerprint_similarity = staticmethod(fingerprint_similarity)
    engine_class.fingerprint_compare = fingerprint_compare
    engine_class.technical_media_tags = technical_media_tags
    engine_class.folder_mappings = folder_mappings
    engine_class.health_check = health_check
    engine_class.cross_sync = cross_sync
    engine_class.sync_export = sync_export
    engine_class._timeline_summary = _timeline_summary
    engine_class.get_settings = get_settings
    engine_class.save_settings = save_settings
    engine_class._metadata_file = _metadata_file
    engine_class._read_metadata_raw = _read_metadata_raw
    engine_class._load_snapshots = _load_snapshots
    engine_class.snapshot_history = snapshot_history
    engine_class._record_project_snapshots = _record_project_snapshots
    engine_class.create_snapshot = create_snapshot
    engine_class.watcher_status = watcher_status
    engine_class.start_watcher = start_watcher
    engine_class.stop_watcher = stop_watcher
    engine_class._watch_file_state = _watch_file_state
    engine_class._watch_kind = staticmethod(_watch_kind)
    engine_class._poll_watch = _poll_watch
    engine_class._auto_on_change = _auto_on_change
    engine_class._watch_loop = _watch_loop
    engine_class.close = close
    engine_class.performance_stats = performance_stats
    engine_class.producer_analysis = producer_analysis
    engine_class.auto_tempo = auto_tempo
    engine_class.auto_markers = auto_markers
    engine_class.plugin_awareness = plugin_awareness
    engine_class.metadata_brain = metadata_brain
    engine_class.library_optimizer = library_optimizer
    engine_class.ai_assist = ai_assist
    engine_class.run_workflow = run_workflow
    engine_class.automation_status = automation_status
