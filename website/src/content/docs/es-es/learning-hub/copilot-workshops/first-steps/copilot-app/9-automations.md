---
title: "Lección 9 - Automatizar la clasificación de incidencias"
description: "Crea y ejecuta una automatización semanal que resuma las incidencias abiertas recientes."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Utiliza una automatización para convertir una tarea recurrente de clasificación de incidencias en un flujo de trabajo programado del agente.

En esta lección:

- crearás una automatización semanal.
- conectarás la automatización al proyecto Space Quiz.
- ejecutarás la automatización de inmediato y revisarás el resultado.

## Crea la automatización

![Ilustración de la vista Automations de la aplicación Copilot con los filtros All, Local y Cloud, un cuadro de búsqueda, los botones Templates y New automation y dos tarjetas de automatización semanal para el proyecto space-quiz: clasificación de incidencias y auditoría de accesibilidad.](/images/learning-hub/copilot-workshops/first-steps-app-automations.svg)

Las automatizaciones ejecutan el mismo prompt según una programación, cada una en su propia sesión, así que ninguna altera tu trabajo. Puedes filtrar por **All**, **Local** o **Cloud** y ejecutar cualquier automatización cuando lo necesites.

1. Abre **Automations**.
2. Elige la plantilla para una nueva automatización semanal.
3. Introduce el siguiente prompt:

   ```plaintext
   Review the latest GitHub issues created and still open in the last week, and provide a summary table ranked by severity and priority.
   ```

4. Establece el modo de sesión en **Autopilot**.
5. Establece el modelo en **Auto**.
6. Selecciona el proyecto `space-quiz`.
7. Abre el menú desplegable **Create** y selecciona **Create and run**.

Revisa el resumen generado y confirma que hace referencia a las incidencias abiertas recientes del repositorio.

## Resumen y pasos siguientes

Has creado un flujo de trabajo reutilizable del agente que se ejecuta según una programación. Continúa con la [lección 10: Continuar una sesión de forma remota][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
