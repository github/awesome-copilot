---
name: arduino-azure-iot-edge-integration
description: 'Disenar e implementar integracion de Arduino con Azure IoT Hub e IoT Edge con aprovisionamiento seguro, telemetria resiliente, manejo de comandos y guardrails de produccion.'
---

# Arduino Azure IoT Edge Integration

Usa esta habilidad cuando el usuario necesite conectar dispositivos tipo Arduino a Azure IoT, especialmente en escenarios con fuerte componente edge (gateways, redes intermitentes, buffer offline y actuacion local).

## Cuando usarla

Usa esta habilidad para solicitudes como:

- "quiero conectar sensores Arduino a Azure"
- "como mando telemetria por MQTT a IoT Hub"
- "necesito gateway edge para dispositivos de campo"
- "quiero comandos cloud-to-device y OTA de configuracion"

## Revision obligatoria de documentacion

Antes de recomendar topologia IoT Edge o comportamiento de runtime, revisa:

- https://learn.microsoft.com/azure/iot-edge/
- https://learn.microsoft.com/es-es/azure/iot-edge/

Si no se puede consultar la documentacion, continua con supuestos explicitos y destacalos en una seccion dedicada.

## Referencias oficiales de Arduino y buenas practicas (obligatorio)

Antes de proponer detalles de implementacion de firmware, cableado o comunicaciones, consulta primero fuentes oficiales de Arduino:

- https://www.arduino.cc/en/Guide
- https://docs.arduino.cc/
- https://docs.arduino.cc/language-reference/
- references/arduino-official-best-practices.md

Cuando haya que elegir entre alternativas de implementacion, prioriza la guia oficial de Arduino frente a snippets de comunidad, salvo que exista una razon tecnica clara para desviarse.

## Objetivos

- Producir una ruta de referencia segura de extremo a extremo desde el dispositivo Arduino hasta el insight en la nube.
- Gestionar enlaces inestables (store-and-forward, reintentos, idempotencia).
- Definir un backlog accionable de dispositivo y nube.

## Patrones de integracion

### Patron A: Arduino directo a IoT Hub

Usar cuando la conectividad sea estable y la latencia a la nube sea aceptable.

- Protocolo: MQTT sobre TLS.
- Identidad: credenciales por dispositivo (SAS o X.509).
- Payload de telemetria: JSON compacto con timestamp, id de dispositivo, metricas y flags de calidad opcionales.

### Patron B: Arduino a gateway local y despues IoT Edge

Usar cuando los enlaces sean limitados, se requiera control local o el batching mejore coste/fiabilidad.

- Arduino se comunica con gateway local (serial, BLE, MQTT local, RS-485, puente Modbus).
- El gateway publica aguas arriba mediante runtime de IoT Edge y enruta datos a IoT Hub.
- Los modulos locales pueden filtrar, agregar y disparar acciones incluso durante caidas de nube.

## Flujo de diseno

### 1) Contrato de dispositivo

Define:

- Catalogo de sensores y unidades.
- Frecuencia de muestreo y throughput esperado.
- Estrategia de versionado del esquema de mensajes.
- Propiedades desired/reported del device twin para controlar comportamiento en runtime.

### 2) Baseline de seguridad

Requiere:

- Identidad unica por dispositivo.
- Sin secretos hardcodeados en codigo fuente ni artefactos de firmware.
- Estrategia de rotacion de credenciales.
- Firmware firmado y proceso de actualizacion controlado cuando sea posible.

### 3) Fiabilidad y comportamiento offline

Planifica y documenta:

- Backoff con jitter.
- Estrategia de cola/buffer local con tamano acotado.
- Supresion de duplicados o procesamiento idempotente aguas abajo.
- Fallback a configuracion de ultimo estado valido.

### 4) Enrutado cloud y edge

Define rutas para:

- Telemetria raw a almacenamiento cold.
- Telemetria curada a analitica hot.
- Alertas a canales de operaciones.
- Comandos y configuracion de vuelta a edge/dispositivo.

### 5) Observabilidad

Especifica telemetria minima para operaciones:

- Heartbeat de dispositivo y version de firmware.
- Transiciones de estado de conectividad.
- Contadores de exito/error de envio de mensajes.
- Salud de modulo gateway y razones de reinicio.

## Reutilizar otras habilidades

Cuando aplique, combinar con:

- `azure-smart-city-iot-solution-builder` for city-wide architecture and phased rollout.
- `azure-resource-visualizer` for relationship diagrams.
- `appinsights-instrumentation` for app and service telemetry patterns.
- `azure-smart-city-iot-solution-builder` para arquitectura a escala ciudad y despliegue por fases.
- `azure-resource-visualizer` para diagramas de relacion entre recursos.
- `appinsights-instrumentation` para patrones de telemetria en apps y servicios.

Usa tambien `references/arduino-official-best-practices.md` como linea base de calidad para recomendaciones de firmware y hardware.

## Salida requerida

Proporciona siempre:

1. Patron de conectividad elegido y su razonamiento.
2. Contrato de mensaje (campos, unidades, payload de ejemplo).
3. Checklist de seguridad para identidad/credenciales/actualizaciones.
4. Plan de fiabilidad (reintento, buffering, dedupe).
5. Backlog de implementacion (firmware, gateway, cloud).

## Plantilla de salida

1. Escenario y supuestos
2. Arquitectura recomendada
3. Contrato de dispositivo y gateway
4. Controles de seguridad y fiabilidad
5. Plan de despliegue y pruebas de validacion

## Directrices

- No proponer despliegues en produccion con credenciales compartidas entre dispositivos.
- No asumir conectividad siempre activa en despliegues de campo.
- No omitir autorizacion y auditoria de comandos en escenarios con actuadores.
