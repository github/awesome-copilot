---
title: "Aplicación GitHub Copilot"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

La [**aplicación GitHub Copilot**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) es una aplicación de escritorio basada en Copilot CLI que reúne el desarrollo dirigido por agentes en un único espacio de trabajo específico. Añade sesiones de agente en paralelo, modos de sesión intercambiables, lienzos compartidos y gestión nativa de incidencias y solicitudes de incorporación de cambios de GitHub, incluido **Agent Merge**, que guía una solicitud durante reorganizaciones de base, comentarios de revisión, correcciones de CI y la combinación.

A lo largo de estas lecciones instalarás la aplicación y configurarás el proyecto. Después, conocerás el espacio de trabajo de la aplicación y la lista de trabajo pendiente que la plantilla ha creado para ti. Empezarás con un cambio pequeño, añadir una valoración por estrellas, y luego añadirás desde una incidencia un estándar de instrucciones personalizadas, crearás una funcionalidad de filtrado en una sesión de agente aislada y la verificarás con una habilidad reutilizable. Añadirás el servidor MCP de Playwright para explorar la funcionalidad en un navegador real y avanzarás por niveles crecientes de automatización de combinaciones hasta que **Agent Merge** incorpore la solicitud. Por último, colaborarás en un lienzo compartido y automatizarás el trabajo recurrente: un ciclo completo desde la idea hasta una funcionalidad combinada.

## Lecciones

| Lección | Tema | Descripción |
|--------|-------|-------------|
| [0. Requisitos previos][ex0] | Configuración | Instala Node.js y crea tu copia del proyecto Tailspin Toys |
| [1. Instalar la aplicación Copilot][ex1] | Configuración | Instala la aplicación, conecta el proyecto y familiarízate con el espacio de trabajo |
| [2. Ejecutar tu primera sesión de agente][ex2] | Primer cambio | Inicia una sesión y publica un pequeño cambio como tu primera solicitud de incorporación de cambios |
| [3. Guiar a Copilot con instrucciones personalizadas][ex3] | Contexto | Añade un estándar de documentación desde una incidencia y combínalo |
| [4. Crear una funcionalidad con Autopilot][ex4] | Funcionalidad principal | Utiliza Plan y Autopilot para crear el filtrado y verifícalo con una habilidad |
| [5. Realizar pruebas con MCP de Playwright][ex5] | Herramientas externas | Añade el servidor MCP de Playwright y explora la funcionalidad en un navegador |
| [6. Combinar cambios con Agent Merge][ex6] | Combinación | Deja que Agent Merge corrija e incorpore la solicitud de filtrado |
| [7. Planificar con lienzos][ex7] | Colaboración | Crea un lienzo compartido para planificar y realizar el seguimiento del trabajo |
| [8. Repaso y pasos siguientes][ex8] | Resumen | Automatiza tareas recurrentes y descubre cómo continuar |

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
[ex3]: /es-es/learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /es-es/learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /es-es/learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /es-es/learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /es-es/learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /es-es/learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students