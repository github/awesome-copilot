---
applyTo: '**/*.py,**/*.pyw'
description: 'Architectural patterns and best practices for developing responsive, thread-safe, and modern Python desktop GUI applications with Tkinter and CustomTkinter'
---

# Python Tkinter & CustomTkinter GUI Development Guidelines

This guide provides specialized instructions to help GitHub Copilot generate responsive, idiomatic, and modern desktop GUI applications using standard library `tkinter` and modern extension frameworks such as `customtkinter`.

## 1. Threading & Event Loop Management

Tkinter's `mainloop()` must remain unblocked. Long-running tasks, network requests, disk operations, or heavy calculations must be executed asynchronously to avoid freezing the user interface.

- **Non-blocking Execution:**
  - Execute background operations in background threads (`threading.Thread(target=..., daemon=True)`), a `concurrent.futures.ThreadPoolExecutor`, or an asynchronous event loop running in a dedicated background worker thread.
  - Calling `asyncio.run()` directly from a widget callback or UI event handler runs synchronously on the main thread and blocks `mainloop()`. Never execute `time.sleep()`, synchronous `requests.get()`, or long loops directly in UI callbacks.
- **Thread-safe UI Updates:**
  - Tkinter GUI objects are not thread-safe. Never mutate UI widgets directly from a background thread.
  - Route data back to the main UI thread using `root.after(0, callback, *args)` or a thread-safe `queue.Queue`.
  - Use periodic polling via `root.after(interval, poll_queue)` to process results safely, retaining the returned timer ID for cancellation during window teardown.

### Example: Thread-safe Asynchronous Worker with Clean Shutdown

```python
import threading
import queue
import tkinter as tk
from tkinter import ttk

class SafeApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Thread-Safe Tkinter Application")
        self.geometry("400x250")
        self.result_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.worker_thread = None

        self.status_label = ttk.Label(self, text="Idle")
        self.status_label.pack(pady=20)

        self.start_button = ttk.Button(self, text="Start Task", command=self.start_task)
        self.start_button.pack(pady=10)

        # Track scheduled callback ID for clean cancellation
        self._poll_job = self.after(100, self._process_queue)
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def start_task(self):
        self.status_label.config(text="Processing in background...")
        self.start_button.config(state="disabled")
        self.stop_event.clear()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def _worker(self):
        # Cooperative task loop checking stop_event
        for step in range(1, 6):
            if self.stop_event.is_set():
                return
            import time
            time.sleep(0.5)
        self.result_queue.put("Task finished successfully!")

    def _process_queue(self):
        try:
            while True:
                msg = self.result_queue.get_nowait()
                self.status_label.config(text=msg)
                self.start_button.config(state="normal")
        except queue.Empty:
            pass
        finally:
            if not self.stop_event.is_set():
                self._poll_job = self.after(100, self._process_queue)

    def on_closing(self):
        # 1. Signal workers to terminate cooperatively
        self.stop_event.set()
        # 2. Cancel pending after() scheduled callbacks
        if self._poll_job is not None:
            self.after_cancel(self._poll_job)
            self._poll_job = None
        # 3. Wait for active worker to finish with a bounded fallback
        self._wait_for_workers_and_destroy(timeout_ms=2000)

    def _wait_for_workers_and_destroy(self, timeout_ms=2000):
        if self.worker_thread and self.worker_thread.is_alive() and timeout_ms > 0:
            # Check again after 50ms while worker wraps up without blocking UI
            self.after(50, self._wait_for_workers_and_destroy, timeout_ms - 50)
        else:
            self.destroy()

if __name__ == "__main__":
    app = SafeApp()
    app.mainloop()
```

---

## 2. Layout Geometry & Structure

- **Never Mix Geometry Managers in the Same Container:**
  - Do not call `pack()` and `grid()` on widgets managed by the same parent container or window. Mixing them raises a `_tkinter.TclError` (`cannot use geometry manager grid inside ... which already has slaves managed by pack`).
  - Dedicate individual frames to either `pack()` or `grid()` layout paradigms.
- **Responsive Layout Design:**
  - When using `grid()`, always configure grid weights (`container.columnconfigure(i, weight=1)`, `container.rowconfigure(i, weight=1)`) to ensure smooth window resizing.
  - Use `sticky="nsew"` for elements that should expand to fill cell boundaries.
- **High-DPI Awareness (Windows / macOS):**
  - Enable per-monitor DPI awareness on Windows before initializing the root window to prevent blurry text rendering across multi-monitor setups:
    ```python
    import sys
    if sys.platform == "win32":
        try:
            import ctypes
            # PROCESS_PER_MONITOR_DPI_AWARE = 2 (Windows 8.1+)
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            try:
                # Fallback to system-DPI-aware (Windows Vista+)
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass
    ```

---

## 3. Canvas & Win32 Integration

- **Event Propagation:**
  - In custom mouse binding handlers (`<Button-1>`, `<B1-Motion>`, etc.), return `"break"` when you want to suppress standard widget or parent event bubbling.
- **Canvas Stacking & Z-Order:**
  - Use `canvas.tag_raise(item_or_tag)` and `canvas.tag_lower(item_or_tag)` to adjust the display order of items drawn on the canvas.
  - To adjust the stacking order of the canvas widget itself relative to sibling widgets in the window hierarchy, use `canvas.lift()` (or `tk.Misc.lift(canvas)`) and `canvas.lower()`.
- **Frameless & Custom Titlebars:**
  - When using `overrideredirect(True)` for frameless cards or floating islands, implement draggable headers by binding `<Button-1>` and `<B1-Motion>` to compute offsets relative to `event.x_root` and `event.y_root`.
  - For multi-monitor environments, `winfo_screenwidth()` only reports the primary display width and does not enumerate individual monitor boundaries. Query actual per-monitor rectangles using platform APIs (such as Win32 `EnumDisplayMonitors` / `GetMonitorInfo` via `ctypes` on Windows, or cross-platform libraries like `screeninfo`) to avoid clipping windows off-screen.

---

## 4. Modern Styling with CustomTkinter

When utilizing `customtkinter` (modern UI framework wrapping Tkinter):

- **Theme & Appearance Modes:**
  - Set global appearance mode using `customtkinter.set_appearance_mode(mode)`, where `mode` is `"System"`, `"Dark"`, or `"Light"`.
  - Set the color theme using `customtkinter.set_default_color_theme(theme)`, where `theme` can be a built-in theme (`"blue"`, `"dark-blue"`, `"green"`) or a path to a custom theme JSON file.
- **Window Hierarchy & Inheritance:**
  - Inherit from `customtkinter.CTk` strictly for the application's root/main window (exactly one root per application).
  - Inherit from `customtkinter.CTkToplevel` for secondary, popup, or dialog windows to preserve proper parent-child ownership and avoid conflicting event loops. Note that `transient(parent)` establishes window ownership and stacking hierarchy relative to the parent, while `grab_set()` directs all input events to the dialog to make it modal.
  - Inherit from `customtkinter.CTkFrame` for modular UI containers, cards, and sections.
- **Dynamic Sizing & Colors:**
  - Leverage tuple-based color definitions `("light_mode_color", "dark_mode_color")` for `fg_color`, `text_color`, and `border_color` to enable seamless theme transitions.
  - Maintain consistent `corner_radius` and padding hierarchies across design layers.

### Example: CustomTkinter Standard Implementation

```python
import customtkinter as ctk

class SettingsDialog(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Preferences")
        self.geometry("300x200")
        self.transient(parent)  # Establishes window ownership/stacking with parent

        label = ctk.CTkLabel(self, text="Dialog Settings", font=ctk.CTkFont(size=14, weight="bold"))
        label.pack(pady=20)

class ModernDashboard(ctk.CTk):
    def __init__(self):
        super().__init__()

        ctk.set_appearance_mode("System")
        ctk.set_default_color_theme("blue")

        self.title("Modern Python Application")
        self.geometry("600x400")

        # Grid configuration
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header Frame
        self.header = ctk.CTkFrame(self, corner_radius=10)
        self.header.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")

        self.title_label = ctk.CTkLabel(
            self.header,
            text="Application Dashboard",
            font=ctk.CTkFont(size=20, weight="bold")
        )
        self.title_label.pack(padx=20, pady=15, side="left")

        # Content Card
        self.card = ctk.CTkFrame(self, corner_radius=12)
        self.card.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")

        self.entry = ctk.CTkEntry(self.card, placeholder_text="Enter configuration parameter...")
        self.entry.pack(padx=30, pady=(40, 15), fill="x")

        self.submit_btn = ctk.CTkButton(
            self.card,
            text="Open Dialog",
            command=self.open_dialog
        )
        self.submit_btn.pack(padx=30, pady=10)

    def open_dialog(self):
        dialog = SettingsDialog(self)
        dialog.grab_set()  # Directs all events to dialog to make it modal

if __name__ == "__main__":
    app = ModernDashboard()
    app.mainloop()
```

---

## 5. Clean Resource Cleanup & Lifecycles

- **Window Close Protocols & Worker Cancellation:**
  - Always bind the `WM_DELETE_WINDOW` protocol: `root.protocol("WM_DELETE_WINDOW", on_closing)`.
  - Clean shutdown requires three cooperative steps:
    1. Set a cooperative cancellation event (`threading.Event`) to notify background workers to stop loop processing.
    2. Cancel all pending timers using `root.after_cancel(job_id)` with saved timer IDs.
    3. Wait for active worker threads to finish with a bounded timeout (polling via `after()` without blocking the UI event loop, falling back to teardown if workers do not exit within the timeout) before calling `root.destroy()`.
- **Image Lifecycle Reference Preservation:**
  - When assigning `PhotoImage` or `CTkImage` to labels or canvas items, always maintain a persistent Python reference on the widget (e.g., `label.image = photo`) to prevent Python's garbage collector from deleting the image buffer.
