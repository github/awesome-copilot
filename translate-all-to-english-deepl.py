#!/usr/bin/env python3
"""
Batch translate all RAG-Azure-Builder files from Spanish to English using DeepL
"""

import re
from pathlib import Path
from typing import Optional
import json
import time

# DeepL translation mapping - Built-in translations for common technical terms
# This allows offline translation for the most important content
TECHNICAL_TRANSLATIONS = {
    # RAG/Search terms
    'Retrieval-augmented Generation': 'Retrieval-augmented Generation',
    'búsqueda': 'search',
    'búsquedas': 'searches',
    'búsqueda semántica': 'semantic search',
    'búsqueda vectorial': 'vector search',
    'búsqueda híbrida': 'hybrid search',
    'indexación': 'indexing',
    'indexar': 'index',
    'fragmentación': 'chunking',
    'fragmentar': 'chunk',
    'embeddings': 'embeddings',
    'vectoriales': 'vector',

    # Azure services
    'Azure Search': 'Azure AI Search',
    'Azure AI Search': 'Azure AI Search',
    'AI Search': 'AI Search',
    'Azure OpenAI': 'Azure OpenAI',
    'Azure OpenAI Service': 'Azure OpenAI Service',
    'Application Insights': 'Application Insights',
    'Azure Cognitive Services': 'Azure Cognitive Services',
    'almacenamiento': 'storage',
    'Storage': 'Storage',
    'Cuenta de almacenamiento': 'Storage Account',

    # Common phrases
    'Propósito': 'Purpose',
    'propósito': 'purpose',
    'Cuándo usar': 'When to Use',
    'cuándo usar': 'when to use',
    'Workflow': 'Workflow',
    'workflow': 'workflow',
    'Prerequisitos': 'Prerequisites',
    'prerequisitos': 'prerequisites',
    'Duración estimada': 'Estimated Duration',
    'duración estimada': 'estimated duration',
    'Fase': 'Phase',
    'fase': 'phase',
    'Salida': 'Output',
    'salida': 'output',
    'Manejo de errores': 'Error Handling',
    'manejo de errores': 'error handling',
    'Skills relacionados': 'Related Skills',
    'skills relacionados': 'related skills',
    'Resolución de problemas': 'Troubleshooting',
    'resolución de problemas': 'troubleshooting',

    # Common Spanish phrases
    'desplegar': 'deploy',
    'despliegue': 'deployment',
    'implementación': 'implementation',
    'configuración': 'configuration',
    'validación': 'validation',
    'optimización': 'optimization',
    'seguridad': 'security',
    'rendimiento': 'performance',
    'monitoreo': 'monitoring',
    'observabilidad': 'observability',
    'integración': 'integration',
    'autenticación': 'authentication',
    'autorización': 'authorization',
    'credenciales': 'credentials',
}

def try_deepl_translation(text: str, lang_from: str = "ES", lang_to: str = "EN-US") -> Optional[str]:
    """Try to use DeepL API for translation"""
    try:
        import deepl

        # Try to get API key from environment
        import os
        api_key = os.getenv("DEEPL_API_KEY")

        if not api_key:
            return None

        translator = deepl.Translator(api_key)
        result = translator.translate_text(text, source_lang=lang_from, target_lang=lang_to)
        return result.text
    except Exception as e:
        print(f"   ⚠️  DeepL not available: {e}")
        return None

def translate_with_fallback(text: str) -> str:
    """Translate text, falling back to pattern-based translation if needed"""

    # Try DeepL first
    translated = try_deepl_translation(text)
    if translated:
        return translated

    # Fallback: pattern-based replacement for common terms
    result = text
    for spanish, english in TECHNICAL_TRANSLATIONS.items():
        # Case-insensitive replacement with word boundaries
        pattern = r'\b' + re.escape(spanish) + r'\b'
        result = re.sub(pattern, english, result, flags=re.IGNORECASE)

    return result if result != text else text

def translate_file_with_structure(file_path: Path) -> bool:
    """Translate file while preserving markdown structure"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by markdown sections to translate more intelligently
    parts = content.split('```')
    translated_parts = []

    for i, part in enumerate(parts):
        if i % 2 == 0:  # Text (not code)
            translated_parts.append(translate_with_fallback(part))
        else:  # Code block - preserve as-is
            translated_parts.append(part)

    translated_content = '```'.join(translated_parts)

    if translated_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(translated_content)
        return True
    return False

def main():
    repo_root = Path(__file__).parent

    print("=" * 70)
    print("RAG-Azure-Builder: Full Spanish → English Translator")
    print("=" * 70)
    print()

    # Check for DeepL availability
    try:
        import deepl
        has_deepl = True
        print("✅ DeepL library available")
    except ImportError:
        has_deepl = False
        print("⚠️  DeepL library not found. Using fallback translation.")
        print("   To use DeepL: pip install deepl")
        print("   To enable: export DEEPL_API_KEY=your_key")
        print()

    total_translated = 0

    # Translate agents
    agent_files = sorted(list((repo_root / "agents").glob("rag-*.agent.md")))
    print(f"📁 Agents ({len(agent_files)} files):")
    for file_path in agent_files:
        print(f"   Translating {file_path.name}...", end=" ", flush=True)
        if translate_file_with_structure(file_path):
            print("✅")
            total_translated += 1
        else:
            print("⏭️  (no Spanish content)")

    # Translate skills SKILL.md files
    print(f"\n📁 Skills:")
    for skill_dir in sorted((repo_root / "skills").glob("rag-*")):
        skill_md = skill_dir / "SKILL.md"
        if skill_md.exists():
            print(f"   Translating {skill_dir.name}/SKILL.md...", end=" ", flush=True)
            if translate_file_with_structure(skill_md):
                print("✅")
                total_translated += 1
            else:
                print("⏭️  (no Spanish content)")

    # Translate instructions
    instruction_files = sorted(list((repo_root / "instructions").glob("*rag*.md")))
    print(f"\n📁 Instructions ({len(instruction_files)} files):")
    for file_path in instruction_files:
        print(f"   Translating {file_path.name}...", end=" ", flush=True)
        if translate_file_with_structure(file_path):
            print("✅")
            total_translated += 1
        else:
            print("⏭️  (no Spanish content)")

    print("\n" + "=" * 70)
    print(f"✅ Translation complete! ({total_translated} files modified)")
    print("=" * 70)

    if not has_deepl:
        print("\n⚠️  Using fallback translation (technical terms only)")
        print("   For best results, install and configure DeepL:")
        print("   1. pip install deepl")
        print("   2. export DEEPL_API_KEY=your_api_key")
        print("   3. Re-run this script")

    print("\n✨ Next steps:")
    print("   git add .")
    print("   git commit -m 'feat: translate all RAG-Azure-Builder content to English'")
    print("   git push origin main\n")

if __name__ == "__main__":
    main()
