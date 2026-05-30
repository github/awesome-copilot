---
name: screen-recording
description: 'Create annotated animated GIF demos and screen recordings for pull requests and documentation. Covers frame capture, timing, imageio-based GIF creation, and per-frame annotation workflows.'
---

# Screen Recording

Create animated GIF demos that show a feature or workflow in action — with annotations, variable timing, and proper pacing. Useful for PR descriptions, documentation, and release notes.

## When to Use This Skill

Use this skill when you need to:

- Record a multi-step UI interaction as an animated GIF
- Create a demo showing before/after behavior
- Build annotated walkthroughs for documentation or release notes
- Show a bug reproduction or fix in action

## Prerequisites

```bash
pip install playwright Pillow imageio numpy scipy mss -q
playwright install chromium
```

## Core Workflow

### 1. Capture frames

Use Playwright to step through the interaction and capture each frame:

```python
from playwright.async_api import async_playwright

async def record_frames(url, steps, width=1400, height=900):
    """
    steps: list of dicts with 'action' (async callable taking page)
           and 'name' (frame filename)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": width, "height": height})
        await page.goto(url, wait_until="networkidle")

        for step in steps:
            if step.get("action"):
                await step["action"](page)
                await page.wait_for_timeout(step.get("wait", 500))
            await page.screenshot(path=step["name"])

        await browser.close()
```

### 2. Assemble GIF with imageio

**Use imageio, not PIL, for GIF writing** — PIL's GIF encoder merges visually similar frames, which kills animations.

```python
import imageio.v3 as iio
from PIL import Image
import numpy as np

frames = []
durations = []

for frame_path, duration_ms in frame_list:
    img = Image.open(frame_path)
    frames.append(np.array(img))
    durations.append(duration_ms)

iio.imwrite("demo.gif", frames, duration=durations, loop=0)
```

### 3. Variable frame timing

Uniform timing makes everything feel either too fast or too slow. Use variable durations:

| Phase | Duration | Why |
|-------|----------|-----|
| Fast action (typing, clicking) | 100ms | Feels natural, keeps energy |
| Pause after action | 600-800ms | Let the viewer process what happened |
| Hero/final message | 500ms+ | Main takeaway needs time to land |

### 4. Annotate frames

Apply annotations to specific frames using the `image-annotations` skill:

```python
from PIL import Image, ImageDraw, ImageFont

def annotate_frame(frame_path, annotations, out_path):
    img = Image.open(frame_path)
    draw = ImageDraw.Draw(img)

    for ann in annotations:
        # Apply annotation (rect, arrow, label, etc.)
        pass

    img.save(out_path)
```

### 5. Fade-in annotations

For smooth annotation appearance:

```python
def apply_fade(base_frame, annotation_layer, alpha):
    """Blend annotation onto frame at given alpha (0.0 to 1.0)"""
    blended = Image.blend(
        base_frame.convert("RGBA"),
        annotation_layer.convert("RGBA"),
        alpha
    )
    return blended.convert("RGB")

# 2-frame pop-in at 10fps: 50% then 100%
faded_frames = [
    apply_fade(base, annotations, 0.5),  # frame 1: half opacity
    apply_fade(base, annotations, 1.0),  # frame 2: full opacity
]
```

At 10fps, use 2 fade frames (0.2s total). At 30fps, use 3-4 frames. Easing curves look bad at low FPS — simple pop-in is snappier and more readable.

## Build as a Script

The annotation logic gets complex for anything beyond trivial demos. Write a dedicated script (e.g., `annotate_gif.py`) with functions instead of inline code. You'll iterate on timing and placement.

## Testing Animations

**Always test in isolation first** — don't rebuild the full demo to test a fade tweak:

```python
# Small test GIF: 10 bare frames → fade frames → 15 hold frames
# Add a frame counter overlay for debugging:
draw.text((10, height - 30), f"F{i}/{total} a={alpha:.0%} FADE",
          fill="white", font=small_font)
```

## Desktop Screen Recording (mss)

For recording desktop apps, terminals, or anything outside a browser. Uses `mss` for fast screen capture.

```python
import mss
from PIL import Image
import time

def record_gif(output_path, region=None, duration=5, fps=8):
    """Record screen region to GIF. region = {left, top, width, height} or None for full screen."""
    with mss.mss() as sct:
        if region is None:
            region = sct.monitors[1]  # primary monitor

        frames = []
        t_end = time.time() + duration
        while time.time() < t_end:
            t0 = time.time()
            shot = sct.grab(region)
            frames.append(Image.frombytes('RGB', shot.size, shot.rgb))
            time.sleep(max(0, 1 / fps - (time.time() - t0)))

    frames[0].save(output_path, save_all=True, append_images=frames[1:],
                   duration=int(1000 / fps), loop=0, optimize=True)
    return len(frames)

record_gif('demo.gif', region={'left': 0, 'top': 0, 'width': 800, 'height': 500}, duration=3)
```

Tested: 3s at 8fps → 24 frames, ~31KB. Keep fps ≤ 10 for reasonable file sizes.

**Note:** `PIL.save(save_all=True)` works for simple recordings but merges visually similar frames. For annotated GIFs with fade effects, use `imageio.v3.imwrite` instead.

### Combining with window capture

```python
# Find window rect, then record it as a GIF
# Reuse find_window() from the ui-screenshots skill
import ctypes
from ctypes import c_int, Structure, byref, windll

class RECT(Structure):
    _fields_ = [('left', c_int), ('top', c_int), ('right', c_int), ('bottom', c_int)]

hwnd = find_window('My App')[0][0]
rect = RECT()
windll.user32.GetWindowRect(hwnd, byref(rect))
region = {'left': rect.left, 'top': rect.top,
          'width': rect.right - rect.left, 'height': rect.bottom - rect.top}
record_gif('app-demo.gif', region=region, duration=5, fps=8)
```

## Diff-Based Cluster Detection

Programmatically find changed regions between frames to decide what to annotate:

```python
import numpy as np
from scipy import ndimage

def find_changed_clusters(frame_a, frame_b, threshold=30, min_pixels=300, dilate=5):
    """Find bounding boxes of changed regions between two frames."""
    diff = np.abs(frame_b.astype(float) - frame_a.astype(float)).max(axis=2)
    mask = diff > threshold
    dilated = ndimage.binary_dilation(mask, iterations=dilate)
    labeled, n = ndimage.label(dilated)
    clusters = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(ys) < min_pixels:
            continue
        clusters.append((xs.min(), ys.min(), xs.max(), ys.max(), len(ys)))
    return sorted(clusters, key=lambda c: -c[4])  # largest first
```

## Format Compatibility

| Format | VS Code Preview | GitHub | Browser |
|--------|----------------|--------|---------|
| GIF | ✅ Animates | ✅ | ✅ |
| WebP | ⚠️ Static only | ✅ | ✅ |
| MP4 | ❌ Broken | ⚠️ | ✅ |

**GIF is the only universally supported animated format** across VS Code preview, GitHub markdown, and browsers.

## Guidelines

1. **Type → pause → annotate** — during fast action, show NO annotation. Pause first, then annotate
2. **Hero message gets the biggest font** — 64pt+ for the main takeaway, 38pt for details
3. **GIF palette does NOT kill gradients** — 20 distinct alpha steps survive 256-color palette
4. **10fps minimum** for typing/interaction — lower looks stuttery
5. **Build iteratively** — get the frame sequence right first, add annotations second, tune timing last

## Limitations

- GIF is limited to 256 colors per frame — fine for UI screenshots, may show banding on photographic content
- Large GIFs (50+ frames at high resolution) can be several MB — consider cropping to the relevant area
- No audio support in GIF — use MP4 for narrated demos (but lose VS Code preview support)
