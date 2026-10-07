---
title: "Lección 8 - Completar el ciclo de revisión de Copilot"
description: "Crea una solicitud de incorporación de cambios, solicita una revisión de Copilot, atiende los comentarios pertinentes y deja que Agent Merge mantenga la solicitud en buen estado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Convierte la incidencia implementada en una solicitud de incorporación de cambios, solicita una revisión de Copilot y atiende los comentarios antes de combinarla.

En esta lección:

- inspeccionarás los cambios de la sesión por última vez.
- crearás una solicitud de incorporación de cambios desde la sesión del agente.
- solicitarás una revisión de código de Copilot.
- revisarás y aplicarás los comentarios que requieran cambios.
- activarás Agent Merge para mantener la solicitud de incorporación de cambios en buen estado hasta que se combine.

## Crea y revisa la solicitud de incorporación de cambios

1. Abre el panel desplegable de la derecha y selecciona la pestaña **Changes** para inspeccionar los archivos modificados en la sesión.
2. Selecciona **Create PR** en la barra de herramientas de la sesión.
3. Revisa el título y la descripción generados y crea la solicitud de incorporación de cambios.
4. Abre la solicitud de incorporación de cambios en GitHub.
5. Desde el menú **Reviewers**, solicita una revisión de **Copilot**.
6. Abre la pestaña **Files changed** y lee todos los comentarios de revisión.
7. Para cada comentario que requiera un cambio, utiliza la acción **Fix** de Copilot en la aplicación o realiza el cambio tú mismo.
8. Revisa cada cambio y vuelve a probar la funcionalidad.
9. Responde con una descripción concisa de lo que ha cambiado y resuelve la conversación.

> [!NOTE]
> Si una sugerencia no es aplicable o queda fuera del alcance de la solicitud de incorporación de cambios, responde con el motivo en lugar de realizar un cambio innecesario. Resuelve todas las conversaciones de revisión antes de combinar.

## Combina con Agent Merge

Activa **Agent Merge** para la solicitud de incorporación de cambios y deja que el agente la mantenga en buen estado. El agente atiende los comentarios de revisión, corrige las comprobaciones que fallan y resuelve los conflictos a medida que aparecen; después, combina la solicitud cuando todo pasa.

Si prefieres combinarla tú mismo, revisa las diferencias finales, comprueba la funcionalidad y combina la solicitud de incorporación de cambios cuando pasen todas las comprobaciones.

## Resumen y pasos siguientes

Has completado el ciclo de desarrollo desde la incidencia hasta la solicitud de incorporación de cambios revisada y combinada. Continúa con la [lección 9: Automatizar la clasificación de incidencias][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
