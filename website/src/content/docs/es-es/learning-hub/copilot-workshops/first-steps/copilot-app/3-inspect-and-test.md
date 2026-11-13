---
title: "Lección 3 - Inspeccionar la sesión y probar el cuestionario"
description: "Lee los detalles de la sesión para confirmar en qué trabaja el agente y ejecuta una prueba de humo en el explorador antes de que Git escriba nada."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

Ahora que la sesión ha realizado trabajo real, ya hay algo que inspeccionar. Confirma sobre qué está trabajando el agente y, después, deja que maneje el cuestionario en el explorador integrado e informe de lo que ha ocurrido realmente, no de lo que pretendía hacer.

En esta lección:

- leerás el panel de detalles de la sesión.
- comprobarás el proyecto, la ruta y el uso del contexto de la sesión.
- ejecutarás una prueba de humo en el explorador y corregirás los fallos.

## Lee los detalles de la sesión

Los detalles de la sesión te indican exactamente en qué trabaja el agente. No necesitas vigilar este panel constantemente, pero todo lo que contiene importa cuando un resultado te sorprende.

En este momento, Space Quiz sigue siendo una carpeta local, no un repositorio de Git. Comprueba el proyecto, la ruta y el uso del contexto. Después de [publicar el proyecto en la lección 5][publish-lesson], las sesiones vinculadas a Git muestran detalles adicionales, como la rama y **Changes**.

La ilustración siguiente muestra una sesión posterior vinculada a Git. Los campos de rama y **Changes** todavía no están disponibles en tu sesión de carpeta local.

![Ilustración del panel de detalles de la aplicación Copilot para una sesión de Space Quiz vinculada a Git. Muestra la rama main desde origin/main, la ruta, el proyecto, el nombre y el ID de la sesión, el agente, un archivo modificado, los recuentos de tokens, un uso del contexto del 27 %, el gasto de la sesión y opciones para habilitar el control remoto, cambiar el nombre, ver información, compartir como gist secreto o archivar la sesión.](/images/learning-hub/copilot-workshops/first-steps-app-session-details.svg)

El panel muestra dónde se realiza el trabajo y cuánto se ha llenado la ventana de contexto. No hay ninguna fila de modelo, porque eliges el modelo para cada solicitud en el cuadro de redacción.

1. Confirma que **project** y **path** corresponden al proyecto y la ruta que crees estar editando.
2. Comprueba **context usage**. A medida que aumenta, al agente le queda menos espacio para tu tarea, y esa es la señal para iniciar una sesión nueva.

> [!TIP]
> **La mayoría de los malos resultados son problemas de contexto**
>
> Una carpeta equivocada o una ventana de contexto casi llena explican muchas más sorpresas que un mal prompt.

## Prueba antes de que Git escriba nada

El explorador integrado es un explorador real, así que el agente puede manejar el cuestionario y comprobar su comportamiento. Envía el siguiente prompt:

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Observa el explorador integrado mientras el agente recorre las preguntas.
2. Si algo falla, deja que el agente lo corrija y vuelva a ejecutar la prueba hasta que todo pase.
3. Continúa solo cuando la creación del proyecto y las pruebas se hayan completado correctamente.

Todavía no se ha escrito nada en Git. En la siguiente lección ejecutarás `/init create simple rules for the project`, que lee el proyecto tal como está, así que conviene asegurarte primero de que funciona.

## Resumen y pasos siguientes

Has confirmado en qué trabaja la sesión y comprobado el cuestionario con una prueba de humo en el explorador. Continúa con la [lección 4: Recoger las instrucciones del proyecto][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
[publish-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
