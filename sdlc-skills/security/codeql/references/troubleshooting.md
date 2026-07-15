# CodeQL Troubleshooting Reference

Comprehensive guide for diagnosing and resolving CodeQL analysis errors, SARIF upload issues, and common configuration problems.

## Build and Analysis Errors

### "No source code was seen during the build"

**Cause:** CodeQL extractor did not find any source files during database creation.

**Solutions:**
- Verify the `--source-root` points to the correct directory
- For compiled languages, ensure the build command actually compiles source files
- Check that `autobuild` is detecting the correct build system
- Switch from `autobuild` to `manual` build mode with explicit build commands
- Verify the language specified matches the actual source code language

### Automatic Build Failed

**Cause:** `autobuild` could not detect or run the project's build system.

**Solutions:**
- Switch to `build-mode: manual` and provide explicit build commands
- Ensure all build dependencies are installed on the runner
- For C/C++: verify `gcc`, `make`, `cmake`, or `msbuild` are available
- For C#: verify `.NET SDK` or `MSBuild` is installed
- For Java: verify `gradle` or `maven` is installed
- Check the autobuild logs for the specific detection step that failed

### C# Compiler Unexpectedly Failing

**Cause:** The CodeQL tracer injects compiler flags that may conflict with project configuration.

**Details:** CodeQL injects `/p:EmitCompilerGeneratedFiles=true` which can cause issues with:
- Legacy .NET Framework projects
- Projects using `.sqlproj` files

**Solutions:**
- Add `<EmitCompilerGeneratedFiles>false</EmitCompilerGeneratedFiles>` to problematic project files
- Use `build-mode: none` for C# if build accuracy is acceptable
- Exclude problematic projects from the CodeQL analysis

### Analysis Takes Too Long

**Cause:** Large codebase, complex queries, or insufficient resources.

**Solutions:**
- Use `build-mode: none` where accuracy is acceptable (significantly faster)
- Enable dependency caching: `dependency-caching: true`
- Set `timeout-minutes` on the job to prevent hung workflows
- Use `--threads=0` (CLI) to use all available CPU cores
- Reduce query scope: use `default` suite instead of `security-and-quality`
- For self-hosted runners, ensure hardware meets recommendations:
  - Small (<100K LOC): 8 GB RAM, 2 cores
  - Medium (100K–1M LOC): 16 GB RAM, 4–8 cores
  - Large (>1M LOC): 64 GB RAM, 8 cores
- Configure larger GitHub-hosted runners if available
- Use `paths` in config file to limit analyzed directories

### CodeQL Scanned Fewer Lines Than Expected

**Cause:** Build command didn't compile all source files, or `build-mode: none` missed generated code.

**Solutions:**
- Switch from `none` to `autobuild` or `manual` build mode
- Ensure the build command compiles the full codebase (not just a subset)
- Check the code scanning logs for extraction metrics:
  - Lines of code in codebase (baseline)
  - Lines of code extracted
  - Lines excluding auto-generated files
- Verify language detection includes all expected languages

### Kotlin Detected in No-Build Mode

**Cause:** Repository uses `build-mode: none` (Java only) but also contains Kotlin code.

**Solutions:**
- Disable default setup and re-enable it (switches to `autobuild`)
- Or switch to advanced setup with `build-mode: autobuild` for `java-kotlin`
- Kotlin requires a build to be analyzed; `none` mode only works for Java

## Permission and Access Errors

### Error: 403 "Resource not accessible by integration"

**Cause:** `GITHUB_TOKEN` lacks required permissions.

**Solutions:**
- Add explicit permissions to the workflow:
  ```yaml
  permissions:
    security-events: write
    contents: read
    actions: read
  ```
- For Dependabot PRs, use `pull_request_target` instead of `pull_request`
- Verify the repository has GitHub Code Security enabled (for private repos)

### Cannot Enable CodeQL in a Private Repository

**Cause:** GitHub Code Security is not enabled.

**Solution:** Enable GitHub Code Security in repository Settings → Advanced Security.

### Error: "GitHub Code Security or Advanced Security must be enabled"

**Cause:** Attempting to use code scanning on a private repo without the required license.

**Solutions:**
- Enable GitHub Code Security for the repository
- Contact organization admin to enable Advanced Security

## Configuration Errors

### Two CodeQL Workflows Running

**Cause:** Both default setup and a pre-existing `codeql.yml` workflow are active.

**Solutions:**
- Disable default setup if using advanced setup, or
- Delete the old workflow file if using default setup
- Check repository Settings → Advanced Security for active configurations

### Some Languages Not Analyzed

**Cause:** Matrix configuration doesn't include all languages.

**Solutions:**
- Add missing languages to the `matrix.include` array
- Verify language identifiers are correct (e.g., `javascript-typescript` not just `javascript`)
- Check that each language has an appropriate `build-mode`

### Unclear What Triggered a Workflow Run

**Solutions:**
- Check the tool status page in repository Settings → Advanced Security
- Review workflow run logs for trigger event details
- Look at the `on:` triggers in the workflow file

### Error: "is not a .ql file, .qls file, a directory, or a query pack specification"

**Cause:** Invalid query or pack reference in the workflow.

**Solutions:**
- Verify query pack names and versions exist
- Use correct format: `owner/pack-name@version` or `owner/pack-name:path/to/query.ql`
- Run `codeql resolve packs` to verify available packs

## Resource Errors

### "Out of disk" or "Out of memory"

**Cause:** Runner lacks sufficient resources for the analysis.

**Solutions:**
- Use larger GitHub-hosted runners (if available)
- For self-hosted runners, increase RAM and disk (SSD with ≥14 GB)
- Reduce analysis scope with `paths` configuration
- Analyze fewer languages per job
- Use `build-mode: none` to reduce resource usage

### Extraction Errors in Database

**Cause:** Some source files couldn't be processed by the CodeQL extractor.

**Solutions:**
- Check extraction metrics in workflow logs for error counts
- Enable debug logging for detailed extraction diagnostics
- Verify source files are syntactically valid
- Ensure all build dependencies are available

## Logging and Debugging

### Enable Debug Logging

To get more detailed diagnostic information:

**GitHub Actions:**
1. Re-run the workflow with debug logging enabled
2. In the workflow run, click "Re-run jobs" → "Enable debug logging"

**CodeQL CLI:**
```bash
codeql database create my-db \
  --language=javascript-typescript \
  --verbosity=progress++ \
  --logdir=codeql-logs
```

**Verbosity levels:** `errors`, `warnings`, `progress`, `progress+`, `progress++`, `progress+++`

### Code Scanning Log Metrics

Workflow logs include summary metrics:
- **Lines of code in codebase** — baseline before extraction
- **Lines of code in CodeQL database** — extracted including external libraries
- **Lines excluding auto-generated files** — net analyzed code
- **Extraction success/error/warning counts** — per-file extraction results

### Private Registry Diagnostics

For `build-mode: none` with private package registries:
- Check the "Setup proxy for registries" step in workflow logs
- Look for `Credentials loaded for the following registries:` message
- Verify organization-level private registry configuration
- Ensure internet access is available for dependency resolution

## SARIF Upload Errors

### SARIF File Too Large

**Limit:** 10 MB maximum (gzip-compressed).

**Solutions:**
- Focus on the most important query suites (use `default` instead of `security-and-quality`)
- Reduce the number of queries via configuration
- Split analysis into multiple jobs with separate SARIF uploads
- Remove `--sarif-add-file-contents` flag

### SARIF Results Exceed Limits

GitHub enforces limits on SARIF data objects:

| Object | Maximum |
|---|---|
| Runs per file | 20 |
| Results per run | 25,000 |
| Rules per run | 25,000 |
| Tool extensions per run | 100 |
| Thread flow locations per result | 10,000 |
| Location per result | 1,000 |
| Tags per rule | 20 |

**Solutions:**
- Reduce query scope to focus on high-impact rules
- Split analysis across multiple SARIF uploads with different `--sarif-category`
- Disable noisy queries that produce many results

### SARIF File Invalid

**Solutions:**
- Validate against the [Microsoft SARIF validator](https://sarifweb.azurewebsites.net/)
- Ensure `version` is `"2.1.0"` and `$schema` points to the correct schema
- Verify required properties (`runs`, `tool.driver`, `results`) are present

### Upload Rejected: Default Setup Enabled

**Cause:** Cannot upload CodeQL-generated SARIF when default setup is active.

**Solutions:**
- Disable default setup before uploading via CLI/API
- Or switch to using default setup exclusively (no manual uploads)

### Missing Authentication Token

**Solutions:**
- Set `GITHUB_TOKEN` environment variable with `security-events: write` scope
- Or use `--github-auth-stdin` to pipe the token
- For GitHub Actions: the token is automatically available via `${{ secrets.GITHUB_TOKEN }}`
