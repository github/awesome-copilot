# Azure AI Vision Image Analysis — Python SDK Quick Reference

> Condensed from **azure-ai-vision-imageanalysis-py**. Full patterns (dense captions, smart crops, people detection)
> in the **azure-ai-vision-imageanalysis-py** plugin skill if installed.

## Install
```bash
pip install azure-ai-vision-imageanalysis
```

## Quick Start
```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
client = ImageAnalysisClient(endpoint=endpoint, credential=credential)
```

## Non-Obvious Patterns
- `analyze_from_url(image_url=..., visual_features=[...])` for URL; `analyze(image_data=bytes)` for file
- VisualFeatures enum: `CAPTION`, `DENSE_CAPTIONS`, `TAGS`, `OBJECTS`, `READ`, `PEOPLE`, `SMART_CROPS`
- Async: `from azure.ai.vision.imageanalysis.aio import ImageAnalysisClient`

## Best Practices
1. Select only needed visual features to optimize latency and cost
2. Use async client for high-throughput scenarios
3. Handle HttpResponseError for invalid images or auth issues
4. Enable `gender_neutral_caption` for inclusive descriptions
5. Specify `language` for localized captions
6. Use `smart_crops_aspect_ratios` matching your thumbnail requirements
7. Cache results when analyzing the same image multiple times
