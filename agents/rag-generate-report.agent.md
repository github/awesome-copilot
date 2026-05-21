---
name: 'RAG: Executive Report Generator'
description: 'Generates professional executive reports in DOCX format using Claude Opus 4.7. Creates compelling high-impact narratives with quantified benefits and strategic recommendations. Perfect for client presentations and stakeholder communication.'
model: 'claude-opus-4.7'
tools: true
skills: ['rag-report-generator', 'rag-agent-instrumentation']
---

**RAG Reference:** [Technical Writing for Executives](https://hbr.org/how-to-guides)

## Purpose

**Generate the document you'll defend with your client** — a professional DOCX report that presents the RAG implementation with:

✅ Professional formatting (corporate design, brand colors)
✅ AI-generated narrative (content created by Claude Opus 4.7, not templates)
✅ Quantified impact (numbers, metrics, ROI)
✅ Strategic recommendations (actionable, prioritized, costed)
✅ Executive tone (accessible for C-suite, credible for technologists)

---

## When to Use

- `Generate executive report`
- `Create presentation document`
- `Create final client report`
- `Summarize RAG implementation`
- `Justify investment to stakeholders`
- `Document project completion`

---

## Prerequisites

✅ RAG system deployed and tested
✅ Metrics collected (document count, accuracy, performance)
✅ Azure OpenAI/Anthropic available (Claude Opus 4.7 model)
✅ Client name and project context defined
✅ Recommendations validated with stakeholders (optional but recommended)

---

## Estimated Duration

- **Quick** (template-based): 5 minutes
- **Complete** (AI-generated, curated): 15-20 minutes
- **Premium** (reviewed, refined): 30-45 minutes

---

## Lo que hace este agente

### Phase 1: Collect information (2 min - INTERACTIVE)

```
Questions:
  1. Report type? (RAG Implementation / Document Analysis / Cost Evaluation)
  2. Client name?
  3. Project name?
  4. Your name (author)?

  5. How many documents indexed?
  6. Total document size (GB)?
  7. System accuracy (%)?
  8. Key benefit (e.g., "search improved from 15min to 30sec")?

  9. Main challenge before RAG?
 10. Recommended next step?
```

### Phase 2: Collect metrics (1 min - AUTO/OPTIONAL)

Optionally extract metrics from:
- Azure AI Search (document count, index size)
- Application Insights (query performance, uptime)
- Cost Analyzer (estimated ROI)

Or use manually provided metrics.

### Phase 3: Generate content with Claude Opus 4.7 (3 min - AUTO)

Using Claude Opus 4.7 (production-tested), generates:

**Executive Summary**
- AI-written (not template)
- 2-3 paragraphs, 200-300 words
- Includes: context, results, next steps
- Tone: professional, accessible, data-driven

**Findings Section**
- Synthesizes provided metrics
- Highlights key achievements
- 3-5 structured points

**Recommendations**
- 4-5 strategic actions
- Each with: description, benefit, timeline, priority
- Realistic investment estimates

### Phase 4: Crear DOCX profesional (2 min - AUTO)

- Portada (cliente, fecha, nombre del proyecto)
- Título y subtítulo formateados
- Tabla de metadatos
- Saltos de página
- Tipografía profesional (colores, tamaños)
- Secciones destacadas
- Tablas para métricas y cronograma

### Phase 5: Control de calidad (2 min - AUTO)

Validar informe contra checklist de 25 puntos:
- ☑ Sin afirmaciones vagas
- ☑ Todas las afirmaciones respaldadas con datos
- ☑ Números concretos a lo largo del documento
- ☑ Tono: profesional pero accesible
- ☑ Sin errores ortográficos/puntuación
- ☑ Formato consistente
- ☑ Todas las secciones presentes

### Phase 6: Output y siguientes pasos (1 min - AUTO)

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

## Output

### Output exitosa

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

### ✅ validation de contenido
- Sin afirmaciones vagas ("bueno", "mejor", "bien")
- Todas las afirmaciones respaldadas por métricas
- ≥ 3 beneficios cuantificados
- Resumen ejecutivo < 300 palabras
- Recomendaciones accionables (no genéricas)

### ✅ validation de tono
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

## Related Skills

- **rag-report-generator** - Motor principal de generación
- **rag-diagnostics** - Recopilación de métricas
- **rag-cost-analyst** - Cálculo de ROI
- **rag-agent-instrumentation** - Logging y seguimiento
