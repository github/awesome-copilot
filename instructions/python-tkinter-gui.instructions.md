---
applyTo: '**/*.py,**/*.pyw'
description: 'Architectural patterns and best practices for developing responsive, thread-safe, and modern Python desktop GUI applications with Tkinter and CustomTkinter'
---

# Python Tkinter & CustomTkinter GUI Development Guidelines

This guide provides specialized instructions to help GitHub Copilot generate responsive, idiomatic, and modern desktop GUI applications using standard library `tkinter` and modern extension frameworks such as `customtkinter`.

## 1. Threading & Event Loop Management

Tkinter's `mainloop()` must remain unblocked. Long-running tasks, network requests, disk operations, or heavy calculations must be executed asynchronously to avoid freezing the user interface.

- **Non-blocking Execution:**
  - Execute background operations in daemon threads (`threading.Thread(target=..., daemon=True)`), a `ThreadPoolExecutor`, or an asynchronous event loop (`asyncio`).
  - Never execute `time.sleep()`, synchronous `requests.get()`, or long loops directly in widget callbacks or UI event handlers.
- **Thread-safe UI Updates:**
  - Tkinter GUI objects are not thread-safe. Never mutate UI widgets directly from a background thread.
  - Route data back to the main UI thread using `root.after(0, callback, *args)` or a thread-safe `queue.Queue`.
  - Use periodic polling via `root.after(interval, poll_queue)` to process results safely.

### Example: Thread-safe Asynchronous Worker

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

        self.status_label = ttk.Label(self, text="Idle")
        self.status_label.pack(pady=20)

        self.start_button = ttk.Button(self, text="Start Task", command=self.start_task)
        self.start_button.pack(pady=10)

        self.after(100, self._process_queue)

    def start_task(self):
        self.status_label.config(text="Processing in background...")
        self.start_button.config(state="disabled")
        threading.Thread(target=self._worker, daemon=True).start()

    def _worker(self):
        # Perform computation or I/O
        import time
        time.sleep(2)
        result = "Task finished successfully!"
        self.result_queue.put(result)

    def _process_queue(self):
        try:
            while True:
                msg = self.result_queue.get_nowait()
                self.status_label.config(text=msg)
                self.start_button.config(state="normal")
        except queue.Empty:
            pass
        finally:
            self.after(100, self._process_queue)

if __name__ == "__main__":
    app = SafeApp()
    app.mainloop()
```

---

## 2. Layout Geometry & Structure

- **Never Mix Geometry Managers in the Same Container:**
  - Do not use `pack()` and `grid()` inside the same parent frame or window. Mixing them causes infinite layout recalculation loops.
  - Dedicate individual frames to either `pack()` or `grid()` layout paradigms.
- **Responsive Layout Design:**
  - When using `grid()`, always configure grid weights (`container.columnconfigure(i, weight=1)`, `container.rowconfigure(i, weight=1)`) to ensure smooth window resizing.
  - Use `sticky="nsew"` for elements that should expand to fill cell boundaries.
- **High-DPI Awareness (Windows / macOS):**
  - Enable DPI awareness on Windows using `ctypes.windll.shcore.SetProcessDpiAwareness(1)` or `SetProcessDPIAware()` before initializing the root window to prevent blurry text rendering.

---

## 3. Canvas & Win32 Integration

- **Event Propagation:**
  - In custom mouse binding handlers (`<Button-1>`, `<B1-Motion>`, etc.), return `"break"` when you want to suppress standard widget or parent event bubbling.
- **Canvas Stacking & Z-Order:**
  - Note that `tk.Canvas.lift()` is aliased to `tag_raise()` for canvas items. To lift the canvas widget itself in the window hierarchy, use `tk.Misc.lift(canvas_widget)`.
- **Frameless & Custom Titlebars:**
  - When using `overrideredirect(True)` for frameless cards or floating islands, implement draggable headers by binding `<Button-1>` and `<B1-Motion>` to compute offsets relative to `event.x_root` and `event.y_root`.
  - Handle window positioning bounds against multi-monitor screen geometries retrieved via Win32 `GetSystemMetrics` or `winfo_screenwidth()`.

---

## 4. Modern Styling with CustomTkinter

When utilizing `customtkinter` (modern UI framework wrapping Tkinter):

- **Theme & Appearance Modes:**
  - Set global appearance using `customtkinter.set_appearance_mode("System" | "Dark" | "Light")` and color theme using `customtkinter.set_default_color_theme("blue" | "dark-blue" | "green" | "path/to/theme.json")`.
  - Always inherit from `customtkinter.CTk` for top-level windows and `customtkinter.CTkFrame` for sub-containers.
- **Dynamic Sizing & Colors:**
  - Leverage tuple-based color definitions `("light_mode_color", "dark_mode_color")` for `fg_color`, `text_color`, and `border_color` to enable seamless theme transitions.
  - Maintain consistent `corner_radius` and padding hierarchies across design layers.

### Example: CustomTkinter Standard Implementation

```python
import customtkinter as ctk

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
            text="Save Settings",
            command=self.save_settings
        )
        self.submit_btn.pack(padx=30, pady=10)

    def save_settings(self):
        val = self.entry.get()
        print(f"Setting saved: {val}")

if __name__ == "__main__":
    app = ModernDashboard()
    app.mainloop()
```

---

## 5. Clean Resource Cleanup & Lifecycles

- **Window Close Protocols:**
  - Always bind the `WM_DELETE_WINDOW` protocol: `root.protocol("WM_DELETE_WINDOW", on_closing)` to cleanly stop worker threads, cancel pending `root.after()` callbacks, and release OS resources before calling `root.destroy()`.
- **Image Lifecycle Reference Preservation:**
  - When assigning `PhotoImage` or `CTkImage` to labels or canvas items, always maintain a persistent Python reference on the widget (e.g., `label.image = photo`) to prevent Python's garbage collector from deleting the image buffer.
