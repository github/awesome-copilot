---
title: "Lección 6 - Saber qué puede ver el agente"
description: "Utiliza /context para inspeccionar qué ocupa la ventana de contexto y /clear para empezar de cero cuando una conversación se desvía."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Los comandos de terminal hacen visible el contexto y te permiten gestionarlo de forma deliberada. Saber qué puede ver el agente te ayuda a entender sus resultados y decidir cuándo empezar de cero.

En esta lección:

- inspeccionarás la ventana de contexto con `/context`.
- verás cuánto ocupa cada parte de la ventana.
- restablecerás una conversación que se haya desviado con `/clear`.

## Inspecciona el contexto

1. Ejecuta `/context` para inspeccionar archivos, instrucciones e historial de conversación.
2. Comprueba cuánto ocupa cada parte de la ventana.
3. Ejecuta `/clear` para empezar de cero cuando la conversación se haya desviado.
4. Vuelve a añadir el archivo adecuado antes de pedir otro cambio.

![Ilustración de la salida de Copilot CLI tras ejecutar /context. Un indicador de la ventana de contexto muestra un uso del 61 %, repartido entre la conversación, los archivos leídos y las instrucciones. Una nota sugiere utilizar /compact para resumir o iniciar una sesión nueva cuando quede poco espacio.](/images/learning-hub/copilot-workshops/first-steps-cli-context.svg)

`/context` muestra exactamente qué ocupa la ventana de contexto y cuánto espacio queda. Cuando quede poco, utiliza `/compact` para resumir la conversación o inicia una sesión nueva.

## Resumen y pasos siguientes

Ahora puedes ver y gestionar lo que sabe el agente. Continúa con la [lección 7: Reanudar y acceder de forma remota][next-lesson].

[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
