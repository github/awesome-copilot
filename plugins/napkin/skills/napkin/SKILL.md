---
name: napkin
description: 'Visual whiteboard collaboration for Copilot CLI. Creates an interactive whiteboard that opens in your browser — draw, sketch, add sticky notes, then share everything back with Copilot. Copilot sees your drawings and text, and responds with analysis, suggestions, and ideas.'
---

# Napkin — Visual Whiteboard for Copilot CLI

Napkin gives users a browser-based whiteboard where they can draw, sketch, and add sticky notes to think through ideas visually. The agent reads back the whiteboard contents (via a PNG snapshot and optional JSON data) and responds conversationally with analysis, suggestions, and next steps.

The target audience is lawyers, PMs, and business stakeholders — not software developers. Keep everything approachable and jargon-free.

---

## Activation

When the user invokes this skill — saying things like "let's napkin," "open a napkin," "start a whiteboard," or using the slash command — do the following:

1. **Copy the bundled HTML template** from the skill assets to the user's Desktop.
   - The template lives at `assets/napkin.html` relative to this SKILL.md file.
   - Copy it to `~/Desktop/napkin.html`.
   - If `~/Desktop/napkin.html` already exists, ask the user whether they want to open the existing one or start fresh before overwriting.

2. **Open it in the default browser:**
   - macOS: `open ~/Desktop/napkin.html`
   - Linux: `xdg-open ~/Desktop/napkin.html`
   - Windows: `start ~/Desktop/napkin.html`

3. **Tell the user what to do next.** Say something warm and simple:

   ```
   Your napkin is open in your browser!

   Draw, sketch, or add sticky notes — whatever helps you think through your idea.

   When you're ready for my input, click the green "Share with Copilot" button on the whiteboard, then come back here and say "check the napkin."
   ```

---

## Reading the Napkin

When the user says "check the napkin," "look at the napkin," "what do you think," "read my napkin," or anything similar, follow these steps:

### Step 1 — Read the PNG snapshot (primary)

Look for a PNG file called `napkin-snapshot.png`. Check these locations in order (the browser saves it to the user's default download folder, which varies):

1. `~/Downloads/napkin-snapshot.png`
2. `~/Desktop/napkin-snapshot.png`

Use the `view` tool to read the PNG. This sends the image as base64-encoded data to the model, which can visually interpret it. The PNG is the **primary** way the agent understands what the user drew — it captures freehand sketches, arrows, spatial layout, annotations, circled or crossed-out items, and anything else on the canvas.

If the PNG is not found in either location, do NOT silently skip it. Instead, tell the user:

```
I don't see a snapshot from your napkin yet. Here's what to do:

1. Go to your whiteboard in the browser
2. Click the green "Share with Copilot" button
3. Come back here and say "check the napkin" again

The button saves a screenshot that I can look at.
```

### Step 2 — Read the clipboard for structured JSON (supplementary)

Also try to grab structured JSON data from the system clipboard. The whiteboard copies this automatically alongside the PNG.

- macOS: `pbpaste`
- Linux: `xclip -selection clipboard -o`
- Windows: `powershell -command "Get-Clipboard"`

The JSON contains the exact text content of sticky notes and text labels, their positions, and their colors. This supplements the PNG by giving you precise text that might be hard to read from a screenshot.

If the clipboard doesn't contain JSON data, that's fine — the PNG alone gives the model plenty to work with. Do not treat a missing clipboard as an error.

### Step 3 — Interpret both sources together

Synthesize the visual snapshot and the structured text into a coherent understanding of what the user is thinking or planning:

- **From the PNG:** Describe what you see — sketches, diagrams, flowcharts, groupings, arrows, spatial layout, annotations, circled items, crossed-out items, emphasis marks.
- **From the JSON:** Read the exact text content of sticky notes and labels, noting their positions and colors.
- **Combine both** into a single, conversational interpretation.

### Step 4 — Respond conversationally

Do not dump raw data or a technical summary. Respond as a collaborator who looked at someone's whiteboard sketch. Examples:

- "I can see you've sketched out a three-stage process — it looks like you're thinking about [X] flowing into [Y] and then [Z]. The sticky note in the corner says '[text]' — is that a concern you want me to address?"
- "It looks like you've grouped these four ideas together on the left side and separated them from the two items on the right. Are you thinking of these as two different categories?"
- "I see you drew arrows connecting [A] to [B] to [C] — is this the workflow you're envisioning?"

### Step 5 — Ask what's next

Always end by offering a next step:

- "Want me to build on this?"
- "Should I turn this into a structured document?"
- "Want me to add my suggestions to the napkin?"

---

## Responding on the Napkin

When the user wants the agent to add content back to the whiteboard:

- The agent **cannot** directly modify the HTML file's canvas state — that's managed by JavaScript running in the browser.
- Instead, offer practical alternatives:
  - Provide the response right here in the CLI, and suggest the user add it to the napkin manually.
  - Offer to create a separate document (markdown, memo, checklist, etc.) based on what was interpreted from the napkin.
  - If it makes sense, create an updated copy of `napkin.html` with pre-loaded content.

---

## Tone and Style

- Use the same approachable, non-technical tone as the noob-mode skill.
- Never use developer jargon without explaining it in plain English.
- Treat the napkin as a creative, collaborative space — not a formal input mechanism.
- Be encouraging about the user's sketches regardless of artistic quality.
- Frame responses as "building on your thinking," not "analyzing your input."

---

## Error Handling

**PNG snapshot not found:**

```
I don't see a snapshot from your napkin yet. Here's what to do:

1. Go to your whiteboard in the browser
2. Click the green "Share with Copilot" button
3. Come back here and say "check the napkin" again

The button saves a screenshot that I can look at.
```

**Whiteboard file doesn't exist on Desktop:**

```
It looks like we haven't started a napkin yet. Want me to open one for you?
```

---

## Important Notes

- The PNG interpretation is the **primary** channel. Multimodal models can read and interpret the base64 image data returned by the `view` tool.
- The JSON clipboard data is **supplementary** — it provides precise text but does not capture freehand drawings.
- Always check for the PNG first. If it isn't found, prompt the user to click "Share with Copilot."
- If the clipboard doesn't have JSON data, proceed with the PNG alone.
- The HTML template is located at `assets/napkin.html` relative to this SKILL.md file.
- If the noob-mode skill is also active, use its risk indicator format (green/yellow/red) when requesting file or bash permissions.
