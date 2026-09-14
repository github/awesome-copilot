# Searchd AEO audit methodology

## What the audit measures

The audit measures whether independent web-research workers naturally name a
target company while answering a fixed set of buyer questions.

It records:

- Target-brand mentions.
- Ordered recommendation position when available.
- Co-mentioned brands.
- Sources used in the answer.
- Which questions produce or omit the target brand.

## What the audit does not measure

- Consumer-app impressions or clicks.
- Market share.
- A model's training-data contents.
- Internal crawling, indexing, retrieval, or ranking state.
- Guaranteed responses from ChatGPT, Claude, Gemini, Perplexity, or Google AI
  Overviews.

## Contamination control

Question workers do not receive the target brand or website context. They
receive only the question, market, language, and neutral research instruction.
Brand matching happens after the answer is complete.

## Reproducibility

Every report records the question set, measurement time, agent label, search
method, valid and failed runs, answer excerpts, and URLs. Repeating the audit
can still produce different results because public search results and agent
behavior change.

## Interpretation

Treat one run per question as directional discovery. Use repeated runs with a
fixed question panel before claiming a trend or a small difference between
competitors.
