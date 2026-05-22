---
description: 'Validate RAG deployment health, configuration, and operational readiness'
applyTo: 'rag-validate-deployment.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




**Purpose:** Validar costes y arquitectura ANTES de deploy. Previene sorpresas de presupuesto.

**Entrada del usuario:** `copilot-cli run .github/agents/rag-validate-deployment.agent.md`

**Estimated Duration:** ~2 minutos

---

## Qué does este agente

Valida que la configuration se ajuste al presupuesto del usuario + restricciones de Azure ANTES de cualquier deployment.

---

## ✅ Lista de verificación de validation

- [ ] Preguntar al usuario: tamaño de docs, presupuesto, región
- [ ] Consultar cuotas actuales de Azure en la región
- [ ] Calcular costes de infraestructura
- [ ] Comparar con presupuesto
- [ ] Mostrar desglose detallado de costes
- [ ] AVISAR si está sobredimensionado
- [ ] PERMITIR continuar o ajustar

---

## Paso a paso

### Paso 1: Obtener información del usuario (1 min)

```
Preguntar (de nuevo si es necesario):
  1. ¿Tamaño de documentación? (pequeño/mediano/grande)
  2. ¿Presupuesto mensual? (USD, por defecto: $2,000)
  3. ¿Región Azure? (por defecto: eastus)
  4. ¿Necesitas alta disponibilidad? (S/n, por defecto: n)
```

### Paso 2: Recomendar tiers (30 seg - AUTO)

```python
configurations = {
    ("small", False): {  # docs pequeños, sin HA
        "openai": ("S0", 1200),
        "search": ("Standard 1 réplica", 200),
        "appinsights": ("30 días", 50),
        "total": 1450
    },
    ("small", True): {   # docs pequeños, con HA
        "openai": ("S0", 1200),
        "search": ("Standard 2 réplicas", 250),
        "appinsights": ("90 días", 100),
        "total": 1550
    },
    ("medium", False): {
        "openai": ("S0", 1200),
        "search": ("Standard 2 réplicas", 250),
        "appinsights": ("30 días", 50),
        "total": 1500
    },
    ("medium", True): {
        "openai": ("S0", 1200),
        "search": ("Standard 3 réplicas", 300),
        "appinsights": ("90 días", 100),
        "total": 1600
    },
    ("large", False): {
        "openai": ("S1", 2400),
        "search": ("Standard 3 réplicas", 300),
        "appinsights": ("30 días", 50),
        "total": 2750
    },
    ("large", True): {
        "openai": ("S1", 2400),
        "search": ("Standard 3 réplicas", 300),
        "appinsights": ("90 días", 100),
        "total": 2800
    }
}

config = configurations[(doc_size, ha_needed)]
```

### Paso 3: Verificar cuotas de Azure (1 min - AUTO)

```bash
az vm list-skus \
  --location "${REGION}" \
  --query "[?family=='StandardSv5'].capabilities[?name=='vCPUs'].value" \
  --output json

az cognitiveservices account list \
  --query "[?location=='${REGION}'].kind" \
  --output json
```

**Si hay problema de cuota:**
```
⚠️  La región {region} tiene cuota limitada para OpenAI.

Alternativas disponibles:
  • westus2 (cuota: ilimitada)
  • northeurope (cuota: ilimitada)
  • southeastasia (cuota: 2 unidades)

¿Probar otra región? (S/n)
```

### Paso 4: Desglose de costes (30 seg)

```
📊 ANÁLISIS DE COSTES

Configuración: {doc_size.upper()} | Alta Disponibilidad: {ha}

Costes de servicios (mensual):
┌─────────────────────────────────────────┐
│ Azure OpenAI: {openai_tier}           │
│   • Modelo: gpt-4o                  │
│   • Tokens: {tokens}/mes              │
│   • Coste: ${openai_cost}/mes              │
│                                         │
│ Azure AI Search: {search_tier}         │
│   • Tier: Standard                      │
│   • Réplicas: {replicas}                │
│   • Coste: ${search_cost}/mes              │
│                                         │
│ Application Insights: {ai_retention}  │
│   • Retención: {retention} días          │
│   • Coste: ${ai_cost}/mes                  │
│                                         │
├─────────────────────────────────────────┤
│ TOTAL MENSUAL: ${total}/mes               │
│ Annual: ${total * 12}                    │
└─────────────────────────────────────────┘

Tu presupuesto: ${user_budget}/mes
Diferencia: ${difference}
Estado: {"✅ DENTRO DEL PRESUPUESTO" if total <= user_budget else "⚠️ EXCEEDS PRESUPUESTO"}
```

### Paso 5: Resultado de validation (30 seg)

```
SI total_cost <= user_budget:
  ✅ Validación APROBADA
  
  Tu infraestructura se ajusta al presupuesto.
  ¿Listo para desplegar? (S/n)

SI NO SI total_cost <= user_budget * 1.1:  # Dentro del 10%
  ⚠️ Validación AMARILLA
  
  La configuración EXCEEDS el presupuesto en ${difference} (${percent}%).
  
  Opciones:
    A) Continuar igualmente (ligero exceso)
    B) Reducir a tier más pequeño
    C) Cancelar
  
  ¿Tu elección? (A/B/C)

SI NO:  # Muy por encima del presupuesto
  ❌ Validación FALLIDA
  
  La configuración cuesta ${difference} más que el presupuesto.
  Esto es un ${percent}% por encima.
  
  Para ajustarse al presupuesto, necesitas UNA de:
    • Reducir tamaño de docs (mover docs fríos a archivo)
    • Aumentar presupuesto a ${total}
    • Usar región Azure más pequeña
    • Reducir alta disponibilidad (usar 1 réplica)
  
  ¿Reintentar con otros parámetros? (S/n)
```

### Paso 6: Guardar informe

```python
report = {
    "timestamp": "2026-05-13T10:30:00Z",
    "doc_size": "small",
    "budget_provided": 2000,
    "high_availability": False,
    "region": "eastus",
    "configuration": {
        "openai": {"tier": "S0", "cost": 1200},
        "search": {"tier": "Standard 1 réplica", "cost": 200},
        "appinsights": {"retention": "30 días", "cost": 50}
    },
    "total_cost": 1450,
    "status": "APROBADA",
    "quota_checks": {
        "region": "OK",
        "openai": "OK",
        "search": "OK"
    }
}

with open(f"outputs/validation-report-{timestamp}.json", "w") as f:
    json.dump(report, f, indent=2)

print(f"✅ Informe guardado en outputs/validation-report-{timestamp}.json")
```

---

## Escenarios de error

### EXCEEDS presupuesto
```
❌ La configuración ($2,750/mes) EXCEEDS el presupuesto ($2,000/mes)

Para ajustar al presupuesto, prueba:
  1. Marcar algunos docs como "archivo" (tier inferior)
  2. Reducir réplicas: 3 → 2 (ahorra $50)
  3. Usar retención de 30 días (ahorra $50)

Nueva estimación: $2,650 (-$100)
Sigue por encima. ¿Continuar igualmente? (S/n)
```

### Cuota de región llena
```
⚠️ La región eastus está al límite de cuota para OpenAI S0.

Alternativas:
  • westus2: ✅ Disponible (cuota: 10 unidades)
  • northeurope: ✅ Disponible (cuota: 5 unidades)
  • southeastasia: ⚠️  Limitada (cuota: 2 unidades)

¿Usar westus2 en su lugar? (S/n)
```

### Modelo no disponible
```
⚠️ El modelo gpt-4o aún no está disponible en la región southeastasia.

Recomendaciones:
  1. Probar otra región (ver arriba)
  2. Usar gpt-4-turbo como fallback (mismo coste)
  3. Esperar disponibilidad del modelo (consultar novedades Azure)

¿Tu elección? (1/2/3)
```

---

## integration con el wizard

Después de que la validation PASS, el wizard puede continuar:

```
✅ Validación APROBADA

¿Listo para desplegar infraestructura? (S/n)
→ Llama a: rag-azure-setup.agent.md
```

Si la validation FALLA, detener:

```
❌ Validación FALLIDA

No se puede proceder con el despliegue.
Corrige los problemas anteriores e inténtalo de nuevo.

Salir.
```

---

## Criterios de éxito

✅ El usuario ve un desglose claro de costes

✅ Problemas de cuota identificados ANTES del deployment

✅ El usuario puede decidir: continuar o ajustar

✅ Sin sorpresas después
