# Azure Document Intelligence — .NET SDK Quick Reference

> Condensed from **azure-ai-document-intelligence-dotnet**. Full patterns (custom models, classifiers, layout extraction)
> in the **azure-ai-document-intelligence-dotnet** plugin skill if installed.

## Install
```bash
dotnet add package Azure.AI.DocumentIntelligence
```

## Quick Start
```csharp
using Azure.AI.DocumentIntelligence;
var client = new DocumentIntelligenceClient(new Uri(endpoint), credential);
var adminClient = new DocumentIntelligenceAdministrationClient(new Uri(endpoint), credential);
```

## Non-Obvious Patterns
- Analyze is async LRO: `await client.AnalyzeDocumentAsync(WaitUntil.Completed, "prebuilt-invoice", uri)`
- Field access: `document.Fields.TryGetValue("VendorName", out DocumentField field)`
- Custom model build: `BuildDocumentModelOptions(modelId, DocumentBuildMode.Template, blobSource)`
- Entra ID requires custom subdomain, not regional endpoint

## Best Practices
1. Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
2. Reuse client instances — clients are thread-safe
3. Handle long-running operations with `WaitUntil.Completed`
4. Check field confidence — always verify `Confidence` property
5. Use appropriate model — prebuilt for common docs, custom for specialized
6. Use custom subdomain — required for Entra ID authentication
