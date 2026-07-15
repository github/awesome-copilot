$ErrorActionPreference = "Stop"
Set-Location "c:\Users\VMADMIN\Music\awesome-copilot"

$phases = @("requirements","planning","architecture","development","testing","devops","cloud","security","maintenance")

$agentMap = [ordered]@{
  requirements = @("prd.agent.md","specification.agent.md","refine-issue.agent.md")
  planning = @("plan.agent.md","planner.agent.md","task-planner.agent.md","task-researcher.agent.md","implementation-plan.agent.md","research-technical-spike.agent.md")
  architecture = @("api-architect.agent.md","repo-architect.agent.md","project-architecture-planner.agent.md","se-system-architecture-reviewer.agent.md")
  development = @("principal-software-engineer.agent.md","software-engineer-agent-v1.agent.md","address-comments.agent.md")
  testing = @("tdd-red.agent.md","tdd-green.agent.md","tdd-refactor.agent.md","qa-subagent.agent.md","playwright-tester.agent.md","debug.agent.md")
  devops = @("devops-expert.agent.md","se-gitops-ci-specialist.agent.md")
  cloud = @()
  security = @("se-security-reviewer.agent.md","sast-sca-security-analyzer.agent.md")
  maintenance = @("tech-debt-remediation-plan.agent.md","project-documenter.agent.md","technical-content-evaluator.agent.md")
}

$skillMap = [ordered]@{
  requirements = @("prd","create-specification","update-specification","gen-specs-as-issues","create-github-issue-feature-from-specification","create-github-issues-for-unmet-specification-requirements")
  planning = @("create-implementation-plan","update-implementation-plan","create-technical-spike","breakdown-plan","breakdown-feature-prd","create-github-issues-feature-from-implementation-plan")
  architecture = @("architecture-blueprint-generator","context-map","acquire-codebase-knowledge","create-architectural-decision-record")
  development = @("breakdown-feature-implementation","refactor-plan","refactor","review-and-refactor","conventional-branch","conventional-commit","git-flow-branch-creator","git-commit","documentation-writer","create-readme")
  testing = @("breakdown-test","webapp-testing","playwright-generate-test","javascript-typescript-jest","pytest-coverage")
  devops = @("devops-rollout-plan","github-actions-efficiency","github-actions-hardening","github-release")
  cloud = @()
  security = @("security-review","threat-model-analyst","secret-scanning","codeql")
  maintenance = @("incident-postmortem")
}

foreach ($p in $phases) {
  New-Item -ItemType Directory -Force -Path (Join-Path "sdlc-agents" $p) | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path "sdlc-skills" $p) | Out-Null
}

foreach ($phase in $agentMap.Keys) {
  foreach ($name in $agentMap[$phase]) {
    $src = Get-ChildItem "sdlc-agents" -Recurse -File -Filter $name | Select-Object -First 1
    if (-not $src) { throw "Agent not found: $name" }
    $dst = Join-Path (Join-Path "sdlc-agents" $phase) $name
    if ($src.FullName -ne (Join-Path (Get-Location) $dst)) {
      Move-Item -Force -Path $src.FullName -Destination $dst
    }
  }
}

foreach ($phase in $skillMap.Keys) {
  foreach ($name in $skillMap[$phase]) {
    $src = Get-ChildItem "sdlc-skills" -Recurse -Directory | Where-Object { $_.Name -eq $name -and (Test-Path (Join-Path $_.FullName "SKILL.md")) } | Select-Object -First 1
    if (-not $src) { throw "Skill not found: $name" }
    $dstParent = Join-Path "sdlc-skills" $phase
    $dst = Join-Path $dstParent $name
    if ($src.FullName -ne (Join-Path (Get-Location) $dst)) {
      if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
      Move-Item -Force -Path $src.FullName -Destination $dstParent
    }
  }
}

@'
# SDLC Agents

This folder contains SDLC-focused agents organized by lifecycle phase.

## Phase Folders

- requirements
- planning
- architecture
- development
- testing
- devops
- cloud
- security
- maintenance

## Notes

- This is a curated copy from the main agents collection.
- Cloud is currently a placeholder phase with no dedicated agent in this subset.