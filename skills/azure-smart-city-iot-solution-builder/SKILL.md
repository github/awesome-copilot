---
name: azure-smart-city-iot-solution-builder
description: 'Disenar y planificar soluciones Azure IoT y Smart City de extremo a extremo: requisitos, arquitectura, seguridad, operaciones, coste y plan de entrega por fases con artefactos concretos de implementacion.'
---

# Azure Smart City IoT Solution Builder

Usa esta habilidad para reconstruir y estandarizar un flujo completo para construir soluciones Azure IoT y Smart City.

## Cuando usarla

Usa esta habilidad cuando el usuario pida cosas como:

- "quiero montar una solucion IoT en Azure"
- "arquitectura Smart City para trafico, alumbrado o residuos"
- "como conecto dispositivos, analitica y alertas"
- "necesito roadmap y backlog para una plataforma urbana"

## Objetivos

- Convertir una idea de alto nivel en una arquitectura desplegable.
- Reutilizar habilidades existentes enfocadas en Azure cuando sea posible.
- Producir artefactos concretos que el equipo pueda implementar.

## Flujo de trabajo

### 0) Revision obligatoria de documentacion (antes de cualquier arquitectura)

Antes de proponer arquitectura o decisiones tecnologicas que involucren computacion en el borde, el asistente debe revisar primero la documentacion de Azure IoT Edge:

- https://learn.microsoft.com/azure/iot-edge/
- https://learn.microsoft.com/es-es/azure/iot-edge/

Paginas minimas a revisar:

- Que es Azure IoT Edge
- Arquitectura de runtime
- Sistemas compatibles
- Historial de versiones/notas de lanzamiento
- Guias de inicio rapido de Linux/Windows relevantes para el escenario

Si no se puede consultar la documentacion, indicalo explicitamente y continua con supuestos claramente marcados.

### 1) Alcance y restricciones

Recoge y confirma:

- Dominio de ciudad: movilidad, parking, calidad del aire, agua, energia, seguridad, residuos, etc.
- Escala: numero de dispositivos, frecuencia de telemetria, retencion, regiones.
- Objetivos de latencia y disponibilidad.
- Restricciones regulatorias y de privacidad.
- Sistemas existentes a integrar (SCADA, GIS, ERP, ticketing, APIs).

### 2) Mapa de capacidades

Divide la plataforma en capas:

- Dispositivo y edge: incorporacion, identidad, firmware, OTA, procesamiento en el borde.
- Ingestion y mensajeria: mando y control, enrutado de eventos, almacenamiento en buffer.
- Datos y analitica: ruta caliente frente a ruta fria, paneles, analisis historico.
- Operaciones: observabilidad, flujo de incidentes, SLO.
- Gobierno: RBAC, secretos, politicas, aislamiento de red.

### 3) Seleccion de servicios de Azure (referencia)

- Conectividad de dispositivos: Azure IoT Hub, Azure IoT Operations, IoT Edge.
- Streaming de eventos: Event Hubs, Service Bus, Event Grid.
- Almacenamiento: Blob Storage, Data Lake, Cosmos DB, SQL.
- Analitica: Azure Data Explorer, Stream Analytics, Fabric/Synapse.
- API y aplicaciones: API Management, App Service, Container Apps, Functions.
- Monitorizacion: Azure Monitor, Application Insights, Log Analytics.
- Seguridad: Key Vault, Defender for IoT, Private Endpoints, Managed Identity.

### 4) Diseno no funcional

Define y documenta:

- Modelo de fiabilidad (zonas/regiones, reintentos, dead-letter, replay).
- Controles de seguridad (confianza cero, cifrado, rotacion de secretos, minimo privilegio).
- Controles de coste (niveles de retencion, ajuste de tamano, autoescalado, planificacion de cargas).
- Ciclo de vida de datos (bruto, curado, agregado, archivado).

### 5) Plan de entrega

Crea una ejecucion por fases:

- Fase 1: Distrito piloto o caso de uso unico.
- Fase 2: Integracion multi-dominio.
- Fase 3: Despliegue a escala ciudad y optimizacion.

Para cada fase incluye:

- Criterios de salida
- Dependencias
- Riesgos y mitigaciones
- Conjunto de KPI

## Reutilizar otras habilidades primero

Hay dos fuentes de habilidades:

- Habilidades proporcionadas por runtime (externas a este repositorio): solo disponibles cuando el entorno host de Copilot las expone.
- Habilidades locales del repositorio (este repositorio): disponibles como archivos locales bajo `skills/`.

### Habilidades de Azure proporcionadas por runtime (opcionales)

Si estan disponibles en el entorno de ejecucion, deriva a estas habilidades especializadas para mas profundidad:

- `azure-kubernetes`
- `azure-messaging`
- `azure-observability`
- `azure-storage`
- `azure-rbac`
- `azure-cost`
- `azure-validate`
- `azure-deploy`

### Alternativas locales del repositorio (usar en este repo)

Cuando las habilidades de runtime no esten disponibles, prioriza las habilidades locales existentes en este repositorio:

- `azure-architecture-autopilot` para generacion y refinamiento de arquitectura.
- `azure-resource-visualizer` para diagramas de relacion entre recursos.
- `azure-role-selector` para orientacion de seleccion de roles.
- `az-cost-optimize` y `azure-pricing` para analisis de costes y precios.
- `azure-deployment-preflight` para comprobaciones previas al despliegue.
- `appinsights-instrumentation` para patrones de instrumentacion de telemetria.

Si no hay ninguna habilidad especializada disponible, continua con esta habilidad y deja los supuestos explicitos.

## Artefactos de salida requeridos

Entrega siempre estas salidas:

1. Resumen de solucion Smart City (alcance, supuestos, restricciones).
2. Arquitectura de referencia (componentes y flujo de datos).
3. Checklist de seguridad y gobierno.
4. Estrategia de coste y escalado.
5. Backlog de implementacion por fases (epicas e hitos).

## Plantilla de salida

Usa esta estructura en las respuestas:

1. Contexto y objetivos
2. Arquitectura propuesta
3. Decisiones tecnologicas y compromisos
4. Seguridad, operaciones y controles de coste
5. Plan de implementacion por fases
6. Riesgos y preguntas abiertas

## Directrices

- No saltes a despliegue sin validar antes los prerequisitos.
- No recomiendes produccion en region unica para cargas criticas de ciudad.
- No omitas la responsabilidad operativa (quien gestiona incidentes, SLA, ventanas de cambio).
- Separa claramente los supuestos de los hechos confirmados.
