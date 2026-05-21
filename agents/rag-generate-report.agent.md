---
name: 'RAG: Executive Report Generator'
description: 'Genera informes ejecutivos profesionales en formato DOCX usando Claude Opus 4.7. Crea narrativas convincentes de alto impacto con beneficios cuantificados y recomendaciones estratégicas. Perfecto para presentaciones a clientes y comunicación con stakeholders.'
model: 'claude-opus-4.7'
tools: true
skills: ['rag-report-generator', 'rag-agent-instrumentation']
---

**RAG Reference:** [Technical Writing for Executives](https://hbr.org/how-to-guides)

## Propósito

**Genera el documento que defenderás ante tu cliente** — un informe profesional DOCX que presenta la implementación RAG con:

✅ Formato profesional (diseño corporativo, colores de marca)  
✅ Narrativa generada por IA (contenido creado por Claude Opus 4.7, no plantillas)  
✅ Impacto cuantificado (números, métricas, ROI)  
✅ Recomendaciones estratégicas (accionables, priorizadas, costeadas)  
✅ Tono ejecutivo (accesible para C-suite, creíble para tecnólogos)

---

## Cuándo usar

- `Generar informe ejecutivo`
- `Crear documento de presentación`
- `Hacer informe final para cliente`
- `Resumir implementación RAG`
- `Justificar inversión a stakeholders`
- `Documentar finalización del proyecto`

---

## Prerequisitos

✅ Sistema RAG desplegado y probado  
✅ Métricas recopiladas (conteo de documentos, precisión, rendimiento)  
✅ Azure OpenAI/Anthropic disponible (modelo Claude Opus 4.7)  
✅ Nombre del cliente y contexto del proyecto definidos  
✅ Recomendaciones validadas con stakeholders (opcional pero recomendado)

---

## Duración estimada

- **Rápido** (basado en plantilla): 5 minutos
- **Completo** (generado por IA, curado): 15-20 minutos
- **Premium** (revisado, refinado): 30-45 minutos

---

## Lo que hace este agente

### Fase 1: Recopilar información (2 min - INTERACTIVO)

```
Preguntas:
  1. ¿Tipo de informe? (Implementación RAG / Análisis Documental / Evaluación de Costes)
  2. ¿Nombre del cliente?
  3. ¿Nombre del proyecto?
  4. ¿Tu nombre (autor)?
  
  5. ¿Cuántos documentos indexados?
  6. ¿Tamaño total de documentos (GB)?
  7. ¿Precisión del sistema (%)?
  8. ¿Beneficio clave (ej: "búsqueda mejoró de 15min a 30seg")?
  
  9. ¿Principal reto antes del RAG?
 10. ¿Siguiente paso recomendado?
```

### Fase 2: Recopilar métricas (1 min - AUTO/OPCIONAL)

Opcionalmente extrae métricas de:
- Azure Search (conteo de documentos, tamaño del índice)
- Application Insights (rendimiento de consultas, uptime)
- Analizador de costes (ROI estimado)

O usar métricas proporcionadas manualmente.

### Fase 3: Generar contenido con Claude Opus 4.7 (3 min - AUTO)

Usando Claude Opus 4.7 (probado en producción), genera:

**Resumen ejecutivo**
- Escrito por IA (no plantilla)
- 2-3 párrafos, 200-300 palabras
- Incluye: contexto, resultados, siguientes pasos
- Tono: profesional, accesible, basado en datos

**Sección de hallazgos**
- Sintetiza las métricas proporcionadas
- Destaca logros clave
- 3-5 puntos estructurados

**Recomendaciones**
- 4-5 acciones estratégicas
- Cada una con: descripción, beneficio, plazo, prioridad
- Estimaciones de inversión realistas

### Fase 4: Crear DOCX profesional (2 min - AUTO)

- Portada (cliente, fecha, nombre del proyecto)
- Título y subtítulo formateados
- Tabla de metadatos
- Saltos de página
- Tipografía profesional (colores, tamaños)
- Secciones destacadas
- Tablas para métricas y cronograma

### Fase 5: Control de calidad (2 min - AUTO)

Validar informe contra checklist de 25 puntos:
- ☑ Sin afirmaciones vagas
- ☑ Todas las afirmaciones respaldadas con datos
- ☑ Números concretos a lo largo del documento
- ☑ Tono: profesional pero accesible
- ☑ Sin errores ortográficos/puntuación
- ☑ Formato consistente
- ☑ Todas las secciones presentes

### Fase 6: Salida y siguientes pasos (1 min - AUTO)

Guardar informe en `outputs/informe-ejecutivo-{fecha}.docx`

Imprimir:
```
✅ Informe generado

Archivo: outputs/informe-ejecutivo-20260514.docx
Páginas: [n]
Cliente: [nombre]
Métricas: [n] recomendaciones, [conteo docs] docs, [ROI]

Siguientes pasos:
1. Revisar informe en Word
2. Personalizar logo/colores (opcional)
3. Compartir con stakeholders
4. Atender feedback (re-ejecutar si necesario)
5. Presentar al cliente
```

---

## Salida

### Salida exitosa

```
✅ INFORME EJECUTIVO GENERADO

Archivo: outputs/informe-ejecutivo-20260514.docx
Tamaño: [n] páginas
Cliente: MENSADEF
Proyecto: Búsqueda Inteligente

Contenido:
  • Resumen ejecutivo: 3 párrafos, 287 palabras
  • Métricas: 2,345 docs, 97% precisión, búsqueda en 30seg
  • Hallazgos: 5 logros clave
  • Recomendaciones: 4 acciones estratégicas (1 Alta, 2 Media, 1 Baja)
  • Cronograma: 4 fases, 8 semanas total
  • Riesgos: 3 identificados + mitigaciones

Calidad: ✅ Los 25 checks pasados
  ✓ Sin afirmaciones vagas
  ✓ Tono profesional y accesible
  ✓ Todas las métricas validadas
  ✓ ROI: $120K/año
  ✓ Formato impecable

SIGUIENTES PASOS:
1. Abrir informe en Microsoft Word
2. Personalizar: logo, colores, encabezado/pie (opcional)
3. Compartir con equipo de revisión o stakeholder
4. Usar en: reunión de dirección, presentación a cliente, resumen ejecutivo
5. Refinamientos: Ejecutar agente de nuevo con feedback

El informe está listo para producción y puede compartirse inmediatamente.
```

---

## Aseguramiento de calidad

Cada informe pasa:

### ✅ Validación de contenido
- Sin afirmaciones vagas ("bueno", "mejor", "bien")
- Todas las afirmaciones respaldadas por métricas
- ≥ 3 beneficios cuantificados
- Resumen ejecutivo < 300 palabras
- Recomendaciones accionables (no genéricas)

### ✅ Validación de tono
- Profesional pero accesible
- Impacto de negocio enfatizado (no detalles técnicos)
- Números concretos (2,345 no "muchos")
- Voz activa (no pasiva)
- Persuasivo sin prometer de más

---

## FAQ

**P: ¿Puedo usarlo para diferentes clientes?**
R: Sí. Solo re-ejecuta el agente con diferente nombre de cliente, proyecto y métricas.

**P: ¿Con qué frecuencia debería regenerar?**
R: Una vez al completar el proyecto. Si las métricas cambian significativamente, regenerar con nuevos datos.

---

## Ejemplos

Ver [rag-report-generator/SKILL.md](../rag-report-generator/SKILL.md) para:
- Ejemplos de buen vs. mal resumen ejecutivo
- Guías de tono profesional
- Checklist de calidad (25 items)
- Ejemplos de estructura de recomendaciones
- Métricas que siempre incluir

---

## Skills relacionados

- **rag-report-generator** - Motor principal de generación
- **rag-diagnostics** - Recopilación de métricas
- **rag-cost-analyst** - Cálculo de ROI
- **rag-agent-instrumentation** - Logging y seguimiento
