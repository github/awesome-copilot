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


### Phase 3: Checks & Suggestions

#### Execution Rules
- Generate a **script** for this phase.
- Do NOT combine this phase with others.
- Do NOT precompute future-phase data.
- Store the output as a JSON file at: `./run/data/report-data.json`

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
    - Store this map in a JSON file at: `./run/data/comments.json`
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

## Extended guide

These sections are in [`references/extended-guide.md`](references/extended-guide.md); read the relevant one when the task needs it:

- [Directory Structure and File Management](references/extended-guide.md#directory-structure-and-file-management)
- [Processing Pipeline: Sequential Phase Execution: Phase 2: Gather Input](references/extended-guide.md#phase-2-gather-input)
- [Processing Pipeline: Sequential Phase Execution: Phase 4: Tuning Data Lookup](references/extended-guide.md#phase-4-tuning-data-lookup)
- [Processing Pipeline: Sequential Phase Execution: Phase 5: Generate Tuning Report](references/extended-guide.md#phase-5-generate-tuning-report)
- [Processing Pipeline: Sequential Phase Execution: Phase 6: Final Review](references/extended-guide.md#phase-6-final-review)
