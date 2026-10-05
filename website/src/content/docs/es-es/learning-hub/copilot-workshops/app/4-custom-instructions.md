---
title: "Lección 4 - Guiar a Copilot con instrucciones personalizadas"
description: "Explora las instrucciones del repositorio, añade un estándar de documentación y aplícalo al código de filtrado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

El contexto es fundamental al trabajar con IA generativa. Si una tarea debe realizarse de una forma concreta, conviene que esas directrices estén disponibles para Copilot. Los [archivos de instrucciones][instruction-files] describen no solo *qué* código quieres, sino también *cómo* debe estructurarse. Ahora que has creado el filtrado, explorarás las instrucciones que ha utilizado Copilot, añadirás un estándar de documentación y lo aplicarás al código.

En esta lección:

- explorarás cómo llegan al agente las instrucciones del repositorio y los archivos de instrucciones limitados por ruta.
- actualizarás el archivo de instrucciones para garantizar que se sigan los estándares de programación.
- observarás el efecto de los archivos de instrucciones en el código.

## Escenario

Como cualquier buen equipo de desarrollo, Tailspin Toys dispone de directrices y requisitos para las prácticas de desarrollo. Entre ellos se incluyen:

- Los comentarios deben explicar la intención y las decisiones no evidentes, en lugar de repetir lo que hace el código.
- Las funciones exportadas de `db/` y `src/lib/` deben documentar su propósito, parámetros y valores de retorno mediante TSDoc/JSDoc, incluido un argumento `db` inyectable cuando exista.
- Los componentes reutilizables de Astro deben documentar sus contratos de `Props`, y los comentarios deben mantenerse actualizados cuando cambie el código relacionado.
- Deben conservarse las directrices existentes de formato y lint.

Mediante los archivos de instrucciones, garantizarás que Copilot disponga de la información adecuada para realizar las tareas conforme a estas prácticas.

## Archivos de instrucciones

Las instrucciones personalizadas permiten proporcionar contexto y preferencias a Copilot para que comprenda mejor el estilo y los requisitos de programación. Esta potente funcionalidad ayuda a orientar a Copilot para obtener sugerencias y fragmentos de código más pertinentes. Puedes especificar las convenciones de programación, las bibliotecas e incluso los tipos de comentarios que prefieres incluir en el código. También puedes crear instrucciones para todo el repositorio o para tipos de archivo concretos, con contexto específico para una tarea.

Hay dos tipos de archivos de instrucciones:

- `.github/copilot-instructions.md`, un único archivo de instrucciones que se envía a Copilot con **cada** solicitud del repositorio. Debe contener información del proyecto que sea pertinente para la mayoría de las solicitudes de chat o CLI enviadas a Copilot, como la pila tecnológica, una descripción general de lo que se está creando, procedimientos recomendados y otras directrices globales.
- Los archivos `.github/instructions/*.instructions.md` se pueden crear para tareas o tipos de archivo concretos. Puedes utilizarlos para proporcionar directrices para lenguajes específicos, como TypeScript o Astro, o para tareas como crear un componente de interfaz de usuario o un nuevo conjunto de pruebas unitarias.

> [!NOTE]
> Los demás formatos de instrucciones y su compatibilidad varían según el entorno. Consulta la [referencia de compatibilidad de instrucciones personalizadas][custom-instructions-support] antes de depender de un formato concreto.

## Explorar los archivos de instrucciones personalizadas del proyecto

Para facilitar el inicio, el proyecto incluye un conjunto de archivos de instrucciones. Explora lo que ya existe antes de realizar un cambio para observar su efecto.

1. Vuelve a la sesión de la lección anterior.
2. Si el panel de revisión aún no está visible, selecciona **Toggle review panel** en la esquina superior derecha para abrirlo.

   ![Barra de herramientas superior de la aplicación GitHub Copilot con una flecha que señala el botón Toggle review panel situado a la derecha de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

3. Selecciona el icono **+** para abrir un panel nuevo.
4. Selecciona **Files**.
5. Selecciona el icono **Gear** y comprueba que **Show hidden files** esté marcado.
6. Ve a `.github/copilot-instructions.md`.
7. Explora el archivo. Observa la breve descripción del proyecto y secciones como **Agent notes**, **Code standards**, **Scripts** y **Repository Structure**. En **Code standards**, fíjate en las directrices anidadas de **GitHub Actions Workflows**. Se aplican a cualquier interacción con Copilot.
8. Ve a la carpeta `.github/instructions` y explora los archivos. Observa que hay instrucciones para archivos de Astro, la capa de datos de Drizzle, pruebas y otros elementos.
9. Abre `.github/instructions/unit-tests.instructions.md`. Observa el campo `applyTo` de la parte superior: establece un patrón glob, relativo a la raíz del repositorio, que determina a qué archivos se aplican las instrucciones. En este caso, coincidirá cualquier archivo de prueba de TypeScript, por ejemplo, uno que cumpla `**/*.test.ts`.
10. Examina las instrucciones específicas para crear pruebas unitarias en este proyecto.
11. Por último, abre `.github/instructions/drizzle.instructions.md` y desplázate hasta el final. Observa los vínculos a otros archivos de instrucciones, como `unit-tests.instructions.md`, y a archivos existentes del proyecto. De este modo puedes dividir conjuntos de instrucciones grandes en archivos más pequeños y reutilizables, y señalar a Copilot ejemplos que debe seguir al generar código. Las rutas son relativas al archivo de instrucciones, no a la raíz del repositorio.

## Actualizar los archivos de instrucciones según las directrices del equipo

Aunque los archivos existentes son un buen punto de partida, todavía hay algunas carencias. Modifiquemos el archivo principal `copilot-instructions.md` para garantizar que se añadan [comentarios TSDoc][tsdoc] a todos los archivos de TypeScript que se generen.

> [!NOTE]
> Como los archivos de instrucciones influyen mucho en el código que genera Copilot, debes asegurarte de que lo orienten con claridad. Puedes pedir a Copilot que cree una primera versión y, después, revisarla para comprobar que las actualizaciones cumplen los requisitos. También puedes consultar una [colección de archivos de instrucciones en Awesome Copilot][awesome-copilot] como punto de partida.

1. En el mismo lienzo de archivos, ve a `.github/copilot-instructions.md`.
2. Busca el encabezado **Code formatting requirements**, aproximadamente a mitad del archivo.
3. Añade lo siguiente como último punto debajo de ese encabezado:

   ```plaintext
   All new TypeScript should contain TSDocs comments for documentation purposes.
   ```

El archivo se guarda automáticamente y está listo para usarlo.

## Utilizar las directrices actualizadas

Con el archivo de instrucciones actualizado, observa su efecto en el código que genera Copilot pidiéndole que revise la actualización y realice los cambios necesarios.

> [!NOTE]
> Indicaremos explícitamente a Copilot que utilice el archivo de instrucciones porque acabamos de modificarlo. Al crear código cuando los archivos de instrucciones ya existen, Copilot los utiliza automáticamente sin que tengas que indicárselo.

1. Pide a Copilot que utilice los archivos de instrucciones para adaptar el código a los nuevos requisitos:

   ```plaintext
   We just updated our instructions and code guidance. Can you please update the code you generated to match that guidance?
   ```

2. Selecciona **Changes** en la esquina superior derecha para abrir los cambios de código.

   ![Pestañas del panel de sesión de la aplicación GitHub Copilot con una flecha que señala la pestaña Changes](/images/learning-hub/copilot-workshops/app-select-changes.png)

3. Examina los archivos de TypeScript. Observa los nuevos comentarios TSDoc generados.

## Resumen y pasos siguientes

Has explorado cómo obtiene la aplicación contexto de los archivos de instrucciones y has aplicado un nuevo estándar a la funcionalidad. En concreto:

- has explorado el archivo `copilot-instructions.md` del repositorio y los archivos `*.instructions.md` limitados por ruta.
- has actualizado el archivo de instrucciones para garantizar que se sigan los estándares de programación.
- has observado el efecto de los archivos de instrucciones en el código generado.

A continuación, [personalizarás y ejecutarás la habilidad reutilizable quality-checks][next-lesson] para garantizar que lint y las pruebas se ejecuten de forma coherente.

## Recursos

- [Archivos de instrucciones para personalizar GitHub Copilot][instruction-files]
- [Personalizar la aplicación GitHub Copilot][customize-app]
- [Procedimientos recomendados para crear instrucciones personalizadas][instructions-best-practices]
- [Awesome Copilot: colección de archivos de instrucciones y otros recursos][awesome-copilot]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/5-agent-skills/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/copilot/concepts/prompting/response-customization#writing-effective-custom-instructions
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[tsdoc]: https://tsdoc.org/
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests