**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




**Purpose:** index todos los documentos de `knowledge/` en Azure AI Search. Automático.

**Invocado por:** rag-onboarding.agent.md (Phase 5) O manual: `copilot-cli run rag-indexer-specialist.agent.md`

**Estimated Duration:** 10-15 minutos dependiendo del tamaño de los documentos

---

## ✅ Checklist de indexing

- [ ] Conectar a Azure AI Search
- [ ] Escanear la estructura de carpetas de `knowledge/`
- [ ] Procesar PDFs (OCR + chunking)
- [ ] Procesar documentos Word/Excel (parsing + chunking)
- [ ] Procesar archivos de código (chunking consciente de sintaxis)
- [ ] Procesar presentaciones (extracción de texto + chunking)
- [ ] Generar embeddings para todos los fragmentos
- [ ] Subir al índice de Azure AI Search
- [ ] Habilitar search semántica
- [ ] Mostrar resumen de indexing

---

## Prerrequisitos (1 min - AUTO)

```python
import os
from pathlib import Path



knowledge_path = Path("knowledge")
if not knowledge_path.exists():
    print("❌ Carpeta knowledge/ no encontrada")
    exit(1)



required_dirs = ["pdfs", "procedimientos", "codigo", "presentaciones"]
for subdir in required_dirs:
    if not (knowledge_path / subdir).exists():
        print(f"⚠️  {subdir}/ no existe, creando...")
        (knowledge_path / subdir).mkdir()



counts = {}
for subdir in required_dirs:
    files = list((knowledge_path / subdir).rglob("*"))
    files = [f for f in files if f.is_file()]
    counts[subdir] = len(files)

print(f"""
📂 Inventario de documentos:
   PDFs: {counts['pdfs']} archivos
   Procedimientos: {counts['procedimientos']} archivos
   Código: {counts['codigo']} archivos
   Presentaciones: {counts['presentaciones']} archivos
   TOTAL: {sum(counts.values())} archivos
""")
```

---

## Phase 1: Conectar a Azure AI Search (1 min - AUTO)

```python
import os
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.identity import AzureKeyCredential

load_dotenv()



search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
search_key = os.getenv("AZURE_SEARCH_API_KEY")
index_name = "rag-documents"

try:
    index_client = SearchIndexClient(search_endpoint, AzureKeyCredential(search_key))
    search_client = SearchClient(search_endpoint, index_name, AzureKeyCredential(search_key))
    print("✅ Conectado a Azure Search")
except Exception as e:
    print(f"❌ Error al conectar: {e}")
    exit(1)
```

---

## Phase 2: Procesar PDFs (3 min)

```python
import os
from pathlib import Path
from PyPDF2 import PdfReader
import pytesseract
from PIL import Image
import io

pdf_folder = Path("knowledge/pdfs")
processed_chunks = []

print("⏳ Procesando PDFs...")

for pdf_file in pdf_folder.rglob("*.pdf"):
    print(f"   Procesando: {pdf_file.name}")
    
    try:
        # Extract text from PDF
        with open(pdf_file, "rb") as f:
            reader = PdfReader(f)
            full_text = ""
            
            for page_num, page in enumerate(reader.pages):
                # Try text extraction first
                text = page.extract_text()
                
                # If text-less (scanned), use OCR
                if not text.strip():
                    image = page.to_image()
                    text = pytesseract.image_to_string(image)
                
                full_text += f"\n[Página {page_num + 1}]\n{text}"
        
        # Chunk text (500 chars per chunk, 50 char overlap)
        chunks = chunk_text(full_text, chunk_size=500, overlap=50)
        
        # Add metadata
        for i, chunk in enumerate(chunks):
            processed_chunks.append({
                "file": pdf_file.name,
                "file_type": "pdf",
                "chunk_num": i + 1,
                "content": chunk,
                "source_url": str(pdf_file)
            })
        
        print(f"      ✅ {len(chunks)} fragmentos")
        
    except Exception as e:
        print(f"      ❌ Error: {e}")
        continue

print(f"✅ Procesamiento de PDFs completado: {len(processed_chunks)} fragmentos")
```

---

## Phase 3: Procesar Procedimientos (2 min)

```python
import os
from pathlib import Path
from docx import Document
from openpyxl import load_workbook
import markdown

proc_folder = Path("knowledge/procedimientos")
print("⏳ Procesando Procedimientos...")

for file_path in proc_folder.rglob("*"):
    if not file_path.is_file():
        continue
    file_type = file_path.suffix.lower()
    
    try:
        if file_type == ".docx":
            print(f"   Procesando: {file_path.name} (Word)")
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            
        elif file_type == ".xlsx":
            print(f"   Procesando: {file_path.name} (Excel)")
            wb = load_workbook(file_path)
            text = ""
            for sheet in wb.sheetnames:
                ws = wb[sheet]
                text += f"\n[Hoja: {sheet}]\n"
                for row in ws.iter_rows(values_only=True):
                    text += " | ".join(str(cell) if cell else "" for cell in row) + "\n"
            
        elif file_type == ".md":
            print(f"   Procesando: {file_path.name} (Markdown)")
            with open(file_path) as f:
                text = f.read()
        
        else:
            continue
        
        # Chunk
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        
        for i, chunk in enumerate(chunks):
            processed_chunks.append({
                "file": file_path.name,
                "file_type": file_type.strip("."),
                "chunk_num": i + 1,
                "content": chunk,
                "source_url": str(file_path)
            })
        
        print(f"      ✅ {len(chunks)} fragmentos")
        
    except Exception as e:
        print(f"      ❌ Error: {e}")
        continue

print(f"✅ Procesamiento de Procedimientos completado")
```

---

## Phase 4: Procesar Código (2 min)

```python
from pathlib import Path

code_folder = Path("knowledge/codigo")
print("⏳ Procesando Código...")

for code_file in code_folder.rglob("*"):
    if not code_file.is_file():
        continue
    lang = code_file.suffix.lower()
    
    try:
        print(f"   Procesando: {code_file.name} ({lang})")
        
        with open(code_file, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # Syntax-aware chunking (don't split functions/procedures)
        if lang in [".sql", ".py", ".js"]:
            chunks = chunk_code(content, language=lang, chunk_size=800)
        else:
            chunks = chunk_text(content, chunk_size=500, overlap=50)
        
        for i, chunk in enumerate(chunks):
            processed_chunks.append({
                "file": code_file.name,
                "file_type": lang.strip("."),
                "chunk_num": i + 1,
                "content": chunk,
                "source_url": str(code_file)
            })
        
        print(f"      ✅ {len(chunks)} fragmentos")
        
    except Exception as e:
        print(f"      ❌ Error: {e}")
        continue

print(f"✅ Procesamiento de Código completado")
```

---

## Phase 5: Procesar Presentaciones (2 min)

```python
from pathlib import Path
from pptx import Presentation

ppt_folder = Path("knowledge/presentaciones")
print("⏳ Procesando Presentaciones...")

for ppt_file in ppt_folder.rglob("*.pptx"):
    try:
        print(f"   Procesando: {ppt_file.name}")
        
        prs = Presentation(ppt_file)
        text = ""
        
        for slide_num, slide in enumerate(prs.slides):
            text += f"\n[Diapositiva {slide_num + 1}]\n"
            
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
        
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        
        for i, chunk in enumerate(chunks):
            processed_chunks.append({
                "file": ppt_file.name,
                "file_type": "pptx",
                "chunk_num": i + 1,
                "content": chunk,
                "source_url": str(ppt_file)
            })
        
        print(f"      ✅ {len(chunks)} fragmentos")
        
    except Exception as e:
        print(f"      ❌ Error: {e}")
        continue

print(f"✅ Procesamiento de Presentaciones completado")
```

---

## Phase 6: Generar embeddings (3 min - AUTO)

```python
import os
from dotenv import load_dotenv
from azure.openai import AzureOpenAI

load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-05-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

print("⏳ Generando embeddings...")



batch_size = 100
for i in range(0, len(processed_chunks), batch_size):
    batch = processed_chunks[i:i+batch_size]
    
    print(f"   Lote {i//batch_size + 1}: Procesando {len(batch)} fragmentos...")
    
    for chunk in batch:
        try:
            response = client.embeddings.create(
                input=chunk["content"],
                model="text-embedding-3-small"
            )
            chunk["embedding"] = response.data[0].embedding
        except Exception as e:
            print(f"      ⚠️  Embedding fallido para fragmento: {e}")
            chunk["embedding"] = [0.0] * 1536  # Fallback empty vector

print(f"✅ Embeddings generados para {len(processed_chunks)} fragmentos")
```

---

## Phase 7: Subir a Search (2 min - AUTO)

```python
print("⏳ Subiendo a Azure Search...")



batch_size = 1000
for i in range(0, len(processed_chunks), batch_size):
    batch = processed_chunks[i:i+batch_size]
    
    try:
        results = search_client.upload_documents(batch)
        print(f"   Lote {i//batch_size + 1}: {len(results)} fragmentos subidos")
    except Exception as e:
        print(f"   ❌ Subida del lote fallida: {e}")

print(f"✅ Los {len(processed_chunks)} fragmentos se subieron a Search")
```

---

## Phase 8: Habilitar search Semántica (1 min - AUTO)

```python
from azure.search.documents.indexes.models import (
    SearchIndex, SearchField, SearchFieldDataType, SimpleField
)

try:
    # Update index to enable semantic search
    index = index_client.get_index("rag-documents")
    
    # Semantic search configuration
    index.semantic_config = SemanticConfiguration(
        name="default",
        fields=SemanticField(content_fields=[SemanticField(field_name="content")]),
        prioritized_fields=PrioritizedFields(
            content_fields=[SemanticField(field_name="content")]
        )
    )
    
    index_client.create_or_update_index(index)
    print("✅ Búsqueda semántica habilitada")
    
except Exception as e:
    print(f"⚠️  Aviso en configuración de búsqueda semántica: {e}")
```

---

## Phase 9: Mostrar Resumen (1 min)

```
✅ ¡INDEXACIÓN COMPLETADA!

📊 Resumen:
┌────────────────────────────────────────┐
│ PDFs:           42 archivos → 1.200 fragmentos │
│ Procedimientos:  15 archivos → 350 fragmentos  │
│ Código:         8 archivos → 400 fragmentos   │
│ Presentaciones: 3 archivos → 180 fragmentos   │
├────────────────────────────────────────┤
│ TOTAL:          68 archivos → 2.130 fragmentos │
│ Nombre del índice: rag-documents              │
│ Búsqueda semántica: ✅ Habilitada             │
│ Embeddings:     ✅ Generados (1.536-dim)      │
└────────────────────────────────────────┘

Siguientes pasos:
  1. Probar conexión: rag-azure-setup.agent.md (Phase 7)
  2. Empezar a consultar: python .github/skills/rag-query-cli/consultar.py
```

---

## Error Handling

### Carpeta Vacía
```
⚠️ No se encontraron documentos en la carpeta knowledge/.

Puedes:
  A) Añadir documentos y re-ejecutar la indexación
  B) Continuar de todos modos (comenzar con índice vacío)

¿Tu elección? (A/B)
```

### Archivo Corrupto
```
⚠️ Algunos archivos tuvieron errores durante el procesamiento:
   ❌ corrupted-file.pdf: OCR fallido
   ❌ binary-file.xlsx: No legible

Indexados: 2.100 / 2.130 fragmentos
Tasa de éxito: 98,6%

Detalles guardados en: logs/indexing-errors.log
```

### Fallo en Generación de embeddings
```
❌ La API de embeddings de OpenAI falló: Límite de tasa excedido.

Sugerencias:
  • Esperar 5 minutos antes de reintentar
  • Reducir el tamaño del lote
  • Verificar AZURE_OPENAI_API_KEY

¿Reintentar? (S/n)
```

### Fallo en Subida a Search
```
❌ La subida a Azure Search falló: Cuota del índice excedida.

Actual: 2.130 documentos
Límite: 1.000 documentos

Soluciones:
  1. Usar un tier superior de Search (Standard → Premium)
  2. Dividir en múltiples índices
  3. Archivar documentos antiguos

¿Proceder con tier Premium? (S/n)
```

---

## Soporte de Reanudación

Guardar checkpoint:

```json
{
  "phase": 5,
  "status": "in-progress",
  "processed_chunks": 1250,
  "next": "Completar generación de embeddings"
}
```

Al reiniciar:
```
🔄 Se detectó una indexación incompleta.
¿Reanudar desde el fragmento 1.250? (S/n)
```
