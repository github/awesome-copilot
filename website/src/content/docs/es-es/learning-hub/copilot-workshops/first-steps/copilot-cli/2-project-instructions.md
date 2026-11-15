---
title: "Lección 2 - Recoger las instrucciones del proyecto"
description: "Ejecuta /init para generar instrucciones del agente que describan el Space Quiz terminado y adáptalas a tu forma de trabajar."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-11-13
---

Con un cuestionario funcional en el disco, genera instrucciones del agente que describan el proyecto real. Cada sesión futura lee estas instrucciones antes de empezar a trabajar, así que te ahorran repetir las mismas directrices en cada prompt.

En esta lección:

- generarás instrucciones del agente con `/init`.
- revisarás el archivo generado antes de aceptarlo.
- reducirás y personalizarás las instrucciones.

## Recoge las reglas con `/init`

En Copilot CLI, `/init` funciona sin texto adicional; también puedes añadir instrucciones para orientar lo que genera, como se indica en la [referencia de comandos de CLI][cli-init]. Este ejemplo añade una solicitud de reglas sencillas para el proyecto.

1. Ejecuta `/init create simple rules for the project` en la sesión.
2. Revisa el archivo de instrucciones generado antes de aceptarlo.
3. Conserva solo las directrices que correspondan a este proyecto: un único archivo, sin dependencias, accesible y probado en el explorador.

> [!IMPORTANT]
> **El orden importa**
>
> `/init` lee el proyecto tal como existe en ese momento. Ejecutarlo después de crear y perfeccionar el cuestionario produce instrucciones basadas en código real.

## Adáptalo a ti

El archivo de instrucciones no sirve solo para recoger datos del proyecto. Añade los detalles que de otro modo repetirías en cada prompt, como tu forma preferida de escribir código, las convenciones de nomenclatura, las bibliotecas que deben evitarse y la cantidad de comentarios que quieres. Cada sesión futura lee este archivo antes de leer tu prompt.

## Resumen y pasos siguientes

El proyecto ya tiene instrucciones del agente basadas en código real. Continúa con la [lección 3: Publicar el proyecto][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[cli-init]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference#project-initialization-for-copilot
