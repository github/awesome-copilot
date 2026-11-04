import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, cp, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const fakeModule = `const fs = require('fs');
exports.chromium = { async launch() {
 if (!fs.existsSync(process.env.FIXTURE_BROWSER)) throw new Error("Executable doesn't exist");
 return { async newContext() { return { async addInitScript() {}, async newPage() { return { on() {}, async goto() {}, locator() { return { async getAttribute() { return 'simulated'; } }; } }; } }; }, on(event, cb) { setTimeout(cb, 10); }, async close() {} };
} };`;
const ptyDriver = `import os, pty, subprocess, sys
master, slave = pty.openpty()
p = subprocess.Popen(sys.argv[2:], stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
out = b''
while True:
 try:
  data = os.read(master, 65536)
 except OSError:
  break
 if not data: break
 out += data
 if b'[y/N] ' in data: os.write(master, (sys.argv[1]+'\\n').encode())
sys.stdout.buffer.write(out)
sys.exit(p.wait())
`;
async function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d);
    const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
    child.on('error', reject); child.on('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}
for (const scenario of ['noninteractive-deny-package', 'interactive-no', 'interactive-default-no', 'interactive-browser-no', 'package-only', 'browser-only', 'flags-yes', 'interactive-yes']) {
  test(`launcher consent: ${scenario}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'webmcp-consent-'));
    try {
      await mkdir(join(dir, 'scripts')); await mkdir(join(dir, 'bin')); await mkdir(join(dir, 'temp'));
      await cp(new URL('../scripts/workbench.mjs', import.meta.url), join(dir, 'scripts/workbench.mjs'));
      await cp(new URL('../templates', import.meta.url), join(dir, 'templates'), { recursive: true });
      await writeFile(join(dir, 'fake-module.cjs'), fakeModule);
      await writeFile(join(dir, 'bin/npm'), `#!/bin/sh\nmkdir -p node_modules/playwright\ncp "$FIXTURE_MODULE" node_modules/playwright/index.js\nprintf '%s' '{"name":"playwright","main":"index.js"}' >node_modules/playwright/package.json\nprintf '%s' 'require("fs").writeFileSync(process.env.FIXTURE_BROWSER, "installed");' >node_modules/playwright/cli.js\nprintf 'npm\\n' >>"$FIXTURE_LOG"\n`, { mode: 0o755 });
      await writeFile(join(dir, 'drive-terminal.py'), ptyDriver);
      const env = { ...process.env, NODE_PATH: '', PATH: `${join(dir, 'bin')}:${process.env.PATH}`, TMPDIR: join(dir, 'temp'), FIXTURE_MODULE: join(dir, 'fake-module.cjs'), FIXTURE_BROWSER: join(dir, 'browser'), FIXTURE_LOG: join(dir, 'install.log') };
      let args = [join(dir, 'scripts/workbench.mjs'), '--url', 'http://localhost.test'];
      if (['package-only', 'flags-yes', 'interactive-browser-no'].includes(scenario)) args.push('--allow-playwright-install');
      if (['browser-only', 'flags-yes'].includes(scenario)) args.push('--allow-browser-download');
      const interactive = scenario.startsWith('interactive');
      const result = interactive
        ? await run('python3', [join(dir, 'drive-terminal.py'), scenario === 'interactive-yes' ? 'yes' : scenario === 'interactive-default-no' ? '' : 'no', process.execPath, ...args], env)
        : await run(process.execPath, args, env);
      if (scenario === 'flags-yes' || scenario === 'interactive-yes') {
        assert.equal(result.code, 0, result.output);
        assert.equal(await readFile(env.FIXTURE_LOG, 'utf8'), 'npm\n');
        await access(env.FIXTURE_BROWSER);
      } else {
        assert.notEqual(result.code, 0, result.output);
        const scope = ['package-only', 'interactive-browser-no'].includes(scenario) ? '--allow-browser-download' : '--allow-playwright-install';
        assert.ok(result.output.includes(scope), result.output);
        await assert.rejects(access(env.FIXTURE_BROWSER));
        if (!['package-only', 'interactive-browser-no'].includes(scenario)) {
          await assert.rejects(access(env.FIXTURE_LOG));
          await assert.rejects(access(join(dir, 'temp/webmcpify-workbench-playwright-1.61.1')));
        }
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}
