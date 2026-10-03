"""DAW Bridge GOD MODE 4.2 local extensions.

All analysis is bounded, local and deterministic. This module deliberately makes
no claim of generative AI, full DAW parsing, source separation, or mix certification.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import io
import json
import math
import os
import re
import shutil
import statistics
import tempfile
import time
import zipfile
import heapq
import threading
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import soundfile as sf

from god_audio import (MAX_DEEP_SCAN_DECODE_BYTES, MAX_DEEP_SCAN_FILES, MAX_DEEP_SCAN_SECONDS_PER_FILE,
                      adaptive_fingerprint, adaptive_similarity, mix_integrity_report, transient_map)
from ultra_audio import producer_report


class _PriorityAudioGate:
    """Bound adaptive DSP concurrency and let foreground analysis overtake queued watcher jobs."""
    def __init__(self, workers):
        self.workers = max(1, int(workers))
        self.condition = threading.Condition()
        self.waiting = []
        self.sequence = 0
        self.active = 0

    @contextmanager
    def slot(self, priority=0):
        with self.condition:
            ticket = (max(0, min(9, int(priority))), self.sequence)
            self.sequence += 1
            heapq.heappush(self.waiting, ticket)
            while self.active >= self.workers or not self.waiting or self.waiting[0] != ticket:
                self.condition.wait()
            heapq.heappop(self.waiting)
            self.active += 1
            self.condition.notify_all()
        try:
            yield
        finally:
            with self.condition:
                self.active = max(0, self.active - 1)
                self.condition.notify_all()

    def status(self):
        with self.condition:
            return {'active': self.active, 'queued': len(self.waiting), 'maxWorkers': self.workers}


def install_god(engine_class):
    """Install GOD MODE features after the stable core and ULTRA 3.0 extensions."""
    import engine as core

    base_run_workflow = engine_class.run_workflow
    base_session_export = engine_class.session_export
    base_snapshot_history = engine_class.snapshot_history
    base_ai_assist = engine_class.ai_assist
    base_plugin_awareness = engine_class.plugin_awareness
    base_performance_stats = engine_class.performance_stats

    def _god_audio_path(self, rel):
        p = core.safe(self.root, self.root / str(rel))
        if (p.suffix.casefold() not in core.AUDIO or '.dawbridge' in p.relative_to(self.root).parts
                or not p.is_file() or p.is_symlink()):
            raise ValueError('Wybierz czytelny plik audio wewnątrz wybranego folderu roboczego.')
        return p

    def preflight(self, pid, operation='stems', backup=None, selections=None):
        item = self.projects.get(str(pid))
        if not item:
            raise ValueError('Projekt nie należy do bieżącego skanu. Skanuj ponownie.')
        operation = str(operation or 'stems').casefold().replace('_', '-')
        blocked, warnings = [], []
        project = None
        project_exists = project_readable = False
        project_bytes = None
        size_error = hash_error = None
        current_hash = None
        unchanged = False
        try:
            project = core.safe(self.root, self.root / item['path'])
            project_exists = project.is_file() or project.is_dir()
            if not project_exists:
                blocked.append('Plik/katalog projektu nie istnieje. Skanuj ponownie; operacja nie została wykonana.')
            elif project.is_file():
                project_bytes = int(project.stat().st_size)
                with project.open('rb') as stream:
                    stream.read(1)
                project_readable = True
            else:
                project_bytes = self._project_tree_size(project)
                project_readable = True
        except Exception as exc:
            size_error = str(exc)
            blocked.append(f'Nie można zweryfikować istnienia, rozmiaru lub odczytu projektu: {exc}')
        if project_exists and project_readable:
            try:
                current_hash = self.project_snapshot_hash(project)
                unchanged = bool(item.get('hash')) and current_hash == item.get('hash')
            except Exception as exc:
                hash_error = str(exc)
                blocked.append(f'Nie można sprawdzić hash projektu; Safe Mode blokuje operację: {exc}')
        else:
            hash_error = size_error or 'projekt niedostępny'
        try:
            process_names = self._matching_daw_processes(item)
            process_error = None
        except Exception as exc:
            process_names, process_error = [], str(exc)
        try:
            watcher = self.watcher_status()
            watcher_error = watcher.get('lastError') if watcher.get('enabled') else None
        except Exception as exc:
            watcher, watcher_error = {}, str(exc)

        if operation == 'repair':
            supported = item.get('format') == '.rpp'
        elif operation == 'portable':
            supported = item.get('format') == '.rpp'
        elif operation == 'flp-tempo-copy':
            supported = item.get('format') == '.flp'
        elif operation in {'stems', 'auto-stems', 'auto-stem-rebuild', 'session-export'}:
            supported = bool(item.get('regions')) and not bool(item.get('tempoMap'))
        elif operation == 'restore':
            supported = bool(project and project.is_file())
        else:
            supported = False
        if not supported:
            blocked.append(f'Operacja {operation} nie jest obsługiwana dla {item.get("format")}; niczego nie zmieniono.')
        candidate_checks = []
        if operation == 'repair':
            if not isinstance(selections, dict) or not selections:
                blocked.append('Repair preflight wymaga co najmniej jednego jawnie wybranego kandydata.')
            else:
                for key, value in selections.items():
                    try:
                        index = int(key)
                        if not 0 <= index < len(item.get('refs', [])):
                            raise ValueError('indeks odwołania poza zakresem')
                        ref = item['refs'][index]
                        if ref.get('exists') or value not in ref.get('candidates', []):
                            raise ValueError('kandydat nie należy do listy z ostatniego skanu')
                        snapshot = next((x for x in ref.get('candidateSnapshots', []) if x.get('path') == value), None)
                        if not snapshot:
                            raise ValueError('brak statystyki kandydata z ostatniego skanu')
                        candidate = core.safe(self.root, self.root / str(value))
                        stat = candidate.stat()
                        if candidate.is_symlink() or not candidate.is_file() or stat.st_size <= 0:
                            raise ValueError('kandydat nie jest czytelnym plikiem')
                        if stat.st_size != int(snapshot.get('size', -1)) or stat.st_mtime_ns != int(snapshot.get('mtimeNs', -1)):
                            raise ValueError('kandydat zmienił się od skanu; ponownie zeskanuj')
                        with candidate.open('rb') as stream:
                            stream.read(1)
                        with core.sf.SoundFile(str(candidate)) as audio:
                            if len(audio) <= 0 or audio.samplerate <= 0 or audio.channels <= 0:
                                raise ValueError('nieprawidłowy nagłówek audio')
                        candidate_checks.append({'referenceIndex': index, 'path': value, 'sizeBytes': stat.st_size,
                                                 'mtimeNs': stat.st_mtime_ns, 'readable': True})
                    except Exception as exc:
                        blocked.append(f'Kandydat repair {key} jest nieprawidłowy: {exc}')
        if item.get('errors'): 
            blocked.append('Parser zgłosił błędy projektu; wymagany jest ręczny przegląd i ponowny skan przed operacją.')
        if process_error:
            blocked.append(f'Nie można zweryfikować procesów DAW: {process_error}')
        elif process_names:
            blocked.append(f'Uruchomiony DAW ({", ".join(process_names)}); zamknij go przed operacją.')
        if not unchanged:
            blocked.append('Projekt różni się od skanu albo jego hash jest niedostępny; uruchom ponowny skan.')
        if item.get('path') in getattr(self, 'watch_conflicts', set()):
            blocked.append('Watcher wykrył zmianę/konflikt od skanu; ponownie zeskanuj projekt.')
        if watcher_error:
            blocked.append(f'Watcher nie może wiarygodnie potwierdzić stanu folderu: {watcher_error}; Safe Mode blokuje operację.')

        backup_required = operation in {'repair', 'flp-tempo-copy', 'restore'}
        source_failures, checked_sources = [], []
        required_refs = []
        if operation == 'portable':
            required_refs = list(enumerate(item.get('refs', [])))
        elif operation in {'stems', 'auto-stems', 'auto-stem-rebuild', 'session-export'}:
            indices = set()
            for region in item.get('regions', []):
                if region.get('muted'):
                    continue
                try:
                    ref_index = int(region.get('ref'))
                    if not 0 <= ref_index < len(item.get('refs', [])):
                        raise ValueError('indeks źródła poza zakresem')
                    indices.add(ref_index)
                except Exception as exc:
                    source_failures.append({'reference': region.get('name'), 'reason': f'Nieprawidłowe źródło regionu: {exc}'})
            required_refs = [(i, item['refs'][i]) for i in sorted(indices)]
        source_total_bytes = 0
        source_seen = set()
        for ref_index, ref in required_refs:
            rel = ref.get('resolved')
            if not rel:
                source_failures.append({'referenceIndex': ref_index, 'sourcePath': ref.get('path'),
                                        'reason': 'Brak czytelnego, lokalnego źródła audio.'})
                continue
            try:
                source = core.safe(self.root, self.root / rel)
                if source.is_symlink() or not source.is_file():
                    raise ValueError('Źródło nie jest zwykłym plikiem lokalnym.')
                stat = source.stat()
                if stat.st_size <= 0:
                    raise ValueError('Źródło ma 0 bajtów.')
                signature = self.cache.get_ref(item['path'], str(ref.get('path', ''))) or {}
                if signature.get('size') is None or signature.get('mtimeNs') is None:
                    raise ValueError('Brak statystyki źródła z ostatniego skanu; ponownie zeskanuj.')
                if int(signature['size']) != stat.st_size or int(signature['mtimeNs']) != stat.st_mtime_ns:
                    raise ValueError('Źródło zmieniło się od skanu; ponownie zeskanuj i sprawdź wynik.')
                with source.open('rb') as stream:
                    if not stream.read(1):
                        raise ValueError('Nie można odczytać źródła.')
                if source.suffix.casefold() in core.AUDIO:
                    with core.sf.SoundFile(str(source)) as audio:
                        if len(audio) <= 0 or audio.samplerate <= 0 or audio.channels <= 0:
                            raise ValueError('Nagłówek audio nie zawiera czytelnych próbek.')
                if rel not in source_seen:
                    source_seen.add(rel)
                    source_total_bytes += stat.st_size
                checked_sources.append({'referenceIndex': ref_index, 'path': rel, 'sizeBytes': stat.st_size,
                                        'readable': True, 'changedSinceScan': False})
            except Exception as exc:
                source_failures.append({'referenceIndex': ref_index, 'sourcePath': ref.get('path'), 'reason': str(exc)[:220]})
        if source_failures:
            for failure in source_failures:
                blocked.append(f'Źródło wymagane przez operację jest niedostępne: {failure.get("sourcePath") or failure.get("reference") or "region"} — {failure["reason"]}')

        large_limit = 512 * 1024 ** 2
        if project_bytes is not None and project_bytes >= large_limit:
            warnings.append(f'Duży projekt: około {project_bytes:,} B; dodatkowy odczyt i backup mogą potrwać.')
        output_estimate = 0
        backup_estimate = 0
        if operation == 'portable':
            output_estimate = int(source_total_bytes * 1.10)
        elif operation in {'stems', 'auto-stems', 'auto-stem-rebuild', 'session-export'}:
            tracks = max(1, len({r.get('track') for r in item.get('regions', []) if r.get('track') is not None}))
            output_estimate = int(max(0.0, float(item.get('timelineLengthSeconds') or 0.0)) * 48000 * 2 * 4 * tracks * 1.15)
        elif operation in {'repair', 'restore'} and project_bytes is not None:
            output_estimate = max(1024, project_bytes)
        elif operation == 'flp-tempo-copy' and project_bytes is not None:
            output_estimate = max(1024 * 1024, int(project_bytes * 2.1))
        if backup_required:
            if project_bytes is None:
                blocked.append('Nie udało się oszacować rozmiaru wymaganej kopii bezpieczeństwa; Safe Mode blokuje zapis.')
            else:
                backup_estimate = max(1024 * 1024, int(project_bytes * 1.10))
        estimate_bytes = output_estimate + backup_estimate

        backup_dir = self.root / '.dawbridge' / 'backups'
        verified_backups, unverified_backups = [], []
        def verify_backup(candidate):
            candidate = core.safe(self.root, Path(candidate))
            if not candidate.is_relative_to(backup_dir.resolve()) or not (candidate.is_file() or candidate.is_dir()):
                raise ValueError('Backup musi być istniejącym plikiem/katalogiem pod .dawbridge/backups.')
            manifest_path = candidate.with_name(candidate.name + '.manifest.json')
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            if manifest.get('schema') != 'dawbridge.verified-backup' or manifest.get('version') != 1:
                raise ValueError('Brak rozpoznanego manifestu integralności backupu.')
            if manifest.get('project') != item['path']:
                raise ValueError('Backup należy do innego projektu.')
            actual = self._content_tree_hash(candidate)
            if not manifest.get('backupContentHash') or actual != manifest.get('backupContentHash'):
                raise ValueError('SHA-256 zawartości backupu nie zgadza się z manifestem.')
            return {'path': candidate.relative_to(self.root).as_posix(), 'projectSnapshotHash': manifest.get('projectSnapshotHash'),
                    'backupContentHash': actual, 'sizeBytes': manifest.get('sizeBytes'), 'kind': manifest.get('kind')}
        selected_backup = None
        if backup is not None:
            try:
                selected_backup = verify_backup(self.root / str(backup))
                verified_backups.append(selected_backup)
            except Exception as exc:
                blocked.append(f'Backup nie przeszedł weryfikacji integralności: {exc}')
        elif backup_dir.is_dir():
            try:
                for candidate in backup_dir.iterdir():
                    if candidate.name.endswith(Path(item['path']).name) and not candidate.name.endswith('.manifest.json'):
                        try:
                            verified_backups.append(verify_backup(candidate))
                        except Exception as exc:
                            unverified_backups.append({'path': candidate.name, 'reason': str(exc)[:180]})
            except OSError as exc:
                warnings.append(f'Nie udało się sprawdzić wcześniejszych kopii: {exc}')
        backup_exists = bool(verified_backups)
        if backup_required and not backup_exists and operation != 'restore':
            warnings.append('Brak wcześniejszego zweryfikowanego backupu; przed zapisem Bridge musi utworzyć i sprawdzić nowy backup.')
        elif not backup_exists and operation != 'restore':
            warnings.append('Nie znaleziono zweryfikowanego backupu Bridge; osobna kopia projektu jest zalecana.')
        if unverified_backups:
            warnings.append(f'{len(unverified_backups)} wcześniejsza(y) kopia(e) nie mają manifestu lub nie przeszły weryfikacji; nie będą użyte.')
        if operation == 'restore' and not selected_backup:
            blocked.append('Restore wymaga wskazania backupu z potwierdzonym manifestem i zawartością SHA-256.')
        if selected_backup and selected_backup.get('kind') != 'file':
            blocked.append('Przywracanie katalogowych projektów/bundli nie jest obsługiwane w tej wersji.')

        write_required = operation in {'repair', 'portable', 'stems', 'auto-stems', 'auto-stem-rebuild',
                                       'session-export', 'flp-tempo-copy', 'restore'}
        write_dir = None
        write_checks, space_checks = [], []
        if operation in {'repair', 'flp-tempo-copy', 'restore'}:
            write_dir = project.parent if project else None
        elif write_required:
            write_dir = self.root / '.dawbridge' / 'exports'
        check_dirs = []
        if write_required:
            check_dirs.append(('operation output', write_dir, output_estimate))
            if backup_required:
                check_dirs.append(('verified backup', backup_dir, backup_estimate))
        for label, target_dir, required_bytes in check_dirs:
            try:
                if target_dir is None:
                    raise OSError('nieznany katalog docelowy')
                target_dir.mkdir(parents=True, exist_ok=True)
                fd, test_path = tempfile.mkstemp(prefix='.bridge-preflight-', suffix='.tmp', dir=target_dir)
                os.close(fd)
                os.unlink(test_path)
                write_checks.append({'target': label, 'path': str(target_dir), 'writable': True})
            except Exception as exc:
                write_checks.append({'target': label, 'path': str(target_dir) if target_dir else None,
                                     'writable': False, 'error': str(exc)[:200]})
                blocked.append(f'Nie można potwierdzić zapisu w katalogu {label}: {exc}')
                continue
            try:
                free = shutil.disk_usage(target_dir).free
                space_checks.append({'target': label, 'freeBytes': free, 'requiredBytes': required_bytes})
                if required_bytes and free < required_bytes:
                    blocked.append(f'Za mało wolnego miejsca w {label}: {free:,} B wolne, szacunkowo {required_bytes:,} B wymagane.')
                elif required_bytes and free < int(required_bytes * 1.25):
                    warnings.append(f'Niewielki zapas miejsca w {label}: {free:,} B wolne; szacunek {required_bytes:,} B.')
            except Exception as exc:
                space_checks.append({'target': label, 'freeBytes': None, 'requiredBytes': required_bytes,
                                     'error': str(exc)[:200]})
                blocked.append(f'Nie można sprawdzić wolnego miejsca w {label}; Safe Mode blokuje zapis/eksport: {exc}')
        free_bytes = min((x['freeBytes'] for x in space_checks if x.get('freeBytes') is not None), default=None)
        write_check = all(x.get('writable') is True for x in write_checks) if write_required else None
        if item.get('partial'):
            warnings.append('Parser częściowy/wersjozależny; sprawdź references, timeline i wynik ręcznie.')
        status = 'blocked' if blocked else 'review' if warnings else 'ready'
        return {'project': item['path'], 'daw': item['daw'], 'format': item['format'], 'operation': operation,
                'status': status, 'ready': not blocked, 'blockedReasons': blocked, 'warnings': warnings,
                'projectExists': project_exists, 'projectReadable': project_readable, 'projectUnchangedSinceScan': unchanged,
                'currentHash': current_hash, 'hashCheckError': hash_error,
                'dawProcesses': process_names, 'processCheckError': process_error,
                'watcher': watcher, 'watcherCheckError': watcher_error,
                'projectBytesEstimate': project_bytes, 'largeProjectThresholdBytes': large_limit,
                'sourceAvailability': {'required': len(required_refs), 'validated': len(checked_sources),
                                       'failures': source_failures, 'validatedSources': checked_sources},
                'candidateValidation': {'selected': len(selections) if isinstance(selections, dict) else 0,
                                        'validated': len(candidate_checks), 'checks': candidate_checks},
                'backupRequired': backup_required, 'existingBridgeBackup': backup_exists,
                'verifiedBackups': verified_backups[:10], 'unverifiedBackups': unverified_backups[:10],
                'selectedBackup': selected_backup, 'estimatedOperationBytes': estimate_bytes,
                'freeBytes': free_bytes, 'spaceChecks': space_checks, 'writeChecks': write_checks,
                'writeCheckPassed': write_check, 'estimatedOutputBytes': output_estimate,
                'estimatedBackupBytes': backup_estimate,
                'supported': supported,
                'note': 'Preflight fails closed when a required check is unknown. The operation repeats process/hash, source, backup and destination checks immediately before writing.'}

    def session_compatibility_report(self, pid):
        item, project = self.current(pid)
        ext = item.get('format')
        scope = {
            '.rpp': {'fields': ['tempoBpm', 'timeSignature', 'tracks', 'regions', 'markers', 'local audio references', 'selected routing fields'], 'confidence': 'explicit text fields supported by the RPP adapter'},
            '.als': {'fields': ['recognized XML track names', 'some clips/references', 'tempo/locators when present'], 'confidence': 'partial XML structure; version/layout dependent'},
            '.flp': {'fields': ['PyFLP-supported tempo/channels/playlist items/sample refs'], 'confidence': 'upstream parser event/model coverage; partial'},
            '.song': {'fields': ['recognized XML attributes/elements, some tracks/regions/markers/media refs'], 'confidence': 'schema/version-dependent heuristic; read-only'},
            '.cpr': {'fields': ['readable XML fields only' if item.get('cprXml') else 'none from opaque binary timeline'], 'confidence': 'read-only partial parser; typical CPR remains opaque'},
            '.logicx': {'fields': ['selected plist metadata and media paths found in bundle'], 'confidence': 'read-only string/container heuristics; ProjectData is versioned binary'},
        }.get(ext, {'fields': [], 'confidence': 'unknown'})
        structured = ext in {'.rpp', '.als', '.flp', '.song'} or (ext == '.cpr' and bool(item.get('cprXml')))
        if ext == '.logicx' or (ext == '.cpr' and not item.get('cprXml')):
            reliable_fields = []
        elif structured:
            reliable_fields = list(scope['fields'])
        else:
            reliable_fields = []
        resolved_media = [{'projectReference': ref.get('path'), 'resolvedPath': ref.get('resolved'),
                           'existsInWorkspace': bool(ref.get('exists'))}
                          for ref in item.get('refs', []) if ref.get('resolved')]
        plugin_hints = []
        for plugin in item.get('plugins', []):
            plugin_hints.append(plugin if isinstance(plugin, dict) else {'name': str(plugin)})
        for track in item.get('tracks', []):
            for plugin in track.get('plugins', []):
                plugin_hints.append(plugin if isinstance(plugin, dict) else {'name': str(plugin), 'track': track.get('name')})
        routing_hints = list(item.get('routing', []))
        for track in item.get('tracks', []):
            routing_hints.extend(track.get('routing', []))
        heuristic_hints = {'routing': routing_hints, 'pluginNamesAndDependencies': plugin_hints}
        extraction_confidence = {
            '.rpp': 'explicit fields supported by the text adapter; not the complete runtime state',
            '.als': 'recognized structured XML fields; partial and version-dependent',
            '.flp': 'fields exposed by installed PyFLP parser; upstream coverage varies',
            '.song': 'recognized XML structure only; schema/version-dependent and read-only',
            '.cpr': 'readable XML snapshot only; not a full native CPR parse' if item.get('cprXml') else 'opaque binary; no reliable timeline fields',
            '.logicx': 'selected plist/container metadata; ProjectData and relationships remain heuristic',
        }.get(ext, 'unknown')
        if ext in {'.cpr', '.logicx'} and not structured:
            heuristic_hints['mediaPathStrings'] = [r.get('path') for r in item.get('refs', [])[:500]]
        warnings = list(item.get('warnings', [])) + list(item.get('errors', []))
        if item.get('partial'):
            warnings.append('Częściowy parser: brak pola nie oznacza, że pole nie istnieje w sesji DAW.')
        if ext in {'.cpr', '.logicx', '.song'}:
            warnings.append(f'{ext} adapter jest read-only w Bridge; dane strukturalne i/lub wskazówki są niepełne.')
        return {'schema': 'dawbridge.session-compatibility-report', 'version': 1,
                'project': item['path'], 'daw': item['daw'], 'format': ext,
                'parser': item.get('parser'), 'partialParser': bool(item.get('partial')),
                'partialParserWarning': bool(item.get('partial')) or ext in {'.cpr', '.logicx', '.song'},
                'readOnly': ext in {'.als', '.cpr', '.logicx', '.song'},
                'parserScope': scope, 'reliableExtractedData': {
                    'confidence': extraction_confidence,
                    'fieldNamesWithinAdapterScope': reliable_fields,
                    'tempoBpm': item.get('tempoBpm') if structured else None,
                    'timeSignature': item.get('timeSignature') if structured else None,
                    'trackNames': [t.get('name') for t in item.get('tracks', [])] if structured else [],
                    'markerCount': len(item.get('markers', [])) if structured else None,
                    'regionCount': len(item.get('regions', [])) if structured else None,
                    'resolvedAudioReferences': resolved_media,
                    'clarification': 'Verified local file existence is separate from verifying how the DAW routes/plays it.'},
                'heuristicHints': heuristic_hints, 'warnings': list(dict.fromkeys(warnings)),
                'limitations': ['No plugin rendering or plugin compatibility/load test.',
                                'No complete cross-DAW conversion; routing/plugin/automation/MIDI data may be partial.',
                                'Reports cover only adapter-exposed fields; manual open-and-listen verification remains necessary.']}

    def _priority_gate(self):
        gate = getattr(self, '_god_priority_gate', None)
        if gate is None:
            with self._perf_lock:
                gate = getattr(self, '_god_priority_gate', None)
                if gate is None:
                    cores = max(1, os.cpu_count() or 1)
                    gate = _PriorityAudioGate(min(4, max(1, cores - 1)))
                    self._god_priority_gate = gate
        return gate

    def deep_scan_audio(self, projects=None):
        """Run deterministic audio analysis under strict per-file and aggregate budgets."""
        project_rows = projects if isinstance(projects, dict) else getattr(self, 'projects', {})
        all_audio = [p for p in getattr(self, 'audio', []) if p.is_file() and not p.is_symlink()]
        by_rel = {p.relative_to(self.root).as_posix(): p for p in all_audio}
        referenced = []
        seen = set()
        for item in project_rows.values():
            for ref in item.get('refs', []):
                rel = ref.get('resolved')
                path = by_rel.get(rel)
                if path is not None and path not in seen:
                    seen.add(path)
                    referenced.append(path)
        remainder = [p for p in all_audio if p not in seen]
        remainder.sort(key=lambda p: str(p).casefold())
        referenced.sort(key=lambda p: str(p).casefold())
        candidate_count = len(all_audio)
        limit = MAX_DEEP_SCAN_FILES

        def spread(rows, count):
            if count <= 0 or not rows:
                return []
            if len(rows) <= count:
                return rows
            if count == 1:
                return [rows[(len(rows) - 1) // 2]]
            indices = [round(i * (len(rows) - 1) / (count - 1)) for i in range(count)]
            return [rows[i] for i in dict.fromkeys(indices)]

        selected = spread(referenced, limit) if len(referenced) >= limit else referenced + spread(remainder, limit - len(referenced))
        decode_budget = MAX_DEEP_SCAN_DECODE_BYTES
        jobs, results, failed, skipped = [], [], [], []
        cached_count = 0
        for path in selected:
            rel = path.relative_to(self.root).as_posix()
            try:
                meta = self._audio_meta(path)
                rate = int(meta.get('sampleRate') or 0)
                channels = int(meta.get('channels') or 0)
                duration = float(meta.get('duration') or 0.0)
                if rate <= 0 or channels <= 0 or duration <= 0:
                    raise ValueError('Brak poprawnych parametrów nagłówka audio.')
                cached = self.cache.file(path).get('fingerprint')
                coverage = float((cached or {}).get('adaptiveCoverageSeconds') or 0.0)
                needed = min(MAX_DEEP_SCAN_SECONDS_PER_FILE, duration)
                if cached and cached.get('adaptiveSegments') and cached.get('rhythmProfile') is not None and coverage >= needed - 0.1:
                    results.append((path, cached, True))
                    cached_count += 1
                    continue
                bytes_per_second = rate * channels * 4
                max_seconds = min(needed, decode_budget / bytes_per_second)
                if max_seconds < min(0.05, duration):
                    skipped.append({'path': rel, 'reason': 'aggregate decoded-audio budget exhausted'})
                    continue
                estimated_bytes = min(decode_budget, int(max_seconds * bytes_per_second))
                decode_budget = max(0, decode_budget - estimated_bytes)
                jobs.append((path, max_seconds))
            except Exception as exc:
                failed.append({'path': rel, 'reason': str(exc)[:200]})

        def analyze(job):
            path, max_seconds = job
            try:
                return path, self._fingerprint(path, priority=0, max_seconds=max_seconds), None
            except Exception as exc:
                return path, None, str(exc)[:200]

        workers = min(3, len(jobs))
        if jobs:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                analyzed = list(pool.map(analyze, jobs))
            for path, profile, error in analyzed:
                if error:
                    failed.append({'path': path.relative_to(self.root).as_posix(), 'reason': error})
                else:
                    results.append((path, profile, False))

        rows = []
        for path, profile, was_cached in sorted(results, key=lambda row: str(row[0]).casefold()):
            rhythm = profile.get('rhythmTempo') or {}
            tonality = profile.get('tonality') or {}
            rows.append({
                'path': path.relative_to(self.root).as_posix(),
                'durationSeconds': profile.get('duration'),
                'coverageSeconds': profile.get('adaptiveCoverageSeconds'),
                'tempo': rhythm,
                'tonality': tonality,
                'transientCount': profile.get('transientCount', len(profile.get('transients', []))),
                'fingerprintVersion': profile.get('fingerprintVersion', 4),
                'cached': bool(was_cached),
            })
        selected_count = len(selected)
        not_selected = max(0, candidate_count - selected_count)
        failed.sort(key=lambda row: row['path'].casefold())
        skipped.sort(key=lambda row: row['path'].casefold())
        total_coverage = round(sum(float(row.get('coverageSeconds') or 0) for row in rows), 3)
        summary = {
            'status': 'partial' if failed or skipped or not_selected else 'complete',
            'candidateCount': candidate_count,
            'selectedCount': selected_count,
            'notSelectedCount': not_selected,
            'analyzedFiles': len(rows),
            'newlyAnalyzedFiles': sum(not row['cached'] for row in rows),
            'cachedFiles': cached_count,
            'failedFiles': failed,
            'skippedFiles': skipped,
            'coverageSecondsTotal': total_coverage,
            'perFileLimitSeconds': MAX_DEEP_SCAN_SECONDS_PER_FILE,
            'decodeBudgetBytes': MAX_DEEP_SCAN_DECODE_BYTES,
            'results': rows,
            'method': 'Local deterministic 20 ms onset/energy analysis, 8-band spectrum and 12-bin chroma; bounded, not ML.',
            'limitations': ['At most 20 files per scan; project-referenced media are prioritized, with deterministic spread across the remaining library.',
                            'At most 45 seconds per file and 512 MiB estimated decoded PCM per scan; existing complete cache entries may cover more.',
                            'BPM, transient and tonal results are estimates; no beat-grid, transcription, genre inference or listening test.'],
        }
        self.debug_event('scan-deep-analysis',
                         f'Deep Scan: {len(rows)} files, {not_selected} not selected, {len(failed)} errors, {len(skipped)} budget skips.',
                         analyzedFiles=len(rows), newFiles=summary['newlyAnalyzedFiles'], notSelected=not_selected,
                         failed=len(failed), skipped=len(skipped), decodedBudgetBytes=MAX_DEEP_SCAN_DECODE_BYTES)
        return summary

    def _fingerprint(self, p, priority=0, max_seconds=None):
        p = core.safe(self.root, Path(p))
        if p.suffix.casefold() not in core.AUDIO or not p.is_file() or p.is_symlink():
            raise ValueError('Audio nie istnieje lub jest poza root.')
        requested = min(180.0, float(max_seconds)) if max_seconds is not None else 180.0
        if not math.isfinite(requested) or requested <= 0:
            raise ValueError('Limit fingerprintu musi być dodatni i skończony.')
        cached = self.cache.file(p)
        fp = cached.get('fingerprint')
        required_coverage = min(requested, float((fp or {}).get('duration') or requested))
        if (fp and fp.get('adaptiveSegments') and fp.get('rhythmProfile') is not None
                and float(fp.get('adaptiveCoverageSeconds') or 0) >= required_coverage - 0.1):
            return fp
        with self._priority_gate().slot(priority):
            cached = self.cache.file(p)
            fp = cached.get('fingerprint')
            required_coverage = min(requested, float((fp or {}).get('duration') or requested))
            if (fp and fp.get('adaptiveSegments') and fp.get('rhythmProfile') is not None
                    and float(fp.get('adaptiveCoverageSeconds') or 0) >= required_coverage - 0.1):
                return fp
            try:
                result = adaptive_fingerprint(p, max_seconds=requested)
            except Exception as exc:
                raise ValueError(f'Nie udało się zbudować adaptacyjnego fingerprintu {p.name}: {exc}') from exc
            result['fingerprintVersion'] = 4
            self.cache.put_file(p, fp=result)
            try:
                with self._perf_lock:
                    self._perf['audioAnalyses'] += 1
            except Exception:
                pass
            return result

    def fingerprint_similarity(a, b):
        return adaptive_similarity(a, b)['similarity']

    def fingerprint_compare(self, path_a, path_b):
        a, b = _god_audio_path(self, path_a), _god_audio_path(self, path_b)
        fa, fb = self._fingerprint(a), self._fingerprint(b)
        components = adaptive_similarity(fa, fb)
        result = {
            'a': a.relative_to(self.root).as_posix(), 'b': b.relative_to(self.root).as_posix(),
            **components, 'components': components, 'durationA': fa.get('duration'), 'durationB': fb.get('duration'),
            'sha256Identical': core.digest(a) == core.digest(b),
            'adaptiveSegmentCountA': fa.get('adaptiveSegmentCount'),
            'adaptiveSegmentCountB': fb.get('adaptiveSegmentCount'),
            'caveat': 'Lokalny ranking adaptacyjnych segmentów, pasm harmonicznych, widma i rytmu; podobieństwo nie dowodzi identycznego nagrania ani nie zastępuje odsłuchu.',
        }
        self.emit('info', 'fingerprint-god', f'Adaptive Fingerprinting X: {result["similarity"]:.0%}.',
                  a=result['a'], b=result['b'])
        return result

    def smart_similarity_search(self, query, limit=15, candidate_limit=120):
        q = _god_audio_path(self, query)
        try:
            limit = max(1, min(50, int(limit)))
            candidate_limit = max(1, min(300, int(candidate_limit)))
        except (TypeError, ValueError):
            raise ValueError('Limit wyszukiwania nieprawidłowy.')
        candidates = [p for p in getattr(self, 'audio', []) if p != q and p.is_file()]
        candidates.sort(key=lambda p: str(p).casefold())
        truncated = len(candidates) > candidate_limit
        candidates = candidates[:candidate_limit]
        if not candidates:
            return {'query': q.relative_to(self.root).as_posix(), 'results': [], 'candidateCount': 0,
                    'truncated': False, 'method': 'Adaptive Fingerprinting X; local deterministic ranking'}
        qf = self._fingerprint(q)
        # Only fresh-hash same-size candidates, under a fixed 2 GiB aggregate budget.
        q_size = q.stat().st_size
        sha_check_paths, hash_budget = set(), 2 * 1024 ** 3
        query_sha = None
        for candidate in candidates:
            try:
                size = candidate.stat().st_size
            except OSError:
                continue
            query_cost = q_size if not sha_check_paths else 0
            if size == q_size and query_cost + size <= hash_budget:
                sha_check_paths.add(candidate)
                hash_budget -= query_cost + size
        if sha_check_paths:
            query_sha = core.digest(q)
        def score_one(p):
            try:
                fp = self._fingerprint(p)
                detail = adaptive_similarity(qf, fp)
                same_hash = core.digest(p) == query_sha if p in sha_check_paths else None
                return {'path': p.relative_to(self.root).as_posix(), 'similarity': detail['similarity'],
                        'components': detail, 'duration': fp.get('duration'), 'size': p.stat().st_size,
                        'sha256Identical': same_hash, 'sha256Checked': p in sha_check_paths}
            except Exception as exc:
                return {'path': p.relative_to(self.root).as_posix(), 'error': str(exc)[:180]}
        with ThreadPoolExecutor(max_workers=min(4, len(candidates))) as pool:
            rows = list(pool.map(score_one, candidates))
        rows = [r for r in rows if 'similarity' in r]
        rows.sort(key=lambda r: (r['similarity'], r.get('sha256Identical') is True), reverse=True)
        self.emit('info', 'similarity-search', f'Smart Similarity Search: {len(rows)} kandydatów oceniono.',
                  query=q.relative_to(self.root).as_posix())
        return {'query': q.relative_to(self.root).as_posix(), 'results': rows[:limit],
                'candidateCount': len(candidates), 'truncated': truncated,
                'sha256Audit': {'freshCandidateHashes': len(sha_check_paths), 'byteBudget': 2 * 1024 ** 3,
                                'notChecked': 'Different-size candidates and candidates beyond the byte budget have sha256Identical=null.'},
                'method': 'Adaptive segment/chroma DTW + 8-band spectrum + rhythmic-profile cosine; local heuristic',
                'note': 'To ranking do ręcznej weryfikacji; brak modelu embeddingów ani odsłuchu.'}

    def auto_tonality(self, rel):
        p = _god_audio_path(self, rel)
        fp = self._fingerprint(p)
        result = {'path': p.relative_to(self.root).as_posix(), 'tonality': fp.get('tonality'),
                  'coverageSeconds': fp.get('adaptiveCoverageSeconds'), 'method': fp.get('adaptiveMethod'),
                  'note': 'Heurystyczna 12-bin chroma korelacja; tonacja może być niejednoznaczna, wielotonowa lub nieobecna.'}
        self.emit('info', 'auto-tonality', f'Auto Tonality Detect: {(result["tonality"] or {}).get("key") or "niejednoznaczna"}.', path=result['path'])
        return result

    def auto_transient_map(self, rel):
        p = _god_audio_path(self, rel)
        result = transient_map(p, self._fingerprint(p))
        result['path'] = p.relative_to(self.root).as_posix()
        self.emit('info', 'transient-map', f'Auto Transient Map: {len(result.get("transients", []))} kandydatów.', path=result['path'])
        return result

    def mix_integrity(self, rel):
        p = _god_audio_path(self, rel)
        result = mix_integrity_report(p, self._fingerprint(p))
        result['path'] = p.relative_to(self.root).as_posix()
        self.emit('info', 'mix-integrity', f'Mix Integrity Scan: {len(result.get("flags", []))} notatek.', path=result['path'])
        return result

    def gain_match_report(self, paths, target_rms_dbfs=None):
        if not isinstance(paths, list) or not paths:
            raise ValueError('Wybierz co najmniej jeden plik audio do gain match.')
        if len(paths) > 50:
            raise ValueError('Limit Auto Gain Match: 50 plików na partię.')
        if target_rms_dbfs is not None:
            try:
                target_rms_dbfs = float(target_rms_dbfs)
            except (TypeError, ValueError):
                raise ValueError('Docelowy RMS musi być liczbą w zakresie od -36 do -6 dBFS.')
            if not math.isfinite(target_rms_dbfs) or not -36 <= target_rms_dbfs <= -6:
                raise ValueError('Docelowy RMS musi być w zakresie od -36 do -6 dBFS.')
        safe_paths = []
        for rel in paths:
            p = _god_audio_path(self, rel)
            if p not in safe_paths:
                safe_paths.append(p)
        if not safe_paths:
            raise ValueError('Nie wybrano czytelnych plików audio.')
        if sum(self._audio_meta(p).get('duration', 0) for p in safe_paths) > 7200:
            raise ValueError('Limit Auto Gain Match: 2 godziny łącznego materiału na partię.')
        reports = []
        for p in safe_paths:
            row = producer_report(p)
            row['path'] = p.relative_to(self.root).as_posix()
            reports.append(row)
        valid = [r['rmsDbfs'] for r in reports if r.get('rmsDbfs') is not None]
        target = target_rms_dbfs if target_rms_dbfs is not None else (statistics.median(valid) if valid else None)
        output = []
        for row in reports:
            rms, peak = row.get('rmsDbfs'), row.get('peakDbfs')
            requested = (target - rms) if target is not None and rms is not None else 0.0
            requested = max(-24.0, min(12.0, requested))
            peak_ceiling = (-1.0 - peak) if peak is not None else 12.0
            applied = min(requested, peak_ceiling)
            output.append({'path': row['path'], 'duration': row.get('duration'), 'rmsDbfs': rms,
                           'peakDbfs': peak, 'crestDb': row.get('crestDb'),
                           'targetRmsDbfs': round(target, 2) if target is not None else None,
                           'requestedGainDb': round(requested, 2), 'appliedGainDb': round(applied, 2),
                           'predictedRmsDbfs': round(rms + applied, 2) if rms is not None else None,
                           'predictedPeakDbfs': round(peak + applied, 2) if peak is not None else None,
                           'crestFactorPreserved': True, 'silentOrUnknown': rms is None})
        return {'targetRmsDbfs': round(target, 2) if target is not None else None, 'mode': 'uniform scalar gain; crest factor preserved',
                'items': output, 'measurement': 'RMS and sample peak from local producer_report; not LUFS or true-peak',
                'safety': 'Requested matching gain is bounded to -24..+12 dB; additional attenuation may be applied to keep measured sample peak at or below -1 dBFS. No source is changed.'}

    def gain_match_export(self, paths, target_rms_dbfs=None):
        report = self.gain_match_report(paths, target_rms_dbfs)
        folder = self.root / '.dawbridge' / 'exports'
        folder.mkdir(parents=True, exist_ok=True)
        export_id = hashlib.sha256(f'{time.time_ns()}:{report["items"]}'.encode()).hexdigest()[:20]
        temp_dir = Path(tempfile.mkdtemp(prefix='gain-match-', dir=folder))
        archive_tmp = folder / f'.gain-match-{export_id}.tmp.zip'
        archive = folder / f'gain-match-{export_id}.zip'
        try:
            manifest = {'schema': 'dawbridge.gain-matched-media', 'version': 4,
                        'generatedAt': dt.datetime.now().isoformat(timespec='seconds'),
                        'mode': report['mode'], 'targetRmsDbfs': report['targetRmsDbfs'],
                        'measurement': report['measurement'], 'safety': report['safety'],
                        'sourceFiles': [], 'outputs': []}
            for i, row in enumerate(report['items'], 1):
                src = _god_audio_path(self, row['path'])
                name = re.sub(r'[^A-Za-z0-9._ -]+', '_', src.stem).strip(' .')[:80] or f'audio-{i}'
                dest_name = f'{i:02d}-{name}-gainmatched.wav'
                dest = temp_dir / dest_name
                factor = 10 ** (row['appliedGainDb'] / 20.0)
                with sf.SoundFile(str(src)) as reader:
                    with sf.SoundFile(str(dest), mode='w', samplerate=reader.samplerate,
                                      channels=reader.channels, format='WAV', subtype='FLOAT') as writer:
                        while True:
                            x = reader.read(frames=262144, dtype='float32', always_2d=True)
                            if not len(x):
                                break
                            writer.write((x * factor).astype(np.float32))
                manifest['sourceFiles'].append({'path': row['path'], 'sha256': self._hash(src)})
                manifest['outputs'].append({**row, 'file': dest_name, 'uniformGainFactor': factor,
                                            'sourceUnchanged': True})
            (temp_dir / 'gain-match-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
            with zipfile.ZipFile(archive_tmp, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as z:
                for item in sorted(temp_dir.iterdir()):
                    if item.is_file():
                        z.write(item, item.name)
            with zipfile.ZipFile(archive_tmp, 'r') as z:
                if z.testzip() is not None:
                    raise ValueError('Weryfikacja pakietu gain-match nie powiodła się.')
            os.replace(archive_tmp, archive)
            self.downloads[export_id] = archive
            self.emit('success', 'gain-match-export', f'Wyeksportowano {len(report["items"])} gain-matched kopii.', file=archive.relative_to(self.root).as_posix())
            return {'file': archive.relative_to(self.root).as_posix(), 'downloadId': export_id,
                    'items': manifest['outputs'], 'manifest': manifest, 'report': report,
                    'note': 'To nowe kopie float WAV; pliki źródłowe pozostały niezmienione.'}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
            archive_tmp.unlink(missing_ok=True)

    def _gain_match_session_archive(self, result, target_rms_dbfs=None):
        archive = self.downloads.get(result.get('downloadId'))
        if not archive or not archive.is_file():
            raise ValueError('Nie odnaleziono tymczasowego archiwum sesji do gain-match.')
        folder = self.root / '.dawbridge' / 'exports'
        temp_dir = Path(tempfile.mkdtemp(prefix='stem-gain-match-', dir=folder))
        temp_archive = folder / f'.session-gain-{result["downloadId"]}.tmp.zip'
        try:
            with zipfile.ZipFile(archive, 'r') as z:
                bad = z.testzip()
                if bad:
                    raise ValueError('Eksport źródłowy nie przeszedł weryfikacji ZIP.')
                z.extractall(temp_dir)
            manifest_path = temp_dir / 'manifest.json'
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            stems = manifest.get('stems', [])
            if not stems:
                raise ValueError('Eksport nie zawiera stemów do gain-match.')
            reports = []
            for stem in stems:
                path = temp_dir / Path(stem['file']).name
                profile = producer_report(path)
                reports.append((stem, path, profile))
            valid = [x[2]['rmsDbfs'] for x in reports if x[2].get('rmsDbfs') is not None]
            target = float(target_rms_dbfs) if target_rms_dbfs is not None else (statistics.median(valid) if valid else None)
            if target_rms_dbfs is not None and (target is None or not math.isfinite(target) or not -36 <= target <= -6):
                raise ValueError('Docelowy RMS musi być w zakresie od -36 do -6 dBFS.')
            if target is not None and not math.isfinite(target):
                raise ValueError('Docelowy RMS z pomiaru jest nieprawidłowy.')
            applied_rows = []
            for stem, path, profile in reports:
                rms, peak = profile.get('rmsDbfs'), profile.get('peakDbfs')
                requested = max(-24.0, min(12.0, target - rms)) if target is not None and rms is not None else 0.0
                ceiling = -1.0 - peak if peak is not None else 12.0
                applied = min(requested, ceiling)
                factor = 10 ** (applied / 20.0)
                scratch = path.with_suffix('.matched.wav')
                with sf.SoundFile(str(path)) as reader:
                    with sf.SoundFile(str(scratch), mode='w', samplerate=reader.samplerate,
                                      channels=reader.channels, format='WAV', subtype='FLOAT') as writer:
                        while True:
                            x = reader.read(frames=262144, dtype='float32', always_2d=True)
                            if not len(x):
                                break
                            writer.write((x * factor).astype(np.float32))
                scratch.replace(path)
                applied_rows.append({'file': stem['file'], 'rmsDbfs': rms, 'peakDbfs': peak,
                                     'targetRmsDbfs': round(target, 2) if target is not None else None,
                                     'appliedGainDb': round(applied, 2), 'crestFactorPreserved': True,
                                     'uniformGainFactor': factor, 'sourceMediaUnchanged': True})
            manifest['gainMatching'] = {'mode': 'uniform scalar gain per stem; crest factor preserved',
                                        'targetRmsDbfs': round(target, 2) if target is not None else None,
                                        'peakCeilingDbfs': -1.0, 'items': applied_rows,
                                        'note': 'RMS/sample-peak based; not LUFS or true-peak. Only generated float WAV stems changed.'}
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
            session_path = temp_dir / 'session.json'
            if session_path.is_file():
                neutral = json.loads(session_path.read_text(encoding='utf-8'))
                neutral['gainMatching'] = manifest['gainMatching']
                session_path.write_text(json.dumps(neutral, indent=2, ensure_ascii=False), encoding='utf-8')
            with zipfile.ZipFile(temp_archive, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as z:
                for item in sorted(temp_dir.iterdir()):
                    if item.is_file():
                        z.write(item, item.name)
            with zipfile.ZipFile(temp_archive, 'r') as z:
                if z.testzip() is not None:
                    raise ValueError('Weryfikacja stem-gain-match ZIP nie powiodła się.')
            os.replace(temp_archive, archive)
            result['manifest'] = manifest
            result['gainMatching'] = manifest['gainMatching']
            return result
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
            temp_archive.unlink(missing_ok=True)

    def session_export(self, pid, expected, sample_rate=48000, gain_match=False, target_rms_dbfs=None, confirm=False):
        if confirm is not True:
            raise ValueError('Eksport stemów wymaga jawnego confirm=true.')
        if gain_match and target_rms_dbfs is not None:
            try:
                target_rms_dbfs = float(target_rms_dbfs)
            except (TypeError, ValueError):
                raise ValueError('Docelowy RMS musi być w zakresie od -36 do -6 dBFS.')
            if not math.isfinite(target_rms_dbfs) or not -36 <= target_rms_dbfs <= -6:
                raise ValueError('Docelowy RMS musi być w zakresie od -36 do -6 dBFS.')
        item, _ = self.current(pid, expected)
        result = base_session_export(self, pid, expected, sample_rate, confirm=True)
        if gain_match:
            result = _gain_match_session_archive(self, result, target_rms_dbfs)
        manifest = result.get('manifest', {})
        result['exportReport'] = {'sourceProject': item['path'], 'status': 'completed',
            'renderedByDaw': False, 'exportsSourceMediaNotDawMix': True,
            'stemCount': len(result.get('stems', [])),
            'regionsConsolidated': manifest.get('regionsConsolidated'),
            'sourceMediaCount': len(manifest.get('media', [])),
            'exportedItems': manifest.get('exportedItems', {}),
            'missingSourceWarnings': manifest.get('missingSourceWarnings', []),
            'warnings': list(manifest.get('warnings', [])), 
            'userNotice': 'To konsolidacja plików źródłowych według sparsowanych regionów, nie render miksu z DAW. Pluginy, automation, fades, warp, pan/gain i sidechain nie są renderowane.'}
        result['note'] = result['exportReport']['userNotice']
        return result

    def auto_stem_rebuild(self, pid, expected_hash=None, gain_match=False, target_rms_dbfs=None, confirm=False):
        if confirm is not True:
            raise ValueError('Auto Stem Rebuild wymaga jawnego confirm=true.')
        item, project = self.current(pid, expected_hash)
        self._assert_daw_closed(item, project)
        exact_paths = {}
        unresolved = []
        candidates = []
        total_bytes = 0
        for ref in item.get('refs', []):
            rel = ref.get('resolved')
            if not rel:
                unresolved.append(ref.get('path'))
                continue
            p = core.safe(self.root, self.root / rel)
            if p.suffix.casefold() not in core.AUDIO or not p.is_file():
                continue
            key = p.relative_to(self.root).as_posix()
            exact_paths.setdefault(key, []).append(ref.get('index'))
            if p not in candidates:
                candidates.append(p)
                total_bytes += p.stat().st_size
        duplicate_paths = [{'path': path, 'referenceIndices': indices}
                           for path, indices in exact_paths.items() if len(indices) > 1]
        hashes = {}
        hash_note = 'Nie wykonano porównania bajtowego.'
        if len(candidates) <= 100 and total_bytes <= 2 * 1024 ** 3:
            for p in candidates:
                hashes.setdefault(core.digest(p), []).append(p.relative_to(self.root).as_posix())
            hash_note = 'Duplikaty bajtowe oznaczone wyłącznie przez SHA-256; hashowano do 100 plików / 2 GiB.'
        duplicate_content = [{'sha256': sha, 'paths': paths} for sha, paths in hashes.items() if len(paths) > 1]
        if project.is_dir() or item.get('format') == '.logicx':
            # The native project is read-only; the generic export will decide whether it has usable regions.
            pass
        result = self.session_export(item['id'], item['hash'], gain_match=gain_match,
                                     target_rms_dbfs=target_rms_dbfs, confirm=True)
        result.update({'workflow': 'Auto Stem Rebuild', 'status': 'completed',
                       'timelineAlignment': 'Sparsowane regiony przeliczone przez istniejącą stało-tempo oś Bridge; bez warp/automation/pan/gain z DAW.',
                       'duplicateDetection': {'sameResolvedPath': duplicate_paths,
                                              'identicalContentSha256': duplicate_content,
                                              'unresolvedReferences': unresolved, 'note': hash_note},
                       'sourceMediaCount': len(candidates),
                       'sourceProject': item['path'],
                       'gainMatchingApplied': bool(gain_match)})
        result['exportReport'] = {'sourceProject': item['path'], 'status': 'completed',
            'renderedByDaw': False, 'exportsSourceMediaNotDawMix': True,
            'stemCount': len(result.get('stems', [])), 'sourceMediaCount': len(candidates),
            'regionsConsolidated': (result.get('manifest') or {}).get('regionsConsolidated'),
            'duplicateAudit': result['duplicateDetection'],
            'exportedItems': (result.get('manifest') or {}).get('exportedItems', {}),
            'missingSourceWarnings': (result.get('manifest') or {}).get('missingSourceWarnings', []),
            'warnings': (result.get('manifest') or {}).get('warnings', []),
            'userNotice': 'Eksportuje źródłowe pliki audio według pól rozpoznanych przez parser; to nie jest miks/render z DAW ani eksport brzmienia pluginów.'}
        self.emit('success', 'stem-rebuild', f'Auto Stem Rebuild: {len(result.get("stems", []))} stemów.', project=item['path'])
        return result

    def session_storyboard(self, pid):
        item, _ = self.current(pid)
        bpm = item.get('tempoBpm')
        markers = []
        for m in item.get('markers', []):
            seconds = self._to_seconds(m.get('position', 0), m.get('unit', 'seconds'), bpm)
            markers.append({**m, 'seconds': seconds})
        markers = sorted(markers, key=lambda x: (float(x.get('seconds') or 0), str(x.get('name', '')).casefold()))
        end = float(item.get('timelineLengthSeconds') or 0)
        for m in markers:
            if m.get('seconds') is not None:
                end = max(end, float(m['seconds']))
        boundaries = []
        for m in markers:
            pos = max(0.0, float(m.get('seconds') or 0.0))
            if not boundaries or abs(pos - boundaries[-1][0]) > 0.01:
                boundaries.append((pos, str(m.get('name') or 'Marker')))
        if not boundaries or boundaries[0][0] > 0:
            boundaries.insert(0, (0.0, 'Unlabelled timeline'))
        chapters = []
        for i, (start, title) in enumerate(boundaries):
            stop = boundaries[i + 1][0] if i + 1 < len(boundaries) else end
            chapter_tracks = {}
            for region in item.get('regions', []):
                rstart = region.get('startSeconds')
                if rstart is None or not start <= float(rstart) < max(stop, start + 0.001):
                    continue
                ti = region.get('track')
                name = item.get('tracks', [])[ti].get('name', f'Track {ti + 1}') if ti is not None and 0 <= ti < len(item.get('tracks', [])) else f'Track {ti}'
                chapter_tracks.setdefault(name, []).append({'name': region.get('name'), 'startSeconds': rstart,
                                                            'endSeconds': region.get('endSeconds'), 'source': region.get('source'),
                                                            'muted': bool(region.get('muted'))})
            chapters.append({'index': i + 1, 'title': title, 'startSeconds': round(start, 4),
                             'endSeconds': round(max(stop, start), 4), 'durationSeconds': round(max(0.0, stop - start), 4),
                             'tracks': chapter_tracks, 'regionCount': sum(len(v) for v in chapter_tracks.values())})
        clips = []
        for region in item.get('regions', [])[:1000]:
            ti = region.get('track')
            track_name = item.get('tracks', [])[ti].get('name', f'Track {ti + 1}') if ti is not None and 0 <= ti < len(item.get('tracks', [])) else 'Unknown track'
            clips.append({'track': track_name, 'name': region.get('name'), 'startSeconds': region.get('startSeconds'),
                          'endSeconds': region.get('endSeconds'), 'source': region.get('source'),
                          'muted': bool(region.get('muted'))})
        return {'project': item['path'], 'daw': item['daw'], 'tempoBpm': bpm,
                'timeSignature': item.get('timeSignature'), 'timelineLengthSeconds': round(end, 4),
                'chapters': chapters[:300], 'clips': clips, 'markers': markers[:500],
                'trackCount': len(item.get('tracks', [])), 'regionCount': len(item.get('regions', [])),
                'parser': item.get('parser'), 'partialParser': bool(item.get('partial')),
                'storyText': ' / '.join(x['title'] for x in chapters[:30]),
                'note': 'Storyboard wyprowadzony wyłącznie z parsowanych nazw, markerów i regionów; nie analizuje treści audio ani aranżacji nieparsowanej przez adapter.'}

    def routing_map(self, pid, target_id=None):
        item, _ = self.current(pid)
        target_rows = None
        if target_id:
            sync = self.cross_sync(pid, target_id)
            target_rows = {x['sourceTrack']: x for x in sync.get('trackMappings', []) if x.get('accepted')}
        tracks = []
        for i, track in enumerate(item.get('tracks', [])):
            target = target_rows.get(i) if target_rows else None
            tracks.append({'index': i, 'name': track.get('name'), 'kind': track.get('kind', 'track'),
                           'pluginChain': track.get('plugins', []), 'references': track.get('refs', []),
                           'routing': track.get('routing', []),
                           'suggestedTargetTrack': ({'index': target.get('targetTrack'), 'name': target.get('targetName'),
                                                     'score': target.get('score')} if target else None)})
        edges = item.get('routing', []) or [route for track in item.get('tracks', []) for route in track.get('routing', [])]
        return {'source': item['path'], 'sourceDaw': item['daw'], 'target': self.projects.get(str(target_id), {}).get('path') if target_id else None,
                'targetDaw': self.projects.get(str(target_id), {}).get('daw') if target_id else None,
                'tracks': tracks, 'routingEdges': edges, 'groupsAndBuses': [t for t in tracks if any(x in str(t.get('kind', '')).casefold() for x in ('group', 'bus', 'folder', 'return'))],
                'parser': item.get('parser'), 'partialParser': bool(item.get('partial')),
                'limitations': ['Trasy/outputy zależą od adaptera i wersji projektu; brak routingu nie oznacza braku routingu w DAW.',
                                'Mapowanie między DAW jest sugestią nazw/mediów, nie wykonuje zmian w sesji.',
                                'VST, MIDI, automation, sidechain, sends i channel formats mogą być częściowe lub pominięte.']}

    def plugin_awareness_x(self, pid):
        base = base_plugin_awareness(self, pid)
        item, _ = self.current(pid)
        for plugin in base.get('plugins', []):
            plugin.update({'detectedVersion': None, 'versionStatus': 'not-present-in-reliable-parser-fields',
                           'compatibility': {'status': 'unverified', 'targetEnvironment': None,
                                             'requiresManualCheck': True},
                           'presets': [], 'instruments': [], 'impulseResponses': [],
                           'dependencyStatus': 'unknown'})
        references = []
        for ref in item.get('refs', []):
            value = str(ref.get('resolved') or ref.get('path') or '')
            suffix = Path(value.replace('\\', '/')).suffix.casefold()
            category = ('preset' if suffix in {'.fxp', '.fxb', '.vstpreset', '.aupreset', '.nksf', '.nki'}
                        else 'instrument' if suffix in {'.sf2', '.sfz', '.gig', '.dwp'}
                        else 'impulse_or_sample' if suffix in {'.wav', '.aif', '.aiff', '.flac'} and re.search(r'(^|[_ .-])(?:ir|impulse|convolution)(?:[_ .-]|$)', value, re.I)
                        else 'audio_dependency' if suffix in core.AUDIO else 'other')
            references.append({'path': ref.get('path'), 'resolved': ref.get('resolved'), 'exists': bool(ref.get('exists')),
                               'external': bool(ref.get('external')), 'category': category,
                               'compatibility': 'unverified'})
        assets = base.get('assets', [])
        asset_inventory = {
            'presets': [x for x in assets if x.get('category') == 'preset'],
            'instruments': [x for x in assets if x.get('category') == 'instrument_or_sample'],
            'impulseResponsesOrDependencies': [x for x in assets if x.get('category') == 'impulse_or_plugin_dependency'],
        }
        base.update({'version': 4, 'plugins': base.get('plugins', []), 'dependencies': references,
                     'assetInventory': asset_inventory,
                     'versionReporting': 'No reliable installed/plugin version inventory is queried.',
                     'compatibilityReport': {'status': 'unverified', 'platformScanPerformed': False,
                                             'pluginLoadTestPerformed': False,
                                             'pluginsWithUnknownVersion': len(base.get('plugins', [])),
                                             'manualReviewRequired': True}, 
                     'limitations': ['Nie odpytuje systemowych katalogów plug-inów ani rejestru.',
                                     'Nie ładuje instancji, presetów ani IR; wersje/kompatybilność są nieznane, jeśli adapter ich nie podaje.',
                                     'Projektowe dependency strings są zależne od parsera i mogą być niepełne.']})
        return base

    def watchdog_x(self, pid=None):
        health = self.health_check(pid)
        watch = self.watcher_status()
        projects = [self.projects[str(pid)]] if pid and str(pid) in self.projects else list(self.projects.values())
        changed = []
        for item in projects:
            try:
                p = core.safe(self.root, self.root / item['path'])
                if self.project_snapshot_hash(p) != item.get('hash'):
                    changed.append(item['path'])
            except Exception:
                changed.append(item['path'])
        conflicts = sorted(set(watch.get('conflicts', [])) | set(changed))
        return {'version': 4, 'safeMode': True, 'watcher': watch,
                'changedSinceScan': changed, 'activeConflicts': conflicts,
                'health': health, 'writesAllowed': False,
                'automationPolicy': self.automation_status().get('policy', {}),
                'recoveryHints': ['Po zmianie projektu: zatrzymaj zapis, uruchom ponowny skan i potwierdź hash.',
                                  'Nie usuwaj ani nie naprawiaj plików automatycznie; użyj istniejącej ścieżki z backupem i potwierdzeniem.'],
                'note': 'Watchdog raportuje lokalne stany i konflikty; nie blokuje ani nie zamyka DAW i nie gwarantuje wykrycia każdego procesu lub formatu.'}

    def session_storyboard_export(self, pid):
        data = self.session_storyboard(pid)
        folder = self.root / '.dawbridge' / 'exports'
        folder.mkdir(parents=True, exist_ok=True)
        name = f'session-storyboard-{hashlib.sha256(f"{data["project"]}:{time.time_ns()}".encode()).hexdigest()[:16]}.json'
        out = folder / name
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
        return {'file': out.relative_to(self.root).as_posix(), 'storyboard': data}

    def create_snapshot(self, pid):
        item, project = self.current(pid)
        now = dt.datetime.now().isoformat(timespec='seconds')
        folder = self.root / '.dawbridge' / 'snapshots'
        folder.mkdir(parents=True, exist_ok=True)
        media = []
        seen = set()
        count_bytes = 0
        for ref in item.get('refs', []):
            rel = ref.get('resolved')
            if not rel or rel in seen:
                continue
            seen.add(rel)
            p = core.safe(self.root, self.root / rel)
            if p.suffix.casefold() not in core.AUDIO or not p.is_file():
                continue
            size = p.stat().st_size
            row = {'path': rel, 'size': size, 'duration': self._audio_meta(p).get('duration')}
            if len(media) < 200 and count_bytes + size <= 2 * 1024 ** 3:
                row['sha256'] = core.digest(p)
                cached = self.cache.file(p).get('fingerprint') or {}
                if cached.get('adaptiveSegments'):
                    row['fingerprintSummary'] = {'version': 4, 'adaptiveSegmentCount': cached.get('adaptiveSegmentCount'),
                                                 'tonality': cached.get('tonality'), 'rhythmTempo': cached.get('rhythmTempo')}
                count_bytes += size
            else:
                row['sha256'] = None
                row['hashSkipped'] = 'cap 200 files / 2 GiB'
            media.append(row)
        issue_summary = {'parserErrors': list(item.get('errors', []))[:100],
                         'parserWarnings': list(item.get('warnings', []))[:100],
                         'missingReferences': [r.get('path') for r in item.get('refs', []) if not r.get('exists')][:500]}
        snapshot = {'schema': 'dawbridge.project-snapshot', 'version': 4, 'capturedAt': now,
                    'project': item['path'], 'hash': item.get('hash'), 'daw': item['daw'],
                    'format': item.get('format'), 'parser': item.get('parser'), 'support': item.get('support'),
                    'partialParser': bool(item.get('partial')), 'tempoBpm': item.get('tempoBpm'),
                    'timeSignature': item.get('timeSignature'), 'tempoMap': item.get('tempoMap', []),
                    'timelineLengthSeconds': item.get('timelineLengthSeconds', 0),
                    'tracks': item.get('tracks', []), 'regions': item.get('regions', []),
                    'markers': item.get('markers', []), 'routing': item.get('routing', []),
                    'plugins': item.get('plugins', []), 'refs': item.get('refs', []),
                    'sourceMedia': media, 'issueSummary': issue_summary,
                    'folderMappings': self.folder_mappings()[:200],
                    'limitations': ['Snapshot records only fields exposed by the current format adapter.',
                                    'Media SHA-256 is capped at 200 files and 2 GiB; unlisted hashes are explicitly marked skipped.',
                                    'No DAW/native project write is performed.']}
        stamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        out = folder / f'{item["id"]}-{stamp}.json'
        out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding='utf-8')
        summary = {'id': hashlib.sha256(f'{item["path"]}\0{item.get("hash")}\0{now}'.encode()).hexdigest()[:20],
                   'capturedAt': now, 'project': item['path'], 'hash': item.get('hash'),
                   'file': out.relative_to(self.root).as_posix(), 'source': 'manual', 'version': 4}
        self._snapshots.append(summary)
        self._snapshot_keys.add((item['path'], item.get('hash')))
        with open(self.root / '.dawbridge' / 'snapshots.jsonl', 'a', encoding='utf-8') as stream:
            stream.write(json.dumps(summary, ensure_ascii=True) + '\n')
        self.log({'time': now, 'action': 'project-snapshot-v4', 'project': item['path'], 'destination': summary['file']})
        self.emit('success', 'snapshot-pro', f'Utworzono snapshot v4: {item["path"]}.', project=item['path'])
        return summary

    def compare_snapshots(self, a, b):
        def load(rel):
            p = core.safe(self.root, self.root / str(rel))
            parts = p.relative_to(self.root).parts
            if len(parts) < 3 or parts[0] != '.dawbridge' or parts[1] != 'snapshots' or p.suffix.casefold() != '.json' or not p.is_file():
                raise ValueError('Wybierz dwa pliki JSON z .dawbridge/snapshots/.')
            if p.stat().st_size > 16 * 1024 * 1024:
                raise ValueError('Snapshot przekracza limit porównania 16 MB.')
            data = json.loads(p.read_text(encoding='utf-8'))
            if data.get('schema') != 'dawbridge.project-snapshot' or data.get('version') not in (3, 4):
                raise ValueError('Nieobsługiwany format snapshotu.')
            return data
        old, new = load(a), load(b)
        if old.get('project') != new.get('project'):
            raise ValueError('Snapshoty dotyczą różnych projektów.')
        def set_delta(x, y):
            a_set, b_set = set(x), set(y)
            return {'added': sorted(b_set - a_set), 'removed': sorted(a_set - b_set)}
        old_tracks = [x.get('name', '') for x in old.get('tracks', [])]
        new_tracks = [x.get('name', '') for x in new.get('tracks', [])]
        old_media = {x.get('path'): x.get('sha256') for x in old.get('sourceMedia', []) if x.get('path')}
        new_media = {x.get('path'): x.get('sha256') for x in new.get('sourceMedia', []) if x.get('path')}
        changed_media = []
        for path in sorted(old_media.keys() & new_media.keys()):
            if old_media[path] and new_media[path] and old_media[path] != new_media[path]:
                changed_media.append({'path': path, 'oldSha256': old_media[path], 'newSha256': new_media[path]})
        return {'project': new.get('project'), 'from': {'capturedAt': old.get('capturedAt'), 'hash': old.get('hash')},
                'to': {'capturedAt': new.get('capturedAt'), 'hash': new.get('hash')},
                'projectHashChanged': old.get('hash') != new.get('hash'),
                'tempoBpm': {'from': old.get('tempoBpm'), 'to': new.get('tempoBpm')},
                'timeSignature': {'from': old.get('timeSignature'), 'to': new.get('timeSignature')},
                'trackNames': set_delta(old_tracks, new_tracks), 'markers': set_delta([json.dumps(x, sort_keys=True) for x in old.get('markers', [])],
                                                                                     [json.dumps(x, sort_keys=True) for x in new.get('markers', [])]),
                'regionCount': {'from': len(old.get('regions', [])), 'to': len(new.get('regions', []))},
                'plugins': set_delta([str(x.get('name') if isinstance(x, dict) else x) for x in old.get('plugins', [])],
                                     [str(x.get('name') if isinstance(x, dict) else x) for x in new.get('plugins', [])]),
                'media': {'added': sorted(new_media.keys() - old_media.keys()), 'removed': sorted(old_media.keys() - new_media.keys()),
                          'changedSha256': changed_media,
                          'hashesUnavailable': [p for p in old_media.keys() & new_media.keys() if not old_media[p] or not new_media[p]]},
                'limitations': ['Snapshot deltas describe parsed fields only; differences in unsupported/opaque native project data may not be listed.']}

    def library_intelligence(self, limit=120):
        try:
            limit = max(1, min(200, int(limit)))
        except (TypeError, ValueError):
            raise ValueError('Library limit nieprawidłowy.')
        paths = [p for p in getattr(self, 'audio', []) if p.is_file()]
        paths.sort(key=lambda p: str(p).casefold())
        truncated = len(paths) > limit
        paths = paths[:limit]
        rows = []
        tokens = {'kick': ('kick', 'bd'), 'snare': ('snare',), 'hat': ('hat', 'hihat', 'hi-hat'),
                  'vocal': ('vocal', 'vox', 'voice'), 'bass': ('bass',), 'fx': ('fx', 'sfx', 'riser', 'impact'),
                  'loop': ('loop',), 'drums': ('drum', 'perc', 'percussion'), 'synth': ('synth', 'pad', 'lead')}
        for p in paths:
            rel = p.relative_to(self.root).as_posix()
            label = (p.stem + ' ' + ' '.join(p.parent.parts)).casefold()
            tags = [name for name, keys in tokens.items() if any(k in label for k in keys)]
            if not tags:
                tags = ['unclassified']
            try:
                profile = self._fingerprint(p)
                meta = self._audio_meta(p)
                key = profile.get('tonality') or {}
                tempo = (profile.get('rhythmTempo') or {}).get('bpm')
                rms = profile.get('rms')
                row = {'path': rel, 'size': meta.get('size'), 'duration': meta.get('duration'),
                       'sampleRate': meta.get('sampleRate'), 'channels': meta.get('channels'),
                       'tags': tags, 'tonality': key, 'tempoBpm': tempo,
                       'rmsDbfs': round(20 * math.log10(rms), 2) if rms and rms > 0 else None,
                       'adaptiveSegmentCount': profile.get('adaptiveSegmentCount'),
                       'analysisCoverageSeconds': profile.get('adaptiveCoverageSeconds'),
                       'confidence': 'metadata + filename/folder rules; key/tempo are heuristic'}
            except Exception as exc:
                row = {'path': rel, 'tags': tags, 'analysisError': str(exc)[:180],
                       'confidence': 'filename/folder rules only'}
            rows.append(row)
        groups = {}
        for row in rows:
            tempo = row.get('tempoBpm')
            tempo_bucket = int(round(float(tempo) / 5.0) * 5) if tempo else None
            key = (','.join(row['tags']), ((row.get('tonality') or {}).get('key')), tempo_bucket)
            groups.setdefault(key, []).append(row['path'])
        group_rows = [{'tags': k[0].split(','), 'key': k[1], 'tempoBucketBpm': k[2], 'count': len(v), 'paths': v[:30]}
                      for k, v in sorted(groups.items(), key=lambda item: (-len(item[1]), str(item[0])))]
        return {'version': 4, 'analyzedFiles': len(rows), 'libraryFiles': len(getattr(self, 'audio', [])),
                'truncated': truncated, 'items': rows, 'groups': group_rows,
                'note': 'Library Intelligence creates local filename/folder tags and cached heuristic key/tempo/group suggestions; it does not listen semantically, use embeddings, or generate metadata with an ML model.'}

    def ai_assist(self, pid=None):
        result = base_ai_assist(self, pid)
        result.update({'version': 4, 'engine': 'Producer AI Ultra · local deterministic rules', 'modelUsed': False,
                       'godModeFeatures': ['adaptive audio profiles', 'timeline storyboard', 'mix measurements',
                                           'dependency reporting', 'duplicate/source integrity', 'snapshot deltas'],
                       'note': 'Producentowe sugestie i raporty są lokalnymi regułami/pomiarami, nie generatywnym modelem ani mastering certification.'})
        if pid and str(pid) in self.projects:
            result['sessionStoryboardSummary'] = self.session_storyboard(pid)
        return result

    def performance_stats(self):
        result = base_performance_stats(self)
        result.update({'godMode': '4.1 local bounded analysis',
                       'analysisScheduler': self._priority_gate().status(),
                       'resourcePolicy': {'audioAnalysisWorkers': self._priority_gate().workers,
                                          'scheduler': 'foreground requests overtake queued watcher jobs; bounded priority queue',
                                          'adaptiveFingerprintCoverageSeconds': 180,
                                          'similaritySearchCandidatesMax': 300, 'gainMatchBatchMax': 50,
                                          'libraryIntelligenceRowsMax': 200},
                       'cachePolicy': 'SQLite stat-keyed media fingerprints; stale v3 fingerprints upgraded lazily to v4.'})
        return result

    def run_workflow(self, workflow, pid=None, path=None, expected_hash=None, confirm=False, selections=None,
                     gain_match=False, target_rms_dbfs=None, paths=None, limit=15):
        name = str(workflow or '').strip().casefold().replace('_', '-')
        if name in {'auto-stem-rebuild', 'stem-rebuild'}:
            if not pid:
                raise ValueError('Auto Stem Rebuild wymaga id projektu.')
            if confirm is not True:
                raise ValueError('Auto Stem Rebuild wymaga confirm=true; sprawdzane są Safe Mode, hash projektu i kopie źródeł.')
            return self.auto_stem_rebuild(pid, expected_hash, gain_match, target_rms_dbfs, confirm=True)
        if name in {'auto-export', 'auto-stems', 'stems'} and gain_match:
            if not pid or confirm is not True:
                raise ValueError('Eksport wymaga id projektu i jawnego confirm=true.')
            item, _ = self.current(pid, expected_hash)
            result = self.session_export(item['id'], item['hash'], gain_match=True,
                                         target_rms_dbfs=target_rms_dbfs, confirm=True)
            return {'workflow': 'Auto-Export' if name == 'auto-export' else 'Auto-Stems', 'status': 'completed', **result}
        if name in {'auto-tonality', 'tonality'}:
            if not path:
                raise ValueError('Auto Tonality wymaga path audio.')
            return {'workflow': 'Auto Tonality Detect', 'status': 'suggestion', **self.auto_tonality(path)}
        if name in {'auto-transient-map', 'transient-map'}:
            if not path:
                raise ValueError('Auto Transient Map wymaga path audio.')
            return {'workflow': 'Auto Transient Map', 'status': 'suggestion-only', **self.auto_transient_map(path)}
        if name in {'mix-integrity', 'integrity-scan'}:
            if not path:
                raise ValueError('Mix Integrity Scan wymaga path audio.')
            return {'workflow': 'Mix Integrity Scan', 'status': 'report-only', **self.mix_integrity(path)}
        if name in {'auto-gain-match', 'gain-match'}:
            if not isinstance(paths, list) or not paths:
                if path:
                    paths = [path]
                else:
                    raise ValueError('Auto Gain Match wymaga jawnej listy paths lub path audio.')
            result = (self.gain_match_export(paths, target_rms_dbfs) if confirm is True
                      else self.gain_match_report(paths, target_rms_dbfs))
            return {'workflow': 'Auto Gain Match', 'status': 'copies-exported' if confirm else 'suggestion', **result}
        if name in {'similarity-search', 'smart-similarity-search'}:
            if not path:
                raise ValueError('Smart Similarity Search wymaga path audio.')
            return {'workflow': 'Smart Similarity Search', 'status': 'completed', **self.smart_similarity_search(path, limit)}
        if name in {'library-intelligence', 'library'}:
            return {'workflow': 'Library Intelligence', 'status': 'completed', **self.library_intelligence(limit)}
        if name in {'session-storyboard', 'storyboard'}:
            if not pid:
                raise ValueError('Session Storyboard wymaga id projektu.')
            return {'workflow': 'Session Storyboard', 'status': 'completed', **self.session_storyboard(pid)}
        if name in {'watchdog-x', 'watchdog'}:
            return {'workflow': 'Bridge Watchdog X', 'status': 'report-only', **self.watchdog_x(pid)}
        if name in {'plugin-awareness-x', 'plugins-x'}:
            if not pid:
                raise ValueError('Plugin Awareness X wymaga id projektu.')
            return {'workflow': 'Plugin Awareness X', 'status': 'report-only', **self.plugin_awareness_x(pid)}
        return base_run_workflow(self, workflow, pid, path, expected_hash, confirm, selections)

    def automation_status(self):
        data = self._base_automation_status() if hasattr(self, '_base_automation_status') else None
        if data is None:
            # base_run_workflow's sibling installer sets the stable method before this wrapper is installed.
            import ultra_engine
            # Keep this branch unreachable in normal construction, but avoid recursive calls if method binding changes.
            policy = self._read_metadata_raw().get('automation', {})
            if not isinstance(policy, dict):
                policy = {}
            data = {'watcher': self.watcher_status(), 'safeMode': True, 'policy': policy, 'workflows': []}
        data['version'] = 4
        data['godModeFeatures'] = ['Adaptive Fingerprinting X', 'Mix Integrity Scan', 'Auto Stem Rebuild',
                                   'Cross-DAW Routing Map', 'Plugin Awareness X', 'Session Storyboard',
                                   'Auto Gain Match', 'Bridge Watchdog X', 'Library Intelligence',
                                   'Smart Similarity Search', 'Auto Tonality Detect', 'Auto Transient Map',
                                   'Producer AI Ultra', 'Performance Boost X', 'Snapshot Engine Pro']
        workflows = data.setdefault('workflows', [])
        existing = {x.get('id') for x in workflows if isinstance(x, dict)}
        for row in [
            {'id': 'auto-stem-rebuild', 'mode': 'explicit confirmation + Safe Mode + source hash validation', 'nativeWrite': False},
            {'id': 'auto-gain-match', 'mode': 'report-only unless explicit confirmation; exports new copies', 'nativeWrite': False},
            {'id': 'auto-transient-map', 'mode': 'suggestion-only', 'nativeWrite': False},
            {'id': 'auto-tonality', 'mode': 'suggestion-only', 'nativeWrite': False},
        ]:
            if row['id'] not in existing:
                workflows.append(row)
        data['standalone'] = {'launcherPresent': True, 'nativeInstaller': False, 'note': 'Local Python launcher/application panels; no installer or bundled DAW.'}
        return data

    # Preserve original 3.0 behavior while adding new bounded endpoints.
    engine_class._god_audio_path = _god_audio_path
    engine_class.preflight = preflight
    engine_class.session_compatibility_report = session_compatibility_report
    engine_class._priority_gate = _priority_gate
    engine_class.deep_scan_audio = deep_scan_audio
    engine_class._fingerprint = _fingerprint
    engine_class.fingerprint_similarity = staticmethod(fingerprint_similarity)
    engine_class.fingerprint_compare = fingerprint_compare
    engine_class.smart_similarity_search = smart_similarity_search
    engine_class.auto_tonality = auto_tonality
    engine_class.auto_transient_map = auto_transient_map
    engine_class.mix_integrity = mix_integrity
    engine_class.gain_match_report = gain_match_report
    engine_class.gain_match_export = gain_match_export
    engine_class._gain_match_session_archive = _gain_match_session_archive
    engine_class.session_export = session_export
    engine_class.auto_stem_rebuild = auto_stem_rebuild
    engine_class.session_storyboard = session_storyboard
    engine_class.session_storyboard_export = session_storyboard_export
    engine_class.routing_map = routing_map
    engine_class.plugin_awareness_x = plugin_awareness_x
    engine_class.watchdog_x = watchdog_x
    engine_class.create_snapshot = create_snapshot
    engine_class.compare_snapshots = compare_snapshots
    engine_class.library_intelligence = library_intelligence
    engine_class.ai_assist = ai_assist
    engine_class.performance_stats = performance_stats
    engine_class.run_workflow = run_workflow

    # Keep the v3 status implementation as a non-recursive delegate.
    engine_class._base_automation_status = engine_class.automation_status
    engine_class.automation_status = automation_status
