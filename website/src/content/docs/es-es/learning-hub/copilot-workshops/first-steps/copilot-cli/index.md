---
title: "Primeros pasos con GitHub Copilot CLI"
description: "Realiza un recorrido guiado por GitHub Copilot CLI centrado en la terminal creando y entregando un Space Quiz."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

Realiza un recorrido práctico por GitHub Copilot CLI, pensado para principiantes. Crearás un Space Quiz lleno de color desde una carpeta vacía y aprenderás el ciclo de trabajo centrado en la terminal: crear y revisar las diferencias antes de que Git escriba nada, ejecutar sesiones en paralelo, planificar antes de editar y, después, crear y combinar la solicitud de incorporación de cambios sin salir del shell.

El taller dura aproximadamente entre 60 y 90 minutos. El proyecto utiliza un único archivo HTML sin dependencias de ejecución, así que puedes centrarte en aprender a usar la CLI y sus flujos de trabajo con agentes.

> [!NOTE]
> Este taller fue creado por [James Montemagno][james] y adaptado de [Primeros pasos con GitHub Copilot][source-lab]. El contenido original está disponible bajo la [licencia MIT][source-license].

## Lecciones

| Lección | Tema | Qué harás |
| ------ | ----- | ---------------- |
| [0. Requisitos previos y configuración][lesson-0] | Configuración | Comprueba los requisitos previos, instala Copilot CLI, inicia sesión y elige un modelo |
| [1. Crear el cuestionario][lesson-1] | Creación | Crea el cuestionario desde la terminal y realiza un cambio concreto |
| [2. Recoger las instrucciones del proyecto][lesson-2] | Instrucciones | Genera y adapta las instrucciones del agente con `/init` |
| [3. Publicar el proyecto][lesson-3] | Publicación | Inicializa, crea un commit y publica mediante un prompt o manualmente |
| [4. Trabajar en incidencias en paralelo][lesson-4] | Implementación | Crea un backlog, añade una incidencia al chat, revisa con `/diff` e inicia una segunda sesión en un árbol de trabajo |
| [5. Planificar antes de editar][lesson-5] | Planificación | Utiliza `/plan` para acordar un enfoque para la segunda incidencia |
| [6. Saber qué puede ver el agente][lesson-6] | Contexto | Inspecciona y restablece el contexto con `/context` y `/clear` |
| [7. Reanudar y acceder de forma remota][lesson-7] | Reanudación | Sal de las sesiones y vuelve a ellas con `/resume` y, opcionalmente, sigue una sesión local desde otro dispositivo con `/remote` |
| [8. Crear, revisar y combinar][lesson-8] | Revisión | Crea y combina una solicitud de incorporación de cambios con `/pr create` y `/pr agentmerge` |
| [9. Delegar trabajo][lesson-9] | Delegación | Entrega una nueva funcionalidad a `/delegate` y sigue una sesión en la nube |
| [10. Repaso y pasos siguientes][lesson-10] | Repaso | Repasa el flujo de trabajo y sigue aprendiendo |

## Primeros pasos

[Empieza con la lección 0: Requisitos previos y configuración][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
