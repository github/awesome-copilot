---
title: "Lección 4 - Recoger las instrucciones del proyecto"
description: "Ejecuta /init para generar instrucciones del agente que describan el Space Quiz terminado y adáptalas a tu forma de trabajar."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Ahora que el cuestionario está creado, perfeccionado y probado, recoge cómo deben tratar este proyecto las sesiones futuras. Cada sesión lee las instrucciones del agente antes de empezar a trabajar, así que te ahorran repetir las mismas directrices en cada prompt.

En esta lección:

- generarás instrucciones del agente con `/init`.
- revisarás el archivo generado antes de aceptarlo.
- reducirás y personalizarás las instrucciones.

## Recoge las reglas con `/init`

1. Ejecuta `/init` en la sesión de la aplicación.
2. Revisa el archivo de instrucciones del agente generado antes de aceptarlo.
3. Redúcelo a directrices que reflejen este proyecto: un único archivo, sin dependencias, accesible y probado en el explorador.

> [!IMPORTANT]
> **¿Por qué después de perfeccionarlo?**
>
> `/init` lee el proyecto tal como existe en ese momento. Ejecutarlo después de crear y probar el cuestionario produce instrucciones que describen código real en lugar de una carpeta vacía.

## Adáptalo a ti

El archivo de instrucciones no sirve solo para recoger datos del proyecto. Añade los detalles que de otro modo repetirías en cada prompt, como tu forma preferida de escribir código, las convenciones de nomenclatura, las bibliotecas que deben evitarse y la cantidad de comentarios que quieres. Cada sesión futura lee este archivo antes de leer tu prompt.

## Resumen y pasos siguientes

El proyecto ya tiene instrucciones del agente basadas en código real. Continúa con la [lección 5: Publicar el proyecto][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
