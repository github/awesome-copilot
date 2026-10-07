---
title: "Lição 7 - Retomar sessões e acessar remotamente"
description: "Saia de uma sessão do Copilot CLI e volte a ela mais tarde com copilot --resume ou /resume e, opcionalmente, acompanhe-a de outro dispositivo com /remote."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

As sessões podem ser pausadas sem perder a conversa ou o contexto do espaço de trabalho. Saia de uma sessão, volte a ela mais tarde e, opcionalmente, disponibilize-a para acesso de outro dispositivo.

Nesta lição, você vai:

- sair de uma sessão e retomá-la pelo terminal.
- alternar entre sessões sem sair da CLI.
- opcionalmente, disponibilizar uma sessão remotamente.

## Sair de uma sessão e voltar mais tarde

1. Saia da sessão atual do Copilot CLI quando estiver pronto para trocar de tarefa.
2. Em um terminal, execute `copilot --resume` para escolher uma sessão anterior.
3. Dentro do Copilot CLI, use `/resume` para alternar entre sessões sem sair da CLI.
4. Confirme que a sessão restaurada ainda tem os arquivos, o contexto da issue e o modelo esperados.

## Opcional: Continuar uma sessão remotamente

Execute `/remote` para manter *essa mesma sessão* em execução localmente enquanto a disponibiliza na web e no aplicativo móvel GitHub Copilot. Seu computador precisa permanecer ligado. Abra o link retornado no navegador ou acesse a sessão no aplicativo móvel GitHub Copilot.

> [!NOTE]
> `/remote` não é delegação e não move a execução para a nuvem. Ele não é necessário para este workshop, então experimente-o quando o ciclo local já parecer natural.

## Resumo e próximos passos

Você pode pausar e retomar sessões e acompanhar uma sessão local de outro dispositivo. Continue com a [Lição 8: Criar, revisar e mesclar pela CLI][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
