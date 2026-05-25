# External Assets

This directory is for optional binary/model assets that are re-downloadable and ignored by git.

Run from the repository root to restore the MiniLM ONNX model and tokenizer files:

```powershell
.\pptify-plugin\download-external-assets.ps1
```

Restores `all-MiniLM-L6-v2/model_quantized.onnx`, `tokenizer.json`, and `tokenizer_config.json` from the Hugging Face `sentence-transformers/all-MiniLM-L6-v2` repository.

Pass `-MiniLmModelPath onnx/model.onnx` for the larger non-quantized model. Use `-Force` to overwrite existing files.