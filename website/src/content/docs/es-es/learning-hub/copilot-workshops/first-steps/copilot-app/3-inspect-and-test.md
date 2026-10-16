---
title: "Lección 3 - Inspeccionar la sesión y probar el cuestionario"
description: "Revisa los detalles del proyecto y del uso de la sesión y, después, ejecuta una prueba de humo en el explorador antes de que Git escriba nada."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

Ahora que la sesión ha realizado trabajo real, ya hay algo que inspeccionar. Confirma sobre qué está trabajando el agente y, después, deja que maneje el cuestionario en el explorador integrado e informe de lo que ha ocurrido realmente, no de lo que pretendía hacer.

En esta lección:

- revisarás el proyecto y los controles de la sesión en el menú del título.
- comprobarás el plan, el uso de la sesión, los tokens y el contexto en el menú de uso.
- ejecutarás una prueba de humo en el explorador y corregirás los fallos.

## Revisa los detalles del proyecto

Selecciona **Build a space quiz** en la barra de título para abrir el menú del proyecto y de la sesión.

![Ilustración del menú de título Build a space quiz. Identifica la sesión de carpeta del proyecto space-quiz y proporciona controles para la ruta, el control remoto, el nombre, las sesiones anidadas, el ID de sesión, el uso compartido, el archivado y la eliminación.](/images/learning-hub/copilot-workshops/first-steps-app-project-details.svg)

Este menú identifica el proyecto en el que trabaja la sesión y proporciona controles para administrar la sesión.

1. Confirma que la sesión de carpeta corresponde al proyecto `space-quiz`.
2. Selecciona **Path** para confirmar que la sesión trabaja en la carpeta esperada.
3. Observa los controles de acceso remoto, cambio de nombre, sesiones anidadas, uso compartido, archivado y eliminación.

## Revisa los detalles de uso

Selecciona el control de uso junto a **Send** para abrir el menú del plan y del uso de la sesión.

![Ilustración del menú de uso junto al botón Send. Muestra el plan GitHub Copilot Pro+, los créditos de IA de la sesión, los recuentos de tokens de entrada y salida y un uso del contexto del 16 % de 400 mil tokens.](/images/learning-hub/copilot-workshops/first-steps-app-usage-details.svg)

Este menú separa el uso de la cuenta y de la sesión de los controles del proyecto:

- **Plan** muestra el uso del plan cuando esa información está disponible.
- **Session** muestra los créditos de IA utilizados por la sesión actual.
- **Tokens** muestra los recuentos de tokens de entrada, almacenados en caché, de salida y de razonamiento.
- **Context** muestra cuánto de la ventana de contexto ha utilizado la sesión.

Comprueba **Context** a medida que crece la sesión. Cuando se llena, al agente le queda menos espacio para la tarea, y esa es la señal para iniciar una sesión nueva.

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

Has confirmado los detalles del proyecto y del uso de la sesión y, después, has comprobado el cuestionario con una prueba de humo en el explorador. Continúa con la [lección 4: Recoger las instrucciones del proyecto][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
