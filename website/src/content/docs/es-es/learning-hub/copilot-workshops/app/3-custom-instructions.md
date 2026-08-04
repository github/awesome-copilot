---
title: "Lección 3 - Guiar a Copilot con instrucciones personalizadas"
description: "Utiliza la aplicación GitHub Copilot para añadir al repositorio un estándar de instrucciones personalizadas a partir de una incidencia de la lista de trabajo pendiente y combina el cambio como una solicitud de incorporación de cambios."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

El contexto es fundamental al trabajar con IA generativa. Si una tarea debe realizarse de una forma concreta o Copilot necesita conocer información de fondo, conviene que ese contexto esté disponible. Una de las herramientas más potentes para proporcionarlo son los [archivos de instrucciones][instruction-files], que describen no solo *qué* código quieres, sino también *cómo* debe estructurarse. En esta lección añadirás un estándar de documentación al repositorio y lo harás como realizarás la mayor parte del trabajo a partir de ahora: comenzarás desde una incidencia de la lista de trabajo pendiente y dejarás que el agente realice el cambio.

En esta lección:

- explorarás cómo llegan al agente las instrucciones del repositorio y los archivos de instrucciones limitados por ruta.
- iniciarás una sesión desde la incidencia sobre instrucciones de la lista de trabajo pendiente.
- pedirás al agente que añada un estándar de documentación a `.github/copilot-instructions.md`.
- revisarás el cambio y lo combinarás como una solicitud de incorporación de cambios.

## Escenario

Como cualquier buen equipo de desarrollo, Tailspin Toys dispone de directrices y requisitos para las prácticas de desarrollo. Entre ellos se incluyen:

- Se debe añadir documentación al código mediante comentarios de documentación TSDoc.
- El formato se debe documentar y aplicar mediante linting.

Mediante los archivos de instrucciones, garantizarás que Copilot disponga de la información adecuada para realizar las tareas conforme a estas prácticas.

## Archivos de instrucciones

Las instrucciones personalizadas permiten proporcionar contexto y preferencias a Copilot para que comprenda mejor el estilo y los requisitos de programación. Esta potente funcionalidad ayuda a orientar a Copilot para obtener sugerencias y fragmentos de código más pertinentes. Puedes especificar las convenciones de programación, las bibliotecas e incluso los tipos de comentarios que prefieres incluir en el código. También puedes crear instrucciones para todo el repositorio o para tipos de archivo concretos, con contexto específico para una tarea.

Hay dos tipos de archivos de instrucciones:

- `.github/copilot-instructions.md`, un único archivo de instrucciones que se envía a Copilot con **cada** solicitud del repositorio. Debe contener información del proyecto que sea pertinente para la mayoría de las solicitudes de chat o CLI enviadas a Copilot, como la pila tecnológica, una descripción general de lo que se está creando, procedimientos recomendados y otras directrices globales.
- Los archivos `.github/instructions/*.instructions.md` se pueden crear para tareas o tipos de archivo concretos. Puedes utilizarlos para proporcionar directrices para lenguajes específicos, como TypeScript o Astro, o para tareas como crear un componente de interfaz de usuario o un nuevo conjunto de pruebas unitarias.

> [!NOTE]
> Copilot admite otros estándares para incorporar instrucciones mediante AGENTS.md, CLAUDE.md y GEMINI.md, de modo que siempre disponga del contexto adecuado.

### Procedimientos recomendados para gestionar archivos de instrucciones

Una explicación completa sobre la creación de archivos de instrucciones queda fuera del alcance del taller. No obstante, los ejemplos del proyecto de muestra presentan un enfoque representativo. En términos generales:

- Mantén las instrucciones de `copilot-instructions.md` centradas en directrices de ámbito de proyecto, como una descripción de lo que se está creando, la estructura del proyecto y los estándares globales de programación.
- Utiliza archivos `*.instructions.md` para proporcionar instrucciones específicas para tipos de archivo, como pruebas unitarias, componentes de Astro o la capa de datos, o para tareas concretas.
- Utiliza lenguaje natural. Redacta directrices claras. Proporciona ejemplos de cómo debe y no debe ser el código.

No existe una única forma de crear archivos de instrucciones, del mismo modo que no existe una única forma de utilizar la IA. La experimentación te permitirá descubrir qué funciona mejor para tu proyecto.

> [!TIP]
> Todos los proyectos que utilicen GitHub Copilot deberían disponer de una colección sólida de archivos de instrucciones. Al explorar los de este proyecto, observarás que hay archivos de instrucciones para muchos tipos de archivos de código.
>
> ¿Buscas plantillas o un punto de partida? Explora [Awesome Copilot][awesome-copilot], un repositorio repleto de archivos de instrucciones, agentes personalizados y otros recursos.

## Explorar los archivos de instrucciones personalizadas del proyecto

Dedica un momento a leer los archivos de instrucciones incluidos en este repositorio: hay un archivo principal `copilot-instructions.md` y una colección de archivos `*.instructions.md` para distintas tareas. Ábrelos en el editor o en la interfaz web de GitHub.

1. Si el panel de revisión aún no está visible, selecciona **Toggle review panel** en la esquina superior derecha para abrirlo.

   ![Barra de herramientas superior de la aplicación GitHub Copilot con una flecha que señala el botón Toggle review panel situado a la derecha de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Selecciona **+** para añadir un elemento nuevo al panel de revisión.
3. Selecciona **File**.
4. Busca `copilot-instructions.md`.
5. Selecciona `copilot-instructions.md` en la lista de archivos para abrirlo.
6. Explora el archivo. Observa la breve descripción del proyecto y secciones como **Agent notes**, **Code standards**, **Scripts** y **Repository Structure**. En **Code standards**, fíjate en las directrices anidadas de **GitHub Actions Workflows**. Se aplican a cualquier interacción con Copilot.
7. Selecciona **Show folder view** para abrir el navegador de carpetas.

   ![Botón Show folder view del panel de revisión con un archivo abierto en la aplicación GitHub Copilot](/images/learning-hub/copilot-workshops/app-show-folder-view.png)

8. Ve a la carpeta `.github/instructions` y explora los archivos. Observa que hay instrucciones para archivos de Astro, la capa de datos de Drizzle, pruebas y otros elementos.
9. Abre `.github/instructions/unit-tests.instructions.md`. Observa el campo `applyTo` de la parte superior: establece un patrón glob, relativo a la raíz del repositorio, que determina a qué archivos se aplican las instrucciones. En este caso, coincidirá cualquier archivo de prueba de TypeScript, por ejemplo, uno que cumpla `**/*.test.ts`.
10. Examina las instrucciones específicas para crear pruebas unitarias en este proyecto.
11. Por último, abre `.github/instructions/drizzle.instructions.md` y desplázate hasta el final. Observa los vínculos a otros archivos de instrucciones, como `unit-tests.instructions.md`, y a archivos existentes del proyecto. De este modo puedes dividir conjuntos de instrucciones grandes en archivos más pequeños y reutilizables, y señalar a Copilot ejemplos que debe seguir al generar código. Las rutas son relativas al archivo de instrucciones, no a la raíz del repositorio.

> [!NOTE]
> La sección **Code formatting requirements** de `copilot-instructions.md` documenta los estándares de programación del proyecto, pero todavía no exige documentación dentro del código. En los pasos siguientes añadirás reglas para comentarios de documentación TSDoc y comentarios de cabecera de archivo.

## Empezar desde la incidencia sobre instrucciones

En la lección anterior iniciaste una sesión con una indicación directa. Sin embargo, la mayor parte del trabajo comienza con una incidencia. Vamos a crear una sesión basada en una incidencia presentada para actualizar los archivos de instrucciones y, después, solicitaremos la actualización.

> [!NOTE]
> Como los archivos de instrucciones influyen mucho en el código que genera Copilot, debes asegurarte de que lo orienten con claridad. Pedir a Copilot que cree una primera versión, como harás en esta lección, es un buen enfoque, siempre que después la revises para confirmar que las actualizaciones cumplen tus requisitos.

1. Selecciona **My work** en la barra lateral.
2. Selecciona la incidencia titulada **Update our repository coding standards** para abrirla.
3. Selecciona **New session** en la esquina superior derecha para iniciar una sesión basada en la incidencia.

   ![Vista de una incidencia en la aplicación GitHub Copilot con una flecha que señala el botón New session de la esquina superior derecha](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. Utiliza la indicación siguiente para pedir a Copilot que actualice los archivos de instrucciones de acuerdo con los requisitos documentados en la incidencia:

  ```plaintext
  Following this issue, make the updates to the instructions files in this project to meet the requirements documented. Don't create the PR quite yet!
  ```

Copilot realizará las actualizaciones.

## Revisar el cambio

Vamos a leer las actualizaciones de Copilot y también a pedirle un ejemplo del código que generará a partir de las instrucciones actualizadas.

1. Selecciona **Changes** en la esquina superior derecha para abrir los cambios de código.

   ![Pestañas del panel de sesión de la aplicación GitHub Copilot con una flecha que señala la pestaña Changes](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. Revisa el archivo de instrucciones actualizado. Confirma que contiene las directrices para añadir documentación y comentarios al código.

> [!NOTE]
> Como la IA es probabilística y no determinista, el texto exacto puede variar.

3. Utiliza la indicación siguiente para pedir a Copilot que cree un ejemplo del código que generará ahora:

  ```plaintext
  Do not make any updates, but show me what the code would look like. Based on the new instructions, if I asked Copilot to create a new library component to return all Publishers what would that code look like?
  ```

4. Revisa el código que propone Copilot. Observa los comentarios de documentación TSDoc y el comentario de cabecera de archivo que incluye, exactamente lo que solicitan las instrucciones actualizadas.

Ya has actualizado los archivos de instrucciones del proyecto y has comprobado el efecto que tendrán.

## Abrir y combinar la solicitud de incorporación de cambios

Los archivos de instrucciones pasan a ser recursos del repositorio y, por tanto, se comparten con el resto del equipo. Vamos a crear una solicitud de incorporación de cambios con nuestro trabajo, igual que haríamos con cualquier otro recurso.

1. En la esquina superior derecha, selecciona **Create PR**.
2. Si se solicita, selecciona **Sign in with your browser** y sigue las indicaciones para autenticarte.
3. Copilot comenzará a crear la solicitud de incorporación de cambios.

Una vez creada, Copilot supervisará los flujos de trabajo del repositorio que deban ejecutarse. Después de unos instantes, el botón de la esquina superior derecha cambiará a **Ready to merge**. Esto indica que la solicitud está lista para combinarse.

4. Selecciona **Ready to merge**.
5. Selecciona **Merge pull request** en el nuevo cuadro de diálogo para combinar la solicitud.

> [!NOTE]
> Una vez combinado el estándar en la rama predeterminada, pasa a formar parte del proyecto para todo el equipo y para cada sesión nueva. Cuando inicies la sesión de filtrado de la siguiente lección desde una rama predeterminada actualizada, el agente seguirá este estándar automáticamente. Verás que el código TypeScript que genera incluye comentarios de documentación TSDoc sin que se lo pidas: una demostración pequeña pero real de cómo las instrucciones determinan el código generado.

## Resumen y pasos siguientes

Has explorado cómo la aplicación obtiene contexto de los archivos de instrucciones y, después, has utilizado una sesión para añadir y combinar un estándar para todo el repositorio. En concreto:

- has explorado el archivo `copilot-instructions.md` del repositorio y los archivos `*.instructions.md` limitados por ruta.
- has iniciado una sesión desde la incidencia sobre instrucciones de la lista de trabajo pendiente.
- has pedido al agente que añada un estándar de documentación a `.github/copilot-instructions.md`.
- has revisado el cambio y lo has combinado como una solicitud de incorporación de cambios.

A continuación, crearás la funcionalidad de filtrado en una sesión nueva y comprobarás cómo adopta el estándar que acabas de combinar. Continúa con la [Lección 4 - Crear una funcionalidad con Autopilot][next-lesson].

## Recursos

- [Archivos de instrucciones para personalizar GitHub Copilot][instruction-files]
- [Personalizar la aplicación GitHub Copilot][customize-app]
- [Procedimientos recomendados para crear instrucciones personalizadas][instructions-best-practices]
- [Awesome Copilot: colección de archivos de instrucciones y otros recursos][awesome-copilot]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/4-build-filtering/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests