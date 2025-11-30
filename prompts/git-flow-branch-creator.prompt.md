---
description: 'Intelligent Git Flow branch creator that analyzes git status/diff and creates appropriate branches following the nvie Git Flow branching model.'
tools: ['runCommands/runInTerminal', 'runCommands/getTerminalOutput']
agent: 'agent'
---

### Instructions

```xml
<instructions>
	<title>Git Flow Branch Creator</title>
	<description>This prompt analyzes your current git changes using git status and git diff (or git diff --cached), then intelligently determines the appropriate branch type according to the Git Flow branching model and creates a semantic branch name.</description>
	<note>
		Just run this prompt and Copilot will analyze your changes and create the appropriate Git Flow branch for you.
	</note>
</instructions>
```

### Workflow

**Follow these steps:**

1. Run `git status` to review the current repository state and changed files.
2. Run `git diff` (for unstaged changes) or `git diff --cached` (for staged changes) to analyze the nature of changes.
3. Analyze the changes using the Git Flow Branch Analysis Framework below.
4. Determine the appropriate branch type based on the analysis.
5. Generate a semantic branch name following Git Flow conventions.
6. Create the branch and switch to it automatically.
7. Provide a summary of the analysis and next steps.

### Git Flow Branch Analysis Framework

```xml
<analysis-framework>
	<branch-types>
		<feature>
			<purpose>New features, enhancements, non-critical improvements</purpose>
			<branch-from>develop</branch-from>
			<merge-to>develop</merge-to>
			<naming>feature/descriptive-name or feature/ticket-number-description</naming>
			<indicators>
				<indicator>New functionality being added</indicator>
				<indicator>UI/UX improvements</indicator>
				<indicator>New API endpoints or methods</indicator>
				<indicator>Database schema additions (non-breaking)</indicator>
				<indicator>New configuration options</indicator>
				<indicator>Performance improvements (non-critical)</indicator>
			</indicators>
		</feature>

		<release>
			<purpose>Release preparation, version bumps, final testing</purpose>
			<branch-from>develop</branch-from>
			<merge-to>develop AND master</merge-to>
			<naming>release-X.Y.Z</naming>
			<indicators>
				<indicator>Version number changes</indicator>
				<indicator>Build configuration updates</indicator>
				<indicator>Documentation finalization</indicator>
				<indicator>Minor bug fixes before release</indicator>
				<indicator>Release notes updates</indicator>
				<indicator>Dependency version locks</indicator>
			</indicators>
		</release>

		<hotfix>
			<purpose>Critical production bug fixes requiring immediate deployment</purpose>
			<branch-from>master</branch-from>
			<merge-to>develop AND master</merge-to>
			<naming>hotfix-X.Y.Z or hotfix/critical-issue-description</naming>
			<indicators>
				<indicator>Security vulnerability fixes</indicator>
				<indicator>Critical production bugs</indicator>
				<indicator>Data corruption fixes</indicator>
				<indicator>Service outage resolution</indicator>
				<indicator>Emergency configuration changes</indicator>
			</indicators>
		</hotfix>
	</branch-types>
</analysis-framework>
```

### Branch Naming Conventions

```xml
<naming-conventions>
	<feature-branches>
		<format>feature/[ticket-number-]descriptive-name</format>
		<examples>
			<example>feature/user-authentication</example>
			<example>feature/PROJ-123-shopping-cart</example>
			<example>feature/api-rate-limiting</example>
			<example>feature/dashboard-redesign</example>
		</examples>
	</feature-branches>

	<release-branches>
		<format>release-X.Y.Z</format>
		<examples>
			<example>release-1.2.0</example>
			<example>release-2.1.0</example>
			<example>release-1.0.0</example>
		</examples>
	</release-branches>

	<hotfix-branches>
		<format>hotfix-X.Y.Z OR hotfix/critical-description</format>
		<examples>
			<example>hotfix-1.2.1</example>
			<example>hotfix/security-patch</example>
			<example>hotfix/payment-gateway-fix</example>
			<example>hotfix-2.1.1</example>
		</examples>
	</hotfix-branches>
</naming-conventions>
```

### Analysis Process

```xml
<analysis-process>
	<step-1>
		<title>Change Nature Analysis</title>
		<description>Examine the types of files modified and the nature of changes</description>
		<criteria>
			<files-modified>Look at file extensions, directory structure, and purpose</files-modified>
			<change-scope>Determine if changes are additive, corrective, or preparatory</change-scope>
			<urgency-level>Assess if changes address critical issues or are developmental</urgency-level>
		</criteria>
	</step-1>

	<step-2>
		<title>Git Flow Classification</title>
		<description>Map the changes to appropriate Git Flow branch type</description>
		<decision-tree>
			<question>Are these critical fixes for production issues?</question>
			<if-yes>Consider hotfix branch</if-yes>
			<if-no>
				<question>Are these release preparation changes (version bumps, final tweaks)?</question>
				<if-yes>Consider release branch</if-yes>
				<if-no>Default to feature branch</if-no>
			</if-no>
		</decision-tree>
	</step-2>

	<step-3>
		<title>Branch Name Generation</title>
		<description>Create semantic, descriptive branch name</description>
		<guidelines>
			<use-kebab-case>Use lowercase with hyphens</use-kebab-case>
			<be-descriptive>Name should clearly indicate the purpose</be-descriptive>
			<include-context>Add ticket numbers or project context when available</include-context>
			<keep-concise>Avoid overly long names</keep-concise>
		</guidelines>
	</step-3>
</analysis-process>
```

### Edge Cases and Validation

```xml
<edge-cases>
	<mixed-changes>
		<scenario>Changes include both features and bug fixes</scenario>
		<resolution>Prioritize the most significant change type or suggest splitting into multiple branches</resolution>
	</mixed-changes>

	<no-changes>
		<scenario>No changes detected in git status/diff</scenario>
		<resolution>Inform user and suggest checking git status or making changes first</resolution>
	</no-changes>

	<existing-branch>
		<scenario>Already on a feature/hotfix/release branch</scenario>
		<resolution>Analyze if new branch is needed or if current branch is appropriate</resolution>
	</existing-branch>

	<conflicting-names>
		<scenario>Suggested branch name already exists</scenario>
		<resolution>Append incremental suffix or suggest alternative name</resolution>
	</conflicting-names>
</edge-cases>
```

### Examples

```xml
<examples>
	<example-1>
		<scenario>Added new user registration API endpoint</scenario>
		<analysis>New functionality, additive changes, not critical</analysis>
		<branch-type>feature</branch-type>
		<branch-name>feature/user-registration-api</branch-name>
		<command>git checkout -b feature/user-registration-api develop</command>
	</example-1>

	<example-2>
		<scenario>Fixed critical security vulnerability in authentication</scenario>
		<analysis>Security fix, critical for production, immediate deployment needed</analysis>
		<branch-type>hotfix</branch-type>
		<branch-name>hotfix/auth-security-patch</branch-name>
		<command>git checkout -b hotfix/auth-security-patch master</command>
	</example-2>

	<example-3>
		<scenario>Updated version to 2.1.0 and finalized release notes</scenario>
		<analysis>Release preparation, version bump, documentation</analysis>
		<branch-type>release</branch-type>
		<branch-name>release-2.1.0</branch-name>
		<command>git checkout -b release-2.1.0 develop</command>
	</example-3>

	<example-4>
		<scenario>Improved database query performance and updated caching</scenario>
		<analysis>Performance improvement, non-critical enhancement</analysis>
		<branch-type>feature</branch-type>
		<branch-name>feature/database-performance-optimization</branch-name>
		<command>git checkout -b feature/database-performance-optimization develop</command>
	</example-4>
</examples>
```

### Validation Checklist

```xml
<validation>
	<pre-analysis>
		<check>Repository is in a clean state (no uncommitted changes that would conflict)</check>
		<check>Current branch is appropriate starting point (develop for features/releases, master for hotfixes)</check>
		<check>Remote repository is up to date</check>
	</pre-analysis>

	<analysis-quality>
		<check>Change analysis covers all modified files</check>
		<check>Branch type selection follows Git Flow principles</check>
		<check>Branch name is semantic and follows conventions</check>
		<check>Edge cases are considered and handled</check>
	</analysis-quality>

	<execution-safety>
		<check>Target branch (develop/master) exists and is accessible</check>
		<check>Proposed branch name doesn't conflict with existing branches</check>
		<check>User has appropriate permissions to create branches</check>
	</execution-safety>
</validation>
```

### Final Execution

```xml
<execution-protocol>
	<analysis-summary>
		<git-status>Output of git status command</git-status>
		<git-diff>Relevant portions of git diff output</git-diff>
		<change-analysis>Detailed analysis of what changes represent</change-analysis>
		<branch-decision>Explanation of why specific branch type was chosen</branch-decision>
	</analysis-summary>

	<branch-creation>
		<command>git checkout -b [branch-name] [source-branch]</command>
		<confirmation>Verify branch creation and current branch status</confirmation>
		<next-steps>Provide guidance on next actions (commit changes, push branch, etc.)</next-steps>
	</branch-creation>

	<fallback-options>
		<alternative-names>Suggest 2-3 alternative branch names if primary suggestion isn't suitable</alternative-names>
		<manual-override>Allow user to specify different branch type if analysis seems incorrect</manual-override>
	</fallback-options>
</execution-protocol>
```

### Git Flow Reference

```xml
<gitflow-reference>
	<main-branches>
		<master>Production-ready code, every commit is a release</master>
		<develop>Integration branch for features, latest development changes</develop>
	</main-branches>

	<supporting-branches>
		<feature>Branch from develop, merge back to develop</feature>
		<release>Branch from develop, merge to both develop and master</release>
		<hotfix>Branch from master, merge to both develop and master</hotfix>
	</supporting-branches>

	<merge-strategy>
		<flag>Always use --no-ff flag to preserve branch history</flag>
		<tagging>Tag releases on master branch</tagging>
		<cleanup>Delete branches after successful merge</cleanup>
	</merge-strategy>
</gitflow-reference>
```
