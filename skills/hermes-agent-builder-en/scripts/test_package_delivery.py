from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("package_delivery.py")
SPEC = importlib.util.spec_from_file_location("package_delivery", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PackageDeliveryTest(unittest.TestCase):
    def make_kit(self, root: Path, *, status: str = "ready_for_implementation") -> Path:
        kit = root / "source"
        for name in MODULE.REQUIRED_FILES:
            path = kit / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("test\n", encoding="utf-8")
        manifest = {
            "schema_version": 1,
            "system_slug": "test-agent",
            "status": status,
            "target_agents": ["codex", "hermes"],
            "entrypoint": "START-HERE.md",
            "implementation_instruction": "IMPLEMENTATION.md",
            "critical_unknowns": [],
            "profiles": [
                {
                    "slug": "test-agent",
                    "kind": "primary",
                    "specification": "blueprint/profiles/test-agent/profile.md",
                    "distribution": "blueprint/profiles/test-agent/distribution",
                }
            ],
            "expected_results": [
                "implementation/",
                "implementation/IMPLEMENTATION-RESULT.md",
            ],
        }
        (kit / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        profile_root = kit / "blueprint/profiles/test-agent"
        (profile_root / "profile.md").parent.mkdir(parents=True, exist_ok=True)
        (profile_root / "profile.md").write_text("profile\n", encoding="utf-8")
        distribution = profile_root / "distribution"
        distribution.mkdir(parents=True, exist_ok=True)
        for name in (
            "distribution.yaml",
            "SOUL.md",
            "config.yaml",
            "mcp.json",
            ".env.EXAMPLE",
            ".gitignore",
        ):
            (distribution / name).write_text("test\n", encoding="utf-8")
        return kit

    def test_ready_kit_is_packaged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = MODULE.package(self.make_kit(root), root / "result.zip")
            self.assertTrue(result.is_file())

    def test_draft_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            kit = self.make_kit(root, status="draft")
            with self.assertRaises(MODULE.PackageError):
                MODULE.package(kit, root / "result.zip")

    def test_secret_file_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            kit = self.make_kit(root)
            (kit / ".env").write_text("SECRET=value\n", encoding="utf-8")
            with self.assertRaises(MODULE.PackageError):
                MODULE.package(kit, root / "result.zip")


if __name__ == "__main__":
    unittest.main()
