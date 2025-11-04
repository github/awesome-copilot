#!/usr/bin/env node
/**
 * Indent nested Markdown code fences (``` ... ```) that appear inside other fenced code blocks
 * to ensure proper rendering on GitHub. Only modifies .md/.prompt.md/.instructions.md files
 * under the specified folders (prompts/, instructions/, collections/).
 *
 * Strategy:
 * - Parse each file line-by-line
 * - Detect outer fenced code blocks (up to 3 leading spaces + backticks >= 3)
 * - Within an outer block, find any inner lines that also start with a fence marker (```...)
 *   that are not the true closing line of the outer block (same tick length and no language info),
 *   and treat them as the start of a nested block
 * - Indent the inner block from its opening fence line through its next fence line (closing)
 *   by prefixing each of those lines with four spaces
 * - Repeat for multiple nested "inner blocks" within the same outer block
 *
 * Notes:
 * - We only consider backtick fences (```). Tilde fences (~~~) are uncommon in repo, and excluded
 * - We preserve existing content and whitespace beyond the added indentation for nested fences
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['prompts', 'instructions', 'collections'];
const VALID_EXTS = new Set(['.md', '.prompt.md', '.instructions.md']);

function walk(dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile()) {
        const ext = getEffectiveExt(ent.name);
        if (VALID_EXTS.has(ext)) {
          results.push(full);
        }
      }
    }
  }
  return results;
}

function getEffectiveExt(filename) {
  if (filename.endsWith('.prompt.md')) return '.prompt.md';
  if (filename.endsWith('.instructions.md')) return '.instructions.md';
  return path.extname(filename).toLowerCase();
}

// Regex helpers
// up to 3 spaces + ``` + anything
const fenceLineRe = /^(?<indent> {0,3})(?<ticks>`{3,})(?<rest>.*)$/;

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);

  let inOuter = false;
  let outerIndent = '';
  let outerTicksLen = 0;
  let i = 0;
  let changed = false;

  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(fenceLineRe);

    if (!inOuter) {
      // Look for start of an outer fence
      if (m) {
        inOuter = true;
        outerIndent = m.groups.indent || '';
        outerTicksLen = m.groups.ticks.length;
      }
      i++;
      continue;
    }

    // We're inside an outer fence
    if (m) {
      // Is this the true closing fence for the current outer block?
      const indentLen = (m.groups.indent || '').length;
      const ticksLen = m.groups.ticks.length;
      const restTrim = (m.groups.rest || '').trim();
      const isOuterCloser = indentLen <= outerIndent.length && ticksLen === outerTicksLen &&
            restTrim === '';
      if (isOuterCloser) {
        // End of outer block
        inOuter = false;
        outerIndent = '';
        outerTicksLen = 0;
        i++;
        continue;
      }

      // Otherwise, treat as nested inner fence start; indent til matching inner fence (inclusive)
      changed = true;
      const innerTicksLen = ticksLen;
      lines[i] = '    ' + lines[i];
      i++;
      // Indent lines until we find a fence line with the same tick length (closing the inner block)
      while (i < lines.length) {
        const innerLine = lines[i];
        const m2 = innerLine.match(fenceLineRe);
        lines[i] = '    ' + innerLine;
        i++;
        // we've indented the closing inner fence; stop
        if (m2 && m2.groups.ticks.length === innerTicksLen) break;
      }
      continue;
    }

    // Regular line inside outer block
    i++;
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }
  return false;
}

function main() {
  const roots = TARGET_DIRS.map(d => path.join(ROOT, d));
  let files = [];
  for (const d of roots) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      files = files.concat(walk(d));
    }
  }

  let modified = 0;
  for (const f of files) {
    try {
      if (processFile(f)) modified++;
    } catch (err) {
      // Log and continue
      console.error(`Error processing ${f}:`, err.message);
    }
  }

  console.log(`Processed ${files.length} files. Modified ${modified} file(s).`);
}

if (require.main === module) {
  main();
}
