---
title: "Lección 3 - Modos de agente: Plan y Autopilot"
description: "Explora los modos de agente: utiliza Plan para acordar un enfoque, Autopilot para crear el filtrado a partir de una incidencia e Interactive para revisar y verificar el resultado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Empezamos añadiendo una pequeña funcionalidad al proyecto. Sin embargo, los cambios más amplios requieren un proceso más sólido. Por suerte, la aplicación GitHub Copilot está diseñada para adaptarse al flujo existente de una organización y garantizar que creamos lo adecuado de la forma correcta. Esta es la primera de varias lecciones en las que seguirás un proceso de desarrollo habitual dirigido por agentes: partirás de una incidencia para generar una funcionalidad, comprobarás que el código es válido y que la funcionalidad se comporta como se espera y, finalmente, la combinarás correctamente con el proyecto.

> [!NOTE]
> Utilizarás la misma sesión durante todo el flujo de la funcionalidad. Normalmente usarías sesiones o PR distintas para los diferentes tipos de archivo, pero tomaremos un atajo para centrarnos en los conceptos principales.

En esta lección:

- iniciarás una nueva sesión de agente desde una incidencia de GitHub.
- definirás los requisitos en modo **Plan**.
- implementarás la nueva funcionalidad con el modo **Autopilot**.
- revisarás el código.
- validarás manualmente la funcionalidad en un lienzo de navegador.

Mientras continúas con esta funcionalidad, actualizarás las instrucciones del repositorio, personalizarás la habilidad quality-checks existente, añadirás validación mediante MCP, crearás un agente QA y abrirás la PR de la funcionalidad.

## Escenario

El catálogo de Tailspin Toys está creciendo y sus visitantes necesitan acotar los juegos por categoría y editor. La incidencia de la lista de trabajo pendiente describe la funcionalidad, pero hay que acordar detalles como la combinación de categorías antes de programar. Utilizarás el modo Plan para resolver esas decisiones y, después, autorizarás una implementación acotada con Autopilot.

## Contexto

Introducir agentes de programación con IA en el flujo de desarrollo no cambia los principios fundamentales. De hecho, adquieren aún más importancia. La mayoría de los desarrolladores siguen un flujo similar al siguiente:

1. Abrir una incidencia que detalle lo que debe hacerse.
2. Crear un plan de lo que debe desarrollarse.
3. Crear y revisar el código.
4. Ejecutar las pruebas para validar el código.
5. Validar manualmente la nueva funcionalidad.
6. Crear una solicitud de incorporación de cambios (PR).
7. Una vez revisado el código y completado correctamente el proceso de integración continua, combinarlo.

> [!NOTE]
> Los detalles concretos variarán según el equipo y la organización, pero la mayoría de los procesos serán una variante del flujo anterior.

Al mantener este enfoque estándar, te aseguras de que el código generado por IA cumpla los requisitos establecidos y pase por el mismo proceso de validación que el código escrito manualmente.

## Modos de sesión

El **modo de sesión** controla el grado de autonomía del agente. Puedes establecerlo en el menú desplegable situado debajo del campo de indicaciones y cambiarlo en cualquier momento:

- **Interactive**: trabajas junto con el agente. El agente sugiere cambios y espera tus indicaciones antes de continuar.
- **Plan**: el agente crea primero un plan. Revisas y apruebas el plan antes de que el agente lo ejecute.
- **Autopilot**: el agente trabaja de forma totalmente autónoma: escribe código, ejecuta pruebas e itera sin esperar indicaciones.

Empieza en modo Plan, revisa el plan y, después, utiliza Autopilot para implementarlo.

## Iniciar una sesión desde la incidencia

Antes de empezar, confirma que la PR de valoraciones por estrellas está combinada y que tu rama `main` local está actualizada.

1. Selecciona **Issues** y abre **Allow users to filter games by category and publisher**.
2. Selecciona **New session** y elige un **new working tree** basado en la rama `main` actualizada.

    ![Vista de una incidencia en la aplicación GitHub Copilot con una flecha que señala el botón New session](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

3. Confirma que la incidencia está adjunta a la sesión y selecciona **Plan** en el selector de modo.

## Planificar la funcionalidad de filtrado

La planificación te permite revisar el enfoque antes de que Copilot escriba código. Como has iniciado la sesión desde la incidencia, Copilot ya tiene la solicitud de la funcionalidad como contexto. Envía:

```plaintext
Build this feature.
```

Responde a las preguntas de Copilot y compara el plan con los criterios de aceptación de la incidencia. Comprueba que incluye el filtrado por categoría y editor, controles accesibles, cambios de acceso a datos y pruebas. Aclara cualquier comportamiento poco definido, como la combinación de varias categorías o qué ocurre cuando ningún juego coincide.

El plan debe incluir lint, pruebas unitarias, pruebas E2E y comprobación de tipos con las herramientas existentes del proyecto. Céntralo en implementar y probar el filtrado; crearás la PR después de completar el flujo de calidad. Solicita cambios en el plan antes de aprobarlo y conserva la URL de la incidencia y las aclaraciones acordadas para la validación posterior.

## Aprobar Autopilot explícitamente

Cuando estés conforme con el plan, selecciona **Approve and implement with autopilot** o la opción equivalente de tu versión. Confirma que el indicador de modo muestra **Autopilot**.

Copilot comenzará a implementar la funcionalidad. Verás cómo itera por el proceso, sigue el plan establecido, genera código e incluso ejecuta pruebas.

> [!NOTE]
> La aprobación puede iniciar la implementación inmediatamente, así que revisa el plan primero. Si Copilot informa de dependencias ausentes o de un conflicto de puerto, resuelve el problema de configuración antes de dar las comprobaciones por completadas. Detén solo los servidores que hayas iniciado.

## Revisar y verificar la implementación

Una vez generado el código, hay que revisarlo antes de combinarlo, igual que cualquier otro código. Revisemos el código y ejecutemos el sitio para comprobar que todo funciona correctamente.

1. Abre **Changes** y examina la implementación del filtrado y las pruebas.
2. Compara el resultado con la incidencia y las aclaraciones aprobadas, incluidas las combinaciones de varias categorías y editores. Comprueba que los cambios siguen las instrucciones existentes del repositorio.
3. Examina la salida de lint, las pruebas unitarias, las pruebas E2E y la comprobación de tipos. Una comprobación omitida no cuenta como superada.
4. Resuelve los fallos y repite las comprobaciones afectadas antes de aceptar la implementación. La configuración E2E de Playwright compila y sirve una vista previa y puede reutilizar un servidor local; asegúrate de que el servidor probado pertenece a este worktree, no a una lección anterior.

## Explorar la nueva funcionalidad

El código parece correcto, pero ¿se ejecuta? Iniciemos la aplicación como antes y abramos el sitio en un lienzo de navegador.

1. Utiliza la indicación siguiente para pedir a Copilot que inicie la aplicación y abra la página en el lienzo de navegador:

    ```plaintext
    Start the app and open it in the browser canvas.
    ```

2. En unos instantes, la aplicación se iniciará y se abrirá una ventana de navegador dentro de la aplicación Copilot.
3. Confirma que las tarjetas de juegos valorados muestran su puntuación sobre cinco.
4. Cuando termines, pide a Copilot que detenga el servidor de desarrollo que ha iniciado para esta sesión con la indicación siguiente:

    ```plaintext
    Stop the dev server and close the browser canvas.
    ```

## Resumen y pasos siguientes

Has utilizado distintos modos de agente para desarrollar y revisar una funcionalidad. En esta lección:

- has iniciado una nueva sesión de agente desde una incidencia de GitHub.
- has definido los requisitos en modo **Plan**.
- has implementado la nueva funcionalidad con el modo **Autopilot**.
- has revisado el código.
- has validado manualmente la funcionalidad en un lienzo de navegador.

A continuación, profundizarás en cómo se genera el código y te asegurarás de que siga las prácticas documentadas mediante el [uso de instrucciones personalizadas][next-lesson].

## Recursos

- [Trabajar con sesiones de agente en la aplicación GitHub Copilot][agent-sessions]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/4-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions