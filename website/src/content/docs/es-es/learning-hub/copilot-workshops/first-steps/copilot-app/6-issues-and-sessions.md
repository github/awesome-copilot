---
title: "Lección 6 - Trabajar con incidencias y sesiones"
description: "Crea un backlog bien delimitado, selecciona una incidencia, impleméntala en un árbol de trabajo aislado y revisa las diferencias personalmente."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Pide al agente que sugiera mejoras concretas del producto, convierte esas ideas en incidencias de GitHub e implementa una incidencia en una sesión aislada.

En esta lección:

- crearás tres incidencias bien delimitadas para Space Quiz.
- explorarás el backlog en **Issues**.
- iniciarás una sesión desde una incidencia en un nuevo árbol de trabajo.
- revisarás las diferencias en la pestaña **Changes** y comprobarás la funcionalidad.

## Crea un backlog en Issues

Envía el siguiente prompt:

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

Abre **Issues**, revisa las tres incidencias y elige una que aporte un valor claro y tenga un alcance manejable.

![Ilustración de la vista Issues de la aplicación Copilot. La barra lateral muestra New, Pull requests, Issues, Automations, Customize, More y el proyecto space-quiz. El área principal contiene las pestañas Assigned to me, Created by me, Mentioning me y Done, un cuadro de búsqueda, los filtros State y Assignee y una lista de tres incidencias abiertas en el repositorio space-quiz.](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues** reúne en la aplicación tus incidencias de GitHub de todos los repositorios, filtradas por **Assigned to me**, **Created by me**, **Mentioning me** y **Done**.

## Implementa una incidencia

1. Abre la incidencia seleccionada desde **Issues**.
2. Selecciona **New session**.
3. Elige un **nuevo árbol de trabajo** cuando se te solicite.
4. Utiliza el modo **Interactive** y el modelo que prefieras.
5. Envía el siguiente prompt:

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

El nuevo árbol de trabajo mantiene esta funcionalidad aislada de la rama predeterminada hasta que estés listo para revisarla y combinarla.

## Revisa las diferencias personalmente

Cuando el agente informe del resultado, no te conformes con su palabra.

1. Abre el panel desplegable de la derecha y selecciona la pestaña **Changes**.
2. Lee las diferencias de cada archivo que haya modificado la sesión.
3. Prueba la funcionalidad en el explorador integrado y confirma que cumple los criterios de aceptación de la incidencia.

![Ilustración de la sesión de la aplicación Copilot con la pestaña Changes abierta en el panel desplegable de la derecha. Muestra un archivo modificado, index.html, con 142 líneas añadidas y 8 eliminadas, y las líneas de diferencias junto a la conversación de la sesión.](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

La pestaña **Changes** muestra todos los archivos que ha modificado la sesión, con las diferencias en línea.

## Resumen y pasos siguientes

Has creado un backlog, implementado una incidencia en una sesión aislada y revisado las diferencias. Continúa con la [lección 7: Planificar antes de editar][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
