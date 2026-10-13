from __future__ import annotations

import ast
import re
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    text = (root / "SKILL.md").read_text(encoding="utf-8")
    assert text.startswith("---\n")
    metadata = text.split("---", 2)[1]
    assert f"name: {root.name}" in metadata
    assert re.search(r"^description: '(?:[^']|'')+'$", metadata, re.MULTILINE)
    assert len(text.splitlines()) < 500
    assert not re.search(r"(?i)[a-z]:[\\/]|\\\\[a-z0-9_.-]+[\\/]", text)
    for reference in re.findall(r"\]\(([^)]+)\)", text):
        assert (root / reference).is_file(), reference
    for filename in list((root / "scripts").glob("*.py")) + list((root / "tests").glob("*.py")):
        ast.parse(filename.read_text(encoding="utf-8"), filename=str(filename))
    assert (root / "requirements.txt").is_file()
    print("SKILL_STRUCTURE_OK")


if __name__ == "__main__":
    main()