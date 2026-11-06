import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "migrate.py"
SPEC = importlib.util.spec_from_file_location("migration", SCRIPT)
migration = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(migration)


PROJECT = """<Project Sdk="Microsoft.NET.Sdk">
  <!-- preserve project intent -->
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <OutputType>Library</OutputType>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\WorkflowHost</LogicAppFolderToPublish>
    <AssemblyName>Original.Identity</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Workflows.Webjobs.Sdk" Version="1.2.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.15.1" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="6.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="6.0.0" />
    <PackageReference Include="Unrelated.Library" Version="3.4.5" />
  </ItemGroup>
</Project>
"""


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="logicapps-net10-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / "CodeLibrary" / "BusinessRules.csproj"
        self.host = self.root / "WorkflowHost"
        self.write(self.project, PROJECT)
        self.write(self.host / "host.json", json.dumps({
            "version": "2.0",
            "extensionBundle": {"id": "Microsoft.Azure.Functions.ExtensionBundle.Workflows",
                                "version": "[1.*, 2.0.0)"},
        }))
        settings = {
            "IsEncrypted": False,
            "Values": {"APP_KIND": "workflowapp", "FUNCTIONS_WORKER_RUNTIME": "dotnet",
                       "FUNCTIONS_INPROC_NET8_ENABLED": "1",
                       "AzureWebJobsFeatureFlags": "EnableMultiLanguageWorker",
                       "ProjectDirectoryPath": str(self.host),
                       "AzureWebJobsStorage": "SENSITIVE-TEST-SENTINEL",
                       "LOGIC_APPS_CUSTOMCODE_DOTNETVERSION": "net8"},
        }
        self.write(self.host / "local.settings.json", json.dumps(settings, indent=2))
        self.write(self.project.parent / ".vscode" / "settings.json",
                   '{\n  // keep editor comment\n  "azureFunctions.deploySubpath": '
                   '"out/Release/net8.0/publish",\n  "unrelated": true,\n}\n')
        self.write(self.host / ".vscode" / "launch.json", """{
  "version": "0.2.0",
  "configurations": [
    // keep existing debugger
    {"name": "Original attach", "type": "coreclr", "request": "attach"},
  ],
}
""")
        self.write(self.root / "Solution.code-workspace", '{"folders": []}')
        self.write(self.project.parent / "Untouched.cs", "// synthetic source: never edit\n")
        for parent in (self.project.parent, self.host):
            self.write(parent / ".vscode" / "tasks.json", '{"tasks": []}')

    @staticmethod
    def write(path, text):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))

    def snapshot(self):
        return {path.relative_to(self.root): path.read_bytes()
                for path in self.root.rglob("*") if path.is_file()}

    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root), *args],
                              capture_output=True, text=True, check=False)

    def assert_blocked_unchanged(self, *args):
        before = self.snapshot()
        result = self.run_cli("--apply", *args)
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("BLOCKED:", result.stderr)
        self.assertEqual(before, self.snapshot())
        self.assertNotIn("SENSITIVE-TEST-SENTINEL", result.stdout + result.stderr)

    def test_dry_run_is_read_only_and_does_not_log_settings(self):
        before = self.snapshot()
        result = self.run_cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("DRY RUN", result.stdout)
        self.assertNotIn("SENSITIVE-TEST-SENTINEL", result.stdout)
        self.assertIn("Cloud prerequisite (not applied)", result.stdout)
        self.assertIn("LOGIC_APPS_CUSTOMCODE_DOTNETVERSION=net10.0", result.stdout)
        self.assertEqual(before, self.snapshot())

    def test_apply_generic_layout_preserves_identity_and_unrelated_files(self):
        before = self.snapshot()
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        after = self.snapshot()
        changed = {name for name in before if before[name] != after[name]}
        self.assertEqual(changed, {
            self.project.relative_to(self.root),
            (self.host / "local.settings.json").relative_to(self.root),
            (self.project.parent / ".vscode" / "settings.json").relative_to(self.root),
        })
        xml = self.project.read_text()
        for expected in ("<TargetFramework>net10.0</TargetFramework>", "Original.Identity",
                         "Unrelated.Library", "preserve project intent",
                         'Version="1.4.0"', 'Version="2.0.7"', 'Version="6.0.0"'):
            self.assertIn(expected, xml)
        for optional in ("ApplicationInsights", "Http.AspNetCore", "FrameworkReference",
                         'Include="Microsoft.Azure.Functions.Worker"', "EnsureOutputDirectory"):
            self.assertNotIn(optional, xml)
        values = json.loads((self.host / "local.settings.json").read_text())["Values"]
        self.assertEqual(values["LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"], "net10.0")
        self.assertEqual(values["FUNCTIONS_INPROC_NET8_ENABLED"], "1")
        self.assertEqual(values["AzureWebJobsStorage"], "SENSITIVE-TEST-SENTINEL")
        editor = (self.project.parent / ".vscode" / "settings.json").read_text()
        self.assertIn("// keep editor comment", editor)
        self.assertIn("out/Release/net10.0/publish", editor)
        launch = (self.host / ".vscode" / "launch.json").read_text()
        self.assertIn("// keep existing debugger", launch)
        configs = migration.Jsonc(launch).root.value["configurations"]
        self.assertEqual(configs[0]["name"], "Original attach")
        self.assertEqual(len(configs), 1)

    def test_rerun_is_idempotent(self):
        self.assertEqual(self.run_cli("--apply").returncode, 0)
        before = self.snapshot()
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("0 configuration file(s) updated", result.stdout)
        self.assertEqual(before, self.snapshot())

    def test_existing_integrated_launcher_preserves_internal_comments(self):
        launch = self.host / ".vscode" / "launch.json"
        self.write(launch, """{
  "configurations": [{
    // keep integrated comment
    "name": "My launcher",
    "type": "logicapp",
    "request": "launch",
    "funcRuntime": "coreclr",
    "customCodeRuntime": "coreclr",
    "customProperty": true,
  }],
}
""")
        result = self.run_cli("--integrated-debug", "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        text = launch.read_text()
        self.assertIn("// keep integrated comment", text)
        self.assertEqual(migration.Jsonc(text).root.value["configurations"][0]["customProperty"], True)

    def test_bom_crlf_and_missing_runtime_selector_are_preserved(self):
        settings = self.host / "local.settings.json"
        value = json.loads(settings.read_text())
        del value["Values"]["LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"]
        settings.write_bytes(b"\xef\xbb\xbf" + json.dumps(value, indent=2).replace("\n", "\r\n").encode())
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = settings.read_bytes()
        self.assertTrue(data.startswith(b"\xef\xbb\xbf"))
        self.assertNotIn(b"\n", data.replace(b"\r\n", b""))
        self.assertEqual(migration.Jsonc(data.decode("utf-8-sig")).root.value["Values"]
                         ["LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"], "net10.0")

    def test_compact_settings_insert_missing_runtime_selector(self):
        path = self.host / "local.settings.json"
        expected = json.loads(path.read_text())
        del expected["Values"]["LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"]
        self.write(path, json.dumps(expected, separators=(",", ":")))
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        expected["Values"]["LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"] = "net10.0"
        self.assertEqual(json.loads(path.read_text()), expected)
        before = self.snapshot()
        self.assertEqual(self.run_cli("--apply").returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_compact_launch_appends_integrated_debugger(self):
        path = self.host / ".vscode" / "launch.json"
        original = {"name": "Original attach", "type": "coreclr", "request": "attach"}
        self.write(path, json.dumps({"version": "0.2.0", "configurations": [original]},
                                   separators=(",", ":")))
        result = self.run_cli("--integrated-debug", "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        launch = json.loads(path.read_text())
        self.assertEqual(launch["version"], "0.2.0")
        self.assertEqual(len(launch["configurations"]), 2)
        self.assertEqual(launch["configurations"][0], original)
        integrated = launch["configurations"][1]
        for key, value in (("type", "logicapp"), ("request", "launch"),
                           ("funcRuntime", "coreclr"), ("customCodeRuntime", "coreclr"),
                           ("isCodeless", True)):
            self.assertEqual(integrated[key], value)
        before = self.snapshot()
        self.assertEqual(self.run_cli("--integrated-debug", "--apply").returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_project_crlf_is_preserved(self):
        self.project.write_bytes(PROJECT.replace("\n", "\r\n").encode())
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = self.project.read_bytes()
        self.assertNotIn(b"\n", data.replace(b"\r\n", b""))

    def test_missing_editor_files_do_not_create_empty_settings(self):
        editor = self.project.parent / ".vscode" / "settings.json"
        launch = self.host / ".vscode" / "launch.json"
        editor.unlink()
        launch.unlink()
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(editor.exists())
        self.assertFalse(launch.exists())
        result = self.run_cli("--integrated-debug", "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(launch.read_text())["version"], "0.2.0")

    def test_integrated_debug_option_is_independent_of_build_guard(self):
        result = self.run_cli("--integrated-debug", "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        configs = migration.Jsonc((self.host / ".vscode" / "launch.json").read_text()).root.value[
            "configurations"]
        self.assertEqual(configs[0]["name"], "Original attach")
        self.assertEqual(configs[1]["type"], "logicapp")
        self.assertEqual(configs[1]["customCodeRuntime"], "coreclr")
        self.assertNotIn("EnsureOutputDirectory", self.project.read_text())

    def test_clean_build_guard_option_preserves_debugger_and_dependencies(self):
        launch = self.host / ".vscode" / "launch.json"
        original_launch = launch.read_bytes()
        result = self.run_cli("--ensure-output-directory", "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        xml = self.project.read_text()
        self.assertIn('BeforeTargets="DeleteFunctionJsonFoldersTarget"', xml)
        self.assertIn('Directories="$(MSBuildProjectDirectory)\\bin\\$(Configuration)\\$(TargetFramework)"',
                      xml)
        self.assertNotIn('Include="Microsoft.Azure.Functions.Worker"', xml)
        self.assertEqual(original_launch, launch.read_bytes())

    def test_optional_changes_are_dry_run_safe_and_idempotent(self):
        flags = ("--ensure-output-directory", "--integrated-debug")
        before = self.snapshot()
        self.assertEqual(self.run_cli(*flags).returncode, 0)
        self.assertEqual(before, self.snapshot())
        result = self.run_cli(*flags, "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        before = self.snapshot()
        result = self.run_cli(*flags, "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("0 configuration file(s) updated", result.stdout)
        self.assertEqual(before, self.snapshot())

    def test_repairs_known_ineffective_directory_hook(self):
        guard = """<Target Name="EnsureOutputDirectory" BeforeTargets="FindFunctionJsonFolders">
    <MakeDir Directories="$(OutputPath)" Condition="!Exists('$(OutputPath)')" />
  </Target>"""
        self.write(self.project, PROJECT.replace("</Project>", guard + "\n</Project>"))
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('BeforeTargets="DeleteFunctionJsonFoldersTarget"', self.project.read_text())
        self.assertNotIn('Directories="$(OutputPath)"', self.project.read_text())

    def test_refuses_custom_output_directory_target(self):
        guard = '<Target Name="EnsureOutputDirectory" BeforeTargets="Build"><Exec Command="custom" /></Target>'
        self.write(self.project, PROJECT.replace("</Project>", guard + "</Project>"))
        self.assert_blocked_unchanged()

    def test_preserves_case_variant_publish_hooks(self):
        for after_targets, call_targets in (
                ("build", "publish"),
                ("bUiLd", "pUbLiSh"),
                (" BeforeBuild ; Build ", " BeforePublish ; Publish ")):
            with self.subTest(after_targets=after_targets, call_targets=call_targets):
                hook = (f'<Target Name="ExistingPublishHook" AfterTargets="{after_targets}">'
                        f'<CallTarget Targets="{call_targets}" /></Target>')
                self.write(self.project, PROJECT.replace("</Project>", hook + "</Project>"))
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                targets = migration.elements(
                    migration.project_xml(self.project.read_text()), "Target")
                self.assertEqual([node.getAttribute("Name") for node in targets],
                                 ["ExistingPublishHook"])
                self.assertEqual(targets[0].getAttribute("AfterTargets"), after_targets)
                call = migration.elements(targets[0], "CallTarget")[0]
                self.assertEqual(call.getAttribute("Targets"), call_targets)

    def test_refuses_case_variant_publish_target_conflict(self):
        hook = ('<Target Name="triggerpublishonbuild" AfterTargets="Build">'
                '<CallTarget Targets="Pack" /></Target>')
        self.write(self.project, PROJECT.replace("</Project>", hook + "</Project>"))
        self.assert_blocked_unchanged()

    def test_unrecognized_deployment_paths_are_preserved_and_reported_without_values(self):
        path = self.project.parent / ".vscode" / "settings.json"
        for suffix in (r"custom\publish", r"out\Release\net48\publish"):
            with self.subTest(suffix=suffix):
                self.write(path, json.dumps({
                    "azureFunctions.deploySubpath": "SENSITIVE-TEST-SENTINEL\\" + suffix,
                }))
                before = path.read_bytes()
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(path.read_bytes(), before)
                self.assertIn("No recognized net8/net8.0 or net10.0 deployment-path component",
                              result.stdout)
                self.assertNotIn("SENSITIVE-TEST-SENTINEL", result.stdout + result.stderr)

    def test_preserves_newer_worker_and_logging_versions(self):
        text = PROJECT.replace('Version="1.15.1"', 'Version="2.0.8"')
        text = text.replace('Version="6.0.0"', 'Version="10.0.1"')
        text = text.replace("</ItemGroup>",
                            '<PackageReference Include="Microsoft.Azure.Functions.Worker" '
                            'Version="2.52.0" /></ItemGroup>')
        self.write(self.project, text)
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        xml = self.project.read_text()
        for version in ("2.0.8", "10.0.1", "2.52.0"):
            self.assertIn(f'Version="{version}"', xml)

    def test_existing_worker_aligns_dependent_logging_pins(self):
        text = PROJECT.replace(
            "</ItemGroup>",
            '<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.20.0" />'
            "</ItemGroup>")
        self.write(self.project, text)
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        xml = self.project.read_text()
        self.assertIn('Include="Microsoft.Azure.Functions.Worker" Version="2.51.0"', xml)
        self.assertIn('Include="Microsoft.Extensions.Logging" Version="10.0.0"', xml)
        self.assertIn('Include="Microsoft.Extensions.Logging.Abstractions" Version="10.0.0"', xml)

    def test_refuses_newer_unreviewed_workflows_sdk(self):
        self.write(self.project, PROJECT.replace('Version="1.2.0"', 'Version="1.5.0"'))
        self.assert_blocked_unchanged()

    def test_refuses_conditional_or_central_configuration(self):
        for text in (PROJECT.replace("<PropertyGroup>", '<PropertyGroup Condition="true">'),
                     PROJECT.replace('Version="1.2.0"', ""),
                     PROJECT.replace("<PropertyGroup>",
                                     "<PropertyGroup><ManagePackageVersionsCentrally>true"
                                     "</ManagePackageVersionsCentrally>")):
            with self.subTest(text=text[:60]):
                self.write(self.project, text)
                self.assert_blocked_unchanged()

    def test_refuses_inherited_sdk_pin(self):
        self.write(self.root / "global.json", '{"sdk":{"version":"8.0.100"}}')
        self.assert_blocked_unchanged()

    def test_refuses_host_destination_outside_solution(self):
        text = PROJECT.replace("$(MSBuildProjectDirectory)\\..\\WorkflowHost",
                               "$(MSBuildProjectDirectory)\\..\\..\\ExternalHost")
        self.write(self.project, text)
        self.assert_blocked_unchanged()

    def test_refuses_stale_project_directory_after_relocation(self):
        path = self.host / "local.settings.json"
        settings = json.loads(path.read_text())
        settings["Values"]["ProjectDirectoryPath"] = str(self.root / "OldHost")
        self.write(path, json.dumps(settings))
        self.assert_blocked_unchanged()

    def test_refuses_ambiguous_integrated_debuggers(self):
        path = self.host / ".vscode" / "launch.json"
        config = {"type": "logicapp", "request": "launch", "funcRuntime": "coreclr"}
        self.write(path, json.dumps({"version": "0.2.0", "configurations": [config, config]}))
        self.assert_blocked_unchanged("--integrated-debug")
        original_launch = path.read_bytes()
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(original_launch, path.read_bytes())

    def test_refuses_encrypted_settings(self):
        path = self.host / "local.settings.json"
        self.write(path, path.read_text().replace('"IsEncrypted": false', '"IsEncrypted": true'))
        self.assert_blocked_unchanged()

    def test_refuses_invalid_and_duplicate_json_keys_without_writes(self):
        path = self.host / ".vscode" / "launch.json"
        for text in ('{"configurations": [}', '{"configurations": [], "configurations": []}'):
            with self.subTest(text=text):
                self.write(path, text)
                self.assert_blocked_unchanged()

    def test_explicit_project_selection_for_multiple_projects(self):
        self.write(self.project.parent / "Second.csproj", PROJECT)
        self.assert_blocked_unchanged()
        result = self.run_cli("--project", str(self.project), "--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.project.parent / "Second.csproj").read_text(), PROJECT)

    def test_concurrent_change_blocks_apply(self):
        plan = migration.make_plan(self.root)
        path = self.host / "host.json"
        self.write(path, path.read_text() + "\n")
        before = self.snapshot()
        with self.assertRaises(migration.MigrationError):
            plan.apply()
        self.assertEqual(before, self.snapshot())

    def test_write_failure_rolls_back_completed_changes(self):
        plan = migration.make_plan(self.root)
        before = self.snapshot()
        original_write = plan.write
        calls = 0

        def fail_second_write(path, data):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("synthetic write failure")
            original_write(path, data)

        with patch.object(plan, "write", side_effect=fail_second_write):
            with self.assertRaises(migration.MigrationError):
                plan.apply()
        self.assertEqual(before, self.snapshot())


if __name__ == "__main__":
    unittest.main()
