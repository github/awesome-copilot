from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


DEFAULT_MANIFEST_PATH = Path(__file__).resolve().parents[2] / "pptify-design" / "sources.json"


def load_catalog(manifest_path: Path = DEFAULT_MANIFEST_PATH) -> dict[str, Any]:
	with manifest_path.open("r", encoding="utf-8") as handle:
		catalog = json.load(handle)
	profiles = catalog.get("profiles")
	if not isinstance(profiles, list):
		raise ValueError(f"Catalog does not contain a profiles list: {manifest_path}")
	return catalog


def select_profiles(catalog: dict[str, Any], profile_ids: list[str] | None = None) -> list[dict[str, Any]]:
	profiles = [profile for profile in catalog.get("profiles", []) if isinstance(profile, dict)]
	if not profile_ids:
		return profiles

	by_id = {str(profile.get("id")): profile for profile in profiles if profile.get("id")}
	selected: list[dict[str, Any]] = []
	missing: list[str] = []
	for profile_id in profile_ids:
		profile = by_id.get(profile_id)
		if profile is None:
			missing.append(profile_id)
		else:
			selected.append(profile)

	if missing:
		available = ", ".join(sorted(by_id))
		raise ValueError(f"Unknown design context profile(s): {', '.join(missing)}. Available: {available}")
	return selected


def read_context_files(profiles: list[dict[str, Any]], *, base_dir: Path) -> list[dict[str, str]]:
	contexts: list[dict[str, str]] = []
	for profile in profiles:
		context_path_value = profile.get("local_context")
		if not isinstance(context_path_value, str) or not context_path_value:
			continue
		context_path = (base_dir / context_path_value).resolve()
		try:
			content = context_path.read_text(encoding="utf-8")
		except FileNotFoundError:
			content = ""
		contexts.append(
			{
				"id": str(profile.get("id", "")),
				"path": context_path.relative_to(base_dir).as_posix(),
				"content": content,
			}
		)
	return contexts


def build_payload(
	*,
	manifest_path: Path = DEFAULT_MANIFEST_PATH,
	profile_ids: list[str] | None = None,
	include_context: bool = False,
	list_only: bool = False,
) -> dict[str, Any]:
	catalog = load_catalog(manifest_path)
	profiles = select_profiles(catalog, profile_ids)
	base_dir = manifest_path.resolve().parent

	payload: dict[str, Any] = {
		"ok": True,
		"schema": catalog.get("schema"),
		"updated": catalog.get("updated"),
		"manifest": str(manifest_path),
		"profiles": profiles,
	}
	if list_only:
		payload["profiles"] = [
			{
				"id": profile.get("id"),
				"name": profile.get("name"),
				"kind": profile.get("kind"),
				"best_for": profile.get("best_for", []),
			}
			for profile in profiles
		]
	if include_context:
		payload["contexts"] = read_context_files(profiles, base_dir=base_dir)
	return payload


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Emit source-backed pptify design context catalog entries as JSON.")
	parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST_PATH, help="Path to pptify-design/sources.json.")
	parser.add_argument("--profile", action="append", help="Profile ID to select. Can be repeated. Defaults to all profiles.")
	parser.add_argument("--include-context", action="store_true", help="Include local context file contents in the JSON payload.")
	parser.add_argument("--list", action="store_true", help="Return a compact list of profiles.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	args = build_parser().parse_args()
	try:
		payload = build_payload(
			manifest_path=args.manifest,
			profile_ids=args.profile,
			include_context=args.include_context,
			list_only=args.list,
		)
	except Exception as exc:
		payload = {"ok": False, "error": str(exc)}
		print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
		return 1

	print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
	return 0


if __name__ == "__main__":
	raise SystemExit(main())