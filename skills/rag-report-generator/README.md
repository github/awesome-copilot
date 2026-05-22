# RAG Report Generator Skill

**Professional Executive Report Generation with Claude Opus 4.7**

Generates high-impact DOCX reports that present RAG implementations to clients and stakeholders with professional formatting, AI-powered narratives, and quantified impact metrics.

## Files

### Core Implementation

1. **report-generator.py** (800+ lines)
   - Main report generation engine
   - Classes: `ExecutiveReportGenerator`, `ReportMetadata`, `ReportType`
   - Professional DOCX formatting utilities
   - Integración Claude Opus 4.7 para generación de contenido
   - Uso: Módulo principal importado por agentes

2. **report-templates.py** (400+ lines)
   - Quality guidelines and templates
   - Content best practices (executive summary, recommendations, timeline)
   - Real examples (good vs. bad)
   - 25-point quality checklist
   - Tone guidelines and content standards

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
        "Phase 1": "1-2 weeks",
        "Phase 2": "2-4 weeks",
        "Phase 3": "1-2 weeks",
        "Phase 4": "1 week",
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
