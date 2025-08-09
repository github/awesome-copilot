
# Caution, Not an Instructions file

-------------------------------

THIS IS NOT AN INSTRUCTIONS FILE.
IT IS FOR HUMANS TO LEARN ABOUT THE DEPENDENCY RISK INSTRUCTION FILES LOCATED IN SAME FOLDER

-------------------------------

## Introduction to dependency risk instruction files

Dependency risk instruction files are designed to provide detailed guidance for Copilot, when in agent mode, on where to get information and how to assess the risks of using a third-party package or library in software development, as well as how to format that information into a standardized dependency risk report in the chat window that is easily scannable and understandable by developers such that they make better informed decisions about dependency consumption.

The goal is to support the following visions:

- “Copilot should help me make healthier choices of dependencies.”
- "Copilot should not suggest to me a fake package that I then try to use."

These instructions are meant to be called when:

1. Copilot is explicitly asked about the riskiness, health, quality, or security posture of a package or library.
2. Copilot suggests a new package or library.

You can learn more about when they are called by reading the tops of the instruction files themselves where this is defined.
The instructions are split into four files to allow for flexibility in ownership and customization of the instructions, which is explained in more detail below in the section titled ["Why not a single file"](#why-not-a-single-file)
What risks are flagged to users is detailed in the section ["Types of dependency risks"](#types-of-dependency-risks)
These instruction files are prototypes and rapid change is expected. You can edit or extend to match your needs or internal policies.

### Disclaimer

These instructions are not exhaustive and do not replace any required compliance processes that you may be required to follow based on writing code for a company or organization. They do not surface all risks, nor is there any guarantee that the information is up-to-date or accurate. Much of the data is sourced from either public metadata repositories, package managers, or GitHub source repository pages, so information in some cases could be manipulated by the package authors or maintainers.

The dependency risk report is meant to provide a quick reference that flags for developers risks identified with metadata that associated with third-party dependencies. It tries to do this at the point when using a package is being first considered
in their IDE (Integrated Development Environment), as this is when switching costs are lowest.

Users are encouraged to leverage the report as a starting point and then visit the suggested links to find more information.

## Why not a single instructions file

The dependency risk instructions are split into four files to allow for instructions to be owned by different parties and then combined. While all the files are local files now, one or more files could be externally defined. While Copilot will normally
not accept externally defined instructions, it will if the user explicitly allows it. Splitting them in this
way allows for both a standardized set of initial default instructions, individual project-specific instructions for some
risks, and company-specific tooling that can evolves over time
**without having to submit pull requests to change every file in every repository one at a time**. For example, the
company-level instructions file might be defined in another GitHub repository or in an MCP.
The files that layer on top of one another are described in more details below.

### Base level instructions file

The basics of where to find package and source repository metadata, how to process it,
and how to structure the dependency risk report is found in the
`dependencyRisk.baseLevel.instructions.md` file. The other dependency risk report
instruction files' instructions layer on top of these base instructions and in some
cases may overrule them or in other cases merely extend.

### Repository-specific instructions file

The `dependencyRisk.repositoryLevel.instructions.md` file is where repository-specific instructions can be placed that reflect an individual project or developer's preferences. Developers might decide a repository should have stricter or looser thresholds compared to another repository based on what that repository is used for and how long it is designed to persist. For example, they might want to shift the threshold for how long ago is the last version update of a package to be 90 days instead of 2 years if they want to increase the probability that the package is still actively maintained on the most critical projects. They might also want to change that threshold to be less strict for NPM packages that are more commonly small feature-complete libraries. Alternatively, they might want different styling than another team to emphasize certain risks or information.

### Company specific instructions file

As a company might provide dependency-related tooling in an MCP or API format or there may be other tools to identify and
reduce risks in dependencies, these instructions can be in the `dependencyRisk.companyLevel.instructions.md` file.

### Central risk instructions file that only points to the others

The `dependencyRisk.instructions.md` file mostly just defines when the instructions files are used and points to
the other three dependency risk report instruction files.

The benefit of this approach is it should
be possible to then have one or more of the other files sit outside the repository. This could allow for the
top-level instructions to be somewhere controlled by a centralized team,
such as an open source programs office (OSPO) or a centralized engineering team.
It could also allow just that 1 of 3 instruction files to be open sourced in a
central location while the other two are private. It also allows the company-level instructions to similarly be
in a centralized location where it can be evolved over time and point to new internal tooling or MCPs without
needing to make any pull requests to change files in a repository. You could even have that company instructions
files just tell Copilot to use a suite of tools in a company specific MCP.

## Problems and limitations this approach is solving for

#### Problems: Developer behavior

- Developers often choose dependencies based on popularity or convenience rather than health, security, and quality.
- Developers have reported using packages that Copilot suggests without additional checking if they exist or are risky.

#### Answer: Developer behavior

- The dependency risk report will pop up without being asked for explicitly but rather than Copilot is suggesting a package or the user is asking Copilot about a package.
- Increase chance dependency risks are considered by not requiring the developer to leave their IDE (Integrated Development Environment)
- Shrink time to check for a collection of dependency risks goes from 10-30 minutes to 0.5-2 minutes.

#### Problem: Staleness of instruction files

- Instructions files can become stale or inconsistent between repositories over time. A developer might copy
and paste an instructions file once and then never update it even as the centrally provided instructions
for dependency risk reports continues to evolve and change over time in its own repository. This is a
repeating problem in any file that exists in many repositories.
- Additionally, it is reasonable to expect more MCP tools to be available over time, including those that deal
with dependencies and compliance. Ideally, the instruction files for dependency risks would assume they would
exist in the future and not become obsolete when they do exist.

#### Answer: Staleness of instruction files

- As the instructions are split across several different files that are layered, it opens up the possibility
  for one or more of those instruction files to site in an external file or a MCP tool instead of every
  individual repository. If the company-level instructions file is defined in an internal MCP endpoint, then it can be managed and changed by a central team without changes requiring a pull request into however many
  repositories use the file.

#### Problem: Usage of external instructions requires user interaction

- If you put a link to an external instructions file in a Copilot instructions file, Copilot will say it can
  not access instructions at an external link when you try to use that instructions file.

#### Answer: Usage of external instruction requires user interaction

- This problem can be resolved by having the local instructions file include instructions for Copilot to ask the
  user for permissions to fetch the instructions at the external link. Because the user then has knowledge of
  where Copilot is getting instructions from, Copilot can then fetch and follow the instructions.

#### Problem: I expect my company will have a MCP for dependency compliance in future so do not want to do anything in this space right now

- It can be nerve wracking to get started with this sort of approach if you expected other teams or products to eventually come out with MCP tools that address some of these risks. You might not want to start doing anything in this space.

#### Answer: I expect my company will have a MCP for dependency compliance in future so do not want to do anything in this space right now

- If you use a company-level instructions file that is defined in an MCP or a publicly accessibly GitHub repository, you can later make changes to that single file instead of having to make pull requests to every repository using this approach.

## Types of dependency risks

It can be helpful to think of dependency risks in terms of two classes of risks, continuous and binary.

### Types of dependency risk considered by the dependency risk report

| Risk Class    | Risk                      | Definition                                                                 | Factors Considered in Report                                                                                 |
|---------------|---------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| Binary        | Vulnerability             | Whether known security vulnerabilities are associated with the dependency.        | Public vulnerability databases reflected in ecosyste.ms. and sometimes vulnerability information on source repository in GitHub. Use other tools for full assessment.                        |
| Binary        | License                   | Finds license of the package.            | As presence of a quickly identifiable license is all this checks for, other tooling should be used for actual license compliance. Does not cover multiple licenses, modified licenses, whether copyleft license, tell you what licenses require extra steps, etc.               |
| Binary        | Malicious                 | Theoretically flags if the package is known or suspected to be malicious.                 | Depends on company instructions file tooling or does not provide any advice.  Use other tools for full assessment.         |
| Continuous    | Possibly abandoned        | Assesses if the dependency appears to be no longer maintained.              | Time since last commit or release, lack of recent activity, source repository is archived, etc..               |
| Continuous    | Not enough eyeballs       | Evaluates if there are too few contributors or reviewers to catch issues.   | Number of downloads, number of dependent repositories.                   |
| Continuous    | Contribution could stop suddenly | Considers the risk that development may halt unexpectedly.           | Reliance on a single maintainer, Number of contributors is small, Only single version published, Few commits recently, etc.  |
| Continuous    | Poor security posture     | Assesses the overall security practices and responsiveness of the project.  | Presence of security policy, Low OpenSSF Scorecard score, uses a dangerous GitHub Action workflow pattern, etc. Note that not all packages will have pre-existing scans by OpenSSF Scorecard |

**Use other tooling to assess the risk of license complications, malicious code, and security vulnerabilities as the dependency risk report generated is not exhaustive!** It may still be useful to you if it flags a risk earlier than your
other tooling that flags one of these risks at pull request time or at build time. Company or paid tooling to
asses continuous risks may also be available but is less common.

#### What parts of continuous risk can be assessed well with metadata alone?

Continuous risks can be thought of as including sustainability risks, quality risks, and security posture risks.
Sustainability risks can include "Possibly abandoned", "Not enough eyeballs to spot bugs", and "Contribution could stop suddenly". Sustainability risks are often possible to identify with package and source repository metadata publicly
available in 2025 whereas quality risks and security posture risks often require manual evaluation of the source code or
additional scans of the source code itself to assess well.

### Differences Between Binary and Continuous Risks

| Risk Class  | Definition                                                                 | Impact Felt At Company-Scale or Individual Team | Impact Types                        | Fits Into Compliance or Risk-Reduction Framework         | Often Modified By What Instructions File                |
|-------------|----------------------------------------------------------------------------|------------------------------------------------|-------------------------------------|---------------------------------------------------------|--------------------------------------------------------|
| Binary      | Risks that are either present or not, with clear yes/no answers.            | Company-scale (often enforced organization-wide) | $, reputation, trust                | Typically fits into compliance frameworks (e.g., license, vulnerabilities) | Company-specific instructions file (`dependencyRisk.companyLevel.instructions.md`) |
| Continuous  | Risks that exist on a spectrum and require judgment or thresholds.          | Individual team (context-specific, flexible)    | unplanned for developer time        | Often fits into risk-reduction frameworks (e.g., maintenance, community health) | Repository-specific instructions file (`dependencyRisk.repositoryLevel.instructions.md`) |

Binary risks are either present or not, with clear yes/no answers, which makes them fit well into compliance frameworks
and compliance tooling that can be deployed across an entire organization with the same thresholds and rules.
Continuous risks in contrast are risks that tend to exist on a continuous spectrum of risks AND different projects
can reasonably have different thresholds for what is acceptable risk.

## Deciding not to use a package is only one way to reduce risk

The dependency report generated by these instructions files targets the point in time before any code is written
with a given dependency, which is the point of lowest switching cost. It largely targets the decision to use a
package or not.

However, there are many risks that can appear after a package is already in use
and not using a package is only one possible action. The table below summarizes,
at a very high level, common actions that can be taken at various points in the development process.

| Action                                                                 | When                                                      | Keep Using Dependency?     |
|------------------------------------------------------------------------|-----------------------------------------------------------|-----------------|
| Use a different package with lower risk.                                | Before writing code, PR time, or during usage                                        | No              |
| Decide not to use a package at all and write code.                                    | Before writing code, PR time, or during usage                                          | No              |
| Use a different version with no known vulnerabilities.                      | Before writing code, PR time, or during usage                                      | Yes             |
| Recommend others not start using a risky package already in use to eventually reduce aggregate usage without having to ban a dependency outright.   | Before first usage on individual repositories                           | Yes (for self), No (for others) |
| Sponsor a package to reduce sustainability, quality, or security risks. | During usage                            | Yes             |
| Upstream contributions to improve quality, security, or sustainability risks. | During usage                            | Yes             |

## Example dependency risk report

The following is an example of a dependency risk report generated by these instructions files.
As the instructions evolve, the report may change to reflect new requirements or formatting guidelines.
Each of the files has a version number in the header.

-------------------------------

### Dependency risk report chat record for python package welly

**Conversation Record**

**User:**
Tell me about the community health and security of python package welly

**Copilot:**
Here is a detailed dependency risk report for the Python package welly (latest version: 0.5.2, PyPI):

--

**Indicators of risk: POSSIBLY ABANDONED**

- ✅ The package itself is deprecated: No
- ✅ The source repository is archived: No  
  <https://github.com/agilescientific/welly>
- ❌ The latest version of package was published more than 2 years ago: Yes (2022-02-28)

**Indicators of risk: NOT ENOUGH EYEBALLS TO SPOT PROBLEMS**

- ⚠️ Number of dependent repositories is <500: Yes (29)
- ⚠️ Number of package downloads <10,000: Yes (1,273 last month)

**Indicators of risk: CONTRIBUTION COULD STOP SUDDENLY**

- ✅ Package created at date is < 90 days before today: No (created 2015-11-09)
- ✅ Development distribution score (DDS) is < 0.15: No (0.53)
- ✅ Number of contributors is < 4: No (18 contributors)
- ✅ Number of package maintainers is <2: No (2 maintainers)
- ✅ Only a single version of the package has ever been published: No (25 versions published)
- ✅ There have been <3 commits in the past 365 days: No (many commits, including July 2025)
- ✅ All the commits in past 365 days are from 1 person: No (multiple contributors)
- Pull request page:  
  <https://github.com/agilescientific/welly/pulls>  
  Follow this link to see if pull requests get responses.

**Indicators of risk: POOR SECURITY POSTURE**

- ❔ The repository has a poor security posture based on an overall OpenSSF scorecard score of less than 5: Not found (scorecard API returned invalid URL)
- ❔ The repository has no indications of code review based on scorecard.dev "code-Review" score of less than 5: Not found
- ❔ The repository has a dangerous GitHub Actions workflow pattern based on scorecard.dev "Dangerous-Workflow" score of less than 5: Not found

**Indicators of risk: SECURITY VULNERABILITIES**

- ✅ There are any known vulnerabilities for any version of the package: No (no advisories found)
- Latest version of package: 0.5.2

**Indicators of risk: MALICIOUS CODE**

- ❔ nothing in this report checks for malicious code and you should use other tooling for that risk.

**Indicators of risk: LICENSE COMPLICATIONS**

- License detected: Apache-2.0 (detected only; may not catch multiple licenses or compliance requirements)

-------------------------------

**Summary of triggered risks**

- ❌ Latest version is more than 2 years old (2022-02-28)
- ⚠️ Number of dependent repositories is low (29)
- ⚠️ Number of downloads is low (1,273 last month)

**Key links**

- Ecosyte.ms:  
  <https://packages.ecosyste.ms/api/v1/registries/pypi.org/packages/welly>
- Source repository on GitHub:  
  <https://github.com/agilescientific/welly>
- Contributors graph:  
  <https://github.com/agilescientific/welly/graphs/contributors>
- Pull request page:  
  <https://github.com/agilescientific/welly/pulls>
- Commits over time:  
  <https://github.com/agilescientific/welly/commits>
- OpenSSF scorecard (API):  
  <https://api.scorecard.dev/projects/github.com/agilescientific/welly>

---

Please confirm this information via the provided webpage links and understand users can provide fake information, especially via README or description so be careful with those sources.

This report is not exhaustive and is not a substitute for actual compliance processes you may be required to follow.

---

**Package name:** welly
**Package type:** pypi  
**Latest version considered:** 0.5.2

**Instruction file versions used:**

- dependencyRisk.baseLevel.instructions.md: 0.0.18
- dependencyRisk.companyLevel.instructions.md: 0.0.9
- dependencyRisk.repositoryLevel.instructions.md: 0.0.5
- dependencyRisk.instructions.md: 0.0.4

<!-- Version 0.0.3g -->
