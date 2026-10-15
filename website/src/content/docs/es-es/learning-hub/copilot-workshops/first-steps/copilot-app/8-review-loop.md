---
title: "Lección 8 - Completar el ciclo de revisión de Copilot"
description: "Crea una solicitud de incorporación de cambios, solicita una revisión de Copilot, atiende los comentarios pertinentes y deja que Agent Merge mantenga la solicitud en buen estado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

Convierte la incidencia implementada en una solicitud de incorporación de cambios, solicita una revisión de Copilot y atiende los comentarios antes de combinarla.

En esta lección:

- inspeccionarás los cambios de la sesión por última vez.
- crearás una solicitud de incorporación de cambios desde la sesión del agente.
- solicitarás una revisión de código de Copilot.
- revisarás y aplicarás los comentarios que requieran cambios.
- activarás Agent Merge para mantener la solicitud de incorporación de cambios en buen estado hasta que se combine.

## Crea y revisa la solicitud de incorporación de cambios

> [!IMPORTANT]
> Copilot Free no incluye la revisión de código de Copilot para solicitudes de incorporación de cambios. Utiliza Copilot Student o un plan de pago de Copilot que incluya la revisión de código. Una organización también puede habilitar la revisión de código de pago en GitHub.com para miembros sin una licencia de Copilot. Consulta la [disponibilidad de la revisión de código de Copilot][code-review].
>
> Si no tienes acceso, completa los pasos 1-4, revisa las diferencias tú mismo o pide a un compañero que las revise y omite los pasos 5-9, que dependen de los comentarios de revisión de Copilot. Atiende los comentarios de los revisores humanos y vuelve a probar la funcionalidad antes de continuar con la sección de combinación.

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

[code-review]: https://docs.github.com/copilot/concepts/agents/code-review
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
