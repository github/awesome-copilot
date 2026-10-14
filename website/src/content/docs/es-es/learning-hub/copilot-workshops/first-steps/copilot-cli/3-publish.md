---
title: "Lección 3 - Publicar el proyecto"
description: "Inicializa el proyecto, crea un commit y publica Space Quiz en GitHub, mediante un prompt o ejecutando los comandos tú mismo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Convierte el experimento en un repositorio público de GitHub. Puedes pedirlo en un único prompt o ejecutar los comandos tú mismo. Prueba ambas formas una vez y sabrás exactamente qué hace el agente por ti.

En esta lección:

- inicializarás un repositorio de Git y crearás el primer commit.
- crearás un repositorio público de GitHub y enviarás los cambios.
- confirmarás que el commit y el archivo se han incorporado.

## Opción A: Pídelo

Envía el siguiente prompt:

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

Aprueba cada acción de Git y GitHub cuando el agente lo solicite.

## Opción B: Ejecútalo tú mismo

Añade el prefijo `!` a cada comando para ejecutarlo desde la sesión o ejecuta los comandos sin el prefijo en tu propia terminal:

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

El último comando utiliza la [GitHub CLI][gh-cli]. Si no la tienes, crea el repositorio en GitHub y ejecuta `!git remote add origin <url>` y `!git push -u origin main`.

## Confirma el resultado

1. Ejecuta `!git log --oneline` para confirmar que el commit se ha incorporado.
2. Abre el repositorio en GitHub y confirma que `index.html` está presente.

## Resumen y pasos siguientes

El proyecto ya es un repositorio de GitHub con una versión cuyo funcionamiento has comprobado y con la que puedes comparar los cambios. Continúa con la [lección 4: Trabajar en incidencias en paralelo][next-lesson].

[gh-cli]: https://cli.github.com/
[next-lesson]: /es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
