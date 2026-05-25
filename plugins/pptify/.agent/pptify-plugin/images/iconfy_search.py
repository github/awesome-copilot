from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ICONIFY_API_HOSTS = (
	"https://api.iconify.design",
	"https://api.simplesvg.com",
	"https://api.unisvg.com",
)

ICONIFY_COLLECTIONS: dict[str, list[str]] = {
	"all": [
		"mdi:trending-up",
		"lucide:brain",
		"tabler:building-skyscraper",
		"fa6-solid:rocket",
		"ph:chart-line-up-bold",
		"fluent:people-team-24-regular",
	],
	"mdi": ["mdi:trending-up", "mdi:brain", "mdi:domain", "mdi:rocket-outline"],
	"lucide": ["lucide:brain", "lucide:line-chart", "lucide:building-2", "lucide:rocket"],
	"tabler": ["tabler:building-skyscraper", "tabler:chart-line", "tabler:bulb", "tabler:target-arrow"],
	"ph": ["ph:chart-line-up-bold", "ph:brain-bold", "ph:buildings-bold", "ph:rocket-launch-bold"],
	"fa6-solid": ["fa6-solid:rocket", "fa6-solid:chart-line", "fa6-solid:building", "fa6-solid:lightbulb"],
	"fluent": [
		"fluent:people-team-24-regular",
		"fluent:brain-circuit-24-regular",
		"fluent:building-24-regular",
		"fluent:arrow-trending-24-regular",
	],
}


def get_default_iconify_prefix(collection: str = "all") -> str:
	return "mdi" if collection == "all" else collection


def normalize_icon_name(value: str | None, collection: str = "all") -> str | None:
	raw = (value or "").strip().lower()
	if not raw:
		return None
	raw = raw.replace(" ", "-")
	if ":" in raw:
		return raw
	return f"{get_default_iconify_prefix(collection)}:{raw}"


def build_iconify_svg_url(icon_name: str, color_hex: str | None = None, *, host_index: int = 0, collection: str = "all") -> str:
	normalized = normalize_icon_name(icon_name, collection)
	if not normalized or ":" not in normalized:
		raise ValueError(f"Invalid Iconify icon name: {icon_name}")
	prefix, name = normalized.split(":", 1)
	query: dict[str, str] = {"box": "1"}
	if color_hex:
		query["color"] = color_hex if color_hex.startswith("#") else f"#{color_hex}"
	host = ICONIFY_API_HOSTS[min(max(host_index, 0), len(ICONIFY_API_HOSTS) - 1)]
	return f"{host}/{prefix}/{name}.svg?{urlencode(query)}"


def _request_json(host: str, path: str, params: dict[str, str]) -> dict[str, Any]:
	url = f"{host}{path}?{urlencode(params)}"
	request = Request(url, headers={"User-Agent": "pptify-plugin/0.1"})
	with urlopen(request, timeout=15) as response:
		return json.loads(response.read().decode("utf-8", errors="replace"))


def _title_for_icon(icon_id: str) -> str:
	name = icon_id.split(":", 1)[-1]
	return re.sub(r"[-_]+", " ", name).strip().title() or icon_id


def _candidate(icon_id: str, query: str, color_hex: str | None) -> dict[str, str | None]:
	prefix = icon_id.split(":", 1)[0] if ":" in icon_id else None
	return {
		"provider": "iconify",
		"searchQuery": query,
		"iconId": icon_id,
		"prefix": prefix,
		"name": icon_id.split(":", 1)[-1],
		"title": _title_for_icon(icon_id),
		"svgUrl": build_iconify_svg_url(icon_id, color_hex),
		"sourceUrl": f"https://icon-sets.iconify.design/{icon_id.replace(':', '/')}/",
	}


def _fallback_icons(query: str, collection: str, max_num: int) -> list[str]:
	examples = ICONIFY_COLLECTIONS.get(collection, ICONIFY_COLLECTIONS["all"])
	terms = {term for term in re.split(r"[^a-z0-9]+", query.lower()) if term}
	matched = [icon for icon in examples if any(term in icon for term in terms)]
	icons = matched or examples
	return icons[:max_num]


def search_icons(query: str, *, collection: str = "all", max_num: int = 12, color_hex: str | None = None) -> tuple[list[dict[str, str | None]], list[str]]:
	collection = collection.strip().lower() or "all"
	max_num = max(1, min(max_num, 50))
	errors: list[str] = []
	icon_ids: list[str] = []

	normalized_direct = normalize_icon_name(query, collection)
	if normalized_direct and ":" in normalized_direct and " " not in query.strip():
		icon_ids.append(normalized_direct)

	params = {"query": query, "limit": str(max_num)}
	if collection != "all":
		params["prefix"] = collection

	for host in ICONIFY_API_HOSTS:
		if len(icon_ids) >= max_num:
			break
		try:
			data = _request_json(host, "/search", params)
		except Exception as exc:
			errors.append(f"{host}: {exc}")
			continue

		for icon in data.get("icons", []):
			if not isinstance(icon, str):
				continue
			normalized = normalize_icon_name(icon, collection)
			if normalized and normalized not in icon_ids:
				icon_ids.append(normalized)
			if len(icon_ids) >= max_num:
				break

	if not icon_ids:
		icon_ids.extend(_fallback_icons(query, collection, max_num))

	candidates = [_candidate(icon_id, query, color_hex) for icon_id in icon_ids[:max_num]]
	return candidates, errors


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Search Iconify icons and return SVG URLs.")
	parser.add_argument("--query", action="append", required=True, help="Icon search query or full icon ID. Can be repeated.")
	parser.add_argument("--collection", default="all", help="Iconify collection prefix such as mdi, lucide, tabler, ph, fa6-solid, fluent, or all.")
	parser.add_argument("--color", help="Optional SVG color hex value.")
	parser.add_argument("--max-num", type=int, default=12, help="Maximum candidates per query.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	args = build_parser().parse_args()
	queries = [query.strip() for query in args.query if query.strip()]
	candidates: list[dict[str, str | None]] = []
	errors: list[str] = []
	for query in queries:
		query_candidates, query_errors = search_icons(
			query,
			collection=args.collection,
			max_num=args.max_num,
			color_hex=args.color,
		)
		candidates.extend(query_candidates)
		errors.extend(query_errors)

	payload = {
		"ok": bool(candidates),
		"query": "\n".join(queries),
		"collection": args.collection,
		"candidates": candidates,
		"errors": errors,
	}
	print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
	return 0 if payload["ok"] else 1


if __name__ == "__main__":
	raise SystemExit(main())
