from __future__ import annotations

import argparse
import html
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


USER_AGENT = (
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
	"AppleWebKit/537.36 (KHTML, like Gecko) "
	"Chrome/134.0.0.0 Safari/537.36"
)


def browser_headers(referer: str | None = None) -> dict[str, str]:
	headers = {
		"Accept-Language": "en-US,en;q=0.9",
		"User-Agent": USER_AGENT,
	}
	if referer:
		headers["Referer"] = referer
	return headers


def is_http_url(value: str) -> bool:
	try:
		parsed = urlsplit(value)
		return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
	except Exception:
		return False


def candidate_key(candidate: dict[str, str | None]) -> str | None:
	return candidate.get("imageUrl") or candidate.get("sourcePageUrl") or candidate.get("thumbnailUrl")


def append_candidate(
	candidates: list[dict[str, str | None]],
	seen_keys: set[str],
	candidate: dict[str, str | None],
	max_num: int,
) -> None:
	if len(candidates) >= max_num:
		return
	key = candidate_key(candidate)
	if not key or key in seen_keys:
		return
	seen_keys.add(key)
	candidates.append(candidate)


def _get_text(url: str, *, params: dict[str, str] | None = None, referer: str | None = None, timeout: int = 15) -> str:
	full_url = f"{url}?{urlencode(params)}" if params else url
	request = Request(full_url, headers=browser_headers(referer))
	with urlopen(request, timeout=timeout) as response:
		content_type = response.headers.get_content_charset() or "utf-8"
		return response.read().decode(content_type, errors="replace")


def _direct_candidate(url: str, query: str) -> dict[str, str | None]:
	parsed = urlsplit(url)
	title = parsed.path.split("/")[-1] or parsed.netloc or "Direct image"
	return {
		"provider": "direct",
		"imageUrl": url,
		"thumbnailUrl": url,
		"sourcePageUrl": url,
		"title": title,
		"attribution": parsed.netloc or None,
		"searchQuery": query,
	}


def build_google_candidates(query: str, max_num: int) -> list[dict[str, str | None]]:
	try:
		from bs4 import BeautifulSoup
		from icrawler.builtin.google import GoogleFeeder, GoogleParser
		from icrawler.utils import ProxyPool, Session, Signal
	except Exception:
		return []

	session = Session(ProxyPool())
	signal = Signal()
	signal.set(feeder_exited=False, parser_exited=False, reach_max_num=False)
	feeder = GoogleFeeder(1, signal, session)
	parser = GoogleParser(1, signal, session)
	feeder.feed(keyword=query, offset=0, max_num=max_num)

	seen_pages: set[str] = set()
	seen_images: set[str] = set()
	seen_keys: set[str] = set()
	candidates: list[dict[str, str | None]] = []

	while not feeder.out_queue.empty() and len(candidates) < max_num:
		search_url = feeder.out_queue.get()
		base_url = "{0.scheme}://{0.netloc}".format(urlsplit(search_url))
		response = session.get(search_url, timeout=10, headers=browser_headers(base_url))
		if not response.text:
			continue

		soup = BeautifulSoup(response.text, "html.parser")
		thumbnails = []
		for image in soup.find_all("img"):
			src = image.get("src")
			if isinstance(src, str) and src.startswith("https://encrypted-tbn0.gstatic.com/images"):
				thumbnails.append(src)

		source_pages = []
		for anchor in soup.find_all("a"):
			href = anchor.get("href")
			if not isinstance(href, str) or not href.startswith("/url?"):
				continue
			target = parse_qs(urlsplit(href).query).get("q", [None])[0]
			if not target or not target.startswith(("http://", "https://")) or target in seen_pages:
				continue
			seen_pages.add(target)
			source_pages.append(target)

		pair_count = min(len(thumbnails), len(source_pages), max_num - len(candidates))
		for index in range(pair_count):
			page_url = source_pages[index]
			thumb_url = thumbnails[index]
			parsed = urlsplit(page_url)
			append_candidate(
				candidates,
				seen_keys,
				{
					"provider": "google",
					"imageUrl": None,
					"thumbnailUrl": thumb_url,
					"sourcePageUrl": page_url,
					"title": parsed.path.split("/")[-1] or parsed.netloc or "Google image",
					"attribution": parsed.netloc or None,
				},
				max_num,
			)

		tasks = parser.parse(response) or []
		for task in tasks:
			image_url = task.get("file_url")
			if not image_url or image_url in seen_images:
				continue
			seen_images.add(image_url)
			parsed = urlsplit(image_url)
			append_candidate(
				candidates,
				seen_keys,
				{
					"provider": "google",
					"imageUrl": image_url,
					"thumbnailUrl": image_url,
					"sourcePageUrl": None,
					"title": parsed.path.split("/")[-1] or parsed.netloc or "Google image",
					"attribution": parsed.netloc or None,
				},
				max_num,
			)
			if len(candidates) >= max_num:
				break

	return candidates


def _extract_bing_metadata(html_text: str) -> list[str]:
	try:
		from bs4 import BeautifulSoup
	except Exception:
		BeautifulSoup = None

	if BeautifulSoup is not None:
		soup = BeautifulSoup(html_text, "html.parser")
		return [str(anchor.get("m")) for anchor in soup.select("a.iusc") if anchor.get("m")]

	metadata_values: list[str] = []
	for match in re.finditer(r"<a\b[^>]*\bclass=[\"'][^\"']*\biusc\b[^\"']*[\"'][^>]*>", html_text, re.IGNORECASE):
		tag = match.group(0)
		attr_match = re.search(r"\bm=([\"'])(.*?)\1", tag, re.IGNORECASE | re.DOTALL)
		if attr_match:
			metadata_values.append(html.unescape(attr_match.group(2)))
	return metadata_values


def build_bing_candidates(query: str, max_num: int) -> list[dict[str, str | None]]:
	html_text = _get_text(
		"https://www.bing.com/images/search",
		params={"q": query, "form": "HDRSC3"},
		referer="https://www.bing.com/",
	)
	seen_keys: set[str] = set()
	candidates: list[dict[str, str | None]] = []

	for metadata_text in _extract_bing_metadata(html_text):
		try:
			metadata = json.loads(html.unescape(metadata_text))
		except json.JSONDecodeError:
			continue

		image_url = metadata.get("murl")
		thumb_url = metadata.get("turl") or image_url
		page_url = metadata.get("purl")
		title = metadata.get("t") or metadata.get("desc") or "Bing image"
		attribution = urlsplit(page_url).netloc if isinstance(page_url, str) and page_url else None
		append_candidate(
			candidates,
			seen_keys,
			{
				"provider": "bing",
				"imageUrl": image_url,
				"thumbnailUrl": thumb_url,
				"sourcePageUrl": page_url,
				"title": title,
				"attribution": attribution,
			},
			max_num,
		)
		if len(candidates) >= max_num:
			break
	return candidates


def build_candidates(query: str, max_num: int) -> tuple[list[dict[str, str | None]], list[str]]:
	if is_http_url(query):
		return [_direct_candidate(query, query)], []

	errors: list[str] = []
	candidates: list[dict[str, str | None]] = []
	try:
		candidates = build_google_candidates(query, max_num)
	except Exception as exc:
		errors.append(f"google: {exc}")

	if len(candidates) < max_num:
		try:
			fallback_candidates = build_bing_candidates(query, max_num)
			seen_keys = {key for candidate in candidates if (key := candidate_key(candidate))}
			for candidate in fallback_candidates:
				append_candidate(candidates, seen_keys, candidate, max_num)
				if len(candidates) >= max_num:
					break
		except (HTTPError, URLError, TimeoutError, OSError) as exc:
			errors.append(f"bing: {exc}")

	for candidate in candidates:
		candidate.setdefault("searchQuery", query)
	return candidates, errors


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Search web image candidates for one or more queries.")
	parser.add_argument("--query", action="append", required=True, help="Search query. Can be repeated.")
	parser.add_argument("--max-num", type=int, default=12, help="Maximum candidates per query.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	args = build_parser().parse_args()
	queries = [query.strip() for query in args.query if query.strip()]
	max_num = max(1, min(args.max_num, 32))
	payload_candidates: list[dict[str, str | None]] = []
	errors: list[str] = []

	for query in queries:
		candidates, query_errors = build_candidates(query, max_num)
		payload_candidates.extend(candidates)
		errors.extend(query_errors)

	payload = {
		"ok": not errors or bool(payload_candidates),
		"query": "\n".join(queries),
		"candidates": payload_candidates,
		"errors": errors,
	}
	print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
	return 0 if payload["ok"] else 1


if __name__ == "__main__":
	raise SystemExit(main())