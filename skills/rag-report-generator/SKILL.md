---
name: rag-report-generator
description: "Generación profesional de informes ejecutivos usando Claude Opus 4.7. Genera informes DOCX de alta calidad con formato profesional, narrativas convincentes y métricas de impacto cuantificadas. Perfecto para presentaciones a clientes y comunicación con stakeholders."
version: "1.0.0"
author: "RAG Framework"
tags: ["reporting", "executive-summary", "docx", "claude", "professional"]
---

# RAG: Generador de Informes Profesional

**Generación de Informes Ejecutivos con Contenido Potenciado por IA**

Crea informes ejecutivos profesionales y de alto impacto que defienden tu implementación RAG ante clientes y stakeholders.

---

## Propósito

Este skill **genera el documento final que defiendes ante el cliente** — un informe DOCX profesional que presenta resultados de implementación RAG con:

- **Formato profesional** — Diseño corporativo, tipografía adecuada, colores de marca
- **Contenido potenciado por IA** — Claude Opus 4.7 genera narrativas convincentes y síntesis de datos
- **Impacto cuantificado** — Números, métricas, ROI (no promesas vagas)
- **Recomendaciones estratégicas** — Próximos pasos accionables con timeline e inversión
- **Tono ejecutivo** — Accesible para C-suite, pero creíble para stakeholders técnicos

---

## Características

**Generación de Contenido**
- Resumen ejecutivo (2-3 párrafos, escrito por IA)
- Sección de hallazgos (sintetizados desde datos)
- Recomendaciones (estratégicas, priorizadas, costeadas)
- Timeline de implementación (4 fases + detalles)
- Estrategias de mitigación de riesgos

**Formato Profesional**
- Diseño corporativo con colores de marca
- Tabla de contenidos y saltos de página
- Fuentes profesionales (Calibri, dimensionado)
- Cajas de información destacadas
- Márgenes y espaciado adecuados
- Soporte de logo empresa (opcional)

**Aseguramiento de Calidad**
- Checklist de calidad de 25 puntos
- Validación de tono (profesional, accesible)
- Verificación de métricas (sin claims vagos)
- Verificaciones de gramática y ortografía
- Consistencia de formato

**Integraciones**
- **Claude Opus 4.7** para contenido de alta calidad (razonamiento estratégico)
- **Azure Search** métricas (conteo documentos, tamaño índice)
- **Azure OpenAI** datos (deployment modelo, uso tokens)
- **Application Insights** (métricas rendimiento)
- **Cost Analyzer** (cálculos ROI)

---

## Inicio Rápido

### Prerequisitos

```bash
pip install python-docx openai
```

### Generar Informe (Simple)

```python
from report_generator import ExecutiveReportGenerator, ReportMetadata, ReportType
from pathlib import Path

# Inicializar
gen = ExecutiveReportGenerator()

# Metadatos
metadata = ReportMetadata(
    title="Informe Ejecutivo: Búsqueda Inteligente",
    client_name="MENSADEF",
    project_name="RAG Implementation",
    report_type=ReportType.RAG_IMPLEMENTATION,
)

# Contenido
content = {
    "executive_summary": "Resumen generado por IA aquí...",
    "metrics": {
        "Documentos": "2,345",
        "Tamaño": "15.3 GB",
        "Precisión": "97%",
    },
    "findings_text": "Hallazgos generados por IA...",
    "recommendations_text": "Recomendaciones generadas por IA...",
}

# Generar
output = gen.generate_report(metadata, content, Path("outputs/informe.docx"))
```

### Generar Informe (Completo con IA)

```python
gen = ExecutiveReportGenerator()

# Claude Opus 4.7 genera resumen ejecutivo convincente
summary = gen.generate_executive_summary(
    project_name="RAG MENSADEF",
    document_count=2345,
    total_size_gb=15.3,
    key_findings=["Docs alta calidad", "Bien estructurado", "Oportunidad automatización"],
    recommendations=["Búsqueda híbrida", "Integración SharePoint"],
)

findings = gen.generate_findings_section({
    "document_count": 2345,
    "total_size_gb": 15.3,
    "quality": "Alta",
})

recommendations = gen.generate_recommendations(
    context="Proyecto RAG con 2345 documentos"
)

# Ensamblar informe
content = {
    "executive_summary": summary,
    "findings_text": findings,
    "recommendations_text": recommendations,
    "metrics": {...},
    "timeline": {...},
}

report_path = gen.generate_report(metadata, content, Path("outputs/informe.docx"))
```

---

## Directrices de Calidad

### Resumen Ejecutivo

**REGLAS DE ORO:**
- **2-3 párrafos MÁXIMO** (200-300 palabras)
- **Números concretos** (2,345 docs, no "muchos")
- **Una propuesta de valor por frase**
- **Verbos activos** (no pasivos)
- **Impacto de negocio primero, tecnología segundo**

**ESTRUCTURA:**

```
Párrafo 1: Contexto (Qué -> Cuándo)
"Se ha implementado un sistema de búsqueda inteligente sobre 2,345 documentos
de MENSADEF, integrando procedimientos, legislación y análisis técnico."

Párrafo 2: Resultados (Cuánto mejora)
"Reduce tiempo de búsqueda de 15 minutos a 30 segundos, beneficiando
a 200+ usuarios. Precisión: 97% en primeros resultados."

Párrafo 3: Next Steps (Qué sigue)
"Sistema listo para producción Q2. Se recomienda: (1) Activar en sprint,
(2) Integrar SharePoint Q3, (3) Análisis en Q4."
```

### Recomendaciones

**FORMATO:**

```
[#]. [Título de Acción]

Descripción: [QUÉ - 1-2 frases]
Beneficio: [IMPACTO - con números]
Implementación: [TIMELINE - corto/medio/largo]
Inversión: [COSTE - o "$0 (licencias existentes)"]
Prioridad: [ALTA/MEDIA/BAJA]
```
