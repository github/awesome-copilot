---
name: katalon-test-case-to-katalon-studio
description: Convert Katalon True Platform/TestOps manual test cases into Katalon Studio automation inside a local Studio Test Project checkout. Use when you need to author or extend a .tc test case file and its paired Groovy script under Scripts/, keep test case variable GUIDs consistent with the .ts test suite bindings that read them, model page elements as .rs test objects in the Object Repository instead of inline selectors, write WebUI, Mobile, or WS keyword steps in Groovy with Java interop, or wire data files, execution profiles, and GlobalVariable into a generated case. Also use to decide whether a headless katalonc run is possible at all, since Katalon Runtime Engine is a separately licensed paid runtime whose CLI requires -apiKey. Once a Studio run has finished and its report exists, hand off to katalon-upload-report. Written for the automation tester who has to land a manual case inside a Katalon Studio project rather than a code-first framework.
---

# Katalon Test Case To Katalon Studio

Use this skill to turn Katalon Platform/TestOps manual test cases into Katalon Studio automation: `.tc` metadata, the paired Groovy script, Object Repository test objects, and the test suite that binds data to them. Prefer the conventions the target project already uses. Treat the human as a tool: ask concise questions whenever a project path, credential, selector, or test data value cannot be discovered safely.

## Availability Boundary

State the boundary before promising automation. It has three parts and none of them is optional.

**Available through Katalon MCP**

- Resolve context with `list_projects` and `list_repositories`.
- Read the source case with `find_test_cases` and `read_test_case`; resolve a requirement key with `find_requirements`, `read_requirement`, and `find_test_cases_by_requirement`.
- Read platform-side suites with `find_test_suites` and `read_test_suite`.
- Write the generated Studio path back onto the platform case with `update_test_case`, for traceability.

**Not available through Katalon MCP**

- No MCP tool reads or writes a Studio project file. `.prj`, `.tc`, `.rs`, `.ts`, `.glbl`, `.dat`, and everything under `Scripts/` live on disk only. Work on a local checkout and ask the human for the path.
- No MCP tool captures web objects. Web Spy and Record are Studio desktop features; write `.rs` files by hand.
- No MCP tool inspects the live application. Use Browser/Playwright to discover selectors, then encode them as test objects.
- No MCP tool runs anything. `katalonc` is a local command.
- No MCP tool uploads a Studio report. That is `katalon-upload-report`.
- No MCP tool parses or validates a generated `.tc`, `.ts`, or `.rs`. Studio is the only parser, so this skill verifies XML well-formedness and GUID consistency and reports what stays unverified.

**Command-line execution is a paid licence, and this is the part people get wrong**

Katalon Studio's desktop IDE authors and runs a test case interactively. Running the same suite from a terminal or a pipeline is a different, separately licensed product: **Katalon Runtime Engine**. `katalonc -runMode=console` lists `-apiKey` among its required arguments and will not execute without an activated KRE licence, and a floating KRE licence allows one active session at a time.

So everything this skill generates is usable by a reader on the free Studio tier, and none of it runs headlessly for them. Say that before promising a CI story. Never imply the generated files are pipeline-ready without the licence.

Report flag, version-dependent: `-report.folderPath` is available from Katalon Studio 11.1.2 and is the current flag. `-reportFolder` is deprecated from 11.1.2, still accepted, and can produce reports with missing test-suite-collection and test-suite folder names. Emit `-report.folderPath` unless the project is pinned below 11.1.2, and say which you chose.

## Workflow

```text
+-------------------+ --> +-------------------+ --> +---------------------+
| Resolve Katalon   |     | Read test cases   |     | Resolve project     |
+-------------------+     +-------------------+     +---------------------+
                                                           |
                                                           v
+-------------------+ <-- +-------------------+ <-- +---------------------+
| Verify pairings   |     | Write .tc + .rs   |     | Map manual steps    |
|                   |     | + script + suite  |     | to keywords         |
+-------------------+     +-------------------+     +---------------------+
```

## Katalon Source

Resolve the Katalon context before writing files:

- Use Katalon MCP tools to list projects and repositories, find test suites, find test cases, and read each selected case.
- If the user gives a test suite, read the suite and every included case before generating anything.
- If the user gives requirement keys, find requirement-linked cases first.
- If MCP tools are unavailable or authentication fails, ask for exported cases, case URLs, case keys, or the case text.
- Preserve traceability in both directions: put the platform case key in the `.tc` `<description>` and `<tag>`, and write the generated `Test Cases/...` path back onto the platform case with `update_test_case`.

Extract for each case: title, priority, requirement links, folder, preconditions, test data, manual steps, expected results, AUT URL, roles and accounts, environment, browser or device assumptions, and cleanup. Flag ambiguous selectors and business data that need human input.

## Project Resolution

Inspect the workspace before creating anything:

- Search for `*.prj` at a directory root, plus the sibling folders `Test Cases/`, `Scripts/`, `Object Repository/`, `Test Suites/`, `Keywords/`, `Profiles/`, `Data Files/`, `Include/`, `Libs/`, and `settings/`. A `.prj` with those siblings is a Studio Test Project.
- If a project exists, summarise the detected path, its folder conventions, its existing test objects, and the files you intend to add, then ask the user to confirm before writing.
- If several projects exist, ask which one.
- If none exists, ask whether the user has a repository or path to use. Creating a Studio project from scratch outside the Studio IDE is possible but brittle; prefer an existing project or one created once in Studio.
- Never write into `Libs/`. `Libs/internal/GlobalVariable.groovy` is generated by Studio from `Profiles/*.glbl` and carries a do-not-modify banner. Edit the `.glbl` instead.
- `Reports/` is build output and is git-ignored in Katalon's own sample projects. Do not commit it.

Read `references/studio-project-anatomy.md` before writing any file. Read `references/groovy-authoring.md` before writing script or custom keyword code.

## The Two Pairings

A Katalon Studio test case is two files, and a data-driven suite adds a third relationship. All three are silent when broken: nothing raises an error, and the run continues on defaults.

**1. `.tc` to its script, paired by folder path.**

```text
Test Cases/Authentication/TC-1042 Login.tc
Scripts/Authentication/TC-1042 Login/Script1754870400000.groovy
```

`Scripts/` mirrors the `Test Cases/` relative path, then adds a folder named exactly after the case, holding exactly one `Script*.groovy`. The number is an epoch-millis stamp and nothing references it. Rename or move the `.tc` without moving that folder and Studio sees a case with no steps.

**2. `.ts` to the `.tc`, paired by project-relative path.** The suite's `<testCaseId>` is the path with no extension, for example `Test Cases/Authentication/TC-1042 Login`.

**3. `.ts` variable bindings to `.tc` variables, paired by GUID.** Each `<variable>` in the `.tc` carries an `<id>`; each `<variableLink>` in the suite carries a `<variableId>` that must equal it, plus a `<testDataLinkId>` that must equal the `<testDataLink><id>` in the same file.

**When a `variableId` does not match, nothing errors.** The variable keeps its `<defaultValue>` and every iteration runs on that default. Depending on the assertion, that shows up as a late timeout that looks like an application bug, or as a green suite over meaningless data. Cross-check the GUIDs after every write; the check is in the Verification section.

## Object Repository Is The Page-Object Layer

Katalon Studio has no page-object classes. `Object Repository/` is the equivalent layer, and the discipline is the same one Page Object Model asks for.

- One `.rs` file per element, named for what it is (`input_Username`, `button_SignIn`), grouped in a folder per page.
- A new Object Repository folder needs a `.meta` `<FolderEntity>` with `<folderType>WEBELEMENT</folderType>`. A new Test Cases folder needs one with `<folderType>TESTCASE</folderType>`.
- Reference objects from the script only as `findTestObject('Login Page/input_Username')`. Never inline a raw XPath or CSS string in a script step.
- Reuse an existing test object when one already matches. Glob `Object Repository/**/*.rs` and read `<name>` plus the selected `webElementProperties` before creating a duplicate.
- Prefer stable properties: `id`, `name`, `aria-label`, visible text. Set `<isSelected>true</isSelected>` only on the properties you actually want matched. Fall back to XPath only when the application gives nothing better, and say so.
- Test objects hold locators. They do not hold assertions.

## Authoring Rules

- Translate one manual step into one keyword call, in step order, so a manual tester can still read the script.
- Use `WebUI` for web, `Mobile` for mobile, `WS` for API. Import them with the alias form the project already uses.
- Turn expected results into `WebUI.verify*` calls next to the action that produces them.
- Use test case variables for anything the manual case parameterises, with a safe `<defaultValue>`. Use `GlobalVariable` for environment values that come from a profile.
- Use `setEncryptedText` only when the source value is Katalon-encrypted; use `setText` otherwise. Mark a credential variable `<masked>true</masked>`.
- Put shared logic in `Keywords/` as a Groovy class with `@Keyword` methods, and call it through `CustomKeywords`. Groovy is Java-compatible, so a Java library on the project classpath can be imported directly.
- Keep one Studio case aligned to one Katalon Platform case unless the project groups scenarios differently.
- Do not invent credentials, URLs, product IDs, account state, or selectors. Ask, or leave a narrow TODO with the exact missing value named.

## Worked Example

Input, read with `read_test_case`:

```text
Key:         TC-1042
Name:        Login with valid credentials
Folder:      Authentication
Requirement: CEL-6
Test data:   username, password
Steps:       1 Open the login page  2 Enter <username>  3 Enter <password>  4 Click Sign in
Expected:    The dashboard header "System dashboard" is visible
```

Output, four files plus a suite. `Test Cases/Authentication/TC-1042 Login with valid credentials.tc`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TestCaseEntity>
   <description>Generated from Katalon Platform test case TC-1042. Requirement CEL-6.</description>
   <name>TC-1042 Login with valid credentials</name>
   <tag>TC-1042</tag>
   <comment></comment>
   <testCaseGuid>3f8b1c02-6d41-4a97-b0e5-9c2a7d15e830</testCaseGuid>
   <variable>
      <defaultValue>''</defaultValue>
      <description>Login username, bound from the suite data file</description>
      <id>a41d55e6-2b78-4c10-9f33-6e0b8c74d219</id>
      <masked>false</masked>
      <name>username</name>
   </variable>
   <variable>
      <defaultValue>''</defaultValue>
      <description>Login password, bound from the suite data file</description>
      <id>c07e93a4-1f65-48db-8a52-77b1e9f0d3cc</id>
      <masked>true</masked>
      <name>password</name>
   </variable>
</TestCaseEntity>
```

`Scripts/Authentication/TC-1042 Login with valid credentials/Script1754870400000.groovy`:

```groovy
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.openBrowser(GlobalVariable.URL + '/login')

WebUI.waitForElementVisible(findTestObject('Login Page/input_Username'), 30)

WebUI.setText(findTestObject('Login Page/input_Username'), username)

WebUI.setText(findTestObject('Login Page/input_Password'), password)

WebUI.click(findTestObject('Login Page/button_SignIn'))

WebUI.waitForElementVisible(findTestObject('Dashboard Page/header_Dashboard'), 30)

WebUI.verifyTextPresent('System dashboard', false)

WebUI.closeBrowser()
```

`username` and `password` are unqualified: Studio injects test case variables into the script binding by name, and the GUID never appears in Groovy. The password step uses `setText` because the data file holds plain values; `setEncryptedText` is only for a Katalon-encrypted value, and `<masked>true</masked>` on the variable is a separate decision from either.

`Object Repository/Login Page/input_Username.rs`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<WebElementEntity>
   <description></description>
   <name>input_Username</name>
   <tag></tag>
   <elementGuidId>b8d0f472-5e19-4c86-a1d7-2f9c63b04e55</elementGuidId>
   <selectorCollection>
      <entry>
         <key>BASIC</key>
         <value></value>
      </entry>
   </selectorCollection>
   <selectorMethod>BASIC</selectorMethod>
   <useRalativeImagePath>false</useRalativeImagePath>
   <webElementProperties>
      <isSelected>false</isSelected>
      <matchCondition>equals</matchCondition>
      <name>tag</name>
      <type>Main</type>
      <value>input</value>
   </webElementProperties>
   <webElementProperties>
      <isSelected>true</isSelected>
      <matchCondition>equals</matchCondition>
      <name>id</name>
      <type>Main</type>
      <value>username</value>
   </webElementProperties>
</WebElementEntity>
```

`useRalativeImagePath` is spelled that way in the schema. Do not "fix" it.

`Test Suites/Regression/Login Regression.ts`, where the GUIDs have to line up:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <description></description>
   <name>Login Regression</name>
   <tag></tag>
   <isRerun>false</isRerun>
   <mailRecipient></mailRecipient>
   <numberOfRerun>0</numberOfRerun>
   <pageLoadTimeout>30</pageLoadTimeout>
   <pageLoadTimeoutDefault>true</pageLoadTimeoutDefault>
   <rerunFailedTestCasesOnly>false</rerunFailedTestCasesOnly>
   <testSuiteGuid>91a3c6f8-4d27-4b0e-9c85-3ad2f7e61b40</testSuiteGuid>
   <testCaseLink>
      <guid>5c2e8b31-9a04-4f7d-b6e2-18d95c0a7f63</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/Authentication/TC-1042 Login with valid credentials</testCaseId>
      <testDataLink>
         <combinationType>ONE</combinationType>
         <id>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</id>
         <iterationEntity>
            <iterationType>ALL</iterationType>
            <value></value>
         </iterationEntity>
         <testDataId>Data Files/valid-accounts</testDataId>
      </testDataLink>
      <variableLink>
         <testDataLinkId>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>Username</value>
         <variableId>a41d55e6-2b78-4c10-9f33-6e0b8c74d219</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>Password</value>
         <variableId>c07e93a4-1f65-48db-8a52-77b1e9f0d3cc</variableId>
      </variableLink>
   </testCaseLink>
</TestSuiteEntity>
```

**The failure this example exists to show.** Change one character of the first `<variableId>` to `...d21f`. There is no XML error, no Studio dialog, no CLI warning. `username` is unbound, keeps `''`, and every data row logs in with an empty username. Here it surfaces late as a `waitForElementVisible` timeout on the dashboard header, which reads like an application bug. In a search or filter case with a tolerant assertion it does not surface at all and the suite reports green over meaningless data.

## Verification

Studio is the only parser for these files, so verify what you can and name what you cannot.

1. **XML well-formedness** on every file written: `xmllint --noout <file>` or any equivalent parser.
2. **Path pairing.** For each generated `.tc`, assert that `Scripts/<same relative path>/<case name>/` exists and holds exactly one `Script*.groovy`.
3. **Suite-to-case pairing.** Each `<testCaseId>` in the suite resolves to an existing `.tc` at that path plus `.tc`.
4. **Variable GUID cross-check.** Every `<variableId>` in the suite must appear as a `<variable><id>` in the linked case:

   ```bash
   comm -23 \
     <(grep -ho '<variableId>[^<]*' "Test Suites/Regression/Login Regression.ts" | sed 's/<variableId>//' | sort -u) \
     <(grep -ho '<id>[^<]*' "Test Cases/Authentication/TC-1042 Login with valid credentials.tc" | sed 's/<id>//' | sort -u)
   ```

   Empty output means the bindings hold. Any printed line is a variable that will silently run on its default.
5. **Object references.** Every `findTestObject('<path>')` in the script resolves to an existing `.rs` under `Object Repository/`.
6. **Report what stays unverified.** Groovy compilation, keyword arity, selector correctness against the live application, and whether Studio opens the project are all outside what you can check here. Name them; do not imply a green check covers them.

If the user has a Katalon Runtime Engine licence and asks for a run, print the command and hand off:

```text
katalonc -noSplash -runMode=console \
  -projectPath="<project.prj>" \
  -testSuitePath="Test Suites/<suite>" \
  -executionProfile="<profile>" \
  -browserType="<browser>" \
  -apiKey="$KATALON_API_KEY" \
  -report.folderPath="<run_report_folder>"
```

Never ask the user to paste an API key into chat; source it from a secure variable.

## Report Back

Report created and updated files with full paths, the Katalon Platform cases they map to, every test object created or reused, the GUID cross-check result, what remains unverified, and any value still needed from a human. If the user has no Katalon Runtime Engine licence, say plainly that the generated suite runs from the Studio IDE and not from a terminal or a pipeline.

## Prompt recipes

- `Turn TC-1042 into a Katalon Studio test case in ~/work/shop-tests.`
- `Convert every case linked to requirement CEL-6 into Studio cases and one data-driven suite.`
- `Add username and password variables to this Studio case and bind them to Data Files/valid-accounts.`
- `Check that my Login Regression suite's variable bindings actually resolve.`

## Hand-offs

- A Studio run has finished and a report exists -> `katalon-upload-report`.
- The target framework is Playwright, not Studio -> `katalon-test-case-to-playwright`.
- The manual case does not exist yet -> `katalon-create-test-cases`.
- The generated suite has started failing intermittently -> `katalon-test-maintenance`.
- A red run needs triage -> `katalon-analyze-failures`.

Read `references/studio-project-anatomy.md` for the file formats and folder rules. Read `references/groovy-authoring.md` for keywords, custom keywords, profiles, and data files. Read the orchestrator `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks what Katalon can do through MCP.
