---
title: "Aplicación GitHub Copilot"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

La [**aplicación GitHub Copilot**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) es una aplicación de escritorio basada en Copilot CLI que reúne el desarrollo dirigido por agentes en un único espacio de trabajo específico. Añade sesiones de agente en paralelo, modos de sesión intercambiables, lienzos compartidos y gestión nativa de incidencias y solicitudes de incorporación de cambios de GitHub, incluido **Agent Merge**, que guía una solicitud durante reorganizaciones de base, comentarios de revisión, correcciones de CI y la combinación.

El taller sigue un único flujo continuo de Tailspin Toys:

1. Prepara el proyecto, instala la aplicación, conecta el repositorio y explora el espacio de trabajo y la lista de trabajo pendiente inicial.
2. Realiza un cambio específico de valoraciones por estrellas, revísalo en el navegador y combina manualmente tu primera solicitud de incorporación de cambios (PR).
3. Parte de la incidencia de filtrado, define el enfoque en modo **Plan**, desarróllalo en modo **Autopilot** y revísalo en modo **Interactive**.
4. Actualiza las instrucciones del repositorio y aplícalas al trabajo de filtrado.
5. Personaliza la habilidad `quality-checks` existente y úsala para ejecutar las comprobaciones del proyecto.
6. Añade el servidor Model Context Protocol (MCP) de Playwright y úsalo para explorar el filtrado en un navegador.
7. Crea un agente personalizado de control de calidad (QA) y úsalo para revisar los requisitos, la cobertura y las pruebas de verificación.
8. Revisa el cambio completo de filtrado y utiliza Agent Merge para la segunda PR.
9. Usa el lienzo Database Explorer existente y, después, crea y prueba un lienzo de clasificación respaldado por el repositorio.

Para mantener el taller centrado, crearás dos PR: una para las valoraciones por estrellas y otra para el filtrado con las actualizaciones de instrucciones y de la habilidad, el perfil QA y las pruebas. Empieza cada una desde `main` actualizado. El flujo de filtrado y calidad comparte una sesión, un worktree y una rama para que puedas aprovechar el trabajo realizado mientras exploras cada herramienta. El ejercicio final del lienzo permanece en su propia sesión para que puedas centrarte en crear y probar la superficie compartida en lugar de repetir el flujo de PR.

## Lecciones

| Lección | Tema | Descripción |
|--------|-------|-------------|
| [0. Requisitos previos][ex0] | Configuración | Instala Node.js y crea tu copia del proyecto Tailspin Toys |
| [1. Instalar la aplicación Copilot][ex1] | Configuración | Instala la aplicación, conecta el proyecto y familiarízate con el espacio de trabajo |
| [2. Añadir valoraciones por estrellas: una mejora rápida][ex2] | Primer cambio | Muestra las valoraciones existentes y la alternativa para null y combina la PR 1 |
| [3. Modos de agente: Plan y Autopilot][ex3] | Modos de agente | Planifica la funcionalidad desde su incidencia, desarróllala con Autopilot y revísala en modo Interactive |
| [4. Guiar a Copilot con instrucciones personalizadas][ex4] | Contexto | Explora y actualiza las instrucciones y aplícalas al filtrado |
| [5. Personalizar y utilizar una habilidad quality-checks][ex5] | Comprobaciones repetibles | Explora la habilidad existente, cambia el formato de su informe y ejecútala |
| [6. Validar la funcionalidad con MCP de Playwright][ex6] | Observación en el navegador | Configura MCP mediante Customize y examina el comportamiento del filtrado |
| [7. Crear y utilizar un agente QA][ex7] | Requisitos y cobertura | Crea y selecciona un perfil especializado y reúne las pruebas de verificación finales |
| [8. Crear y combinar la PR de la funcionalidad][ex8] | Revisión y combinación | Revisa el filtrado, las instrucciones, la habilidad, el perfil QA y las pruebas y utiliza Agent Merge para la segunda PR |
| [9. Explorar y crear lienzos][ex9] | Colaboración | Usa Database Explorer y, después, crea y prueba un lienzo de clasificación respaldado por el repositorio |
| [10. Repaso y pasos siguientes][ex10] | Resumen | Revisa el flujo, los recursos creados y otros materiales |

## Requisitos previos

Antes de asistir a este taller, asegúrate de disponer de:

- [ ] Una cuenta de GitHub con un plan **Copilot Student, Pro, Pro+, Business o Enterprise** activo
- [ ] Un ordenador con **macOS, Linux o Windows**
- [ ] [Git instalado][install-git] en el ordenador

> [!TIP]
> ¿No tienes un plan de pago? Los estudiantes verificados pueden obtener GitHub Copilot gratis mediante [GitHub Education][callout-student-plan-education]. El plan **Copilot Student** incluye el agente, MCP, la revisión de código y las funcionalidades de Copilot CLI que se utilizan en este taller, por lo que permite completar todos los recorridos.

> [!NOTE]
> Como la aplicación Copilot se ejecuta en tu propio equipo y no en un codespace, la [Lección 0][ex0] explica cómo instalar Node.js y crear tu copia del proyecto antes de instalar la aplicación.

> [!NOTE]
> Si utilizas Copilot Business o Copilot Enterprise, el administrador debe habilitar la directiva **Copilot CLI** para que puedas utilizar la aplicación.

## Comenzar

[**Empieza por la Lección 0: Requisitos previos →**][ex0]

[ex0]: /es-es/learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /es-es/learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /es-es/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /es-es/learning-hub/copilot-workshops/app/3-agent-modes/
[ex4]: /es-es/learning-hub/copilot-workshops/app/4-custom-instructions/
[ex5]: /es-es/learning-hub/copilot-workshops/app/5-agent-skills/
[ex6]: /es-es/learning-hub/copilot-workshops/app/6-mcp-playwright/
[ex7]: /es-es/learning-hub/copilot-workshops/app/7-qa-agent/
[ex8]: /es-es/learning-hub/copilot-workshops/app/8-create-pull-request/
[ex9]: /es-es/learning-hub/copilot-workshops/app/9-canvases/
[ex10]: /es-es/learning-hub/copilot-workshops/app/10-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students