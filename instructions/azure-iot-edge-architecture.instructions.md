---
description: 'Forzar la revision de documentacion de Azure IoT Edge antes de proponer arquitecturas edge IoT o guias de implementacion en Azure.'
applyTo: '**/*.bicep, **/*.tf, **/*iot*.md, **/*smart-city*.md, **/*edge*.md'
---

## Instruccion de arquitectura Azure IoT Edge

Cuando la tarea incluya Azure IoT, Smart City, procesamiento en el borde, diseno de gateways o escenarios edge sin conectividad, haz esto antes de dar recomendaciones de arquitectura:

1. Revisa primero la documentacion de Azure IoT Edge:
   - https://learn.microsoft.com/azure/iot-edge/
   - https://learn.microsoft.com/es-es/azure/iot-edge/
2. Confirma las restricciones clave de la documentacion:
   - Arquitectura de runtime
   - Sistemas compatibles
   - Estado de version/lanzamiento
   - Ruta de inicio rapido Linux/Windows relevante
3. Indica explicitamente que revisaste la documentacion, o indica que no se pudo consultar.
4. Si la documentacion no fue accesible, continua con supuestos claramente etiquetados.

### Reglas de respuesta

- Nunca saltes directamente a una lista de servicios sin validar antes la aplicabilidad de edge.
- Explica siempre por que IoT Edge es necesario o no.
- Incluye implicaciones operativas: estrategia de actualizacion, observabilidad y modelo de soporte.
- Prioriza valores seguros por defecto: identidad administrada, minimo privilegio, gestion de secretos y aislamiento de red.
