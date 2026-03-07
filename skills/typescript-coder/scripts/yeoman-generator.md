# Yeoman TypeScript Generator

A guide for creating and using Yeoman generators to scaffold TypeScript projects. Yeoman is a scaffolding tool that automates project setup through interactive prompts and file templates.

**References:**
- https://yeoman.io/authoring/
- https://yeoman.io/learning/
- https://yeoman.io/generators/

---

## Installing Yeoman

```bash
npm install -g yo
```

Verify the installation:

```bash
yo --version
```

---

## Using Existing TypeScript Generators

Browse available generators at https://yeoman.io/generators/ or search on npm:

```bash
npm search yeoman-generator typescript
```

Install and run a generator:

```bash
npm install -g generator-typescript-starter
yo typescript-starter
```

Popular TypeScript generators:

| Generator | Purpose |
|-----------|---------|
| `generator-node-typescript` | Node.js TypeScript project |
| `generator-ts-library` | TypeScript npm library |
| `generator-express-typescript` | Express + TypeScript API |
| `generator-react-typescript` | React + TypeScript app |

---

## Creating a Custom Yeoman Generator for TypeScript Projects

### 1. Scaffold the Generator Project

```bash
npm install -g generator-generator
mkdir generator-my-typescript && cd generator-my-typescript
yo generator
```

### 2. Install Dependencies

```bash
npm install --save yeoman-generator
npm install --save-dev typescript @types/node @types/yeoman-generator ts-node
```

### 3. Project Structure

```
generator-my-typescript/
├── generators/
│   └── app/
│       ├── index.ts          # Main generator logic
│       └── templates/        # File templates
│           ├── src/
│           │   └── index.ts.ejs
│           ├── package.json.ejs
│           └── tsconfig.json.ejs
├── package.json
└── tsconfig.json
```

### 4. Generator `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./generators",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["generators/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Generator `package.json`

```json
{
  "name": "generator-my-typescript",
  "version": "1.0.0",
  "description": "Yeoman generator for TypeScript projects",
  "files": ["dist/"],
  "main": "dist/app/index.js",
  "keywords": ["yeoman-generator", "typescript"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "yeoman-generator": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/yeoman-generator": "^5.0.0"
  }
}
```

---

## Key Generator File: `generators/app/index.ts`

```typescript
import Generator from 'yeoman-generator';
import path from 'path';

interface PromptAnswers {
  projectName: string;
  description: string;
  authorName: string;
  authorEmail: string;
  license: string;
  useEslint: boolean;
  usePrettier: boolean;
  targetEnvironment: 'node' | 'browser' | 'both';
  useStrict: boolean;
}

export default class TypeScriptGenerator extends Generator {
  private answers!: PromptAnswers;

  // 1. Initializing phase - check state, set up options
  initializing(): void {
    this.log('Welcome to the TypeScript Project Generator!');
  }

  // 2. Prompting phase - gather user input
  async prompting(): Promise<void> {
    this.answers = await this.prompt<PromptAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: path.basename(process.cwd()),
        validate: (input: string) =>
          /^[a-z0-9-_]+$/.test(input) || 'Use lowercase letters, numbers, hyphens, or underscores'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: 'A TypeScript project'
      },
      {
        type: 'input',
        name: 'authorName',
        message: 'Author name:',
        default: this.user.git.name() ?? ''
      },
      {
        type: 'input',
        name: 'authorEmail',
        message: 'Author email:',
        default: this.user.git.email() ?? ''
      },
      {
        type: 'list',
        name: 'license',
        message: 'License:',
        choices: ['MIT', 'Apache-2.0', 'GPL-3.0', 'ISC', 'UNLICENSED'],
        default: 'MIT'
      },
      {
        type: 'list',
        name: 'targetEnvironment',
        message: 'Target environment:',
        choices: [
          { name: 'Node.js', value: 'node' },
          { name: 'Browser', value: 'browser' },
          { name: 'Both (library)', value: 'both' }
        ],
        default: 'node'
      },
      {
        type: 'confirm',
        name: 'useStrict',
        message: 'Enable strict TypeScript mode?',
        default: true
      },
      {
        type: 'confirm',
        name: 'useEslint',
        message: 'Add ESLint with TypeScript support?',
        default: true
      },
      {
        type: 'confirm',
        name: 'usePrettier',
        message: 'Add Prettier for code formatting?',
        default: true
      }
    ]);
  }

  // 3. Configuring phase - save configuration
  configuring(): void {
    this.config.set('projectName', this.answers.projectName);
    this.config.set('targetEnvironment', this.answers.targetEnvironment);
  }

  // 4. Writing phase - create files from templates
  writing(): void {
    const templateData = {
      ...this.answers,
      currentYear: new Date().getFullYear(),
      nodeVersion: process.version.replace('v', '')
    };

    // Copy template files
    this.fs.copyTpl(
      this.templatePath('package.json.ejs'),
      this.destinationPath('package.json'),
      templateData
    );

    this.fs.copyTpl(
      this.templatePath('tsconfig.json.ejs'),
      this.destinationPath('tsconfig.json'),
      templateData
    );

    this.fs.copyTpl(
      this.templatePath('src/index.ts.ejs'),
      this.destinationPath('src/index.ts'),
      templateData
    );

    // Copy static files
    this.fs.copy(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore')
    );

    // Conditionally add ESLint config
    if (this.answers.useEslint) {
      this.fs.copyTpl(
        this.templatePath('eslint.config.js.ejs'),
        this.destinationPath('eslint.config.js'),
        templateData
      );
    }

    // Conditionally add Prettier config
    if (this.answers.usePrettier) {
      this.fs.copy(
        this.templatePath('.prettierrc'),
        this.destinationPath('.prettierrc')
      );
    }
  }

  // 5. Installing phase - run npm install
  install(): void {
    const devDependencies = [
      'typescript',
      '@types/node',
      'ts-node',
      'rimraf'
    ];

    if (this.answers.useEslint) {
      devDependencies.push(
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser'
      );
    }

    if (this.answers.usePrettier) {
      devDependencies.push('prettier');
      if (this.answers.useEslint) {
        devDependencies.push('eslint-config-prettier');
      }
    }

    this.npmInstall(devDependencies, { 'save-dev': true });
  }

  // 6. End phase - display completion message
  end(): void {
    this.log(`
TypeScript project "${this.answers.projectName}" created successfully!

Next steps:
  cd ${this.answers.projectName}
  npm run build
  npm start
    `);
  }
}
```

---

## Template Files

### `generators/app/templates/package.json.ejs`

```json
{
  "name": "<%= projectName %>",
  "version": "1.0.0",
  "description": "<%= description %>",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "author": "<%= authorName %> <<%= authorEmail %>>",
  "license": "<%= license %>",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "watch": "tsc --watch",
    "clean": "rimraf dist",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"<% if (useEslint) { %>,
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix"<% } %><% if (usePrettier) { %>,
    "format": "prettier --write \"src/**/*.ts\""<% } %>
  },
  "devDependencies": {}
}
```

### `generators/app/templates/tsconfig.json.ejs`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "<%= targetEnvironment === 'browser' ? 'esnext' : 'commonjs' %>",
    "lib": [<% if (targetEnvironment === 'node') { %>"ES2020"<% } else if (targetEnvironment === 'browser') { %>"ES2020", "DOM", "DOM.Iterable"<% } else { %>"ES2020", "DOM"<% } %>],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": <%= useStrict %>,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `generators/app/templates/src/index.ts.ejs`

```typescript
/**
 * <%= projectName %>
 * <%= description %>
 *
 * @author <%= authorName %>
 * @license <%= license %>
 */

function greet(name: string): string {
  return `Hello, ${name}! Welcome to <%= projectName %>.`;
}

console.log(greet('World'));
```

---

## Using Prompts: Advanced Techniques

### Conditional Prompts

```typescript
async prompting(): Promise<void> {
  const initialAnswers = await this.prompt([
    {
      type: 'confirm',
      name: 'useDatabase',
      message: 'Add database support?',
      default: false
    }
  ]);

  if (initialAnswers.useDatabase) {
    const dbAnswers = await this.prompt([
      {
        type: 'list',
        name: 'databaseType',
        message: 'Choose database:',
        choices: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB']
      }
    ]);
    this.answers = { ...initialAnswers, ...dbAnswers };
  } else {
    this.answers = initialAnswers;
  }
}
```

### Storing Answers as Defaults

```typescript
prompting(): Promise<void> {
  const prompts = [
    {
      type: 'input',
      name: 'authorName',
      message: 'Author name:',
      // Retrieve previously stored value as default
      default: this.config.get('authorName') ?? this.user.git.name()
    }
  ];

  return this.prompt(prompts).then(answers => {
    // Save for future runs
    this.config.set('authorName', answers.authorName);
    this.answers = answers;
  });
}
```

---

## Composing Generators

Compose with other generators to add shared functionality:

```typescript
import Generator from 'yeoman-generator';

export default class MyGenerator extends Generator {
  writing(): void {
    // Compose with another generator
    this.composeWith(require.resolve('generator-license'), {
      name: this.answers.authorName,
      email: this.answers.authorEmail,
      output: 'LICENSE',
      license: this.answers.license
    });

    // Compose with a local sub-generator
    this.composeWith(require.resolve('../git'), {
      name: this.answers.projectName
    });
  }
}
```

### Sub-generator: `generators/git/index.ts`

```typescript
import Generator from 'yeoman-generator';

interface GitOptions {
  name: string;
}

export default class GitSubGenerator extends Generator {
  constructor(args: string[], opts: GitOptions) {
    super(args, opts);
    this.option('name', { type: String });
  }

  writing(): void {
    this.fs.copy(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore')
    );

    this.fs.copyTpl(
      this.templatePath('.gitattributes.ejs'),
      this.destinationPath('.gitattributes'),
      { name: this.options.name }
    );
  }
}
```

---

## Writing Files with Templates

### Template Engine (EJS)

Yeoman uses EJS for templating by default:

```typescript
writing(): void {
  // Single file from template
  this.fs.copyTpl(
    this.templatePath('README.md.ejs'),
    this.destinationPath('README.md'),
    { projectName: this.answers.projectName }
  );

  // Entire directory
  this.fs.copyTpl(
    this.templatePath('src'),
    this.destinationPath('src'),
    { ...this.answers }
  );

  // Rename files based on answers
  this.fs.copyTpl(
    this.templatePath('service.ts.ejs'),
    this.destinationPath(`src/${this.answers.serviceName}.service.ts`),
    { ...this.answers }
  );

  // JSON manipulation (for package.json)
  const pkgPath = this.destinationPath('package.json');
  const pkg = this.fs.readJSON(pkgPath, {}) as Record<string, unknown>;
  pkg.scripts = {
    ...(pkg.scripts as Record<string, string> ?? {}),
    test: 'jest'
  };
  this.fs.writeJSON(pkgPath, pkg);
}
```

---

## Running Tests on Generators

### Install Testing Dependencies

```bash
npm install --save-dev yeoman-test yeoman-assert jest @types/jest ts-jest
```

### `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts']
};
```

### `generators/app/__tests__/app.test.ts`

```typescript
import path from 'path';
import helpers from 'yeoman-test';
import assert from 'yeoman-assert';

describe('generator-my-typescript:app', () => {
  describe('default options', () => {
    beforeEach(() => {
      return helpers
        .run(path.join(__dirname, '../index'))
        .withPrompts({
          projectName: 'my-test-project',
          description: 'A test project',
          authorName: 'Test Author',
          authorEmail: 'test@example.com',
          license: 'MIT',
          targetEnvironment: 'node',
          useStrict: true,
          useEslint: true,
          usePrettier: true
        });
    });

    it('creates package.json', () => {
      assert.file('package.json');
    });

    it('creates tsconfig.json', () => {
      assert.file('tsconfig.json');
    });

    it('creates src/index.ts', () => {
      assert.file('src/index.ts');
    });

    it('sets correct project name in package.json', () => {
      assert.jsonFileContent('package.json', {
        name: 'my-test-project'
      });
    });

    it('enables strict mode in tsconfig.json', () => {
      assert.jsonFileContent('tsconfig.json', {
        compilerOptions: { strict: true }
      });
    });

    it('creates eslint config when requested', () => {
      assert.file('eslint.config.js');
    });

    it('creates prettier config when requested', () => {
      assert.file('.prettierrc');
    });
  });

  describe('without optional tools', () => {
    beforeEach(() => {
      return helpers
        .run(path.join(__dirname, '../index'))
        .withPrompts({
          projectName: 'minimal-project',
          useEslint: false,
          usePrettier: false
        });
    });

    it('skips eslint config', () => {
      assert.noFile('eslint.config.js');
    });

    it('skips prettier config', () => {
      assert.noFile('.prettierrc');
    });
  });
});
```

---

## Publishing a Generator to npm

### 1. Ensure Correct `package.json` Fields

```json
{
  "name": "generator-my-typescript",
  "version": "1.0.0",
  "description": "Yeoman generator for TypeScript projects",
  "files": ["dist/"],
  "main": "dist/app/index.js",
  "keywords": [
    "yeoman-generator",
    "typescript",
    "scaffold",
    "template"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/username/generator-my-typescript.git"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

The name MUST start with `generator-` for Yeoman to discover it.

### 2. Build Before Publishing

```bash
npm run build
```

### 3. Test Locally via npm link

```bash
npm link
# In another directory:
yo my-typescript
```

### 4. Publish to npm

```bash
npm login
npm publish
```

### 5. Users Install and Run

```bash
npm install -g generator-my-typescript
yo my-typescript
```

---

## Quick Reference

| Yeoman Phase | Method | Purpose |
|---|---|---|
| `initializing` | Setup, validation | Greet user, check prerequisites |
| `prompting` | `this.prompt()` | Gather user input |
| `configuring` | `this.config.set()` | Save configuration |
| `default` | Custom logic | Generate computed values |
| `writing` | `this.fs.copyTpl()` | Write files from templates |
| `conflicts` | Auto-handled | Merge conflicting files |
| `install` | `this.npmInstall()` | Install dependencies |
| `end` | Log messages | Display next steps |

| Template API | Purpose |
|---|---|
| `this.templatePath('file')` | Resolve path to template file |
| `this.destinationPath('file')` | Resolve path in output directory |
| `this.fs.copyTpl(src, dest, data)` | Copy file with EJS template |
| `this.fs.copy(src, dest)` | Copy file as-is |
| `this.fs.readJSON(path, default)` | Read JSON file |
| `this.fs.writeJSON(path, data)` | Write JSON file |
