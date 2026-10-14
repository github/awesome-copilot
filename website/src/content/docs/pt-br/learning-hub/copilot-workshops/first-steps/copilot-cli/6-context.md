---
title: "Lição 6 - Saber o que o agente pode ver"
description: "Use /context para inspecionar o que ocupa a janela de contexto e /clear para recomeçar quando uma conversa perder o rumo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Os comandos de terminal tornam o contexto visível e permitem gerenciá-lo de forma consciente. Saber o que o agente pode ver ajuda você a entender os resultados e decidir quando recomeçar.

Nesta lição, você vai:

- inspecionar a janela de contexto com `/context`.
- ver quanto da janela cada parte consome.
- redefinir uma conversa que perdeu o rumo com `/clear`.

## Inspecionar o contexto

1. Execute `/context` para inspecionar arquivos, instruções e histórico da conversa.
2. Verifique quanto da janela cada parte está consumindo.
3. Execute `/clear` para recomeçar quando a conversa tiver perdido o rumo.
4. Adicione o arquivo certo novamente antes de pedir outra alteração.

![Ilustração da saída do Copilot CLI após executar /context. Um indicador da janela de contexto mostra 61% de uso, dividido entre conversa, arquivos lidos e instruções. Uma nota sugere usar /compact para resumir ou iniciar uma nova sessão quando houver pouco espaço disponível.](/images/learning-hub/copilot-workshops/first-steps-cli-context.svg)

`/context` mostra exatamente o que ocupa a janela de contexto e quanto espaço resta. Quando houver pouco espaço disponível, use `/compact` para resumir a conversa ou inicie uma nova sessão.

## Resumo e próximos passos

Agora você pode ver e gerenciar o que o agente sabe. Continue com a [Lição 7: Retomar sessões e acessar remotamente][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
