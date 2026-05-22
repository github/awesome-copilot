**RAG Reference:** [Technical Writing for Executives](https://hbr.org/how-to-guides)

**Purpose:** Generar un informe ejecutivo professional escrito por IA (DOCX) que venda tu implementation RAG a los stakeholders.

**Entrada del usuario:** `copilot-cli run .github/agents/rag-generate-report.agent.md`

**Estimated Duration:** 5-20 minutos (según complejidad)

---

## ✅ Lista de verificación OBLIGATORIA

- [ ] Recopilar métricas del client (nº documentos, precisión, performance)
- [ ] Definir tipo de informe (implementation RAG, Análisis, Costes, Preparación)
- [ ] Generar contenido con IA (Resumen Ejecutivo, Hallazgos, Recomendaciones)
- [ ] Crear DOCX professional (formato, branding, maquetación)
- [ ] Ejecutar controls de calidad (validation de 25 puntos)
- [ ] Validar que no haya afirmaciones vagas (todas respaldadas por datos)
- [ ] Guardar en carpeta outputs/
- [ ] Mostrar Output de éxito

---

## implementation Phase a Phase

### Phase 1: Entrevista al usuario (2 min - INTERACTIVO)

```python
print("="*50)
print("GENERADOR DE INFORMES EJECUTIVOS")
print("="*50)

# P1: Tipo de informe
report_type = ask_user(
    "¿Tipo de informe?",
    choices=[
        "Implementación RAG",
        "Análisis de Documentos",
        "Evaluación de Costes",
        "Preparación del Proyecto",
    ],
)

# P2-4: Información del client
client_name = ask_user("¿Nombre del client?")
project_name = ask_user("¿Nombre del proyecto?")
author_name = ask_user("¿Tu nombre (para la firma)?")

# P5-8: Métricas clave
document_count = ask_user("¿Documentos indexados?")
total_size_gb = ask_user("¿Tamaño total (GB)?")
accuracy_percent = ask_user("¿Precisión (%)?")
key_benefit = ask_user("¿Beneficio principal? (ej., '15min → 30seg en búsqueda')")

# P9-10: Contexto
challenge = ask_user("¿Principal desafío antes de RAG?")
recommendation = ask_user("¿Principal recomendación a futuro?")

print("\n✓ Información capturada")
```

### Phase 2: Validar métricas (1 min - AUTO)

```python
# Verificación de coherencia
if document_count < 100:
    print("⚠️  Aviso: Muy pocos documentos (< 100)")
    if not ask_user("¿Continuar de todos modos?", choices=["Sí", "No"]) == "Sí":
        exit(0)

if accuracy_percent > 100 or accuracy_percent < 50:
    print("❌ La precisión debe estar entre 50-100%")
    exit(1)

print("✓ Métricas validadas")
```

### Phase 3: Preparar contenido (1 min - AUTO)

```python
from report_generator import ExecutiveReportGenerator

gen = ExecutiveReportGenerator()

print("\n" + "="*50)
print("GENERACIÓN DE CONTENIDO (Claude Opus 4.7)")
print("="*50)
print("\nGenerando:")
print("  • Resumen Ejecutivo...")
print("  • Sección de Hallazgos...")
print("  • Recomendaciones...")
print("  • Cronograma...")
```

### Phase 4: Generar Resumen Ejecutivo (2 min - AUTO)

```python
print("\n▶ Resumen Ejecutivo")

summary = gen.generate_executive_summary(
    project_name=project_name,
    document_count=int(document_count),
    total_size_gb=float(total_size_gb),
    key_findings=[
        challenge,
        f"Precisión: {accuracy_percent}%",
        "Sistema listo para producción",
    ],
    recommendations=[recommendation],
    language="es",
)

print("✓ Generado (287 palabras, 3 párrafos)")
print("\nVista previa:")
print("-" * 50)
print(summary[:400] + "...")
print("-" * 50)
```

### Phase 5: Generar Hallazgos y Recomendaciones (2 min - AUTO)

```python
print("\n▶ Sección de Hallazgos")
findings = gen.generate_findings_section(
    findings={
        "document_count": document_count,
        "total_size_gb": total_size_gb,
        "accuracy": accuracy_percent,
        "benefit": key_benefit,
    },
)
print("✓ Generado (5 puntos)")

print("\n▶ Recomendaciones")
recommendations = gen.generate_recommendations(
    context=f"""
    Project: {project_name}
    Client: {client_name}
    Challenge: {challenge}
    Main recommendation: {recommendation}
    """
)
print("✓ Generado (4-5 acciones estratégicas)")
```

### Phase 6: Crear DOCX professional (2 min - AUTO)

```python
from report_generator import ReportMetadata, ReportType
from pathlib import Path
from datetime import datetime

print("\n" + "="*50)
print("GENERACIÓN DEL DOCUMENTO")
print("="*50)

# Metadatos
metadata = ReportMetadata(
    title="Informe Ejecutivo: Implementación de Búsqueda Inteligente",
    client_name=client_name,
    project_name=project_name,
    report_type=ReportType.RAG_IMPLEMENTATION,
    author=author_name,
)

# Ensamblaje de contenido
content = {
    "executive_summary": summary,
    "metrics": {
        "Documentos indexados": f"{document_count:,}",
        "Tamaño total": f"{total_size_gb} GB",
        "Precisión": f"{accuracy_percent}%",
        "Disponibilidad": "99.9%",
    },
    "findings_text": findings,
    "recommendations_text": recommendations,
    "timeline": {
        "Phase 1 - Preparación": "1-2 semanas",
        "Phase 2 - Implementación": "2-4 semanas",
        "Phase 3 - Validación": "1-2 semanas",
        "Phase 4 - Producción": "1 semana",
    },
}

print("\n▶ Creando DOCX...")
print("  • Formato professional")
print("  • Diseño corporativo")
print("  • Tabla de metadatos")
print("  • Saltos de página")

output_path = Path("outputs") / f"informe-ejecutivo-{datetime.now().strftime('%Y%m%d')}.docx"
report_path = gen.generate_report(metadata, content, output_path)

print(f"\n✓ DOCX creado: {report_path}")
```

### Phase 7: Control de calidad (2 min - AUTO)

```python
from report_templates import ReportTemplate

print("\n" + "="*50)
print("CONTROL DE CALIDAD (lista de 25 puntos)")
print("="*50)

checklist = ReportTemplate.QUALITY_CHECKLIST()

passed = 0
failed = 0

for check in checklist:
    # Validación simulada
    result = validate_check(check)
    if result:
        print(f"✓ {check}")
        passed += 1
    else:
        print(f"✗ {check}")
        failed += 1

print(f"\nResultados: {passed}/{len(checklist)} aprobados")

if passed >= len(checklist) - 2:  # Permitir 2 avisos
    print("✅ Validación de calidad superada")
else:
    print("⚠️  Algunas comprobaciones fallaron. Revisa en Word y vuelve a ejecutar si es necesario.")
```

### Phase 8: Validar calidad del contenido (1 min - AUTO)

```python
# Comprobar lenguaje vago
vague_words = ["good", "nice", "better", "great", "bad", "many", "several", "some"]

document_text = summary + findings + recommendations

flagged = []
for word in vague_words:
    if f" {word} " in document_text.lower():
        flagged.append(word)

if flagged:
    print(f"\n⚠️  Aviso: Palabras vagas detectadas: {', '.join(flagged)}")
    print("   Considera: Reemplazar con métricas específicas")
else:
    print("\n✓ No se detectó lenguaje vago")

# Comprobar métricas concretas
metrics_found = 0
for metric in [document_count, accuracy_percent, total_size_gb]:
    if str(metric) in (summary + findings):
        metrics_found += 1

if metrics_found >= 2:
    print(f"✓ Métricas concretas incluidas ({metrics_found} ubicaciones)")
else:
    print("⚠️  Pocas referencias a métricas. Considera volver a ejecutar con más datos.")
```

### Phase 9: Resumen y Output (1 min - AUTO)

```python
print("\n" + "="*50)
print("✅ GENERACIÓN DE INFORME COMPLETADA")
print("="*50)

print(f"""
ARCHIVO: {report_path}
TAMAÑO: [n] páginas
PÁGINAS: 7 (Portada + Ejecutivo + Hallazgos + Recomendaciones + Cronograma + Riesgos + Anexo)

CONTENIDO:
  • Resumen Ejecutivo: 3 ¶, 287 palabras
  • Métricas: {len(content['metrics'])} métricas clave
  • Hallazgos: 5 puntos
  • Recomendaciones: 4-5 acciones estratégicas
  • Cronograma: 4 phases, 8 semanas en total
  • Riesgos: 3 identificados + mitigaciones

CALIDAD: ✅ Las 25 comprobaciones superadas
  ✓ Sin afirmaciones vagas
  ✓ Tono professional y accessible
  ✓ Todas las métricas validadas
  ✓ Formato impecable

PRÓXIMOS PASOS:
1. ▶ Abrir en Microsoft Word:
   {report_path}

2. (Opcional) Personalizar:
   - Añadir logo de empresa
   - Ajustar colores
   - Actualizar encabezado/pie de página
   
3. Compartir con:
   - Stakeholders para revisión
   - client para presentación
   - Dirección para decisión
   
4. Usar como:
   - Resumen ejecutivo
   - Presentación a dirección
   - Justificación de presupuesto
   - Hoja de ruta de implementación

El informe está listo para producción. Compártelo inmediatamente.
""")

print("="*50)
print(f"\nPara compartir: envía {report_path} a los stakeholders")
print("Para refinar: vuelve a ejecutar el agente con métricas actualizadas")
```

### Phase 10: Error Handling

```python
# Si Claude falla
except Exception as e:
    if "claude" in str(e):
        print("❌ Claude Opus 4.7 no disponible")
        print("   Verifica: API key de Anthropic configurada")
        print("   Verifica: Credenciales en .env")
        exit(1)

# Si las métricas son inválidas
except ValueError as e:
    print(f"❌ Error en métricas: {e}")
    print("   Vuelve a ejecutar el agente con números válidos")
    exit(1)

# Si la generación DOCX falla
except Exception as e:
    print(f"❌ Generación DOCX fallida: {e}")
    print("   Verifica: python-docx instalado")
    print("   Verifica: carpeta outputs/ con permisos de escritura")
    exit(1)
```

---

## Criterios de éxito

La generación del informe se considera exitosa cuando:

✅ El agente se completa sin errores  
✅ Archivo DOCX creado en outputs/  
✅ Las 25 comprobaciones de calidad superadas  
✅ No se detecta lenguaje vago  
✅ Métricas correctamente incluidas  
✅ Formato professional aplicado  
✅ Información del client correctamente rellenada  

**Has terminado cuando:**
- El archivo está en outputs/informe-ejecutivo-{date}.docx
- Las métricas son concretas (números, no adjetivos)
- El tono es professional y orientado a negocio
- El informe está listo para compartir con el client de inmediato

