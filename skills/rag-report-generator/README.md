# RAG Report Generator Skill

**Generación Profesional de Informes Ejecutivos con Claude Opus 4.7**

Genera informes DOCX de alto impacto que presentan implementaciones RAG a clientes y stakeholders con formato profesional, narrativas potenciadas por IA y métricas de impacto cuantificadas.

## Archivos

### Implementación Core

1. **report-generator.py** (800+ líneas)
   - Motor principal de generación de informes
   - Clases: `ExecutiveReportGenerator`, `ReportMetadata`, `ReportType`
   - Utilidades de formato DOCX profesional
   - Integración Claude Opus 4.7 para generación de contenido
   - Uso: Módulo principal importado por agentes

2. **report-templates.py** (400+ líneas)
   - Directrices de calidad y plantillas
   - Mejores prácticas de contenido (resumen ejecutivo, recomendaciones, timeline)
   - Ejemplos reales (bueno vs. malo)
   - Checklist de calidad de 25 puntos
   - Directrices de tono y estándares de contenido

3. **SKILL.md** (600+ líneas)
   - Documentación completa
   - Ejemplos de inicio rápido
   - Directrices de calidad con ejemplos
   - Razonamiento de selección de modelo IA (por qué Claude Opus 4.7)
   - Plantillas de informe para diferentes tipos
   - Patrones de integración

4. **README.md** (este archivo)
   - Referencia rápida y resumen de archivos
   - Inicio rápido
   - Integración con agentes

## Inicio Rápido

### Instalar

```bash
pip install python-docx openai
```

### Generar Informe

```python
from report_generator import ExecutiveReportGenerator, ReportMetadata, ReportType
from pathlib import Path

# Inicializar (usa AZURE_OPENAI_KEY y AZURE_OPENAI_ENDPOINT del env)
gen = ExecutiveReportGenerator()

# Crear metadatos
metadata = ReportMetadata(
    title="Informe Ejecutivo: Búsqueda Inteligente",
    client_name="MENSADEF",
    project_name="RAG Implementation",
    report_type=ReportType.RAG_IMPLEMENTATION,
)

# Preparar contenido
content = {
    "executive_summary": "Generado por Claude Opus 4.7...",
    "metrics": {
        "Documentos": "2,345",
        "Tamaño": "15.3 GB",
        "Precisión": "97%",
    },
    "findings_text": "Hallazgos generados por IA...",
    "recommendations_text": "Recomendaciones generadas por IA...",
    "timeline": {
        "Fase 1": "1-2 semanas",
        "Fase 2": "2-4 semanas",
        "Fase 3": "1-2 semanas",
        "Fase 4": "1 semana",
    }
}

# Generar DOCX
output_path = Path("outputs/informe-ejecutivo-20260514.docx")
report_path = gen.generate_report(metadata, content, output_path)

print(f"Informe: {report_path}")
```

### Generar con Contenido IA

```python
gen = ExecutiveReportGenerator()

# Claude Opus 4.7 genera resumen ejecutivo convincente
summary = gen.generate_executive_summary(
    project_name="RAG MENSADEF",
    document_count=2345,
    total_size_gb=15.3,
    key_findings=["Docs bien estructurados", "Alta calidad", "Oportunidad de automatización"],
    recommendations=["Búsqueda híbrida", "Integración SharePoint"],
)
```
