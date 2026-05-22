---
name: rag-cost-scaler
description: "Scale up or scale down Azure RAG configurations (Search, Log Analytics, Insights) and manage budgets/alerts automatically. Reversible changes with cost calculation before applying."
license: MIT
metadata:
  author: Avanade RAG Team
  version: "1.0.0"
  tags: ["cost-optimization", "scaling", "azure", "rag"]
---

# RAG Cost Scaler Skill

Automatiza el cambio entre configuraciones de Azure RAG (minimal → standard → premium) con cálculo de costos en tiempo real y alertas de presupuesto.

## When to Use Este Skill

Usa este skill cuando necesites:

- **Reducir costos** — pasar de Standard a Basic en Azure AI Search
- **Escalar arriba** — pasar de Basic a Standard/Premium para más volumen
- **Optimizar logs** — ajustar retención en Log Analytics
- **Crear alertas** — configurar presupuestos y notificaciones automáticas
- **Comparar opciones** — ver costos estimados antes de cambiar
- **Auditar configuration** — saber qué tier tienes actualmente

### Ejemplos de Uso

```bash
# Ver configuración actual y opciones
python .github/skills/rag-cost-scaler/cost-scaler.py --list-options

# Cambiar a tier minimal (máximo ahorro)
python .github/skills/rag-cost-scaler/cost-scaler.py --tier minimal --apply

# Cambiar a tier standard (balance)
python .github/skills/rag-cost-scaler/cost-scaler.py --tier standard --apply

# Cambiar presupuesto a €50/mes e crear alertas
python .github/skills/rag-cost-scaler/cost-scaler.py --budget 50 --create-alerts

# Solo simular cambios sin aplicar
python .github/skills/rag-cost-scaler/cost-scaler.py --tier premium --dry-run

# Crear alertas sin cambiar configuración
python .github/skills/rag-cost-scaler/cost-scaler.py --update-alerts-only
```

## Configuraciones Predefinidas (Tiers)

### 🟢 MINIMAL (€22-28/mes) — Máximo ahorro
```
Azure Search:      Basic (1M docs, 1 partition, 3 replicas max)
Log Analytics:     30 días retención
App Insights:      30 días retención
OpenAI:            S0 (necesario)
Storage:           Standard LRS
Budget Alert:      €30/mes
```
**Ideal para:** Desarrollo, testing, MVP con pocos documentos

### 🟡 STANDARD (€55-65/mes) — Balance
```
Azure Search:      Standard (15M docs, 3 partitions, 12 replicas)
Log Analytics:     90 días retención
App Insights:      90 días retención
OpenAI:            S0
Storage:           Standard LRS
Budget Alert:      €75/mes
```
**Ideal para:** Producción con volumen moderado de documentos

### 🔴 PREMIUM (€150-200/mes) — Máxima escala
```
Azure Search:      Standard (15M docs, 10 partitions, 12 replicas)
Log Analytics:     1 año retención
App Insights:      1 año retención
OpenAI:            S0
Storage:           Standard ZRS (redundancia zonal)
Budget Alert:      €250/mes
```
> **¿Por qué ZRS y no GRS?** Azure AI Search no soporta geo-replicación nativa.
> GRS protegería los docs en otra región, pero el índice (Search) seguiría
> siendo single-region. ZRS protege contra fallo de zona dentro de la región,
> que es el escenario real de DR para RAG.
**Ideal para:** Producción crítica, múltiples índices, alta disponibilidad

## Flujo de Uso Recomendado

### 1️⃣ Listar Opciones (Sin Cambios)
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --list-options
```
**Resultado:**
```
CONFIGURACIÓN ACTUAL: minimal
┌────────────────┬──────────────┬────────────────────────────────┐
│ Tier           │ Costo/mes    │ Servicios                      │
├────────────────┼──────────────┼────────────────────────────────┤
│ minimal  [*]   │ €22-28       │ Search: Basic, Logs: 30 días   │
│ standard       │ €55-65       │ Search: Standard, Logs: 90 días│
│ premium        │ €150-200     │ Search: Premium, Logs: 1 año   │
└────────────────┴──────────────┴────────────────────────────────┘
```

### 2️⃣ Simular Cambios (Dry-Run)
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --tier standard --dry-run
```
**Resultado:**
```
[DRY-RUN] Cambios que se aplicarían:
  ✓ Azure Search: Basic → Standard (€31/mes más)
  ✓ Log Analytics: 30 → 90 días (€5/mes más)
  ✓ App Insights: 30 → 90 días (€1/mes más)

Costo actual: €24/mes
Costo nuevo:  €61/mes
Diferencia:   +€37/mes

¿Aplicar? [y/N]
```

### 3️⃣ Aplicar Cambios
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --tier standard --apply
```
**Resultado:**
```
Aplicando cambios...
  ✓ Azure Search: upgrading a Standard
  ✓ Log Analytics: cambiando retención a 90 días
  ✓ App Insights: cambiando retención a 90 días

✅ Cambios completados
  Nuevo costo estimado: €61/mes
```

### 4️⃣ Crear/Actualizar Alertas
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --budget 75 --create-alerts
```
**Resultado:**
```
Configurando alertas...
  ✓ Budget: €75/mes
  ✓ Alerta 75%: €56.25 (pronóstico)
  ✓ Alerta 100%: €75 (real)
  ✓ Notificaciones: Email a Owners & Contributors

✅ Alertas configuradas
```

## Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `--tier {minimal\|standard\|premium}` | string | Cambiar a este tier |
| `--budget EUR` | float | Presupuesto mensual en EUR |
| `--apply` | flag | Aplicar cambios reales (sin esto es dry-run) |
| `--dry-run` | flag | Solo simular, no aplicar |
| `--create-alerts` | flag | Crear presupuesto y alertas |
| `--update-alerts-only` | flag | Solo actualizar alertas, no cambiar config |
| `--list-options` | flag | Mostrar tiers disponibles |
| `--current` | flag | Ver configuration actual |
| `--rg RG_NAME` | string | Resource Group (default: rag-defensa-rg) |
| `--subscription SUB_ID` | string | Subscription ID (autodetecta si no se da) |

## Cambios Reversibles

### De Minimal a Standard
- ✓ Azure AI Search se reescala (puede tardar 5-10 min)
- ✓ Logs se guardan por más tiempo automáticamente
- ✓ No se pierden datos existentes

### De Standard a Minimal
- ⚠️ Si tienes > 1M documentos en Search, necesitas migrar índices primero
- ⚠️ Los logs más antiguos de 90+ días se purgarán
- ✓ Los últimos 30 días se conservan

## monitoring Post-Cambio

Después de aplicar cambios, monitorea:

```bash
# Ver estado actual cada minuto
watch -n 60 "python .github/skills/rag-cost-scaler/cost-scaler.py --current"

# Ver últimas alertas en Log Analytics
az monitor metrics list -g rag-defensa-rg --interval PT5M --metric "Percentage"
```

## Troubleshooting

### Error: "Cannot provision service while deletion in progress"
**Causa:** Azure AI Search aún se está eliminando del cambio anterior
**Solución:** Espera 2-5 minutos y vuelve a intentar
```bash
# Esperar 5 minutos
sleep 300
python .github/skills/rag-cost-scaler/cost-scaler.py --tier standard --apply
```

### Error: "Subscription not found"
**Causa:** authentication de Azure no configurada
**Solución:**
```bash
az login
az account set --subscription 8e6ace56-e0f2-4071-825a-a20363df34f8
```

### Warning: "Documents exceed Basic tier limit"
**Causa:** Tienes > 1M documentos en Search
**Solución:** Migra a Standard o reduce documentos
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --tier standard --apply
```

## Archivos del Skill

```
.github/skills/rag-cost-scaler/
├── SKILL.md                 # Este archivo
├── cost-scaler.py           # Script principal
├── cost-tiers.json          # Configuraciones predefinidas
└── README.md                # Guía rápida
```

## configuration Global

El skill automáticamente detecta:
- ✓ Subscription activa
- ✓ Resource Group principal
- ✓ configuration actual de cada servicio
- ✓ Costos actuales por servicio

Si necesitas cambiar RG:
```bash
python .github/skills/rag-cost-scaler/cost-scaler.py --rg my-rg --current
```

## Roadmap Futuro

- [ ] integration con CI/CD (auto-scale en horarios)
- [ ] Reportes semanales de costos
- [ ] Predictores de costos basados en tendencias
- [ ] Snapshots de configuration para rollback automático
- [ ] integration con Terraform (generar .tf automáticamente)

---

**Última actualización:** Mayo 2026
**Mantenedor:** Avanade RAG Team
