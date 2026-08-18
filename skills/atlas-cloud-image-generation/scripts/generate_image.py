#!/usr/bin/env python3
"""Generate or edit images through Atlas Cloud's asynchronous image API."""

from __future__ import annotations

import argparse
import base64
import ipaddress
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib import error, parse, request


DEFAULT_BASE_URL = "https://api.atlascloud.ai/api/v1"
DEFAULT_GENERATION_MODEL = "qwen-image-3.0/text-to-image"
DEFAULT_EDIT_MODEL = "qwen-image-3.0/edit"
USER_AGENT = "awesome-copilot-atlas-image/1.0"
MAX_REFERENCE_BYTES = 10 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024
SIZE_PATTERN = re.compile(r"^(\d+)[x*](\d+)$")
SUPPORTED_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", required=True, help="Prompt or editing instruction.")
    parser.add_argument("--filename", required=True, help="Output filename or path.")
    parser.add_argument("--input-image", action="append", default=[], help="Local reference image (repeatable, max 3).")
    parser.add_argument("--model", help="Atlas model ID. Defaults according to whether references are present.")
    parser.add_argument("--size", help="Output size as WIDTHxHEIGHT. Omit for automatic sizing.")
    parser.add_argument("--count", type=int, default=1, help="Number of outputs (1-4).")
    parser.add_argument("--negative-prompt", help="Content to avoid.")
    parser.add_argument("--seed", type=int, help="Generation seed (0-2147483647).")
    parser.add_argument("--no-prompt-extend", action="store_true", help="Disable automatic prompt rewriting.")
    parser.add_argument("--poll-interval", type=float, default=3.0, help="Seconds between GET polls.")
    parser.add_argument("--max-polls", type=int, default=100, help="Maximum prediction GET requests.")
    parser.add_argument("--timeout", type=float, default=120.0, help="Per-request timeout in seconds.")
    parser.add_argument("--dry-run", action="store_true", help="Print the request without sending it.")
    return parser.parse_args()


def fail(message: str) -> None:
    raise SystemExit(message)


def image_data_url(raw_path: str) -> str:
    path = Path(raw_path)
    if not path.is_file():
        fail(f"Input image not found: {path}")
    size = path.stat().st_size
    if size > MAX_REFERENCE_BYTES:
        fail(f"Input image exceeds 10 MiB: {path}")
    mime = mimetypes.guess_type(path.name)[0]
    if mime == "image/jpg":
        mime = "image/jpeg"
    if mime not in SUPPORTED_MIME:
        fail(f"Unsupported input image type: {path.suffix or 'unknown'}")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def normalize_size(raw_size: str | None, editing: bool) -> str | None:
    if not raw_size:
        return None
    match = SIZE_PATTERN.fullmatch(raw_size)
    if not match:
        fail("--size must use WIDTHxHEIGHT, for example 1024x1024.")
    width, height = (int(value) for value in match.groups())
    maximum = 1440 if editing else 2048
    if not (512 <= width <= maximum and 512 <= height <= maximum):
        fail(f"--size dimensions must each be between 512 and {maximum} for this mode.")
    return f"{width}*{height}"


def build_payload(args: argparse.Namespace) -> dict[str, Any]:
    if not args.prompt.strip():
        fail("--prompt cannot be empty.")
    if len(args.input_image) > 3:
        fail("At most three --input-image values are supported.")
    if not 1 <= args.count <= 4:
        fail("--count must be between 1 and 4.")
    if args.seed is not None and not 0 <= args.seed <= 2147483647:
        fail("--seed must be between 0 and 2147483647.")

    editing = bool(args.input_image)
    payload: dict[str, Any] = {
        "model": args.model or (DEFAULT_EDIT_MODEL if editing else DEFAULT_GENERATION_MODEL),
        "prompt": args.prompt,
        "n": args.count,
        "prompt_extend": not args.no_prompt_extend,
    }
    size = normalize_size(args.size, editing)
    if size:
        payload["size"] = size
    if args.negative_prompt:
        payload["negative_prompt"] = args.negative_prompt
    if args.seed is not None:
        payload["seed"] = args.seed
    if editing:
        payload["reference_image_urls"] = [image_data_url(path) for path in args.input_image]
    return payload


def unwrap_response(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        fail("Atlas returned a non-object response.")
    if payload.get("code") not in (None, 0, 200):
        fail(f"Atlas API error: {payload.get('message') or payload.get('msg') or payload.get('code')}")
    data = payload.get("data", payload)
    if not isinstance(data, dict):
        fail("Atlas returned an invalid data object.")
    return data


def json_request(url: str, api_key: str, method: str, body: bytes | None, timeout: float) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {api_key}", "User-Agent": USER_AGENT}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = request.Request(url, data=body, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return unwrap_response(json.loads(response.read().decode("utf-8")))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        fail(f"Atlas request failed: HTTP {exc.code}\n{details}")
    except error.URLError as exc:
        fail(f"Atlas request failed: {exc.reason}")


def run_prediction(payload: dict[str, Any], api_key: str, base_url: str, args: argparse.Namespace) -> dict[str, Any]:
    submit_url = f"{base_url}/model/generateImage"
    prediction = json_request(submit_url, api_key, "POST", json.dumps(payload).encode("utf-8"), args.timeout)
    prediction_id = prediction.get("id")
    if not prediction_id:
        fail("Atlas submission did not return a prediction ID.")
    print(f"Prediction ID: {prediction_id}", file=sys.stderr)

    if args.max_polls < 1 or args.poll_interval < 0:
        fail("--max-polls must be positive and --poll-interval cannot be negative.")
    poll_url = f"{base_url}/model/prediction/{parse.quote(str(prediction_id), safe='')}"
    for attempt in range(args.max_polls):
        prediction = json_request(poll_url, api_key, "GET", None, args.timeout)
        status = str(prediction.get("status", "")).lower()
        if status in {"completed", "succeeded"}:
            outputs = prediction.get("outputs")
            if not isinstance(outputs, list) or not outputs:
                fail("Atlas prediction completed without output URLs.")
            return prediction
        if status in {"failed", "canceled", "cancelled"}:
            fail(f"Atlas prediction {status}: {prediction.get('error') or 'no details'}")
        if attempt + 1 < args.max_polls:
            time.sleep(args.poll_interval)
    fail(f"Prediction {prediction_id} did not complete after {args.max_polls} polls. Do not resubmit automatically.")


class NoRedirectHandler(request.HTTPRedirectHandler):
    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


def validate_output_url(raw_url: str) -> str:
    parsed = parse.urlparse(raw_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        fail("Atlas output URL must be credential-free HTTPS.")
    try:
        port = parsed.port
    except ValueError:
        fail("Atlas output URL contains an invalid port.")
    if port not in (None, 443):
        fail("Atlas output URL must use the default HTTPS port.")
    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".localhost"):
        fail("Atlas output URL cannot target localhost.")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        if not address.is_global:
            fail("Atlas output URL cannot target a non-public address.")
    return raw_url


def detect_image(raw: bytes) -> tuple[str, str]:
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if raw.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if raw.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif", ".gif"
    if len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp", ".webp"
    fail("Downloaded output is not a recognized PNG, JPEG, GIF, or WebP image.")


def download_output(raw_url: str, timeout: float) -> tuple[bytes, str]:
    url = validate_output_url(raw_url)
    opener = request.build_opener(NoRedirectHandler())
    try:
        req = request.Request(url, method="GET", headers={"User-Agent": USER_AGENT})
        with opener.open(req, timeout=timeout) as response:
            declared = int(response.headers.get("Content-Length", "0") or "0")
            if declared > MAX_DOWNLOAD_BYTES:
                fail("Atlas output exceeds the 64 MiB download limit.")
            raw = response.read(MAX_DOWNLOAD_BYTES + 1)
    except error.HTTPError as exc:
        fail(f"Atlas output download failed: HTTP {exc.code}")
    except error.URLError as exc:
        fail(f"Atlas output download failed: {exc.reason}")
    if len(raw) > MAX_DOWNLOAD_BYTES:
        fail("Atlas output exceeds the 64 MiB download limit.")
    return raw, detect_image(raw)[1]


def output_path(filename: str, index: int, total: int, suffix: str) -> Path:
    base = Path(filename)
    stem = base.stem if base.suffix else base.name
    name = f"{stem}-{index + 1}{suffix}" if total > 1 else f"{stem}{suffix}"
    return base.with_name(name)


def main() -> int:
    args = parse_args()
    payload = build_payload(args)
    base_url = os.environ.get("ATLASCLOUD_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    if args.dry_run:
        print(json.dumps({"url": f"{base_url}/model/generateImage", "request": payload}, indent=2))
        return 0

    api_key = os.environ.get("ATLASCLOUD_API_KEY")
    if not api_key:
        fail("ATLASCLOUD_API_KEY is not set in the environment.")
    prediction = run_prediction(payload, api_key, base_url, args)
    outputs = prediction["outputs"]
    for index, raw_url in enumerate(outputs):
        raw, suffix = download_output(str(raw_url), args.timeout)
        path = output_path(args.filename, index, len(outputs), suffix)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        resolved = path.resolve()
        print(f"Saved image to: {resolved}")
        print(f"MEDIA: {resolved}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
