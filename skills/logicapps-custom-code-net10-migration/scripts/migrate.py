"""Offline, guarded configuration migration for Logic Apps local-function libraries."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from xml.dom import Node as XmlNode, minidom
from xml.parsers.expat import ExpatError


class MigrationError(Exception):
    pass


class Node:
    def __init__(self, value, start, end, depth, children=None, trailing=False):
        self.value, self.start, self.end, self.depth = value, start, end, depth
        self.children, self.trailing = children, trailing


class Jsonc:
    """Parse JSONC while retaining token positions for minimal text edits."""

    token = re.compile(
        r'\s+|//[^\r\n]*|/\*[\s\S]*?\*/|"(?:[^"\\\x00-\x1f]|\\.)*"'
        r'|[{}\[\]:,]|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?'
    )

    def __init__(self, text):
        self.text, self.tokens, self.index = text, [], 0
        position = 0
        while position < len(text):
            match = self.token.match(text, position)
            if not match:
                raise MigrationError("Invalid JSON/JSONC syntax; no settings values logged.")
            raw = match.group()
            if not raw.isspace() and not raw.startswith(("//", "/*")):
                self.tokens.append((raw, match.start(), match.end()))
            position = match.end()
        self.root = self.parse(0)
        if self.index != len(self.tokens):
            raise MigrationError("Unexpected trailing JSON/JSONC content.")

    def take(self, expected=None):
        if self.index >= len(self.tokens):
            raise MigrationError("Incomplete JSON/JSONC configuration.")
        token = self.tokens[self.index]
        self.index += 1
        if expected is not None and token[0] != expected:
            raise MigrationError("Invalid JSON/JSONC structure.")
        return token

    def peek(self):
        return self.tokens[self.index][0] if self.index < len(self.tokens) else None

    def parse(self, depth):
        raw, start, end = self.take()
        if raw not in ("{", "["):
            try:
                value = json.loads(raw)
            except json.JSONDecodeError as error:
                raise MigrationError("Invalid JSON value; content withheld.") from error
            return Node(value, start, end, depth)
        object_mode = raw == "{"
        close = "}" if object_mode else "]"
        children = {} if object_mode else []
        trailing = False
        while self.peek() != close:
            key = None
            if object_mode:
                key_token = self.take()[0]
                if not key_token.startswith('"'):
                    raise MigrationError("JSON object key must be a string.")
                key = json.loads(key_token)
                if key in children:
                    raise MigrationError("Duplicate JSON keys require manual review.")
                self.take(":")
            child = self.parse(depth + 1)
            if object_mode:
                children[key] = child
            else:
                children.append(child)
            if self.peek() == close:
                break
            self.take(",")
            trailing = self.peek() == close
        _, _, end = self.take(close)
        value = ({key: child.value for key, child in children.items()} if object_mode
                 else [child.value for child in children])
        return Node(value, start, end, depth, children, trailing)

    def locate(self, path):
        node = self.root
        for key in path:
            if isinstance(node.children, dict) and key in node.children:
                node = node.children[key]
            elif (isinstance(node.children, list) and isinstance(key, int)
                  and 0 <= key < len(node.children)):
                node = node.children[key]
            else:
                return None
        return node

    def set(self, path, value):
        node = self.locate(path)
        if node is not None:
            if node.value == value:
                return self.text
            return self.text[:node.start] + json.dumps(value) + self.text[node.end:]
        parent = self.locate(path[:-1])
        if parent is None or not isinstance(parent.children, dict):
            raise MigrationError("Missing/non-object settings container requires manual review.")
        return self.append(parent, value, path[-1])

    def append(self, node, value, key=None):
        if key is None and not isinstance(node.children, list):
            raise MigrationError("Debugger configurations must be an array.")
        newline = "\r\n" if "\r\n" in self.text else "\n"
        unit_match = re.search(r'(?m)^([ \t]+)"', self.text)
        unit = unit_match.group(1) if unit_match else "  "
        indent, closing_indent = unit * (node.depth + 1), unit * node.depth
        encoded = json.dumps(value, indent=len(unit), ensure_ascii=False)
        encoded = encoded.replace("\n", newline + indent)
        member = (json.dumps(key) + ": " if key is not None else "") + encoded
        close = node.end - 1
        line_start = self.text.rfind("\n", 0, close) + 1
        if not self.text[line_start:close].strip():
            position, addition = line_start, indent + member + newline
        else:
            position, addition = close, newline + indent + member + newline + closing_indent
        edits = []
        children = list(node.children.values()) if isinstance(node.children, dict) else node.children
        if children and not node.trailing:
            comma_position = children[-1].end
            if comma_position == position:
                addition = "," + addition
            else:
                edits.append((comma_position, comma_position, ","))
        edits.append((position, position, addition))
        result = self.text
        for start, end, replacement in sorted(edits, reverse=True):
            result = result[:start] + replacement + result[end:]
        Jsonc(result)
        return result


def elements(parent, name, *, case_insensitive=False):
    return [node for node in parent.getElementsByTagName("*")
            if node.localName == name
            or (case_insensitive and node.localName.lower() == name.lower())]


def xml_value(node):
    if any(child.nodeType == XmlNode.ELEMENT_NODE for child in node.childNodes):
        raise MigrationError("Nested XML value requires manual review.")
    return "".join(child.data for child in node.childNodes if child.nodeType == XmlNode.TEXT_NODE).strip()


def unconditional(node):
    current = node
    while current.nodeType == XmlNode.ELEMENT_NODE:
        if current.hasAttribute("Condition"):
            raise MigrationError("Conditional project configuration requires manual review.")
        current = current.parentNode


def stable_version(value):
    if not re.fullmatch(r"\d+\.\d+\.\d+", value):
        raise MigrationError("Package expressions/ranges/prereleases require manual review.")
    return tuple(map(int, value.split(".")))


def project_xml(text):
    if "<!DOCTYPE" in text.upper():
        raise MigrationError("XML DTDs are not supported.")
    try:
        document = minidom.parseString(text)
    except ExpatError as error:
        raise MigrationError("Invalid project XML.") from error
    return document


def update_project(text, notes, ensure_output_directory=False):
    document = project_xml(text)
    root = document.documentElement
    if root.localName != "Project" or root.getAttribute("Sdk") != "Microsoft.NET.Sdk":
        raise MigrationError("Expected an SDK-style Microsoft.NET.Sdk library.")
    if (elements(root, "Import") or elements(root, "TargetFrameworks", case_insensitive=True)
            or elements(root, "ManagePackageVersionsCentrally", case_insensitive=True)):
        raise MigrationError("Imported, multi-targeted or centrally managed projects require manual review.")
    newline = "\r\n" if "\r\n" in text else "\n"

    def new_element(name):
        return document.createElementNS(root.namespaceURI, name)

    def add(parent, node, depth):
        last = parent.lastChild
        if last is not None and last.nodeType == XmlNode.TEXT_NODE and not last.data.strip():
            parent.insertBefore(document.createTextNode(newline + "  " * depth), last)
            parent.insertBefore(node, last)
        else:
            parent.appendChild(document.createTextNode(newline + "  " * depth))
            parent.appendChild(node)
            parent.appendChild(document.createTextNode(newline + "  " * (depth - 1)))
        return node

    def group(name):
        groups = [node for node in elements(root, name)
                  if node.parentNode == root and not node.hasAttribute("Condition")]
        return groups[0] if groups else add(root, new_element(name), 1)

    def property_node(name, required=False):
        nodes = elements(root, name, case_insensitive=True)
        if len(nodes) > 1 or (required and not nodes):
            raise MigrationError(f"Expected one direct {name} property.")
        if nodes:
            node = nodes[0]
            unconditional(node)
            if node.parentNode.localName != "PropertyGroup" or node.parentNode.parentNode != root:
                raise MigrationError(f"{name} is not a direct project property.")
            return node
        return add(group("PropertyGroup"), new_element(name), 2)

    def set_text(node, value):
        for child in list(node.childNodes):
            node.removeChild(child)
        node.appendChild(document.createTextNode(value))

    framework = property_node("TargetFramework", True)
    if xml_value(framework) not in ("net8", "net8.0", "net10.0"):
        raise MigrationError("Only .NET 8 local-function libraries (or reruns on net10.0) are supported.")
    if xml_value(property_node("OutputType", True)).lower() != "library":
        raise MigrationError("Custom code must remain a library.")
    if xml_value(property_node("AzureFunctionsVersion", True)) != "v4":
        raise MigrationError("Expected the existing Functions v4 project contract.")
    property_node("LogicAppFolderToPublish", True)
    set_text(framework, "net10.0")
    set_text(property_node("CopyLocalLockFileAssemblies"), "true")

    def package(name, version, required=False, exact=False):
        refs = [node for node in elements(root, "PackageReference")
                if node.getAttribute("Include").lower() == name.lower()
                or node.getAttribute("Update").lower() == name.lower()]
        if len(refs) > 1 or (required and not refs):
            raise MigrationError(f"Expected one direct {name} PackageReference.")
        if refs:
            node = refs[0]
            unconditional(node)
            if node.parentNode.localName != "ItemGroup" or node.parentNode.parentNode != root:
                raise MigrationError(f"{name} is not a direct package reference.")
            version_attributes = [attribute for attribute in node.attributes.keys()
                                  if attribute.lower() in ("version", "versionoverride")]
            if (not node.hasAttribute("Include") or version_attributes != ["Version"]
                    or any(child.nodeType == XmlNode.ELEMENT_NODE
                           and child.localName.lower() in ("version", "versionoverride")
                           for child in node.childNodes)):
                raise MigrationError(f"Central/child-element version for {name} needs manual review.")
            current = stable_version(node.getAttribute("Version"))
            baseline = stable_version(version)
            if exact and current > baseline:
                raise MigrationError("Newer Workflows SDK targets require review; refusing to downgrade.")
            if current >= baseline:
                return
        else:
            node = new_element("PackageReference")
            node.setAttribute("Include", name)
            add(group("ItemGroup"), node, 2)
        node.setAttribute("Version", version)

    package("Microsoft.Azure.Workflows.Webjobs.Sdk", "1.4.1", True, True)
    package("Microsoft.Azure.Functions.Worker.Sdk", "2.0.7", True)
    has_worker = any(
        node.getAttribute(attribute).lower() == "microsoft.azure.functions.worker"
        for node in elements(root, "PackageReference") for attribute in ("Include", "Update")
    )
    if has_worker:
        package("Microsoft.Azure.Functions.Worker", "2.51.0")
        for name in ("Microsoft.Extensions.Logging", "Microsoft.Extensions.Logging.Abstractions"):
            if any(node.getAttribute(attribute).lower() == name.lower()
                   for node in elements(root, "PackageReference") for attribute in ("Include", "Update")):
                package(name, "10.0.0")
    else:
        notes.append("No direct Worker dependency: preserve existing packages; add Worker only if required "
                     "by the application and resolve actual restore conflicts.")

    targets = elements(root, "Target")
    guards = [node for node in targets
              if node.getAttribute("Name").lower() == "ensureoutputdirectory"]
    if len(guards) > 1:
        raise MigrationError("Duplicate output-directory targets require manual review.")
    directory = r"$(MSBuildProjectDirectory)\bin\$(Configuration)\$(TargetFramework)"
    if guards:
        guard = guards[0]
        unconditional(guard)
        child_elements = [node for node in guard.childNodes if node.nodeType == XmlNode.ELEMENT_NODE]
        allowed = {"$(OutputPath)", directory}
        if (guard.getAttribute("BeforeTargets") not in
                ("FindFunctionJsonFolders", "DeleteFunctionJsonFoldersTarget")
                or set(guard.attributes.keys()) != {"Name", "BeforeTargets"}
                or len(child_elements) != 1 or child_elements[0].localName != "MakeDir"):
            raise MigrationError("Custom EnsureOutputDirectory target requires manual review.")
        mkdir = child_elements[0]
        if (set(mkdir.attributes.keys()) != {"Directories", "Condition"}
                or mkdir.getAttribute("Directories") not in allowed
                or mkdir.getAttribute("Condition") !=
                f"!Exists('{mkdir.getAttribute('Directories')}')"):
            raise MigrationError("Custom MakeDir workaround requires manual review.")
    elif ensure_output_directory:
        guard = new_element("Target")
        guard.setAttribute("Name", "EnsureOutputDirectory")
        add(root, guard, 1)
        mkdir = add(guard, new_element("MakeDir"), 2)
    else:
        notes.append("Clean-build directory guard not added: use --ensure-output-directory if the SDK "
                     "fails because its function-JSON scan directory is missing.")
    if guards or ensure_output_directory:
        guard.setAttribute("BeforeTargets", "DeleteFunctionJsonFoldersTarget")
        mkdir.setAttribute("Directories", directory)
        mkdir.setAttribute("Condition", f"!Exists('{directory}')")

    publish_hooks = [node for node in targets
                     if any(token.strip().lower() == "build"
                            for token in node.getAttribute("AfterTargets").split(";"))
                     and any(token.strip().lower() == "publish"
                             for call in elements(node, "CallTarget")
                             for token in call.getAttribute("Targets").split(";"))]
    custom_publication = any(
        node.getAttribute("Name").lower() in {"publish", "beforepublish", "afterpublish"}
        or any("publish" in token.strip().lower() or "$(" in token
               for attribute in ("BeforeTargets", "AfterTargets", "DependsOnTargets")
               for token in node.getAttribute(attribute).split(";"))
        for node in targets
    ) or any(node.localName.lower().startswith("publish")
             and node.localName.lower().endswith("dependson")
             for node in root.getElementsByTagName("*")
             if node.parentNode.localName == "PropertyGroup")
    if custom_publication:
        if not publish_hooks:
            raise MigrationError("Custom publication hooks require side-effect review before "
                                 "adding publish-on-build; no build or deployment is authorized.")
        notes.append("Review custom publication hooks before any build; existing publish-on-build "
                     "is preserved, not authorization for deployment or other external effects.")
    if not publish_hooks:
        if any(node.getAttribute("Name").lower() == "triggerpublishonbuild" for node in targets):
            raise MigrationError("Conflicting publish-on-build target requires manual review.")
        hook = new_element("Target")
        hook.setAttribute("Name", "TriggerPublishOnBuild")
        hook.setAttribute("AfterTargets", "Build")
        add(root, hook, 1)
        call = add(hook, new_element("CallTarget"), 2)
        call.setAttribute("Targets", "Publish")
    elif len(publish_hooks) != 1:
        raise MigrationError("Multiple publish-on-build hooks require manual review.")
    else:
        unconditional(publish_hooks[0])
        for call in elements(publish_hooks[0], "CallTarget"):
            unconditional(call)
    if any("net472" in node.getAttribute("Name").lower() for node in targets):
        notes.append("Review existing net472 copy targets; none are introduced or removed.")
    result = document.toxml()
    if not text.lstrip().startswith("<?xml"):
        result = result[result.index("?>") + 2:]
    result = result.replace("\r\n", "\n").replace("\n", newline)
    if text.endswith(("\n", "\r")):
        result += newline
    return result


class Plan:
    def __init__(self, root):
        self.root, self.originals, self.changes, self.notes = root, {}, {}, []

    def checked(self, path):
        path = Path(path)
        if path.is_symlink() or not path.resolve().is_relative_to(self.root):
            raise MigrationError("Configuration path escapes the solution or is a symlink.")
        return path.resolve()

    def read(self, path, default=None):
        path = self.checked(path)
        if path not in self.originals:
            self.originals[path] = path.read_bytes() if path.exists() else None
        data = self.originals[path]
        if data is None:
            if default is None:
                raise MigrationError(f"Required configuration is missing: {path.name}")
            return default
        try:
            return data.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise MigrationError("Only UTF-8 configuration is supported.") from error

    def change(self, path, text, category):
        path = self.checked(path)
        original = self.originals[path]
        bom = b"\xef\xbb\xbf" if original and original.startswith(b"\xef\xbb\xbf") else b""
        data = bom + text.encode("utf-8")
        if data != original:
            self.changes[path] = (data, category)

    def verify(self, path):
        current = path.read_bytes() if path.exists() else None
        if current != self.originals[path]:
            raise MigrationError("Configuration changed after planning; refusing to overwrite.")

    @staticmethod
    def copy_access(path, temporary):
        original = path.stat()
        if sys.platform == "win32":
            if original.st_file_attributes & 0x4000:
                raise MigrationError("Encrypted filesystem configuration requires manual review.")
            import ctypes
            from ctypes import wintypes

            api = ctypes.WinDLL("advapi32", use_last_error=True)
            api.GetFileSecurityW.argtypes = (
                wintypes.LPCWSTR, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD,
                ctypes.POINTER(wintypes.DWORD))
            api.GetFileSecurityW.restype = wintypes.BOOL
            api.SetFileSecurityW.argtypes = (wintypes.LPCWSTR, wintypes.DWORD, wintypes.LPVOID)
            api.SetFileSecurityW.restype = wintypes.BOOL
            api.GetSecurityDescriptorControl.argtypes = (
                wintypes.LPVOID, ctypes.POINTER(wintypes.WORD), ctypes.POINTER(wintypes.DWORD))
            api.GetSecurityDescriptorControl.restype = wintypes.BOOL
            # Owner, group, DACL and integrity label; never weaken inheritance protection.
            information = 0x17
            size = wintypes.DWORD()
            api.GetFileSecurityW(str(path), information, None, 0, ctypes.byref(size))
            if ctypes.get_last_error() != 122 or not size.value:
                raise ctypes.WinError(ctypes.get_last_error())
            security = ctypes.create_string_buffer(size.value)
            if not api.GetFileSecurityW(str(path), information, security, size.value,
                                        ctypes.byref(size)):
                raise ctypes.WinError(ctypes.get_last_error())
            control, revision = wintypes.WORD(), wintypes.DWORD()
            if not api.GetSecurityDescriptorControl(security, ctypes.byref(control),
                                                     ctypes.byref(revision)):
                raise ctypes.WinError(ctypes.get_last_error())
            protection = 0x80000000 if control.value & 0x1000 else 0x20000000
            if not api.SetFileSecurityW(str(temporary), information | protection, security):
                raise ctypes.WinError(ctypes.get_last_error())
        elif sys.platform == "linux":
            current = os.stat(temporary)
            if (current.st_uid, current.st_gid) != (original.st_uid, original.st_gid):
                os.chown(temporary, original.st_uid, original.st_gid)
            attributes = os.listxattr(path)
            if ("system.posix_acl_access" not in attributes
                    and "system.posix_acl_access" in os.listxattr(temporary)):
                os.removexattr(temporary, "system.posix_acl_access")
            for attribute in attributes:
                os.setxattr(temporary, attribute, os.getxattr(path, attribute))
        else:
            raise MigrationError("Access-control preservation is supported only on Windows and Linux; "
                                 "this platform requires manual migration.")
        os.chmod(temporary, original.st_mode)

    @staticmethod
    def write(path, data):
        descriptor, temporary = tempfile.mkstemp(prefix="." + path.name + ".", dir=path.parent)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                if path.exists():
                    Plan.copy_access(path, temporary)
                else:
                    os.chmod(temporary, 0o600)
                stream.write(data)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def apply(self):
        for path in self.originals:
            self.verify(path)
        written, directories = [], []
        try:
            for path, (data, _) in self.changes.items():
                self.verify(path)
                if not path.parent.exists():
                    path.parent.mkdir()
                    directories.append(path.parent)
                self.write(path, data)
                written.append(path)
        except (OSError, MigrationError) as error:
            rollback_errors = []
            for path in reversed(written):
                try:
                    if path.read_bytes() != self.changes[path][0]:
                        raise MigrationError("Concurrent edit prevents rollback.")
                    original = self.originals[path]
                    if original is None:
                        path.unlink()
                    else:
                        self.write(path, original)
                except (OSError, MigrationError):
                    rollback_errors.append(path.name)
            for directory in reversed(directories):
                try:
                    directory.rmdir()
                except OSError:
                    rollback_errors.append(directory.name)
            detail = " Rollback incomplete: " + ", ".join(rollback_errors) if rollback_errors else ""
            raise MigrationError(f"Apply failed: {error}; own writes rolled back where safe."
                                 + detail) from error


def update_launch(launch, host_name):
    version = Jsonc(launch).locate(("version",))
    if version is not None and version.value != "0.2.0":
        raise MigrationError("Unfamiliar debugger schema version requires manual review.")
    launch = Jsonc(launch).set(("version",), "0.2.0")
    configurations = Jsonc(launch).locate(("configurations",))
    if configurations is None or not isinstance(configurations.value, list):
        raise MigrationError("Expected a debugger configurations array.")
    if not all(isinstance(config, dict) for config in configurations.value):
        raise MigrationError("Debugger entries must be objects.")
    candidates = [index for index, config in enumerate(configurations.value)
                  if config.get("type") == "logicapp" and config.get("request") == "launch"
                  and config.get("funcRuntime", "coreclr") == "coreclr"]
    if len(candidates) > 1:
        raise MigrationError("Multiple integrated debugger entries require manual selection.")
    fields = {"type": "logicapp", "request": "launch", "funcRuntime": "coreclr",
              "customCodeRuntime": "coreclr", "isCodeless": True}
    if candidates:
        index = candidates[0]
        config = configurations.value[index]
        if config.get("customCodeRuntime", "coreclr") != "coreclr":
            raise MigrationError("Mixed custom-code debugger runtimes require manual review.")
        for key, value in fields.items():
            launch = Jsonc(launch).set(("configurations", index, key), value)
    else:
        name = f"Run/Debug logic app with local function {host_name}"
        if any(config.get("name") == name or config.get("type") == "logicapp"
               for config in configurations.value):
            raise MigrationError("Conflicting integrated debugger configuration requires manual review.")
        launch = Jsonc(launch).append(configurations, {"name": name, **fields})
    Jsonc(launch)
    return launch


def make_plan(root, selected=None, *, ensure_output_directory=False, integrated_debug=False):
    root = Path(root).resolve()
    if not root.is_dir():
        raise MigrationError("Solution root is not a directory.")
    plan = Plan(root)
    if selected:
        project = plan.checked(Path(selected) if Path(selected).is_absolute() else root / selected)
        if project.suffix != ".csproj":
            raise MigrationError("--project must select a .csproj file.")
    else:
        candidates = []
        for directory, subdirs, files in os.walk(root):
            subdirs[:] = [name for name in subdirs if name not in
                          (".git", ".azurelogicapps", "bin", "obj", "node_modules", "skills")]
            for filename in files:
                if filename.endswith(".csproj"):
                    path = Path(directory) / filename
                    doc = project_xml(plan.read(path))
                    if any(node.getAttribute("Include").lower() == "microsoft.azure.workflows.webjobs.sdk"
                           for node in elements(doc.documentElement, "PackageReference")):
                        candidates.append(path)
        if len(candidates) != 1:
            raise MigrationError("Select exactly one Logic Apps custom-code project with --project.")
        project = candidates[0]
    for directory in (project.parent, *project.parent.parents):
        for filename in ("Directory.Build.props", "Directory.Build.targets", "Directory.Packages.props",
                         "global.json"):
            if (directory / filename).exists():
                raise MigrationError(f"Inherited {filename} requires manual scope/toolchain review.")
    text = plan.read(project)
    doc = project_xml(text)
    destinations = elements(doc.documentElement, "LogicAppFolderToPublish", case_insensitive=True)
    if len(destinations) != 1:
        raise MigrationError("Expected one LogicAppFolderToPublish destination.")
    destination = xml_value(destinations[0]).replace("$(MSBuildProjectDirectory)", str(project.parent))
    if "$(" in destination or "%(" in destination:
        raise MigrationError("Computed publication destination requires MSBuild/agent review.")
    destination_path = Path(destination.replace("\\", os.sep).replace("/", os.sep))
    host = plan.checked(destination_path if destination_path.is_absolute()
                        else project.parent / destination_path)
    host_json = Jsonc(plan.read(host / "host.json")).root.value
    if (not isinstance(host_json, dict) or not isinstance(host_json.get("extensionBundle"), dict)
            or host_json["extensionBundle"].get("id") !=
            "Microsoft.Azure.Functions.ExtensionBundle.Workflows"):
        raise MigrationError("Destination is not a recognized Logic Apps Standard host.")
    settings_path = host / "local.settings.json"
    settings = plan.read(settings_path)
    values = Jsonc(settings).root.value
    if not isinstance(values, dict) or values.get("IsEncrypted", False) is not False:
        raise MigrationError("Encrypted/non-object local settings require manual review.")
    settings_values = values.get("Values")
    if (not isinstance(settings_values, dict) or settings_values.get("APP_KIND") != "workflowapp"
            or settings_values.get("FUNCTIONS_WORKER_RUNTIME") != "dotnet"
            or settings_values.get("FUNCTIONS_INPROC_NET8_ENABLED") != "1"):
        raise MigrationError("Unfamiliar Logic Apps host settings require manual review.")
    configured_path = settings_values.get("ProjectDirectoryPath")
    if configured_path is not None and not isinstance(configured_path, str):
        raise MigrationError("ProjectDirectoryPath must be a string.")
    if configured_path and Path(configured_path).resolve() != host:
        raise MigrationError("Stale ProjectDirectoryPath: review relocation before migration.")
    settings = Jsonc(settings).set(("Values", "LOGIC_APPS_CUSTOMCODE_DOTNETVERSION"), "net10.0")
    plan.change(settings_path, settings, "custom-code runtime selector")
    plan.change(project, update_project(text, plan.notes, ensure_output_directory),
                "framework, applicable packages and publication")

    editor_path = project.parent / ".vscode" / "settings.json"
    editor = plan.read(editor_path, "{}\n")
    deploy = Jsonc(editor).locate(("azureFunctions.deploySubpath",))
    if deploy is not None:
        if not isinstance(deploy.value, str):
            raise MigrationError("Functions deployment path must be a string.")
        updated = re.sub(r"(?i)(^|[/\\])net8(?:\.0)?(?=[/\\]|$)",
                         lambda match: match.group(1) + "net10.0", deploy.value)
        if updated == deploy.value and not re.search(r"(^|[/\\])net10\.0([/\\]|$)", updated):
            plan.notes.append("No recognized net8/net8.0 or net10.0 deployment-path component; "
                              "inspect custom deployment tasks.")
        editor = Jsonc(editor).set(("azureFunctions.deploySubpath",), updated)
    else:
        plan.notes.append("No Functions deployment path specified; local publication is controlled by MSBuild.")
    if plan.originals[plan.checked(editor_path)] is not None:
        plan.change(editor_path, editor, "Functions deployment path")

    launch_path = host / ".vscode" / "launch.json"
    launch = plan.read(launch_path, '{"version": "0.2.0", "configurations": []}\n')
    Jsonc(launch)
    if integrated_debug:
        plan.change(launch_path, update_launch(launch, host.name), "integrated Logic Apps debugger")
    else:
        plan.notes.append("Debugger configuration preserved; use --integrated-debug only when coordinated "
                          "workflow/custom-code launching is required.")
    if not list(root.glob("*.code-workspace")):
        plan.notes.append("No root workspace found; review/create a workspace containing both existing projects.")
    for task_root in (project.parent, host):
        if not (task_root / ".vscode" / "tasks.json").exists():
            plan.notes.append(f"Missing tasks.json in {task_root.name}; review VS Code build/host tasks.")
    plan.notes.append("Toolchain, restore/build, publication and runtime execution still require verification.")
    plan.notes.append("Cloud prerequisite (not applied): deployed app settings must set "
                      "LOGIC_APPS_CUSTOMCODE_DOTNETVERSION=net10.0 and FUNCTIONS_INPROC_NET8_ENABLED=1. "
                      "Logic Apps VS Code deployment copies these settings; pipelines must include both. "
                      "A local.settings.json file alone does not configure Azure. "
                      "Verify deployed runtime support separately; Azure changes require authorization.")
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="Existing solution root")
    parser.add_argument("--project", help="Explicit custom-code .csproj (root-relative or absolute)")
    parser.add_argument("--ensure-output-directory", action="store_true",
                        help="Opt in to the SDK missing-directory clean-build workaround")
    parser.add_argument("--integrated-debug", action="store_true",
                        help="Opt in to coordinated Logic Apps/custom-code launch configuration")
    parser.add_argument("--apply", action="store_true", help="Apply configuration changes; default is dry run")
    args = parser.parse_args()
    try:
        plan = make_plan(args.root, args.project, ensure_output_directory=args.ensure_output_directory,
                         integrated_debug=args.integrated_debug)
        print("APPLY" if args.apply else "DRY RUN (no writes)")
        for path, (_, category) in plan.changes.items():
            print(f"  {path.relative_to(plan.root)}: {category}")
        for note in plan.notes:
            print("REVIEW: " + note)
        if args.apply:
            plan.apply()
        print(f"{len(plan.changes)} configuration file(s) {'updated' if args.apply else 'would change'}.")
        return 0
    except (MigrationError, OSError, ValueError) as error:
        # Do not expose configuration content through parser/OS exception messages.
        message = str(error) if isinstance(error, MigrationError) else type(error).__name__
        print("BLOCKED: " + message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
