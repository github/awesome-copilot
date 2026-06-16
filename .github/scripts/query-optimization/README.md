# Marco de Optimizacion de Consultas — ProjectName

**Alcance:** 6.554 SPs | SQL Server 2017 | stack .NET 8 Dapper/EF  
**Objetivo:** Reducir tiempo de respuesta y consumo de recursos sin cambios funcionales

---

## Flujo de 4 Scripts

```
01-capture-baseline.sql        → Extrae métricas actuales (CPU, reads, waits)
        ↓
02-index-recommendations.sql   → Genera DDL de índices faltantes, redundantes, fragmentados
        ↓  [Aplicas el cambio aquí: índice, reescritura de SP o sugerencia QS]
      03-golden-file-regression.ps1  → Captura antes y valida que la salida no cambió
        ↓
04-staged-rollout.ps1          → Orquesta DEV → STAGING → PROD con confirmación manual
```

---

## Uso Rápido

### Optimizar un SP paso a paso

```powershell
cd c:\repo\BoostDBA

# 1. Captura archivo golden (resultado esperado) en PROD
.\.github\scripts\query-optimization\03-golden-file-regression.ps1 `
  -Mode capture `
  -SpName 'bi.AccionesFormativasPlanFormacion_S' `
  -ServerInstance 'prod-db'

# 2. Revisa recomendaciones de índices en SSMS
#    → Abre 02-index-recommendations.sql y ejecuta en ProjectName

# 3. Aplica el cambio en DEV primero

# 4. Valida que la salida no cambió
.\.github\scripts\query-optimization\03-golden-file-regression.ps1 `
  -Mode validate `
  -SpName 'bi.AccionesFormativasPlanFormacion_S' `
  -ServerInstance 'dev-db'

# 5. Rollout completo a PROD
.\.github\scripts\query-optimization\04-staged-rollout.ps1 `
  -SpName 'bi.AccionesFormativasPlanFormacion_S' `
  -Stage all `
  -ProdServer 'prod-db'
```

---

## Scripts en Detalle

### `01-capture-baseline.sql`
Ejecutar en SSMS contra ProjectName. Captura:
- Top 30 SPs por CPU, tiempo transcurrido y frecuencia
- Planes con regresion (Query Store)
- Estadisticas de espera (PAGEIO_LATCH, LCK_M, etc.)
- Spills a TEMPDB
- Key lookups costosos
- Estadísticas obsoletas (>7 días)

**Cuándo:** Antes de CUALQUIER cambio. Guarda la salida como `baseline-YYYYMMDD.json`

---

### `02-index-recommendations.sql`
Genera DDL listo para revisar y aplicar:
- **Indices faltantes** ordenados por ImpactScore
- **FK sin índice** (principal causa de lock escalation)
- **Índices duplicados/redundantes** (candidatos a DROP)
- **Índices no usados** (sobrecarga en escrituras)
- **Fragmentación** (REBUILD vs REORGANIZE)

**⚠️ Regla:** Nunca aplicar en bloque. Revisar uno a uno, aplicar con `ONLINE=ON`.

---

### `03-golden-file-regression.ps1`
Compara salidas funcionales de un SP:

| Modo | Acción |
|------|--------|
| `capture` | Ejecuta SP y guarda resultado en JSON (golden file) |
| `validate` | Ejecuta SP actual, compara vs golden. Exit 0=pass, 1=fail |
| `report` | Muestra info del golden file sin ejecutar |

**Salida golden:** `workspaces/ProjectName/tests/golden/{sp_name}.golden.json`

Detecta:
- Cambios de esquema (columnas añadidas/quitadas)
- Diferencias en número de filas
- Diferencias de valores (con tolerancia numérica configurable)
- NULL vs no-NULL

---

### `04-staged-rollout.ps1`
Orquesta el despliegue seguro en 5 etapas:

| Etapa | Acción | Entorno |
|-------|--------|---------|
| 0 | Captura baseline + métricas DMV | PROD |
| 1 | Regresión funcional | DEV |
| 2 | Regresión + rendimiento | STAGING |
| 3 | Despliegue con confirmación manual (`CONFIRMO`) | PROD |
| 4 | Monitor 24h post-deploy (comparar vs baseline) | PROD |

**Reversión:** Si la etapa 3 falla, el script muestra pasos de reversión y sale con código 1.

---

## Patrones de Optimización Prioritarios

### 1. Índice de clave foránea faltante (mejora rápida, 30 min)
```sql
-- Antes: escaneo completo en DELETE/UPDATE porque la clave foránea no está indexada
-- Detección: script 02 sección "FOREIGN KEYS SIN ÍNDICE"

-- Solución:
CREATE NONCLUSTERED INDEX [IX_T_PLANFORMACION_FK_ConvocatoriaId]
ON dbo.T_PLANFORMACION (ConvocatoriaId)
WITH (ONLINE=ON, FILLFACTOR=90);

-- Validar: Ejecutar script 03 validate después de crear el índice
```

### 2. Key Lookup → índice de cobertura (2-4h)
```sql
-- Antes: búsqueda en índice no cluster + key lookup clusterizado (2 lecturas por fila)
-- Detección: script 01 sección "KEY LOOKUPS"

-- Solución: añadir columnas usadas en JOIN a INCLUDE
CREATE NONCLUSTERED INDEX [IX_T_FORMACION_PlanId_Covering]
ON dbo.T_FORMACION (PlanId)
INCLUDE (Nombre, FechaInicio, Estado, CentroId)  -- columnas del SELECT
WITH (ONLINE=ON, FILLFACTOR=85);
```

### 3. Estadísticas obsoletas (15 min)
```sql
-- Detección: script 01 sección "ESTADÍSTICAS OBSOLETAS"
-- Fix:
UPDATE STATISTICS dbo.T_PLANFORMACION WITH FULLSCAN;
-- O para toda la BD:
EXEC sp_updatestats;
```

### 4. Parameter Sniffing (variable en PROD)
```sql
-- Síntoma: SP rápido en DEV, lento en PROD con mismos datos
-- Solución opción A: OPTIMIZE FOR UNKNOWN
CREATE OR ALTER PROCEDURE bi.ReportePlan @planId INT
AS
    SELECT ... FROM dbo.T_PLANFORMACION WHERE PlanId = @planId
    OPTION (OPTIMIZE FOR (@planId UNKNOWN));

-- Solución opción B: Query Store → forzar plan óptimo
-- 1. Identifica plan_id del plan bueno en QS
-- 2. Fuerza ese plan:
EXEC sys.sp_query_store_force_plan @query_id = 1234, @plan_id = 5678;
```

### 5. Sargabilidad — predicados no sargables (1-2h por consulta)
```sql
-- ❌ No sargable (escaneo completo aunque exista índice)
WHERE YEAR(FechaCreacion) = 2025
WHERE CONVERT(VARCHAR, PlanId) = '1001'
WHERE Nombre LIKE '%Plan%'
WHERE LEN(Descripcion) > 100

-- ✅ Sargable (usa el índice)
WHERE FechaCreacion >= '2025-01-01' AND FechaCreacion < '2026-01-01'
WHERE PlanId = 1001
WHERE Nombre LIKE 'Plan%'  -- solo prefix
WHERE Descripcion > REPLICATE('a', 100)
```

---

## Checklist de Calidad (por SP optimizado)

- [ ] Baseline capturado antes del cambio (script 01)
- [ ] Golden file creado (script 03 capture)
- [ ] Índice/reescritura aplicado en DEV
- [ ] Validación funcional pass (script 03 validate, Stage 1)
- [ ] Validación en staging pass (Stage 2)
- [ ] DDL de cambio revisado por DBA
- [ ] Ventana de mantenimiento acordada con OPS
- [ ] Deploy en PROD con confirmación manual (Stage 3)
- [ ] Monitor 24h post-deploy (Stage 4)
- [ ] Métricas antes/después documentadas en reporte

---

## Métricas de Éxito

| Indicador | Objetivo | Cómo medir |
|-----------|--------|------------|
| AvgElapsed_ms | -20% mínimo | script 04 Stage 4 |
| AvgLogicalReads | -30% mínimo | sys.dm_exec_procedure_stats |
| Timeouts de lock/día | < 5 | alerta de sys.dm_os_waiting_tasks |
| Esperas PAGEIO_LATCH | < 100ms promedio | script 01 sección de esperas |
| Regresiones detectadas | 0 | código de salida de script 03 validate |

---

## Reversión Manual

Si un cambio causa regresión en PROD:

```sql
-- Reversión de índice
DROP INDEX [IX_nombre] ON schema.Tabla;

-- Reversión de reescritura de SP
-- Restaurar desde fuente de verdad:
-- workspaces/ProjectName/fuente-de-verdad/schema/db.sql

-- Reversión de plan forzado en Query Store
EXEC sys.sp_query_store_unforce_plan @query_id = 1234, @plan_id = 5678;

-- Reversión de UPDATE STATISTICS (no hay reversión directa)
-- → Usar sp_updatestats para regenerar con datos actuales
```

---

## Estructura de Archivos

```
.github/scripts/query-optimization/
├── 01-capture-baseline.sql          ← Ejecutar en SSMS
├── 02-index-recommendations.sql     ← Revisar y aplicar DDL
├── 03-golden-file-regression.ps1    ← capture | validate | report
├── 04-staged-rollout.ps1            ← Orquestador completo
└── README.md                        ← Este archivo

workspaces/ProjectName/tests/golden/
└── {schema}_{sp_name}.golden.json   ← Archivos golden (no comitear sin revisión)

workspaces/ProjectName/plans/optimization-reports/
└── {sp_name}-rollout-{date}.md      ← Reporte de cada optimización
```

---

**Próximos SPs priorizados (Wave-1, mayor frecuencia):**  
Obtener de `workspaces/ProjectName/plans/full-db-sp-classification.json`  
Filtrar: `Category = CRUD AND Wave = Wave-1`  
Ordenar por: frecuencia real (Fase 2 DMV → `phase2-top-sps-frequency.json`)

