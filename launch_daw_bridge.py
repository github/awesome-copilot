"""Standalone local launcher for DAW Bridge GOD MODE 4.2.

It starts the loopback-only server and opens the built-in application panels in
the default browser. No installer, cloud service, or DAW executable is bundled.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import filedialog, messagebox

HERE = Path(__file__).resolve().parent


def launcher_settings_path() -> Path:
    if sys.platform == 'win32':
        base = Path(os.environ.get('APPDATA') or Path.home() / 'AppData' / 'Roaming')
        return base / 'DAWBridge' / 'launcher.json'
    if sys.platform == 'darwin':
        return Path.home() / 'Library' / 'Application Support' / 'DAWBridge' / 'launcher.json'
    return Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'daw-bridge' / 'launcher.json'


def load_last_workspace() -> str:
    try:
        value = json.loads(launcher_settings_path().read_text(encoding='utf-8')).get('lastWorkspace', '')
        return str(value) if value and Path(value).is_dir() else ''
    except (OSError, json.JSONDecodeError, AttributeError):
        return ''


def save_last_workspace(path: Path) -> None:
    settings = launcher_settings_path()
    settings.parent.mkdir(parents=True, exist_ok=True)
    temp = settings.with_suffix('.tmp')
    temp.write_text(json.dumps({'lastWorkspace': str(path)}, indent=2), encoding='utf-8')
    os.replace(temp, settings)


def run_webview(url: str) -> None:
    import webview
    webview.create_window('DAW Bridge · GOD MODE 4.2', url, width=1440, height=920, min_size=(900, 620))
    webview.start()


def available_port(start: int = 8765) -> int:
    for port in range(start, start + 100):
        with socket.socket() as sock:
            try:
                sock.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    raise RuntimeError('Nie znaleziono wolnego portu localhost w zakresie 8765–8864.')


class Launcher:
    def __init__(self, root: tk.Tk, initial: str | None = None):
        self.root = root
        self.root.title('DAW Bridge · GOD MODE 4.2')
        self.root.geometry('560x270')
        self.root.minsize(500, 250)
        self.root.configure(bg='#141619')
        self.process: subprocess.Popen | None = None
        self.webview_process: subprocess.Popen | None = None
        self.log_file = None
        self.port: int | None = None
        self.workspace = tk.StringVar(value=initial or load_last_workspace())
        self.status = tk.StringVar(value='Wybierz ograniczony folder projektów i mediów.')
        self._build()
        self.root.protocol('WM_DELETE_WINDOW', self.close)
        if initial:
            self.root.after(250, lambda: self.start(Path(initial)))

    def _build(self):
        frame = tk.Frame(self.root, bg='#141619', padx=22, pady=18)
        frame.pack(fill='both', expand=True)
        tk.Label(frame, text='DAW Bridge', fg='#cefa70', bg='#141619',
                 font=('Segoe UI', 20, 'bold')).pack(anchor='w')
        tk.Label(frame, text='GOD MODE 4.2 · standalone local launcher', fg='#9da5af',
                 bg='#141619', font=('Segoe UI', 9)).pack(anchor='w', pady=(0, 13))
        tk.Label(frame, text='Project & media root', fg='#dfe3e8', bg='#141619',
                 font=('Segoe UI', 9, 'bold')).pack(anchor='w')
        row = tk.Frame(frame, bg='#141619')
        row.pack(fill='x', pady=(5, 11))
        self.path_entry = tk.Entry(row, textvariable=self.workspace, bg='#101318', fg='white',
                                   insertbackground='white', relief='flat')
        self.path_entry.pack(side='left', fill='x', expand=True, ipady=8, padx=(0, 7))
        self._button(row, 'Choose…', self.choose).pack(side='right')
        actions = tk.Frame(frame, bg='#141619')
        actions.pack(fill='x')
        self.start_button = self._button(actions, 'Launch Bridge', self.launch, primary=True)
        self.start_button.pack(side='left', padx=(0, 7))
        self.open_button = self._button(actions, 'Open App', self.open_app, state='disabled')
        self.open_button.pack(side='left', padx=(0, 7))
        self.stop_button = self._button(actions, 'Stop', self.stop, state='disabled')
        self.stop_button.pack(side='left')
        self._button(actions, 'Open log', self.open_log).pack(side='right')
        tk.Label(frame, textvariable=self.status, fg='#b8c0ca', bg='#141619',
                 wraplength=510, justify='left', font=('Segoe UI', 9)).pack(anchor='w', pady=(16, 5))
        tk.Label(frame, text='Localhost only · Safe Mode · media stays on this computer',
                 fg='#73808e', bg='#141619', font=('Segoe UI', 8)).pack(anchor='w')

    @staticmethod
    def _button(parent, text, command, primary=False, state='normal'):
        return tk.Button(parent, text=text, command=command, state=state,
                         bg='#cefa70' if primary else '#262a30',
                         fg='#17200a' if primary else '#e5e8ed',
                         activebackground='#dafa94' if primary else '#353b43',
                         activeforeground='#17200a' if primary else 'white',
                         relief='flat', padx=13, pady=8, cursor='hand2',
                         font=('Segoe UI', 9, 'bold' if primary else 'normal'))

    def choose(self):
        selected = filedialog.askdirectory(title='Select DAW Bridge project/media root',
                                            initialdir=self.workspace.get() or str(HERE))
        if selected:
            self.workspace.set(selected)
            try:
                save_last_workspace(Path(selected).resolve())
            except OSError:
                pass
            self.start(Path(selected))

    def launch(self):
        value = self.workspace.get().strip()
        if not value:
            self.choose()
            return
        self.start(Path(value))

    def start(self, workspace: Path):
        workspace = workspace.expanduser().resolve()
        if not workspace.is_dir():
            messagebox.showerror('Folder not found', 'Wybierz istniejący folder projektu/media.')
            return
        try:
            save_last_workspace(workspace)
        except OSError:
            pass
        if self.process and self.process.poll() is None:
            if self.workspace.get() and Path(self.workspace.get()).resolve() == workspace:
                self.open_app()
                return
            self.stop()
        try:
            self.port = available_port()
            state_dir = workspace / '.dawbridge'
            state_dir.mkdir(parents=True, exist_ok=True)
            self.log_file = (state_dir / 'launcher.log').open('ab', buffering=0)
            command = [sys.executable, str(HERE / 'server.py'), '--root', str(workspace),
                       '--port', str(self.port), '--host', '127.0.0.1']
            creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
            self.process = subprocess.Popen(command, cwd=str(HERE), stdout=self.log_file,
                                            stderr=subprocess.STDOUT, creationflags=creationflags)
        except Exception as exc:
            self.status.set(f'Nie udało się uruchomić: {exc}')
            messagebox.showerror('Launcher error', str(exc))
            return
        self.workspace.set(str(workspace))
        self.status.set(f'Startuję lokalny silnik na http://127.0.0.1:{self.port} …')
        self.start_button.configure(state='disabled')
        self.open_button.configure(state='disabled')
        self.stop_button.configure(state='normal')
        threading.Thread(target=self._wait_ready, args=(self.process, self.port), daemon=True).start()

    def _wait_ready(self, process: subprocess.Popen, port: int):
        deadline = time.monotonic() + 25
        ready = False
        while time.monotonic() < deadline and process.poll() is None:
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=0.35):
                    ready = True
                    break
            except OSError:
                time.sleep(0.2)
        self.root.after(0, lambda: self._ready_result(process, port, ready))

    def _ready_result(self, process, port, ready):
        if process is not self.process:
            return
        if ready:
            url = f'http://127.0.0.1:{port}'
            self.status.set(f'Bridge działa: {url}\nRoot: {self.workspace.get()}')
            self.open_button.configure(state='normal')
            self.start_button.configure(state='normal')
            self.open_app()
        else:
            self.status.set('Serwer nie wystartował. Sprawdź zależności Python lub launcher.log.')
            self.start_button.configure(state='normal')
            self.stop_button.configure(state='disabled')
            messagebox.showerror('Bridge failed to start', 'Zainstaluj requirements.txt i sprawdź launcher.log.')

    def open_app(self):
        if not self.port:
            return
        url = f'http://127.0.0.1:{self.port}'
        if self.webview_process and self.webview_process.poll() is None:
            return
        try:
            import importlib.util
            if importlib.util.find_spec('webview') is not None:
                workspace = Path(self.workspace.get())
                log_path = workspace / '.dawbridge' / 'launcher.log'
                log = log_path.open('ab', buffering=0)
                try:
                    self.webview_process = subprocess.Popen(
                        [sys.executable, str(HERE / 'launch_daw_bridge.py'), '--webview-url', url],
                        cwd=str(HERE), stdout=log, stderr=subprocess.STDOUT,
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                finally:
                    log.close()
                self.status.set(f'Otwieram wbudowane WebView: {url}')
                self.root.after(1500, lambda: self._check_webview(self.webview_process, url))
                return
        except Exception:
            self.webview_process = None
        webbrowser.open(url)
        self.status.set(f'Bridge działa w przeglądarce: {url}')

    def _check_webview(self, process, url):
        if process is not self.webview_process:
            return
        if process and process.poll() is not None:
            self.webview_process = None
            self.status.set('WebView niedostępne; otwieram systemową przeglądarkę.')
            webbrowser.open(url)

    def open_log(self):
        workspace = self.workspace.get().strip()
        if not workspace:
            messagebox.showinfo('Launcher log', 'Najpierw wybierz folder roboczy.')
            return
        path = Path(workspace) / '.dawbridge' / 'launcher.log'
        if not path.exists():
            messagebox.showinfo('Launcher log', 'Log nie został jeszcze utworzony.')
            return
        try:
            if sys.platform == 'win32':
                import os
                os.startfile(path)  # type: ignore[attr-defined]
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', str(path)])
            else:
                subprocess.Popen(['xdg-open', str(path)])
        except Exception as exc:
            messagebox.showerror('Open log', str(exc))

    def stop(self):
        view_process = self.webview_process
        self.webview_process = None
        if view_process and view_process.poll() is None:
            view_process.terminate()
            try:
                view_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                view_process.kill()
        process = self.process
        self.process = None
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        if self.log_file:
            try:
                self.log_file.close()
            except OSError:
                pass
            self.log_file = None
        self.port = None
        self.status.set('Bridge stopped. Workspace files were not changed.')
        self.open_button.configure(state='disabled')
        self.stop_button.configure(state='disabled')
        self.start_button.configure(state='normal')

    def close(self):
        if self.process and self.process.poll() is None:
            if not messagebox.askyesno('Stop DAW Bridge?', 'Zamknąć launcher i zatrzymać lokalny Bridge?'):
                return
        self.stop()
        self.root.destroy()


def main():
    parser = argparse.ArgumentParser(description='DAW Bridge GOD MODE 4.2 standalone launcher')
    parser.add_argument('--root', help='Optional project/media root; opens the launcher UI')
    parser.add_argument('--webview-url', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.webview_url:
        run_webview(args.webview_url)
        return
    app = tk.Tk()
    Launcher(app, args.root)
    app.mainloop()


if __name__ == '__main__':
    main()
