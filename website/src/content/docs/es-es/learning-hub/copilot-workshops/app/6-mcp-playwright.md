---
title: "Lección 6 - Validar la funcionalidad con MCP de Playwright"
description: "Configura MCP de Playwright mediante Customize y observa el filtrado en un navegador desde el worktree existente de la funcionalidad."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Como ya hemos destacado, escribir código implica mucho más que limitarse a escribirlo. Necesitamos trabajar con datos y servicios externos e incluso permitir que Copilot disponga de automatizaciones adicionales. Aquí es donde entran en juego los servidores MCP. Estos permiten a Copilot ir más allá de lo que incorpora la aplicación y le proporcionan aún más herramientas y servicios.

En esta lección:

- comprenderás qué es Model Context Protocol (MCP) y cómo lo utiliza la aplicación GitHub Copilot.
- añadirás el servidor MCP de Playwright.
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

Los servidores MCP se gestionan desde **Customize** en la barra lateral. Los servidores configurados para tus repositorios o Copilot CLI pueden estar ya disponibles en la aplicación, así que compruébalo antes de añadir un duplicado. La [documentación de personalización de la aplicación][customize-app] explica las opciones disponibles.

1. Selecciona **Customize** en la barra lateral.
2. Selecciona **MCP** y comprueba en **Installed** si ya existe un servidor de Playwright.
3. Si es necesario, busca **Playwright** entre los servidores disponibles o utiliza el procedimiento de servidor personalizado documentado por el editor.
4. Revisa el editor, la configuración y cualquier solicitud de instalación antes de aprobarla. Sigue las indicaciones para añadir el servidor; las directivas de la organización o la falta de requisitos previos pueden bloquear la configuración.
5. Vuelve a la sesión de filtrado en modo **Interactive** y confirma que las herramientas MCP de Playwright están disponibles.

Si la configuración falla, resuelve el problema de configuración o permisos antes de continuar.

## Pedir a Copilot que explore la funcionalidad mediante Playwright

La incidencia y tus decisiones de planificación ya están en el contexto. Detén cualquier servidor de desarrollo que hayas iniciado antes de pedir a Copilot que inicie uno.

1. Utiliza la indicación siguiente para pedir a Copilot que valide la nueva funcionalidad:

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

  > [!NOTE]
  > No es obligatorio indicar a Copilot que utilice un servidor MCP concreto; normalmente encontrará el adecuado según el contexto actual. Sin embargo, nunca está de más indicarle algo que consideras importante.

  2. Observa cómo trabaja.

  Copilot iniciará el servidor, abrirá un navegador e interactuará con el sitio web. Cuando termine, detendrá el servidor y te proporcionará un informe.

## Resumen y pasos siguientes

Has utilizado el servidor MCP de Playwright para explorar la funcionalidad en un navegador real desde la aplicación GitHub Copilot. En concreto:

- has aprendido qué es Model Context Protocol (MCP) y cómo lo utiliza la aplicación GitHub Copilot.
- has añadido el servidor MCP de Playwright.
- has pedido al agente que controle un navegador y explore la funcionalidad de filtrado.

A continuación, [crearás un agente personalizado de QA][next-lesson] que reúne la habilidad y las herramientas del navegador en un rol especializado.

## Recursos

- [¿Qué es MCP y por qué todo el mundo habla de él?][mcp-blog-post]
- [Servidor MCP de Playwright de Microsoft][playwright-mcp-server]
- [Configurar servidores MCP en la aplicación GitHub Copilot][customize-app]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app