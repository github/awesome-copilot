# Azure AI Content Safety — Java SDK Quick Reference

> Condensed from **azure-ai-contentsafety-java**. Full patterns (blocklist management, image moderation, 8-severity)
> in the **azure-ai-contentsafety-java** plugin skill if installed.

## Install
```xml
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-ai-contentsafety</artifactId>
  <version>1.1.0-beta.1</version>
</dependency>
```

## Quick Start
```java
import com.azure.ai.contentsafety.ContentSafetyClient;
import com.azure.ai.contentsafety.ContentSafetyClientBuilder;
import com.azure.ai.contentsafety.BlocklistClient;
import com.azure.ai.contentsafety.BlocklistClientBuilder;
ContentSafetyClient client = new ContentSafetyClientBuilder()
    .endpoint(endpoint).credential(credential).buildClient();
```

## Non-Obvious Patterns
- Two separate builders: `ContentSafetyClientBuilder` and `BlocklistClientBuilder`
- Image from file: `new ContentSafetyImageData().setContent(BinaryData.fromBytes(bytes))`
- Image from URL: `new ContentSafetyImageData().setBlobUrl(url)`
- Blocklist create uses raw `BinaryData` + `RequestOptions` (not typed model)

## Best Practices
1. Blocklist changes take ~5 minutes to take effect
2. Only request needed categories to reduce latency
3. Typically block severity >= 4 for strict moderation
4. Process multiple items in parallel for throughput
5. Cache blocklist results where appropriate
