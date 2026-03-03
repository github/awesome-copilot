# Azure Translation — TypeScript SDK Quick Reference

> Condensed from **azure-ai-translation-ts**. Full patterns (document translation, batch SAS, transliterate)
> in the **azure-ai-translation-ts** plugin skill if installed.

## Install
```bash
npm install @azure-rest/ai-translation-text @azure/identity
```

## Quick Start
```typescript
import TextTranslationClient, { TranslatorCredential, isUnexpected } from "@azure-rest/ai-translation-text";
const credential: TranslatorCredential = { key: process.env.TRANSLATOR_SUBSCRIPTION_KEY!, region: process.env.TRANSLATOR_REGION! };
const client = TextTranslationClient(process.env.TRANSLATOR_ENDPOINT!, credential);
```

## Non-Obvious Patterns
- REST client — `TextTranslationClient` is a function, not a class
- Translate via `client.path("/translate").post({ body: { inputs: [...] } })`
- Document translation: separate package `@azure-rest/ai-translation-document`
- Batch docs require SAS URLs for source/target blob containers

## Best Practices
1. Auto-detect source — omit `language` parameter to auto-detect
2. Batch requests — translate multiple texts in one call for efficiency
3. Use SAS tokens — for document translation, use time-limited SAS URLs
4. Handle errors — always check `isUnexpected(response)` before accessing body
5. Regional endpoints — use regional endpoints for lower latency
