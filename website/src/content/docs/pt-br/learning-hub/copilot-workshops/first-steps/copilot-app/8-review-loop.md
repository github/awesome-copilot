---
title: "Lição 8 - Concluir o ciclo de revisão do Copilot"
description: "Crie um pull request, solicite uma revisão do Copilot, trate o feedback que exige ação e deixe o Agent Merge manter o pull request em boas condições."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Transforme a issue implementada em um pull request, solicite uma revisão do Copilot e trate o feedback antes de mesclar.

Nesta lição, você vai:

- inspecionar as alterações da sessão uma última vez.
- criar um pull request a partir da sessão de agente.
- solicitar uma revisão de código do Copilot.
- revisar e aplicar o feedback que exige ação.
- ativar o Agent Merge para manter o pull request em boas condições até a mesclagem.

## Criar e revisar o pull request

1. Abra o painel lateral à direita e selecione a aba **Changes** para inspecionar os arquivos alterados na sessão.
2. Selecione **Create PR** na barra de ferramentas da sessão.
3. Revise o título e a descrição gerados e crie o pull request.
4. Abra o pull request no GitHub.
5. No menu **Reviewers**, solicite uma revisão de **Copilot**.
6. Abra a aba **Files changed** e leia todos os comentários da revisão.
7. Para cada comentário que exige ação, use a ação **Fix** do Copilot no aplicativo ou faça a alteração por conta própria.
8. Revise cada alteração e teste o recurso novamente.
9. Responda com uma descrição concisa do que mudou e resolva a conversa.

> [!NOTE]
> Se uma sugestão não se aplicar ou estiver fora do escopo do pull request, responda com o motivo em vez de fazer uma alteração desnecessária. Resolva todas as conversas de revisão antes de mesclar.

## Mesclar com o Agent Merge

Ative **Agent Merge** para o pull request e deixe o agente mantê-lo em boas condições. O agente trata comentários de revisão, corrige verificações com falha e resolve conflitos conforme surgem, depois mescla quando tudo passa.

Se preferir mesclar por conta própria, revise o diff final, verifique o recurso e mescle o pull request depois que todas as verificações passarem.

## Resumo e próximos passos

Você concluiu o ciclo de desenvolvimento, da issue ao pull request revisado e mesclado. Continue com a [Lição 9: Automatizar a triagem de issues][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
