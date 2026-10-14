---
title: "Lección 11 - Explorar un Canvas"
description: "Instala un Canvas de Repository Issues Kanban e inicia una sesión desde una tarjeta de incidencia."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Un **Canvas** es un espacio compartido y bidireccional donde tú y un agente podéis actualizar el mismo plan, tablero, lista de comprobación o panel. Explora un Canvas Kanban que convierte las incidencias del repositorio en un flujo de trabajo visual.

En esta lección:

- instalarás una extensión de Canvas.
- conectarás el Canvas al repositorio de Space Quiz.
- moverás una incidencia al trabajo activo.
- inspeccionarás la sesión creada a partir de la incidencia.

## Instala el Canvas de Repository Issues Kanban

1. Explora la [galería de extensiones de Canvas][canvas-gallery].
2. Abre la [extensión Repository Issues Kanban][kanban-extension].
3. Selecciona **Install in GitHub Copilot app** y aprueba la instalación.
4. En la aplicación, abre **Customize** y después **Canvas**.
5. Confirma que la extensión está instalada.

## Empieza a trabajar desde el Canvas

1. Selecciona **New session** para el Canvas.
2. Elige el proyecto `space-quiz`.
3. Explora el tablero de incidencias.
4. Mueve una tarjeta de incidencia a la columna de trabajo activo.
5. Abre la sesión generada automáticamente.
6. Confirma que la incidencia seleccionada está disponible como contexto de la sesión.

![Ilustración del Canvas de Repository Issues Kanban con las columnas Backlog, Plan, Ready e Implement. La incidencia 13, Pantalla de revisión, se está arrastrando de Backlog a la columna Plan, mientras que la incidencia 12, Temporizador por pregunta, permanece en Backlog.](/images/learning-hub/copilot-workshops/first-steps-app-canvas-kanban.svg)

Cuando sueltas una tarjeta en una columna, el Canvas entrega esa incidencia a una nueva sesión con la incidencia ya cargada.

> [!NOTE]
> La extensión actual de Repository Issues Kanban mueve las tarjetas mediante arrastrar y soltar con un dispositivo de puntero. Si no puedes utilizar esa interacción, anota el número de la incidencia en el tablero, abre la incidencia desde **Issues** y selecciona **New session**. Esto crea la misma sesión basada en la incidencia sin mover la tarjeta.

El Canvas ofrece una forma visual de seleccionar y comenzar el trabajo mientras mantiene al agente centrado en la incidencia.

## Resumen y pasos siguientes

Has utilizado un espacio visual compartido para iniciar una sesión de agente. Continúa con la [lección 12: Repaso y pasos siguientes][next-lesson].

[canvas-gallery]: https://awesome-copilot.github.com/extensions/
[kanban-extension]: https://awesome-copilot.github.com/extension/accessibility-kanban/
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/12-review/
