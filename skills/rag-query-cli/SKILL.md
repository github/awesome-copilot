# RAG Query CLI — search Interactiva de Documentos

**Consulta tu sistema RAG interactivamente desde línea de comandos.**

## Descripción General

CLI interactivo para buscar y consultar documentos indexados en tu sistema RAG usando Azure AI Search + Azure OpenAI.

## Características

- search híbrida (keyword + ranking semántico)
- Recuperación de documentos con seguimiento de fuentes
- Generación de respuestas con contexto
- Métricas de performance
- Manejo de caracteres especiales UTF-8 (compatible Windows)

## Requisitos

- Cuenta Azure OpenAI con modelo desplegado
- Instancia Azure AI Search con documentos indexados
- Archivo `.env` con credentials:
  - `AZURE_OPENAI_KEY`
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`
  - `AZURE_SEARCH_INDEX`
  - `AZURE_OPENAI_MODEL`

## Instalación

```bash
# Dependencias en ../.../requirements.txt
pip install -r .github/requirements.txt
```

## Uso

### Consulta Interactiva (Recomendado)

```bash
# Desde la raíz del proyecto
python .github/skills/rag-query-cli/consultar.py "Tu pregunta aquí"

# Ejemplo
python .github/skills/rag-query-cli/consultar.py "What is the user onboarding process?"
```

### Ejecución Directa

```python
from consultar import RAGExecutor

executor = RAGExecutor()
result = executor.execute("tu pregunta", verbose=True)

print(result['response'])
print("Fuentes:", result['sources'])
print("Métricas:", result['metrics'])
```

## Output

```
[QUERY] What is the user onboarding process?

[SEARCHING] Buscando documentos...
[OK] Encontrados 5 documentos relevantes

[GENERATING] Generando respuesta...
[OK] Respuesta generada

[RESPONSE]
Basado en la documentación, el proceso de onboarding de usuario implica...

[SOURCES]
   - knowledge/pdfs/Onboarding_Manual.pdf
   - knowledge/procedimientos/User_Setup.docx

[METRICS]
   Search: 234ms
   Inference: 1523ms
   Total: 1757ms
   Tokens: 412
```

## Opciones Avanzadas

### Top-K Personalizado

```bash
# Recuperar más contexto (por defecto es 5)
python .github/skills/rag-query-cli/consultar.py "pregunta" --top 10
```

### Modo Silencioso

```bash
# Solo output de la respuesta
python .github/skills/rag-query-cli/consultar.py "pregunta" --quiet
```
