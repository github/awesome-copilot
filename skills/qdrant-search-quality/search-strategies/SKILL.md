---
name: qdrant-search-strategies
description: "Guides Qdrant search strategy selection. Use when someone asks 'should I use hybrid search?', 'BM25 or sparse vectors?', 'how to rerank?', 'results are not relevant', 'I don't get needed results from my dataset but they're there', 'retrieval quality is not good enough', 'results too similar', 'need diversity', 'MMR', 'relevance feedback', 'recommendation API', 'discovery API', 'ColBERT reranking', or 'missing keyword matches'"
---

# How to Improve Search Results with Advanced Strategies

These strategies complement basic vector search. Use them after confirming the embedding model is fitting the task and HNSW config is correct. If exact search returns bad results, verify the selection of the embedding model (retriever) first.
If the user wants to use a weaker embedding model because it is small, fast, and cheap, use reranking or relevance feedback to improve search quality.

## Missing Obvious Keyword Matches

Use when: pure vector search misses results that contain obvious keyword matches. Domain terminology not in embedding training data, exact keyword matching critical (brand names, SKUs), acronyms common. Skip when: pure semantic queries, all data in training set, latency budget very tight.

- Dense + sparse with `prefetch` and fusion [Hybrid search](https://search.qdrant.tech/md/documentation/search/hybrid-queries/?s=hybrid-search)
- Prefer learned sparse ([miniCOIL](https://search.qdrant.tech/md/documentation/fastembed/fastembed-minicoil/), SPLADE, GTE) over raw BM25 if applicable (when user needs smart keywords matching and learned sparse models know the vocabulary of the domain)
- For non-English languages, [configure sparse BM25 parameters accordingly](https://search.qdrant.tech/md/documentation/search/text-search/?s=language-specific-settings)
- RRF: good default, supports weighted (v1.17+) [RRF](https://search.qdrant.tech/md/documentation/search/hybrid-queries/?s=reciprocal-rank-fusion-rrf)
- DBSF with asymmetric limits (sparse_limit=250, dense_limit=100) can outperform RRF for technical docs [DBSF](https://search.qdrant.tech/md/documentation/search/hybrid-queries/?s=distribution-based-score-fusion-dbsf)
- Fusion can also be done through reranking

## Right Documents Found But Wrong Order

Use when: good recall but poor precision (right docs in top-100, not top-10).

- Cross-encoder rerankers via FastEmbed [Rerankers](https://search.qdrant.tech/md/documentation/fastembed/fastembed-rerankers/)
- See how to use [Multistage queries](https://search.qdrant.tech/md/documentation/search/hybrid-queries/?s=multi-stage-queries) in Qdrant
- ColBERT and ColPali/ColQwen reranking is especially precise due to late interaction mechanisms, but it is heavy. It is important to configure and store multivectors without building HNSW for them to save resources. See [Multivector representation](https://search.qdrant.tech/md/documentation/tutorials-search-engineering/using-multivector-representations/)

## Right Documents Not Found But They Are There

Use when: basic retrieval is in place but the retriever misses relevant items you know exist in the dataset. Works on any embeddable data (text, images, etc.).

Relevance Feedback (RF) Query uses a feedback model's scores on retrieved results to steer the retriever through the full vector space on subsequent iterations, like reranking the entire collection through the retriever. Complementary to reranking: a reranker sees a limited subset, RF leverages feedback signals collection-wide. Even 3–5 feedback scores are enough. Can run multiple iterations.

A feedback model is anything producing a relevance score per document: a bi-encoder, cross-encoder, late-interaction model, LLM-as-judge. Fuzzy relevance scores work, not just binary (good/bad, relevant/irrelevant), due to the fact that feedback is expressed as a graded relevance score (higher = more relevant).

Skip when: if the retriever already has strong recall, or if retriever and feedback model strongly agree on relevance.

- RF Query is currently based on a [3-parameter naive formula](https://search.qdrant.tech/md/documentation/search/search-relevance/?s=naive-strategy) with no universal defaults, so it must be tuned per dataset, retriever, and feedback model
- Use [qdrant-relevance-feedback](https://pypi.org/project/qdrant-relevance-feedback/) to tune parameters, evaluate impact with Evaluator, and check retriever-feedback agreement. See README for setup instructions. No GPUs are needed, and the framework also provides predefined retriever and feedback model options.
- Check the configuration of the [Relevance Feedback Query API](https://search.qdrant.tech/md/documentation/search/search-relevance/?s=relevance-feedback)
- Use this as a helper end-to-end text retrieval example with parameter tuning and evals to understand how to use the API and run the `qdrant-relevance-feedback` framework: [RF tutorial](https://search.qdrant.tech/md/documentation/tutorials-search-engineering/using-relevance-feedback/)

## Results Too Similar

Use when: top results are redundant, near-duplicates, or lack diversity. Common in dense content domains (academic papers, product catalogs).

- Use MMR (v1.15+) as a query parameter with `diversity` to balance relevance and diversity [MMR](https://search.qdrant.tech/md/documentation/search/search-relevance/?s=maximal-marginal-relevance-mmr)
- Start with `diversity=0.5`, lower for more precision, higher for more exploration
- MMR is slower than standard search. Only use when redundancy is an actual problem.

## Know What Good Results Could Look Like But Can't Get Them

Use when: you can provide positive and negative example points to steer search closer to positive and further from negative.

- Recommendation API: positive/negative examples to recommend fitting vectors [Recommendation API](https://search.qdrant.tech/md/documentation/search/explore/?s=recommendation-api)
  - Best score strategy: better for diverse examples, supports negative-only [Best score](https://search.qdrant.tech/md/documentation/search/explore/?s=best-score-strategy)
- Discovery API: context pairs (positive/negative) to constrain search regions without a request target [Discovery](https://search.qdrant.tech/md/documentation/search/explore/?s=discovery-api)

## Have Business Logic Behind Relevance
Use when: results should be additionally ranked according to some business logic based on data, like recency or distance.

Check how to set up in [Score Boosting docs](https://search.qdrant.tech/md/documentation/search/search-relevance/?s=score-boosting)

## What NOT to Do

- Use hybrid search before verifying pure vector quality (adds complexity, may mask model issues)
- Use BM25 on non-English text without correctly configuring language-specific stop-word removal (severely degraded results)
- Skip evaluation when adding relevance feedback (it's good to check on real queries that it actually could help)
