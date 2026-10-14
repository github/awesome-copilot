---
title: "Lección 2 - Crear y perfeccionar el cuestionario"
description: "Crea un Space Quiz en un solo archivo y perfecciónalo con el explorador integrado y el selector de elementos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Utiliza un único prompt detallado para crear el Space Quiz, comprueba su comportamiento en el explorador integrado y realiza un ajuste visual con el selector de elementos.

En esta lección:

- crearás un cuestionario sin dependencias en `index.html`.
- probarás el cuestionario en el explorador integrado.
- inspeccionarás el código generado.
- perfeccionarás un elemento seleccionado sin perder la accesibilidad.

## Crea el cuestionario

Envía el siguiente prompt en tu sesión `space-quiz`:

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

Cuando el agente termine, responde a varias preguntas y confirma que:

- la barra de progreso avanza.
- la puntuación se actualiza.
- las respuestas correctas muestran un estado verde.
- las respuestas incorrectas utilizan una animación de sacudida roja.
- la pantalla de resultados aparece después de la última pregunta.

## Inspecciona el código generado

Contrae la barra lateral izquierda y el panel del explorador de la derecha y, después, revisa `index.html` en el área de código ampliada. Observa cómo HTML, CSS y JavaScript funcionan juntos en un único archivo. Restaura ambos paneles cuando termines.

## Perfecciona con el selector de elementos

1. Selecciona el selector de elementos en la barra de herramientas del explorador.
2. Selecciona el encabezado del cuestionario o el área de respuestas.
3. Envía el siguiente prompt:

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. Observa cómo se actualiza el explorador integrado y comprueba el cambio.

## Ajustes opcionales

Si quieres seguir experimentando, pide al agente que:

- añada un fondo sutil de estrellas que respete `prefers-reduced-motion`.
- haga que la pantalla de resultados sea más festiva cuando la puntuación sea de 8 o más.
- mejore los estados de foco del teclado y, después, comprueba el cuestionario sin ratón.

## Resumen y pasos siguientes

Has creado, inspeccionado y perfeccionado el Space Quiz. Continúa con la [lección 3: Inspeccionar la sesión y probar el cuestionario][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
