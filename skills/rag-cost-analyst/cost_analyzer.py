"""
Cost Analyzer Skill - Validate infrastructure costs before deployment

IMPORTANT: All costs are ESTIMATES based on Azure public pricing (USD).
Actual costs depend on usage, region, and discounts.
Always verify at: https://azure.microsoft.com/en-us/pricing/calculator/

MODEL AVAILABILITY NOTE:
  Azure OpenAI model availability varies by region.
  This skill checks availability via Azure CLI when credentials are present,
  and falls back to a known-good static table otherwise.
  Source: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models

Reference: https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview
"""

import os
import json
import logging
import subprocess
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

PRICING_DISCLAIMER = (
    "⚠️  All prices are estimates in USD. "
    "Verify at https://azure.microsoft.com/en-us/pricing/calculator/"
)

# ---------------------------------------------------------------------------
# MODEL AVAILABILITY BY REGION
# Static fallback table — updated 2026-05.
# Source: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models
# Use check_model_availability_live() for real-time data when Azure CLI is available.
# ---------------------------------------------------------------------------
MODEL_AVAILABILITY: Dict[str, List[str]] = {
    # gpt-4o: widely available
    "gpt-4o": [
        "eastus", "eastus2", "westus", "westus2", "westus3",
        "northcentralus", "southcentralus",
        "northeurope", "westeurope", "swedencentral",
        "uksouth", "francecentral",
        "australiaeast", "japaneast",
    ],
    # o3-mini: more limited availability
    "o3-mini": [
        "eastus", "eastus2", "westus2",
        "northcentralus", "swedencentral",
    ],
    # Embeddings — broadly available wherever gpt-4o is
    "text-embedding-3-small": [
        "eastus", "eastus2", "westus", "westus2", "westus3",
        "northcentralus", "southcentralus",
        "northeurope", "westeurope", "swedencentral",
        "uksouth", "francecentral",
        "australiaeast", "japaneast",
    ],
    "text-embedding-3-large": [
        "eastus", "eastus2", "westus2",
        "northcentralus", "southcentralus",
        "northeurope", "swedencentral",
        "australiaeast",
    ],
}

# Suggested fallback regions when a model isn't in the user's preferred region
MODEL_FALLBACK_REGIONS: Dict[str, List[str]] = {
    "gpt-4o":                 ["eastus", "swedencentral", "westus2"],
    "o3-mini":                ["eastus", "eastus2", "swedencentral"],
    "text-embedding-3-small": ["eastus", "swedencentral", "westus2"],
    "text-embedding-3-large": ["eastus", "swedencentral", "westus2"],
}


def check_model_availability_static(model: str, region: str) -> bool:
    """Check model availability using the static table (no Azure CLI needed)."""
    available_regions = MODEL_AVAILABILITY.get(model, [])
    return region.lower() in [r.lower() for r in available_regions]


def check_model_availability_live(model: str, region: str) -> Optional[bool]:
    """
    Check model availability via Azure CLI (real-time).
    Returns None if Azure CLI is not available or not logged in.

    Calls: az cognitiveservices model list --location <region>
    """
    try:
        result = subprocess.run(
            ["az", "cognitiveservices", "model", "list",
             "--location", region, "--output", "json"],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            logger.debug("az cognitiveservices model list failed: %s", result.stderr)
            return None

        models = json.loads(result.stdout)
        available_names = [
            m.get("model", {}).get("name", "") for m in models
        ]
        return model in available_names

    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        logger.debug("Live model check unavailable: %s", e)
        return None


def check_model_availability(model: str, region: str) -> Dict:
    """
    Check if a model is available in a region.
    Tries live check first; falls back to static table.

    Returns:
        {
          "available": bool,
          "source": "live" | "static",
          "fallback_regions": [...] if not available
        }
    """
    live = check_model_availability_live(model, region)

    if live is not None:
        available = live
        source = "live"
    else:
        available = check_model_availability_static(model, region)
        source = "static (verify at aka.ms/oai/regions)"

    result = {"available": available, "source": source, "model": model, "region": region}

    if not available:
        result["fallback_regions"] = MODEL_FALLBACK_REGIONS.get(model, ["eastus"])
        result["note"] = (
            f"'{model}' not confirmed in '{region}'. "
            f"Try: {result['fallback_regions'][:3]}"
        )

    return result


def validate_region_models(models: List[str], region: str) -> Dict:
    """
    Validate all required models are available in the target region.
    Returns a summary with warnings and suggested alternatives.
    """
    checks = {m: check_model_availability(m, region) for m in models}
    unavailable = {m: r for m, r in checks.items() if not r["available"]}

    result = {
        "region": region,
        "all_available": len(unavailable) == 0,
        "checks": checks,
    }

    if unavailable:
        # Find a region where ALL required models are available
        all_regions = set(MODEL_AVAILABILITY.get(models[0], []))
        for m in models[1:]:
            all_regions &= set(MODEL_AVAILABILITY.get(m, []))

        result["unavailable_models"] = list(unavailable.keys())
        result["suggested_regions"] = sorted(all_regions)[:5]
        result["warning"] = (
            f"Models {list(unavailable.keys())} not confirmed in '{region}'. "
            f"Suggested regions where all models are available: {sorted(all_regions)[:3]}"
        )

    return result



class DocumentSize(Enum):
    """Document size categories for cost estimation"""
    SMALL = "small"          # < 1 GB
    MEDIUM = "medium"        # 1-10 GB
    LARGE = "large"          # 10-50 GB
    ENTERPRISE = "enterprise"  # > 50 GB


class HARequirement(Enum):
    """High availability requirement"""
    NONE = "none"
    STANDARD = "standard"
    CRITICAL = "critical"


@dataclass
class CostEstimate:
    """Cost estimation result"""
    # OpenAI — pay-per-token (not a fixed monthly fee)
    openai_model: str
    openai_input_cost_per_1m_tokens: float
    openai_output_cost_per_1m_tokens: float
    openai_estimated_monthly_cost: float  # based on estimated_queries_monthly

    # Search
    search_tier: str
    search_replicas: int
    search_monthly_cost: float
    semantic_search_enabled: bool
    semantic_search_monthly_cost: float

    # Embeddings (pay-per-token)
    embedding_model: str
    embedding_cost_per_1m_tokens: float
    embedding_estimated_monthly_cost: float

    # Storage + Monitoring
    storage_monthly_cost: float
    appinsights_retention_days: int
    appinsights_monthly_cost: float

    # Totals
    total_monthly_cost: float
    per_query_cost: float
    estimated_queries_per_month: int

    warnings: List[str]
    recommendations: List[str]
    disclaimer: str = PRICING_DISCLAIMER


class CostAnalyzer:
    """
    Analyze and validate infrastructure costs.

    Pricing source: Azure public pricing page (USD), as of 2026-05.
    Model: gpt-4o is the MINIMUM supported model across all agents.
    """

    # Azure OpenAI pricing — pay-per-token (USD per 1M tokens)
    # Source: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
    OPENAI_MODELS = {
        # gpt-4o: minimum model used across all agents
        "gpt-4o": {
            "input_per_1m": 2.50,
            "output_per_1m": 10.00,
            "description": "Standard model — minimum supported",
        },
        # gpt-4o-mini: NOT used (below minimum quality bar)
        # "gpt-4o-mini": excluded by design
        # o3-mini: reasoning tasks, higher cost
        "o3-mini": {
            "input_per_1m": 1.10,
            "output_per_1m": 4.40,
            "description": "Reasoning model for complex tasks",
        },
    }

    # Embedding models — pay-per-token
    EMBEDDING_MODELS = {
        "text-embedding-3-small": {
            "cost_per_1m": 0.02,
            "description": "Default — good balance of cost/quality",
        },
        "text-embedding-3-large": {
            "cost_per_1m": 0.13,
            "description": "Higher quality retrieval, ~15% better recall",
        },
    }

    # Azure AI Search monthly pricing (USD)
    # Source: https://azure.microsoft.com/en-us/pricing/details/search/
    # Price shown is PER REPLICA
    SEARCH_TIERS = {
        "free": {
            "per_replica": 0.0,
            "max_storage_gb": 0.05,
            "semantic_available": False,
            "description": "≤50MB docs. No HA. No semantic.",
        },
        "basic": {
            "per_replica": 82.0,
            "max_storage_gb": 2.0,
            "semantic_available": False,
            "description": "≤2GB docs. No semantic search.",
        },
        "standard_s1": {
            "per_replica": 295.0,
            "max_storage_gb": 25.0,
            "semantic_available": True,
            "description": "Up to 25GB. Semantic search available.",
        },
        "standard_s2": {
            "per_replica": 590.0,
            "max_storage_gb": 100.0,
            "semantic_available": True,
            "description": "Up to 100GB.",
        },
    }

    # Semantic Search add-on (Azure AI Search S1+)
    # First 1,000 queries/month free, then $5/1,000 queries
    SEMANTIC_SEARCH_FREE_QUERIES = 1_000
    SEMANTIC_SEARCH_COST_PER_1K = 5.0

    # Typical RAG query token usage
    TOKENS_PER_QUERY = {
        "input": 2_000,   # ~500 user query + ~1,500 retrieved chunks
        "output": 500,    # LLM response
        "embedding": 500, # query embedding
    }

    # App Insights — first 5GB/day free, then $2.76/GB
    APPINSIGHTS_FREE_GB_PER_DAY = 5.0
    APPINSIGHTS_COST_PER_GB_OVER_FREE = 2.76
    # Estimated log GB per 1,000 queries
    APPINSIGHTS_GB_PER_1K_QUERIES = 0.05

    # Blob Storage (document backup)
    STORAGE_PER_GB = 0.018  # Hot tier LRS

    def _search_tier_for_docs(self, doc_size: DocumentSize) -> str:
        """Choose minimum Search tier based on document volume."""
        if doc_size == DocumentSize.SMALL:
            return "basic"
        elif doc_size in (DocumentSize.MEDIUM, DocumentSize.LARGE):
            return "standard_s1"
        else:
            return "standard_s2"

    def estimate_costs(
        self,
        doc_size: DocumentSize,
        budget_usd: float,
        ha_required: HARequirement = HARequirement.NONE,
        semantic_search: bool = False,
        estimated_docs_gb: float = 1.0,
        estimated_queries_monthly: int = 1_000,
        openai_model: str = "gpt-4o",
        embedding_model: str = "text-embedding-3-small",
    ) -> CostEstimate:
        """
        Estimate monthly infrastructure costs.

        All costs in USD. gpt-4o is the minimum supported model.
        """
        # --- OpenAI cost (pay-per-token) ---
        model_pricing = self.OPENAI_MODELS[openai_model]
        tokens = self.TOKENS_PER_QUERY
        cost_per_query = (
            (tokens["input"] * model_pricing["input_per_1m"] / 1_000_000)
            + (tokens["output"] * model_pricing["output_per_1m"] / 1_000_000)
        )
        openai_monthly = cost_per_query * estimated_queries_monthly

        # --- Embedding cost (pay-per-token) ---
        emb_pricing = self.EMBEDDING_MODELS[embedding_model]
        emb_cost_per_query = tokens["embedding"] * emb_pricing["cost_per_1m"] / 1_000_000
        embedding_monthly = emb_cost_per_query * estimated_queries_monthly

        # --- Search cost ---
        search_tier = self._search_tier_for_docs(doc_size)
        tier_info = self.SEARCH_TIERS[search_tier]
        replicas = 1 if ha_required == HARequirement.NONE else 2
        search_monthly = tier_info["per_replica"] * replicas

        # --- Semantic search cost ---
        semantic_cost = 0.0
        if semantic_search and tier_info["semantic_available"]:
            queries_over_free = max(0, estimated_queries_monthly - self.SEMANTIC_SEARCH_FREE_QUERIES)
            semantic_cost = (queries_over_free / 1_000) * self.SEMANTIC_SEARCH_COST_PER_1K

        # --- Storage cost ---
        storage_monthly = estimated_docs_gb * self.STORAGE_PER_GB

        # --- App Insights cost ---
        # Estimate log volume from query count
        daily_gb = (estimated_queries_monthly / 30) * (self.APPINSIGHTS_GB_PER_1K_QUERIES / 1_000)
        over_free = max(0.0, daily_gb - self.APPINSIGHTS_FREE_GB_PER_DAY)
        appinsights_monthly = over_free * self.APPINSIGHTS_COST_PER_GB_OVER_FREE * 30

        # --- Totals ---
        total = (
            openai_monthly
            + embedding_monthly
            + search_monthly
            + semantic_cost
            + storage_monthly
            + appinsights_monthly
        )
        per_query = total / max(estimated_queries_monthly, 1)

        # --- Warnings & recommendations ---
        warnings, recommendations = [], []

        if total > budget_usd * 1.1:
            warnings.append(
                f"⚠️  Config exceeds budget: ${total:.0f}/mo vs ${budget_usd:.0f}/mo budget"
            )
        if not semantic_search:
            recommendations.append(
                "💡 Enable Semantic Search (+$5/1K queries over 1K free) for ~30% better precision"
            )
        if ha_required == HARequirement.NONE:
            recommendations.append(
                "💡 Add a 2nd Search replica for High Availability (+$295/mo for Standard S1)"
            )
        if search_tier == "free":
            recommendations.append(
                "⚠️  Free tier limited to 50MB docs. Upgrade to Basic when docs grow."
            )

        return CostEstimate(
            openai_model=openai_model,
            openai_input_cost_per_1m_tokens=model_pricing["input_per_1m"],
            openai_output_cost_per_1m_tokens=model_pricing["output_per_1m"],
            openai_estimated_monthly_cost=round(openai_monthly, 2),
            search_tier=search_tier,
            search_replicas=replicas,
            search_monthly_cost=round(search_monthly, 2),
            semantic_search_enabled=semantic_search,
            semantic_search_monthly_cost=round(semantic_cost, 2),
            embedding_model=embedding_model,
            embedding_cost_per_1m_tokens=emb_pricing["cost_per_1m"],
            embedding_estimated_monthly_cost=round(embedding_monthly, 2),
            storage_monthly_cost=round(storage_monthly, 2),
            appinsights_retention_days=90,
            appinsights_monthly_cost=round(appinsights_monthly, 2),
            total_monthly_cost=round(total, 2),
            per_query_cost=round(per_query, 4),
            estimated_queries_per_month=estimated_queries_monthly,
            warnings=warnings,
            recommendations=recommendations,
        )

    def validate_budget(
        self,
        estimate: CostEstimate,
        user_budget: float,
    ) -> Tuple[bool, str]:
        fits = estimate.total_monthly_cost <= user_budget
        if fits:
            headroom = user_budget - estimate.total_monthly_cost
            pct = (headroom / user_budget) * 100
            return True, f"✅ Fits within budget (${headroom:.0f} headroom = {pct:.0f}%)"
        else:
            over = estimate.total_monthly_cost - user_budget
            return False, f"❌ ${over:.0f}/mo over budget"

    def to_json(self, estimate: CostEstimate) -> str:
        return json.dumps(asdict(estimate), default=str, indent=2)


def validate_deployment(
    doc_size_str: str,
    budget_usd: float,
    region: str = "eastus",
    ha_required_str: str = "none",
    semantic_search: bool = False,
    estimated_docs_gb: float = 1.0,
    estimated_queries_monthly: int = 1_000,
    openai_model: str = "gpt-4o",
    embedding_model: str = "text-embedding-3-small",
) -> Dict:
    """
    Validate deployment configuration: costs + region model availability.

    NOTE: gpt-4o is the minimum supported model. gpt-4o-mini is not used.
    Model availability varies by region — checked live via Azure CLI if available,
    otherwise falls back to static table.
    All prices in USD. Verify at https://azure.microsoft.com/en-us/pricing/calculator/
    """
    # --- Region + model availability check ---
    required_models = [openai_model, embedding_model]
    region_check = validate_region_models(required_models, region)

    # --- Cost estimate ---
    analyzer = CostAnalyzer()
    doc_size = DocumentSize(doc_size_str.lower())
    ha = HARequirement(ha_required_str.lower())

    estimate = analyzer.estimate_costs(
        doc_size=doc_size,
        budget_usd=budget_usd,
        ha_required=ha,
        semantic_search=semantic_search,
        estimated_docs_gb=estimated_docs_gb,
        estimated_queries_monthly=estimated_queries_monthly,
        openai_model=openai_model,
        embedding_model=embedding_model,
    )

    fits_budget, budget_msg = analyzer.validate_budget(estimate, budget_usd)

    # Merge region warnings into cost warnings
    all_warnings = list(estimate.warnings)
    if not region_check["all_available"]:
        all_warnings.append(f"⚠️  {region_check['warning']}")

    return {
        "valid": fits_budget and region_check["all_available"],
        "region_check": region_check,
        "cost_estimate": asdict(estimate),
        "budget_check": budget_msg,
        "warnings": all_warnings,
        "recommendations": estimate.recommendations,
        "disclaimer": PRICING_DISCLAIMER,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Example: medium docs, eastus, gpt-4o, HA + semantic
    result = validate_deployment(
        doc_size_str="medium",
        budget_usd=2_000,
        region="eastus",
        ha_required_str="standard",
        semantic_search=True,
        estimated_docs_gb=5.0,
        estimated_queries_monthly=1_000,
        openai_model="gpt-4o",
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n{result['disclaimer']}")

    # Example: check a region where o3-mini might not be available
    print("\n--- Region check: southeastasia + o3-mini ---")
    check = validate_region_models(["gpt-4o", "o3-mini"], "southeastasia")
    print(json.dumps(check, indent=2, ensure_ascii=False))

