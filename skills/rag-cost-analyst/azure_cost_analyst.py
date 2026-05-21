"""
azure_cost_analyst.py - Comprehensive Azure cost analysis and optimization

IMPORTANT: All costs are ESTIMATES in USD based on Azure public pricing.
Minimum supported model is gpt-4o. gpt-4o-mini is NOT used.
Verify prices at: https://azure.microsoft.com/en-us/pricing/calculator/
"""

PRICING_DISCLAIMER = (
    "⚠️  All prices are estimates in USD. "
    "Verify at https://azure.microsoft.com/en-us/pricing/calculator/"
)


class AzureCostAnalyst:
    """Analyzes Azure deployment costs and recommends optimizations.
    
    Pricing model:
    - Azure OpenAI: pay-per-token (NOT a fixed monthly fee)
      Minimum model: gpt-4o ($2.50/1M input, $10.00/1M output)
    - Azure AI Search: fixed monthly per replica
      Free (≤50MB) → Basic ($82/replica) → Standard S1 ($295/replica)
    - App Insights: first 5GB/day free, then $2.76/GB
    - Storage: $0.018/GB/month (Hot LRS)
    """

    # Typical RAG query token usage
    TOKENS_PER_QUERY = {
        "input": 2_000,   # user query + retrieved context chunks
        "output": 500,    # LLM answer
        "embedding": 500, # query embedding
    }

    # Azure OpenAI — pay-per-token pricing (USD per 1M tokens)
    # Source: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
    OPENAI_PRICING = {
        "gpt-4o": {"input_per_1m": 2.50, "output_per_1m": 10.00},
        "o3-mini": {"input_per_1m": 1.10, "output_per_1m": 4.40},
    }

    # Azure AI Search — fixed monthly per replica (USD)
    # Source: https://azure.microsoft.com/en-us/pricing/details/search/
    SEARCH_PRICING = {
        "free":        {"per_replica": 0.0,   "max_gb": 0.05},
        "basic":       {"per_replica": 82.0,  "max_gb": 2.0},
        "standard_s1": {"per_replica": 295.0, "max_gb": 25.0},
        "standard_s2": {"per_replica": 590.0, "max_gb": 100.0},
    }

    # Semantic Search add-on: 1,000 free queries/month, then $5/1,000
    SEMANTIC_FREE_QUERIES = 1_000
    SEMANTIC_COST_PER_1K = 5.0

    # Embeddings — pay-per-token
    EMBEDDING_PRICING = {
        "text-embedding-3-small": 0.02,   # per 1M tokens
        "text-embedding-3-large": 0.13,   # per 1M tokens
    }

    def __init__(self):
        self.analysis = {}

    def analyze_deployment(self, deployment_config: dict, usage_metrics: dict = None) -> dict:
        """
        Comprehensive cost analysis for Azure RAG deployment.

        Args:
            deployment_config: {
                'openai_model': 'gpt-4o' (minimum),
                'embedding_model': 'text-embedding-3-small',
                'search_tier': 'free|basic|standard_s1|standard_s2',
                'search_replicas': int,
                'semantic_search': bool,
                'appinsights_retention_days': int,
                'estimated_docs_gb': float,
                'region': str
            }
            usage_metrics: {
                'queries_per_month': int,
            }

        Returns: comprehensive cost analysis dict
        """
        usage = usage_metrics or {"queries_per_month": 1_000}
        queries = usage.get("queries_per_month", 1_000)

        model = deployment_config.get("openai_model", "gpt-4o")
        emb_model = deployment_config.get("embedding_model", "text-embedding-3-small")
        search_tier = deployment_config.get("search_tier", "standard_s1")
        replicas = deployment_config.get("search_replicas", 1)
        semantic = deployment_config.get("semantic_search", False)
        docs_gb = deployment_config.get("estimated_docs_gb", 1.0)

        infra = self._calculate_infrastructure(deployment_config, queries)
        variable = self._calculate_variable_costs(model, emb_model, queries)
        semantic_cost = self._calculate_semantic_cost(semantic, search_tier, queries)

        total = infra["total_monthly"] + variable["total_monthly"] + semantic_cost

        self.analysis = {
            "deployment_config": deployment_config,
            "infrastructure_costs": infra,
            "variable_costs": variable,
            "semantic_search_cost": round(semantic_cost, 2),
            "total_monthly_usd": round(total, 2),
            "per_query_cost_usd": round(total / max(queries, 1), 4),
            "optimizations": self._recommend_optimizations(deployment_config, queries, total),
            "forecasts": self._forecast_scenarios(total, variable["inference_monthly"]),
            "disclaimer": PRICING_DISCLAIMER,
        }

        return self.analysis

    def _calculate_infrastructure(self, config: dict, queries_per_month: int) -> dict:
        """Calculate fixed monthly infrastructure costs (USD)."""
        search_tier = config.get("search_tier", "standard_s1")
        replicas = config.get("search_replicas", 1)
        docs_gb = config.get("estimated_docs_gb", 1.0)

        search_cost = self.SEARCH_PRICING[search_tier]["per_replica"] * replicas
        storage_cost = docs_gb * 0.018  # Hot LRS

        # App Insights: first 5GB/day free
        daily_gb_logs = (queries_per_month / 30) * 0.00005  # ~50KB per 1K queries
        over_free = max(0.0, daily_gb_logs - 5.0)
        appinsights_cost = over_free * 2.76 * 30

        costs = {
            "search": round(search_cost, 2),
            "storage": round(storage_cost, 2),
            "app_insights": round(appinsights_cost, 2),
        }
        return {
            "breakdown": costs,
            "total_monthly": sum(costs.values()),
            "total_annual": sum(costs.values()) * 12,
        }

    def _calculate_variable_costs(self, model: str, emb_model: str, queries: int) -> dict:
        """Calculate variable (pay-per-token) costs (USD)."""
        m = self.OPENAI_PRICING.get(model, self.OPENAI_PRICING["gpt-4o"])
        t = self.TOKENS_PER_QUERY

        cost_per_query = (
            t["input"] * m["input_per_1m"] / 1_000_000
            + t["output"] * m["output_per_1m"] / 1_000_000
        )
        inference_monthly = cost_per_query * queries

        emb_per_token = self.EMBEDDING_PRICING.get(emb_model, 0.02)
        emb_monthly = t["embedding"] * emb_per_token / 1_000_000 * queries

        return {
            "model": model,
            "cost_per_query_usd": round(cost_per_query, 5),
            "inference_monthly": round(inference_monthly, 2),
            "embedding_monthly": round(emb_monthly, 4),
            "total_monthly": round(inference_monthly + emb_monthly, 2),
        }

    def _calculate_semantic_cost(self, enabled: bool, search_tier: str, queries: int) -> float:
        """Semantic Search is only available on Standard S1+."""
        if not enabled or search_tier not in ("standard_s1", "standard_s2"):
            return 0.0
        over_free = max(0, queries - self.SEMANTIC_FREE_QUERIES)
        return (over_free / 1_000) * self.SEMANTIC_COST_PER_1K

    def _recommend_optimizations(self, config: dict, queries: int, total: float) -> list:
        """Generate specific, quantified optimization recommendations."""
        recs = []

        # Semantic search
        if not config.get("semantic_search") and config.get("search_tier") in ("standard_s1", "standard_s2"):
            extra = max(0, queries - self.SEMANTIC_FREE_QUERIES) / 1_000 * self.SEMANTIC_COST_PER_1K
            recs.append({
                "title": "Enable Semantic Search",
                "benefit": "~30% better query precision, fewer 'not found' answers",
                "added_cost_monthly_usd": round(extra, 2),
                "condition": f"First {self.SEMANTIC_FREE_QUERIES:,} queries/month free",
            })

        # High Availability
        if config.get("search_replicas", 1) < 2:
            tier = config.get("search_tier", "standard_s1")
            extra = self.SEARCH_PRICING[tier]["per_replica"]
            recs.append({
                "title": "Add 2nd Search Replica (High Availability)",
                "benefit": "99.9% uptime SLA, zero-downtime deployments",
                "added_cost_monthly_usd": round(extra, 2),
            })

        # Reserved capacity
        recs.append({
            "title": "Purchase 1-year Reserved Capacity",
            "benefit": "~25% discount on Search infrastructure",
            "savings_monthly_usd": round(total * 0.25, 2),
            "condition": "Requires 1-year commitment",
        })

        # Better embeddings
        if config.get("embedding_model", "text-embedding-3-small") == "text-embedding-3-small":
            recs.append({
                "title": "Upgrade to text-embedding-3-large",
                "benefit": "~15% better retrieval recall",
                "added_cost_per_query_usd": round(
                    (500 * (0.13 - 0.02)) / 1_000_000, 6
                ),
            })

        return recs

    def _forecast_scenarios(self, current_total: float, inference_monthly: float) -> dict:
        infra = current_total - inference_monthly
        return {
            "current_monthly_usd": round(current_total, 2),
            "current_annual_usd": round(current_total * 12, 2),
            "scenario_2x_traffic": {
                "label": "2× query volume",
                "monthly_usd": round(infra + inference_monthly * 2, 2),
            },
            "scenario_reserved_capacity": {
                "label": "With 1-year reserved capacity",
                "monthly_usd": round(current_total * 0.75, 2),
                "savings_monthly_usd": round(current_total * 0.25, 2),
            },
        }

    def get_cost_score(self) -> dict:
        """Rate cost efficiency 1–10."""
        config = self.analysis.get("deployment_config", {})
        score = 10

        if config.get("search_replicas", 1) > 3:
            score -= 1
        if config.get("search_tier") == "standard_s2" and config.get("estimated_docs_gb", 0) < 25:
            score -= 2  # Over-provisioned tier

        grade = {10: "Excellent", 9: "Excellent", 8: "Good", 7: "Fair", 6: "Could improve",
                 5: "Needs optimization", 4: "Wasteful"}.get(max(1, min(10, score)), "Review")

        return {"score": max(1, min(10, score)), "grade": grade}


# Example usage
if __name__ == "__main__":
    analyst = AzureCostAnalyst()

    config = {
        "openai_model": "gpt-4o",           # minimum model
        "embedding_model": "text-embedding-3-small",
        "search_tier": "standard_s1",
        "search_replicas": 1,
        "semantic_search": True,
        "estimated_docs_gb": 5.0,
        "appinsights_retention_days": 90,
        "region": "eastus",
    }

    usage = {"queries_per_month": 1_000}

    analysis = analyst.analyze_deployment(config, usage)
    print(f"Total Monthly: ${analysis['total_monthly_usd']:.2f}")
    print(f"Per Query:     ${analysis['per_query_cost_usd']:.4f}")
    print(f"Cost Grade:    {analyst.get_cost_score()['grade']}")
    print(f"\n{analysis['disclaimer']}")


