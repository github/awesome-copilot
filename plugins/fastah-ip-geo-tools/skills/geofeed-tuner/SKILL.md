---
name: geofeed-tuner
description: >
  Use this skill whenever the user mentions IP geolocation feeds, RFC 8805, geofeeds, or wants help creating, tuning, validating, or publishing a
  self-published IP geolocation feed in CSV format. Intended user audience is a network
  operator, ISP, mobile carrier, cloud provider, hosting company, IXP, or satellite provider
  asking about IP geolocation accuracy, or geofeed authoring best practices.
  Helps create, refine, and improve CSV-format IP geolocation feeds with opinionated
  recommendations beyond RFC 8805 compliance. Do NOT use for private or internal IP address
  management — applies only to publicly routable IP addresses.
license: Apache-2.0
metadata:
  author: Sid Mathur <support@getfastah.com>
  version: "0.0.9"
compatibility: Requires Python 3
---

# Geofeed Tuner – Create Better IP Geolocation Feeds

This skill helps you create and improve IP geolocation feeds in CSV format by:
- Ensuring your CSV is well-formed and consistent
- Checking alignment with [RFC 8805](references/rfc8805.txt) (the industry standard)
- Applying **opinionated best practices** learned from real-world deployments
- Suggesting improvements for accuracy, completeness, and privacy

## When to Use This Skill

- Use this skill when a user asks for help **creating, improving, or publishing** an IP geolocation feed file in CSV format.
- Use it to **tune and troubleshoot CSV geolocation feeds** — catching errors, suggesting improvements, and ensuring real-world usability beyond RFC compliance.
- **Intended audience:**
  - Network operators, administrators, and engineers responsible for publicly routable IP address space
  - Organizations such as ISPs, mobile carriers, cloud providers, hosting and colocation companies, Internet Exchange operators, and satellite internet providers
- **Do not use** this skill for private or internal IP address management; it applies **only to publicly routable IP addresses**.

## Prerequisites

- **Python 3** is required.

## Directory Structure and File Management

This skill uses a clear separation between **distribution files** (read-only) and **working files** (generated at runtime).

### Read-Only Directories (Do Not Modify)

The following directories contain static distribution assets. **Do not create, modify, or delete files in these directories:**

| Directory      | Purpose                                                    |
|----------------|------------------------------------------------------------|
| `assets/`      | Static data files (ISO codes, examples)                    |
| `references/`  | RFC specifications and code snippets for reference         |
| `scripts/`     | Executable code and HTML template files for reports        |

### Working Directories (Generated Content)

All generated, temporary, and output files go in these directories:

| Directory       | Purpose                                              |
|-----------------|------------------------------------------------------|
| `run/`          | Working directory for all agent-generated content    |
| `run/data/`     | Downloaded CSV files from remote URLs                |
| `run/report/`   | Generated HTML tuning reports                        |

### File Management Rules

1. **Never write to `assets/`, `references/`, or `scripts/`** — these are part of the skill distribution and must remain unchanged.
2. **All downloaded input files** (from remote URLs) must be saved to `./run/data/`.
3. **All generated HTML reports** must be saved to `./run/report/`.
4. **All generated Python scripts** must be saved to `./run/`.
5. The `run/` directory may be cleared between sessions; do not store permanent data there.
6. **Working directory for execution:** All generated scripts in `./run/` must be executed with the **skill root directory** (the directory containing `SKILL.md`) as the current working directory, so that relative paths like `assets/iso3166-1.json` and `./run/data/report-data.json` resolve correctly. Do not `cd` into `./run/` before running scripts.


## Processing Pipeline: Sequential Phase Execution

All phases must be executed **in order**, from Phase 1 through Phase 6. Each phase depends on the successful completion of the previous phase. For example, **structure checks** must complete before **quality analysis** can run.

The phases are summarized below. The agent must follow the detailed steps outlined further in each phase section.

| Phase | Name                       | Description                                                                       |
|-------|----------------------------|-----------------------------------------------------------------------------------|
| 1     | Understand the Standard    | Review the key requirements of RFC 8805 for self-published IP geolocation feeds   |
| 2     | Gather Input               | Collect IP subnet data from local files or remote URLs                            |
| 3     | Checks & Suggestions       | Validate CSV structure, analyze IP prefixes, and check data quality               |
| 4     | Tuning Data Lookup         | Use Fastah's MCP tool to retrieve tuning data for improving geolocation accuracy  |
| 5     | Generate Tuning Report     | Create an HTML report summarizing the analysis and suggestions                    |
| 6     | Final Review               | Verify consistency and completeness of the report data                            |

**Do not skip phases.** Each phase provides critical checks or data transformations required by subsequent stages.


### Execution Plan Rules

Before executing each phase, the agent MUST generate a visible TODO checklist.

The plan MUST:
- Appear at the very start of the phase
- List every step in order
- Use a checkbox format
- Be updated live as steps complete


### Phase 1: Understand the Standard

The key requirements from RFC 8805 that this skill enforces are summarized below. **Use this summary as your working reference.** Only consult the full [RFC 8805 text](references/rfc8805.txt) for edge cases, ambiguous situations, or when the user asks a standards question not covered here.

#### RFC 8805 Key Facts

**Purpose:** A self-published IP geolocation feed lets network operators publish authoritative location data for their IP address space in a simple CSV format, allowing geolocation providers to incorporate operator-supplied corrections.

**CSV Column Order (Sections 2.1.1.1–2.1.1.5):**

| Column | Field         | Required | Notes                                                      |
|--------|---------------|----------|------------------------------------------------------------|
| 1      | `ip_prefix`   | Yes      | CIDR notation; IPv4 or IPv6; must be a network address     |
| 2      | `alpha2code`  | No       | ISO 3166-1 alpha-2 country code; empty or "ZZ" = do-not-geolocate |
| 3      | `region`      | No       | ISO 3166-2 subdivision code (e.g., `US-CA`)               |
| 4      | `city`        | No       | Free-text city name; no authoritative validation set       |
| 5      | `postal_code` | No       | **Deprecated** — must be left empty or absent             |

**Structural rules:**
- Files may contain comment lines beginning with `#` (including the header, if present).
- A header row is optional; if present, it is treated as a comment if it starts with `#`.
- Files must be encoded in UTF-8.
- Subnet host bits must not be set (i.e., `192.168.1.1/24` is invalid; use `192.168.1.0/24`).
- Applies only to **globally routable** unicast addresses — not private, loopback, link-local, or multicast space.

**Do-not-geolocate:** An entry with an empty `alpha2code` or case-insensitive `ZZ` (irrespective of values of region/city) is an explicit signal that the operator does not want geolocation applied to that prefix.

**Postal codes deprecated (Section 2.1.1.5):** The fifth column must not contain postal or ZIP codes. They are too fine-grained for IP-range mapping and raise privacy concerns.


### Phase 2: Gather Input

- If the user has not already provided a list of IP subnets or ranges (sometimes referred to as `inetnum` or `inet6num`), prompt them to supply it. Accepted input formats:
  - Text pasted into the chat
  - A local CSV file
  - A remote URL pointing to a CSV file

- If the input is a **remote URL**:
  - Attempt to download the CSV file to `./run/data/` before processing.
  - On HTTP error (4xx, 5xx, timeout, or redirect loop), **stop immediately** and report to the user:
    `Feed URL is not reachable: HTTP {status_code}. Please verify the URL is publicly accessible.`
  - Do not proceed to Phase 3 with an incomplete or empty download.

- If the input is a **local file**, process it directly without downloading.

- **Encoding detection and normalization:**
  1. Attempt to read the file as UTF-8 first.
  2. If a `UnicodeDecodeError` is raised, try `utf-8-sig` (UTF-8 with BOM), then `latin-1`.
  3. Once successfully decoded, re-encode and write the working copy as UTF-8.
  4. If no encoding succeeds, stop and report: `Unable to decode input file. Please save it as UTF-8 and try again.`


### Phase 3: Checks & Suggestions

#### Execution Rules
- Generate a **script** for this phase.
- Do NOT combine this phase with others.
- Do NOT precompute future-phase data.
- Store the output as a JSON file at: [`./run/data/report-data.json`](./run/data/report-data.json)

#### Schema Definition

The JSON structure below is **IMMUTABLE** during Phase 3. Phase 4 will later add a `TunedEntry` object to each object in `Entries` — this is the only permitted schema extension and happens in a separate phase.

JSON keys map directly to template placeholders like `{{.CountryCode}}`, `{{.HasError}}`, etc.

```json
{
  "InputFile": "",
  "Timestamp": 0,

  "TotalEntries": 0,
  "IpV4Entries": 0,
  "IpV6Entries": 0,
  "InvalidEntries": 0,

  "Errors": 0,
  "Warnings": 0,
  "OK": 0,
  "Suggestions": 0,

  "CityLevelAccuracy": 0,
  "RegionLevelAccuracy": 0,
  "CountryLevelAccuracy": 0,
  "DoNotGeolocate": 0,

  "Entries": [
    {
      "Line": 0,
      "IPPrefix": "",
      "CountryCode": "",
      "RegionCode": "",
      "City": "",

      "Status": "",
      "IPVersion": "",

      "Messages": [
        {
          "ID": "",
          "Type": "",
          "Text": "",
          "Checked": false
        }
      ],

      "HasError": false,
      "HasWarning": false,
      "HasSuggestion": false,
      "DoNotGeolocate": false,
      "GeocodingHint": "",
      "Tunable": false
    }
  ]
}
```

Field definitions:

**Top-level metadata:**
- `InputFile`: The original input source, either a local filename or a remote URL.
- `Timestamp`: Milliseconds since Unix epoch when the tuning was performed.
- `TotalEntries`: Total number of data rows processed (excluding comment and blank lines).
- `IpV4Entries`: Count of entries that are IPv4 subnets.
- `IpV6Entries`: Count of entries that are IPv6 subnets.
- `InvalidEntries`: Count of entries that failed IP prefix parsing and CSV parsing.
- `Errors`: Total entries whose `Status` is `ERROR`.
- `Warnings`: Total entries whose `Status` is `WARNING`.
- `OK`: Total entries whose `Status` is `OK`.
- `Suggestions`: Total entries whose `Status` is `SUGGESTION`.
- `CityLevelAccuracy`: Count of valid entries where `City` is non-empty.
- `RegionLevelAccuracy`: Count of valid entries where `RegionCode` is non-empty and `City` is empty.
- `CountryLevelAccuracy`: Count of valid entries where `CountryCode` is non-empty, `RegionCode` is empty, and `City` is empty.
- `DoNotGeolocate` (metadata): Count of valid entries where `CountryCode`, `RegionCode`, and `City` are all empty.

**Entry fields:**
- `Entries`: Array of objects, one per data row, with the following per-entry fields:
  - `Line`: 1-based line number in the original CSV (counting all lines including comments and blanks).
  - `IPPrefix`: The normalized IP prefix in CIDR slash notation.
  - `CountryCode`: The ISO 3166-1 alpha-2 country code, or empty string.
  - `RegionCode`: The ISO 3166-2 region code (e.g., `US-CA`), or empty string.
  - `City`: The city name, or empty string.
  - `Status`: Highest severity assigned: `ERROR` > `WARNING` > `SUGGESTION` > `OK`.
  - `IPVersion`: `"IPv4"` or `"IPv6"` based on the parsed IP prefix.
  - `Messages`: Array of message objects, each with:
    - `ID`: String identifier from the **Validation Rules Reference** table below (e.g., `"1101"`, `"3301"`).
    - `Type`: The severity type: `"ERROR"`, `"WARNING"`, or `"SUGGESTION"`.
    - `Text`: The human-readable validation message string.
    - `Checked`: `true` if the validation rule is auto-tunable (`Tunable: true` in the reference table), `false` otherwise. Controls whether the checkbox in the report is `checked` or `disabled`.
  - `HasError`: `true` if any message has `Type` `"ERROR"`.
  - `HasWarning`: `true` if any message has `Type` `"WARNING"`.
  - `HasSuggestion`: `true` if any message has `Type` `"SUGGESTION"`.
  - `DoNotGeolocate` (entry): `true` if `CountryCode` is empty or `"ZZ"` — the entry is an explicit do-not-geolocate signal.
  - `GeocodingHint`: Always empty string `""` in Phase 3. Reserved for future use.
  - `Tunable`: `true` if **any** message in the entry has `Checked: true`. Computed as logical OR across all messages' `Checked` values. This flag drives the "Tune" button visibility in the report.

#### Validation Rules Reference

When adding messages to an entry, use the `ID`, `Type`, `Text`, and `Checked` values from this table.

| ID     | Type         | Text                                                                                           | Checked | Condition Reference                    |
|--------|--------------|------------------------------------------------------------------------------------------------|---------|----------------------------------------|
| `1101` | `ERROR`      | IP prefix is empty                                                                             | `false` | IP Prefix Analysis: empty              |
| `1102` | `ERROR`      | Invalid IP prefix: unable to parse as IPv4 or IPv6 network                                     | `false` | IP Prefix Analysis: invalid syntax     |
| `1103` | `ERROR`      | Non-public IP range is not allowed in an RFC 8805 feed                                         | `false` | IP Prefix Analysis: non-public         |
| `3101` | `SUGGESTION` | IPv4 prefix is unusually large and may indicate a typo                                         | `false` | IP Prefix Analysis: IPv4 < /22         |
| `3102` | `SUGGESTION` | IPv6 prefix is unusually large and may indicate a typo                                         | `false` | IP Prefix Analysis: IPv6 < /64         |
| `1201` | `ERROR`      | Invalid country code: not a valid ISO 3166-1 alpha-2 value                                     | `true`  | Country Code Analysis: invalid         |
| `1301` | `ERROR`      | Invalid region format; expected COUNTRY-SUBDIVISION (e.g., US-CA)                              | `true`  | Region Code Analysis: bad format       |
| `1302` | `ERROR`      | Invalid region code: not a valid ISO 3166-2 subdivision                                        | `true`  | Region Code Analysis: unknown code     |
| `1303` | `ERROR`      | Region code does not match the specified country code                                          | `true`  | Region Code Analysis: mismatch         |
| `1401` | `ERROR`      | Invalid city name: placeholder value is not allowed                                            | `false` | City Name Analysis: placeholder        |
| `1402` | `ERROR`      | Invalid city name: abbreviated or code-based value detected                                    | `true`  | City Name Analysis: abbreviation       |
| `2401` | `WARNING`    | City name formatting is inconsistent; consider normalizing the value                           | `true`  | City Name Analysis: formatting         |
| `1501` | `ERROR`      | Postal codes are deprecated by RFC 8805 and must be removed for privacy reasons                | `true`  | Postal Code Check                      |
| `3301` | `SUGGESTION` | Region is usually unnecessary for small territories; consider removing the region value        | `true`  | Tuning: small territory region         |
| `3402` | `SUGGESTION` | City-level granularity is usually unnecessary for small territories; consider removing the city value | `true`  | Tuning: small territory city           |
| `3303` | `SUGGESTION` | Region code is recommended when a city is specified; choose a region from the dropdown         | `true`  | Tuning: missing region with city       |
| `3104` | `SUGGESTION` | Confirm whether this subnet is intentionally marked as do-not-geolocate or missing location data | `true`  | Tuning: unspecified geolocation        |

#### Populating Messages

When a validation check matches, add a message to the entry's `Messages` array using the values from the reference table:
```python
entry["Messages"].append({
    "ID": "1201",      # From the table
    "Type": "ERROR",   # From the table
    "Text": "Invalid country code: not a valid ISO 3166-1 alpha-2 value",  # From the table
    "Checked": True    # From the table (True = tunable)
})
```

After populating all messages for an entry, derive the entry-level flags:
```python
entry["HasError"] = any(m["Type"] == "ERROR" for m in entry["Messages"])
entry["HasWarning"] = any(m["Type"] == "WARNING" for m in entry["Messages"])
entry["HasSuggestion"] = any(m["Type"] == "SUGGESTION" for m in entry["Messages"])
entry["Tunable"] = any(m["Checked"] for m in entry["Messages"])
```

#### Accuracy Level Counting Rules

Accuracy levels are **mutually exclusive**. Assign each valid (non-ERROR, non-invalid) entry to exactly one bucket based on the most granular non-empty geo field:

| Condition                                                    | Bucket                      |
|--------------------------------------------------------------|-----------------------------|
| `City` is non-empty                                          | `CityLevelAccuracy`         |
| `RegionCode` non-empty AND `City` is empty                   | `RegionLevelAccuracy`       |
| `CountryCode` non-empty, `RegionCode` and `City` empty       | `CountryLevelAccuracy`      |
| `DoNotGeolocate` (entry) is `true`                           | `DoNotGeolocate` (metadata) |

**Do not count** entries with `HasError: true` or entries in `InvalidEntries` in any accuracy bucket.

The agent MUST NOT:
- Rename fields
- Add or remove fields
- Change data types
- Reorder keys
- Alter nesting
- Wrap the object
- Split into multiple files

If a value is unknown, **leave it empty** — never invent data.

#### Structure & Format Check

This phase verifies that your feed is well-formed and parseable. **Critical structural errors** must be resolved before the tuner can analyze geolocation quality.

##### CSV Structure

This subsection defines rules for **CSV-formatted input files** used for IP geolocation feeds.
The goal is to ensure the file can be parsed reliably and normalized into a **consistent internal representation**.

- **CSV Structure Checks**
  - If `pandas` is available, use it for CSV parsing.
  - Otherwise, fall back to Python's built-in `csv` module.

  - Ensure the CSV contains **exactly 4 or 5 logical columns**.
  - Comment lines are allowed.
  - A header row **may or may not** be present.
  - If no header row exists, assume the implicit column order:
    ```
    ip_prefix, alpha2code, region, city, postal code (deprecated)
    ```
  - Refer to the example input file:
    [`assets/example/01-user-input-rfc8805-feed.csv`](assets/example/01-user-input-rfc8805-feed.csv)

- **CSV Cleansing and Normalization**
  - Clean and normalize the CSV using Python logic equivalent to the following operations:
    - Select only the **first five columns**, dropping any columns beyond the fifth.
    - Write the output file with a **UTF-8 BOM**.

  - **Comments**
    - Remove comment rows where the **first column begins with `#`**.
    - This also removes a header row if it begins with `#`.
    - Create a map of comments using the **1-based line number** as the key and the full original line as the value. Also store blank lines.
    - Store this map in a JSON file at: [`./run/data/comments.json`](./run/data/comments.json)
    - Example: `{ "4": "# It's OK for small city states to leave state ISO2 code unspecified" }`

- **Notes**
  - Both implementation paths (`pandas` and built-in `csv`) must write output using
    the `utf-8-sig` encoding to ensure a **UTF-8 BOM** is present.

#### IP Prefix Analysis
  - Check that the `IPPrefix` field is present and non-empty for each entry.
  - Check for duplicate `IPPrefix` values across entries.
  - If duplicates are found, stop the skill and report to the user with the message: `Duplicate IP prefix detected: {ip_prefix_value} appears on lines {line_numbers}`
  - If no duplicates are found, continue with the analysis.

  - **Checks**
    - Each subnet must parse cleanly as either an **IPv4 or IPv6 network** using the code snippets in the `references/` folder.
    - Subnets must be normalized and displayed in **CIDR slash notation**.
      - Single-host IPv4 subnets must be represented as **`/32`**.
      - Single-host IPv6 subnets must be represented as **`/128`**.

  - **ERROR**
    - Report the following conditions as **ERROR**:

    - **Invalid subnet syntax**
      - Message ID: `1102`

    - **Non-public address space**
      - Applies to subnets that are **private, loopback, link-local, multicast, or otherwise non-public**
        - In Python, detect non-public ranges using `is_private` and related address properties as shown in `./references`.
      - Message ID: `1103`

  - **SUGGESTION**
    - Report the following conditions as **SUGGESTION**:

    - **Overly large IPv6 subnets**
      - Prefixes shorter than `/64`
      - Message ID: `3102`

    - **Overly large IPv4 subnets**
      - Prefixes shorter than `/22`
      - Message ID: `3101`

#### Geolocation Quality Check

Analyze the **accuracy and consistency** of geolocation data:
  - Country codes
  - Region codes
  - City names
  - Deprecated fields

This phase runs after structural checks pass.

##### Country Code Analysis
  - Use the locally available data table [`ISO3166-1`](assets/iso3166-1.json) for checking.
    - JSON array of countries and territories with ISO codes
    - Each object includes:
      - `alpha_2`: two-letter country code
      - `name`: short country name
      - `flag`: flag emoji
    - This file represents the **superset of valid `CountryCode` values** for an RFC 8805 CSV.
  - Check the entry's `CountryCode` (RFC 8805 Section 2.1.1.2, column `alpha2code`) against the `alpha_2` attribute.
  - Sample code is available in the `references/` directory.

  - If a country is found in [`assets/small-territories.json`](assets/small-territories.json), mark the entry internally as a small territory. This flag is used in later checks and suggestions but is **not stored in the output JSON** (it is transient validation state).

  - **Note:** `small-territories.json` contains some historic/disputed codes (`AN`, `CS`, `XK`) that are not present in `iso3166-1.json`. An entry using one of these as its `CountryCode` will fail the country code validation (ERROR) even though it matches as a small territory. The country code ERROR takes precedence — do not suppress it based on the small-territory flag.

  - **ERROR**
    - Report the following conditions as **ERROR**:
    - **Invalid country code**
      - Condition: `CountryCode` is present but not found in the `alpha_2` set
      - Message ID: `1201`

  - **SUGGESTION**
    - Report the following conditions as **SUGGESTION**:

    - **Unspecified geolocation for subnet**
      - Condition: All geographical fields (`CountryCode`, `RegionCode`, `City`) are empty for a subnet.
      - Action: 
        - Set `DoNotGeolocate = true` for the entry.
        - Set `CountryCode` to `ZZ` for the entry.
      - Message ID: `3104`


##### Region Code Analysis
  - Use the locally available data table [`ISO3166-2`](assets/iso3166-2.json) for checking.
    - JSON array of country subdivisions with ISO-assigned codes
    - Each object includes:
      - `code`: subdivision code prefixed with country code (e.g., `US-CA`)
      - `name`: short subdivision name
    - This file represents the **superset of valid `RegionCode` values** for an RFC 8805 CSV.
  - If a `RegionCode` value is provided (RFC 8805 Section 2.1.1.3):
    - Check that the format matches `{COUNTRY}-{SUBDIVISION}` (e.g., `US-CA`, `AU-NSW`).
    - Check the value against the `code` attribute (already prefixed with the country code).

  - **Small-territory exception:** If the entry is a small territory **and** the `RegionCode` value equals the entry's `CountryCode` (e.g., `SG` as both country and region for Singapore), treat the region as acceptable — skip all region validation checks for this entry. Small territories are effectively city-states with no meaningful ISO 3166-2 administrative subdivisions.

  - **ERROR**
    - Report the following conditions as **ERROR**:
    - **Invalid region format**
      - Condition: `RegionCode` does not match `{COUNTRY}-{SUBDIVISION}` **and** the small-territory exception does not apply
      - Message ID: `1301`
    - **Unknown region code**
      - Condition: `RegionCode` value is not found in the `code` set **and** the small-territory exception does not apply
      - Message ID: `1302`
    - **Country–region mismatch**
      - Condition: Country portion of `RegionCode` does not match `CountryCode`
      - Message ID: `1303`

##### City Name Analysis

  - City names are validated using **heuristic checks only**.
  - There is currently **no authoritative dataset** available for validating city names.

  - **ERROR**
    - Report the following conditions as **ERROR**:
    - **Placeholder or non-meaningful values**
      - Condition: Placeholder or non-meaningful values including but not limited to:
        - `undefined`
        - `Please select`
        - `null`
        - `N/A`
        - `TBD`
        - `unknown`
      - Message ID: `1401`

    - **Truncated names, abbreviations, or airport codes**
      - Condition: Truncated names, abbreviations, or airport codes that do not represent valid city names:
        - `LA`
        - `Frft`
        - `sin01`
        - `LHR`
        - `SIN`
        - `MAA`
      - Message ID: `1402`

  - **WARNING**
    - Report the following conditions as **WARNING**:
    - **Inconsistent casing or formatting**
      - Condition: City names with inconsistent casing, spacing, or formatting that may reduce data quality, for example:
        - `HongKong` vs `Hong Kong`
        - Mixed casing or unexpected script usage
      - Message ID: `2401`

##### Postal Code Check
  - RFC 8805 Section 2.1.1.5 explicitly **deprecates postal or ZIP codes**.
  - Postal codes can represent very small populations and are **not considered privacy-safe** for mapping IP address ranges, which are statistical in nature.

  - **ERROR**
    - Report the following conditions as **ERROR**:
    - **Postal code present**
      - Condition: A non-empty value is present in the postal/ZIP code field.
      - Message ID: `1501`

#### Tuning & Recommendations

This phase applies **opinionated recommendations** beyond RFC 8805, learned from real-world geofeed deployments, that improve accuracy and usability.

- **SUGGESTION**
  - Report the following conditions as **SUGGESTION**:

  - **Region or city specified for small territory**
    - Condition:
      - Entry is a small territory
      - `RegionCode` is non-empty **OR**
      - `City` is non-empty.
    - Message IDs: `3301` (for region), `3402` (for city)

  - **Missing region code when city is specified**
    - Condition:
      - `City` is non-empty
      - `RegionCode` is empty
      - Entry is **not** a small territory
    - Message ID: `3303`

### Phase 4: Tuning Data Lookup

#### Objective
Lookup all the `Entries` using Fastah's `rfc8805-row-place-search` tool.

#### Execution Rules
- Generate a new **script** _only_ for payload generation (read the dataset and write one or more payload JSON files; do not call MCP from this script).
- Server only accepts 1000 entries per request, so if there are more than 1000 entries, split into multiple requests.
- The agent must read the generated payload files, construct the requests from them, and send those requests to the MCP server in batches of at most 1000 entries each.
- **On MCP failure:** If the MCP server is unreachable, returns an error, or returns no results for any batch, log a warning and continue to Phase 5. Set `TunedEntry: {}` for all affected entries. Do not block report generation. Notify the user clearly: `Tuning data lookup unavailable; the report will show validation results only.`
- Suggestions are **advisory only** — **never auto-populate** them.

#### Step 1: Build Lookup Payload with Deduplication

Load the dataset from: [./run/data/report-data.json](./run/data/report-data.json)
- Read the `Entries` array. Each entry will be used to build the MCP lookup payload.

Reduce server requests by deduplicating identical entries:
- For each entry in `Entries`, compute a content hash (hash of `CountryCode` + `RegionCode` + `City`).
- Create a deduplication map: `{ contentHash -> { rowKey, payload, entryIndices: [] } }`. rowKey is a UUID that will be sent to the MCP server for matching responses.
- If an entry's hash already exists, append its **0-based array index** in `Entries` to that deduplication entry's `entryIndices` array.
- If hash is new, generate a **UUID (rowKey)** and create a new deduplication entry.

Build request batches:
- Extract unique deduplicated entries from the map, keeping them in deduplication order.
- Build request batches of up to 1000 items each.
- For each batch, keep an in-memory structure like `[{ rowKey, payload, entryIndices }, ...]` to match responses back by rowKey.
- When writing the MCP payload file, include the `rowKey` field with each payload object:

```json
[
    {"rowKey": "550e8400-e29b-41d4-a716-446655440000", "countryCode":"CA","regionCode":"CA-ON","cityName":"Toronto"},
    {"rowKey": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "countryCode":"IN","regionCode":"IN-KA","cityName":"Bangalore"},
    {"rowKey": "6ba7b811-9dad-11d1-80b4-00c04fd430c8", "countryCode":"IN","regionCode":"IN-KA"}
]
```

- When reading responses, match each response `rowKey` field to the corresponding deduplication entry to retrieve all associated `entryIndices`.

Rules:
- Write payload to: [./run/data/mcp-server-payload.json](./run/data/mcp-server-payload.json)
- Exit the script after writing the payload.

#### Step 2: Invoke Fastah MCP Tool

- An example `mcp.json` style configuration of Fastah MCP server is as follows:
```json
    "fastah-ip-geofeed": {
      "type": "http",
      "url": "https://mcp.fastah.ai/mcp"
    }
```
- Server: `https://mcp.fastah.ai/mcp`
- Tool and its Schema: before the first `tools/call`, the agent MUST send a `tools/list` request to read the input and output schema for **`rfc8805-row-place-search`**.
  Use the discovered schema as the authoritative source for field names, types, and constraints.
- The following is an illustrative example only; always defer to the schema returned by `tools/list`:

  ```json
  [
      {"rowKey": "550e8400-...", "countryCode":"CA", ...},
      {"rowKey": "690e9301-...", "countryCode":"ZZ", ...}
  ]
- Open [./run/data/mcp-server-payload.json](./run/data/mcp-server-payload.json) and send all deduplicated entries with their rowKeys.
- If there are more than 1000 deduplicated entries after deduplication, split into multiple requests of 1000 entries each.
- The server will respond with the same `rowKey` field in each response for mapping back.
- Do NOT use local data.

#### Step 3: Attach Tuned Data to Entries

- Generate a new **script** for attaching tuned data.
- Load both [./run/data/report-data.json](./run/data/report-data.json) and the deduplication map (held in memory from Step 1, or re-derived from the payload file).
- For each response from the MCP server:
  - Extract the `rowKey` from the response.
  - Look up the `entryIndices` array associated with that `rowKey` from the deduplication map.
  - For each index in `entryIndices`, attach the best match to `Entries[index]`.
- Use the **first (best) match** from the response when available.

Create the field on each affected entry if it does not exist. Remap the MCP API response keys to Go struct field names:

```json
"TunedEntry": {
  "Name": "",
  "CountryCode": "",
  "RegionCode": "",
  "PlaceType": "",
  "H3Cells": [],
  "BoundingBox": []
}
```

The `TunedEntry` field is a **single object** (not an array). It holds the best match from the MCP server.

**MCP response key → JSON key mapping**:
| MCP API response key | JSON key                   |
|----------------------|----------------------------|
| `placeName`          | `Name`                     |
| `countryCode`        | `CountryCode`              |
| `stateCode`          | `RegionCode`               |
| `placeType`          | `PlaceType`                |
| `h3Cells`            | `H3Cells`                  |
| `boundingBox`        | `BoundingBox`              |

Entries with no UUID match (i.e. the MCP server returned no response for their UUID) must receive an empty `TunedEntry: {}` object — never leave the field absent.

- Write the dataset back to: [./run/data/report-data.json](./run/data/report-data.json)
- Rules:
  - Maintain all existing validation flags.
  - Do NOT create additional intermediate files.


### Phase 5: Generate Tuning Report

Generate a **self-contained HTML report** by rendering the template at `./scripts/templates/index.html` with data from `./run/data/report-data.json` and `./run/data/comments.json`.

Write the completed report to `./run/report/geofeed-report.html`. After generating, attempt to open it in the system's default browser (e.g., `webbrowser.open()`). If running in a headless environment, CI pipeline, or remote container where no browser is available, skip the browser step and instead present the file path to the user so they can open or download it.

**The template uses Go `html/template` syntax** (`{{.Field}}`, `{{range}}`, `{{if eq}}`, etc.). Write a Python script that reads the template, builds a rendering context from the JSON data files, and processes the template placeholders to produce final HTML. Do not modify the template file itself — all processing happens in the Python script at render time.

#### Step 1: Replace Metadata Placeholders

Replace each `{{.Metadata.X}}` placeholder in the template with the corresponding value from `report-data.json`. Since JSON keys match the template placeholder, the mapping is direct — `{{.Metadata.InputFile}}` maps to the `InputFile` JSON key, etc.

| Template placeholder                   | JSON key (`report-data.json`)     |
|----------------------------------------|-----------------------------------|
| `{{.Metadata.InputFile}}`              | `InputFile`                       |
| `{{.Metadata.Timestamp}}`              | `Timestamp`                       |
| `{{.Metadata.TotalEntries}}`           | `TotalEntries`                    |
| `{{.Metadata.IpV4Entries}}`            | `IpV4Entries`                     |
| `{{.Metadata.IpV6Entries}}`            | `IpV6Entries`                     |
| `{{.Metadata.InvalidEntries}}`         | `InvalidEntries`                  |
| `{{.Metadata.Errors}}`                 | `Errors`                          |
| `{{.Metadata.Warnings}}`               | `Warnings`                        |
| `{{.Metadata.Suggestions}}`            | `Suggestions`                     |
| `{{.Metadata.OK}}`                     | `OK`                              |
| `{{.Metadata.CityLevelAccuracy}}`      | `CityLevelAccuracy`               |
| `{{.Metadata.RegionLevelAccuracy}}`    | `RegionLevelAccuracy`             |
| `{{.Metadata.CountryLevelAccuracy}}`   | `CountryLevelAccuracy`            |
| `{{.Metadata.DoNotGeolocate}}`         | `DoNotGeolocate` (metadata)       |

**Note on `{{.Metadata.Timestamp}}`:** This placeholder appears inside a JavaScript `new Date(...)` call. Replace it with the raw integer value (no HTML escaping needed for a numeric literal inside `<script>`). All other metadata values should be HTML-escaped since they appear inside HTML element text.

#### Step 2: Replace the Comment Map Placeholder

Locate this pattern in the template:
```javascript
const commentMap = {{.Comments}};
```

Replace `{{.Comments}}` with the serialized JSON object from `./run/data/comments.json`. The JSON is embedded directly as a JavaScript object literal (not inside a string), so no extra escaping is needed:

```python
comments_json = json.dumps(comments)
template = template.replace("{{.Comments}}", comments_json)
```

#### Step 3: Expand the Entries Range Block

The template contains a `{{range .Entries}}...{{end}}` block inside `<tbody id="entriesTableBody">`. Process it as follows:

1. **Extract** the range block body using regex. **Critical:** The block contains nested `{{end}}` tags (from `{{if eq .Status ...}}`, `{{if .Checked}}`, and `{{range .Messages}}`). A naive non-greedy match like `\{\{range \.Entries\}\}(.*?)\{\{end\}\}` will match the **first** inner `{{end}}`, truncating the block. Instead, anchor the outer `{{end}}` to the `</tbody>` that follows it:
    ```python
    m = re.search(
        r'\{\{range \.Entries\}\}(.*?)\{\{end\}\}\s*</tbody>',
        template,
        re.DOTALL,
    )
    entry_body = m.group(1)  # template text for one entry iteration
    ```
    This ensures you capture the full block body including all three `<tr>` rows and the nested `{{range .Messages}}...{{end}}`.
2. **Iterate** over each entry in `report-data.json`'s `Entries` array.
3. **Expand** the block body for each entry using the processing order below.
4. **Replace** the entire match (from `{{range .Entries}}` through `</tbody>`) with the concatenated expanded HTML followed by `</tbody>`.

**Processing order for each entry** (innermost constructs first to avoid `{{end}}` confusion):
1. Evaluate `{{if eq .Status ...}}...{{end}}` conditionals (status badge class and icon).
2. Evaluate `{{if .Checked}}...{{end}}` conditional (message checkbox).
3. Expand `{{range .Messages}}...{{end}}` inner range.
4. Replace simple `{{.Field}}` placeholders.

##### Entry Field Mapping

Within the range block body, replace these placeholders for each entry. Since JSON keys match the template placeholder, the template placeholder `{{.X}}` maps directly to JSON key `X`:

| Template placeholder           | JSON key (`Entries[]`)       | Notes                                                        |
|--------------------------------|------------------------------|--------------------------------------------------------------|
| `{{.Line}}`                    | `Line`                       | Direct integer value                                         |
| `{{.IPPrefix}}`                | `IPPrefix`                   | HTML-escaped                                                 |
| `{{.CountryCode}}`             | `CountryCode`                | HTML-escaped                                                 |
| `{{.RegionCode}}`              | `RegionCode`                 | HTML-escaped                                                 |
| `{{.City}}`                    | `City`                       | HTML-escaped                                                 |
| `{{.Status}}`                  | `Status`                     | HTML-escaped                                                 |
| `{{.HasError}}`                | `HasError`                   | Lowercase string: `"true"` or `"false"`                      |
| `{{.HasWarning}}`              | `HasWarning`                 | Lowercase string: `"true"` or `"false"`                      |
| `{{.HasSuggestion}}`           | `HasSuggestion`              | Lowercase string: `"true"` or `"false"`                      |
| `{{.GeocodingHint}}`           | `GeocodingHint`              | Empty string `""`                                            |
| `{{.DoNotGeolocate}}`          | `DoNotGeolocate`             | `"true"` or `"false"`                                        |
| `{{.Tunable}}`                 | `Tunable`                    | `"true"` or `"false"`                                        |
| `{{.TunedEntry.CountryCode}}`  | `TunedEntry.CountryCode`     | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.RegionCode}}`   | `TunedEntry.RegionCode`      | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.Name}}`         | `TunedEntry.Name`            | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.H3Cells}}`      | `TunedEntry.H3Cells`         | Bracket-wrapped space-separated; `"[]"` if empty (see format below) |
| `{{.TunedEntry.BoundingBox}}`  | `TunedEntry.BoundingBox`     | Bracket-wrapped space-separated; `"[]"` if empty (see format below) |

**`data-h3-cells` and `data-bounding-box` format:** These are **NOT JSON arrays**. They are bracket-wrapped, space-separated values. Do **not** use JSON serialization (no quotes around string elements, no commas between numbers). Examples:
- `[836752fffffffff 836755fffffffff]` — correct
- `["836752fffffffff","836755fffffffff"]` — **WRONG**, quotes will break parsing
- `[-71.70 10.73 -71.52 10.55]` — correct
- `[]` — correct for empty

##### Evaluating Status Conditionals

**Process these BEFORE replacing simple `{{.Field}}` placeholders** — otherwise the `{{end}}` markers get consumed and the regex won't match.

The template uses `{{if eq .Status "..."}}` conditionals for the status badge CSS class and icon. Evaluate these by checking the entry's `status` value and keeping only the matching branch text.

The status badge line contains **two** `{{if eq .Status ...}}...{{end}}` blocks on a single line — one for the CSS class, one for the icon. Use `re.sub` with a callback to resolve all occurrences:

```python
STATUS_CSS = {"ERROR": "error", "WARNING": "warning", "SUGGESTION": "suggestion", "OK": "ok"}
STATUS_ICON = {
    "ERROR": "bi-x-circle-fill",
    "WARNING": "bi-exclamation-triangle-fill",
    "SUGGESTION": "bi-lightbulb-fill",
    "OK": "bi-check-circle-fill",
}

def resolve_status_if(match_obj, status):
    """Pick the branch matching `status` from a {{if eq .Status ...}}...{{end}} block."""
    block = match_obj.group(0)
    # Try each branch: {{if eq .Status "X"}}val{{else if ...}}val{{else}}val{{end}}
    for st, val in [("ERROR",), ("WARNING",), ("SUGGESTION",)]:
        # not needed to parse generically — just map from the known patterns
    ...
```

A simpler approach: since there are exactly two known patterns, replace them as literal strings:
```python
css_class = STATUS_CSS.get(status, "ok")
icon_class = STATUS_ICON.get(status, "bi-check-circle-fill")
body = body.replace(
    '{{if eq .Status "ERROR"}}error{{else if eq .Status "WARNING"}}warning{{else if eq .Status "SUGGESTION"}}suggestion{{else}}ok{{end}}',
    css_class,
)
body = body.replace(
    '{{if eq .Status "ERROR"}}bi-x-circle-fill{{else if eq .Status "WARNING"}}bi-exclamation-triangle-fill{{else if eq .Status "SUGGESTION"}}bi-lightbulb-fill{{else}}bi-check-circle-fill{{end}}',
    icon_class,
)
```
This avoids regex entirely and is safe because these exact strings appear verbatim in the template.

#### Step 4: Expand the Nested Messages Range

The `{{range .Messages}}...{{end}}` block contains a **nested** `{{if .Checked}} checked{{else}} disabled{{end}}` conditional, so its inner `{{end}}` would cause a simple non-greedy regex to match too early. Anchor the regex to `</td>` (the tag immediately after the messages range closing `{{end}}`) to capture the full block body:

```python
msg_match = re.search(
    r'\{\{range \.Messages\}\}(.*?)\{\{end\}\}\s*(?=</td>)',
    body, re.DOTALL
)
```

The lookahead `(?=</td>)` ensures the regex skips past the checkbox conditional's `{{end}}` (which is followed by `>`, not `</td>`) and matches only the range-closing `{{end}}` (which is followed by whitespace then `</td>`).

For each message in the entry's `Messages` array, clone the captured block body and expand it:

1. **Resolve the checkbox conditional** per message (must happen before simple placeholder replacement to remove the nested `{{end}}`):
   ```python
   if msg.get("Checked"):
       msg_body = msg_body.replace(
           '{{if .Checked}} checked{{else}} disabled{{end}}', ' checked'
       )
   else:
       msg_body = msg_body.replace(
           '{{if .Checked}} checked{{else}} disabled{{end}}', ' disabled'
       )
   ```

2. **Replace message field placeholders**:

   | Template placeholder | Source                            | Notes                          |
   |--------------------------|-----------------------------------|--------------------------------|
   | `{{.ID}}`                | `Messages[i].ID`                  | Direct string value from JSON  |
   | `{{.Text}}`              | `Messages[i].Text`                | HTML-escaped                   |

3. **Concatenate** all expanded message blocks and replace the original `{{range .Messages}}...{{end}}` match (`msg_match.group(0)`) with the result:
   ```python
   body = body[:msg_match.start()] + "".join(expanded_msgs) + body[msg_match.end():]
   ```

If `Messages` is empty, replace the entire matched region with an empty string (no message divs — only the issues header remains).

#### Output Guarantees

- The report must be readable in any modern browser without extra network dependencies beyond the CDN links already in the template (`leaflet`, `h3-js`, `bootstrap-icons`, Raleway font).
- All values embedded in HTML must be **HTML-escaped** (`<`, `>`, `&`, `"`) to prevent rendering issues.
- `commentMap` is embedded as a direct JavaScript object literal (not inside a string), so no JS string escaping is needed — just emit valid JSON.
- All values must be derived **only from analysis output**, not recomputed heuristically.


### Phase 6: Final Review

Perform a final verification pass using concrete, checkable assertions before presenting results to the user.

**Check 1 — Entry count integrity**
- Count non-comment, non-blank data rows in the original input CSV.
- Assert: `len(entries) in report-data.json == data_row_count`
- On failure: `Row count mismatch: input has {N} data rows but report contains {M} entries.`

**Check 2 — Summary counter integrity**
- These counters use **mutual exclusion** based on the boolean flags, which mirrors the highest-severity `Status` field. An entry with both `HasError: true` and `HasWarning: true` is counted only in `Errors`, never in `Warnings`. This is equivalent to counting by the entry's `Status` field.
- Assert all of the following; correct any that fail before generating the report:
  - `Errors == sum(1 for e in Entries if e['HasError'])`
  - `Warnings == sum(1 for e in Entries if e['HasWarning'] and not e['HasError'])`
  - `Suggestions == sum(1 for e in Entries if e['HasSuggestion'] and not e['HasError'] and not e['HasWarning'])`
  - `OK == sum(1 for e in Entries if not e['HasError'] and not e['HasWarning'] and not e['HasSuggestion'])`
  - `Errors + Warnings + Suggestions + OK == TotalEntries - InvalidEntries`

**Check 3 — Accuracy bucket integrity**
- Assert: `CityLevelAccuracy + RegionLevelAccuracy + CountryLevelAccuracy + DoNotGeolocate == TotalEntries - InvalidEntries`
- **Note:** The accuracy buckets defined in Phase 3 say "Do not count entries with `HasError: true`", but the Check 3 formula above uses `TotalEntries - InvalidEntries` (which still includes ERROR entries). This means ERROR entries (those that parsed as valid IPs but failed validation) **are** counted in accuracy buckets by their geo-field presence. Only `InvalidEntries` (unparsable IP prefixes) are excluded. Follow the Check 3 formula as the authoritative rule.
- On failure, trace and fix the bucketing logic before proceeding.

**Check 4 — No duplicate line numbers**
- Assert: all `Line` values in `Entries` are unique.
- On failure, report the duplicated line numbers to the user.

**Check 5 — TunedEntry completeness**
- Assert: every object in `Entries` has a `TunedEntry` key (even if its value is `{}`).
- On failure, add `"TunedEntry": {}` to any entry missing the key, then re-save `report-data.json`.

**Check 6 — Report file is present and non-empty**
- Confirm `./run/report/geofeed-report.html` was written and has a file size greater than zero bytes.
- On failure, regenerate the report before presenting to the user.
