---
title: "Lição 3 - Publicar o projeto"
description: "Inicialize, faça commit e publique o Space Quiz no GitHub por prompt ou executando os comandos por conta própria."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Transforme o experimento em um repositório público no GitHub. Você pode pedir isso em um único prompt ou executar os comandos por conta própria. Experimente as duas maneiras uma vez e saberá exatamente o que o agente faz em seu nome.

Nesta lição, você vai:

- inicializar um repositório Git e criar o primeiro commit.
- criar um repositório público no GitHub e enviar o código para ele.
- confirmar que o commit e o arquivo foram registrados.

## Opção A: Pedir ao agente

Envie o seguinte prompt:

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

Aprove cada ação do Git e do GitHub conforme o agente solicitar.

## Opção B: Executar por conta própria

Adicione o prefixo `!` a cada comando para executá-lo de dentro da sessão ou execute os comandos sem o prefixo no seu próprio terminal:

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

O último comando usa a [GitHub CLI][gh-cli]. Se você não a tiver, crie o repositório no GitHub e execute `!git remote add origin <url>` e `!git push -u origin main`.

## Confirmar o resultado

1. Execute `!git log --oneline` para confirmar que o commit foi registrado.
2. Abra o repositório no GitHub e confirme que `index.html` está presente.

## Resumo e próximos passos

Seu projeto agora é um repositório do GitHub com uma versão funcional de referência para comparação. Continue com a [Lição 4: Trabalhar em issues em paralelo][next-lesson].

[gh-cli]: https://cli.github.com/
[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
