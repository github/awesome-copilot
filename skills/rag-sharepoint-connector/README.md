# RAG SharePoint Connector

Integración híbrida-profesional de SharePoint para RAG.

## Archivos

- **sharepoint-auth.py**: Autenticación OAuth 2.0 (interactiva + service principal)
- **sharepoint-connector.py**: Lógica principal (modos profesional + local)
- **SKILL.md**: Documentación completa

## Inicio Rápido

```bash
# Modo profesional (indexer Azure Search)
python sharepoint-connector.py --mode professional --tenant-id X --client-id Y --sharepoint-url Z

# Modo local (descarga a knowledge/)
python sharepoint-connector.py --mode local --tenant-id X --client-id Y --sharepoint-url Z
```

## Requisitos

- Python 3.10+
- `pip install msal requests tqdm`
- App registration en Azure AD con permisos Sites.Read.All + Files.Read.All

## Ver También

- [SKILL.md](SKILL.md) — Documentación completa con setup detallado
