---
title: "Lección 4 - Trabajar en incidencias en paralelo"
description: "Crea un backlog, añade una incidencia al chat desde el panel lateral, revisa los cambios con /diff e inicia una segunda sesión en su propio árbol de trabajo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Mantén el backlog y el ciclo de implementación en la terminal y abre sesiones separadas para tareas independientes.

En esta lección:

- crearás tres incidencias de GitHub bien delimitadas.
- añadirás una incidencia al chat desde el panel lateral y la implementarás.
- revisarás el cambio con `/diff`.
- iniciarás una segunda sesión en un árbol de trabajo aislado.

## Crea un backlog

Envía el siguiente prompt:

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## Trabaja en la primera incidencia en esta sesión

1. Pulsa la tecla <kbd>Left arrow</kbd> para abrir el panel lateral y, después, pulsa <kbd>Tab</kbd> para desplazarte a la pestaña **Issues**.
2. Resalta la primera incidencia y pulsa <kbd>c</kbd> para añadirla al chat como contexto. Para leer primero la incidencia completa, pulsa <kbd>Enter</kbd> en su lugar.
3. Pide al agente que implemente la incidencia.

![Ilustración del panel lateral de Copilot CLI en una terminal. La pestaña Issues está seleccionada entre las pestañas Current, Sessions, Issues, Pull requests y Gists. Un filtro de búsqueda de incidencias abiertas en el repositorio space-quiz muestra una incidencia, Añadir una pantalla de puntuación al final del cuestionario. Las indicaciones explican que la tecla Left arrow abre el panel y Tab permite moverse entre pestañas; la fila inferior enumera las teclas: barra para buscar, Enter para ver detalles, o para abrir, w para el árbol de trabajo, c para el chat y a para todo.](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

El panel lateral muestra todas las pestañas en la parte superior, y las indicaciones de la parte inferior son las teclas que actúan sobre el elemento resaltado.

## Revisa el cambio con `/diff`

El proyecto está publicado, así que hay una versión cuyo funcionamiento has comprobado y con la que puedes comparar los cambios. `/diff` muestra exactamente qué ha cambiado esta incidencia respecto a esa versión, que es justo lo que vas a pedir que alguien revise.

1. Ejecuta `/diff` y lee todos los archivos modificados.
2. Pide que se corrija cualquier cosa que parezca incorrecta y vuelve a ejecutar `/diff`.
3. Ejecuta `!git status` o `!git diff` cuando quieras inspeccionar Git directamente.

## Trabaja en la segunda incidencia en paralelo

1. Abre de nuevo el panel lateral y cambia a la pestaña **Sessions**.
2. Inicia otra sesión para la segunda incidencia sin perder la primera.
3. En la nueva sesión, ejecuta `/worktree` para que disponga de un árbol de trabajo aislado en lugar de crear una rama en la misma carpeta. Ahora ambas sesiones pueden ejecutarse a la vez sin interferir entre sí.
4. Añade la segunda incidencia a esa sesión con <kbd>c</kbd>.
5. Deja la sesión así por ahora. En la siguiente lección planificarás esta incidencia antes de escribir código.

![Ilustración de la salida de Copilot CLI tras ejecutar /worktree. Informa de que ha creado el árbol de trabajo ../space-quiz-13 en la rama issue-13-review-screen y de que esta sesión trabaja ahora allí mientras main permanece sin cambios.](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree` traslada la sesión a su propia copia de trabajo en su propia rama, de modo que la primera sesión puede seguir trabajando sin interrupciones.

## Resumen y pasos siguientes

Has implementado la primera incidencia, la has revisado con `/diff` y has iniciado una segunda sesión en su propio árbol de trabajo. Continúa con la [lección 5: Planificar antes de editar][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
