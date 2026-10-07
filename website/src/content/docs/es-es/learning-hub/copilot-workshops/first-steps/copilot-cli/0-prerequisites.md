---
title: "Lección 0 - Requisitos previos y configuración"
description: "Comprueba los requisitos previos del taller, instala GitHub Copilot CLI, inicia sesión y elige un modelo desde una carpeta de proyecto vacía."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Incorpora un agente a tu terminal. Confirma que tienes lo necesario, instala GitHub Copilot CLI, inicia sesión y prepárate para hacer tu primera solicitud desde una carpeta vacía.

En esta lección:

- comprobarás los requisitos previos del taller.
- instalarás GitHub Copilot CLI e iniciarás sesión.
- crearás la carpeta del proyecto y la marcarás como de confianza.
- elegirás un modelo para la sesión.

## Requisitos previos

Necesitas:

- una cuenta de GitHub. [Crea una cuenta de GitHub][github-signup] o utiliza tu cuenta existente.
- un plan activo de Copilot. [Activa Copilot Free o un plan de pago de Copilot][copilot-plans]. Si tu organización ya te proporciona acceso a Copilot, utiliza esa cuenta.
- [Git][git] instalado. Ejecuta `git --version` para comprobarlo.
- un ordenador con macOS, Windows o Linux.

La [GitHub CLI][gh-cli] (`gh`) es opcional, pero recomendable, porque permite que el agente cree repositorios y solicitudes de incorporación de cambios por ti.

> [!NOTE]
> Si utilizas Copilot Business o Copilot Enterprise, tu administrador debe habilitar la directiva **Copilot CLI** para que funcionen las sesiones de agente.

## Configura la CLI

1. Instala [GitHub Copilot CLI][install-cli] para tu plataforma.
2. Crea la carpeta del proyecto y entra en ella:

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. Ejecuta `copilot`, inicia sesión y marca la carpeta como de confianza cuando se te solicite.
4. Ejecuta `/model` y elige un modelo siguiendo el orden de preferencia de la siguiente sección.
5. Opcionalmente, instala la [GitHub CLI][gh-cli] si aún no lo has hecho.

![Ilustración de Copilot CLI en una ventana de terminal titulada space-quiz. Pregunta si se debe confiar en los archivos de esta carpeta, con Yes, proceed seleccionado, y sugiere el comando /model para elegir el modelo de la sesión y /help para enumerar todos los comandos de barra. La línea del prompt dice Create a space exploration quiz.](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

La CLI se abre con una solicitud para confiar en la carpeta y algunos comandos iniciales, incluido `/model`.

> [!TIP]
> Escribe `/` en cualquier momento para explorar todos los comandos disponibles o ejecuta `/help` para consultar la referencia completa.

## Elige un modelo

Sigue este orden de preferencia al ejecutar `/model` y selecciona la primera opción que tengas disponible:

1. **GPT-6-Luna** (recomendado).
2. **Auto**, como alternativa equilibrada.
3. Cualquier modelo de la [lista de modelos activos][active-models].

La disponibilidad de los modelos depende de tu plan, de la directiva de la organización y de la versión del producto.

## Resumen y pasos siguientes

Copilot CLI está instalado y ejecutándose en una carpeta `space-quiz` vacía, y has iniciado sesión. Continúa con la [lección 1: Crear el cuestionario desde la terminal][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
