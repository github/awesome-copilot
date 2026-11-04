# Docs for a Published Illustrator Tool

Use this outline for the README, help page, or small documentation site that ships with an Illustrator script, CEP extension, plug-in, MCP server, or downloadable asset. Users read install docs while something is not working, so lead with requirements and keep every step checkable.

## Outline

1. **Name and one-line purpose**, then a GIF or screenshot of the result.
2. **Requirements**: Illustrator versions, OS, and anything else needed (fonts, Node.js for an MCP server). Say which version you tested on.
3. **Compatibility table** (below).
4. **Install**, one section per OS and per method.
5. **First run**: a short walkthrough from opening the tool to the first result, with a screenshot per step that changes the screen.
6. **Options**: each setting, its range, and its effect, with small before and after images where it helps.
7. **Troubleshooting**: symptom, cause, fix.
8. **Uninstall**.
9. **Changelog**, newest first.
10. **License** and credits for bundled assets.

## Compatibility Table

| Illustrator | Windows | macOS | Tested |
| --- | --- | --- | --- |
| 2026 (30.x) | Yes | Yes | 30.1 on Windows 11 |
| 2025 (29.x) | Yes | Yes | Not tested |
| 2024 (28.x) and earlier | No | No | n/a |

Add a row for the extension technology when it matters: "CEP 12 panel" now, "UXP plugin" once a UXP version exists.

## Install Sections by Tool Type

**Script (`.jsx`)**

1. Download `acme-grid-tool.jsx`.
2. Run it once from File > Scripts > Other Script, or copy it to Illustrator's `Presets/<locale>/Scripts` folder and restart Illustrator to list it under File > Scripts.

**CEP extension (signed ZXP)**

1. Download `acme-grid-tool-1.0.0.zxp`.
2. Install it with Adobe's Unified Plugin Installer Agent, or with the Adobe Marketplace listing if there is one. Give the full UPIA command for Windows and the macOS location (see cep-extensions.md).
3. Restart Illustrator, then open Window > Extensions > Acme Grid Tool.

**CEP extension (development copy)**

1. Copy the extension folder to the per-user CEP extensions folder.
2. Turn on `PlayerDebugMode` for the CSXS version (development machines only), then restart Illustrator.

**Plug-in (`.aip`)**

1. Quit Illustrator.
2. Copy the `.aip` for your OS into a folder of your choice and set it under Preferences > Plug-ins & Scratch Disks > Additional Plug-ins Folder, or copy it into Illustrator's `Plug-ins` folder.
3. Start Illustrator.

**MCP server**

1. Requirements (runtime version), install command, and the MCP config snippet for each supported AI tool.
2. What each tool does, which folders it reads and writes, and what it never does.

## Screenshots and GIFs

- Capture at 100% UI scaling and crop to the panel or the area that changes.
- Use a demo document with placeholder content (Acme Corp artwork, `example.com` URLs); never a client file or a real account.
- A GIF of 3 to 8 frames at 1 to 2 seconds each shows a result better than a long screen recording. Export the frames from Illustrator with a script so they match the docs exactly.
- Give every image alt text that says what it shows.

## Troubleshooting Table

| Symptom | Cause | Fix |
| --- | --- | --- |
| Menu item missing | Script not in the Scripts folder, or Illustrator not restarted | Move the file, restart Illustrator |
| Panel missing or blank | Version outside the supported range, or an unsigned build | Check the compatibility table; install the signed ZXP |
| "No document is open" | The tool needs an open document | Open or create a document first |

## Changelog Format

```markdown
## 1.1.0 (2026-06-01)
- Added: alternating row patterns.
- Fixed: linked assets lost on documents saved to another folder.

## 1.0.0 (2026-05-01)
- First release.
```

## Data in Docs

Docs are public. Use placeholder people, companies, and paths only: Jane Doe, Acme Corp, `jane.doe@example.com`, `C:\Users\<user>\...` on Windows and `~/...` on macOS. Never copy names from real documents, Creative Cloud libraries, or file lists into examples or screenshots.
