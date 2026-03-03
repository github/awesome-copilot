# Azure AI Text Translation — Python SDK Quick Reference

> Condensed from **azure-ai-translation-text-py**. Full patterns (transliteration, dictionary lookup, sentence boundaries)
> in the **azure-ai-translation-text-py** plugin skill if installed.

## Install
```bash
pip install azure-ai-translation-text
```

## Quick Start
```python
from azure.ai.translation.text import TextTranslationClient
from azure.core.credentials import AzureKeyCredential
client = TextTranslationClient(credential=AzureKeyCredential(key), region=region)
```

## Non-Obvious Patterns
- API key auth requires `region` param: `TextTranslationClient(credential=..., region="eastus")`
- Source language param: `from_parameter="fr"` (not `from` — reserved word)
- Dict example model: `from azure.ai.translation.text.models import DictionaryExampleTextItem`
- Async: `from azure.ai.translation.text.aio import TextTranslationClient`

## Best Practices
1. Batch translations — send multiple texts in one request (up to 100)
2. Specify source language when known to improve accuracy
3. Use async client for high-throughput scenarios
4. Cache language list — supported languages change infrequently
5. Handle profanity appropriately for your application
6. Use `html` text_type when translating HTML content
7. Include alignment for applications needing word mapping
