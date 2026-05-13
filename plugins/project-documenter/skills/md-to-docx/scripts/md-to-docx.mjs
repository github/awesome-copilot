/**
 * md-to-docx.mjs - Markdown to Word converter
 * Pure JavaScript, no external tools required.
 * Usage: node md-to-docx.mjs <input.md> [output.docx]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { marked } from "marked";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  TableRow, TableCell, Table, WidthType, BorderStyle,
  AlignmentType, ShadingType, PageBreak
} from "docx";

// --- Image dimensions from PNG header ---
function pngDimensions(buffer) {
  // PNG signature check + IHDR chunk at offset 16 (width) and 20 (height)
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return { width: 600, height: 400 }; // fallback
}

// --- CLI argument parsing ---
const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node md-to-docx.mjs <input.md> [output.docx]");
  process.exit(1);
}
const outputPath = process.argv[3] || inputPath.replace(/\.md$/i, ".docx");
const inputDir = dirname(resolve(inputPath));

const mdSource = readFileSync(inputPath, "utf-8");

// --- Extract YAML front-matter metadata ---
let title = "Document";
let subtitle = "";
let date = new Date().toISOString().slice(0, 10);
let version = "1.0";
let audience = "";

const fmMatch = mdSource.match(/^---\n([\s\S]*?)\n---/m);
if (fmMatch) {
  const fm = fmMatch[1];
  title = fm.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || title;
  date = fm.match(/^date:\s*(.+)$/m)?.[1]?.trim() || date;
  version = fm.match(/^version:\s*(.+)$/m)?.[1]?.trim() || version;
  audience = fm.match(/^audience:\s*(.+)$/m)?.[1]?.trim() || "";
}

// Strip front-matter from markdown content
const md = mdSource.replace(/^---[\s\S]*?---\n*/m, "");

// Derive title / subtitle from front-matter title or first H1
const titleParts = title.split(/\s*[—–]\s*/);
const mainTitle = titleParts[0] || title;
subtitle = titleParts[1] || "";
if (!subtitle) {
  const h1Match = md.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const h1Parts = h1Match[1].split(/\s*[—–]\s*/);
    if (h1Parts.length > 1) {
      subtitle = h1Parts[1];
      if (!mainTitle || mainTitle === "Document") title = h1Parts[0];
    }
  }
}

// --- Parse Markdown tokens ---
const tokens = marked.lexer(md);

// --- Style constants ---
const FONT = "Calibri";
const HEADER_COLOR = "1F3864";
const ACCENT_COLOR = "2E75B6";
const TABLE_HEADER_BG = "D6E4F0";
const TABLE_ALT_BG = "F2F7FB";
const CODE_BG = "F5F5F5";
const CODE_FONT = "Consolas";
const BORDER_COLOR = "B4C6E7";

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const tableBorders = {
  top: tableBorder, bottom: tableBorder,
  left: tableBorder, right: tableBorder,
  insideHorizontal: tableBorder, insideVertical: tableBorder,
};

// --- Utility: decode HTML entities ---
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// --- Inline tokens to TextRun[] ---
function inlineToRuns(inlineTokens, parentBold = false, parentItalic = false) {
  const runs = [];
  if (!inlineTokens) return runs;
  for (const t of inlineTokens) {
    switch (t.type) {
      case "text":
        runs.push(new TextRun({
          text: decodeEntities(t.text || t.raw || ""),
          bold: parentBold, italics: parentItalic, font: FONT, size: 22,
        }));
        break;
      case "strong":
        runs.push(...inlineToRuns(t.tokens, true, parentItalic));
        break;
      case "em":
        runs.push(...inlineToRuns(t.tokens, parentBold, true));
        break;
      case "codespan":
        runs.push(new TextRun({
          text: t.text, font: CODE_FONT, size: 20, bold: parentBold,
          shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
        }));
        break;
      case "link":
        runs.push(new TextRun({
          text: t.text || t.href, bold: parentBold, italics: parentItalic,
          font: FONT, size: 22, color: ACCENT_COLOR, underline: {},
        }));
        break;
      case "image":
        // Images handled at paragraph level; skip inline
        break;
      case "br":
        runs.push(new TextRun({ break: 1, font: FONT }));
        break;
      default:
        if (t.raw) {
          runs.push(new TextRun({
            text: decodeEntities(t.raw), bold: parentBold, italics: parentItalic,
            font: FONT, size: 22,
          }));
        }
        break;
    }
  }
  return runs;
}

// --- Paragraph inline runs ---
function paragraphRuns(token) {
  if (token.tokens) return inlineToRuns(token.tokens);
  return [new TextRun({ text: token.text || token.raw || "", font: FONT, size: 22 })];
}

// --- Table builder ---
function buildTable(token) {
  const rows = [];
  if (token.header) {
    rows.push(new TableRow({
      tableHeader: true,
      children: token.header.map(cell => new TableCell({
        shading: { type: ShadingType.SOLID, color: TABLE_HEADER_BG, fill: TABLE_HEADER_BG },
        children: [new Paragraph({
          children: inlineToRuns(cell.tokens, true),
          spacing: { before: 40, after: 40 },
        })],
      })),
    }));
  }
  if (token.rows) {
    token.rows.forEach((row, idx) => {
      rows.push(new TableRow({
        children: row.map(cell => new TableCell({
          shading: idx % 2 === 1
            ? { type: ShadingType.SOLID, color: TABLE_ALT_BG, fill: TABLE_ALT_BG }
            : undefined,
          children: [new Paragraph({
            children: inlineToRuns(cell.tokens),
            spacing: { before: 30, after: 30 },
          })],
        })),
      }));
    });
  }
  return new Table({
    rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders,
  });
}

// --- Code block builder ---
function buildCodeBlock(token) {
  const lines = (token.text || "").split("\n");
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line || " ", font: CODE_FONT, size: 18 })],
    spacing: { before: 20, after: 20 },
    shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
    indent: { left: 360 },
  }));
}

// --- List builder ---
function buildList(token, level = 0) {
  const items = [];
  for (const item of token.items) {
    const textTokens = item.tokens?.find(t => t.type === "text");
    const bullet = token.ordered ? `${item.raw?.match(/^\d+/)?.[0] || "1"}.` : "\u2022";
    const indent = 720 + level * 360;
    items.push(new Paragraph({
      children: [
        new TextRun({ text: `${bullet}  `, font: FONT, size: 22 }),
        ...(textTokens ? inlineToRuns(textTokens.tokens) : [new TextRun({
          text: decodeEntities(item.text || ""), font: FONT, size: 22,
        })]),
      ],
      spacing: { before: 40, after: 40 },
      indent: { left: indent },
    }));
    const nestedList = item.tokens?.find(t => t.type === "list");
    if (nestedList) items.push(...buildList(nestedList, level + 1));
  }
  return items;
}

// --- Build document children ---
const children = [];

// Title page (from front-matter metadata)
children.push(
  new Paragraph({ spacing: { before: 2400 } }),
  new Paragraph({
    children: [new TextRun({ text: mainTitle, font: FONT, size: 56, bold: true, color: HEADER_COLOR })],
    alignment: AlignmentType.CENTER,
  }),
);
if (subtitle) {
  children.push(new Paragraph({
    children: [new TextRun({ text: subtitle, font: FONT, size: 36, color: ACCENT_COLOR })],
    alignment: AlignmentType.CENTER, spacing: { after: 400 },
  }));
}
children.push(
  new Paragraph({
    children: [new TextRun({
      text: `Date: ${date}  |  Version: ${version}`,
      font: FONT, size: 22, color: "666666",
    })],
    alignment: AlignmentType.CENTER,
  }),
);
if (audience) {
  children.push(new Paragraph({
    children: [new TextRun({ text: `Audience: ${audience}`, font: FONT, size: 22, color: "666666" })],
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
  }));
}
children.push(new Paragraph({ children: [new PageBreak()] }));

// Table of Contents (static, built from headings found in the markdown)
children.push(
  new Paragraph({
    children: [new TextRun({ text: "Table of Contents", font: FONT, size: 32, bold: true, color: HEADER_COLOR })],
    spacing: { before: 200, after: 400 },
  }),
);

// Pre-scan tokens for headings to build the TOC
for (const tok of tokens) {
  if (tok.type !== "heading" || tok.depth > 3) continue;
  // Skip the first H1 title and the TOC heading itself
  if (tok.depth === 1 && mainTitle !== "Document" &&
      decodeEntities(tok.text || "").includes(mainTitle)) continue;
  if (tok.text === "Table of Contents") continue;

  const indent = (tok.depth - 1) * 360;
  const tocSize = tok.depth === 1 ? 24 : tok.depth === 2 ? 22 : 20;
  const tocBold = tok.depth <= 2;
  const tocColor = tok.depth <= 2 ? HEADER_COLOR : ACCENT_COLOR;

  children.push(new Paragraph({
    children: [new TextRun({
      text: decodeEntities(tok.text),
      font: FONT, size: tocSize, bold: tocBold, color: tocColor,
    })],
    spacing: { before: tok.depth === 2 ? 80 : 40, after: 40 },
    indent: { left: indent },
  }));
}

children.push(new Paragraph({ children: [new PageBreak()] }));

// --- Token walker ---
let skipToc = false;

for (const token of tokens) {
  switch (token.type) {
    case "heading": {
      // Skip first H1 if it matches the front-matter title (already on title page)
      if (token.depth === 1 && mainTitle !== "Document" &&
          decodeEntities(token.text || "").includes(mainTitle)) {
        continue;
      }
      // Skip markdown TOC section
      if (token.text === "Table of Contents") { skipToc = true; continue; }
      if (skipToc && token.depth > 2) continue;
      skipToc = false;

      const headingMap = {
        1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4,
      };
      children.push(new Paragraph({
        heading: headingMap[token.depth] || HeadingLevel.HEADING_4,
        children: [new TextRun({
          text: decodeEntities(token.text),
          font: FONT, bold: true,
          color: token.depth <= 2 ? HEADER_COLOR : ACCENT_COLOR,
          size: token.depth === 2 ? 32 : token.depth === 3 ? 26 : 24,
        })],
        spacing: { before: token.depth === 2 ? 360 : 240, after: 120 },
      }));
      break;
    }
    case "paragraph": {
      if (skipToc) continue;
      // Check if the paragraph is a standalone image
      const imgToken = token.tokens && token.tokens.length === 1 && token.tokens[0].type === "image"
        ? token.tokens[0] : null;
      if (imgToken) {
        const href = imgToken.href || "";
        const imgPath = resolve(inputDir, href);
        if (existsSync(imgPath)) {
          const imgBuf = readFileSync(imgPath);
          const dims = pngDimensions(imgBuf);
          const maxW = 580; // max width in points (~6 inches)
          const scale = dims.width > maxW ? maxW / dims.width : 1;
          const w = Math.round(dims.width * scale);
          const h = Math.round(dims.height * scale);
          children.push(new Paragraph({
            children: [new ImageRun({ data: imgBuf, transformation: { width: w, height: h }, type: "png" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 40 },
          }));
          // Add caption if alt text exists
          if (imgToken.text) {
            children.push(new Paragraph({
              children: [new TextRun({ text: imgToken.text, font: FONT, size: 18, italics: true, color: "666666" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 120 },
            }));
          }
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: `[Image not found: ${href}]`, font: FONT, size: 20, italics: true, color: "888888" })],
            spacing: { before: 80, after: 80 },
          }));
        }
      } else {
        children.push(new Paragraph({
          children: paragraphRuns(token), spacing: { before: 80, after: 80 },
        }));
      }
      break;
    }
    case "table":
      if (skipToc) continue;
      children.push(buildTable(token));
      children.push(new Paragraph({ spacing: { after: 120 } }));
      break;
    case "code":
      if (skipToc) continue;
      if (token.lang === "mermaid") {
        children.push(new Paragraph({
          children: [new TextRun({
            text: "[Diagram: See source .md file for interactive Mermaid diagram]",
            font: FONT, size: 20, italics: true, color: "888888",
          })],
          spacing: { before: 80, after: 80 },
          shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
          indent: { left: 360 },
        }));
      } else {
        children.push(...buildCodeBlock(token));
      }
      children.push(new Paragraph({ spacing: { after: 80 } }));
      break;
    case "list":
      if (skipToc) continue;
      children.push(...buildList(token));
      break;
    case "hr":
      skipToc = false;
      children.push(new Paragraph({
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
      }));
      break;
    case "space":
      break;
    default:
      if (token.raw && !skipToc) {
        children.push(new Paragraph({
          children: [new TextRun({ text: decodeEntities(token.raw.trim()), font: FONT, size: 22 })],
          spacing: { before: 80, after: 80 },
        }));
      }
      break;
  }
}

// --- Create and write document ---
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
      heading1: {
        run: { font: FONT, size: 36, bold: true, color: HEADER_COLOR },
        paragraph: { spacing: { before: 360, after: 160 } },
      },
      heading2: {
        run: { font: FONT, size: 32, bold: true, color: HEADER_COLOR },
        paragraph: { spacing: { before: 320, after: 120 } },
      },
      heading3: {
        run: { font: FONT, size: 26, bold: true, color: ACCENT_COLOR },
        paragraph: { spacing: { before: 240, after: 100 } },
      },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    children,
  }],
  features: { updateFields: false },
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outputPath, buffer);
console.log(`Generated: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
