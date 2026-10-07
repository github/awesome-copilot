---
title: "Lección 9 - Entregar la siguiente idea a una sesión en la nube"
description: "Cambia el entorno de Copilot Chat de Local a Cloud y delega una funcionalidad independiente que llegará como solicitud de incorporación de cambios."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Has completado todo el ciclo de forma local, así que ya sabes cómo es un buen resultado. Es el momento adecuado para dejar que una tarea se ejecute sin ti. Copilot Chat puede cambiar el entorno en el que se ejecuta, de tu equipo a GitHub.

En esta lección:

- cambiarás el entorno de Copilot Chat de **Local** a **Cloud**.
- delegarás una funcionalidad independiente con criterios de aceptación claros.
- revisarás la solicitud de incorporación de cambios resultante.

> [!NOTE]
> Las sesiones en la nube requieren un plan de pago de Copilot que incluya estas funciones. Es posible que un administrador también deba habilitar el acceso en Business y Enterprise.

## Delega a la nube

![Ilustración de Copilot Chat en VS Code con el selector Harness abierto. En Copilot, Cloud está seleccionado en lugar de Local, y aparecen otros entornos, como Claude y Codex. Arriba, una solicitud para añadir tres nuevos temas de color muestra Working in the cloud con un enlace para seguir la sesión en GitHub.](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

El selector **Harness** muestra Copilot ejecutándose en **Local** o **Cloud**, junto con otros entornos. Cambia a **Cloud** y la siguiente solicitud se ejecutará en GitHub en lugar de en tu equipo.

1. En Copilot Chat, abre el selector **Harness** y cambia Copilot de **Local** a **Cloud**.
2. Inicia una nueva sesión y asígnale una funcionalidad independiente con criterios de aceptación claros:

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. Cierra el portátil. El trabajo continúa en GitHub y llega como solicitud de incorporación de cambios.
4. Revisa esa solicitud de incorporación de cambios con el mismo cuidado que la que has escrito tú mismo.

> [!TIP]
> **Delega lo que puedas describir**
>
> Las sesiones en la nube funcionan mejor con una descripción precisa de la tarea. Si no puedes escribir los criterios de aceptación, la tarea todavía no está lista para salir de tu equipo.

## Resumen y pasos siguientes

Has delegado una funcionalidad a una sesión en la nube y revisado el resultado. Continúa con la [lección 10: Repaso y pasos siguientes][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/vscode/10-review/
