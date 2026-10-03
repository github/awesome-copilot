import argparse
import json
import mimetypes
import os
import re
import secrets
import threading
import traceback
import time
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from engine import Engine

HERE = Path(__file__).parent
parser = argparse.ArgumentParser(description='DAW Bridge local workspace server')
parser.add_argument('--root', required=True, help='Jawnie wybrany folder projektu i mediów')
parser.add_argument('--port', type=int, default=8765)
parser.add_argument('--host', default='127.0.0.1')
args = parser.parse_args()
if not Path(args.root).is_dir():
    parser.error('Folder --root nie istnieje.')
try:
    engine = Engine(args.root, watch=True)
except Exception as exc:
    parser.error(str(exc))
lock = threading.Lock()
token = secrets.token_urlsafe(32)


class Handler(BaseHTTPRequestHandler):
    server_version = 'DAWBridge/4.2'
    sys_version = ''

    def log_message(self, *_):
        return

    def send(self, status, obj, ctype='application/json; charset=utf-8', headers=None):
        raw = json.dumps(obj, ensure_ascii=True, allow_nan=False).encode('utf-8') if ctype.startswith('application/json') else obj
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if headers:
            for key, value in headers.items(): self.send_header(key, value)
        self.end_headers()
        try: self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError): pass

    def send_file(self, path, filename):
        self.send_response(200)
        self.send_header('Content-Type', 'application/zip')
        self.send_header('Content-Length', str(path.stat().st_size))
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        try:
            with open(path, 'rb') as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    self.wfile.write(block)
        except (BrokenPipeError, ConnectionResetError): pass

    def authorized(self):
        return secrets.compare_digest(self.headers.get('X-Bridge-Token', ''), token)

    def host_ok(self):
        raw = self.headers.get('Host', '')
        parsed = urlparse('//' + raw)
        hostname = (parsed.hostname or '').casefold()
        if hostname in {'127.0.0.1', 'localhost', '::1'}:
            return parsed.port == args.port
        # The Agent Mode preview proxy uses {port}-{sandboxId}.e2b.app.
        return bool(re.fullmatch(rf'{args.port}-[a-z0-9-]+\.e2b\.app', hostname))

    def origin_ok(self):
        origin = self.headers.get('Origin')
        return self.host_ok() and (not origin or urlparse(origin).netloc == self.headers.get('Host'))

    def do_GET(self):
        route = urlparse(self.path).path
        if not self.host_ok(): return self.send(421, {'error': 'Host nie jest dozwolony dla lokalnego Bridge.'})
        if route == '/':
            html = (HERE / 'index.html').read_bytes().replace(b'__TOKEN__', token.encode())
            return self.send(200, html, 'text/html; charset=utf-8', {
                'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'self'",
                'X-Frame-Options': 'SAMEORIGIN'})
        if not self.authorized(): return self.send(403, {'error': 'Brak autoryzacji lokalnej sesji.'})
        if route == '/api/status': return self.send(200, {'appName': 'DAW Bridge GOD MODE', 'version': '4.2.0',
            'root': str(engine.root), 'state': engine.state, 'safeMode': True,
            'watcher': engine.watcher_status(), 'performance': engine.performance_stats(), 'automation': engine.automation_status()})
        if route == '/api/history': return self.send(200, engine.history())
        if route == '/api/report': return self.send(200, engine.state)
        if route == '/api/settings': return self.send(200, engine.get_settings())
        if route == '/api/performance': return self.send(200, engine.performance_stats())
        if route == '/api/automation': return self.send(200, engine.automation_status())
        if route == '/api/snapshots': return self.send(200, engine.snapshot_history())
        if route == '/api/monitor':
            try: since = max(0, int(parse_qs(urlparse(self.path).query).get('since', ['0'])[0]))
            except ValueError: since = 0
            return self.send(200, {'events': engine.monitor(since), 'lastId': getattr(engine, '_event_id', 0),
                                   'stats': engine.performance_stats(), 'watcher': engine.watcher_status()})
        if route.startswith('/api/download/'):
            download_id = route.rsplit('/', 1)[-1]
            file = engine.downloads.get(download_id)
            if not file or not file.is_file(): return self.send(404, {'error': 'Plik eksportu nie istnieje lub sesja serwera wygasła.'})
            return self.send_file(file, file.name)
        return self.send(404, {'error': 'Nie znaleziono.'})

    def do_POST(self):
        if not self.authorized() or not self.origin_ok(): return self.send(403, {'error': 'Niedozwolone żądanie.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 0 or length > 1_000_000: raise ValueError('Limit żądania 1 MB.')
            data = json.loads(self.rfile.read(length) or b'{}')
            if not isinstance(data, dict): raise ValueError('Oczekiwany obiekt JSON.')
        except Exception as exc:
            return self.send(400, {'error': 'Nieprawidłowe dane JSON.', 'detail': str(exc)[:150]})
        if not lock.acquire(blocking=False): return self.send(409, {'error': 'Trwa inna operacja. Poczekaj na jej zakończenie.'})
        route = urlparse(self.path).path
        started = time.perf_counter()
        try:
            if route == '/api/scan': result = engine.scan(data.get('mode'))
            elif route == '/api/duplicates': result = engine.duplicates()
            elif route == '/api/smart-index': result = engine.smart_index()
            elif route == '/api/resolve': result = engine.smart_resolve(data['id'])
            elif route == '/api/fingerprint': result = engine.fingerprint_compare(data['a'], data['b'])
            elif route == '/api/folder-map': result = engine.folder_mappings()
            elif route == '/api/health': result = engine.health_check(data.get('id'))
            elif route == '/api/preflight': result = engine.preflight(data['id'], data.get('operation', 'stems'), data.get('backup'), data.get('selections'))
            elif route == '/api/compatibility': result = engine.session_compatibility_report(data['id'])
            elif route == '/api/cross-sync': result = engine.cross_sync(data['source'], data['target'])
            elif route == '/api/sync-export': result = engine.sync_export(data['source'], data['target'])
            elif route == '/api/session-export':
                if data.get('confirm') is not True: raise ValueError('Wymagane jawne zatwierdzenie eksportu stemów.')
                result = engine.session_export(data['id'], data['hash'], confirm=True,
                    gain_match=data.get('gainMatch') is True, target_rms_dbfs=data.get('targetRmsDbfs'))
            elif route == '/api/repair':
                if data.get('confirm') is not True: raise ValueError('Wymagane zatwierdzenie naprawy.')
                result = engine.repair(data['id'], data['hash'], data['selections'], confirm=True)
            elif route == '/api/flp-tempo-copy':
                if data.get('confirm') is not True: raise ValueError('Wymagane zatwierdzenie edycji kopii FLP.')
                result = engine.save_flp_tempo_copy(data['id'], data['hash'], data['tempo'], confirm=True)
            elif route == '/api/song-tempo-copy':
                if data.get('confirm') is not True: raise ValueError('Wymagane zatwierdzenie kopii .song.')
                result = engine.save_song_tempo_copy(data['id'], data['hash'], data['tempo'])
            elif route == '/api/restore':
                if data.get('confirm') is not True: raise ValueError('Wymagane potwierdzenie odtworzenia backupu.')
                result = engine.restore_backup(data['backup'], data['project'], confirm=True)
            elif route == '/api/portable':
                if data.get('confirm') is not True: raise ValueError('Wymagane zatwierdzenie pakietu RPP.')
                result = engine.export(data['id'], data['hash'], confirm=True)
            elif route == '/api/audio': result = engine.analyze_audio_path(data['path'])
            elif route == '/api/producer': result = engine.producer_analysis(data['path'])
            elif route == '/api/ai-assist': result = engine.ai_assist(data.get('id'))
            elif route == '/api/plugin-awareness': result = engine.plugin_awareness(data['id'])
            elif route == '/api/plugin-awareness-x': result = engine.plugin_awareness_x(data['id'])
            elif route == '/api/routing-map': result = engine.routing_map(data['id'], data.get('targetId'))
            elif route == '/api/session-storyboard': result = engine.session_storyboard(data['id'])
            elif route == '/api/storyboard-export': result = engine.session_storyboard_export(data['id'])
            elif route == '/api/mix-integrity': result = engine.mix_integrity(data['path'])
            elif route == '/api/tonality': result = engine.auto_tonality(data['path'])
            elif route == '/api/transient-map': result = engine.auto_transient_map(data['path'])
            elif route == '/api/gain-match':
                paths = data.get('paths') or ([data['path']] if data.get('path') else None)
                if data.get('confirm') is True:
                    result = engine.gain_match_export(paths, data.get('targetRmsDbfs'))
                else:
                    result = engine.gain_match_report(paths, data.get('targetRmsDbfs'))
            elif route == '/api/similarity-search':
                result = engine.smart_similarity_search(data['path'], data.get('limit', 15), data.get('candidateLimit', 120))
            elif route == '/api/library-intelligence': result = engine.library_intelligence(data.get('limit', 120))
            elif route == '/api/watchdog-x': result = engine.watchdog_x(data.get('id'))
            elif route == '/api/snapshot-compare': result = engine.compare_snapshots(data['a'], data['b'])
            elif route == '/api/metadata-brain': result = engine.metadata_brain(data['id'])
            elif route == '/api/library-optimize': result = engine.library_optimizer()
            elif route == '/api/snapshot': result = engine.create_snapshot(data['id'])
            elif route == '/api/automation':
                result = engine.run_workflow(data['workflow'], pid=data.get('id'), path=data.get('path'),
                    expected_hash=data.get('hash'), confirm=data.get('confirm') is True, selections=data.get('selections'),
                    gain_match=data.get('gainMatch') is True, target_rms_dbfs=data.get('targetRmsDbfs'),
                    paths=data.get('paths'), limit=data.get('limit', 15))
            elif route == '/api/watcher':
                result = engine.start_watcher(data.get('interval', 4.0)) if data.get('enabled') is not False else engine.stop_watcher()
            elif route == '/api/audio-list': result = [str(p.relative_to(engine.root).as_posix()) for p in engine.audio if p.suffix.casefold() == '.wav']
            elif route == '/api/audio-index': result = [str(p.relative_to(engine.root).as_posix()) for p in engine.audio]
            elif route == '/api/settings': result = engine.save_settings(data)
            else: return self.send(404, {'error': 'Nie znaleziono.'})
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            engine.emit('info', 'api-operation', f'{route} zakończone.', elapsedMs=elapsed)
            return self.send(200, result)
        except (ValueError, KeyError, IndexError, TypeError, OSError) as exc:
            engine.emit('error', route, str(exc), elapsedMs=round((time.perf_counter() - started) * 1000, 2))
            return self.send(400, {'error': str(exc)[:1000]})
        except Exception as exc:
            engine.emit('error', route, f'{type(exc).__name__}: {exc}', elapsedMs=round((time.perf_counter() - started) * 1000, 2))
            traceback.print_exc()
            return self.send(500, {'error': 'Operacja nie powiodła się. Sprawdź Bridge Monitor i launcher.log.'})
        finally:
            lock.release()


class SafeThreadingHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


print(f'DAW Bridge GOD MODE 4.2: http://{args.host}:{args.port} | Root: {engine.root} | Safe Mode ON', flush=True)
SafeThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
