---
title: "Lección 10 - Repaso y pasos siguientes"
description: "Repasa el flujo de la aplicación, los dos hitos de PR, los ejercicios de lienzo y las prácticas de calidad reutilizables; después, explora otros recursos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Has utilizado la aplicación GitHub Copilot durante un flujo continuo de Tailspin Toys. Has aprendido a:

- conectar un repositorio, explorar el espacio de trabajo y la lista de trabajo pendiente inicial de la aplicación y probar un chat rápido.
- iniciar una sesión específica de valoraciones por estrellas, revisar el resultado en un lienzo de navegador y combinar manualmente tu primera solicitud de incorporación de cambios (PR).
- partir de la incidencia de filtrado, definir el enfoque en modo **Plan**, desarrollarlo en modo **Autopilot** y revisarlo en modo **Interactive**.
- orientar al agente con instrucciones personalizadas y después personalizar la habilidad `quality-checks` existente y utilizarla para ejecutar pruebas unitarias, lint y comprobaciones de tipos.
- probar el trabajo con el servidor MCP de Playwright en un navegador real.
- crear y seleccionar un agente personalizado QA para evaluar requisitos, cobertura, resultados de scripts de la habilidad y pruebas de observación del navegador.
- revisar el cambio completo de filtrado y autorizar **Agent Merge** para la segunda PR.
- utilizar el lienzo Database Explorer existente y, después, crear y probar un lienzo de clasificación respaldado por el repositorio.

## Qué has entregado

El taller tiene dos hitos de PR, cada uno en su propia rama a partir de `main` actualizado:

1. **Valoraciones por estrellas:** mostrar el `starRating` existente y un estado explícito sin valoración en las tarjetas de juegos.
2. **Filtrado y flujo de calidad:** implementar el filtrado, actualizar las instrucciones y aplicarlas a la funcionalidad, personalizar el informe de `quality-checks`, crear un perfil QA e incluir las pruebas asociadas.

Desde la planificación del filtrado hasta la apertura de su PR, utilizaste la misma sesión, worktree y rama. Reunimos ese trabajo en una sola PR para agilizar el taller. Después, utilizaste Database Explorer y creaste un lienzo de clasificación respaldado por el repositorio sin repetir el flujo de PR.

## Distintos tipos de verificación

Comprobaste el código de varias formas: pruebas automatizadas, tu propia inspección en el navegador y la exploración de Copilot en el navegador mediante MCP. La habilidad `quality-checks` ejecutó pruebas unitarias, lint y comprobaciones de tipos y presentó los resultados con el nuevo formato. QA reunió esos resultados junto con una revisión de los requisitos y la cobertura de pruebas antes de la PR.

Las pruebas añadidas deben cubrir carencias reales; una ejecución QA que no necesita pruebas nuevas puede ser correcta. Las herramientas ausentes, las comprobaciones omitidas y los fallos son bloqueos visibles, no resultados satisfactorios. Revisa el código y las pruebas de verificación antes de autorizar la combinación y actualiza las afectadas después de los cambios.

## Procedimientos recomendados

El contexto y las herramientas que proporcionas a Copilot influyen en su trabajo. En este taller has actualizado instrucciones, personalizado una habilidad, creado un perfil QA, configurado un servidor MCP y creado un lienzo. Reutiliza estas personalizaciones entre sesiones y ajústalas a medida que cambien las necesidades del equipo. Las instrucciones establecen estándares, las habilidades describen tareas repetibles, los agentes personalizados definen roles especializados, los servidores MCP conectan herramientas externas y los lienzos proporcionan superficies interactivas compartidas. Revisa los cambios reales y los resultados de las herramientas, no solo el resumen del agente.

Adapta el **modo y el modelo** a la tarea. Utiliza **Plan** para razonar sobre un enfoque antes de desarrollar, **Interactive** para mantener el control durante cambios concretos y **Autopilot** solo para tareas aisladas y bien delimitadas. Elige un modelo más rápido para las modificaciones rutinarias y otro más capaz, con mayor esfuerzo de razonamiento, para el trabajo complejo.

El contexto sigue siendo tan importante como la infraestructura. Describir con claridad *qué* quieres crear, *por qué* y *cómo* cambia sustancialmente el resultado. Los chats rápidos son un buen lugar para delimitar una idea antes de dedicarle una sesión completa.

## Más opciones para explorar

Ya conoces el flujo de trabajo principal. Estas son algunas funcionalidades adicionales que merece la pena explorar:

- [**Automatizaciones**][using-automations] para tareas recurrentes o bajo demanda, como resumir el trabajo reciente. Revisa la programación, los permisos y el alcance antes de adoptar una; crear una automatización es un siguiente paso, no parte de este taller.
- **Rubber duck** para razonar sobre un problema y obtener comentarios pertinentes antes de desarrollar.
- [`/chronicle`][chronicle] para generar una narración de lo sucedido en una sesión.
- [Usar tu propia clave (BYOK)][byok] para utilizar modelos de tu propio proveedor, incluidos modelos locales mediante Ollama, Foundry Local o LM Studio.
- [Vínculos profundos][deep-links] para abrir la aplicación directamente en un repositorio, una sesión o una indicación.

## Pasos siguientes

La mejor forma de mejorar con cualquier herramienta es seguir utilizándola. Úsala para código de producción, proyectos personales o esa pequeña aplicación que llevas años pensando en crear. Comparte lo que aprendas con el equipo y aprende de sus experiencias. Y, como siempre, consulta la documentación.

Para explorar más elementos del ecosistema de GitHub Copilot, consulta el [recorrido de VS Code][vscode-harness], el [recorrido de Copilot CLI][cli-harness] o el [recorrido del agente en la nube][cloud-harness].

## Recursos

- [Acerca de la aplicación GitHub Copilot][about-copilot-app]
- [Introducción a la aplicación GitHub Copilot][getting-started]
- [Personalizar la aplicación GitHub Copilot][customize]
- [Utilizar automatizaciones][using-automations]
- [Trabajar con extensiones de lienzo][canvas-docs]

[vscode-harness]: /es-es/learning-hub/copilot-workshops/vscode/
[cli-harness]: /es-es/learning-hub/copilot-workshops/cli/
[cloud-harness]: /es-es/learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links