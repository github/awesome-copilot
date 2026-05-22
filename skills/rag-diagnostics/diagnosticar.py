#!/usr/bin/env python3
"""
Diagnostic: Verifies which components are configured in Azure AI Search

Answers: Why is only Indexes being populated?
"""

import os
from azure.search.documents.indexes import SearchIndexClient, SearchIndexerClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

def diagnose():
    """Check all RAG components in Azure AI Search"""

    endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
    key = os.getenv('AZURE_SEARCH_KEY')
    index_name = os.getenv('AZURE_SEARCH_INDEX')

    if not all([endpoint, key, index_name]):
        print("❌ Faltan credenciales en .env")
        return

    index_client = SearchIndexClient(endpoint, AzureKeyCredential(key))
    indexer_client = SearchIndexerClient(endpoint, AzureKeyCredential(key))

    print("""
╔═══════════════════════════════════════════════════════════════╗
║  DIAGNÓSTICO: Componentes de RAG en Azure AI Search           ║
╚═══════════════════════════════════════════════════════════════╝
""")

    # 1. Indexes
    print("1️⃣  INDEXES (Índices de búsqueda)")
    print("   ─────────────────────────────")
    try:
        indexes = index_client.list_indexes()
        for idx in indexes:
            print(f"   ✅ {idx.name}")
            print(f"      - Campos: {len(idx.fields)}")
            has_vectors = any(f.dimensions for f in idx.fields if hasattr(f, 'dimensions'))
            print(f"      - Vectores: {'✅' if has_vectors else '❌'}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 2. Data Sources
    print("\n2️⃣  DATA SOURCES (Dónde vienen los documentos)")
    print("   ────────────────────────────────────────────")
    try:
        data_sources = indexer_client.get_data_source_connections()
        count = 0
        for ds in data_sources:
            print(f"   ✅ {ds.name}")
            print(f"      - Tipo: {ds.type}")
            count += 1
        if count == 0:
            print("   ❌ NO hay data sources configuradas")
            print("      → Necesitas agregar uno (Azure Blob, SharePoint, etc.)")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 3. Skillsets
    print("\n3️⃣  SKILLSETS (Chunking, Vectorización, OCR)")
    print("   ──────────────────────────────────────────")
    try:
        skillsets = indexer_client.get_skillsets()
        count = 0
        for ss in skillsets:
            print(f"   ✅ {ss.name}")
            print(f"      - Skills: {len(ss.skills)}")
            skill_types = [getattr(s, 'odata_type', 'unknown') for s in ss.skills]
            print(f"      - Tipos: {', '.join(skill_types)}")
            count += 1
        if count == 0:
            print("   ❌ NO hay skillsets configuradas")
            print("      → Necesitas: SplitSkill, AzureOpenAIEmbeddingSkill, OcrSkill")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 4. Indexers
    print("\n4️⃣  INDEXERS (Orquestación automática)")
    print("   ────────────────────────────────────")
    try:
        indexers = indexer_client.get_indexers()
        count = 0
        for idx in indexers:
            status = indexer_client.get_indexer_status(idx.name)
            print(f"   ✅ {idx.name}")
            print(f"      - Estado: {status.status}")
            print(f"      - Data Source: {idx.data_source_name}")
            print(f"      - Skillset: {idx.skillset_name if idx.skillset_name else 'Ninguno'}")
            print(f"      - Schedule: {idx.schedule.interval if idx.schedule else 'Manual'}")
            count += 1
        if count == 0:
            print("   ❌ NO hay indexers configuradas")
            print("      → Necesitas crear indexer (Blob → Skillset → Index)")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print("\n" + "="*63)
    print("\n📊 RESUMEN (¿POR QUÉ SOLO INDEXES?)\n")

    data_sources_count = len(list(indexer_client.get_data_source_connections()))
    skillsets_count = len(list(indexer_client.get_skillsets()))
    indexers_count = len(list(indexer_client.get_indexers()))

    if data_sources_count == 0:
        print("❌ PROBLEMA 1: No hay Data Sources")
        print("   → Tus documentos no están conectados")
        print("   → Solución: Agregar data source (Azure Blob)")

    if skillsets_count == 0:
        print("❌ PROBLEMA 2: No hay Skillsets")
        print("   → No hay chunking automático")
        print("   → No hay vectorización automática")
        print("   → Solución: Crear skillset con skills")

    if indexers_count == 0:
        print("❌ PROBLEMA 3: No hay Indexers")
        print("   → No hay orquestación automática")
        print("   → Debes indexar manualmente (push API)")
        print("   → Solución: Crear indexer")

    print("\n" + "="*63)
    print("\n✅ SOLUCIÓN: Ejecutar setup data-plane de Search\n")
    print("""
1) Deploy base con Bicep:
    az deployment group create \\
        --resource-group <RG> \\
        --template-file infra/main.bicep

2) Crear objetos Search (data plane):
    python indexar.py

Esto crea automáticamente:
    ✓ Data Source → Blob
    ✓ Indexer → Orquestación cada hora
    ✓ Index (si no existe)
""")

if __name__ == '__main__':
    diagnose()
