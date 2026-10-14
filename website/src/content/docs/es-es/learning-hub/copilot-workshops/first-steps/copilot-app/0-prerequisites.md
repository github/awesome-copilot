---
title: "Lección 0 - Requisitos previos y configuración"
description: "Comprueba los requisitos previos del taller, instala la aplicación GitHub Copilot y familiarízate con su área de trabajo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Antes de crear el Space Quiz, confirma que tienes lo necesario, instala la aplicación GitHub Copilot y familiarízate con su área de trabajo.

En esta lección:

- comprobarás los requisitos previos del taller.
- instalarás la aplicación GitHub Copilot e iniciarás sesión.
- elegirás un modelo para las sesiones.
- identificarás las principales áreas de trabajo de la aplicación.
- probarás un chat rápido.

## Requisitos previos

Necesitas:

- una cuenta de GitHub. [Crea una cuenta de GitHub][github-signup] o utiliza tu cuenta existente.
- un plan activo de Copilot. [Activa Copilot Free o un plan de pago de Copilot][copilot-plans]. Si tu organización ya te proporciona acceso a Copilot, utiliza esa cuenta.
- un ordenador con macOS, Windows o Linux.

La aplicación incluye Git, así que no hay nada más que instalar.

> [!NOTE]
> Si utilizas Copilot Business o Copilot Enterprise, tu administrador debe habilitar la directiva **Copilot CLI** para que funcionen las sesiones de agente.

## Instala y configura la aplicación

1. Descarga e instala la [aplicación GitHub Copilot][download-app] para tu sistema operativo.
2. Abre la aplicación.
3. Selecciona **Sign in to GitHub** y autentícate.
4. Elige un tema y selecciona **Finish**.

## Elige un modelo

Sigue este orden de preferencia al elegir un modelo y selecciona la primera opción que tengas disponible:

1. **GPT-6-Luna** (recomendado).
2. **Auto**, como alternativa equilibrada.
3. Cualquier modelo de la [lista de modelos activos][active-models].

La disponibilidad de los modelos depende de tu plan, de la directiva de la organización y de la versión del producto.

## Familiarízate con la aplicación

La aplicación reúne el flujo de trabajo de desarrollo en un solo lugar:

- **New**: inicia una sesión en un proyecto o elige **Chat** para una pregunta rápida.
- **Pull requests**: revisa y sigue tus solicitudes de incorporación de cambios en todos los repositorios.
- **Issues**: busca incidencias que tengas asignadas, que hayas creado o que te mencionen.
- **Automations**: programa tareas recurrentes del agente en un repositorio.
- **Customize**: cambia los temas y los modelos y gestiona las extensiones de Canvas.
- **Projects**: abre tus repositorios; las sesiones de cada uno aparecen debajo.

## Prueba un chat rápido

No todas las preguntas necesitan un área de trabajo. Desde **New**, elige **Chat** en lugar de un proyecto. Un chat no tiene ningún repositorio asociado y no puede editar archivos, así que es la forma más rápida de hacer una pregunta, obtener una explicación o pensar en un enfoque antes de iniciar una sesión de trabajo.

Envía el siguiente prompt en un chat:

```plaintext
How does the GitHub Copilot app use worktrees?
```

## Resumen y pasos siguientes

Has comprobado los requisitos previos, instalado la aplicación, elegido un modelo y explorado sus principales áreas de trabajo. Continúa con la [lección 1: Crear el área de trabajo de Space Quiz][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
