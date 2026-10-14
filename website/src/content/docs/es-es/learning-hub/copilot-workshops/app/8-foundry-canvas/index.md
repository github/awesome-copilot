---
title: "Opcional: Incorporar Foundry"
description: "Crea un Backer Concierge basado en el catálogo con Microsoft Foundry Canvas, con puntos seguros para detenerte durante el recorrido."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /es-es/learning-hub/copilot-workshops/app/10-review/, label: Repaso y pasos siguientes }
next:
  link: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: Preparar el proyecto y el modelo
tags:
  - workshop
---

Este recorrido opcional añade un **Backer Concierge** a Tailspin Toys mediante Microsoft Foundry Canvas en la aplicación GitHub Copilot. Parte de un experimento con un modelo basado en el catálogo, continúa con un agente hospedado y termina con una integración local en el sitio web.

## El recorrido

Cada módulo termina con un punto de control y un punto seguro para detenerte. Durante todo el recorrido se mantienen el mismo repositorio de Tailspin Toys, la misma rama del worktree, la misma sesión vinculada a la incidencia, el mismo proyecto de Foundry y la misma implementación del modelo.

- [Preparar el proyecto y el modelo][module-1] establece los límites del catálogo, crea el proyecto y la implementación del modelo, y los comprueba en Canvas.
- [Crear e implementar el agente][module-2] genera la estructura inicial de Backer Concierge, lo prueba en local, e implementa y vuelve a probar el agente hospedado.
- [Conectar el agente al sitio][module-3] añade un proxy local que protege las credenciales, un widget de chat accesible y pruebas de extremo a extremo.

> [!IMPORTANT]
> Microsoft Foundry Canvas y los agentes hospedados están en versión preliminar pública.
>
> Este recorrido crea recursos de Azure que generan costes, incluida una implementación de modelo y, a partir del módulo 2, un agente hospedado. Antes de crear recursos, es necesario aprobar la suscripción, la región, la cuota y el coste estimado. La limpieza también se aplica si te detienes tras crear únicamente el proyecto y el modelo.

1. Empieza por [Preparar el proyecto y el modelo][module-1] y realiza el trabajo en el repositorio de Tailspin Toys, no en este repositorio de contenido del taller.
2. Si prefieres terminar el taller principal, continúa con [Revisión y pasos siguientes][core-review].

## Limpiar los recursos

Cuando termines de experimentar en cualquier punto de control, elimina los recursos de Azure para evitar costes no deseados. La limpieza elimina recursos necesarios para módulos posteriores, por lo que tendrás que volver a crearlos si quieres continuar después.

> [!WARNING]
> Elimina `rg-tailspin-toys` únicamente si está dedicado a este ejercicio y no contiene ningún recurso que necesites conservar. Si eliminas un grupo de recursos compartido, también se eliminarán recursos que no pertenecen al ejercicio.
>
> Si aprobaste otro nombre para el grupo de recursos en el módulo 1, sustituye `rg-tailspin-toys` por ese nombre en todos los comandos siguientes.

1. Detén desde sus terminales cualquier proceso local de Agent Inspector, Azure Function o servidor de desarrollo de Astro que hayas iniciado.
2. Si has implementado el agente hospedado en el módulo 2 o 3, abre un terminal en el mismo worktree de Tailspin Toys, usa el mismo entorno de `azd` y ejecuta:

   ```bash
   azd down --purge
   ```

3. Comprueba la suscripción seleccionada y si todavía existe el grupo de recursos del taller:

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   Si el comando devuelve `false`, la limpieza ha terminado. Si devuelve `true`, examina los recursos del grupo:

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   Verifica que todos los recursos restantes pertenezcan a este ejercicio. Si te has detenido después del módulo 1, aún debes limpiar el proyecto de Foundry y el modelo aunque no hayas implementado un servicio de `azd`.
4. Si el grupo de recursos dedicado del taller todavía existe y solo contiene recursos que quieres eliminar, ejecuta:

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. Como `--no-wait` devuelve el control antes de que termine la eliminación, vuelve a ejecutar el comando siguiente hasta que devuelva `false`:

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## Recursos

La documentación de Microsoft describe Canvas, las implementaciones hospedadas y sus permisos.

- [¿Qué es Microsoft Foundry Canvas?][foundry-canvas]
- [Implementar el primer agente hospedado con Foundry Canvas][hosted-agent-quickstart]
- [Permisos de los agentes hospedados][hosted-agent-permissions]

[module-1]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /es-es/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /es-es/learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
