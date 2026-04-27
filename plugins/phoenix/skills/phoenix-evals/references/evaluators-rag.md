# Evaluators: RAG Systems

RAG has two distinct components requiring different evaluation approaches.

## Two-Phase Evaluation

```
RETRIEVAL                    GENERATION
─────────                    ──────────
Query → Retriever → Docs     Docs + Query → LLM → Answer
         │                              │
    IR Metrics              LLM Judges / Code Checks
```

**Debug retrieval first** using IR metrics, then tackle generation quality.

## Retrieval Evaluation (IR Metrics)

Use traditional information retrieval metrics:

| Metric | What It Measures |
| ------ | ---------------- |
| Recall@k | Of all relevant docs, how many in top k? |
| Precision@k | Of k retrieved docs, how many relevant? |
| MRR | How high is first relevant doc? |
| NDCG | Quality weighted by position |

```python
# Requires query-document relevance labels
def recall_at_k(retrieved_ids, relevant_ids, k=5):
    retrieved_set = set(retrieved_ids[:k])
    relevant_set = set(relevant_ids)
    if not relevant_set:
        return 0.0
    return len(retrieved_set & relevant_set) / len(relevant_set)
```

## Creating Retrieval Test Data

Generate query-document pairs synthetically:

```python
# Reverse process: document → questions that document answers
def generate_retrieval_test(documents):
    test_pairs = []
    for doc in documents:
        # Extract facts, generate questions
        questions = llm(f"Generate 3 questions this document answers:\n{doc}")
        for q in questions:
            test_pairs.append({"query": q, "relevant_doc_id": doc.id})
    return test_pairs
```

## Generation Evaluation

Use LLM judges for qualities code can't measure:

| Eval | Question |
| ---- | -------- |
| **Faithfulness** | Are all claims supported by retrieved context? |
| **Relevance** | Does answer address the question? |
| **Completeness** | Does answer cover key points from context? |

```python
from phoenix.evals import ClassificationEvaluator, LLM

FAITHFULNESS_TEMPLATE = """Given the context and answer, is every claim in the answer supported by the context?

<context>{{context}}</context>
<answer>{{output}}</answer>

"faithful" = ALL claims supported by context
"unfaithful" = ANY claim NOT in context

Answer (faithful/unfaithful):"""

faithfulness = ClassificationEvaluator(
    name="faithfulness",
    prompt_template=FAITHFULNESS_TEMPLATE,
    llm=LLM(provider="openai", model="gpt-4o"),
    choices={"unfaithful": 0, "faithful": 1}
)
```

## RAG Failure Taxonomy

Common failure modes to evaluate:

```yaml
retrieval_failures:
  - no_relevant_docs: Query returns unrelated content
  - partial_retrieval: Some relevant docs missed
  - wrong_chunk: Right doc, wrong section

generation_failures:
  - hallucination: Claims not in retrieved context
  - ignored_context: Answer doesn't use retrieved docs
  - incomplete: Missing key information from context
  - wrong_synthesis: Misinterprets or miscombines sources
```

## Evaluation Order

1. **Retrieval first** - If wrong docs, generation will fail
2. **Faithfulness** - Is answer grounded in context?
3. **Answer quality** - Does answer address the question?

Fix retrieval problems before debugging generation.
