# Azure AI Transcription — Python SDK Quick Reference

> Condensed from **azure-ai-transcription-py**. Full patterns (real-time streaming, diarization, timestamps)
> in the **azure-ai-transcription-py** plugin skill if installed.

## Install
```bash
pip install azure-ai-transcription
```

## Quick Start
```python
import os
from azure.ai.transcription import TranscriptionClient
client = TranscriptionClient(endpoint=os.environ["TRANSCRIPTION_ENDPOINT"],
    credential=os.environ["TRANSCRIPTION_KEY"])
```

## Non-Obvious Patterns
- Auth uses subscription key string directly (not AzureKeyCredential); DefaultAzureCredential not supported
- Batch: `client.begin_transcription(name=..., locale="en-US", content_urls=[...], diarization_enabled=True)`
- Real-time: `stream = client.begin_stream_transcription(locale="en-US"); stream.send_audio_file("audio.wav")`

## Best Practices
1. Enable diarization when multiple speakers are present
2. Use batch transcription for long files stored in blob storage
3. Capture timestamps for subtitle generation
4. Specify language to improve recognition accuracy
5. Handle streaming backpressure for real-time transcription
6. Close transcription sessions when complete
