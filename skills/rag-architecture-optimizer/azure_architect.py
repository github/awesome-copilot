"""
azure_architect_optimizer.py - Pre-deployment validation and cost optimization
"""

class AzureArchitectOptimizer:
    """Validates Azure deployment configuration before actual deployment"""

    TIER_PRICING = {
        "openai_s0": {"monthly": 0, "pay_per_token": True},  # Pay per token only
        "openai_e0": {"monthly": 4000, "token_included": True},  # Enterprise tier
        "search_standard": {"monthly": 300, "per_unit": False},
        "search_premium": {"monthly": 1000, "per_unit": False},
        "app_insights_standard": {"monthly": 5, "per_gb": True},  # $5 + $2.30/GB ingestion
    }

    def __init__(self):
        self.findings = {
            'valid': True,
            'tier_recommendations': [],
            'cost_warnings': [],
            'suggested_adjustments': {}
        }

    def validate_deployment(self, config: dict) -> dict:
        """
        Validate deployment config holistically

        Args:
            config: {
                'openaiTier': 'S0' | 'E0',
                'expectedRPS': int,
                'searchTier': 'standard' | 'premium',
                'searchReplicas': int,
                'searchPartitions': int,
                'appInsightsRetention': int,
                'containerAppInstances': int,
                'region': str
            }

        Returns: findings dict with recommendations
        """
        self.findings = {
            'valid': True,
            'tier_recommendations': [],
            'cost_warnings': [],
            'suggested_adjustments': {},
            'cost_analysis': {}
        }

        self._validate_openai_tier(config)
        self._validate_search_config(config)
        self._validate_app_insights(config)
        self._validate_container_app(config)
        self._estimate_monthly_cost(config)

        return self.findings

    def _validate_openai_tier(self, config: dict):
        """Check if OpenAI tier is right-sized"""
        tier = config.get('openaiTier', 'S0')
        expected_rps = config.get('expectedRPS', 10)

        # S0 handles 240 RPS, E0 is enterprise (unnecessary for < 100 RPS)
        if tier == 'E0' and expected_rps < 100:
            self.findings['tier_recommendations'].append({
                'resource': 'Azure OpenAI',
                'current': 'E0 (Enterprise)',
                'recommended': 'S0 (Standard)',
                'reason': f'Your expected {expected_rps} RPS is well under S0 limit of 240 RPS',
                'monthly_savings': '$4,000 (no monthly charge with S0)',
                'confidence': 'high'
            })
            self.findings['suggested_adjustments']['openaiTier'] = 'S0'

        if tier == 'S0' and expected_rps > 200:
            self.findings['cost_warnings'].append({
                'resource': 'Azure OpenAI',
                'issue': 'S0 may hit throttle at very high concurrency',
                'action': 'Consider E0 if sustained > 200 RPS or budget allows'
            })

    def _validate_search_config(self, config: dict):
        """Check if Search Service is right-sized and configured"""
        tier = config.get('searchTier', 'standard')
        replicas = config.get('searchReplicas', 1)
        partitions = config.get('searchPartitions', 1)
        estimated_docs = config.get('estimatedDocuments', 500)

        # Anti-pattern: Premium with 1 replica
        if tier == 'premium' and replicas == 1:
            self.findings['tier_recommendations'].append({
                'resource': 'Azure Search',
                'current': f'{tier} tier, {replicas} replica',
                'recommended': f'standard tier, {replicas + 1} replicas',
                'reason': 'Premium is for enterprise scale. Standard + HA replicas is better value',
                'monthly_savings': '$700',
                'confidence': 'high'
            })
            self.findings['suggested_adjustments']['searchTier'] = 'standard'
            self.findings['suggested_adjustments']['searchReplicas'] = replicas + 1

        # Check partition sizing
        gb_per_partition = estimated_docs / 100000  # Rough estimate: 100K docs per 1GB
        if partitions == 1 and gb_per_partition > 10:
            self.findings['cost_warnings'].append({
                'resource': 'Azure Search',
                'issue': f'Single partition with ~{gb_per_partition:.0f}GB. Consider 2-3 partitions for better performance',
                'action': f'Increase partitions to {(gb_per_partition / 5):.0f} for < 5GB per partition'
            })

        # High availability
        if replicas == 1 and config.get('environment') == 'production':
            self.findings['cost_warnings'].append({
                'resource': 'Azure Search',
                'issue': 'Single replica in production = no failover',
                'action': 'Increase to 2-3 replicas for HA'
            })

    def _validate_app_insights(self, config: dict):
        """Check Application Insights settings"""
        retention = config.get('appInsightsRetention', 30)
        daily_ingestion_gb = config.get('expectedDailyIngestionGB', 0.1)

        # Retention cost
        if retention > 30:
            extra_cost = (retention - 30) * 0.23 * daily_ingestion_gb * 30
            self.findings['cost_warnings'].append({
                'resource': 'Application Insights',
                'issue': f'{retention}-day retention (beyond 30) costs extra',
                'monthly_extra': f'${extra_cost:.0f}',
                'action': 'Reduce to 30 days or export to Log Analytics archive'
            })

    def _validate_container_app(self, config: dict):
        """Check Container App scaling"""
        instances = config.get('containerAppInstances', 1)
        expected_rps = config.get('expectedRPS', 10)

        # Rule of thumb: 1 instance handles ~10 RPS
        recommended_instances = max(1, expected_rps // 10)

        if instances > recommended_instances * 2:
            self.findings['cost_warnings'].append({
                'resource': 'Container App',
                'issue': f'{instances} instances for {expected_rps} RPS is over-provisioned',
                'recommendation': f'Use {recommended_instances} instances, auto-scale to {recommended_instances * 2} at peak',
                'monthly_savings': f'${(instances - recommended_instances) * 50}'
            })

    def _estimate_monthly_cost(self, config: dict):
        """Estimate monthly cost based on config"""
        monthly_cost = 0
        breakdown = {}

        # OpenAI
        if config.get('openaiTier') == 'E0':
            monthly_cost += 4000
            breakdown['openai'] = '$4,000 (Enterprise tier)'
        else:
            breakdown['openai'] = 'Variable (pay-per-token only)'

        # Search
        search_cost = 300 if config.get('searchTier') == 'standard' else 1000
        replicas = config.get('searchReplicas', 1)
        search_cost += (replicas - 1) * 300  # Extra replicas are $300 each
        monthly_cost += search_cost
        breakdown['search'] = f'${search_cost}'

        # App Insights
        app_insights_cost = 5  # Base
        app_insights_cost += config.get('expectedDailyIngestionGB', 0.1) * 30 * 2.30  # Data ingestion
        monthly_cost += app_insights_cost
        breakdown['app_insights'] = f'${app_insights_cost:.0f}'

        # Container App
        instances = config.get('containerAppInstances', 1)
        container_cost = instances * 50  # ~$50 per instance
        monthly_cost += container_cost
        breakdown['container_app'] = f'${container_cost:.0f}'

        self.findings['cost_analysis'] = {
            'estimated_monthly': f'${monthly_cost:.0f}',
            'breakdown': breakdown,
            'per_token_cost': '$0.003-$0.015 (varies by model)',
            'validation_session_cost_2h': '$2-5 (minimal)',
            'production_100k_requests_monthly': f'${monthly_cost + (100000 * 0.027):.0f}'
        }

    def get_score(self) -> int:
        """Rate the deployment from 1-10 based on optimization"""
        score = 10

        # Deduct points for issues
        score -= len(self.findings['tier_recommendations']) * 2
        score -= len(self.findings['cost_warnings'])

        return max(1, score)


# Example usage
if __name__ == "__main__":
    optimizer = AzureArchitectOptimizer()

    # Test config (RAG baseline setup)
    rag_config = {
        'openaiTier': 'S0',
        'expectedRPS': 10,
        'searchTier': 'standard',
        'searchReplicas': 1,
        'searchPartitions': 1,
        'estimatedDocuments': 500,
        'appInsightsRetention': 30,
        'containerAppInstances': 1,
        'environment': 'baseline'
    }

    findings = optimizer.validate_deployment(rag_config)
    print(f"Architecture Score: {optimizer.get_score()}/10")
    print(f"Estimated Monthly Cost: {findings['cost_analysis']['estimated_monthly']}")
    print(f"Recommendations: {len(findings['tier_recommendations'])}")
