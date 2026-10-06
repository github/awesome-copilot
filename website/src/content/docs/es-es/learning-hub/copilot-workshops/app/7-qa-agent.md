---
title: "Lección 7 - Crear y utilizar un agente de QA"
description: "Crea un perfil de QA que parta de los requisitos y combine cobertura de pruebas, la habilidad quality-checks y observaciones directas del navegador."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Has utilizado la habilidad `quality-checks` para ejecutar comprobaciones automatizadas y MCP de Playwright para observar la experiencia de filtrado en un navegador. Ahora reunirás estas capacidades en un agente personalizado con un proceso de QA claramente definido.

En esta lección:

- comprenderás cómo trabaja un agente personalizado con instrucciones, habilidades y herramientas MCP.
- crearás y examinarás un perfil de QA reutilizable.
- seleccionarás el agente de QA y revisarás sus conclusiones frente a la incidencia de filtrado.

## Escenario

Tailspin Toys quiere revisar de forma coherente los requisitos, la calidad del código, las comprobaciones automatizadas, la cobertura de pruebas y el comportamiento en el navegador antes de abrir una solicitud de incorporación de cambios (PR). Un agente personalizado puede coordinar ese proceso de QA y proporcionar un informe reutilizable.

## ¿Qué es un agente personalizado?

Un agente personalizado es una versión especializada de Copilot definida en un perfil Markdown. El perfil describe el propósito, las instrucciones y las herramientas disponibles del agente. En este taller, definirás un rol de QA en `.github/agents/qa.agent.md` y lo seleccionarás en la aplicación.

Las personalizaciones que has creado tienen funciones distintas. Las instrucciones del repositorio describen los estándares del equipo. La habilidad quality-checks reúne comprobaciones repetibles. MCP de Playwright proporciona herramientas de navegador. El perfil de QA indica a Copilot cómo usar esas capacidades para evaluar requisitos e informar de sus conclusiones. No las sustituye ni requiere otra sesión de agente.

## Crear el perfil de QA

Antes de abrir la PR de la funcionalidad, pedirás a Copilot que cree un perfil de QA reutilizable. El perfil definirá tanto las comprobaciones que realiza QA como los límites que debe respetar.

1. Confirma que la sesión está en modo **Interactive**.
2. Envía la siguiente indicación a Copilot para crear el nuevo agente personalizado:

    ```plaintext
    Create a custom agent named QA in .github/agents/qa.agent.md. It should check features against their issues and agreed requirements, follow the repository instructions, run the quality-checks skill, use Playwright MCP to verify behavior, and add tests when coverage is missing.

    Have it report each requirement as pass, fail, or blocked with supporting evidence. It must ask before changing implementation code, and it must not commit changes or open pull requests. Use the current model and available tools. Just create the profile for now so I can review it.
    ```

## Examinar el perfil

1. Abre **Changes** y selecciona `.github/agents/qa.agent.md`.
2. Lee el frontmatter. `description` es obligatorio; `name` es opcional, pero incluirlo proporciona al agente un nombre visible claro.
3. Lee las instrucciones del perfil y confirma que QA parte de los requisitos, sigue las instrucciones del repositorio, ejecuta la habilidad `quality-checks` y utiliza MCP de Playwright.
4. Confirma que QA aporta pruebas de verificación, pregunta antes de cambiar el código de implementación y no crea commits ni abre solicitudes de incorporación de cambios.
5. Si al perfil generado le falta alguna de estas responsabilidades o límites, pide al agente general de Copilot que lo revise antes de continuar.

## Ejecutar QA frente a la incidencia

Después de revisar el perfil, selecciona QA en la sesión actual para que pueda utilizar la incidencia de filtrado y las decisiones de planificación que ya contiene el contexto. Confirma el agente activo antes de pedirle que inicie la revisión.

1. En la sesión actual, abre el selector de agentes del cuadro de indicaciones.
2. Selecciona **QA** y verifica que la aplicación identifica visiblemente a **QA** como agente activo antes de enviar la indicación de ejecución.
3. Envía la indicación siguiente para pedir a QA que revise la funcionalidad:

    ```plaintext
    Review the filtering feature against the issue and the decisions in our plan. Is it ready for a PR?
    ```

4. Confirma que QA utiliza la incidencia y las decisiones de planificación correctas. Proporciona la URL de la incidencia o el contexto que falte si lo solicita.
5. Lee el informe que proporciona cuando termina el trabajo.

## Resumen y pasos siguientes

Has añadido un rol especializado reutilizable al flujo de trabajo y has revisado su trabajo. En esta lección:

- has explorado cómo trabaja un agente personalizado con instrucciones, habilidades y herramientas MCP.
- has creado y examinado un perfil de QA reutilizable que parte de los requisitos.
- has seleccionado el agente QA y revisado sus conclusiones frente a la incidencia de filtrado.

Ya tienes la implementación, la actualización de la habilidad, el perfil de QA, las pruebas y el informe de verificación listos para revisar. Continúa con la [Lección 8 - Crear y combinar la PR de la funcionalidad][next-lesson] para reunirlos y utilizar Agent Merge.

## Recursos

- [Personalizar la aplicación GitHub Copilot, incluida la selección de agentes personalizados][customize-app]

[next-lesson]: /es-es/learning-hub/copilot-workshops/app/8-create-pull-request/
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
