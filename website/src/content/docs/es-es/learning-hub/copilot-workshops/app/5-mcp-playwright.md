---
title: "Lección 5 - Realizar pruebas con el servidor MCP de Playwright"
description: "Añade el servidor MCP de Playwright a la aplicación GitHub Copilot y pide al agente que pruebe manualmente la funcionalidad de filtrado en un navegador real."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

En la lección anterior creaste y verificaste la funcionalidad de filtrado con el conjunto de pruebas automatizadas del proyecto. Las pruebas automatizan la validación del código, pero permitir que el agente confirme el comportamiento también resulta muy útil. Así puede responder a los problemas que detecte en la interfaz de usuario que está creando. Vamos a explorar cómo MCP proporciona a los agentes de IA acceso a capacidades externas y a añadir el servidor MCP de Playwright para que Copilot pueda interactuar directamente con el sitio que estás desarrollando.

En esta lección:

- comprenderás qué es Model Context Protocol (MCP) y cómo lo utiliza la aplicación GitHub Copilot.
- añadirás el servidor MCP de Playwright desde la configuración de la aplicación.
- pedirás al agente que controle un navegador y explore la funcionalidad de filtrado.

## Escenario

Aunque las pruebas unitarias y de un extremo a otro son importantes, validar las actualizaciones de la interfaz de usuario requiere interactuar con ella. Quieres que Copilot pueda utilizar el sitio web en el que trabajas como lo haría un usuario para automatizar aún más los cambios y aumentar la confianza en que las actualizaciones funcionan según lo previsto.

## ¿Qué es Model Context Protocol (MCP)?

[Model Context Protocol (MCP)][mcp-blog-post] proporciona a los agentes de IA una forma de comunicarse con herramientas y servicios externos. Mediante MCP, los agentes de IA pueden comunicarse con ellos en tiempo real. Esto les permite acceder a información actualizada mediante recursos y realizar acciones en tu nombre mediante herramientas.

Se accede a estas herramientas y recursos a través de un servidor MCP, que actúa como puente entre el agente de IA y las herramientas y servicios externos. El servidor MCP gestiona la comunicación entre el agente de IA y las herramientas externas, como API existentes o herramientas locales, por ejemplo, paquetes NPM. Cada servidor MCP representa un conjunto diferente de herramientas y recursos a los que puede acceder el agente de IA.

Dos servidores MCP populares son:

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server): proporciona acceso a un conjunto de API para gestionar repositorios de GitHub. Permite al agente de IA realizar acciones como crear repositorios, actualizar los existentes y gestionar incidencias y solicitudes de incorporación de cambios.
- [**Playwright MCP Server**][playwright-mcp-server]: proporciona capacidades de automatización del navegador mediante Playwright. Permite al agente de IA realizar acciones como visitar páginas web, completar formularios y seleccionar botones.

Hay muchos otros servidores MCP que proporcionan acceso a distintas herramientas y recursos. GitHub aloja un [registro de MCP](https://github.com/mcp) para facilitar su descubrimiento y las contribuciones al ecosistema.

> [!CAUTION]
> Trata los servidores MCP como cualquier otra dependencia del proyecto. Antes de utilizar uno, revisa atentamente su código fuente, verifica el editor y considera las implicaciones de seguridad. Utiliza únicamente servidores MCP de confianza y ten cuidado al conceder acceso a recursos u operaciones confidenciales.

## Añadir el servidor MCP de Playwright

Los servidores MCP se añaden y gestionan desde la configuración de la aplicación. La aplicación incluye un catálogo de servidores populares, por lo que el [servidor MCP de Playwright][playwright-mcp-server] está a solo un par de selecciones.

1. Selecciona <kbd>Ctrl</kbd>+<kbd>,</kbd> para abrir la página de configuración de la aplicación Copilot.
2. Selecciona **MCP servers**.
3. En el cuadro de búsqueda, escribe `Playwright`.
4. Selecciona **Playwright** en la lista de **Popular MCP servers**.
5. Selecciona **Add server** para añadirlo a la lista de servidores MCP disponibles.
6. Selecciona <kbd>Esc</kbd> para cerrar el cuadro de diálogo de configuración.

Ya has añadido el servidor MCP de Playwright.

## Pedir a Copilot que explore la funcionalidad mediante Playwright

Vamos a pedir a Copilot que pruebe manualmente la funcionalidad mediante el servidor MCP de Playwright.

1. Utiliza la indicación siguiente para pedir a Copilot que valide la nueva funcionalidad:

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

Copilot iniciará un navegador mediante el servidor MCP de Playwright, recorrerá cada paso y comunicará lo que encuentre. Verás cómo abre un navegador en el sistema para realizar las tareas.

2. Compara el resumen con los criterios de aceptación de la incidencia. Si algo no parece correcto, formula preguntas de seguimiento o pide al agente que corrija el código antes de abrir una solicitud de incorporación de cambios.
3. Mantén abierta esta sesión, ya que la completaremos en la siguiente lección.

Copilot también ha validado la funcionalidad en el navegador mediante la exploración de la característica como lo haría un usuario.

## Resumen y pasos siguientes

Has utilizado el servidor MCP de Playwright para explorar la funcionalidad en un navegador real desde la aplicación GitHub Copilot. En resumen:

- has aprendido qué es Model Context Protocol (MCP) y cómo la aplicación pone a disposición las herramientas MCP.
- has añadido el servidor MCP de Playwright desde la configuración de la aplicación.
- has pedido al agente que controle un navegador y explore la funcionalidad de filtrado.

La funcionalidad está creada, verificada y en funcionamiento. Ahora toca publicarla mediante **Agent Merge**, que abrirá y combinará la solicitud de incorporación de cambios. Continúa con la [Lección 6 - Combinar cambios con Agent Merge][next-lesson].

## Recursos

- [¿Qué es MCP y por qué todo el mundo habla de él?][mcp-blog-post]
- [Servidor MCP de Playwright de Microsoft][playwright-mcp-server]
- [Configurar servidores MCP en la aplicación GitHub Copilot][customize-app]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app