import importlib.util
import json
import os
from pathlib import Path
import struct
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
                         'Version="1.4.1"', 'Version="2.0.7"', 'Version="6.0.0"'):
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

    def test_workflows_sdk_migrates_to_fixed_version_and_is_idempotent(self):
        for version in ("1.2.0", "1.3.0", "1.4.0", "1.4.1"):
            with self.subTest(version=version):
                self.write(self.project, PROJECT.replace('Version="1.2.0"', f'Version="{version}"'))
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                root = migration.project_xml(self.project.read_text()).documentElement
                sdk = next(node for node in migration.elements(root, "PackageReference")
                           if node.getAttribute("Include") == "Microsoft.Azure.Workflows.Webjobs.Sdk")
                self.assertEqual(sdk.getAttribute("Version"), "1.4.1")
                before = self.snapshot()
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(before, self.snapshot())

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

    def test_case_variant_directory_guards_are_validated_before_insertion(self):
        for name in ("ensureoutputdirectory", "eNsUrEoUtPuTdIrEcToRy"):
            with self.subTest(name=name):
                guard = (f'<Target Name="{name}" BeforeTargets="FindFunctionJsonFolders">'
                         '<MakeDir Directories="$(OutputPath)" '
                         'Condition="!Exists(\'$(OutputPath)\')" /></Target>')
                self.write(self.project, PROJECT.replace("</Project>", guard + "</Project>"))
                result = self.run_cli("--ensure-output-directory", "--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                targets = migration.elements(
                    migration.project_xml(self.project.read_text()), "Target")
                guards = [node for node in targets
                          if node.getAttribute("Name").lower() == "ensureoutputdirectory"]
                self.assertEqual(len(guards), 1)
                self.assertEqual(guards[0].getAttribute("Name"), name)
                self.assertEqual(guards[0].getAttribute("BeforeTargets"),
                                 "DeleteFunctionJsonFoldersTarget")
                custom = f'<Target Name="{name}" BeforeTargets="Build"><Exec Command="custom" /></Target>'
                self.write(self.project, PROJECT.replace("</Project>", custom + "</Project>"))
                self.assert_blocked_unchanged("--ensure-output-directory")

    def test_refuses_case_variant_duplicate_directory_guards(self):
        guards = '<Target Name="ensureoutputdirectory" /><Target Name="eNsUrEoUtPuTdIrEcToRy" />'
        self.write(self.project, PROJECT.replace("</Project>", guards + "</Project>"))
        self.assert_blocked_unchanged("--ensure-output-directory")

    def test_custom_publication_hooks_block_new_publish_on_build(self):
        for hook in (
                '<Target Name="Upload" AfterTargets=" Pack ; pUbLiSh "><Exec Command="custom" /></Target>',
                '<Target Name="Upload" BeforeTargets="BeforePublish"><Exec Command="custom" /></Target>',
                '<Target Name="Publish"><Exec Command="custom" /></Target>',
                '<PropertyGroup><PublishDependsOn>Upload</PublishDependsOn></PropertyGroup>',
                '<Target Name="Upload" AfterTargets="$(CustomHook)"><Exec Command="custom" /></Target>'):
            with self.subTest(hook=hook):
                self.write(self.project, PROJECT.replace("</Project>", hook + "</Project>"))
                self.assert_blocked_unchanged()
                result = self.run_cli()
                self.assertEqual(result.returncode, 1)
                self.assertIn("publication hooks", result.stderr)

    def test_existing_publish_on_build_with_custom_publication_hook_is_reported(self):
        hooks = ('<Target Name="ExistingPublishHook" AfterTargets="Build">'
                 '<CallTarget Targets="Publish" /></Target>'
                 '<Target Name="Upload" AfterTargets="Publish"><Exec Command="custom" /></Target>')
        self.write(self.project, PROJECT.replace("</Project>", hooks + "</Project>"))
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Review custom publication hooks before any build", result.stdout)
        self.assertIn('AfterTargets="Publish"', self.project.read_text())
        self.assertNotIn("TriggerPublishOnBuild", self.project.read_text())

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
        for version in ("1.4.2", "1.5.0"):
            with self.subTest(version=version):
                self.write(self.project, PROJECT.replace('Version="1.2.0"', f'Version="{version}"'))
                self.assert_blocked_unchanged()

    def test_updates_case_variant_properties_in_place(self):
        expected = {
            "TargetFramework": "net10.0",
            "OutputType": "Library",
            "AzureFunctionsVersion": "v4",
            "LogicAppFolderToPublish": r"$(MSBuildProjectDirectory)\..\WorkflowHost",
            "CopyLocalLockFileAssemblies": "true",
        }
        for variant in (str.lower, str.swapcase):
            with self.subTest(variant=variant.__name__):
                text = PROJECT
                for name in expected:
                    text = text.replace(f"<{name}>", f"<{variant(name)}>")
                    text = text.replace(f"</{name}>", f"</{variant(name)}>")
                name = variant("CopyLocalLockFileAssemblies")
                text = text.replace("</Project>", f"<PropertyGroup><{name}>false</{name}>"
                                    "</PropertyGroup></Project>")
                self.write(self.project, text)
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                root = migration.project_xml(self.project.read_text()).documentElement
                for name, value in expected.items():
                    nodes = [node for node in root.getElementsByTagName("*")
                             if node.localName.lower() == name.lower()]
                    self.assertEqual(len(nodes), 1)
                    self.assertEqual(nodes[0].localName, variant(name))
                    self.assertEqual(migration.xml_value(nodes[0]), value)
                before = self.snapshot()
                result = self.run_cli("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(before, self.snapshot())

    def test_refuses_case_variant_duplicate_properties(self):
        for name, value in (
                ("TargetFramework", "net8.0"), ("OutputType", "Library"),
                ("AzureFunctionsVersion", "v4"),
                ("LogicAppFolderToPublish", r"$(MSBuildProjectDirectory)\..\WorkflowHost"),
                ("CopyLocalLockFileAssemblies", "false")):
            with self.subTest(name=name):
                text = PROJECT
                if name == "CopyLocalLockFileAssemblies":
                    text = text.replace("</PropertyGroup>", f"<{name}>{value}</{name}></PropertyGroup>")
                text = text.replace("</Project>", f"<PropertyGroup><{name.lower()}>{value}"
                                    f"</{name.lower()}></PropertyGroup></Project>")
                self.write(self.project, text)
                self.assert_blocked_unchanged()

    def test_refuses_case_variant_multitargeting_or_central_management(self):
        for property_xml in (
                "<TARGETFRAMEWORKS>net8.0;net10.0</TARGETFRAMEWORKS>",
                "<managepackageversionscentrally>true</managepackageversionscentrally>"):
            with self.subTest(property_xml=property_xml):
                text = PROJECT.replace("<PropertyGroup>", "<PropertyGroup>" + property_xml)
                self.write(self.project, text)
                self.assert_blocked_unchanged()

    def test_refuses_mixed_package_version_metadata(self):
        original = ('<PackageReference Include="Microsoft.Azure.Workflows.Webjobs.Sdk" '
                    'Version="1.2.0" />')
        for version, attributes, child in (
                ("1.2.0", "", "<Version>1.2.0</Version>"),
                ("1.4.1", "", "<Version>1.2.0</Version>"),
                ("1.2.0", "", "<Version>1.5.0</Version>"),
                ("1.2.0", "", '<Version Condition="\'$(Configuration)\' == \'Debug\'">1.2.0</Version>'),
                ("1.2.0", "", "<versionoverride>1.5.0</versionoverride>"),
                ("1.2.0", ' version="1.5.0"', ""),
                ("1.2.0", ' versionoverride="1.5.0"', "")):
            with self.subTest(version=version, attributes=attributes, child=child):
                reference = ('<PackageReference Include="Microsoft.Azure.Workflows.Webjobs.Sdk" '
                             f'Version="{version}"{attributes}>{child}</PackageReference>')
                self.write(self.project, PROJECT.replace(original, reference))
                self.assert_blocked_unchanged()

    def test_nonversion_package_metadata_is_preserved(self):
        original = ('<PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" '
                    'Version="1.15.1" />')
        reference = original.replace(" />", "><PrivateAssets>all</PrivateAssets>"
                                     "<OutputItemType>Analyzer</OutputItemType></PackageReference>")
        self.write(self.project, PROJECT.replace(original, reference))
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        root = migration.project_xml(self.project.read_text()).documentElement
        node = next(node for node in migration.elements(root, "PackageReference")
                    if node.getAttribute("Include") == "Microsoft.Azure.Functions.Worker.Sdk")
        self.assertEqual(node.getAttribute("Version"), "2.0.7")
        for name, value in (("PrivateAssets", "all"), ("OutputItemType", "Analyzer")):
            self.assertEqual(migration.xml_value(migration.elements(node, name)[0]), value)

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

    def test_linux_extended_attributes_are_copied_before_replacement(self):
        path = self.host / "local.settings.json"
        with patch.object(migration.sys, "platform", "linux"), \
                patch.object(migration.os, "listxattr", return_value=["system.posix_acl_access"],
                             create=True), \
                patch.object(migration.os, "getxattr", return_value=b"synthetic ACL", create=True), \
                patch.object(migration.os, "setxattr", create=True) as copy:
            migration.Plan.write(path, b'{"new": true}')
        copy.assert_called_once()
        self.assertEqual(copy.call_args.args[1:], ("system.posix_acl_access", b"synthetic ACL"))
        self.assertEqual(path.read_bytes(), b'{"new": true}')

    def test_unreadable_access_metadata_blocks_without_changes(self):
        before = self.snapshot()
        plan = migration.make_plan(self.root)
        with patch.object(migration.sys, "platform", "linux"), \
                patch.object(migration.os, "listxattr", side_effect=OSError("metadata unavailable"),
                             create=True):
            with self.assertRaises(migration.MigrationError):
                plan.apply()
        self.assertEqual(before, self.snapshot())

    def test_inherited_acl_removal_failure_blocks_without_changes(self):
        before = self.snapshot()
        plan = migration.make_plan(self.root)

        def attributes(path):
            return ["system.posix_acl_access"] if Path(path).name.startswith(".") else []

        with patch.object(migration.sys, "platform", "linux"), \
                patch.object(migration.os, "listxattr", side_effect=attributes, create=True), \
                patch.object(migration.os, "removexattr", side_effect=PermissionError("ACL removal denied"),
                             create=True):
            with self.assertRaises(migration.MigrationError):
                plan.apply()
        self.assertEqual(before, self.snapshot())

    def test_unsupported_posix_access_metadata_blocks_without_changes(self):
        before = self.snapshot()
        plan = migration.make_plan(self.root)
        with patch.object(migration.sys, "platform", "darwin"):
            with self.assertRaises(migration.MigrationError):
                plan.apply()
        self.assertEqual(before, self.snapshot())

    @unittest.skipUnless(sys.platform == "win32", "Windows ACL integration test")
    def test_windows_replacement_preserves_restricted_acl(self):
        path = self.host / "local.settings.json"
        result = subprocess.run(["icacls", str(path), "/inheritance:r", "/grant:r", "*S-1-3-4:F"],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        before = subprocess.check_output(["icacls", str(path)], text=True)
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(subprocess.check_output(["icacls", str(path)], text=True), before)

    @unittest.skipUnless(sys.platform == "linux", "Linux POSIX ACL integration test")
    def test_linux_replacement_preserves_restricted_acl_and_ownership(self):
        path = self.host / "local.settings.json"
        entries = ((1, 6, 0xffffffff), (2, 4, os.getuid() + 1),
                   (4, 0, 0xffffffff), (16, 4, 0xffffffff), (32, 0, 0xffffffff))
        acl = struct.pack("<I", 2) + b"".join(struct.pack("<HHI", *entry) for entry in entries)
        os.setxattr(path, "system.posix_acl_access", acl)
        before = path.stat()
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(os.getxattr(path, "system.posix_acl_access"), acl)
        after = path.stat()
        self.assertEqual((after.st_uid, after.st_gid, after.st_mode),
                         (before.st_uid, before.st_gid, before.st_mode))

    @unittest.skipUnless(sys.platform == "linux", "Linux inherited ACL integration test")
    def test_linux_replacement_clears_inherited_acl_when_source_has_none(self):
        path = self.host / "local.settings.json"
        path.chmod(0o640)
        self.assertNotIn("system.posix_acl_access", os.listxattr(path))
        before = path.stat()
        entries = ((1, 7, 0xffffffff), (2, 4, os.getuid() + 1),
                   (4, 0, 0xffffffff), (16, 4, 0xffffffff), (32, 0, 0xffffffff))
        default_acl = struct.pack("<I", 2) + b"".join(
            struct.pack("<HHI", *entry) for entry in entries)
        os.setxattr(self.host, "system.posix_acl_default", default_acl)
        with tempfile.NamedTemporaryFile(dir=self.host) as temporary:
            self.assertIn("system.posix_acl_access", os.listxattr(temporary.name))
            migration.Plan.copy_access(path, temporary.name)
            self.assertNotIn("system.posix_acl_access", os.listxattr(temporary.name))
        result = self.run_cli("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("system.posix_acl_access", os.listxattr(path))
        after = path.stat()
        self.assertEqual((after.st_uid, after.st_gid, after.st_mode),
                         (before.st_uid, before.st_gid, before.st_mode))


if __name__ == "__main__":
    unittest.main()
