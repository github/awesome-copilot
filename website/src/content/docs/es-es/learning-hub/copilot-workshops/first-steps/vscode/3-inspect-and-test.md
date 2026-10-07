---
title: "Lección 3 - Inspeccionar el contexto y probar"
description: "Inspecciona el contexto adjunto a una solicitud de Copilot Chat y ejecuta una prueba de humo en el explorador antes de que Git escriba nada."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Antes de publicar nada, comprueba qué puede ver Copilot y demuestra que el cuestionario funciona.

En esta lección:

- inspeccionarás el contexto incluido en una solicitud de chat.
- ejecutarás una prueba de humo en el explorador.
- corregirás los fallos antes de pasar a Git.

## Inspecciona el contexto desde la esquina inferior derecha

VS Code muestra el contexto activo en la esquina inferior derecha del cuadro de entrada de Copilot Chat.

1. Abre el indicador de contexto en la **esquina inferior derecha** del cuadro de entrada del chat.
2. Inspecciona los archivos, las instrucciones personalizadas y los símbolos incluidos en la solicitud.
3. Elimina el contexto irrelevante o adjunta el archivo del cuestionario antes de continuar.

## Crea y prueba antes de que Git escriba

Utiliza el explorador integrado y un prompt de prueba de humo antes de inicializar un repositorio o crear un commit:

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Ejecuta la prueba de humo y comprueba el explorador integrado.
2. Corrige los fallos y vuelve a ejecutar la prueba hasta que todo pase.
3. Pasa a Git solo cuando la creación del proyecto y las pruebas se hayan completado correctamente.

## Resumen y pasos siguientes

Has confirmado qué puede ver Copilot y probado el cuestionario antes de publicarlo. Continúa con la [lección 4: Publicar el proyecto][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
