# Troubleshooting local serving

- Out of memory or the server exits: pick a smaller model or quant, lower `--max-concurrent`, set `--max-context` to a smaller number, close other apps. The default `--on-generation-death restart` re-launches the server after a generation crash; clients get a retryable error.
- Nothing answers on the port: check the server is still running and that the port matches. `optiq serve` defaults to port 8080 (from the mlx-lm server); use `--port` if something else uses it.
- The first request is very slow: the model is loading, or the first long prompt is being processed. Wait and retry once.
- Client says model not found: by default the `model` field is a label. Use the repo id you served.
- Memory stays high when idle: use `--idle-timeout` to unload the model; it reloads on the next request.
- Settings: `optiq config` shows every setting and where it came from.
