---
title: "Lección 7 - Reanudar y acceder de forma remota"
description: "Sal de una sesión de Copilot CLI y vuelve a ella más tarde con copilot --resume o /resume y, opcionalmente, síguela desde otro dispositivo con /remote."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Las sesiones se pueden pausar sin perder la conversación ni el contexto del área de trabajo. Sal de una sesión, vuelve a ella más tarde y, opcionalmente, haz que esté disponible desde otro dispositivo.

En esta lección:

- saldrás de una sesión y la reanudarás desde la terminal.
- cambiarás entre sesiones sin salir de la CLI.
- opcionalmente, harás que una sesión esté disponible de forma remota.

## Sal de una sesión y vuelve más tarde

1. Sal de la sesión actual de Copilot CLI cuando estés listo para cambiar de tarea.
2. Desde una terminal, ejecuta `copilot --resume` para elegir una sesión anterior.
3. Dentro de Copilot CLI, utiliza `/resume` para cambiar entre sesiones sin salir de la CLI.
4. Confirma que la sesión restaurada sigue teniendo los archivos, el contexto de la incidencia y el modelo esperados.

## Opcional: continúa una sesión de forma remota

Ejecuta `/remote` para mantener *esa misma sesión* en ejecución local y, al mismo tiempo, hacerla accesible desde la web y la aplicación móvil GitHub Copilot. El equipo debe permanecer encendido. Abre en el explorador el enlace que devuelve o accede a la sesión desde la aplicación móvil GitHub Copilot.

> [!NOTE]
> `/remote` no es delegación y no traslada la ejecución a la nube. No es necesario para este taller, así que pruébalo cuando te resulte natural el ciclo de trabajo local.

## Resumen y pasos siguientes

Puedes pausar y reanudar sesiones y seguir una sesión local desde otro dispositivo. Continúa con la [lección 8: Crear, revisar y combinar desde la CLI][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
