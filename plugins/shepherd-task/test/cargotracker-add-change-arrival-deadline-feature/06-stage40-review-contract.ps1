# shepherd-task-version: 1.0.4
<#
.SYNOPSIS
    Verifies stage-40 reviewer and stage-25 finalization contracts.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' '..' '..')
)
$skillDirectory = Join-Path $repoRoot 'skills\shepherd-task-40-from-ready-to-merged-to-base'
$stage25Path = Join-Path $repoRoot 'plugins\shepherd-task\scripts\shepherd-task-25-given-list.ps1'
$skill = @(
    Get-ChildItem -LiteralPath $skillDirectory -Recurse -File -Filter *.md |
        Sort-Object FullName |
        ForEach-Object { [System.IO.File]::ReadAllText($_.FullName) }
) -join [Environment]::NewLine
$stage25 = Get-Content -LiteralPath $stage25Path -Raw

$requiredSkillText = @(
    '--add-reviewer "@copilot"',
    'if GH_PR_EDIT_HELP=$(gh pr edit --help 2>&1); then',
    'GH_PR_EDIT_HELP_STATUS=$?',
    'case "$GH_PR_EDIT_HELP" in',
    "*'@copilot'*)",
    'gh path:',
    '$helpOutput = @(gh pr edit --help 2>&1)',
    '$ghExitCode = $LASTEXITCODE',
    'if ($ghExitCode -ne 0)',
    '$helpOutput | Select-String -SimpleMatch ''@copilot''',
    'copilot-pull-request-reviewer(\\[bot\\])?',
    'gh pr ready "$PR_NUMBER" -R "$REPO" --undo',
    'DETERMINISTIC_REQUEST_ERROR',
    'REPO_OWNER=${REPO%%/*}',
    'REPO_NAME=${REPO#*/}',
    '-F owner="$REPO_OWNER"',
    '-F name="$REPO_NAME"',
    'query($owner: String!, $name: String!, $number: Int!)',
    'repository(owner: $owner, name: $name)',
    'if [ "$BASE_BRANCH" = "main" ]; then',
    'if [ "$ACTUAL_BASE" != "$BASE_BRANCH" ]; then',
    'ERROR: Could not set PR base to'
)
foreach ($required in $requiredSkillText) {
    if (-not $skill.Contains($required)) {
        throw "Stage-40 skill is missing required review contract text: $required"
    }
}
if ($skill.Contains('repository(owner: "github", name: "copilot-sdk")')) {
    throw 'Stage-40 skill hard-codes the GraphQL repository lookup.'
}
if ($skill.Contains('if [ "$ACTUAL_BASE" = "main" ]; then')) {
    throw 'Stage-40 skill only checks for a literal main base instead of the requested base.'
}
if ($skill.Contains('--add-reviewer Copilot')) {
    throw 'Stage-40 skill still requests Copilot as an ordinary login.'
}
if ($skill -match 'gh pr edit --help\s*\|\s*grep\s+-Fq') {
    throw 'Stage-40 skill still uses an early-closing Bash grep pipeline for capability detection.'
}
if ($skill -match 'gh pr edit --help\s*\|\s*Select-String') {
    throw 'Stage-40 skill still transforms native help output before capturing its exit code.'
}

$manifestFinalization = $stage25.IndexOf('$runManifest.completedAt')
$postMortemInvocation = $stage25.IndexOf('if (-not $postMortemInvoked)')
if ($manifestFinalization -lt 0 -or
    $postMortemInvocation -lt 0 -or
    $manifestFinalization -gt $postMortemInvocation) {
    throw 'PowerShell stage 25 does not finalize its run manifest before post-mortem generation.'
}

$requiredStage25Text = @(
    '[shepherd-task] Stage 50: Generating campaign post-mortem...',
    '[shepherd-task] Stage 50 report:',
    '[shepherd-task] Stage 50 session:',
    '[shepherd-task] Stage 50 events:',
    '[shepherd-task] Stage 50 prompt:',
    '[shepherd-task] Stage 50 COMPLETE: Post-mortem created:',
    '- OUTPUT_FILE: $postMortemPath'
)
foreach ($required in $requiredStage25Text) {
    if (-not $stage25.Contains($required)) {
        throw "PowerShell stage 25 is missing required post-mortem logging text: $required"
    }
}

Write-Host 'Stage-40 PowerShell contract tests passed.' -ForegroundColor Green
