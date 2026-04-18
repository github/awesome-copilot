#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "openai",
# ]
# ///
"""
Generate or edit images via OpenRouter using openai-python.
"""

import argparse
import base64
import mimetypes
import os
from pathlib import Path

from openai import OpenAI


# Configuration
MAX_INPUT_IMAGES = 3
MIME_TO_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}


def parse_args():
    parser = argparse.ArgumentParser(description="Generate or edit images via OpenRouter.")
    parser.add_argument("--prompt", required=True, help="Prompt describing the desired image.")
    parser.add_argument("--filename", required=True, help="Output filename (relative to CWD).")
    parser.add_argument(
      "--resolution",
      type=str.upper,
      choices=["1K", "2K", "4K"],
      default="1K",
      help="Output resolution: 1K, 2K, or 4K.",
    )
    parser.add_argument(
      "--input-image",
      action="append",
      default=[],
      help=f"Optional input image path (repeatable, max {MAX_INPUT_IMAGES}).",
    )
    return parser.parse_args()


def require_api_key():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise SystemExit("OPENROUTER_API_KEY is not set in the environment.")
    return api_key


def encode_image_to_data_url(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Input image not found: {path}")
    mime, _ = mimetypes.guess_type(str(path))
    if not mime:
        mime = "image/png"
    data = path.read_bytes()
    encoded = base64.b64encode(data).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


def build_message_content(prompt: str, input_images: list[str]) -> list[dict]:
    content: list[dict] = [{"type": "text", "text": prompt}]
    for image_path in input_images:
        data_url = encode_image_to_data_url(Path(image_path))
        content.append({"type": "image_url", "image_url": {"url": data_url}})
    return content


def parse_data_url(data_url: str) -> tuple[str, bytes]:
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise SystemExit("Image URL is not a base64 data URL.")
    header, encoded = data_url.split(",", 1)
    mime = header[5:].split(";", 1)[0]
    try:
        raw = base64.b64decode(encoded)
    except Exception as e:
        raise SystemExit(f"Failed to decode base64 image payload: {e}")
    return mime, raw


def resolve_output_path(filename: str, image_index: int, total_count: int, mime: str) -> Path:
    output_path = Path(filename)
    suffix = output_path.suffix

    # Validate/correct suffix matches MIME type
    expected_suffix = MIME_TO_EXT.get(mime, ".png")
    if suffix and suffix.lower() != expected_suffix.lower():
        print(f"Warning: filename extension '{suffix}' doesn't match returned MIME type '{mime}'. Using '{expected_suffix}' instead.")
        suffix = expected_suffix
    elif not suffix:
        suffix = expected_suffix

    # Single image: use original stem + corrected suffix
    if total_count <= 1:
        return output_path.with_suffix(suffix)

    # Multiple images: append numbering
    return output_path.with_name(f"{output_path.stem}-{image_index + 1}{suffix}")


def extract_image_url(image: dict | object) -> str | None:
    if isinstance(image, dict):
        return image.get("image_url", {}).get("url") or image.get("url")
    return None


def load_system_prompt():
    """Load system prompt from assets/SYSTEM_TEMPLATE if it exists and is not empty."""
    script_dir = Path(__file__).parent.parent
    template_path = script_dir / "assets" / "SYSTEM_TEMPLATE"

    if template_path.exists():
        content = template_path.read_text(encoding="utf-8").strip()
        if content:
            return content
    return None


def main():
    args = parse_args()

    if len(args.input_image) > MAX_INPUT_IMAGES:
        raise SystemExit(f"Too many input images: {len(args.input_image)} (max {MAX_INPUT_IMAGES}).")

    image_size = args.resolution

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=require_api_key())

    # Build messages with optional system prompt
    messages = []

    system_prompt = load_system_prompt()
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt,
        })

    messages.append({
        "role": "user",
        "content": build_message_content(args.prompt, args.input_image),
    })

    response = client.chat.completions.create(
        model="google/gemini-3-pro-image-preview",
        messages=messages,
        extra_body={
            "modalities": ["image", "text"],
            # https://openrouter.ai/docs/guides/overview/multimodal/image-generation#image-configuration-options
            "image_config": {
                # "aspect_ratio": "16:9",
                "image_size": image_size,
            }
        },
    )

    message = response.choices[0].message
    images = getattr(message, "images", None)
    if not images:
        raise SystemExit("No images returned by the API.")

    # Create output directory once before processing images
    output_base_path = Path(args.filename)
    if output_base_path.parent and str(output_base_path.parent) != '.':
        output_base_path.parent.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for idx, image in enumerate(images):
        image_url = extract_image_url(image)
        if not image_url:
            raise SystemExit("Image payload missing image_url.url.")
        mime, raw = parse_data_url(image_url)
        output_path = resolve_output_path(args.filename, idx, len(images), mime)
        output_path.write_bytes(raw)
        saved_paths.append(output_path.resolve())

    for path in saved_paths:
        print(f"Saved image to: {path}")
        print(f"MEDIA: {path}")


if __name__ == "__main__":
    main()
