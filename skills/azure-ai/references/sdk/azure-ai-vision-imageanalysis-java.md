# Azure AI Vision Image Analysis — Java SDK Quick Reference

> Condensed from **azure-ai-vision-imageanalysis-java**. Full patterns (dense captions, smart crops, people detection)
> in the **azure-ai-vision-imageanalysis-java** plugin skill if installed.

## Install
```xml
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-ai-vision-imageanalysis</artifactId>
  <version>1.1.0-beta.1</version>
</dependency>
```

## Quick Start
```java
import com.azure.ai.vision.imageanalysis.ImageAnalysisClient;
import com.azure.ai.vision.imageanalysis.ImageAnalysisClientBuilder;
import com.azure.ai.vision.imageanalysis.models.*;
ImageAnalysisClient client = new ImageAnalysisClientBuilder()
    .endpoint(endpoint).credential(credential).buildClient();
```

## Non-Obvious Patterns
- File input: `BinaryData.fromFile(new File("img.jpg").toPath())`
- URL: `client.analyzeFromUrl(url, Arrays.asList(VisualFeatures.CAPTION), options)`
- `ImageAnalysisOptions.setSmartCropsAspectRatios(Arrays.asList(1.0, 1.5))`

## Best Practices
1. Select only needed features to reduce latency and cost
2. Caption/Dense Captions require GPU-supported regions
3. Use `setGenderNeutralCaption(true)` for inclusive output
4. Specify language with `setLanguage("en")` for localized captions
5. Use async client for high-throughput scenarios
