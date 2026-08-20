#!/usr/bin/env python3
"""Extract ```mermaid blocks from a Markdown file and render each one to an image.

Usage:
  python3 mermaid_md.py doc.md --list
  python3 mermaid_md.py doc.md -o assets/
  python3 mermaid_md.py doc.md -o assets/ --rewrite doc.rendered.md
  python3 mermaid_md.py doc.md --only 2,5

Rendering always goes through the mmdc CLI. Exit code is non-zero if any
selected block fails to render.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata

FENCE_RE = re.compile(r'^(?P<indent>[ \t]{0,3})(?P<fence>`{3,}|~{3,})[ \t]*(?P<info>.*)$')
HEADING_RE = re.compile(r'^[ \t]{0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$')
TITLE_RE = re.compile(r'^\s*%%\s*(?:title|name)\s*:\s*(.+?)\s*$', re.IGNORECASE)
YAML_TITLE_RE = re.compile(r'^\s*title\s*:\s*(.+?)\s*$', re.IGNORECASE)

# First keyword of a mermaid diagram -> friendly type name.
TYPES = [
    ('flowchart', 'flowchart'), ('graph', 'flowchart'), ('sequencediagram', 'sequence'),
    ('classdiagram', 'class'), ('erdiagram', 'er'), ('statediagram', 'state'),
    ('gantt', 'gantt'), ('pie', 'pie'), ('gitgraph', 'gitgraph'), ('journey', 'journey'),
    ('mindmap', 'mindmap'), ('timeline', 'timeline'), ('quadrantchart', 'quadrant'),
    ('requirementdiagram', 'requirement'), ('c4context', 'c4'), ('c4container', 'c4'),
    ('c4component', 'c4'), ('architecture-beta', 'architecture'), ('usecase-beta', 'usecase'),
    ('cynefin-beta', 'cynefin'), ('eventmodeling', 'eventmodeling'), ('treeview-beta', 'treeview'),
    ('wardley-beta', 'wardley'), ('sankey-beta', 'sankey'), ('xychart-beta', 'xychart'),
    ('block-beta', 'block'), ('packet-beta', 'packet'), ('kanban', 'kanban'), ('radar-beta', 'radar'),
]


def first_error_line(raw):
    """Pull the informative lines out of mmdc's stderr (skipping the stack trace)."""
    text = raw.decode('utf-8', 'replace') if isinstance(raw, bytes) else (raw or '')
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    lines = [l for l in lines if not l.startswith('at ') and 'node_modules' not in l]
    picked = [l for l in lines
              if re.search(r'error|cannot|could not|unsupported|expecting', l, re.IGNORECASE)]
    if not picked:
        return lines[0][:300] if lines else ''
    return ' | '.join(l[:200] for l in picked[:2])[:400]


class Block:
    """One ```mermaid fenced block found in the Markdown source."""

    source = ''  # set to the Markdown path once parsed

    def __init__(self, index, code, start_line, end_line, heading, indent):
        self.index = index            # 1-based order in the file
        self.code = code              # diagram source, fence stripped
        self.start_line = start_line  # 1-based line of the opening fence
        self.end_line = end_line      # 1-based line of the closing fence
        self.heading = heading        # nearest preceding Markdown heading, or ''
        self.indent = indent          # leading whitespace of the opening fence
        self.out_path = None
        self.error = None

    @property
    def diagram_type(self):
        lines = self.code.splitlines()
        if lines and lines[0].strip() == '---':  # skip YAML front matter
            end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == '---'), 0)
            lines = lines[end + 1:]
        for line in lines:
            s = line.strip()
            if not s or s.startswith('%%'):
                continue
            head = s.split()[0].lower().rstrip(':')
            for key, name in TYPES:
                if head.startswith(key):
                    return name
            return head[:20]
        return 'empty'

    @property
    def title(self):
        """%% title: ... comment, then front-matter title:, then nearest heading."""
        lines = self.code.splitlines()
        for line in lines[:3]:
            m = TITLE_RE.match(line)
            if m:
                return m.group(1)
        if lines and lines[0].strip() == '---':
            for line in lines[1:]:
                if line.strip() == '---':
                    break
                m = YAML_TITLE_RE.match(line)
                if m:
                    return m.group(1).strip('"\'')
        return self.heading


def slugify(text, fallback=''):
    """ASCII filename slug; folds accents so non-English headings stay readable."""
    text = (text or '').replace('\u0111', 'd').replace('\u0110', 'D')   # đ/Đ have no NFKD form
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    slug = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return slug[:40].rstrip('-') or fallback


def extract(md_text):
    """Return the list of mermaid Blocks, ignoring mermaid fences nested in other fences."""
    lines = md_text.splitlines()
    blocks, heading = [], ''
    open_fence = None     # (char, length, indent, is_mermaid, start_line, heading)
    buf = []
    in_front_matter = bool(lines) and lines[0].strip() == '---'

    for i, line in enumerate(lines):
        n = i + 1
        if in_front_matter:
            if n > 1 and line.strip() in ('---', '...'):
                in_front_matter = False
            continue

        m = FENCE_RE.match(line)
        if open_fence is None:
            if m:
                char, length = m.group('fence')[0], len(m.group('fence'))
                info = m.group('info').strip()
                # A tilde fence's info string may contain backticks; a backtick fence's may not.
                is_mermaid = bool(re.match(r'^mermaid\b', info, re.IGNORECASE)) and (
                    char == '~' or '`' not in info)
                open_fence = (char, length, m.group('indent'), is_mermaid, n, heading)
                buf = []
            else:
                h = HEADING_RE.match(line)
                if h:
                    heading = h.group(2).strip()
            continue

        char, length, indent, is_mermaid, start, blk_heading = open_fence
        # Closing fence: same char, at least as long, nothing after it.
        if m and m.group('fence')[0] == char and len(m.group('fence')) >= length \
                and not m.group('info').strip():
            if is_mermaid:
                blocks.append(Block(len(blocks) + 1, '\n'.join(buf).strip('\n'),
                                    start, n, blk_heading, indent))
            open_fence = None
            continue
        if is_mermaid:
            buf.append(line[len(indent):] if line.startswith(indent) else line.lstrip())

    if open_fence is not None and open_fence[3]:  # unterminated mermaid fence
        char, length, indent, _, start, blk_heading = open_fence
        blocks.append(Block(len(blocks) + 1, '\n'.join(buf).strip('\n'),
                            start, len(lines), blk_heading, indent))
    return blocks


def locate(block):
    """Where the block lives in the Markdown file.

    Mermaid's own "Parse error on line N" counts tokens, not source lines, so it is not
    mapped onto the Markdown — the block's line range is the reliable pointer.
    """
    return '%s:%d-%d' % (block.source, block.start_line, block.end_line)


def parse_only(spec, total):
    """'2,5,7-9' -> sorted set of 1-based indices within range."""
    if not spec:
        return set(range(1, total + 1))
    picked = set()
    for part in spec.split(','):
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            a, b = part.split('-', 1)
            picked.update(range(int(a), int(b) + 1))
        else:
            picked.add(int(part))
    return {i for i in picked if 1 <= i <= total}


CHROME_CANDIDATES = [
    'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
    'chrome', 'microsoft-edge', 'microsoft-edge-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

# mermaid-cli 11 is ESM-only: an old `node` on PATH dies with "Unexpected token import".
MIN_NODE = 18
NODE_CANDIDATES = ['/usr/bin/node', '/bin/node', '/usr/local/bin/node',
                   '/opt/homebrew/bin/node', '/usr/local/n/versions/node/*/bin/node',
                   os.path.expanduser('~/.nvm/versions/node/*/bin/node'),
                   os.path.expanduser('~/.volta/tools/image/node/*/bin/node')]

_MMDC = {}          # resolved once: {'env':…, 'extra':…, 'chrome':…, 'cmd':…, 'node':…}
PROBE = 'flowchart LR\n  A-->B\n'


def _run_mmdc(cmd, env=None, timeout=300):
    full = dict(os.environ)
    full.update(env or {})
    return subprocess.run(cmd, capture_output=True, timeout=timeout, env=full)


def _node_major(path):
    """Major version of a node binary, or None if it doesn't run."""
    try:
        r = subprocess.run([path, '-v'], capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    m = re.match(r'v(\d+)', r.stdout.decode('utf-8', 'replace').strip())
    return int(m.group(1)) if r.returncode == 0 and m else None


def resolve_node(args):
    """Pick the node that will run mmdc.

    `mmdc` is a `#!/usr/bin/env node` script, so an active conda/nvm environment with an
    ancient node hijacks it. Returns (cmd_prefix, env_patch, label).
    """
    if args.node:
        major = _node_major(args.node)
        if major is None or major < MIN_NODE:
            sys.exit('--node %s is not a usable node (need >= v%d)' % (args.node, MIN_NODE))
        return [args.node], {'PATH': os.path.dirname(os.path.abspath(args.node))
                             + os.pathsep + os.environ.get('PATH', '')}, \
               'node v%d %s' % (major, args.node)

    current = shutil.which('node')
    major = _node_major(current) if current else None
    if major is not None and major >= MIN_NODE:
        return [], {}, 'node v%d' % major

    found = []
    for pattern in NODE_CANDIDATES:
        for path in (glob.glob(pattern) if '*' in pattern else [pattern]):
            if os.path.exists(path) and path != current:
                m = _node_major(path)
                if m is not None and m >= MIN_NODE:
                    found.append((m, path))
    if not found:
        sys.exit('No node >= v%d found (mermaid-cli is ESM-only).%s\n'
                 'Fix with one of:\n'
                 '  conda deactivate      # an active env often shadows the system node\n'
                 '  nvm use 20\n'
                 '  --node /path/to/node' % (
                     MIN_NODE,
                     ' Current `node` is v%d.' % major if major is not None else ''))
    found.sort(reverse=True)
    best_major, best = found[0]
    return [best], {'PATH': os.path.dirname(best) + os.pathsep + os.environ.get('PATH', '')}, \
           'node v%d %s' % (best_major, best)


def _try_probe(base, env, extra):
    """Render a trivial diagram; return None on success, else the error text."""
    with tempfile.TemporaryDirectory() as tmp:
        src, out = os.path.join(tmp, 'p.mmd'), os.path.join(tmp, 'p.svg')
        with open(src, 'w') as fh:
            fh.write(PROBE)
        try:
            r = _run_mmdc(base + ['-i', src, '-o', out] + extra, env=env, timeout=180)
        except (OSError, subprocess.SubprocessError) as exc:
            return str(exc)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 0:
            return None
        return (r.stderr or r.stdout).decode('utf-8', 'replace')


def _no_sandbox_config():
    """A puppeteer config enabling --no-sandbox (needed as root / in containers)."""
    fd, path = tempfile.mkstemp(prefix='puppeteer-', suffix='.json')
    with os.fdopen(fd, 'w') as fh:
        fh.write('{"args": ["--no-sandbox", "--disable-setuid-sandbox"]}')
    return path


def setup_mmdc(args):
    """Find a working mmdc + Chrome combination once, or exit with a clear message.

    Order: an explicit --chrome / PUPPETEER_EXECUTABLE_PATH, then puppeteer's own
    cached browser, then a system Chrome/Chromium/Edge on PATH.
    """
    if _MMDC:
        return _MMDC
    mmdc = shutil.which('mmdc')
    if not mmdc:
        sys.exit('mmdc not found. Install it:\n'
                 '  npm install -g @mermaid-js/mermaid-cli\n'
                 '  npx puppeteer browsers install chrome-headless-shell')

    node_cmd, node_env, node_label = resolve_node(args)
    # Invoking the CLI's real entry point through the chosen node bypasses the shebang.
    base = node_cmd + [os.path.realpath(mmdc)] if node_cmd else [mmdc]

    explicit = args.chrome or os.environ.get('PUPPETEER_EXECUTABLE_PATH')
    if explicit:
        candidates = [(explicit, 'chrome: %s' % explicit)]
    else:
        candidates = [(None, 'chrome: puppeteer cache')]
        seen = set()
        for name in CHROME_CANDIDATES:
            path = shutil.which(name) if os.sep not in name else (
                name if os.path.exists(name) else None)
            if path and path not in seen:
                seen.add(path)
                candidates.append((path, 'chrome: %s' % path))

    errors = []
    for path, label in candidates:
        env = dict(node_env)
        if path:
            env['PUPPETEER_EXECUTABLE_PATH'] = path
        for extra in ([], ['-p', _no_sandbox_config()]):
            err = _try_probe(base, env, extra)
            if err is None:
                _MMDC.update(env=env, extra=extra, chrome=label, cmd=base, node=node_label)
                return _MMDC
            errors.append('%s%s -> %s' % (label, ' (--no-sandbox)' if extra else '',
                                          first_error_line(err) or 'failed'))
            if 'sandbox' not in err.lower():
                break

    sys.exit('mmdc cannot render — no usable Chrome found.\n  ' + '\n  '.join(errors) +
             '\n\nFix with one of:\n'
             '  npx puppeteer browsers install chrome-headless-shell\n'
             '  --chrome /path/to/chrome   (or export PUPPETEER_EXECUTABLE_PATH)')


def render(code, out_path, args):
    """Render one diagram with mmdc. Returns None on success, else an error string."""
    setup = setup_mmdc(args)
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'diagram.mmd')
        with open(src, 'w') as fh:
            fh.write(code + '\n')
        cmd = setup['cmd'] + ['-i', src, '-o', out_path, '-b', args.background] + setup['extra']
        if args.format != 'pdf':
            cmd += ['-w', str(args.width)]
        if args.theme:
            cmd += ['-t', args.theme]
        scale = args.scale if args.scale else (2 if args.format == 'png' else None)
        if scale:
            cmd += ['-s', str(scale)]
        if args.config:
            cmd += ['-c', args.config]
        if args.puppeteer_config:
            cmd += ['-p', args.puppeteer_config]
        try:
            r = _run_mmdc(cmd, env=setup['env'])
        except (OSError, subprocess.SubprocessError) as exc:
            return 'mmdc failed: %s' % exc
        if r.returncode != 0 or not os.path.exists(out_path):
            return first_error_line(r.stderr or r.stdout) or 'mmdc failed'
    return None


IMG_LINE_RE = re.compile(r'^\s*(!\[[^\]]*\]\([^)]*\)|<img\b)', re.IGNORECASE)


def _image_after(lines, end_line):
    """If an image already sits just below the block, return the index past it.

    Keeps `append` idempotent: re-running on an already-rewritten file refreshes that
    image line instead of stacking another copy under every block.
    """
    j = end_line                       # 0-based index of the first line after the fence
    while j < len(lines) and not lines[j].strip():
        j += 1
    return j + 1 if j < len(lines) and IMG_LINE_RE.match(lines[j]) else None


def rewrite(md_text, blocks, out_md_path, mode, alt_prefix):
    """Rewrite the Markdown so rendered blocks point at their image files."""
    lines = md_text.splitlines(keepends=True)
    out, cursor = [], 0
    base = os.path.dirname(os.path.abspath(out_md_path))
    for b in blocks:
        if not b.out_path:
            continue
        out.extend(lines[cursor:b.start_line - 1])
        rel = os.path.relpath(os.path.abspath(b.out_path), base).replace(os.sep, '/')
        alt = b.title or ('%s %d' % (alt_prefix, b.index))
        img = '%s![%s](%s)\n' % (b.indent, alt.replace(']', ''), rel)
        if mode == 'append':
            out.extend(lines[b.start_line - 1:b.end_line])
            out.append('\n' + img)
            cursor = _image_after(lines, b.end_line) or b.end_line
        else:
            out.append(img)
            cursor = b.end_line
    out.extend(lines[cursor:])
    with open(out_md_path, 'w') as fh:
        fh.write(''.join(out))


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('input', help='Markdown file containing ```mermaid blocks')
    p.add_argument('-o', '--outdir', default='.', help='directory for images (default: .)')
    p.add_argument('-f', '--format', default='png', choices=['png', 'svg', 'pdf'])
    p.add_argument('--list', action='store_true', help='list blocks, render nothing')
    p.add_argument('--check', action='store_true', help='render to a temp dir to validate only')
    p.add_argument('--only', help='render a subset, e.g. "2,5,7-9"')
    p.add_argument('--prefix', help='image name prefix (default: input file stem)')
    p.add_argument('-w', '--width', type=int, default=2048,
                   help='render viewport width (default: 2048)')
    p.add_argument('-s', '--scale', type=float,
                   help='pixel scale factor (default 2 for PNG) — raise for crisper images')
    p.add_argument('-b', '--background', default='white', help='background (default: white)')
    p.add_argument('-t', '--theme', choices=['default', 'dark', 'neutral', 'forest'])
    p.add_argument('-c', '--config', help='mermaid config JSON file')
    p.add_argument('-p', '--puppeteer-config', help='puppeteer config JSON file')
    p.add_argument('--chrome', help='path to a Chrome/Chromium binary for mmdc')
    p.add_argument('--node', help='path to the node binary that should run mmdc (>= v%d)'
                   % MIN_NODE)
    p.add_argument('--rewrite', nargs='?', const='', metavar='OUT.md',
                   help='write a copy of the Markdown with images (default: <stem>.rendered.md)')
    p.add_argument('--in-place', action='store_true', help='rewrite the input file itself')
    p.add_argument('--rewrite-mode', default='append', choices=['append', 'replace'],
                   help='append: keep the mermaid block and add the image below (default); '
                        'replace: swap the block out for the image')
    args = p.parse_args()

    with open(args.input) as fh:
        md_text = fh.read()
    blocks = extract(md_text)
    for b in blocks:
        b.source = args.input
    if not blocks:
        print('No ```mermaid blocks found in %s' % args.input)
        return 0

    stem = args.prefix or os.path.splitext(os.path.basename(args.input))[0]
    width = len(str(len(blocks)))
    for b in blocks:
        name = '%s-%0*d-%s' % (stem, width, b.index,
                               slugify(b.title, b.diagram_type))
        b.name = name.rstrip('-')

    if args.list:
        print('%d mermaid block(s) in %s\n' % (len(blocks), args.input))
        for b in blocks:
            print('  [%d] lines %d-%d  %-13s %s' % (
                b.index, b.start_line, b.end_line, b.diagram_type, b.title or '-'))
        return 0

    selected = parse_only(args.only, len(blocks))
    setup = setup_mmdc(args)
    print('renderer: mmdc (%s, %s)' % (setup['node'], setup['chrome']), flush=True)

    tmpdir = tempfile.mkdtemp(prefix='mermaid-check-') if args.check else None
    outdir = tmpdir or args.outdir
    if not args.check:
        os.makedirs(outdir, exist_ok=True)

    failures = 0
    for b in blocks:
        if b.index not in selected:
            continue
        out_path = os.path.join(outdir, '%s.%s' % (b.name, args.format))
        err = render(b.code, out_path, args)
        if err:
            failures += 1
            b.error = err
            print('FAIL [%d] %s: %s' % (b.index, locate(b), err),
                  file=sys.stderr, flush=True)
        else:
            b.out_path = out_path
            if not args.check:
                print('OK   [%d] %s' % (b.index, out_path), flush=True)

    if args.check:
        shutil.rmtree(tmpdir, ignore_errors=True)
        print('%d/%d block(s) valid' % (len(selected) - failures, len(selected)))
        return 1 if failures else 0

    if args.rewrite is not None or args.in_place:
        target = args.input if args.in_place else (
            args.rewrite or os.path.splitext(args.input)[0] + '.rendered.md')
        rewrite(md_text, blocks, target, args.rewrite_mode, stem)
        print('markdown: %s' % target)

    print('%d rendered, %d failed' % (len(selected) - failures, failures))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
