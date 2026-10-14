---
title: "Lección 5 - Planificar antes de editar"
description: "Cambia Copilot Chat al modo Plan para que investigue el área de trabajo y proponga un enfoque antes de editar archivos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

El modo Plan investiga el área de trabajo y escribe un plan de implementación sin modificar los archivos.

En esta lección:

- cambiarás Copilot Chat de Agent a Plan.
- revisarás y perfeccionarás un plan propuesto.
- volverás a Agent para implementar el plan.

## Acuerda el enfoque antes de modificar nada

1. Abre Copilot Chat y utiliza el **menú desplegable de modos** situado encima del cuadro de entrada.
2. Cambia de **Agent** a **Plan**.
3. Describe la siguiente funcionalidad con este prompt y deja que Copilot investigue el área de trabajo:

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. Lee el plan y solicita cambios; después, vuelve a **Agent** para implementarlo.

> [!TIP]
> **Cuándo merece la pena el modo de planificación**
>
> Utiliza el modo Plan para cualquier tarea ambigua, transversal o costosa de deshacer. Corregir un mal enfoque cuesta menos antes de la primera modificación.

## Resumen y pasos siguientes

Has acordado un enfoque con Copilot antes de que escribiera código. Continúa con la [lección 6: Dar a Copilot herramientas para trabajar con GitHub][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
