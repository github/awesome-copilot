import argparse
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "generate_image.py"


def load_module():
    spec = importlib.util.spec_from_file_location("atlas_generate_image", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load generate_image.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self, *_args):
        return json.dumps(self.payload).encode("utf-8")


class FakeImageResponse:
    headers = {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self, _limit):
        return b"\x89PNG\r\n\x1a\nimage"


class AtlasImageTest(unittest.TestCase):
    def setUp(self):
        self.module = load_module()

    def args(self, **overrides):
        values = {
            "prompt": "A game item",
            "filename": "item.png",
            "input_image": [],
            "model": None,
            "size": "1024x1024",
            "count": 1,
            "negative_prompt": None,
            "seed": None,
            "no_prompt_extend": False,
            "poll_interval": 0,
            "max_polls": 2,
            "timeout": 5,
            "dry_run": False,
        }
        values.update(overrides)
        return argparse.Namespace(**values)

    def test_generation_payload_matches_schema(self):
        payload = self.module.build_payload(self.args(count=2, seed=7))
        self.assertEqual(
            payload,
            {
                "model": "qwen-image-3.0/text-to-image",
                "prompt": "A game item",
                "n": 2,
                "prompt_extend": True,
                "size": "1024*1024",
                "seed": 7,
            },
        )

    def test_edit_payload_embeds_local_reference(self):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "reference.png"
            image.write_bytes(b"\x89PNG\r\n\x1a\nreference")
            payload = self.module.build_payload(self.args(input_image=[str(image)]))
        self.assertEqual(payload["model"], "qwen-image-3.0/edit")
        self.assertEqual(payload["reference_image_urls"], ["data:image/png;base64,iVBORw0KGgpyZWZlcmVuY2U="])

    def test_prediction_submits_once_then_only_polls_with_get(self):
        submit = FakeResponse({"code": 200, "data": {"id": "prediction-1", "status": "created"}})
        processing = FakeResponse({"code": 200, "data": {"id": "prediction-1", "status": "processing"}})
        complete = FakeResponse({"code": 200, "data": {"id": "prediction-1", "status": "completed", "outputs": ["https://cdn.example/image.png"]}})
        with mock.patch.object(self.module.request, "urlopen", side_effect=[submit, processing, complete]) as urlopen:
            result = self.module.run_prediction(
                {"model": "qwen-image-3.0/text-to-image", "prompt": "test"},
                "test-key",
                "https://api.atlascloud.ai/api/v1",
                self.args(),
            )
        self.assertEqual(result["status"], "completed")
        self.assertEqual([call.args[0].method for call in urlopen.call_args_list], ["POST", "GET", "GET"])
        self.assertTrue(all(call.args[0].get_header("Authorization") == "Bearer test-key" for call in urlopen.call_args_list))

    def test_output_url_rejects_credentials_and_private_ip(self):
        for url in ("https://user:pass@example.com/image.png", "https://127.0.0.1/image.png", "http://example.com/image.png"):
            with self.subTest(url=url), self.assertRaises(SystemExit):
                self.module.validate_output_url(url)

    def test_output_download_does_not_forward_authorization(self):
        opener = mock.Mock()
        opener.open.return_value = FakeImageResponse()
        with mock.patch.object(self.module.request, "build_opener", return_value=opener):
            raw, suffix = self.module.download_output("https://cdn.example/image.png", 5)
        request_object = opener.open.call_args.args[0]
        self.assertIsNone(request_object.get_header("Authorization"))
        self.assertEqual(request_object.get_header("User-agent"), "awesome-copilot-atlas-image/1.0")
        self.assertEqual(raw, b"\x89PNG\r\n\x1a\nimage")
        self.assertEqual(suffix, ".png")


if __name__ == "__main__":
    unittest.main()
