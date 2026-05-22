#!/usr/bin/env python3
"""Translate Spanish content in Python files"""
import re
from pathlib import Path

TRANSLATION_MAP = {
    'REGLAS CRÍTICAS:': 'CRITICAL RULES:',
    'Extensión: 2-3 párrafos máximo (200-300 palabras)': 'Length: 2-3 paragraphs max (200-300 words)',
    'Estructura: Situación → Hallazgos → Recomendación principal': 'Structure: Situation → Findings → Main recommendation',
    'Datos: Siempre incluye números y métricas concretos': 'Data: Always include concrete numbers and metrics',
    'Lenguaje: Evita jerga técnica. Usa "documentos" no "embeddings"': 'Language: Avoid technical jargon. Use "documents" not "embeddings"',
    'Impacto: Destaca el valor de negocio, no la tecnología': 'Impact: Highlight business value, not the technology',
    'Formato: Markdown simple, sin encabezados': 'Format: Simple markdown, no headers',
    'Proyecto: ': 'Project: ',
    'Documentos indexados: ': 'Indexed documents: ',
    'Tamaño total: ': 'Total size: ',
    'Hallazgos clave: ': 'Key findings: ',
    'Recomendación principal: ': 'Main recommendation: ',
    'Escribe resumen ejecutivo en': 'Write executive summary in',
    'Implementación exitosa': 'Successful implementation',
    'Eres analista de documentación de IA.': 'You are an AI documentation analyst.',
    'Convierte datos técnicos en prosa ejecutiva profesional.': 'Convert technical data into professional executive prose.',
    'Mantén tono formal pero accesible.': 'Keep formal but accessible tone.',
    'Analiza estos hallazgos y escribe sección "Hallazgos" en': 'Analyze these findings and write the "Findings" section in',
    'Formato: 3-5 puntos bullet, cada uno con una frase introductoria.': 'Format: 3-5 bullet points, each with an introductory phrase.',
    'Incluye datos específicos. Destaca lo importante.': 'Include specific data. Highlight what is important.',
    'Eres estratega de transformación digital.': 'You are a digital transformation strategist.',
    'Creas recomendaciones accionables y de alto impacto.': 'You create actionable and high-impact recommendations.',
    'Tono: Profesional, inspirador, orientado a resultados.': 'Tone: Professional, inspiring, results-oriented.',
    'Contexto del proyecto:': 'Project context:',
    'Genera 4-5 recomendaciones estratégicas en': 'Generate 4-5 strategic recommendations in',
    '- Cada una debe ser accionable (no vaga)': '- Each one must be actionable (not vague)',
    '- Incluir timeline (corto/medio/largo plazo)': '- Include timeline (short/medium/long term)',
    '- Destaca el valor de negocio': '- Highlight business value',
    'Formato: bullet points con subtítulo.': 'Format: bullet points with subtitle.',
    'profesional': 'professional',
    'accesible': 'accessible',
}

def translate_file(filepath: Path) -> int:
    """Translate Spanish content in a file. Returns number of replacements."""
    content = filepath.read_text(encoding='utf-8')
    original = content

    for spanish, english in TRANSLATION_MAP.items():
        content = content.replace(spanish, english)

    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return 1
    return 0

# Process report-generator.py
report_gen_path = Path(r'c:\repo\awesome-copilot\skills\rag-report-generator\report-generator.py')
translate_file(report_gen_path)
print(f"✓ Translated: {report_gen_path}")

# Also update submodules
for submodule_path in [
    Path(r'c:\repo\awesome-copilot\RAG-Azure-Builder-src\.github\skills\rag-report-generator\report-generator.py'),
    Path(r'c:\repo\awesome-copilot\spec-kit-extension-rag-azure-builder\assets\rag-azure-builder\skills\rag-report-generator\report-generator.py'),
]:
    if submodule_path.exists():
        translate_file(submodule_path)
        print(f"✓ Translated: {submodule_path}")
    else:
        print(f"✗ Not found: {submodule_path}")

print("Done!")
