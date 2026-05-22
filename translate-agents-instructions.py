#!/usr/bin/env python3
"""
Batch translate RAG agent and instruction files from Spanish to English
Using a simple dictionary-based approach combined with API if available
"""

import os
import re
from pathlib import Path

# Common Spanish to English translations for RAG context
TRANSLATION_MAP = {
    'configuración': 'configuration',
    'despliegue': 'deployment',
    'validación': 'validation',
    'integración': 'integration',
    'optimización': 'optimization',
    'orquestación': 'orchestration',
    'recomendación': 'recommendation',
    'diagnóstico': 'diagnostic',
    'diagnóstica': 'diagnostic',
    'indexación': 'indexing',
    'Configuración': 'Configuration',
    'Despliegue': 'Deployment',
    'Validación': 'Validation',
    'Integración': 'Integration',
    'Optimización': 'Optimization',
    'Orquestación': 'Orchestration',
    'Recomendación': 'Recommendation',
    'Diagnóstico': 'Diagnostic',
    'Diagnóstica': 'Diagnostic',
    'Indexación': 'Indexing',
    'configuraciones': 'configurations',
    'despliegues': 'deployments',
    'validaciones': 'validations',
    'integraciones': 'integrations',
    'optimizaciones': 'optimizations',
    'recomendaciones': 'recommendations',
    'diagnósticos': 'diagnostics',
    'indexaciones': 'indexing',
    'instalación': 'installation',
    'instalaciones': 'installations',
    'Instalación': 'Installation',
    'presentación': 'presentation',
    'presentaciones': 'presentations',
    'Presentación': 'Presentation',
    'implementación': 'implementation',
    'implementaciones': 'implementations',
    'Implementación': 'Implementation',
    'función': 'function',
    'funciones': 'functions',
    'Función': 'Function',
    'descripción': 'description',
    'descripciones': 'descriptions',
    'Descripción': 'Description',
    'operación': 'operation',
    'operaciones': 'operations',
    'Operación': 'Operation',
    'selección': 'selection',
    'Selección': 'Selection',
    'creación': 'creation',
    'Creación': 'Creation',
    'obtención': 'retrieval',
    'Obtención': 'Retrieval',
    'verificación': 'verification',
    'Verificación': 'Verification',
    'información': 'information',
    'Información': 'Information',
    'interacción': 'interaction',
    'Interacción': 'Interaction',
}

def translate_file_content(content: str) -> str:
    """Translate Spanish content to English using the translation map"""
    result = content

    for spanish, english in TRANSLATION_MAP.items():
        # Word boundary regex to match whole words only
        pattern = r'\b' + re.escape(spanish) + r'\b'
        result = re.sub(pattern, english, result)

    return result

def process_files(root_dirs):
    """Process all .agent.md and .instructions.md files"""
    file_patterns = ['**/*.agent.md', '**/*instructions.md']
    files_translated = 0

    for root_dir in root_dirs:
        if not os.path.exists(root_dir):
            print(f"Directory not found: {root_dir}")
            continue

        base_path = Path(root_dir)
        for pattern in file_patterns:
            for file_path in base_path.glob(pattern):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        original_content = f.read()

                    translated_content = translate_file_content(original_content)

                    if original_content != translated_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(translated_content)
                        print(f"✓ Translated: {file_path}")
                        files_translated += 1

                except Exception as e:
                    print(f"✗ Error processing {file_path}: {e}")

    return files_translated

if __name__ == "__main__":
    root_directories = [
        'RAG-Azure-Builder-src/.github',
        'spec-kit-extension-rag-azure-builder/assets/rag-azure-builder'
    ]

    count = process_files(root_directories)
    print(f"\nTotal files translated: {count}")
