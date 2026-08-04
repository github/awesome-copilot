---
title: "Lección 4 - Crear una funcionalidad con Autopilot"
description: "Utiliza los modos Plan y Autopilot de la aplicación GitHub Copilot para crear una funcionalidad de filtrado estática en el cliente, comprobar que hereda el estándar de documentación y verificarla con una habilidad de agente."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Hasta ahora hemos realizado un par de pequeñas actualizaciones en el proyecto. Sin embargo, los cambios más amplios requieren un proceso más sólido. La aplicación GitHub Copilot está diseñada para integrarse en nuestro flujo actual y garantizar que creemos lo correcto de la forma adecuada. Esta es la primera de tres lecciones en las que seguirás un proceso de desarrollo habitual: empezarás por utilizar una incidencia para generar una funcionalidad nueva y una habilidad de agente para ejecutar las pruebas de validación y los linters.

En esta lección:

- iniciarás una sesión nueva desde la incidencia sobre filtrado.
- utilizarás el modo **Plan** para planificar la funcionalidad y, después, **Autopilot** para crearla.
- confirmarás que el código generado sigue el estándar de documentación que combinaste anteriormente.
- verificarás el trabajo con la habilidad `quality-checks` del proyecto.

## Escenario

La página de inicio muestra todos los juegos, pero los visitantes no pueden restringir la lista. La incidencia sobre filtrado solicita que puedan filtrar los juegos por **categoría** y **editor**. Vamos a utilizar Copilot para implementar esta funcionalidad.

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
- **Autopilot**: el agente trabaja de forma totalmente autónoma, escribe código, ejecuta pruebas e itera sin esperar indicaciones.

## Planificar la funcionalidad de filtrado

El mejor momento para detectar un posible problema es antes de escribir código, y una breve planificación previa es la mejor forma de hacerlo. Al planificar con Copilot, le pedirás que genere una serie de pasos y documente el enfoque que seguirá. Después podrás revisar el plan y proponer mejoras antes de permitir que Copilot genere el código a partir de él.

Vamos a abrir la incidencia, iniciar una sesión nueva y crear un plan. Para ello, cambiaremos al modo Plan y enviaremos la solicitud.

1. Selecciona **My work** en la pestaña de navegación.
2. Selecciona la incidencia titulada **Allow users to filter games by category and publisher**.
3. Selecciona **New session** en la esquina superior derecha.

   ![Vista de una incidencia en la aplicación GitHub Copilot con una flecha que señala el botón New session de la esquina superior derecha](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. Selecciona <kbd>Shift</kbd>+<kbd>Tab</kbd> hasta que el modo muestre **Plan**.

   ![Cuadro de indicaciones de la aplicación GitHub Copilot con una flecha que señala el selector de modo establecido en Plan](/images/learning-hub/copilot-workshops/app-4-plan-mode.png)

5. Envía la indicación siguiente. La incidencia sobre filtrado ya está en el contexto de esta sesión porque la has iniciado desde ella:

   ```plaintext
   Plan the work based on the requirements documented in the issue. Please ask any clarifying questions you might have as you build the plan.
   ```

6. El agente puede plantear preguntas de seguimiento mientras crea el plan. Respóndelas según cómo desarrollarías la funcionalidad.

> [!NOTE]
> Como Copilot es probabilístico, las preguntas de seguimiento exactas pueden variar. Incluso es posible que no formule ninguna. Es completamente normal.

7. Cuando termine, Copilot ofrecerá un resumen del plan. Revísalo. Debería proponer crear consultas, añadir controles de filtrado y, por supuesto, pruebas. Si quieres, proporciona comentarios para perfeccionarlo; el agente incorporará las sugerencias en una versión nueva.

## Crear la funcionalidad con Autopilot

Con el plan preparado, vamos a dejar que Copilot cree la implementación.

1. En la lista de opciones del cuadro de diálogo **Plan summary**, selecciona la opción más parecida a **Approve and implement with autopilot**.

Copilot comenzará a trabajar en la implementación.

> [!NOTE]
> Si Copilot no empieza a crear automáticamente el código necesario, puedes pedírselo con una indicación como "Go ahead and start building out the plan!".
>
> Las actualizaciones necesarias tardarán varios minutos. El agente edita y crea archivos, escribe y ejecuta pruebas e itera. Es un buen momento para repasar lo que has explorado hasta ahora o tomar algo.

## Revisar los cambios

Todo el código generado por IA debe revisarse antes de combinarlo. Vamos a revisar el código y ejecutar el sitio para comprobar que todo funciona correctamente.

1. Selecciona **Changes** en la esquina superior derecha para abrir los cambios de código.

   ![Pestañas del panel de sesión de la aplicación GitHub Copilot con una flecha que señala la pestaña Changes](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. Revisa los cambios. Deberías ver nuevos archivos de TypeScript y Astro, además de archivos de prueba. Observa que las nuevas funciones auxiliares incluyen comentarios de documentación TSDoc y un comentario de cabecera de archivo: el estándar de documentación que combinaste en la Lección 3, aplicado automáticamente sin solicitarlo.
3. En el panel de revisión situado a la derecha de la aplicación Copilot, selecciona **Terminal**. Si no aparece el botón **Terminal**, selecciona **+** (con la etiqueta **Open in panel**) y, después, **Terminal**.

   ![Botón Terminal del panel de revisión de la aplicación GitHub Copilot](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

4. Introduce el comando siguiente en la ventana de terminal para iniciar el servidor de desarrollo de la aplicación web:

   ```shell
   npm run dev
   ```

5. Cuando se inicie el servidor, lo que solo tardará un momento, abre una ventana del navegador.
6. Ve a http://localhost:4321.
7. Ahora deberías ver filtros en la página de inicio.
8. Si algo no parece correcto, puedes pedir a Copilot que lo actualice.
9. Cuando estés conforme, vuelve a la ventana de terminal.
10. Selecciona <kbd>Ctrl</kbd>+<kbd>C</kbd> para detener el servidor de desarrollo.

## Verificar el trabajo con la habilidad quality-checks

Podrías revisar visualmente las diferencias y dar el trabajo por terminado, pero el equipo ha definido un nivel de calidad y una forma repetible de comprobarlo.

Las **habilidades de agente** permiten proporcionar a Copilot directrices para realizar tareas repetibles, como ejecutar pruebas, generar compilaciones o crear solicitudes de incorporación de cambios. Una habilidad es una carpeta con instrucciones, scripts y recursos que el agente puede cargar bajo demanda. [Agent Skills es un estándar abierto][agent-skills-repo] que utilizan distintos agentes, por lo que la misma habilidad funciona en Copilot Chat en modo agente, el agente en la nube de Copilot, Copilot CLI y la aplicación GitHub Copilot.

Las habilidades se almacenan en la carpeta `.github/skills` de un proyecto o de forma global en `~/.copilot/skills`. Cada habilidad es una carpeta que contiene un archivo `SKILL.md` con frontmatter YAML, formado por un `name` y una `description`, seguido de las instrucciones en Markdown:

```yaml
---
name: quality-checks
description: Run the project's test suites and linter to verify code changes are ready to commit, push, or merge.
---
```

Las habilidades también pueden incluir subcarpetas con scripts, recursos y material de referencia. La estructura completa se describe en la [especificación de habilidades de agente][agent-skills-spec].

> [!TIP]
> Las habilidades se cargan de forma dinámica. El agente decide cuál se aplica según el campo `description`; una descripción clara y específica del escenario marca la diferencia entre una habilidad que se utiliza y otra que se ignora.

## Explorar la habilidad quality-checks

Vamos a explorar la habilidad para ver qué hace.

1. Si el panel de revisión aún no está visible, selecciona **Toggle review panel** en la esquina superior derecha para abrirlo.

   ![Barra de herramientas superior de la aplicación GitHub Copilot con una flecha que señala el botón Toggle review panel situado a la derecha de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Selecciona **+** para añadir un elemento nuevo al panel de revisión.
3. Selecciona **File**.
4. Busca `SKILL.md`.
5. Selecciona `SKILL.md .github/skills/quality-checks` en la lista de archivos para abrirlo.
6. Observa los campos `name` y `description`. La descripción indica al agente *cuándo* debe utilizar la habilidad: siempre que sea necesario probar, analizar con un linter o verificar cambios de código antes de una confirmación, un envío o una combinación.
7. Lee la habilidad. Observa que documenta qué script ejecuta cada conjunto de pruebas, como las pruebas unitarias, las pruebas de un extremo a otro de Playwright y ESLint, en qué orden y cómo depurar errores habituales. Así, el agente ejecuta las comprobaciones según el proceso del equipo en lugar de adivinarlo.

## Ejecutar las comprobaciones

En la misma sesión de filtrado, pide al agente que verifique el trabajo. No mencionarás el nombre de la habilidad; el agente la identificará a partir de la solicitud.

1. Vuelve a la aplicación Copilot.
2. Llama directamente a la habilidad mediante el comando de barra diagonal `/quality-checks` y selecciona <kbd>Enter</kbd>.
3. Siguiendo la habilidad, el agente ejecutará las pruebas unitarias, el linter y las pruebas de un extremo a otro, y comunicará los resultados. Si algo falla, pídele que corrija el problema y vuelva a ejecutar las comprobaciones hasta que todo se complete correctamente.
4. **Mantén abierta esta sesión.** En la siguiente lección añadirás el servidor MCP de Playwright y lo utilizarás para comprobar la funcionalidad de filtrado en un navegador real.

## Resumen y pasos siguientes

Has creado una funcionalidad real de principio a fin y la has verificado según el nivel de calidad del equipo. En concreto:

- has iniciado una sesión nueva desde la incidencia sobre filtrado en un proyecto actualizado.
- has utilizado el modo Plan para planificar la funcionalidad y Autopilot para crearla.
- has confirmado que la función auxiliar generada sigue el estándar de documentación que combinaste en la Lección 3.
- has verificado el trabajo con la habilidad `quality-checks`.

A continuación, conectarás el servidor MCP de Playwright y pedirás al agente que explore la funcionalidad de filtrado en un navegador real. Continúa con la [Lección 5 - Realizar pruebas con el servidor MCP de Playwright][next-lesson].

## Recursos

- [Trabajar con sesiones de agente en la aplicación GitHub Copilot][agent-sessions]
- [Acerca de Agent Skills][about-agent-skills]
- [Personalizar la aplicación GitHub Copilot][customize-app]
- [Acerca de los entornos aislados locales y en la nube para GitHub Copilot][sandboxes]

[ex0]: /es-es/learning-hub/copilot-workshops/app/0-prerequisites/
[ex2]: /es-es/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /es-es/learning-hub/copilot-workshops/app/3-custom-instructions/
[next-lesson]: /es-es/learning-hub/copilot-workshops/app/5-mcp-playwright/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-agent-skills]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[agent-skills-repo]: https://github.com/agentskills/agentskills
[agent-skills-spec]: https://agentskills.io/specification