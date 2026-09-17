---
title: "Lección 7 - Planificar con lienzos"
description: "Crea un lienzo compartido y dirigido por agentes en la aplicación GitHub Copilot para planificar y realizar el seguimiento del trabajo junto con el agente."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Hasta ahora has dirigido a los agentes mediante el chat. Sin embargo, gran parte del trabajo no reside en una conversación, sino en un tablero, un documento o una lista de comprobación. Los **lienzos** ofrecen al agente y a ti una superficie compartida para ese tipo de trabajo, directamente en la aplicación. En esta lección crearás un lienzo sencillo para planificar y realizar el seguimiento de la lista de trabajo pendiente que has estado abordando.

En esta lección:

- comprenderás qué es un lienzo y cuándo utilizarlo.
- crearás un lienzo compartido con un tablero Kanban para clasificar la lista de trabajo pendiente.
- guardarás el lienzo en el repositorio y lo combinarás para el equipo.
- abrirás el lienzo en una sesión nueva y empezarás a trabajar desde él.

## Escenario

Examinar una lista de incidencias puede resultar abrumador, incluso en las mejores circunstancias. Los desarrolladores de Tailspin Toys buscan una herramienta que les permita clasificar las incidencias con rapidez y empezar a trabajar en ellas desde la aplicación Copilot.

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

## Crear un lienzo para realizar el seguimiento del trabajo

Has publicado numerosos cambios: la valoración por estrellas, el estándar de documentación y la funcionalidad de filtrado ya están combinados. Sin embargo, todavía quedan elementos en la lista de trabajo pendiente. Vamos a crear el lienzo para clasificar el trabajo con rapidez.

1. Vuelve a la aplicación GitHub Copilot o ábrela.
2. Selecciona **Home screen**.
3. Comprueba que `tailspin-toys` esté seleccionado como repositorio.
4. En el cuadro de indicaciones, utiliza la indicación siguiente para crear un lienzo que satisfaga nuestras necesidades:

   ```plaintext
   Create a basic Kanban board canvas that allows me to quickly triage work. Highlight the three issues which are most likely to need attention right now, with the remainder in a second section down below. The top three cards should include a description of the issue's content and a justification of why they're at the top of the list. Each issue should have a button that allows me to add it to the current context for the current session so I can get to work on it straightaway.
   ```

Copilot comenzará a crear el lienzo.

> [!NOTE]
> La creación tardará unos minutos. Como se trata de una tarea compleja, es posible que la primera versión no te satisfaga. Puedes seguir enviando indicaciones hasta crear la herramienta que necesitas.

## Guardar el lienzo y combinarlo con el repositorio

Los lienzos pueden convertirse en recursos del repositorio, al igual que los archivos de instrucciones y las habilidades. Vamos a pedir a Copilot que lo añada al repositorio y lo combine para que pueda utilizarlo todo el equipo.

1. En la misma sesión, pide a Copilot que guarde el lienzo en el repositorio mediante la indicación siguiente:

   ```plaintext
   Let's save this canvas definition to the repository so I can share it with my development team
   ```

2. Cuando Copilot haya guardado los archivos del lienzo, selecciona el menú desplegable situado junto a **Create PR** en la esquina superior derecha.
3. Selecciona **Agent merge** para habilitar Agent Merge.

   ![Menú desplegable Create PR de la aplicación GitHub Copilot abierto, con una flecha que señala la opción Agent merge](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. El texto del botón cambia a **Agent merge**.
5. Selecciona el botón **Agent merge** para iniciar el proceso.

La aplicación Copilot comenzará a crear y gestionar la solicitud. Primero explora el proyecto para determinar la mejor forma de crearla y, después, la genera.

Transcurridos unos instantes, observarás que Copilot vuelve a trabajar y examina las condiciones de la solicitud, incluido el proceso de CI que ejecuta todas las pruebas del repositorio. Comunicará el estado de las revisiones de otros miembros del equipo, las comprobaciones que deben ejecutarse y si la solicitud puede combinarse.

6. Permite que Agent Merge combine la solicitud seleccionando el menú desplegable situado junto a **Agent merge** y, después, **Merge pull request**.

   ![Menú desplegable Agent merge con las acciones permitidas al agente —Address reviews, Fix CI failures y Resolve conflicts— y una flecha que señala Merge pull request](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. Espera a que todos los procesos de CI se completen correctamente y se muestren en verde. Cuando terminen, Copilot combinará automáticamente la solicitud.

Ya has creado un lienzo compartido para el equipo.

## Trabajar en el lienzo

Con el lienzo creado, vamos a iniciar una sesión nueva y utilizarlo.

1. En la aplicación Copilot, selecciona **New session** junto a **tailspin-toys** para iniciar una sesión nueva.
2. Pide a Copilot que abra el lienzo de clasificación mediante la indicación siguiente:

   ```plaintext
   Open the triage issues canvas
   ```

3. El lienzo que has creado debería abrirse en la sesión nueva.
4. Selecciona **Add to current context** en una de las incidencias que más te interese.
5. Copilot empezará a trabajar en la incidencia.

Has utilizado un lienzo creado por ti para agilizar el proceso de desarrollo.

## Resumen y pasos siguientes

Has creado una superficie compartida en la que puedes colaborar con el agente. En concreto:

- has aprendido qué son los lienzos y cuándo utilizarlos.
- has creado con el agente un lienzo compartido con un tablero Kanban para clasificar incidencias.
- has guardado y combinado el lienzo con el repositorio mediante Agent Merge.
- has abierto el lienzo en una sesión nueva y lo has utilizado para empezar a trabajar.

Con la lista de trabajo pendiente organizada, da un paso atrás para revisar todo lo que has creado y descubrir cómo continuar. Continúa con la [Lección 8 - Repaso y pasos siguientes][next-lesson].

## Recursos

- [Trabajar con extensiones de lienzo en la aplicación GitHub Copilot][canvas-docs]
- [Lienzos en Awesome Copilot][awesome-copilot-canvases]
- [Acerca de la aplicación GitHub Copilot][about-copilot-app]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/8-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app