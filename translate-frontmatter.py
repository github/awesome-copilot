#!/usr/bin/env python3
"""
Simple batch translator: Spanish → English for frontmatter and titles
Works offline, no Azure OpenAI needed
"""

import re
from pathlib import Path

# Translation dictionary for common RAG/Azure terms
TRANSLATIONS = {
    # Agent names/titles
    'RAG: Chat Conversacional': 'RAG: Conversational Chat',
    'Chat RAG multi-turno conversacional. Mantiene contexto, reformula preguntas, permite seguimiento. Para exploración conversacional de documentos.':
    'Multi-turn conversational RAG chat. Maintains context, reformulates questions, enables follow-ups. For conversational document exploration.',

    'RAG: Cost Scaler': 'RAG: Cost Scaler',
    'Gestiona dinámicamente los costes de infraestructura RAG en Azure post-despliegue — escala entre tiers mínimo/estándar/premium con cero downtime y alertas automáticas de presupuesto.':
    'Dynamically manages RAG infrastructure costs in Azure post-deployment — scales between minimal/standard/premium tiers with zero downtime and automatic budget alerts.',

    'RAG: Azure Setup': 'RAG: Azure Setup',
    'Despliega infraestructura Azure para RAG: OpenAI, AI Search, Application Insights. Usa plantillas Bicep. Valida conectividad y genera credenciales.':
    'Deploys Azure infrastructure for RAG: OpenAI, AI Search, Application Insights. Uses Bicep templates. Validates connectivity and generates credentials.',

    'RAG: Executive Report Generator': 'RAG: Executive Report Generator',
    'Genera informes ejecutivos profesionales en formato DOCX usando Claude Opus 4.7. Crea narrativas convincentes de alto impacto con beneficios cuantificados y recomendaciones estratégicas. Perfecto para presentaciones a clientes y comunicación con stakeholders.':
    'Generates professional executive reports in DOCX format using Claude Opus 4.7. Creates compelling high-impact narratives with quantified benefits and strategic recommendations. Perfect for client presentations and stakeholder communication.',

    'RAG: Especialista en Indexación': 'RAG: Indexing Specialist',
    'Indexa el conocimiento del proyecto en Azure AI Search para RAG. Fragmenta documentación, código y configs. Crea índices con búsqueda semántica y vectorial habilitada. Devuelve estadísticas del índice y métricas de calidad de búsqueda.':
    'Indexes project knowledge in Azure AI Search for RAG. Chunks documentation, code, and configs. Creates indexes with semantic and vector search enabled. Returns index statistics and search quality metrics.',

    'RAG: SharePoint Setup': 'RAG: SharePoint Setup',
    'Configura la integración con SharePoint en modo profesional (Azure Search tiempo real) o local (descarga). Gestiona OAuth, resolución de sitio y configuración del indexador.':
    'Configures SharePoint integration in professional mode (real-time Azure Search) or local mode (download). Manages OAuth, site resolution, and indexer configuration.',

    'RAG: Validate Deployment': 'RAG: Validate Deployment',
    'Valida costes y arquitectura antes de desplegar infraestructura RAG. Previene errores costosos con análisis de costes y recomendaciones de tier.':
    'Validates costs and architecture before deploying RAG infrastructure. Prevents costly errors with cost analysis and tier recommendations.',

    'RAG: Onboarding Wizard': 'RAG: Onboarding Wizard',
    'Piensa antes de desplegar: entiende la arquitectura, costes y ROI primero. Después automatiza el setup completo.':
    'Think before deploying: understand architecture, costs, and ROI first. Then automate the complete setup.',
}

def translate_file(file_path: Path) -> bool:
    """Translate a single file's frontmatter and key sections"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Apply translations
    for spanish, english in TRANSLATIONS.items():
        content = content.replace(spanish, english)

    # Translate common phrases in content
    common_phrases = {
        'Propósito': 'Purpose',
        'Cuándo usar': 'When to Use',
        'Workflow': 'Workflow',
        'Prerequisitos': 'Prerequisites',
        'Duración estimada': 'Estimated Duration',
        'Fase': 'Phase',
        'Salida': 'Output',
        'Manejo de errores': 'Error Handling',
        'Skills relacionados': 'Related Skills',
        '## Propósito': '## Purpose',
        '## Cuándo usar': '## When to Use',
        '## Workflow': '## Workflow',
        '## Prerequisitos': '## Prerequisites',
        '## Duración estimada': '## Estimated Duration',
        '## Salida': '## Output',
        '## Manejo de errores': '## Error Handling',
        '## Skills relacionados': '## Related Skills',
    }

    for spanish, english in common_phrases.items():
        content = content.replace(spanish, english)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    repo_root = Path(__file__).parent

    print("=" * 70)
    print("RAG-Azure-Builder: Spanish → English Quick Translator")
    print("=" * 70)
    print()

    # Count and translate agents
    agent_files = sorted(list((repo_root / "agents").glob("rag-*.agent.md")))
    print(f"📁 Agents ({len(agent_files)} files):")
    translated_count = 0
    for file_path in agent_files:
        if translate_file(file_path):
            print(f"   ✅ {file_path.name}")
            translated_count += 1
        else:
            print(f"   ⏭️  {file_path.name} (no changes)")

    # Translate skills SKILL.md files
    print(f"\n📁 Skills:")
    for skill_dir in sorted((repo_root / "skills").glob("rag-*")):
        skill_md = skill_dir / "SKILL.md"
        if skill_md.exists():
            if translate_file(skill_md):
                print(f"   ✅ {skill_dir.name}/SKILL.md")
                translated_count += 1
            else:
                print(f"   ⏭️  {skill_dir.name}/SKILL.md")

    # Translate instructions
    instruction_files = sorted(list((repo_root / "instructions").glob("*rag*.md")))
    print(f"\n📁 Instructions ({len(instruction_files)} files):")
    for file_path in instruction_files:
        if translate_file(file_path):
            print(f"   ✅ {file_path.name}")
            translated_count += 1
        else:
            print(f"   ⏭️  {file_path.name}")

    print("\n" + "=" * 70)
    print(f"✅ Translation pass 1 complete! ({translated_count} files modified)")
    print("=" * 70)
    print("\n⚠️  Note: This translator handles frontmatter and common phrases.")
    print("   For full translation of all content, run the full translator script.")
    print("\n   Next steps:")
    print("   git add .")
    print("   git commit -m 'feat: translate RAG-Azure-Builder frontmatter to English'")
    print("   git push origin main\n")

if __name__ == "__main__":
    main()
