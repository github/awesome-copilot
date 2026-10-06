---
title: "Lección 2 - Recoger las instrucciones del proyecto"
description: "Ejecuta /init en Copilot Chat para generar .github/copilot-instructions.md para Space Quiz y adáptalo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Con un cuestionario funcional en el área de trabajo, genera instrucciones personalizadas del repositorio que describan el proyecto real. Copilot lee estas instrucciones con cada solicitud de chat.

En esta lección:

- generarás instrucciones personalizadas del repositorio con `/init`.
- revisarás `.github/copilot-instructions.md` antes de guardarlo.
- reducirás y personalizarás las instrucciones.

## Recoge las reglas con `/init`

1. Ejecuta `/init` en Copilot Chat.
2. Revisa el archivo `.github/copilot-instructions.md` generado antes de guardarlo.
3. Conserva solo las directrices que correspondan a este proyecto: un único archivo, sin dependencias, accesible y probado en el explorador.

![Ilustración de VS Code con .github/copilot-instructions.md abierto en el editor y seleccionado en Explorer, junto a index.html. El archivo se titula Space Quiz y enumera estas reglas: un único index.html sin dependencias ni paso de compilación, todas las respuestas accesibles mediante el teclado y respeto por prefers-color-scheme en ambos temas. Una sección titulada Cómo prefiero que se escriba el código pide funciones pequeñas, retornos tempranos, evitar expresiones ingeniosas de una sola línea y comentarios solo para lo que sea realmente sorprendente.](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

Las instrucciones personalizadas del repositorio se encuentran en `.github/copilot-instructions.md` y se aplican a cada solicitud de chat.

> [!IMPORTANT]
> **El orden importa**
>
> `/init` lee el área de trabajo tal como existe en ese momento. Ejecutarlo después de crear el cuestionario produce instrucciones basadas en código real.

## Adáptalo a ti

El archivo de instrucciones no sirve solo para recoger datos del proyecto. Añade los detalles que de otro modo repetirías en cada prompt, como tu forma preferida de escribir código, las convenciones de nomenclatura, las bibliotecas que deben evitarse y la cantidad de comentarios que quieres. Cada sesión futura lee este archivo antes de leer tu prompt.

## Resumen y pasos siguientes

El área de trabajo ya tiene instrucciones personalizadas basadas en código real. Continúa con la [lección 3: Inspeccionar el contexto y probar][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
