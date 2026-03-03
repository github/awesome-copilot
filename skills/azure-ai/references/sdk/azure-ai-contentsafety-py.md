# Azure AI Content Safety — Python SDK Quick Reference

> Condensed from **azure-ai-contentsafety-py**. Full patterns (blocklist management, image analysis, 8-severity mode)
> in the **azure-ai-contentsafety-py** plugin skill if installed.

## Install
```bash
pip install azure-ai-contentsafety
```

## Quick Start
```python
from azure.ai.contentsafety import ContentSafetyClient, BlocklistClient
from azure.ai.contentsafety.models import AnalyzeTextOptions, TextCategory
client = ContentSafetyClient(endpoint=endpoint, credential=credential)
```

## Non-Obvious Patterns
- Two clients: `ContentSafetyClient` (analyze) and `BlocklistClient` (blocklist management)
- Image from file: base64-encode bytes, pass via `ImageData(content=base64_str)`
- 8-severity mode: `AnalyzeTextOptions(text=..., output_type=AnalyzeTextOutputType.EIGHT_SEVERITY_LEVELS)`
- Blocklist analyze: `AnalyzeTextOptions(text=..., blocklist_names=[...], halt_on_blocklist_hit=True)`

## Best Practices
1. Use blocklists for domain-specific terms
2. Set severity thresholds appropriate for your use case
3. Handle multiple categories — content can be harmful in multiple ways
4. Use `halt_on_blocklist_hit` for immediate rejection
5. Log analysis results for audit and improvement
6. Consider 8-severity mode for finer-grained control
7. Pre-moderate AI outputs before showing to users
