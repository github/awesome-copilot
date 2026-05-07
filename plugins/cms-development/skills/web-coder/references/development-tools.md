# Development Tools Reference

Tools and workflows for web development.

## Version Control

### Git

Distributed version control system.

**Basic Commands**:
```bash
# Initialize repository
git init

# Clone repository
git clone https://github.com/user/repo.git

# Check status
git status

# Stage changes
git add file.js
git add . # All files

# Commit
git commit -m "commit message"

# Push to remote
git push origin main

# Pull from remote
git pull origin main

# Branches
git branch feature-name
git checkout feature-name
git checkout -b feature-name # Create and switch

# Merge
git checkout main
git merge feature-name

# View history
git log
git log --oneline --graph
```

**Best Practices**:
- Commit often with meaningful messages
- Use branches for features
- Pull before push
- Review changes before committing
- Use .gitignore for generated files

### GitHub/GitLab/Bitbucket

Git hosting platforms with collaboration features:
- Pull requests / Merge requests
- Code review
- Issue tracking
- CI/CD integration
- Project management

## Package Managers

### npm (Node Package Manager)

```bash
# Initialize project
npm init
npm init -y # Skip prompts

# Install dependencies
npm install package-name
npm install -D package-name # Dev dependency
npm install -g package-name # Global

# Update packages
npm update
npm outdated

# Run scripts
npm run build
npm test
npm start

# Audit security
npm audit
npm audit fix
```

**package.json**:
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "build": "webpack",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "webpack": "^5.75.0"
  }
}
```

### Yarn

Faster alternative to npm:
```bash
yarn add package-name
yarn remove package-name
yarn upgrade
yarn build
```

### pnpm

Efficient package manager (disk space saving):
```bash
pnpm install
pnpm add package-name
pnpm remove package-name
```

## Build Tools

### Webpack

Module bundler:

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ]
};
```

### Vite

Fast modern build tool:

```bash
# Create project
npm create vite@latest my-app

# Dev server
npm run dev

# Build
npm run build
```

### Parcel

Zero-config bundler:
```bash
parcel index.html
parcel build index.html
```

## Task Runners

### npm Scripts

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

## Testing Frameworks

### Jest

JavaScript testing framework:

```javascript
// sum.test.js
const sum = require('./sum');

describe('sum function', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
  
  test('handles negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });
});
```

### Vitest

Vite-powered testing (Jest-compatible):
```javascript
import { describe, test, expect } from 'vitest';

describe('math', () => {
  test('addition', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Playwright

End-to-end testing:
```javascript
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
```

## Linters & Formatters

### ESLint

JavaScript linter:

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error'
  }
};
```

### Prettier

Code formatter:

```json
// .prettierrc
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Stylelint

CSS linter:
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "indentation": 2,
    "color-hex-length": "short"
  }
}
```

## IDEs and Editors

### Visual Studio Code

**Key Features**:
- IntelliSense
- Debugging
- Git integration
- Extensions marketplace
- Terminal integration

**Popular Extensions**:
- ESLint
- Prettier
- Live Server
- GitLens
- Path Intellisense

### WebStorm

Full-featured IDE for web development by JetBrains.

### Sublime Text

Lightweight, fast text editor.

### Vim/Neovim

Terminal-based editor (steep learning curve).

## TypeScript

Typed superset of JavaScript:

```typescript
// types.ts
interface User {
  id: number;
  name: string;
  email?: string; // Optional
}

function getUser(id: number): User {
  return { id, name: 'John' };
}

// Generics
function identity<T>(arg: T): T {
  return arg;
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Continuous Integration (CI/CD)

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

### Other CI/CD Platforms

- **GitLab CI**
- **CircleCI**
- **Travis CI**
- **Jenkins**

## Debugging

### Browser DevTools

```javascript
// Debugging statements
debugger; // Pause execution
console.log('value:', value);
console.error('error:', error);
console.trace(); // Stack trace
```

### Node.js Debugging

```bash
# Built-in debugger
node inspect app.js

# Chrome DevTools
node --inspect app.js
node --inspect-brk app.js # Break on start
```

## Performance Profiling

### Chrome DevTools Performance

- Record CPU activity
- Analyze flame charts
- Identify bottlenecks

### Lighthouse

```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com

# DevTools
Open Chrome DevTools > Lighthouse tab
```

## Monitoring

### Error Tracking

- **Sentry**: Error monitoring
- **Rollbar**: Real-time error tracking
- **Bugsnag**: Error monitoring

### Analytics

- **Google Analytics**
- **Plausible**: Privacy-friendly
- **Matomo**: Self-hosted

### RUM (Real User Monitoring)

- **SpeedCurve**
- **New Relic**
- **Datadog**

## Developer Workflow

### Typical Workflow

1. **Setup**: Clone repo, install dependencies
2. **Develop**: Write code, run dev server
3. **Test**: Run unit/integration tests
4. **Lint/Format**: Check code quality
5. **Commit**: Git commit and push
6. **CI/CD**: Automated tests and deployment
7. **Deploy**: Push to production

### Environment Variables

```bash
# .env
DATABASE_URL=postgres://localhost/db
API_KEY=secret-key-here
NODE_ENV=development
```

```javascript
// Access in Node.js
const dbUrl = process.env.DATABASE_URL;
```

## Glossary Terms

**Key Terms Covered**:
- Bun
- Continuous integration
- Deno
- Developer tools
- Fork
- Fuzz testing
- Git
- IDE
- Node.js
- Repo
- Rsync
- SCM
- SDK
- Smoke test
- SVN
- TypeScript

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [npm Documentation](https://docs.npmjs.com/)
- [Webpack Guides](https://webpack.js.org/guides/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
