import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_REPO = 'github/copilot-app-for-beginners';
export const DOCS_DIR = 'website/src/content/docs/learning-hub/app-for-beginners';
export const IMAGES_DIR = 'website/public/images/learning-hub/copilot-app-for-beginners';
const PUBLIC_ROUTE = '/learning-hub/app-for-beginners/';
const PUBLIC_IMAGES = '/images/learning-hub/copilot-app-for-beginners/';
const REPO_URL = `https://github.com/${SOURCE_REPO}`;
const CHAPTERS = [
  ['00-setup', 'Setup', 'Install the app, prepare your course fork, and create the practice work items.'],
  ['01-tour-the-app', 'Tour the App', 'Explore chats, project sessions, session modes, models, and app settings.'],
  ['02-sessions-worktrees-context', 'Sessions, Worktrees, and Context', 'Start isolated sessions and provide context with files, issues, skills, and commands.'],
  ['03-development-workflows', 'Development and GitHub Workflows', 'Review, test, and preview changes, then work with issues, pull requests, comments, and checks.'],
  ['04-skills-custom-agents', 'Skills and Custom Agents', 'Use a review skill and a read-only custom agent to guide a focused improvement.'],
  ['05-mcp-plugins', 'MCP Servers and Plugins', 'Retrieve documentation through an MCP server and use a plugin for a focused task.'],
  ['06-canvases', 'Canvases', 'Use shared canvas boards to keep plans, progress, and validation evidence visible.'],
  ['07-automations', 'Automations', 'Create and schedule a read-only pull request report, then explore event and cloud options.'],
];

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const text = (bytes) => Buffer.from(bytes).toString('utf8').replace(/\r\n/g, '\n');

async function optionalRead(filename) {
  try {
    return await readFile(filename);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const filename = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(directory, filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export function approvedPages(paths) {
  const pages = [{
    source: 'README.md',
    destination: 'index.md',
    title: 'GitHub Copilot app for Beginners',
    description: 'Learn to direct coding agents in the desktop app through eight chapters with a shared React sample.',
  }];
  for (const [route, title, description] of CHAPTERS) {
    const number = route.slice(0, 2);
    const matches = [...paths].filter((filename) => new RegExp(`^${number}-[^/]+/README\\.md$`).test(filename));
    if (matches.length > 1) throw new Error(`Ambiguous chapter ${number}: ${matches.join(', ')}`);
    if (matches.length) pages.push({
      source: matches[0],
      destination: `${route}.md`,
      title: `${number} · ${title}`,
      description,
    });
  }
  return pages;
}

// Leave fenced commands, prompts, and inline sample paths unchanged.
function mapProse(markdown, transform) {
  let fence;
  return markdown.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return line;
    }
    if (fence) return line;
    const code = [];
    const protectedLine = line.replace(/(`+)[\s\S]*?\1/g, (match) => {
      code.push(match);
      return `\u0000${code.length - 1}\u0000`;
    });
    return transform(protectedLine).replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)]);
  }).join('');
}

export function adaptMarkdown(markdown, source, pages, paths) {
  const assets = new Map();
  const pageRoutes = new Map(pages.map((page) => [
    page.source,
    page.destination === 'index.md' ? PUBLIC_ROUTE : `${PUBLIC_ROUTE}${page.destination.slice(0, -3)}/`,
  ]));

  function destination(url, image = false) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
    const [, pathname, suffix = ''] = url.match(/^([^?#]*)(.*)$/);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURI(pathname)));
    if (resolved.startsWith('../') || resolved.startsWith('/')) {
      throw new Error(`Source link leaves the repository: ${source} -> ${url}`);
    }
    const filename = paths.has(resolved) ? resolved : path.posix.join(resolved, 'README.md');
    if (image) {
      if (!paths.has(resolved) || !/\.(?:webp|svg|png|gif|jpe?g|avif)$/i.test(resolved)) {
        throw new Error(`Missing or unsupported course image: ${source} -> ${url}`);
      }
      const directory = resolved.startsWith('assets/') ? 'overview' : resolved.slice(0, 2);
      if (!/^(?:assets\/|0[0-7]-[^/]+\/assets\/)/.test(resolved)) {
        throw new Error(`Image is outside the approved course: ${resolved}`);
      }
      const local = `${directory}/${path.posix.basename(resolved)}`;
      if (assets.has(local) && assets.get(local) !== resolved) throw new Error(`Image path collision: ${local}`);
      assets.set(local, resolved);
      return `${PUBLIC_IMAGES}${local}${suffix}`;
    }
    if (pageRoutes.has(filename)) return pageRoutes.get(filename) + suffix;
    const directory = [...paths].some((entry) => entry.startsWith(`${resolved.replace(/\/$/, '')}/`));
    if (!paths.has(resolved) && !directory) throw new Error(`Missing source link: ${source} -> ${url}`);
    return `${REPO_URL}/${directory ? 'tree' : 'blob'}/main/${resolved.replace(/\/$/, '')}${suffix}`;
  }

  function rewriteLinks(line) {
    return line.replace(/(!?\[(?:[^\[\]\n]|\[[^\]\n]*\])*\]\()([^\s)]+)([^)\n]*\))/g,
      (_, start, url, end) => `${rewriteLinks(start)}${destination(url, start.startsWith('!'))}${end}`);
  }

  let body = mapProse(markdown, (line) => rewriteLinks(line)
    .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (_, start, url) => start + destination(url))
    .replace(/(<img\b[^>]*\bsrc=)(["'])(.*?)\2/gi,
      (_, start, quote, url) => start + quote + destination(url, true) + quote)
    .replace(/(<a\b[^>]*\bhref=)(["'])(.*?)\2/gi,
      (_, start, quote, url) => start + quote + destination(url) + quote));

  if (source === 'README.md') {
    body = body.replace(/^# GitHub Copilot app for Beginners\s*$/m,
      '<a id="github-copilot-app-for-beginners"></a>');
    body += `\nSource: [${SOURCE_REPO}](${REPO_URL}). Copyright GitHub, Inc. Used under the [MIT license](${REPO_URL}/blob/main/LICENSE).\n`;
  }
  return { body, assets };
}

function frontmatter(page, date) {
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  return `---\ntitle: ${quote(page.title)}\ndescription: ${quote(page.description)}\nauthors:\n  - GitHub, Inc.\n  - Dan Wahlin\nlastUpdated: ${date}\ntags:\n  - workshop\n  - copilot-app\n  - desktop\n---\n\n`;
}

function bodyOf(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
}

function pageContent(page, body, previous, date) {
  if (previous) {
    const metadata = text(previous).match(/^---\n[\s\S]*?\n---\n\n?/);
    if (metadata) return Buffer.from(metadata[0].replace(/^lastUpdated:.*$/m, `lastUpdated: ${date}`) + body);
  }
  return Buffer.from(frontmatter(page, date) + body);
}

export async function planImport({ sha, date, paths, readSource, readLocal }) {
  if (!/^[a-f\d]{40}$/.test(sha)) throw new Error('A full source commit SHA is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use an ISO date: YYYY-MM-DD.');
  const pages = approvedPages(paths);
  const outputs = new Map();
  const files = [];
  const allAssets = new Map();
  const pageAssets = new Map();
  const existingBytes = await readLocal(`${DOCS_DIR}/source.json`);
  const existing = existingBytes ? JSON.parse(text(existingBytes)) : undefined;

  for (const page of pages) {
    const bytes = await readSource(page.source);
    const { body, assets } = adaptMarkdown(text(bytes), page.source, pages, paths);
    const local = `${DOCS_DIR}/${page.destination}`;
    const previous = await readLocal(local);
    outputs.set(local, previous && bodyOf(text(previous)) === body
      ? previous : pageContent(page, body, previous, date));
    pageAssets.set(local, { page, body, previous, assets: new Set(assets.keys()) });
    files.push({ source: page.source, local, sha256: hash(bytes) });
    for (const [localAsset, sourceAsset] of assets) {
      if (allAssets.has(localAsset) && allAssets.get(localAsset) !== sourceAsset) {
        throw new Error(`Image path collision: ${localAsset}`);
      }
      allAssets.set(localAsset, sourceAsset);
    }
  }

  // Download every referenced image, including unchanged paths, to detect asset-only updates.
  for (const [localAsset, sourceAsset] of [...allAssets].sort()) {
    const bytes = await readSource(sourceAsset);
    const local = `${IMAGES_DIR}/${localAsset}`;
    outputs.set(local, bytes);
    files.push({ source: sourceAsset, local, sha256: hash(bytes) });
    const previous = await readLocal(local);
    if (!previous || !bytes.equals(previous)) {
      for (const [pageLocal, entry] of pageAssets) {
        if (entry.assets.has(localAsset)) {
          outputs.set(pageLocal, pageContent(entry.page, entry.body, entry.previous, date));
        }
      }
    }
  }
  const license = await readSource('LICENSE');
  outputs.set(`${DOCS_DIR}/source-license.txt`, Buffer.from(text(license).trimEnd() + '\n'));
  files.push({ source: 'LICENSE', local: `${DOCS_DIR}/source-license.txt`, sha256: hash(license) });
  const deleted = (existing?.files ?? []).map((file) => file.local)
    .filter((filename) => !outputs.has(filename));
  if (deleted.some((filename) => !isImportPath(filename))) throw new Error('Unsafe deletion in source manifest.');
  const changed = [];
  for (const [filename, bytes] of outputs) {
    const previous = await readLocal(filename);
    if (!previous || !bytes.equals(previous)) changed.push(filename);
  }
  for (const filename of deleted) {
    if (await readLocal(filename)) changed.push(filename);
  }
  const sourceMappingChanged = !existing || JSON.stringify(existing.files) !== JSON.stringify(files);
  if (changed.length || sourceMappingChanged) {
    outputs.set(`${DOCS_DIR}/source.json`, Buffer.from(JSON.stringify({
      repository: SOURCE_REPO,
      sourceCommit: sha,
      importedAt: date,
      scope: 'README and chapters 00-07 only; supporting files remain upstream',
      files,
    }, null, 2) + '\n'));
    changed.push(`${DOCS_DIR}/source.json`);
  }
  return { sha, baseline: existing?.sourceCommit, outputs, deleted, changed, pages: pages.length, assets: allAssets.size };
}

function isImportPath(filename) {
  return filename.startsWith(`${DOCS_DIR}/`) || filename.startsWith(`${IMAGES_DIR}/`);
}

export async function applyImport(plan, root) {
  for (const filename of [...plan.outputs.keys(), ...plan.deleted]) {
    if (!isImportPath(filename) || path.posix.normalize(filename) !== filename) {
      throw new Error(`Path is outside the import scope: ${filename}`);
    }
  }
  // Do not write a partial import after a failed source download.
  for (const [filename, bytes] of plan.outputs) {
    if (!plan.changed.includes(filename)) continue;
    await mkdir(path.dirname(path.join(root, filename)), { recursive: true });
    await writeFile(path.join(root, filename), bytes);
  }
  for (const filename of plan.deleted) {
    if (plan.changed.includes(filename)) await unlink(path.join(root, filename));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') options.check = true;
    else if (['--sha', '--date', '--source-dir'].includes(args[i]) && args[i + 1]) {
      options[args[i].slice(2)] = args[++i];
    } else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  const root = fileURLToPath(new URL('../../', import.meta.url));
  let sha = options.sha;
  let paths;
  let readSource;
  if (options['source-dir']) {
    if (!sha) throw new Error('--source-dir requires --sha.');
    paths = new Set(await listFiles(options['source-dir']));
    readSource = (filename) => readFile(path.join(options['source-dir'], filename));
  } else {
    if (!sha) {
      sha = JSON.parse(text(await fetchBytes(`https://api.github.com/repos/${SOURCE_REPO}/commits/main`))).sha;
    }
    if (!/^[a-f\d]{40}$/.test(sha)) throw new Error('A full source commit SHA is required.');
    const tree = JSON.parse(text(await fetchBytes(`https://api.github.com/repos/${SOURCE_REPO}/git/trees/${sha}?recursive=1`)));
    if (tree.truncated) throw new Error('The source tree is truncated.');
    paths = new Set(tree.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path));
    readSource = (filename) => fetchBytes(`https://raw.githubusercontent.com/${SOURCE_REPO}/${sha}/${filename}`);
  }
  const plan = await planImport({
    sha, date: options.date ?? new Date().toISOString().slice(0, 10), paths, readSource,
    readLocal: (filename) => optionalRead(path.join(root, filename)),
  });
  if (!options.check) await applyImport(plan, root);
  console.log(JSON.stringify({
    inspectedSha: plan.sha, committedBaseline: plan.baseline,
    pages: plan.pages, assets: plan.assets, changed: plan.changed, deleted: plan.deleted,
    appliedToCheckout: !options.check && plan.changed.length > 0,
  }, null, 2));
  if (options.check && plan.changed.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
