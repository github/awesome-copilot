# MCP evidence map for estimation

Every figure in an estimate is either a platform fact or a human input. This file draws the line. Tag every line of the output with which side it came from.

## Platform side - what the MCP actually returns

| Estimation input | Tool | What it gives you | Trap |
|---|---|---|---|
| Cycle window | `find_iterations` | sprint/iteration start and end | Calendar days, not working days. Subtract holidays yourself |
| Uncovered requirements | `fetch_requirement_data` | coverage status per requirement | "Covered" means linked, not passing. A linked-but-never-run requirement still costs execution time |
| Case counts | `find_test_cases`, `read_test_suite`, `find_test_cases_by_requirement` | the cases in a folder, suite, or requirement link | Check for pagination. A truncated page reported as a total silently shrinks the estimate |
| Automated / manual split | `fetch_test_case_data` | quality signals including the split when exposed | Not guaranteed present. If absent, ask, and tag it team-supplied |
| Failure and flake burden | `fetch_test_stability_data`, `find_test_results` | unstable cases, recent pass and fail history | A flaky case inflates the failing count without being a defect. Drive `P`, not `M`, with it |
| Configuration matrix | `fetch_test_configuration_data` | which environments, browsers, and devices are covered against the target set | The multiplier applies per lane. Automated may cover three configurations while manual covers one |
| Past automated elapsed time | `read_execution`, `read_execution_test_results` | a finished execution's records, including machine-recorded elapsed time | **Confirm the field is on the record before modelling on it.** Version and runner dependent. If it is absent, ask for the figure |
| Comparable cycle for calibration | `read_execution` on a named past execution | one sample | It is n=1. There is no aggregate-across-cycles tool. Say n=1 in the confidence basis |

Discovery first, always: `list_projects` then `list_repositories`, exactly as `katalon-test-plan` does.

## Human side - the checklist

None of these exist in the platform. Ask for all of them that the chosen buckets need, and record who supplied each and when it was last measured.

- Manual execution minutes per case (median, not mean - a few long cases skew the mean)
- Design minutes per new case
- New cases per uncovered requirement
- Triage minutes per failing result
- Automation authoring hours per case, if bucket D is in scope
- Productive hours per tester per day
- Number of testers available, and any part-time fractions
- Working days lost to holidays or PTO inside the window
- Fixed-overhead percentage
- Session concurrency for the automated lane
- Repeat-pass factor, if a configuration is being run a second time
- Any cost rate, if the answer must be in money

## Rate source ranking

1. **Measured in this project on a comparable cycle within 90 days.** The only source that supports High confidence.
2. **Team declaration.** Medium. Ask what it is based on; a number someone remembers is weaker than one someone tracked.
3. **A different project, or an older cycle.** Medium, and say which project.
4. **An industry default.** Low. Print it as a placeholder, name it as a placeholder, and ask for a real measurement.

## Things the platform cannot hold

- **No effort field.** Nothing books time against a case, run, or person.
- **No roster or capacity.** No team members, FTE fractions, PTO, or working calendar.
- **No cost model.** No rates, currency, license consumption, or TestCloud minute pricing.
- **No place to store the estimate.** No estimated-effort field on a case, folder, suite, or requirement, and per `unavailable-capabilities.md` no Test Plan, Release, or Build entity to attach one to. Record it in the plan suite's description or the linked Jira/Azure issue, and hand off to `katalon-test-plan`.
- **No cross-cycle aggregate.** Result and execution tools are record-level. Trending across releases belongs to a reporting skill that does not exist yet - state the boundary rather than assembling a trend from single reads and presenting it as one.

## Things that look like MCP facts and are not

- **Session concurrency.** `list_test_cloud_environments` lists environments; `find_execution_profiles` lists profiles. Neither returns how many sessions run at once.
- **A manual run's duration.** Open and close timestamps are calendar elapsed. A run left open over a weekend is not a weekend of work.
- **Production traffic, change frequency, and defect rates.** Not returned by any tool. If the human supplies them from TrueTest Test Gap Analysis, an analytics product, or Jira, use them and cite the source - the same rule `katalon-test-plan` already applies.
