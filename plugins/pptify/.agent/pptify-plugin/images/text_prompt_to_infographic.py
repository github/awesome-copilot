from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

_ENV_TEMPLATE = ".env.template"


def _env_guidance() -> str:
	return f"Copy {_ENV_TEMPLATE} to .env, fill the required image-provider values, then rerun the command."


def _dotenv_paths() -> list[Path]:
	paths: list[Path] = []
	for base in (Path.cwd(), Path(__file__).resolve().parents[2]):
		candidate = base / ".env"
		if candidate not in paths:
			paths.append(candidate)
	return paths


def _load_dotenv() -> list[str]:
	loaded: list[str] = []
	for env_path in _dotenv_paths():
		if not env_path.is_file():
			continue
		for line in env_path.read_text(encoding="utf-8").splitlines():
			item = line.strip()
			if not item or item.startswith("#"):
				continue
			if item.startswith("export "):
				item = item[7:].strip()
			if "=" not in item:
				continue
			name, value = item.split("=", 1)
			name = name.strip()
			value = value.strip().strip('"').strip("'")
			if name and name not in os.environ:
				os.environ[name] = value
		if str(env_path) not in loaded:
			loaded.append(str(env_path))
	return loaded


def _post_json(url: str, headers: dict[str, str], payload: dict[str, Any], *, timeout: int = 180) -> dict[str, Any]:
	body = json.dumps(payload).encode("utf-8")
	request = Request(url, data=body, headers={**headers, "Content-Type": "application/json"}, method="POST")
	try:
		with urlopen(request, timeout=timeout) as response:
			return json.loads(response.read().decode("utf-8", errors="replace"))
	except HTTPError as exc:
		detail = exc.read().decode("utf-8", errors="replace")
		raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def _download_bytes(url: str, *, timeout: int = 120) -> bytes:
	request = Request(url, headers={"User-Agent": "pptify-plugin/0.1"})
	with urlopen(request, timeout=timeout) as response:
		return response.read()


def _extract_image_bytes(response: dict[str, Any]) -> bytes:
	data = response.get("data")
	if not isinstance(data, list) or not data:
		raise RuntimeError(f"Image response did not include data: {response}")
	first = data[0]
	if not isinstance(first, dict):
		raise RuntimeError(f"Unexpected image response item: {first}")
	if isinstance(first.get("b64_json"), str):
		return base64.b64decode(first["b64_json"])
	if isinstance(first.get("url"), str):
		return _download_bytes(first["url"])
	raise RuntimeError(f"Image response did not include b64_json or url: {first}")


def build_infographic_prompt(content: str, *, style: str = "", audience: str = "") -> str:
	parts = [
		"Create a clean, presentation-ready infographic image.",
		"Use clear hierarchy, concise labels, business-safe visuals, and enough whitespace for slide use.",
	]
	if style.strip():
		parts.append(f"Style preferences: {style.strip()}")
	if audience.strip():
		parts.append(f"Audience: {audience.strip()}")
	parts.append("Content to visualize:")
	parts.append(content.strip())
	return "\n".join(parts)


def generate_with_openai(prompt: str, output_path: Path, *, model: str | None, size: str) -> dict[str, Any]:
	api_key = os.environ.get("OPENAI_API_KEY", "").strip()
	if not api_key:
		return {"ok": False, "error": f"OPENAI_API_KEY is required for the OpenAI image provider. {_env_guidance()}", "code": "missing_credentials"}

	selected_model = model or os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
	payload: dict[str, Any] = {"model": selected_model, "prompt": prompt, "size": size, "n": 1}
	if not selected_model.startswith("gpt-image-1"):
		payload["response_format"] = "b64_json"
	response = _post_json(
		"https://api.openai.com/v1/images/generations",
		{"Authorization": f"Bearer {api_key}"},
		payload,
	)
	image_bytes = _extract_image_bytes(response)
	output_path.parent.mkdir(parents=True, exist_ok=True)
	output_path.write_bytes(image_bytes)
	return {"ok": True, "provider": "openai", "model": selected_model, "path": str(output_path), "size": size}


def generate_with_azure_openai(prompt: str, output_path: Path, *, model: str | None, size: str) -> dict[str, Any]:
	endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").strip()
	api_key = os.environ.get("AZURE_OPENAI_API_KEY", "").strip() or os.environ.get("AZURE_AI_API_KEY", "").strip()
	deployment = model or os.environ.get("AZURE_OPENAI_IMAGE_DEPLOYMENT", "").strip() or os.environ.get("MODEL_NAME", "").strip()
	api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01").strip()
	timeout_seconds = _env_int("AZURE_OPENAI_TIMEOUT", 300)
	if not endpoint or not deployment:
		return {
			"ok": False,
			"error": f"AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_IMAGE_DEPLOYMENT or MODEL_NAME are required. Set AZURE_OPENAI_API_KEY/AZURE_AI_API_KEY or sign in with Azure CLI for Entra auth. {_env_guidance()}",
			"code": "missing_credentials",
		}

	endpoint = endpoint.rstrip("/")
	if _is_openai_v1_endpoint(endpoint):
		url = f"{endpoint}/images/generations"
		payload = {"model": deployment, "prompt": prompt, "size": size, "n": 1}
		provider = "azure-openai-v1"
	else:
		url = urljoin(f"{endpoint}/", f"openai/deployments/{deployment}/images/generations?api-version={api_version}")
		payload = {"prompt": prompt, "size": size, "n": 1}
		provider = "azure-openai"
	response = _post_json(url, _azure_auth_headers(api_key), payload, timeout=timeout_seconds)
	image_bytes = _extract_image_bytes(response)
	output_path.parent.mkdir(parents=True, exist_ok=True)
	output_path.write_bytes(image_bytes)
	return {"ok": True, "provider": provider, "model": deployment, "path": str(output_path), "size": size}


def _is_openai_v1_endpoint(endpoint: str) -> bool:
	return endpoint.rstrip("/").lower().endswith("/openai/v1")


def _env_int(name: str, default: int) -> int:
	try:
		return int(os.environ.get(name, str(default)))
	except ValueError:
		return default


def _azure_auth_headers(api_key: str) -> dict[str, str]:
	if api_key:
		return {"api-key": api_key}
	return {"Authorization": f"Bearer {_azure_access_token()}"}


def _azure_access_token() -> str:
	az_command = _azure_cli_command()
	if az_command is None:
		raise RuntimeError("AZURE_OPENAI_API_KEY/AZURE_AI_API_KEY is required when Azure CLI is not available.")
	try:
		completed = subprocess.run(
			[
				az_command,
				"account",
				"get-access-token",
				"--resource",
				"https://cognitiveservices.azure.com",
				"--query",
				"accessToken",
				"-o",
				"tsv",
			],
			capture_output=True,
			text=True,
			encoding="utf-8",
			timeout=30,
			check=False,
		)
	except FileNotFoundError as exc:
		raise RuntimeError("AZURE_OPENAI_API_KEY/AZURE_AI_API_KEY is required when Azure CLI is not available.") from exc
	token = completed.stdout.strip()
	if completed.returncode != 0 or not token:
		raise RuntimeError("Could not acquire an Azure CLI token. Run `az login` or set AZURE_OPENAI_API_KEY/AZURE_AI_API_KEY.")
	return token


def _azure_cli_command() -> str | None:
	candidates = [
		os.environ.get("AZURE_CLI_PATH", "").strip(),
		shutil.which("az"),
		shutil.which("az.cmd"),
		r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
	]
	for candidate in candidates:
		if not candidate:
			continue
		candidate_path = Path(candidate)
		if candidate_path.is_file():
			return str(candidate_path)
		resolved = shutil.which(candidate)
		if resolved:
			return resolved
	return None


def generate_infographic(
	content: str,
	output_path: str | Path,
	*,
	style: str = "",
	audience: str = "",
	provider: str = "auto",
	model: str | None = None,
	size: str = "1024x1024",
) -> dict[str, Any]:
	path = Path(output_path).expanduser()
	prompt = build_infographic_prompt(content, style=style, audience=audience)
	selected_provider = provider
	if provider == "auto":
		env_provider = os.environ.get("PPTIFY_IMAGE_PROVIDER", "").strip()
		if env_provider in {"openai", "azure-openai"}:
			selected_provider = env_provider
		elif os.environ.get("OPENAI_API_KEY"):
			selected_provider = "openai"
		elif os.environ.get("AZURE_OPENAI_ENDPOINT") and (model or os.environ.get("AZURE_OPENAI_IMAGE_DEPLOYMENT") or os.environ.get("MODEL_NAME")):
			selected_provider = "azure-openai"
		else:
			return {
				"ok": False,
				"error": f"No image provider is configured. {_env_guidance()} No built-in local fallback is available.",
				"code": "missing_provider_config",
			}

	try:
		if selected_provider == "openai":
			return generate_with_openai(prompt, path, model=model, size=size)
		if selected_provider == "azure-openai":
			return generate_with_azure_openai(prompt, path, model=model, size=size)
		return {"ok": False, "error": f"Unknown provider: {provider}", "code": "unknown_provider"}
	except Exception as exc:
		return {"ok": False, "error": str(exc), "provider": selected_provider, "code": "generation_failed"}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Generate an infographic image from a text prompt.")
	prompt_group = parser.add_mutually_exclusive_group()
	prompt_group.add_argument("--prompt", help="Prompt or source content to visualize.")
	prompt_group.add_argument("--prompt-path", help="Path to a UTF-8 text prompt file.")
	parser.add_argument("--output-path", required=True, help="Where to write the generated image.")
	parser.add_argument("--style", default="", help="Optional visual style preferences.")
	parser.add_argument("--audience", default="", help="Optional target audience.")
	parser.add_argument("--provider", default="auto", choices=["auto", "openai", "azure-openai"], help="Image provider.")
	parser.add_argument("--model", help="Provider-specific image model or deployment.")
	parser.add_argument("--size", default="1024x1024", help="Provider image size, for example 1024x1024.")
	parser.add_argument("--azure-endpoint", help="Azure OpenAI / Azure AI Foundry endpoint, for example https://<resource>.services.ai.azure.com/openai/v1.")
	parser.add_argument("--azure-api-version", help="Azure OpenAI API version for legacy deployment endpoints. Defaults to AZURE_OPENAI_API_VERSION or 2024-02-01.")
	parser.add_argument("--timeout", type=int, help="Provider request timeout in seconds. Defaults to AZURE_OPENAI_TIMEOUT or 300 for Azure.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
	return parser


def _apply_runtime_settings(args: argparse.Namespace) -> None:
	if args.azure_endpoint:
		os.environ["AZURE_OPENAI_ENDPOINT"] = args.azure_endpoint
	if args.azure_api_version:
		os.environ["AZURE_OPENAI_API_VERSION"] = args.azure_api_version
	if args.timeout is not None:
		os.environ["AZURE_OPENAI_TIMEOUT"] = str(args.timeout)


def _read_prompt(args: argparse.Namespace) -> str:
	if args.prompt_path:
		return Path(args.prompt_path).read_text(encoding="utf-8")
	if args.prompt:
		return args.prompt
	if not sys.stdin.isatty():
		return sys.stdin.read()
	raise ValueError("Provide --prompt, --prompt-path, or stdin content.")


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	_load_dotenv()
	args = build_parser().parse_args()
	_apply_runtime_settings(args)
	try:
		content = _read_prompt(args)
	except Exception as exc:
		payload = {"ok": False, "error": str(exc), "code": "missing_prompt"}
		print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
		return 1

	payload = generate_infographic(
		content,
		args.output_path,
		style=args.style,
		audience=args.audience,
		provider=args.provider,
		model=args.model,
		size=args.size,
	)
	print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
	return 0 if payload.get("ok") else 1


if __name__ == "__main__":
	raise SystemExit(main())