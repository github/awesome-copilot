---
name: ssma-console
description: "Use when: SSMA console operations — create project, generate assessment report, convert schema, migrate data, Oracle to SQL Server migration, schema conversion, data migration"
---

# SSMA Console — Oracle to SQL Server Migration

Generate XML configs and invoke `SSMAforOracleConsole.exe` directly — no external scripts or wrappers.

**Operations** (run in order for "full migration"):
1. **create-project** — connect source & target, map schema
2. **generate-report** — assessment report
3. **migrate-schema** — convert & deploy schema
4. **migrate-data** — convert, deploy, migrate data end-to-end

## Collect Inputs

Ask for missing parameters. Defaults in parentheses.

**Oracle**: Host (`localhost`), Port (`1521`), Instance *(required, service name)*, User, Password, Schema
**SQL Server**: Server, Database, User, Password, Encrypt (`true`), Trust Server Certificate (`true`), Target Schema (`dbo`)
**Project**: Name (`ssma-migration`), Folder (`.`), Type (`sql-server-2022` — also `2016`/`2017`/`2019`/`2025`/`sql-azure`), SSMA Path (`C:\Program Files\Microsoft SQL Server Migration Assistant for Oracle\bin\SSMAforOracleConsole.exe`)

## Generate XML Files

Resolve ALL `{PLACEHOLDER}` tokens before writing. Generate 3 files:

### `ssma-variables.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<variables>
  <variable name="$WorkingFolder$" value="{PROJECT_FOLDER}" />
  <variable name="$ProjectType$" value="{PROJECT_TYPE}" />
  <variable name="$ProjectName$" value="{PROJECT_NAME}" />
  <variable-group name="OracleConnection">
    <variable name="$OracleHostName$" value="{ORACLE_HOST}" />
    <variable name="$OracleInstance$" value="{ORACLE_INSTANCE}" />
    <variable name="$OraclePort$" value="{ORACLE_PORT}" />
    <variable name="$OracleUserName$" value="{ORACLE_USER}" />
    <variable name="$OraclePassword$" value="{ORACLE_PASSWORD}" />
    <variable name="$OracleSchemaName$" value="{ORACLE_SCHEMA}" />
  </variable-group>
  <variable-group name="SQLServerConnection">
    <variable name="$SQLServerName$" value="{SQL_SERVER}" />
    <variable name="$SQLServerDb$" value="{SQL_DATABASE}" />
    <variable name="$SQLServerUsrID$" value="{SQL_USER}" />
    <variable name="$SQLServerPwd$" value="{SQL_PASSWORD}" />
  </variable-group>
  <variable-group name="ReportSettings">
    <variable name="$SummaryReportFile$" value="Reports\Assessment\AssessmentReport.xml" />
    <variable name="$ConversionReportFile$" value="Reports\Conversion\ConversionReport.xml" />
    <variable name="$ConversionReportFolder$" value="Reports\Conversion" />
    <variable name="$DataMigrationReportFile$" value="Reports\Migration\DataMigrationReport.xml" />
    <variable name="$SynchronizationReportFolder$" value="Reports\Synchronization" />
  </variable-group>
</variables>
```

### `ssma-servers.xml`

**CRITICAL**: Use `tns-name-mode` — `standard-mode` treats instance as SID and fails with ORA-12505.

```xml
<?xml version="1.0" encoding="utf-8"?>
<servers>
  <oracle name="source_oracle">
    <tns-name-mode>
      <connection-provider value="OracleClient" />
      <service-name value="(DESCRIPTION =(ADDRESS_LIST =(ADDRESS = (PROTOCOL = TCP)(HOST = $OracleHostName$)(PORT = $OraclePort$)))(CONNECT_DATA =(SERVICE_NAME = $OracleInstance$)))" />
      <user-id value="$OracleUserName$" />
      <password value="$OraclePassword$" />
    </tns-name-mode>
  </oracle>
  <sql-server name="target_sqlserver">
    <sql-server-authentication>
      <server value="$SQLServerName$" />
      <database value="$SQLServerDb$" />
      <user-id value="$SQLServerUsrID$" />
      <password value="$SQLServerPwd$" />
      <encrypt value="{ENCRYPT}" />
      <trust-server-certificate value="{TRUST_CERT}" />
    </sql-server-authentication>
  </sql-server>
</servers>
```

### Operation Script XML

Generate one script per operation. All scripts share this common `<config>` block (add `<object-overwrite action="overwrite" />` for migrate-schema/migrate-data, add `<data-migration-connection source-use-last-used="true" target-server="target_sqlserver" />` for migrate-data, use `every-5%` progress for schema/data ops):

```xml
<config>
  <output-providers>
    <output-window suppress-messages="false" destination="stdout" />
    <upgrade-project action="yes" />
    <user-input-popup mode="continue" />
    <progress-reporting enable="true" report-messages="true" report-progress="every-10%" />
    <log-verbosity level="info" />
  </output-providers>
</config>
```

All scripts start with this **preamble** in `<script-commands>`:

```xml
<create-new-project project-folder="$WorkingFolder$" project-name="$ProjectName$"
                    overwrite-if-exists="true" project-type="$ProjectType$" />
<connect-source-database server="source_oracle">
  <object-to-collect object-name="$OracleSchemaName$" />
</connect-source-database>
```

**CRITICAL**: Always include `<object-to-collect>` — without it, `map-schema` fails with "Source namespace was not found".

**Per-operation commands** (after preamble, before `<save-project />`):

| Operation | File | Commands after preamble |
|-----------|------|------------------------|
| create-project | `ssma-create-project.xml` | `connect-target-database` → `map-schema source-schema="$OracleSchemaName$" sql-server-schema="$SQLServerDb$.{TARGET_SCHEMA}"` |
| generate-report | `ssma-assessment.xml` | `generate-assessment-report object-name="$OracleSchemaName$" object-type="Schemas" write-summary-report-to="$SummaryReportFile$" verbose="true" report-errors="true"` |
| migrate-schema | `ssma-schema.xml` | `connect-target-database` → `map-schema` → `convert-schema` (to `$ConversionReportFile$`) → `synchronize-target object-name="$SQLServerDb$.{TARGET_SCHEMA}"` |
| migrate-data | `ssma-data.xml` | Same as migrate-schema + `refresh-from-database` → `migrate-data object-name="$OracleSchemaName$.Tables" object-type="category"` (to `$DataMigrationReportFile$`) → `close-project` |

## Execute

Show resolved XML and command to user. Confirm before running.

```powershell
New-Item -ItemType Directory -Force -Path "Reports\Assessment","Reports\Conversion","Reports\Migration","Reports\Synchronization","Logs" | Out-Null
& "{SSMA_CONSOLE_PATH}" -s "{SCRIPT_XML}" -c "ssma-servers.xml" -v "ssma-variables.xml" -l "Logs\{OPERATION}.log"
```

## Report Results

Check exit code (`0` = success), read logs and reports (`Reports\Assessment\`, `Reports\Conversion\`, `Reports\Migration\`), summarize findings.

## Constraints

- No external scripts — no `.ps1`, `.bat`, `.sh`
- Confirm connection details before executing
- Resolve all placeholders — no `{...}` in final XML
- Create output directories before execution

## Known Pitfalls

| Symptom | Fix |
|---------|-----|
| `ORA-12505: SID not registered` | Use `tns-name-mode`, not `standard-mode` |
| `Source namespace was not found` | Add `<object-to-collect>` to `connect-source-database` |
| `not found in metabase` on `force-load` | Use `object-to-collect` instead — `force-load` is unreliable |
| `SQL Server Agent is not running` | Warning only — BCP client-side migration still works |
