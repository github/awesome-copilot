---
name: optiq-local-models
description: Serve a quantized language model locally on an Apple Silicon Mac with mlx-optiq and an OpenAI-compatible endpoint. Use when the user wants to run a model on their own Mac, pick a model that fits their memory, connect a tool to a local server, or check local speed and quality.
license: Apache-2.0
---

Use this skill when the user wants to run a language model on their own Apple Silicon Mac with mlx-optiq (https://mlx-optiq.com). Do not use it for Intel Macs, Windows, or hosted-model advice.

Run the read-only checks below yourself and show the output. This skill does not install software. Ask the user before downloading a model (downloads are several GB) or starting a server.

## 1. Check the Mac

```bash
uname -m                                  # expect arm64
sysctl -n hw.memsize | awk '{printf "%.0f GB\n", $1/1073741824}'
python3 --version                         # mlx-optiq needs Python 3.11+
```

Memory is the main limit. A model's weights plus its KV cache must fit with room left for macOS and other apps.

## 2. Check that mlx-optiq is installed

This skill does not install mlx-optiq. Check whether it is already available:

```bash
optiq --version
optiq --help
```

If `optiq` is not found, tell the user it is not installed and point them to the install steps on https://mlx-optiq.com (it is published on PyPI as `mlx-optiq` and needs Python 3.11+). Do not run install commands on the user's behalf. Continue once the user confirms it is installed.

## 3. Pick a model

The models page (https://mlx-optiq.com/models) lists quantized models. Pick one whose download size is clearly below the Mac's memory, roughly 60 percent or less as a starting point (this is a rule of thumb, not a guarantee). Smaller models fit more context. Quant repo ids look like `mlx-community/<model>-OptiQ-4bit`. Check the id on the models page before using it. The help text of `optiq serve` uses `mlx-community/Qwen3.5-9B-OptiQ-4bit` as its example.

## 4. Serve

```bash
optiq serve --model mlx-community/Qwen3.5-9B-OptiQ-4bit --host 127.0.0.1 --port 8080
```

Starting the server downloads the model on first use, so confirm with the user before running it. Let the download finish; do not restart it. Flags confirmed in `optiq serve --help`:

- `--max-context auto|N|off`: caps context so a long prompt cannot crash the server. `auto` is the default.
- `--max-concurrent N`: how many requests decode in parallel (default 8). Lower it on a tight-memory Mac.
- `--idle-timeout SECONDS`: unload the model after idle time to free memory (default off).
- `--stream-experts`: for large mixture-of-experts models that do not fit in memory; the help says decode is slower.
- `--kv-bits 4|8`, `--kv-config FILE`: KV-cache quantization (see Limits).
- `--mtp`, `--ngram-draft N`, `--drafter ID`: optional speculative decoding. Only use them if the model supports it, and check the output as in step 6.
- `--host`, `--port` and other mlx-lm server options are forwarded.

Keep the host at `127.0.0.1` unless the user wants other machines to reach the server. Any other host needs `--api-key` (or `OPTIQ_API_KEY`); say that exposing a server on a network has security consequences.

## 5. Connect a client

The server speaks the OpenAI chat API at `http://127.0.0.1:8080/v1`. `optiq serve --help` lists the other endpoints it exposes. Smoke test:

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"mlx-community/Qwen3.5-9B-OptiQ-4bit","messages":[{"role":"user","content":"Say hello in five words."}],"max_tokens":32}'
```

For an SDK or tool, set its base URL to `http://127.0.0.1:8080/v1`. A local server needs no real key, but some clients insist on a non-empty value; with auth on (the default), Bearer tokens must start with `sk-optiq-` and a missing header is allowed. Started with `--api-key`, every request must carry that key. By default the `model` field is only a label and the one served model answers.

## 6. Quick speed and quality check

Speed: send one short and one long prompt, and time them (`time curl ...`, or read the `usage` in the response). Measure tokens per second of generation, not just time to the first word. Run each twice, because the first call is slower.

Quality: ask five or six questions from the user's real work whose answers you can check. Compare against the user's expectations. For a measured score, `optiq eval ./model_dir --task smoketest` runs a short benchmark on a model directory (its help estimates about 5 minutes on a 27B model). `optiq latency ./model_dir` predicts throughput without running inference.

Do not report speed as quality. A faster setting that changes answers is not an improvement; verify the output.

## Limits

- KV-cache quantization (`--kv-bits`, `--kv-config`) saves memory; it can make decoding slower, in one maintainer measurement 2 to 3 times slower at 60k tokens of context. Use it when a long context would not otherwise fit, not to gain speed, and measure on the user's own model.
- Long context needs memory for the cache, and prompts past the server's cache size are reprocessed each turn. Set `--max-context` rather than assuming the model's advertised window fits.
- Quantized models can be less accurate than the full-precision original. Check on the user's own tasks.
- Models that do not fit in memory can stream from disk with `--stream-experts`, at a large speed cost.
- Quantizing and local inference need Apple Silicon.

See `references/troubleshooting.md` for common problems.
