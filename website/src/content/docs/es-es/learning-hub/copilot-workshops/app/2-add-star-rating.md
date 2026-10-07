---
title: "Lección 2 - Añadir valoraciones por estrellas: una mejora rápida"
description: "Inicia tu primera sesión de agente en la aplicación GitHub Copilot, realiza un pequeño cambio en las tarjetas de los juegos y combínalo como tu primera solicitud de incorporación de cambios."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
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
2. Selecciona **+** junto a **Projects**.
3. Selecciona `tailspin-toys` como repositorio.
4. Elige **new working tree** y el modo **Interactive** debajo del cuadro de indicaciones. Utiliza la indicación siguiente para solicitar el cambio:

    ```plaintext
    Show each game's starRating out of 5 in the game cards on the list page. If the rating is null, show "No rating yet". Keep the card layout as it is, add tests, and run the relevant checks.
    ```

5. Pulsa <kbd>Enter</kbd> para enviar la indicación a Copilot.

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

Revisa los resultados de las comprobaciones automatizadas del agente antes de abrir un navegador. Confirma que las pruebas cubren un `starRating` numérico y la alternativa para `null`. Un requisito previo ausente o una comprobación omitida no cuentan como superados; revisa cualquier solicitud de instalación antes de aprobarla.

Por supuesto, no basta con leer el código y dar por hecho que funciona. Vamos a pedir a Copilot que abra el sitio web para examinar la interfaz actualizada. Para ello, le pediremos que inicie el sitio y lo abra en un lienzo de navegador.

> [!TIP]
> Un lienzo es un widget interactivo disponible dentro de la aplicación Copilot. Más adelante explorarás algunos personalizados e incluso crearás uno, pero por ahora utilizaremos el lienzo de navegador integrado.

1. Utiliza la siguiente indicación para pedir a Copilot que inicie la aplicación y abra la página en el lienzo de navegador:

    ```plaintext
    Start the app and open it in the browser canvas.
    ```

2. En unos instantes, la aplicación se iniciará y se abrirá una ventana de navegador dentro de la aplicación Copilot.
3. Confirma que las tarjetas de juegos valorados muestran su puntuación sobre cinco.
4. Cuando termines, pide a Copilot que detenga el servidor de desarrollo que ha iniciado para esta sesión con la indicación siguiente:

    ```plaintext
    Stop the dev server and close the browser canvas.
    ```

## Abrir y combinar tu primera solicitud de incorporación de cambios

1. Selecciona **Create PR** en la esquina superior derecha.
2. Si se solicita, selecciona **Sign in with your browser** y sigue las indicaciones para autenticarte.
3. Copilot comenzará a crear la PR.
4. Selecciona la burbuja **PR** situada justo encima del chat para abrir la solicitud en el panel de revisión. Puedes revisarla aquí según sea necesario.
5. Cuando esté lista, selecciona **Ready to merge**.
6. Selecciona **Merge pull request** en el nuevo cuadro de diálogo para combinar la solicitud.

## Resumen y pasos siguientes

Has iniciado tu primera sesión de agente y publicado tu primer cambio. En concreto:

- has iniciado una sesión de agente y aprendido cómo se estructuran las sesiones.
- has indicado al agente que realice un cambio pequeño y específico en las tarjetas de los juegos.
- has revisado el cambio en la vista de diferencias del espacio de trabajo.
- has ejecutado la aplicación en local para confirmar la valoración por estrellas en el navegador.
- has abierto la PR 1, revisado sus comprobaciones y autorizado explícitamente su combinación.

A continuación, [partirás de la incidencia de filtrado y utilizarás los modos Plan y Autopilot][next-lesson] para desarrollar una funcionalidad más amplia.

## Recursos

- [Trabajar con sesiones de agente en la aplicación GitHub Copilot][agent-sessions]
- [Acerca de la aplicación GitHub Copilot][about-copilot-app]
- [Gestionar incidencias y solicitudes de incorporación de cambios con la aplicación GitHub Copilot][managing-issues-prs]

[prior-lesson]: /es-es/learning-hub/copilot-workshops/app/1-install-copilot-app/#instalar-y-configurar-la-aplicaci%C3%B3n-github-copilot
[next-lesson]: /es-es/learning-hub/copilot-workshops/app/3-agent-modes/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests