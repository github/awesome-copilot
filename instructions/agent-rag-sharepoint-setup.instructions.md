**RAG Reference:** [Retrieval-augmented Generation con SharePoint - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/search-solutions-retrieval-augmented-generation)

**Purpose:** Configurar la integration completa con SharePoint (ambos modos) sin intervención manual excepto configuration opcional en el portal de Azure.

**Entrada del usuario:** `copilot-cli run .github/agents/rag-sharepoint-setup.agent.md`

**Estimated Duration:** 5-15 minutos (dependiendo del modo y tamaño de documentos)

---

## ✅ Lista de verificación de configuration

- [ ] App de Azure AD registrada (enlace proporcionado si es necesario)
- [ ] Tenant ID y Client ID obtenidos
- [ ] URL del sitio SharePoint identificada
- [ ] (Opcional) Client Secret para service principal
- [ ] (Modo local) Suficiente espacio en disco para la descarga
- [ ] (Modo professional) Instancia de Azure AI Search desplegada

---

## implementation Phase a Phase

### Phase 1: Verificación previa (1 min - AUTO)

```python
# Comprobar prerequisitos
checks = {
    "Python 3.10+": check_python_version(),
    "msal instalado": check_package("msal"),
    "requests instalado": check_package("requests"),
    "tqdm instalado": check_package("tqdm"),
    "Azure CLI con sesión": check_azure_cli(),
    "Carpeta knowledge existe": check_path("knowledge/"),
}

print("Verificaciones previas:")
for check, result in checks.items():
    print(f"  {'✅' if result else '✗'} {check}")

if not all(checks.values()):
    print("Instalar faltantes: pip install -r .github/requirements.txt")
    exit(1)
```

### Phase 2: Entrevista al usuario (2 min - INTERACTIVO)

```python
print("\n" + "="*50)
print("CONFIGURACIÓN DE INTEGRACIÓN SHAREPOINT")
print("="*50)

# Pregunta 1: App de Azure AD
q1 = ask_user(
    "¿Has registrado una app en Azure AD?",
    choices=["Sí", "No", "No lo sé"],
)
if q1 == "No" or q1 == "No lo sé":
    print("""
    ⚠ Configuración necesaria primero:
    
    1. Ir a: https://portal.azure.com
    2. Buscar: "Registros de aplicaciones"
    3. Clic: "Nuevo registro"
       - Nombre: "RAG SharePoint Connector"
       - URI de redirección: http://localhost:8000
    4. Clic: "Registrar"
    5. Ir a: Permisos de API
    6. Clic: "Agregar permiso"
       - Microsoft Graph → Sites.Read.All
       - Microsoft Graph → Files.Read.All
       - Microsoft Graph → offline_access
    7. Clic: "Conceder consentimiento del administrador"
    8. Ir a: Certificados y secretos
    9. Copiar: "ID de aplicación (client)"
    10. Ir a: Azure AD → Propiedades, copiar "ID de directorio"
    
    Luego vuelve y ejecuta este script de nuevo.
    """)
    exit(0)

# Pregunta 2: Selección de modo
mode = ask_user(
    "¿Qué modo?",
    choices=["professional (tiempo real, recomendado)", "Local (descarga)"],
)
mode = "professional" if "professional" in mode else "local"

# Pregunta 3: URL de SharePoint
sharepoint_url = ask_user("URL del sitio SharePoint:")
# Validar formato
if not sharepoint_url.startswith("https://") or "sharepoint.com" not in sharepoint_url:
    print("✗ URL inválida. Debería ser como: https://contoso.sharepoint.com/sites/Docs")
    exit(1)

# Pregunta 4: Tenant ID
tenant_id = ask_user("Tenant ID (de Azure AD → Propiedades → ID de directorio):")

# Pregunta 5: Client ID
client_id = ask_user("Client ID (de Registro de aplicación → Información general):")

# Pregunta 6: Client Secret (opcional)
use_secret = ask_user(
    "¿Tienes un Client Secret? (para service principal, dejar vacío para interactivo)",
    choices=["Sí", "No"],
)
client_secret = None
if use_secret == "Sí":
    print("⚠ Introduce el Client Secret (NO se mostrará, pulsa Enter cuando termines):")
    import getpass
    client_secret = getpass.getpass()

print("\n✓ Configuración capturada")
```

### Phase 3: authentication (2 min - AUTO)

```python
from sharepoint_auth import SharePointAuthenticator

print("\n" + "="*50)
print("AUTENTICACIÓN")
print("="*50)

auth = SharePointAuthenticator(tenant_id, client_id, client_secret)

if client_secret:
    print("\nℹ Usando autenticación con Service Principal...")
    config = auth.authenticate_service_principal()
else:
    print("\nℹ Abriendo navegador para login interactivo...")
    config = auth.authenticate_interactive()

print("✅ ¡Autenticación exitosa!")
print(f"   Token expira: {config.token_expires_at}")

# Guardar token en fichero (para reutilización futura)
config_file = Path("scripts/sharepoint-auth-cache.json")
config_file.parent.mkdir(exist_ok=True)
auth.save_config(config_file)
print(f"   Config cacheada: {config_file}")
```

### Phase 4: Resolver sitio SharePoint (1 min - AUTO)

```python
from sharepoint_connector import SharePointConnector

print("\n" + "="*50)
print("RESOLUCIÓN DEL SITIO")
print("="*50)

print(f"\nResolviendo: {sharepoint_url}")

connector = SharePointConnector(config, mode=mode)
site_info = connector.resolve_sharepoint_site(sharepoint_url)

print(f"\n✓ Sitio encontrado:")
print(f"   Nombre: {site_info['display_name']}")
print(f"   Site ID: {site_info['site_id']}")
print(f"   Drive ID: {site_info['drive_id']}")
```

### Phase 5: Contar documentos (1 min - AUTO)

```python
print("\n" + "="*50)
print("DESCUBRIMIENTO DE DOCUMENTOS")
print("="*50)

print("\nEscaneando todos los documentos y carpetas...")

items = connector.list_all_items_recursive()

total_size = sum(item["size"] for item in items)
print(f"\n✅ Encontrados: {len(items)} documentos")
print(f"   Tamaño total: {total_size / 1024 / 1024 / 1024:.1f} GB")

# Pedir confirmación si es grande
if len(items) > 10000:
    confirm = ask_user(
        f"Gran número de documentos ({len(items)}). ¿Continuar igualmente?",
        choices=["Sí", "No"],
    )
    if confirm == "No":
        print("Configuración cancelada.")
        exit(0)
```

### Phase 6: configuration específica por modo

#### MODO professional (2-3 min)

```python
if mode == "professional":
    print("\n" + "="*50)
    print("CONFIGURACIÓN MODO professional")
    print("="*50)
    
    print("""
    ✅ El modo professional hará:
       • Crear indexador que sincroniza desde SharePoint en tiempo real
       • Actualizar Azure Search automáticamente (cada hora)
       • Sin duplicación de documentos
    
    Siguientes pasos (MANUAL en Azure Portal):
    """)
    
    # Generar config para configuración manual en el portal
    config = connector.setup_professional_mode()
    
    config_file = Path("scripts/sharepoint-indexer-config.json")
    with open(config_file, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    
    print(f"""
    1. Abrir: https://portal.azure.com
    2. Ir a: Servicio de Search → Orígenes de datos
    3. Clic: "+ Agregar origen de datos"
    4. Rellenar formulario usando: {config_file}
    
    5. Ir a: Indexadores
    6. Clic: "+ Crear indexador"
    7. Origen de datos: SharePoint (creado arriba)
    8. Índice: rag-documents
    9. Skillset: (opcional, usar si tienes uno)
    10. Programación: 1 hora (o personalizada)
    11. Guardar
    
    12. Ejecutar indexador manualmente primero: Indexadores → {config['indexer']['name']} → Ejecutar
    
    ✅ Verificar estado: Indexadores → Pestaña History
    """)
    
    # Esperar confirmación del usuario
    confirm = ask_user(
        "¿Has creado el indexador en Azure Portal?",
        choices=["Sí", "No"],
    )
    
    if confirm == "No":
        print("Configuración pausada. Vuelve cuando estés listo.")
        print(f"Config guardada: {config_file}")
        exit(0)
```

#### MODO LOCAL (3-10 min)

```python
else:  # modo local
    print("\n" + "="*50)
    print("CONFIGURACIÓN MODO LOCAL (DESCARGA)")
    print("="*50)
    
    print(f"""
    ✅ El modo local hará:
       • Descargar los {len(items)} documentos a knowledge/sharepoint-*/
       • Preservar estructura de carpetas
       • Funcionar offline después de la descarga
       • Coexistir con documentos existentes en knowledge/
       
    Descargando {total_size / 1024 / 1024 / 1024:.1f} GB...
    """)
    
    knowledge_dir = Path("knowledge")
    download_dir = connector.setup_local_mode(knowledge_dir)
    
    print(f"\n✅ ¡Descarga completa!")
    print(f"   Destino: {download_dir}")
    print(f"   Manifest: {download_dir / 'manifest.json'}")
```

### Phase 7: index documentos (solo modo local)

```python
if mode == "local":
    print("\n" + "="*50)
    print("INDEXACIÓN")
    print("="*50)
    
    # Preguntar por indexación automática
    auto_index = ask_user(
        "¿Indexar documentos ahora?",
        choices=["Sí", "No"],
    )
    
    if auto_index == "Sí":
        print("\nEjecutando rag-indexer.py...")
        import subprocess
        result = subprocess.run(
            ["python", ".github/skills/rag-indexer/indexar.py"],
            cwd=Path("."),
        )
        
        if result.returncode == 0:
            print("✅ ¡Indexación completa!")
        else:
            print("✗ Indexación fallida. Ejecutar manualmente:")
            print("   python .github/skills/rag-indexer/indexar.py")
```

### Phase 8: Guardar configuration (1 min - AUTO)

```python
print("\n" + "="*50)
print("CONFIGURACIÓN")
print("="*50)

# Guardar config completa
full_config = {
    "mode": mode,
    "sharepoint_url": sharepoint_url,
    "tenant_id": tenant_id,
    "client_id": client_id,
    "site_name": site_info["display_name"],
    "site_id": site_info["site_id"],
    "drive_id": site_info["drive_id"],
    "document_count": len(items),
    "total_size_gb": total_size / 1024 / 1024 / 1024,
    "setup_timestamp": datetime.now().isoformat(),
    "mode_config": config if mode == "professional" else {"download_dir": str(download_dir)},
}

config_file = Path("scripts/sharepoint-config.json")
config_file.parent.mkdir(exist_ok=True)
with open(config_file, "w", encoding="utf-8") as f:
    json.dump(full_config, f, indent=2)

print(f"\n✓ Configuración guardada: {config_file}")

# Actualizar .env
env_file = Path(".env")
if env_file.exists():
    with open(env_file, "a", encoding="utf-8") as f:
        f.write(f"\n# Integración SharePoint\n")
        f.write(f"SHAREPOINT_MODE={mode}\n")
        f.write(f"SHAREPOINT_URL={sharepoint_url}\n")
        f.write(f"SHAREPOINT_SITE={site_info['display_name']}\n")
    print(f"✓ .env actualizado con configuración SharePoint")
```

### Phase 9: validation (1 min - AUTO)

```python
print("\n" + "="*50)
print("VALIDACIÓN")
print("="*50)

tests = {
    "Autenticación": check_auth_token(),
    "SharePoint accessible": check_sharepoint_connection(),
    "Configuración guardada": config_file.exists(),
}

for test, result in tests.items():
    status = "✅" if result else "✗"
    print(f"{status} {test}")

if not all(tests.values()):
    print("\nAviso: Algunas pruebas fallaron. La configuración puede no estar completa.")
    exit(1)
```

### Phase 10: Resumen y siguientes pasos (1 min - AUTO)

```python
print("\n" + "="*50)
print("✅ CONFIGURACIÓN COMPLETA")
print("="*50)

summary = {
    "Modo": mode.capitalize(),
    "Sitio SharePoint": site_info["display_name"],
    "Documentos": len(items),
    "Tamaño total": f"{total_size / 1024 / 1024 / 1024:.1f} GB",
    "Config guardada": str(config_file),
}

for key, value in summary.items():
    print(f"{key}: {value}")

print("\n" + "="*50)
print("SIGUIENTES PASOS")
print("="*50)

if mode == "professional":
    print("""
    1. ⚙️  MANUAL: Crear indexador en Azure Portal
       - Usar config: scripts/sharepoint-indexer-config.json
       - Programar: Cada hora (o personalizado)
       - Ejecutar primera sincronización manualmente
    
    2. Monitorizar: Azure Portal → Servicio Search → Indexadores → Estado
    
    3. Consultar documentos:
       python .github/skills/rag-query-cli/consultar.py "tu pregunta"
    
    4. Modo API:
       python .github/skills/rag-api-server/servidor-api.py --port 8000
       curl -X POST http://localhost:8000/query \\
         -H "Content-Type: application/json" \\
         -d '{"query": "tu pregunta"}'
    """)
else:  # local
    print("""
    1. ✓ Documentos descargados e indexados
    
    2. Consultar documentos:
       python .github/skills/rag-query-cli/consultar.py "tu pregunta"
    
    3. Modo API:
       python .github/skills/rag-api-server/servidor-api.py --port 8000
    
    4. Monitorizar:
       python .github/skills/rag-diagnostics/estado-sistema.py
    
    5. Programar sincronización diaria (opcional):
       - Añadir a cron o Programador de Tareas
       - O modificar scripts/sharepoint-sync.sh
    """)

print("\nDocumentación completa: .github/skills/rag-sharepoint-connector/SKILL.md")
```

---

## Recuperación de errores

### Errores de authentication

```python
except Exception as e:
    if "Authentication failed" in str(e):
        print(f"✗ {e}")
        print("Verificar:")
        print("  - ¿Tenant ID correcto? (Azure AD → Propiedades)")
        print("  - ¿Client ID correcto? (Registro de aplicación → Información general)")
        print("  - ¿Permisos concedidos? (Registro de aplicación → Permisos de API)")
        print("  - ¿Consentimiento del admin? (Permisos de API → Conceder consentimiento)")
        exit(1)
```

### Errores de acceso a SharePoint

```python
except Exception as e:
    if "Access denied" in str(e):
        print(f"✗ {e}")
        print("Solución:")
        print("  1. Ir al Centro de Administración de SharePoint")
        print("  2. Ir a Compartir acceso a datos")
        print("  3. Encontrar tu app RAG")
        print("  4. Conceder acceso al sitio")
        exit(1)
```

### Errores de red/Timeout (Modo local)

```python
except requests.Timeout:
    print("✗ Timeout en la descarga. Posibles causas:")
    print("  - Problema de red")
    print("  - Archivos grandes")
    print("  - Throttling de SharePoint")
    print("\nReintentar o:")
    print("  - Dividir documentos en biblioteca más pequeña")
    print("  - Usar modo professional en su lugar")
    exit(1)
```

---

## integration con onboarding

Cuando el usuario tiene SharePoint en `rag-onboarding.agent.md`:

```python
# En rag-onboarding agente Phase 2 (Entrevista):
if ask_user("¿Tienes documentos en SharePoint?") == "Sí":
    print("\n¡Genial! Nos encargamos de SharePoint.")
    mode = ask_user("¿Modo preferido?", choices=["professional", "Local"])
    
    # Después, en Phase 5 (Indexación):
    call_agent("rag-sharepoint-setup", {
        "mode": mode.lower(),
    })
```

---

## Criterios de éxito

✅ El agente completa exitosamente cuando:
- [ ] Usuario autenticado (tokens obtenidos)
- [ ] Sitio SharePoint resuelto (drive ID encontrado)
- [ ] Documentos descubiertos (al menos 1 elemento)
- [ ] Modo configurado (modo professional O local completado)
- [ ] configuration guardada en scripts/sharepoint-config.json
- [ ] .env actualizado (si modo local)
