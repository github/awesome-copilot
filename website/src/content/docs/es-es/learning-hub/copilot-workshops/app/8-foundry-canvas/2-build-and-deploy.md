---
title: "Crear e implementar el agente"
description: "Genera la estructura inicial de Backer Concierge en Canvas, inspecciónalo en local e impleméntalo y vuelve a probarlo en Foundry."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: Preparar el proyecto y el modelo
next:
  link: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
  label: Conectar el agente al sitio
---

Este módulo convierte el proyecto, la implementación del modelo y el catálogo de [Preparar el proyecto y el modelo][previous-module] en un Backer Concierge hospedado mediante Microsoft Foundry Canvas.

Al terminar, tendrás:

- La estructura inicial de un agente con los datos del catálogo empaquetados y pruebas específicas.
- Evidencias locales para cada criterio de aceptación del catálogo y de la conversación.
- Una versión del agente implementada y probada de nuevo en Foundry.

## Escenario

Tailspin Toys necesita un asistente que pueda responder a preguntas reales sobre el catálogo, reconocer cuándo falta información y recordar los juegos mencionados en una conversación. El servicio debe ganarse esa confianza antes de formar parte del sitio de la tienda.

## Preparar las herramientas de implementación

La inspección y la implementación del agente hospedado utilizan Azure Developer CLI a través de Canvas; se reutilizan el proyecto y el modelo de Foundry existentes.

1. Retoma la misma sesión vinculada a la incidencia **Add a Backer Concierge assistant for catalog questions** del módulo 1. Confirma que `db/catalog.json` está intacto, que estás conectado a la suscripción y al proyecto de Foundry correctos, y que la implementación del modelo sigue disponible. Si se eliminaron los recursos, repite primero la [configuración del proyecto y del modelo][previous-module] que corresponda.

2. Selecciona **+**, selecciona **Terminal** e inicia sesión en Azure Developer CLI; completa la autenticación en el navegador cuando se te solicite:

   ```bash
   azd auth login
   ```

3. Ejecuta `azd config show` para verificar la suscripción de Azure. Si está vacía o es incorrecta, actualízala con `azd config set defaults.subscription <subscription-id>` y vuelve a ejecutar `azd config show` para confirmar el cambio.
## Generar la estructura inicial de Backer Concierge

Canvas genera el código, la estructura de carpetas y el archivo `azure.yaml` de la raíz que conectan Backer Concierge con la implementación del modelo existente.

4. En la versión preliminar de **Create new hosted agents**, introduce:

   ```plaintext
   Scaffold a hosted agent named Backer Concierge in agent/backer-concierge, connected to the tailspin-toys project and the model deployment I just confirmed. Use Microsoft Agent Framework with the Responses API. Ground it in db/catalog.json and ensure it meets the acceptance criteria in this issue. Keep a single azure.yaml at the repository root with the hosted-agent service pointing to agent/backer-concierge. Make sure the deployed agent includes the catalog data it needs, and add focused tests.
   ```

   Canvas envía a Copilot la indicación y el contexto de la suscripción actual y del proyecto de Foundry. Busca ejemplos de Agent Framework + Responses API; puede aparecer una opción como **Agent with Local Tools (Responses, Agent Framework, Python)**.

   ![Generar la estructura inicial del agente Backer Concierge en Canvas](/images/learning-hub/copilot-workshops/app-8-scaffold-backer-concierge.png)

5. Revisa los cambios de Copilot en la pestaña **Files** y compáralos con este punto de control. Los nombres de los archivos generados dentro de `src` pueden variar, pero los límites del proyecto y la ubicación de `azure.yaml` deberían coincidir:

   - El agente reside en `agent/backer-concierge`.
   - Un único archivo `azure.yaml` en la raíz del repositorio contiene un servicio con `host: azure.ai.agent`.
   - El agente que se va a implementar incluye su propia copia generada del catálogo.
   - Las pruebas específicas cubren los requisitos para que las respuestas se basen en el catálogo.
   - No se incluyen credenciales ni archivos de entorno locales.

   ```text
   tailspin-toys/
   ├── azure.yaml
   ├── agent/
   │   └── backer-concierge/
   │       └── requirements.txt
   ├── db/
   │   └── catalog.json
   └── src/
   ```

6. Pide a Copilot que ejecute las pruebas específicas y corrija cualquier fallo antes de continuar con **Deploy and test**.

## Inspeccionar el agente en local

**Inspect Locally** ejecuta `azd ai agent run` en el terminal integrado de Copilot, espera a que se inicie el agente hospedado y abre Agent Inspector integrado.

7. En **Deploy and test**, selecciona **Inspect Locally** y espera a que se abra Agent Inspector.

> [!NOTE]
> La primera ejecución local puede tardar varios minutos mientras `azd` crea un entorno e instala las dependencias.

8. Si el inspector no puede conectarse, confirma que ningún otro proceso esté utilizando el puerto necesario, envía el error a Copilot y vuelve a intentarlo cuando se haya solucionado el problema.
9. Prueba una **recomendación basada en el catálogo** en Agent Inspector:

    ```text
    I love puzzle games about tracking down bugs. What should I back?
    ```

    Resultado esperado: menciona solo títulos reales del catálogo y utiliza la información correcta de cada título.

    ![Recomendación basada en el catálogo en Agent Inspector](/images/learning-hub/copilot-workshops/app-8-grounded-recommendation.png)

10. Prueba una **pregunta trampa para detectar alucinaciones**:

    ```text
    How much has Pipeline Conquest raised so far, and how many backers does it have?
    ```

    Resultado esperado: explica que el catálogo no registra la financiación ni los patrocinadores y, después, ofrece información que sí está disponible.

11. Prueba la **presión para responder sobre juegos ajenos al catálogo**:

    ```text
    Do you have Wingspan? If not, what's the closest thing you've got?
    ```

    Resultado esperado: indica que Wingspan no está en el catálogo, no lo describe con conocimientos externos y redirige la respuesta hacia títulos reales de Tailspin.

12. Prueba una **petición imprecisa**:

    ```text
    Recommend me something good.
    ```

    Resultado esperado: hace una pregunta breve para aclarar la petición y todavía no recomienda ningún título.

13. Prueba la **exactitud de la clasificación**:

    ```text
    What are your three highest rated games?
    ```

    Resultado esperado: devuelve las tres entradas del catálogo mejor valoradas en el orden correcto y con las valoraciones correctas.

14. Prueba la **continuidad de la conversación** enviando estas indicaciones en la misma conversación:

    ```text
    Show me two highly rated strategy games.
    ```

    ```text
    Which of those has the higher rating?
    ```

    Resultado esperado: la segunda respuesta se refiere solo a los dos títulos de la primera respuesta y compara correctamente sus valoraciones del catálogo.

15. Compara cada respuesta con `db/catalog.json` y con los criterios de aceptación de la incidencia. Confirma que el agente nunca inventa juegos, editores, valoraciones, importes recaudados, cifras de patrocinadores, precios, números de jugadores, duraciones de partida ni fechas de lanzamiento. Si Agent Inspector comunica un error o una respuesta rebasa los límites de la información del catálogo, copia el resultado en el área de indicaciones de Canvas y pide a Copilot que lo corrija. Reinicia la inspección local y vuelve a ejecutar la prueba fallida después de cada cambio; después, confirma que las seis comprobaciones se superan antes de implementar.

## Implementar el agente hospedado y volver a probarlo

Canvas utiliza `azd` para implementar el agente probado. Foundry empaqueta el código fuente del servicio, resuelve las dependencias, lo compila de forma remota y lo publica en Microsoft Foundry.

16. En Canvas, en **Deploy and test**, selecciona **Deploy to Foundry**. Revisa la indicación que inserta en el chat.

    ![Indicación Deploy to Foundry en el lienzo](/images/learning-hub/copilot-workshops/app-8-deploy-to-foundry.png)

17. Comprueba que aparezcan una confirmación de la implementación, la versión del agente, el estado y un enlace al área de pruebas del agente en Foundry. Si la implementación falla, envía el error a Copilot y resuélvelo en el mismo proyecto antes de volver a intentarlo a través de Canvas.
18. Selecciona **Test in Foundry Portal** desde Canvas para abrir el área de pruebas del agente implementado. Vuelve a ejecutar las seis comprobaciones de aceptación de los pasos 9–14 con esta versión implementada; mantén las dos indicaciones enlazadas en una misma conversación para comprobar la continuidad. Compara las respuestas con el catálogo; si falla alguna comprobación, pide a Copilot que lo corrija, vuelve a ejecutar las pruebas locales, implementa de nuevo a través de Canvas y vuelve a probar la versión hospedada.

## Punto de control y pasos siguientes

Has generado la estructura inicial de Backer Concierge, probado en local su fundamentación en el catálogo y su comportamiento durante la conversación, lo has implementado en Microsoft Foundry y has vuelto a probar la versión hospedada. El punto de control de este módulo es un agente hospedado que supera las seis comprobaciones de aceptación sin inventar información que no está disponible.

A continuación, usarás el mismo repositorio de Tailspin Toys, la misma rama del worktree, la misma sesión vinculada a la incidencia, el mismo proyecto de Foundry, la implementación del modelo seleccionada y el agente hospedado para [conectar el agente al sitio][next-module]. Si te detienes aquí, [limpia los recursos de Azure][cleanup] para evitar costes continuos.

[previous-module]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[next-module]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[cleanup]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/#limpiar-los-recursos
