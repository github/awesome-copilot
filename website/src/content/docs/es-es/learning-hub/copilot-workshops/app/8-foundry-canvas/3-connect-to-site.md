---
title: "Conectar el agente al sitio"
description: "Integra el Backer Concierge hospedado mediante un proxy local que protege las credenciales y prueba el widget de extremo a extremo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: Crear e implementar el agente
next: { link: /es-es/learning-hub/copilot-workshops/app/10-review/, label: Repaso y pasos siguientes }
---

Este último módulo conecta el agente hospedado probado en [Crear e implementar el agente][previous-module] con el sitio web de Tailspin Toys que se ejecuta en local.

Al terminar, tendrás:

- Un proxy local de Azure Functions que protege las credenciales de Foundry y los identificadores de conversación.
- Un widget de chat accesible con un comportamiento verificado de extremo a extremo.
- Una integración verificada en local y un punto de control de limpieza de recursos.

## Escenario

Quienes apoyan los juegos de Tailspin Toys necesitan asesoramiento sobre el catálogo donde consultan los juegos. Backer Concierge debe conservar la conversación, funcionar con la navegación por teclado y gestionar de forma clara los errores y la información no disponible. Esa comodidad no debe exponer al navegador las credenciales del servicio ni los detalles internos de la conversación.

## Retomar el punto de control del agente hospedado

La integración utiliza el agente hospedado existente en lugar de crear nuevos recursos de Foundry.

1. Retoma el mismo repositorio de Tailspin Toys, la misma rama del worktree y la misma sesión de la incidencia **Add a Backer Concierge assistant for catalog questions** de los módulos anteriores. Confirma que estén presentes el archivo `azure.yaml` de la raíz, el código fuente del agente y el catálogo, y comprueba la suscripción registrada, el grupo de recursos dedicado, el proyecto de Foundry, la implementación del modelo y la versión probada del agente hospedado.
2. Si se eliminaron los recursos, restaura el [proyecto y el modelo][project-module] y la [implementación hospedada probada][previous-module] que correspondan antes de realizar la integración.

## Crear el proxy del lado del servidor

Tailspin Toys está completamente prerrenderizado. El código del navegador nunca debe llamar directamente al agente hospedado ni recibir credenciales de Foundry. Un **límite de protección de credenciales del lado del servidor**, implementado con Azure Functions en local, se autentica en Foundry y devuelve al navegador solo la respuesta del agente. El navegador envía cada mensaje con una referencia opaca a la conversación; el proxy asocia esa referencia con la conversación de Foundry sin exponer el identificador subyacente.

El proxy es la única parte del código que puede acceder a las credenciales de Azure. En este taller, la función y el sitio se ejecutan en local, y el servidor de desarrollo de Astro reenvía las solicitudes de `/api` a la función.

> [!IMPORTANT]
> Este proxy del taller es solo para desarrollo local. No debe implementarse como un punto de conexión público anónimo. Una integración de producción necesita un diseño de autenticación y control de abusos específico de la aplicación que incluya límites de frecuencia o cuotas adecuados, restricciones de CORS, supervisión y controles de costes.

3. En la misma sesión de Copilot, introduce:

   ```plaintext
   Add a local Azure Functions proxy in api for the static Astro site to call my deployed Backer Concierge during development. Use my existing local Azure sign-in, keep credentials and Foundry conversation identifiers out of the browser, return an opaque conversation handle, validate requests, sanitize errors, and add focused tests. Configure the Astro development server so /api requests reach the local Function. Don't create public deployment infrastructure.
   ```

4. Revisa el proxy generado y las pruebas específicas para comprobar la validación de solicitudes, los errores sin datos sensibles, las referencias opacas a las conversaciones y el límite de protección de credenciales exclusivo del servidor. Pide a Copilot que ejecute las pruebas específicas y corrija cualquier fallo.
5. Abre otro terminal, inicia la función local con el comando proporcionado por Copilot y déjala en ejecución.
6. Vuelve al chat y pide a Copilot que pruebe el proxy local:

   ```plaintext
   Test the local /api/concierge endpoint by asking "Which games are under $30?" Show me the sanitized response and confirm that no credentials or internal conversation identifiers are returned.
   ```

7. Inspecciona la respuesta: debería explicar que el catálogo no contiene precios. Confirma que no contiene ningún token de Foundry, credencial, identificador interno de conversación, punto de conexión del proyecto ni traza de la pila. Si no se puede acceder a la función, o la respuesta filtra detalles o inventa precios, envía el fallo sin datos sensibles a Copilot, corrígelo y vuelve a ejecutar las pruebas del proxy antes de continuar.

   ![Prueba del proxy local](/images/learning-hub/copilot-workshops/app-8-local-proxy-test.png)

## Crear y probar el widget de chat

Con el proxy en ejecución, el widget muestra la conversación en el sitio sin exponer detalles de Foundry.

8. Pide a Copilot que cree la integración del sitio:

   ```plaintext
   Add an accessible Backer Concierge chat widget to the Astro site. Connect it to /api/concierge, preserve the conversation using the returned opaque handle, follow the existing design guidance, support keyboard use, keep Foundry details out of the browser, and add end-to-end tests covering the chat flow, conversation continuity, accessibility, error handling, and grounding boundaries.
   ```

9. Inicia el servidor de desarrollo de Astro en otro terminal con el comando proporcionado por Copilot. Mantén en ejecución tanto el sitio como la función local.
10. Pide a Copilot que ejecute las pruebas de extremo a extremo:

    ```plaintext
    Run the end-to-end tests for the Backer Concierge widget in the Tailspin Toys site. Verify its core chat flow, conversation continuity, accessibility, error handling, grounding boundaries, and secure use of the local proxy. Report the results and include evidence for any failures.
    ```

11. Revisa el informe y verifica en el navegador el comportamiento que describe, incluido el uso del teclado y la conversación de dos turnos de las [comprobaciones de aceptación del agente hospedado][agent-checks]. Confirma que las solicitudes del navegador pasan por `/api/concierge` con una referencia opaca, no directamente a Foundry, y que las respuestas no exponen credenciales ni identificadores internos de Foundry. Comprueba que las recomendaciones y las respuestas sobre datos ausentes se mantengan dentro de los límites del catálogo. Resuelve las pruebas fallidas con Copilot, reinicia el servicio local afectado si es necesario y vuelve a ejecutar las pruebas.

    ![Resultados de las pruebas de extremo a extremo del widget Backer Concierge](/images/learning-hub/copilot-workshops/app-8-e2e-test-results.png)

## Punto de control y pasos siguientes

Has creado un proxy local que protege las credenciales, conectado un widget de chat accesible y verificado el flujo completo de la conversación con el Backer Concierge hospedado. El punto de control de este módulo es una integración del sitio web probada en local que conserva los límites del catálogo y mantiene las credenciales y los identificadores internos de Foundry fuera del navegador. No es una implementación de producción del proxy ni del sitio.

Cuando termines de experimentar, detén ambos servicios locales y [limpia los recursos de Azure][cleanup]. Después, continúa con [Repaso y pasos siguientes][core-review] en la ruta principal del taller.

[previous-module]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[project-module]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[agent-checks]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/#inspeccionar-el-agente-en-local
[cleanup]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/#limpiar-los-recursos
[core-review]: /es-es/learning-hub/copilot-workshops/app/10-review/
