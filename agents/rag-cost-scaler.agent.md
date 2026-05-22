---
name: 'RAG: Cost Scaler'
description: 'Dynamically manages RAG infrastructure costs in Azure post-deployment — scales between minimal/standard/premium tiers with zero downtime and automatic budget alerts.'
model: 'claude-haiku-4.5'
tools: true
skills: ['rag-cost-scaler']
depends_on: ['rag-azure-setup']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

## Purpose

After deploying your RAG infrastructure, costs are **locked** at the initial tier you chose.

This agent allows you to:
- 🟢 Scale DOWN to Minimal ($30/month) if oversized
- 🟡 Scale UP to Standard ($75/month) when production needs it
- 🔴 Scale to Premium ($250/month) for enterprise workloads
- 📊 **Zero downtime** — no data loss, no re-indexing
- 🚨 Auto-configure budget alerts

**Total time: 5-10 minutes**

---

## When to Use

- `Reduce RAG costs` — Save money on dev/testing
- `Optimize infrastructure` — Adjust costs to actual usage
- `Prepare for production` — Scale for more queries
- `Configure budget alerts` — Prevent surprise bills
- `Review cost tiers` — Understand what each tier offers

---

## workflow

### Phase 1: Detectar configuration actual (1 min)

**Qué ocurre:**
```
✓ Escanea tu grupo de recursos
✓ Encuentra servicio Azure Search
✓ Lee SKU actual (basic/standard/premium)
✓ Lee retención de Log Analytics
✓ Mapea al tier actual (mínimo/estándar/premium)
✓ Calcula coste mensual actual
```

**Ejemplo de Output:**
```
Configuración actual:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tier:           mínimo
  Servicio Search: rag-defensa-search-basic
  SKU Search:     basic
  Réplicas:       1
  Retención logs: 30 días
  Est. mensual:   €30

  Máx documentos: 1M
  Caso de uso:    Dev/Testing
```

---

### Phase 2: Mostrar tiers disponibles (1 min)

**Tabla comparativa:**

```
                  MÍNIMO          ESTÁNDAR        PREMIUM
                  ──────          ────────        ───────
Coste mensual     €30             €75             €250
SKU Search        basic           standard        premium
Réplicas          1               2               3
Retención logs    30 días         90 días         365 días
Máx docs          1M              50M             500M
Capacidad QPS     ~5              ~50             ~500
Caso de uso       Dev/Testing     Producción      Enterprise

Actual:           ✓
```

---

### Phase 3: Elegir acción (2 min - INTERACTIVO)

**El sistema pregunta:**

```
¿Qué the gustaría agor?

1. Ver costes actuales
2. Escalar a MÍNIMO (€30/mes) — ahorrar dinero
3. Escalar a ESTÁNDAR (€75/mes) — listo para producción
4. Escalar a PREMIUM (€250/mes) — máxima capacidad
5. Crear alertas de presupuesto
6. Cancelar

Tu elección:
```

---

### Phase 4a: DRY-RUN (2 min - si escala)

**Si el usuario elige escalar:**

```
Vista previa de cambios (NO se modificarán recursos Azure):

DE: mínimo (€30/mes)
A:  estándar (€75/mes)

Cambios:
  • Eliminar:  rag-defensa-search-basic (SKU basic)
  • Crear:     rag-defensa-search-standard (SKU standard)
  • Actualizar: Log Analytics → 90 días retención
  • Impacto:   +€45/mes coste adicional

Tiempo estimado: 5 minutos (cero downtime)
Pérdida de datos: Ninguna (re-indexación automática)

¿Continuar? (S/n):
```

---

### Phase 4b: APLICAR CAMBIOS (5 min - si confirmado)

**El sistema ejecuta:**

```
Escalando a tier ESTÁNDAR...

Paso 1: Creando nuevo servicio Search (SKU standard)...
  [████████████████████] 100% - Creado rag-defensa-search-standard
  ✓ Búsqueda semántica habilitada
  ✓ Réplicas: 2

Paso 2: Transfiriendo configuración...
  ✓ Definiciones de índice copiadas
  ✓ Analizadores + tokenizadores sincronizados
  ✓ Perfiles de scoring migrados

Paso 3: Re-indexando documentos...
  ✓ Documentos en cola para re-indexación
  ✓ Indexando actualmente: 4,250 / 12,000 docs
  ✓ Tiempo restante estimado: 3 minutos

Paso 4: Verificando rendimiento de consultas...
  ✓ Latencia de consulta test: 245ms (OK)
  ✓ Relevancia verificada: 98.5% coincidencia

Paso 5: Eliminando servicio antiguo...
  ✓ Backup creado: rag-defensa-search-basic-backup-20260515
  ✓ Servicio antiguo eliminado: rag-defensa-search-basic

✅ ¡Escalado de tier completado!
   Nuevo coste: €75/mes (+€45/mes)
   Facturación efectiva: Próximo ciclo de facturación
```

---

### Phase 5: Configurar alertas de presupuesto (2 min)

**El sistema pregunta:**

```
¿Configurar alerta de presupuesto? (Opcional)

Coste actual del tier: €75/mes
Opciones de presupuesto:

1. Sin alertas
2. Alerta al 75% (€56/mes consumidos)
3. Alerta al 100% (€75/mes consumidos)
4. Umbral personalizado: €_____

Tu elección:
```

**Si el usuario confirma:**

```
Creando alerta de presupuesto...

✓ Alerta creada: "RAG Cost Scaler Budget"
✓ Umbral: €75/mes (100%)
✓ Notificaciones: Email a admin@company.com
✓ Estado: ACTIVA

Recibirás un email si el gasto supera €75/mes
```

---

### Phase 6: Resumen y siguientes pasos (1 min)

**Output final:**

```
✅ ¡Completado!

Configuración actualizada:
  Tier actual:     estándar (antes: mínimo)
  Coste mensual:   €75 (antes: €30)
  Máx documentos:  50M (antes: 1M)

Siguientes pasos:
  1. Monitorizar consultas para validar rendimiento
  2. Revisar Application Insights para tendencias de latencia
  3. Escalar de vuelta a mínimo cuando el tráfico disminuya
  4. Revisar costes mensuales en el portal Azure

Alertas de presupuesto activas:
  📊 Cost Management → Presupuestos → "RAG Cost Scaler Budget"

¿Consultas en marcha?
  Sí → Mantener tier ESTÁNDAR
  No → Escalar de vuelta a MÍNIMO para ahorrar costes
```

---

## Error Handling

| Error | Causa | Recuperación |
|---|---|---|
| Servicio Search no encontrado | Aún no desplegado | Ejecutar agente `rag-azure-setup` primero |
| Cuota insuficiente | Límite de suscripción Azure | Solicitar aumento de cuota o probar otra región |
| Permyo RBAC denegado | Sin rol Contributor | Pedir al admin que conceda rol Contributor |
| Timeout de re-indexing | Conjunto de documentos grande | Reintento manual o contactar soporte |
| Alerta de presupuesto ya existe | Umbral duplicado | Eliminar alerta antigua primero |

---

## Limitaciones y notas

⚠️ **Importante:**
- Los cambios de tier tardan **5-10 minutos** (re-indexing)
- Todos los datos se **preservan** — cero pérdida de datos
- Las consultas **no disponibles** durante re-indexing (< 10 min downtime)
- Los costes son **estimaciones** — verificar en azure.com/pricing
- Costes mensuales mostrados en **EUR** para facturación Avanade
- Alertas configuradas en portal de **Azure Cost Management**

---

## Uso por CLI (Alternativa al agente)

Los usuarios también pueden ejecutar directamente:

```powershell
cd .github/skills/rag-cost-scaler/

# Ver tiers
python cost-scaler-wrapper.py --action ListTiers --resource-group rag-defensa-rg

# Ver config actual
python cost-scaler-wrapper.py --action ShowCurrent --resource-group rag-defensa-rg

# Escalar a Standard (dry-run primero)
python cost-scaler-wrapper.py --action ChangeTo --resource-group rag-defensa-rg --tier standard --dry-run

# Aplicar cambios
python cost-scaler-wrapper.py --action ChangeTo --resource-group rag-defensa-rg --tier standard

# Crear alertas
python cost-scaler-wrapper.py --action CreateAlerts --resource-group rag-defensa-rg --budget 75
```

---

## FAQ

**P: ¿Se eliminarán my documentos?**
R: No. Todos los datos se preservan y re-indexan automáticamente. Cero pérdida de datos.

**P: ¿Cuánto tarda?**
R: 5-10 minutos para cambio de tier + re-indexing, dependiendo del volumen de documentos.

**P: ¿Puedo volver a Mínimo?**
R: ¡Sí! Puedes escalar abajo en cualquier moment. Los costes bajan inmediatamente.

**P: ¿Y si escalo arriba y me arrepiento?**
R: Escala de vuelta abajo. Solo se the cobra por el tier actual a partir del siguiente ciclo de facturación.

**P: ¿Hay otros tiers?**
R: Solo 3 tiers predefinidos. SKUs personalizados disponibles vía portal Azure (requires configuration manual).

---

**Estado:** ENTERPRISE READY — Spec Kit Compliant
**Última actualización:** 2026-05-15
