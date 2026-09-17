---
title: "Lección 2 - Ejecutar tu primera sesión de agente"
description: "Inicia tu primera sesión de agente en la aplicación GitHub Copilot, realiza un pequeño cambio en las tarjetas de los juegos y combínalo como tu primera solicitud de incorporación de cambios."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

En la lección anterior recorriste el espacio de trabajo y utilizaste un chat rápido. Ahora es el momento de iniciar una **sesión de agente** y realizar el primer cambio en el proyecto. Será un cambio pequeño: los juegos ya tienen una valoración por estrellas en sus datos, pero las tarjetas de la página de inicio todavía no la muestran. Pedirás al agente que la muestre, revisarás el cambio y lo combinarás como tu primera solicitud de incorporación de cambios.

En esta lección:

- iniciarás una sesión de agente y aprenderás cómo se estructura.
- pedirás al agente que realice un cambio pequeño y específico en el proyecto.
- revisarás el cambio en la vista de diferencias del espacio de trabajo.
- ejecutarás la aplicación en local para confirmar el cambio en el navegador.
- abrirás y combinarás tu primera solicitud de incorporación de cambios.

## Escenario

Cada juego de Tailspin Toys puede tener una valoración por estrellas, que ya aparece en la página de detalles del juego. Sin embargo, las tarjetas de los juegos de la página de inicio solo muestran el título, la categoría, el editor y la descripción. Como ejercicio inicial, pedirás al agente que muestre la valoración existente en cada tarjeta. Es un cambio pequeño y autocontenido, perfecto para tu primera sesión.

## Anatomía de una sesión

Una **sesión** es una conversación con un agente que se ejecuta en su propio espacio de trabajo aislado. Cada sesión recibe un **árbol de trabajo y una rama de Git dedicados**, lo que permite ejecutar varias sesiones a la vez, por ejemplo, una para añadir una funcionalidad y otra para corregir un error, sin que sus cambios entren en conflicto. Las sesiones aparecen en la barra lateral agrupadas por repositorio; selecciona cualquiera de ellas para cambiar de sesión.

Dentro de una sesión verás tres elementos: la **conversación** con el agente, la **actividad de las herramientas** del agente mientras explora y edita archivos, y la lista de **archivos modificados** con sus diferencias.

## Iniciar una sesión y solicitar el cambio

Vamos a iniciar una sesión nueva para comenzar a explorar el proyecto e implementar la funcionalidad. En una [lección anterior][prior-lesson] añadiste el proyecto desde su repositorio de GitHub. Crearemos una sesión nueva para ese repositorio y solicitaremos el cambio.

1. Vuelve a la aplicación GitHub Copilot o ábrela.
2. Selecciona **Home screen**.
3. Comprueba que `tailspin-toys` esté seleccionado como repositorio.

   ![Cuadro de indicaciones de la aplicación GitHub Copilot con el selector de repositorio establecido en tailspin-toys y el selector de modelo debajo](/images/learning-hub/copilot-workshops/app-2-start-session.png)

4. Utiliza la indicación siguiente para solicitar el cambio:

   ```plaintext
   On the game cards, show each game's star rating. The Game type already includes a starRating field — it's a number out of 5, or null when a game hasn't been rated yet. Display it on each card in src/components/GameCard.astro, and when starRating is null show "No rating yet" instead. Keep the change small and don't restructure the card layout.
   ```

> [!NOTE]
> Observa que la indicación contiene el nombre del archivo que Copilot debe actualizar. Aunque no es necesario especificar los archivos que Copilot debe incluir en su trabajo, orientarlo ayuda a que genere el código con rapidez y reduzca el uso de tokens.

5. Selecciona <kbd>Enter</kbd> para enviar la indicación a Copilot.

La aplicación Copilot comienza por crear un árbol de trabajo nuevo, una copia aislada del proyecto. Después explora el proyecto, localiza los archivos que debe actualizar para añadir la funcionalidad y crea el código necesario. Ya has añadido una nueva funcionalidad con la aplicación Copilot.

## Revisar las diferencias

Todos los cambios generados por IA deben revisarse antes de combinarlos, incluso los más pequeños. Vamos a explorar los cambios directamente en la aplicación Copilot.

1. En la esquina superior derecha de la aplicación, selecciona **Toggle review panel**. Se abrirá la pantalla de diferencias con todos los cambios pendientes realizados por Copilot.

   ![Barra de herramientas superior de la aplicación GitHub Copilot con una flecha que señala el botón Toggle review panel situado a la derecha de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Deberías observar código añadido a `GameCard.astro`, el archivo principal que se utiliza para mostrar los detalles de los juegos. Debería ser similar al siguiente: un pequeño bloque que representa la valoración cuando existe y muestra "No rating yet" cuando `starRating` es `null`:

   ```astro
   {game.starRating !== null ? (
       <span class="text-xs font-medium px-2.5 py-0.5 rounded bg-amber-900/60 text-amber-300" data-testid="game-rating">
           ★ {game.starRating} / 5
       </span>
   ) : (
       <span class="text-xs font-medium text-slate-500" data-testid="game-rating-empty">
           No rating yet
       </span>
   )}
   ```

> [!NOTE]
> Como Copilot, al igual que todas las herramientas de IA generativa, es probabilístico y no determinista, el código exacto puede variar respecto al ejemplo anterior. No obstante, debería ser relativamente parecido.

## Comprobar los cambios

No debemos limitarnos a leer el código y dar por hecho que funciona. También debemos probarlo visualmente. Para ello, iniciaremos la aplicación desde la terminal y confirmaremos que todo funciona. La aplicación Copilot incluye una terminal integrada.

1. En el panel de revisión situado a la derecha de la aplicación Copilot, selecciona **Terminal**. Si no aparece el botón **Terminal**, selecciona **+** (con la etiqueta **Open in panel**) y, después, **Terminal**.

   ![Botón Terminal del panel de revisión de la aplicación GitHub Copilot](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

2. Introduce el comando siguiente en la ventana de terminal para iniciar el servidor de desarrollo de la aplicación web:

   ```shell
   npm run dev
   ```

3. Cuando se inicie el servidor, lo que solo tardará un momento, abre una ventana del navegador.
4. Ve a http://localhost:4321.
5. Ahora deberías ver valoraciones por estrellas en todos los juegos de la página de inicio.
6. Vuelve a la ventana de terminal.
7. Selecciona <kbd>Ctrl</kbd>+<kbd>C</kbd> para detener el servidor de desarrollo.

## Abrir y combinar tu primera solicitud de incorporación de cambios

El cambio tiene buen aspecto; ha llegado el momento de publicarlo. Pedirás al agente que abra una solicitud de incorporación de cambios y, después, la revisarás y combinarás en github.com. Por ahora, gestionarás este proceso de forma manual. En una próxima lección descubrirás cómo Copilot puede encargarse automáticamente de parte del trabajo.

1. En la esquina superior derecha, selecciona **Create PR**.
2. Si se solicita, selecciona **Sign in with your browser** y sigue las indicaciones para autenticarte.
3. Copilot comenzará a crear la solicitud de incorporación de cambios.

Una vez creada, Copilot supervisará los flujos de trabajo del repositorio que deban ejecutarse. Después de unos instantes, el botón de la esquina superior derecha cambiará a **Ready to merge**. Esto indica que la solicitud está lista para combinarse.

4. Selecciona la burbuja **PR** situada justo encima del chat para abrir la solicitud en el panel de revisión. Puedes revisarla aquí según sea necesario.
5. Cuando esté lista, selecciona **Ready to merge**.
6. Selecciona **Merge pull request** en el nuevo cuadro de diálogo para combinar la solicitud.

Ya has publicado una nueva funcionalidad en el sitio web.

## Resumen y pasos siguientes

Has iniciado tu primera sesión de agente y publicado tu primer cambio. En concreto:

- has iniciado una sesión de agente y aprendido cómo se estructuran las sesiones.
- has indicado al agente que realice un cambio pequeño y específico en las tarjetas de los juegos.
- has revisado el cambio en la vista de diferencias del espacio de trabajo.
- has ejecutado la aplicación en local para confirmar la valoración por estrellas en el navegador.
- has abierto una solicitud de incorporación de cambios y la has combinado personalmente en github.com.

A continuación, utilizarás la aplicación para añadir al repositorio un estándar de instrucciones personalizadas a partir de una de las incidencias de la lista de trabajo pendiente. Continúa con la [Lección 3 - Guiar a Copilot con instrucciones personalizadas][next-lesson].

## Recursos

- [Trabajar con sesiones de agente en la aplicación GitHub Copilot][agent-sessions]
- [Acerca de la aplicación GitHub Copilot][about-copilot-app]
- [Gestionar incidencias y solicitudes de incorporación de cambios con la aplicación GitHub Copilot][managing-issues-prs]

[prior-lesson]: /es-es/learning-hub/copilot-workshops/app/1-install-copilot-app/#instalar-y-configurar-la-aplicacion-github-copilot
[next-lesson]: /es-es/learning-hub/copilot-workshops/app/3-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests