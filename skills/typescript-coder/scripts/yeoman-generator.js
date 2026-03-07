#!/usr/bin/env node
/**
 * TypeScript Yeoman Generator Helper
 *
 * Provides guidance for using and creating Yeoman TypeScript generators.
 *
 * Usage:
 *   node yeoman-generator.js --list          # List popular TypeScript generators
 *   node yeoman-generator.js --scaffold      # Print a custom generator scaffold
 *   node yeoman-generator.js --check         # Check if Yeoman is installed
 *   node yeoman-generator.js --install <gen> # Show install command for a generator
 *   node yeoman-generator.js --template      # Print EJS template examples
 *   node yeoman-generator.js --test          # Run built-in makeshift tests
 *
 * Self-contained — no external dependencies required.
 * Reference: https://yeoman.io/authoring/
 */

import { execSync } from 'child_process';

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args          = process.argv.slice(2);
const LIST          = args.includes('--list');
const SCAFFOLD      = args.includes('--scaffold');
const CHECK         = args.includes('--check');
const SHOW_TEMPLATE = args.includes('--template');
const TEST          = args.includes('--test');
const SHOW_HELP     = args.length === 0 || args.includes('--help');
const installIdx    = args.indexOf('--install');
const INSTALL_GEN   = installIdx !== -1 ? args[installIdx + 1] : null;

// ─── Colours ─────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * Returns the list of popular TypeScript generators.
 * @returns {Array<{name:string, package:string, description:string, stars:string}>}
 */
function getGenerators() {
  return [
    {
      name:        'node-typescript-boilerplate',
      package:     'generator-node-typescript',
      description: 'Modern Node.js TypeScript project with ESM, Jest, ESLint',
      install:     'npm install -g generator-node-typescript && yo node-typescript',
    },
    {
      name:        'typescript-react-lib',
      package:     'generator-typescript-react-lib',
      description: 'TypeScript React component library with Rollup and tests',
      install:     'npm install -g generator-typescript-react-lib && yo typescript-react-lib',
    },
    {
      name:        'express-no-stress-typescript',
      package:     'generator-express-no-stress-typescript',
      description: 'OpenAPI-first Express TypeScript API with Swagger UI',
      install:     'npm install -g generator-express-no-stress-typescript && yo express-no-stress-typescript',
    },
    {
      name:        'nestjs (via CLI)',
      package:     '@nestjs/cli',
      description: 'Full NestJS TypeScript project with modules, guards, decorators',
      install:     'npm install -g @nestjs/cli && nest new my-project',
    },
    {
      name:        'angular (via NG CLI)',
      package:     '@angular/cli',
      description: 'Angular TypeScript project with routing, forms, testing',
      install:     'npm install -g @angular/cli && ng new my-app --strict',
    },
    {
      name:        'node-tsnext',
      package:     'generator-node-tsnext',
      description: 'Modern ESM Node.js TypeScript module (NodeNext resolution)',
      install:     'npm install -g generator-node-tsnext && yo node-tsnext',
    },
    {
      name:        'typescript-package',
      package:     'generator-typescript-package',
      description: 'Maximally strict TypeScript npm package with semantic-release',
      install:     'npm install -g generator-typescript-package && yo typescript-package',
    },
    {
      name:        'lit-element-next',
      package:     'generator-lit-element-next',
      description: 'Lit 3 web component with TypeScript decorators and Rollup',
      install:     'npm install -g generator-lit-element-next && yo lit-element-next',
    },
  ];
}

/**
 * Returns the TypeScript source code for a minimal custom Yeoman generator.
 * @param {string} [generatorName='my-ts-app']
 * @returns {string}
 */
function buildGeneratorScaffold(generatorName = 'my-ts-app') {
  return `// generators/app/index.ts
// Custom Yeoman generator for TypeScript projects
// Install deps: npm install -D yeoman-generator @types/yeoman-generator

import Generator from 'yeoman-generator';

interface PromptAnswers {
  projectName: string;
  description: string;
  author: string;
  moduleType: 'commonjs' | 'module';
  addTests: boolean;
  addLinting: boolean;
}

export default class ${toPascalCase(generatorName)}Generator extends Generator {
  private answers!: PromptAnswers;

  // 1. Initializing — check project state, configs, etc.
  initializing(): void {
    this.log('Initializing ${generatorName} generator…');
  }

  // 2. Prompting — present questions to the user
  async prompting(): Promise<void> {
    this.answers = await this.prompt<PromptAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: this.appname,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: 'A TypeScript project',
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        store: true,  // remember answer for next time
      },
      {
        type: 'list',
        name: 'moduleType',
        message: 'Module type:',
        choices: ['commonjs', 'module'],
        default: 'module',
      },
      {
        type: 'confirm',
        name: 'addTests',
        message: 'Add test setup (Vitest)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'addLinting',
        message: 'Add ESLint + Prettier?',
        default: true,
      },
    ]);
  }

  // 3. Configuring — save configs, create .editorconfig, etc.
  configuring(): void {
    this.config.set('projectName', this.answers.projectName);
  }

  // 4. Writing — write the generated files
  writing(): void {
    const { projectName, description, author, moduleType, addTests, addLinting } = this.answers;

    // Copy template files (from templates/ directory)
    this.fs.copyTpl(
      this.templatePath('package.json.ejs'),
      this.destinationPath('package.json'),
      { projectName, description, author, moduleType, addTests, addLinting },
    );

    this.fs.copyTpl(
      this.templatePath('tsconfig.json.ejs'),
      this.destinationPath('tsconfig.json'),
      { moduleType },
    );

    this.fs.copyTpl(
      this.templatePath('src/index.ts.ejs'),
      this.destinationPath('src/index.ts'),
      { projectName },
    );

    if (addTests) {
      this.fs.copyTpl(
        this.templatePath('vitest.config.ts.ejs'),
        this.destinationPath('vitest.config.ts'),
        {},
      );
    }

    if (addLinting) {
      this.fs.copy(this.templatePath('eslint.config.mjs'), this.destinationPath('eslint.config.mjs'));
      this.fs.copy(this.templatePath('.prettierrc'), this.destinationPath('.prettierrc'));
    }

    this.fs.copy(this.templatePath('.gitignore.tpl'), this.destinationPath('.gitignore'));
  }

  // 5. Install — install dependencies
  install(): void {
    const deps = ['typescript', 'tsx'];
    const devDeps = ['typescript', '@types/node', 'tsx'];

    if (this.answers.addTests)   devDeps.push('vitest', '@vitest/coverage-v8');
    if (this.answers.addLinting) devDeps.push('eslint', '@typescript-eslint/parser',
                                               '@typescript-eslint/eslint-plugin', 'prettier');

    this.npmInstall([], { 'save-dev': true, packages: devDeps });
  }

  // 6. End — final messages
  end(): void {
    this.log('');
    this.log('✅  Project scaffolded successfully!');
    this.log('');
    this.log('  Next steps:');
    this.log('    npm run dev      # Start development');
    this.log('    npm run build    # Build for production');
    if (this.answers.addTests) this.log('    npm test         # Run tests');
    this.log('');
  }
}

// Helper: convert kebab-case to PascalCase
function toPascalCase(s: string): string {
  return s.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());
}
`;
}

/**
 * Returns EJS template examples for a Yeoman generator.
 * @returns {string}
 */
function buildTemplateExamples() {
  return `
── templates/package.json.ejs ──────────────────────────────────────────
{
  "name": "<%= projectName %>",
  "version": "0.1.0",
  "description": "<%= description %>",
  "author": "<%= author %>",
  "type": "<%= moduleType %>",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"<% if (addTests) { %>,
    "test": "vitest run",
    "test:watch": "vitest"<% } %><% if (addLinting) { %>,
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"<% } %>
  }
}

── templates/tsconfig.json.ejs ─────────────────────────────────────────
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "<%= moduleType === 'module' ? 'NodeNext' : 'CommonJS' %>",
    "moduleResolution": "<%= moduleType === 'module' ? 'NodeNext' : 'Node10' %>",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}

── templates/src/index.ts.ejs ──────────────────────────────────────────
/**
 * <%= projectName %>
 */

export function main(): void {
  console.log('Hello from <%= projectName %>!');
}

main();
`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function tryRun(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

function toPascalCase(s) {
  return s.replace(/(^|[-_])([a-z])/g, (_, __, ch) => ch.toUpperCase());
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold(c.cyan('TypeScript Yeoman Generator Helper'))}

${c.bold('Usage:')}
  node yeoman-generator.js [option]

${c.bold('Options:')}
  --list              List popular TypeScript generators
  --scaffold          Print custom generator scaffold (TypeScript)
  --check             Check if Yeoman (yo) is installed
  --install <name>    Show install command for a generator by name
  --template          Print EJS template examples
  --test              Run built-in makeshift tests
  --help              Show this help
`);
}

function listGenerators() {
  console.log(c.bold('\n📦  Popular TypeScript Yeoman Generators\n'));
  getGenerators().forEach((g, i) => {
    console.log(`  ${c.bold(c.cyan(String(i + 1) + '.'))} ${c.bold(g.name)}`);
    console.log(`     ${c.dim(g.description)}`);
    console.log(`     ${c.yellow('Install:')} ${g.install}`);
    console.log();
  });
  console.log(c.dim('  Browse all generators: https://yeoman.io/generators/\n'));
}

function checkYeoman() {
  console.log(c.bold('\n🔍  Checking Yeoman installation\n'));
  const yo = tryRun('yo --version');
  if (yo) {
    console.log(`  ${c.green('✅')}  Yeoman (yo) found: v${yo}`);
  } else {
    console.log(`  ${c.yellow('⚠️')}  Yeoman not installed.`);
    console.log(`\n  Install with: ${c.cyan('npm install -g yo')}\n`);
  }

  const node = tryRun('node --version');
  console.log(`  ${c.dim('ℹ️')}  Node.js: ${node || 'not found'}`);
  const npm = tryRun('npm --version');
  console.log(`  ${c.dim('ℹ️')}  npm: ${npm ? 'v' + npm : 'not found'}`);
  console.log();
}

function showInstall(genName) {
  if (!genName) {
    console.log(c.yellow('\n  Usage: node yeoman-generator.js --install <generator-name>\n'));
    return;
  }
  console.log(c.bold(`\n📥  Install: ${genName}\n`));
  console.log(`  npm install -g generator-${genName}  # or the full package name`);
  console.log(`  yo ${genName}`);
  console.log(c.dim(`\n  Browse: https://www.npmjs.com/search?q=generator-${genName}\n`));
}

function printScaffold() {
  console.log(c.bold('\n🏗️   Custom Generator Scaffold (TypeScript)\n'));
  console.log(c.dim('// Save to: my-generator/generators/app/index.ts\n'));
  console.log(buildGeneratorScaffold('my-ts-app'));
}

function printTemplates() {
  console.log(c.bold('\n📄  EJS Template Examples\n'));
  console.log(buildTemplateExamples());
}

// ─── Makeshift tests ─────────────────────────────────────────────────────────

function runTests() {
  console.log(c.bold('\n═══ Makeshift Tests ═══\n'));
  let passed = 0; let failed = 0;

  function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`  ${ok ? '\x1b[32m✅ PASS\x1b[0m' : '\x1b[31m❌ FAIL\x1b[0m'}  ${label}`);
    console.log(c.dim(`        Expected: ${JSON.stringify(expected)}`));
    if (!ok) console.log(c.dim(`        Got:      ${JSON.stringify(actual)}`));
    ok ? passed++ : failed++;
  }

  // Test 1: getGenerators returns an array with entries
  const gens = getGenerators();
  assert('getGenerators() returns an array', Array.isArray(gens), true);
  // Expected: true

  assert('getGenerators() has at least 5 entries', gens.length >= 5, true);
  // Expected: true

  // Test 2: Each generator has required fields
  const firstGen = gens[0];
  assert('generator entry has "name" field', 'name' in firstGen, true);
  // Expected: true

  assert('generator entry has "package" field', 'package' in firstGen, true);
  // Expected: true

  assert('generator entry has "install" field', 'install' in firstGen, true);
  // Expected: true

  // Test 3: toPascalCase helper
  assert('toPascalCase("my-ts-app")', toPascalCase('my-ts-app'), 'MyTsApp');
  // Expected: 'MyTsApp'

  assert('toPascalCase("express-no-stress")', toPascalCase('express-no-stress'), 'ExpressNoStress');
  // Expected: 'ExpressNoStress'

  assert('toPascalCase("simple")', toPascalCase('simple'), 'Simple');
  // Expected: 'Simple'

  // Test 4: buildGeneratorScaffold contains PascalCase class
  const scaffold = buildGeneratorScaffold('my-ts-app');
  assert('buildGeneratorScaffold() is a string', typeof scaffold, 'string');
  // Expected: 'string'

  assert('buildGeneratorScaffold() contains "MyTsApp"', scaffold.includes('MyTsApp'), true);
  // Expected: true

  assert('buildGeneratorScaffold() contains lifecycle phases', scaffold.includes('initializing'), true);
  // Expected: true

  // Test 5: buildTemplateExamples contains EJS syntax
  const templates = buildTemplateExamples();
  assert('buildTemplateExamples() contains EJS tags', templates.includes('<%='), true);
  // Expected: true

  assert('buildTemplateExamples() contains package.json template', templates.includes('package.json.ejs'), true);
  // Expected: true

  // Test 6: colour helpers
  const boldText = c.bold('test');
  assert('c.bold() wraps in ANSI bold', boldText.includes('\x1b[1m'), true);
  // Expected: true

  // Test 7: tryRun node command
  const ver = tryRun('node -e "process.stdout.write(\'ok\')"');
  assert('tryRun node -e returns expected output', ver, 'ok');
  // Expected: 'ok'

  console.log(c.bold(`\n  Tests: ${c.green(passed + ' passed')}  ${failed > 0 ? '\x1b[31m' + failed + ' failed\x1b[0m' : c.dim('0 failed')}\n`));
  if (failed > 0) process.exit(1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (TEST)               runTests();
else if (LIST)          listGenerators();
else if (CHECK)         checkYeoman();
else if (SCAFFOLD)      printScaffold();
else if (SHOW_TEMPLATE) printTemplates();
else if (INSTALL_GEN)   showInstall(INSTALL_GEN);
else                    printHelp();
