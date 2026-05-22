# RAG Cost Scaler - Guía Rápida

Herramienta para escalar fácilmente entre configuraciones de Azure RAG con cálculo automático de costos.

## Instalación

```bash
cd .github/skills/rag-cost-scaler/
chmod +x cost-scaler.py
```

## Uso Rápido

### 1. Ver opciones disponibles
```bash
python cost-scaler.py --list-options
```

### 2. Simulate change to Minimal (maximum savings)
```bash
python cost-scaler.py --tier minimal --dry-run
```

### 3. Aplicar cambio a Minimal
```bash
python cost-scaler.py --tier minimal --apply
```

### 4. Cambiar a Standard (producción)
```bash
python cost-scaler.py --tier standard --apply
```

### 5. Ver configuración actual
```bash
python cost-scaler.py --current
```

### 6. Crear/actualizar alertas de presupuesto
```bash
python cost-scaler.py --budget 50 --create-alerts
```

## Tiers Disponibles

| Tier | Costo | Uso |
|------|-------|-----|
| **minimal** | €22-28/mes | Dev, testing, MVP |
| **standard** | €55-65/mes | Producción balance |
| **premium** | €150-200/mes | Máxima escala, DR |

## Parámetros

```
--tier {minimal|standard|premium}    Cambiar a este tier
--apply                              Aplicar cambios reales
--dry-run                            Simulate only
--budget EUR                         Presupuesto en EUR
--create-alerts                      Crear alertas
--list-options                       Ver tiers disponibles
--current                            Ver config actual
--rg NAME                            Resource group (default: rag-defensa-rg)
```

## Ejemplos Avanzados

```bash
# Escalar de minimal a premium
python cost-scaler.py --tier premium --apply

# Solo cambiar budget a €40 sin cambiar config
python cost-scaler.py --budget 40 --create-alerts

# Monitorear cambios cada 30 segundos
watch -n 30 "python cost-scaler.py --current"
```

## Troubleshooting

### Error: "Cannot provision service while deletion in progress"
Espera 3-5 minutos y vuelve a intentar:
```bash
sleep 300
python cost-scaler.py --tier standard --apply
```

### Error: "Subscription not found"
Autentícate con Azure:
```bash
az login
az account set --subscription 8e6ace56-e0f2-4071-825a-a20363df34f8
```

---

Para más detalles, ver [SKILL.md](SKILL.md)
