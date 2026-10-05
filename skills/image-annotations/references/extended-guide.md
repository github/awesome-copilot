# Image Annotations: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Color Rules

- **Red (`#E63946`)** — only for "bad" / "removed" things (e.g., circling a bug being fixed)
- **Yellowish-orange (`#FF9F1C`)** — for neutral highlights ("look here", "new feature", etc.)
- Never use red just because it's eye-catching — red = bad/removed

## Reference Snippet

```python
from PIL import Image, ImageDraw, ImageFont

# Setup
font = ImageFont.truetype('C:/Windows/Fonts/Inkfree.ttf', 36)  # or load_default()
color = '#FF9F1C'  # orange for highlights
stroke = 5
pad = 18

img = Image.open('screenshot.png')
draw = ImageDraw.Draw(img)

# Rounded rect with padding
draw.rounded_rectangle(
    [x1 - pad, y1 - pad, x2 + pad, y2 + pad],
    radius=14, outline=color, width=stroke
)

# Leader line (same thickness as rect)
draw.line([x2 + pad, cy, x2 + pad + 40, cy - 30], fill=color, width=stroke)

# Label — same-color stroke for body, NO white stroke
draw.text(
    (x2 + pad + 45, cy - 60), 'label text',
    fill=color, font=font, stroke_width=1, stroke_fill=color
)

img.save('annotated.png')
```

## Algorithmic Annotation — `annotate.py`

### Coordinate grid helper

**Always use `grid_image()` before annotating an unfamiliar image.** Scaled-down previews display images smaller than actual pixel dimensions — the error compounds as you move away from (0,0).

```python
from annotate import grid_image

grid = grid_image('screenshot.png', step=100)
grid.save('grid.png')
```

Then verify with small crops:

```python
from PIL import Image
img = Image.open('screenshot.png')
crop = img.crop((x1 - 20, y1 - 20, x2 + 20, y2 + 20))
crop.save('verify.png')
```

## Image Diffing

Find what changed between two screenshots programmatically. Use as a safety net for subtle changes — when the difference is obvious, annotate directly instead.

```python
from annotate import diff_images

clusters, debug_img = diff_images(
    'before.png', 'after.png',
    threshold=30,     # pixel difference floor (0-255)
    min_pixels=300,   # ignore tiny noise clusters
    dilate=5,         # merge nearby changed pixels
    debug=True,       # render heatmap overlay
)

# clusters = [(x1, y1, x2, y2, pixel_count), ...] sorted largest-first
if debug_img:
    debug_img.save('diff-debug.png')

# Feed clusters into annotate_image:
annotations = [
    {'elem': (x1, y1, x2, y2), 'label': f'Change #{i+1}', 'draw_box': True}
    for i, (x1, y1, x2, y2, _) in enumerate(clusters[:3])
]
```

**Debug heatmap colors:** Blue = small difference, Yellow = medium, Red = large, Cyan boxes = cluster bounding boxes.

**When to use:** subtle opacity changes, dashed lines, minor color shifts, anti-aliasing differences.
**When NOT to use:** any change you can see by eye — annotate directly for better labels.

## Animated GIF Annotations

Different from static images — animations have timing, transitions, and competing visual motion.

### Element highlighting

1. **Rects for big areas, arrows for small elements** — 500x300px area = rect, 200x25px element = arrow
2. **Labels go RIGHT NEXT to what they describe** — short arrow (30-80px), label adjacent. Viewer's eye shouldn't travel more than ~100px
3. **Arrow must not cross its own label** — pick the edge closest to the target
4. **No bottom bar / subtitle approach** — eyes jump between content and bar. Contextual placement only
5. **Hero message gets a bigger font** — main takeaway 64pt+, detail annotations 38pt

### Timing and pacing

6. **Fade: 2-frame pop-in at 10fps** — 50% → 100% opacity (0.2s total). Easing curves look bad at low FPS
7. **Type → pause → annotate** — during fast action, show NO annotation. Pause, then add it
8. **Variable frame duration** — fast during action (100ms), slow during pauses (600-800ms), long hold for hero (500ms)
9. **Higher FPS for smooth motion** — 10fps minimum for typing/interaction

### Pop-in fade implementation

```python
# 2-frame pop-in at 10fps
FADE_ALPHAS = [0.50, 1.00]

for frame_idx in range(total_frames):
    if annotation_just_changed and local_idx < len(FADE_ALPHAS):
        alpha = FADE_ALPHAS[local_idx]
    else:
        alpha = 1.0
    # Apply alpha to annotation elements:
    # - pill background: fill=(r, g, b, int(base_alpha * alpha))
    # - text: fill=(*color, int(255 * alpha))
    # - rect outline: outline=(*color, int(255 * alpha))
```
