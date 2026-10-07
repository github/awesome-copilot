---
title: "Lección 9 - Explorar y crear lienzos"
description: "Utiliza el lienzo Database Explorer existente y, después, crea y revisa un lienzo de clasificación respaldado por el repositorio."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Hasta ahora has dirigido a los agentes mediante el chat. Sin embargo, gran parte del trabajo no reside en una conversación, sino en un tablero, un documento o una lista de comprobación. Los **lienzos** ofrecen al agente y a ti una superficie compartida para ese tipo de trabajo, directamente en la aplicación. En esta lección utilizarás primero un lienzo incluido con Tailspin Toys y, después, crearás otro para la lista de trabajo pendiente que has estado abordando.

En esta lección:

- comprenderás qué es un lienzo y cuándo utilizarlo.
- utilizarás el lienzo Database Explorer existente para examinar los datos del proyecto.
- crearás un lienzo compartido con un tablero Kanban para clasificar la lista de trabajo pendiente.
- examinarás y probarás el nuevo lienzo sin implementar otra funcionalidad.

## Escenario

Tailspin Toys ya incluye un lienzo para explorar su base de datos. Después de utilizarlo para comprender cómo transforma un lienzo los datos del proyecto en una superficie interactiva, crearás un tablero reutilizable para elegir en qué trabajar a continuación sin iniciar otra funcionalidad.

## ¿Qué es un lienzo?

Un [lienzo][canvas-docs] es una superficie interactiva y compartida para un recurso de trabajo, como un plan, un tablero de clasificación, una lista de comprobación de versiones, un panel o un documento. Aunque el chat resulta adecuado para describir intenciones y razonar sobre ambigüedades, la mayor parte del trabajo se realiza en una *superficie*. Los lienzos permiten colaborar con el agente directamente sobre ella.

Los lienzos son **bidireccionales**: el agente puede actualizar el lienzo mientras trabaja y tú puedes editar la misma superficie. Cuando creas un lienzo, el agente lo genera a partir de la indicación y el flujo de trabajo, y puedes pedirle que añada, elimine o revise capacidades a medida que avanzas. Una vez creado, el lienzo se abre en el panel derecho de la aplicación.

Algunos ejemplos habituales son:

- **Lienzos de Markdown** para planificar el día y priorizar incidencias y solicitudes de incorporación de cambios.
- **Tableros Kanban con agentes** en los que las personas y los agentes añaden tarjetas y desplazan el trabajo entre columnas.
- **Tableros de clasificación de incidencias** que resumen las incidencias principales y los temas recurrentes de un repositorio.

## ¿Por qué utilizar un lienzo?

Utiliza un lienzo cuando una tarea requiera estructura, iteración y verificación, y un chat no sea suficiente. Un lienzo permite:

- basar el trabajo del agente en un recurso real que se adapte al flujo de trabajo.
- orientar o corregir el trabajo directamente en la superficie compartida y, después, permitir que el agente continúe a partir de los cambios.
- inspeccionar el progreso como cambios visibles en un recurso, no solo como respuestas del chat.

## Utilizar el lienzo Database Explorer

Empieza con el lienzo Database Explorer existente del proyecto. Utilizar un ejemplo funcional permite observar cómo se comporta un lienzo limitado al repositorio antes de crear uno.

1. Confirma que la solicitud de incorporación de cambios (PR) de filtrado está combinada y actualiza la rama `main` local.
2. Vuelve a la aplicación GitHub Copilot y selecciona **Home screen**.
3. Confirma que `tailspin-toys` es el repositorio seleccionado.
4. Crea una sesión en un **new working tree** basado en la rama `main` actualizada y selecciona el modo **Interactive**.
5. Pide a Copilot que prepare la base de datos local si es necesario y abra el lienzo existente sin modificarlo:

    ```plaintext
    Set up the local database if needed, then open the repository's Database Explorer canvas. Do not change any files.
    ```

6. En Database Explorer, examina las tablas disponibles y selecciona `games`.
7. Ejecuta una consulta de solo lectura que muestre cinco juegos con una valoración alta:

    ```sql
    SELECT title, star_rating
    FROM games
    ORDER BY star_rating DESC
    LIMIT 5;
    ```

8. Confirma que los resultados contienen cinco juegos como máximo, ordenados por valoración descendente.
9. Abre **Files** y examina `.github/extensions/database-explorer/extension.mjs`. Observa cómo se guarda el lienzo con el proyecto y restringe las consultas a instrucciones `SELECT` y `WITH` de solo lectura.
10. Confirma que la sesión no contiene cambios de archivos.

## Crear un lienzo para clasificar incidencias

Ahora crea otro tipo de superficie compartida. Al guardar el lienzo de clasificación en el ámbito del proyecto, se convierte en un recurso del repositorio que el equipo puede revisar y reutilizar.

1. En la misma sesión, introduce `/create-canvas` y describe el lienzo que quieres crear:

   ```plaintext
   Create a Kanban triage canvas for this repo's open issues and save it under .github/extensions/. Highlight the three issues you'd prioritize and explain why, with the rest below. Include summaries and links.

   Give each card an "Add to current context" action that adds the issue details without starting work or changing the issue. Make it keyboard-accessible and open it so I can try it.
   ```

Copilot crea la extensión del lienzo en `.github/extensions` y abre la superficie compartida en el panel derecho de la aplicación. La extensión generada es contenido ejecutable del repositorio, no solo un recurso visual, por lo que a continuación examinarás sus archivos y su comportamiento.

## Examinar y probar el lienzo

Antes de compartir el lienzo, compáralo con las incidencias reales del repositorio y prueba sus controles. Así confirmarás que el contenido es preciso, que la interacción es accesible y que la acción de la incidencia añade contexto sin iniciar trabajo.

1. Abre **Changes** y confirma que la definición del lienzo se guarda en el repositorio bajo `.github/extensions/`, no solo para tu usuario o sesión. Comprueba que las extensiones existentes y los archivos de la aplicación no han cambiado.
2. Compara el tablero con las incidencias abiertas reales y evalúa las explicaciones de la clasificación.
3. Comprueba que las tarjetas y los controles se leen bien y se pueden utilizar con teclado.
4. Selecciona **Add to current context** en una incidencia y confirma que solo sus detalles se añaden a la conversación. No debe iniciarse ninguna implementación ni cambio de estado de la incidencia.
5. Revisa las correcciones y pide a Copilot que ejecute la validación existente aplicable a los archivos modificados. Registra resultados y bloqueos, en lugar de suponer que una superficie interactiva funciona correctamente solo porque se ha abierto.
6. Si el lienzo necesita cambios, solicita mejoras específicas dentro del alcance de clasificación y repite las comprobaciones afectadas. No implementes una de las incidencias pendientes como parte de este trabajo del lienzo.

El taller termina antes de crear otra PR porque ya has practicado tanto la combinación manual como Agent Merge. En un entorno de producción, revisa y combina el lienzo mediante el proceso habitual del equipo antes de que otros dependan de él.

## Resumen y pasos siguientes

Has creado una superficie compartida en la que puedes colaborar con el agente. En concreto:

- has comprendido qué es un lienzo y cuándo utilizarlo.
- has utilizado el lienzo Database Explorer existente para examinar los datos del proyecto.
- has creado un lienzo compartido con un tablero Kanban para clasificar la lista de trabajo pendiente.
- has examinado y probado el nuevo lienzo sin implementar otra funcionalidad.

Con la lista de trabajo pendiente organizada, da un paso atrás para revisar todo lo que has creado y descubrir cómo continuar. Continúa con la [Lección 10 - Repaso y pasos siguientes][next-lesson].

## Recursos

- [Trabajar con extensiones de lienzo en la aplicación GitHub Copilot][canvas-docs]
- [Lienzos en Awesome Copilot][awesome-copilot-canvases]
- [Acerca de la aplicación GitHub Copilot][about-copilot-app]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/10-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app