---
name: 'rag-architecture-optimizer'
description: 'Validates and optimizes Azure RAG deployment architecture for cost efficiency and performance. Reviews service tiers, scaling, redundancy, and recommends right-sizing before deployment.'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

## Purpose

Pre-deployment validation and optimization of Azure infrastructure to prevent over-provisioning or under-dimensioning that could lead to unnecessary costs or reliability issues.

## When to Use

- Antes de deploy con `main.bicep`
- Al evaluar diferentes opciones de tier (Standard vs Premium)
- Al planificar para escala de producción
- Cuando el coste es una restricción

## Validaciones Clave

### 1. Dimensionamiento de Tier de Servicio
- **Azure OpenAI**: S0 (standard) es suficiente para la mayoría de cargas RAG. E0 (enterprise) innecesario salvo > 100 req/sec
- **Azure AI Search**: Tier Standard mínimo. Premium solo si > 10M documentos o latencia p50 < 10ms requerida
- **App Insights**: Retención estándar (30 días) cubre operaciones RAG baseline. Premium solo para gran escala multi-región

### 2. configuration de Escalado
- **Réplicas**: 1 para RAG baseline, 3+ para HA en producción
- **Particiones**: 1 para < 500GB, escalar solo si latencia de search > SLO
- **Instancias concurrentes**: Container App empieza en 1, auto-escala basado en métricas

### 3. Nivel de Redundancia
- **Geo-redundancia**: No necesaria para despliegues RAG baseline de una región
- **Availability Zones**: Solo si SLA de uptime > 99.9%
- **Failover**: Opcional para despliegues baseline (añade $500-1000/mes)

## Uso en Pipeline

```python
class AzureArchitectOptimizer:
    def validate_deployment(self, bicep_config: Dict) -> Dict:
        """
        Valida config de despliegue antes del deploy real.
        Devuelve: {
            'valid': bool,
            'tier_recommendations': List[str],
            'cost_warnings': List[str],
            'suggested_adjustments': Dict
        }
        """
        findings = {
            'valid': True,
            'tier_recommendations': [],
            'cost_warnings': [],
            'suggested_adjustments': {}
        }

        # Verificar tier OpenAI
        openai_tier = bicep_config.get('openaiTier', 'S0')
        if openai_tier == 'E0' and bicep_config.get('expectedRPS', 0) < 50:
            findings['tier_recommendations'].append(
                "OpenAI: tier E0 excesivo para < 50 RPS. Usar S0 (-$600/mes)"
            )
            findings['suggested_adjustments']['openaiTier'] = 'S0'

        # Verificar tier Search
        search_tier = bicep_config.get('searchTier', 'standard')
        search_replicas = bicep_config.get('searchReplicas', 1)

        if search_tier == 'premium' and search_replicas == 1:
            findings['cost_warnings'].append(
                "Search: tier Premium con 1 réplica es derrochador. Usar Standard + 2 réplicas"
            )
            findings['suggested_adjustments']['searchTier'] = 'standard'
            findings['suggested_adjustments']['searchReplicas'] = 2

        # Verificar App Insights
        app_insights_retention = bicep_config.get('appInsightsRetention', 30)
        if app_insights_retention > 90:
            findings['cost_warnings'].append(
                f"App Insights: retención de {app_insights_retention} días añade ${(app_insights_retention - 30) * 0.05:.0f}/mes"
            )

        return findings
```

## Checklist de optimization

- [ ] Tier OpenAI acorde al volumen de tráfico
- [ ] Réplicas Search escaladas apropiadamente (no siempre 3+)
- [ ] Particiones alineadas con tamaño de datos
- [ ] Distribución regional justificada
- [ ] Nivel de redundancia acorde a requisitos de SLA
- [ ] Políticas de auto-escalado definidas
- [ ] Sin recursos sin usar (índices viejos, deployments extra)
