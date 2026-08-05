---
title: "Lección 8 - Repaso y pasos siguientes"
description: "Repasa el recorrido de la aplicación GitHub Copilot, automatiza el trabajo recurrente y descubre cómo continuar."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Durante las últimas lecciones, has llevado una funcionalidad desde la idea hasta la combinación mediante la aplicación GitHub Copilot. Entre otras cosas, has aprendido a:

- conectar un repositorio y familiarizarte con el espacio de trabajo de la aplicación y la lista de trabajo pendiente inicial.
- iniciar sesiones desde una tarea directa y desde incidencias, y utilizar los modos Plan y Autopilot para controlar cómo trabaja el agente.
- orientar al agente con instrucciones personalizadas y una habilidad reutilizable.
- probar el trabajo con el servidor MCP de Playwright en un navegador real.
- colaborar con el agente en un lienzo compartido.
- publicar cambios con niveles crecientes de automatización de combinaciones, desde combinarlos personalmente en github.com hasta permitir que **Agent Merge** incorpore una solicitud de cambios.

Vamos a automatizar parte del trabajo recurrente, comentar procedimientos recomendados y descubrir cómo continuar.

## Automatizar el trabajo recurrente

La aplicación puede ejecutar agentes según una programación o bajo demanda mediante **automatizaciones**, una opción muy útil para tareas rutinarias como clasificar incidencias nuevas o resumir la actividad reciente. Vamos a crear una automatización sencilla y no destructiva.

1. Selecciona **Automations** en la barra lateral y, después, **New automation**.
2. Asigna un nombre, como `Recap my recent work`.
3. Elige un desencadenador. **Manual** permite ejecutarla bajo demanda; **On a schedule** la ejecuta automáticamente; **When an issue is created** responde a incidencias nuevas. Para esta lección, elige **Manual**.
4. Introduce una indicación de solo lectura para que la automatización no pueda modificar nada, por ejemplo:

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. Elige el proyecto, tu repositorio de Tailspin Toys, y crea la automatización.
6. Ejecútala bajo demanda para ver el resultado.

> [!TIP]
> Las automatizaciones pueden ejecutarse en local o en la nube. Habilita **Run in the cloud** y elige las **Tools** que puede utilizar una automatización cuando quieras que se ejecute sin supervisión según una programación. Mantén las automatizaciones programadas bien delimitadas y sin acciones destructivas hasta que confíes en sus resultados.

## Procedimientos recomendados

Al utilizar cualquier herramienta de IA, la infraestructura que la rodea determina la calidad de los resultados. Los archivos de instrucciones, las habilidades y los agentes personalizados han contribuido al trabajo de este taller. Invierte en ellos y reutilízalos entre sesiones.

Adapta el **modo y el modelo** a la tarea. Utiliza **Plan** para razonar sobre un enfoque antes de desarrollar, **Interactive** para mantener el control durante cambios concretos y **Autopilot** solo para tareas aisladas y bien delimitadas. Elige un modelo más rápido para las modificaciones rutinarias y otro más capaz, con mayor esfuerzo de razonamiento, para el trabajo complejo.

El contexto sigue siendo tan importante como la infraestructura. Describir con claridad *qué* quieres crear, *por qué* y *cómo* cambia sustancialmente el resultado. Los chats rápidos son un buen lugar para delimitar una idea antes de dedicarle una sesión completa.

## Más opciones para explorar

Ya conoces el flujo de trabajo principal. Estas son algunas funcionalidades adicionales que merece la pena explorar:

- **Quick chats** para preguntas rápidas y desechables que no necesitan una sesión completa.
- **Rubber duck** para razonar sobre un problema y obtener comentarios pertinentes antes de desarrollar.
- [**Agentes personalizados**][custom-agents] para encapsular un rol, sus herramientas y sus instrucciones con el fin de realizar trabajo especializado y repetible.
- [`/chronicle`][chronicle] para generar una narración de lo sucedido en una sesión.
- [Usar tu propia clave (BYOK)][byok] para utilizar modelos de tu propio proveedor, incluidos modelos locales mediante Ollama, Foundry Local o LM Studio.
- [Entornos aislados en la nube][sandboxes] para ejecutar sesiones en un entorno aislado hospedado en GitHub.
- [Vínculos profundos][deep-links] para abrir la aplicación directamente en un repositorio, una sesión o una indicación.

## Pasos siguientes

La mejor forma de mejorar con cualquier herramienta es seguir utilizándola. Úsala para código de producción, proyectos personales o esa pequeña aplicación que llevas años pensando en crear. Comparte lo que aprendas con el equipo y aprende de sus experiencias. Y, como siempre, consulta la documentación.

Para explorar más elementos del ecosistema de GitHub Copilot, consulta el [recorrido de VS Code](/es-es/learning-hub/copilot-workshops/vscode/), el [recorrido de Copilot CLI](/es-es/learning-hub/copilot-workshops/cli/) o el [recorrido del agente en la nube](/es-es/learning-hub/copilot-workshops/cloud/).

## Recursos

- [Acerca de la aplicación GitHub Copilot][about-copilot-app]
- [Introducción a la aplicación GitHub Copilot][getting-started]
- [Personalizar la aplicación GitHub Copilot][customize]
- [Utilizar automatizaciones][using-automations]
- [Trabajar con extensiones de lienzo][canvas-docs]
- [Acerca de los entornos aislados locales y en la nube][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links