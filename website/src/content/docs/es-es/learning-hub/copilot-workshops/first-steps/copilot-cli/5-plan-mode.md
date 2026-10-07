---
title: "Lección 5 - Planificar antes de editar"
description: "Cambia la segunda sesión al modo de planificación con /plan para que el agente proponga un enfoque antes de editar archivos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Ya tienes una segunda sesión ejecutándose en su propio árbol de trabajo. No empieces con código en ella. El modo de planificación investiga el proyecto y propone un enfoque sin modificar los archivos.

En esta lección:

- cambiarás la segunda sesión al modo de planificación.
- revisarás y perfeccionarás el plan propuesto por el agente.
- aprobarás el plan y dejarás que la sesión lo implemente.

## Acuerda el enfoque antes de modificar nada

1. Cambia a la **segunda sesión** que abriste en la lección anterior.
2. Ejecuta `/plan` para cambiar esa sesión al modo de planificación.
3. Envía el siguiente prompt y deja que el agente investigue sin editar nada:

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. Lee el plan, señala cualquier carencia y apruébalo.
5. La sesión continúa con la implementación tomando el plan aprobado como guía.

> [!TIP]
> **Cuándo merece la pena el modo de planificación**
>
> Utiliza el modo de planificación para cualquier tarea ambigua, transversal o costosa de deshacer. Corregir un mal enfoque cuesta menos antes de la primera modificación.

## Resumen y pasos siguientes

Has acordado un enfoque con el agente antes de que escribiera código. Continúa con la [lección 6: Saber qué puede ver el agente][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
