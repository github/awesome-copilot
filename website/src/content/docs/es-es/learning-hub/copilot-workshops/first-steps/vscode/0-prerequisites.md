---
title: "Lección 0 - Requisitos previos y configuración"
description: "Comprueba los requisitos previos del taller, confirma que Copilot Chat funciona en VS Code, añade la extensión GitHub Pull Requests and Issues y elige un modelo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Incorpora Copilot al editor. Copilot viene incluido en VS Code, así que no hay nada que instalar para el chat. Añade la extensión de GitHub y abre una carpeta vacía.

En esta lección:

- comprobarás los requisitos previos del taller.
- confirmarás que Copilot Chat responde en VS Code.
- instalarás la extensión GitHub Pull Requests and Issues.
- abrirás una carpeta de proyecto vacía y elegirás un modelo.

## Requisitos previos

Necesitas:

- una cuenta de GitHub. [Crea una cuenta de GitHub][github-signup] o utiliza tu cuenta existente.
- un plan activo de Copilot. [Activa Copilot Free o un plan de pago de Copilot][copilot-plans]. Si tu organización ya te proporciona acceso a Copilot, utiliza esa cuenta.
- [Visual Studio Code][vscode].
- [Git][git] instalado. Ejecuta `git --version` en una terminal para comprobarlo.

## Configura VS Code

1. Instala [VS Code][vscode] e inicia sesión en GitHub. Copilot y Copilot Chat están integrados, así que abre la vista **Chat** desde la barra de título y confirma que responde.
2. Abre la vista **Extensions** e instala la extensión oficial [GitHub Pull Requests and Issues][pr-extension] para que las incidencias y las solicitudes de incorporación de cambios aparezcan en la barra lateral.
3. Crea una carpeta vacía llamada `space-quiz`, selecciona **File** > **Open Folder** y ábrela.
4. Elige un modelo con el selector de modelos de la vista **Chat**, siguiendo el orden de preferencia de la siguiente sección.

## Elige un modelo

Selecciona la primera opción que tengas disponible:

1. **GPT-6-Luna** (recomendado).
2. **Auto**, como alternativa equilibrada.
3. Cualquier modelo de la [lista de modelos activos][active-models].

La disponibilidad de los modelos depende de tu plan, de la directiva de la organización y de la versión del producto.

## Resumen y pasos siguientes

VS Code está listo con Copilot Chat, la extensión de GitHub y una carpeta `space-quiz` vacía. Continúa con la [lección 1: Crear en el área de trabajo][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[vscode]: https://code.visualstudio.com/
[git]: https://git-scm.com/downloads
[pr-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
