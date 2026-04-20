---
name: qdrant-search-quality-diagnosis
description: "Diagnoses Qdrant search quality issues. Use when someone reports 'results are bad', 'wrong results', 'not relevant results', 'missing matches', 'recall is low', 'approximate search worse than exact', 'which embedding model', or 'quality dropped after quantization'. Also use when search quality degrades without obvious changes."
---

# How to Diagnose Bad Search Quality

Before tuning, establish baselines. Use exact KNN as ground truth, compare against approximate HNSW. Target >95% recall@K for production.

## Don't Know What's Wrong Yet

Use when: results are irrelevant or missing expected matches and you need to isolate the cause.

- Test with `exact=true` to bypass HNSW approximation [Search API](https://search.qdrant.tech/md/documentation/tutorials-search-engineering/retrieval-quality/?s=standard-mode-vs-exact-search)
- Exact search bad = model or search pipeline problem. Exact good, approximate bad = tune HNSW.
- Check if quantization degrades quality (compare with and without)
- Check if filters are too restrictive (then you might need to use ACORN)
- If duplicate results from chunked documents, use Grouping API to deduplicate [Grouping](https://search.qdrant.tech/md/documentation/search/search/?s=grouping-api)

Payload filtering and sparse vector search are different things. Metadata (dates, categories, tags) goes in payload for filtering. Text content goes in sparse vectors for search.

## Approximate Search Worse Than Exact

Use when: exact search returns good results but HNSW approximation misses them.

- Increase `hnsw_ef` at query time [Search params](https://search.qdrant.tech/md/documentation/operations/optimize/?s=fine-tuning-search-parameters)
- Increase `ef_construct` (200+ for high quality) [HNSW config](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=vector-index)
- Increase `m` (16 default, 32 for high recall) [HNSW config](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=vector-index)
- Enable oversampling + rescore with quantization [Search with quantization](https://search.qdrant.tech/md/documentation/manage-data/quantization/?s=searching-with-quantization)
- ACORN for filtered queries (v1.16+) [ACORN](https://search.qdrant.tech/md/documentation/search/search/?s=acorn-search-algorithm)

Binary quantization requires rescore. Without it, quality loss is severe. Use oversampling (3-5x minimum for binary) to recover recall. Always test quantization impact on your data before production. [Quantization](https://search.qdrant.tech/md/documentation/manage-data/quantization/)

## Wrong Embedding Model

Use when: exact search also returns bad results.

Test top 3 MTEB models on 100-1000 sample queries, measure recall@10. Domain-specific models often outperform general models. [Hosted inference](https://search.qdrant.tech/md/documentation/inference/)

## Unoptimized Search Pipeline

Use when: exact search also returns bad results and model choice is confirmed by user.

Optimize search according to advanced search-strategies skill.

## What NOT to Do

- Tune Qdrant before verifying the model is right for the task (most quality issues are model issues)
- Use binary quantization without rescore (severe quality loss)
- Set `hnsw_ef` lower than results requested (guaranteed bad recall)
- Skip payload indexes on filtered fields then blame quality (HNSW can't traverse filtered-out nodes, and filterable HNSW is built only if payload indexes were set up prior)
- Deploy without baseline recall or other search relevance metrics (no way to measure regressions)
- Confuse payload filtering with sparse vector search (different things, different config)
