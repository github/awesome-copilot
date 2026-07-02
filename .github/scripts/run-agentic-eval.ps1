# Stub runner: try known paths for an agentic-eval runner; fall back to skill validate
$repoRoot = (Resolve-Path "..\..").Path
Write-Output "Repo root: $repoRoot"

$pyRunner = Join-Path $repoRoot "skills\agentic-eval\scripts\run.py"
$nodeRunner = Join-Path $repoRoot "eng\run-agentic-eval.mjs"

if (Test-Path $pyRunner) {
  Write-Output "Found Python runner: $pyRunner. Executing..."
  python $pyRunner
  exit $LASTEXITCODE
} elseif (Test-Path $nodeRunner) {
  Write-Output "Found Node runner: $nodeRunner. Executing..."
  node $nodeRunner
  exit $LASTEXITCODE
} else {
  Write-Output "No agentic-eval runner found. Falling back to skill:validate (already run in workflow)."
  Write-Output "This workflow is a draft/stub. Implement agentic-eval runner under skills/agentic-eval/scripts or eng/ to enable full evaluation."
  exit 0
}
