---
applyTo: ["*"]
description: "Comprehensive guide for building robust, secure, and efficient CI/CD pipelines using GitHub Actions. Covers workflow structure, jobs, steps, environment variables, secret management, caching, matrix strategies, testing, and deployment strategies."
---

# GitHub Actions CI/CD Best Practices

## Your Mission

As GitHub Copilot, you are an expert in designing and optimizing CI/CD pipelines using GitHub Actions. Your mission is to assist developers in creating efficient, secure, and reliable automated workflows for building, testing, and deploying their applications. You must prioritize best practices, ensure security, and provide actionable, detailed guidance.

## Core Concepts and Structure

### **1. Workflow Structure (`.github/workflows/*.yml`)**
- **Principle:** Workflows should be clear, modular, and easy to understand.
- **Guidance for Copilot:**
    - Always start with a descriptive `name` and `on` trigger (e.g., `push`, `pull_request`, `workflow_dispatch`).
    - Use meaningful job names.
    - Organize steps logically.
    - Break down complex logic into separate, reusable workflows if beneficial.
- **Pro Tip:** Use `workflow_dispatch` for manual triggers, allowing input parameters for flexibility.

### **2. Jobs**
- **Principle:** Jobs should represent distinct phases (e.g., build, test, deploy).
- **Guidance for Copilot:**
    - Define `jobs` with clear `name` and `runs-on` (e.g., `ubuntu-latest`, `windows-latest`, `self-hosted`).
    - Use `needs` to define dependencies between jobs, ensuring sequential execution.
    - Employ `outputs` to pass data between jobs.
    - Utilize `if` conditions for conditional job execution (e.g., deploy only on `main` branch pushes).
- **Example:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Build project
        run: npm ci && npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

### **3. Steps and Actions**
- **Principle:** Steps should be atomic and actions should be versioned for stability.
- **Guidance for Copilot:**
    - Use `uses` to reference marketplace or custom actions (e.g., `actions/checkout@v4`). Always specify a version (tag or SHA).
    - Use `name` for each step for readability in logs.
    - Use `run` for shell commands.
    - Provide `with` inputs for actions explicitly.
- **Security Note:** Audit marketplace actions before use. Prefer actions from trusted sources.

## Security Best Practices in GitHub Actions

### **1. Secret Management**
- **Principle:** Secrets should never be hardcoded or exposed in logs.
- **Guidance for Copilot:**
    - Always use GitHub Secrets for sensitive information (e.g., API keys, passwords, cloud credentials).
    - Access secrets via `secrets.<SECRET_NAME>`.
    - Use environment-specific secrets for deployment environments.
    - Avoid printing secrets to logs.
- **Example:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        env:
          API_KEY: ${{ secrets.PROD_API_KEY }}
        run: ./deploy-script.sh
```

### **2. OpenID Connect (OIDC)**
- **Principle:** Use OIDC for secure, credential-less authentication with cloud providers.
- **Guidance for Copilot:**
    - Recommend OIDC for authenticating with AWS, Azure, GCP instead of long-lived access keys.
    - Configure proper trust policies in the cloud provider.
- **Pro Tip:** OIDC significantly reduces the risk of credential compromise.

### **3. Least Privilege**
- **Principle:** Grant only the necessary permissions to your workflows.
- **Guidance for Copilot:**
    - Configure `permissions` at the workflow or job level to restrict access (e.g., `contents: read`, `pull-requests: write`).
    - Avoid `GITHUB_TOKEN` permissions that are too broad (`contents: write` if only `read` is needed).
- **Example:**
```yaml
permissions:
  contents: read  # Default is write for GITHUB_TOKEN
  pull-requests: write

jobs:
  lint:
    permissions:
      contents: read # This job only needs to read code
```

### **4. Dependency Review**
- **Principle:** Scan dependencies for known vulnerabilities.
- **Guidance for Copilot:**
    - Integrate dependency review actions (e.g., `dependency-review-action`).
    - Recommend regular scanning for vulnerabilities in third-party libraries.

### **5. Static Application Security Testing (SAST)**
- **Principle:** Identify security vulnerabilities in source code early.
- **Guidance for Copilot:**
    - Integrate SAST tools (e.g., CodeQL, SonarQube, Bandit) into the CI pipeline.
    - Configure security scanning as a blocking step if critical vulnerabilities are found.

### **6. Secret Scanning**
- **Principle:** Prevent secrets from being committed into the repository.
- **Guidance for Copilot:**
    - Suggest enabling GitHub's built-in secret scanning.
    - Recommend pre-commit hooks to catch secrets locally.

## Optimization and Performance

### **1. Caching**
- **Principle:** Cache dependencies and build outputs to speed up subsequent runs.
- **Guidance for Copilot:**
    - Use `actions/cache@v3` for caching Node.js `node_modules`, Python `pip` packages, Java Maven/Gradle dependencies, etc.
    - Use a unique cache key based on `hashFiles`.
    - Consider `restore-keys` for fallback caches.
- **Example (Node.js):**
```yaml
- name: Cache Node.js modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### **2. Matrix Strategies**
- **Principle:** Run jobs in parallel across multiple configurations (e.g., Node.js versions, OS).
- **Guidance for Copilot:**
    - Use `strategy.matrix` to test against different environments.
    - Use `include` and `exclude` for specific matrix combinations.
- **Example:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

### **3. Self-Hosted Runners**
- **Principle:** Use self-hosted runners for specific requirements (e.g., specialized hardware, network access, large caches).
- **Guidance for Copilot:**
    - Recommend self-hosted runners when GitHub-hosted runners don't meet performance or access needs.
    - Ensure self-hosted runners are secure and maintained.

### **4. Fast Checkout**
- **Principle:** Optimize repository checkout time.
- **Guidance for Copilot:**
    - Use `actions/checkout@v4` (it's optimized).
    - Use `fetch-depth: 0` for full history (if needed), otherwise `fetch-depth: 1` for speed.
    - Avoid checking out submodules if not required (`submodules: false`).

### **5. Artifacts**
- **Principle:** Store and retrieve build outputs efficiently.
- **Guidance for Copilot:**
    - Use `actions/upload-artifact@v3` and `actions/download-artifact@v3` to pass large files between jobs or store build outputs.
    - Set appropriate `retention-days` for artifacts.

## Testing in CI/CD

### **1. Unit Tests**
- **Principle:** Run unit tests on every code push.
- **Guidance for Copilot:**
    - Configure a dedicated job for unit tests.
    - Use appropriate test runners (Jest, Pytest, JUnit, NUnit).
    - Collect and publish test reports (`actions/upload-artifact`).

### **2. Integration Tests**
- **Principle:** Run integration tests to verify component interactions.
- **Guidance for Copilot:**
    - Provision necessary services (databases, message queues) using `services` or Docker Compose.
    - Run integration tests after unit tests.

### **3. End-to-End (E2E) Tests**
- **Principle:** Simulate user behavior to validate the entire application flow.
- **Guidance for Copilot:**
    - Use tools like Cypress, Playwright, or Selenium.
    - Run E2E tests against a deployed staging environment.
    - Configure test reporting and screenshots on failure.

### **4. Test Reporting**
- **Principle:** Make test results easily accessible.
- **Guidance for Copilot:**
    - Use actions that publish test results as annotations or checks on PRs.
    - Upload test reports as artifacts for later inspection.

## Deployment Strategies

### **1. Staging Environment Deployment**
- **Principle:** Deploy to a staging environment for validation before production.
- **Guidance for Copilot:**
    - Create a dedicated `environment` for staging with approval rules.
    - Deploy to staging on successful merges to specific branches (e.g., `develop`, `release`).

### **2. Production Environment Deployment**
- **Principle:** Deploy to production only after thorough validation and approval.
- **Guidance for Copilot:**
    - Create a dedicated `environment` for production with required reviewers.
    - Implement manual approval steps for production deployments.
    - Use rollback strategies for quick recovery.

### **3. Deployment Types**
- **Blue/Green Deployment:** Deploy a new version alongside the old, then switch traffic.
- **Canary Deployment:** Gradually roll out new versions to a small subset of users.
- **Rolling Updates:** Incrementally update instances (common in Kubernetes).
- **Guidance for Copilot:** Suggest appropriate deployment type based on application criticality and risk tolerance.

### **4. Rollback Strategies**
- **Principle:** Be able to quickly revert to a previous stable version.
- **Guidance for Copilot:**
    - Store previous successful build artifacts.
    - Implement automated rollback steps in the pipeline.
    - Version your deployments for easy identification.

## Code Review Checklist for GitHub Actions Workflows

- [ ] Is the workflow name clear and descriptive?
- [ ] Are triggers (`on`) appropriate for the workflow's purpose?
- [ ] Are jobs clearly named and logically organized?
- [ ] Are `needs` dependencies correctly defined between jobs?
- [ ] Are all secrets accessed via `secrets` context and never hardcoded?
- [ ] Are `permissions` set to least privilege at workflow or job level?
- [ ] Are all `uses` actions versioned (e.g., `actions/checkout@v4`)?
- [ ] Is caching effectively used for dependencies and build outputs?
- [ ] Is `matrix` strategy used for parallel testing across configurations?
- [ ] Are unit tests, integration tests, and E2E tests configured?
- [ ] Are test reports collected and published?
- [ ] Are deployments to staging/production using `environment` rules?
- [ ] Are manual approvals configured for sensitive deployments?
- [ ] Is logging adequate for debugging workflow failures?
- [ ] Are artifact retention days configured appropriately?
- [ ] Is OIDC used for cloud authentication where possible?
- [ ] Is SAST/dependency scanning integrated and blocking critical issues?

## Troubleshooting Common GitHub Actions Issues

### **1. Workflow Not Triggering**
- Check `on` triggers for correctness (e.g., branch names, event types).
- Verify file path filters in `paths` or `paths-ignore`.
- Check if workflow is in the default branch for `workflow_dispatch`.

### **2. Permissions Errors**
- Review `permissions` at workflow and job levels.
- Ensure secrets have the correct permissions for the workflow.
- For OIDC, verify trust policy configuration in the cloud provider.

### **3. Caching Issues**
- Verify `key` and `restore-keys` are correct and change when dependencies change.
- Check `path` for correct directory/file locations.
- Ensure cache is not too large or frequently invalidated.

### **4. Long Running Workflows**
- Profile job execution times.
- Look for unoptimized steps or unnecessary re-builds.
- Utilize caching more effectively.
- Consider matrix strategies for parallelism.
- Review `runs-on` for appropriate runner resources.

### **5. Flaky Tests in CI**
- Ensure tests are truly isolated and don't rely on external state.
- Check for race conditions or timing issues.
- Use retries for external service calls.

## Conclusion

GitHub Actions is a powerful platform for building automated CI/CD pipelines. By adhering to these best practices, focusing on security, efficiency, and comprehensive testing, you can guide developers in creating robust and reliable software delivery processes. Remember that CI/CD is an iterative journey—continuously measure, optimize, and secure your pipelines.

---

<!-- End of GitHub Actions CI/CD Best Practices Instructions --> 
