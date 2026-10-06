---
title: "Lição 11 - Explorar um Canvas"
description: "Instale um Canvas Repository Issues Kanban e inicie uma sessão a partir de um cartão de issue."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Um **Canvas** é uma superfície compartilhada e bidirecional em que você e um agente podem atualizar o mesmo plano, quadro, checklist ou painel. Explore um Canvas Kanban que transforma as issues do repositório em um fluxo de trabalho visual.

Nesta lição, você vai:

- instalar uma extensão de Canvas.
- conectar o Canvas ao repositório Space Quiz.
- mover uma issue para o trabalho em andamento.
- inspecionar a sessão criada a partir da issue.

## Instalar o Canvas Repository Issues Kanban

1. Explore a [galeria de extensões de Canvas][canvas-gallery].
2. Abra a [extensão Repository Issues Kanban][kanban-extension].
3. Selecione **Install in GitHub Copilot app** e aprove a instalação.
4. No aplicativo, abra **Customize** e, depois, **Canvas**.
5. Confirme que a extensão está instalada.

## Iniciar o trabalho a partir do Canvas

1. Selecione **New session** para o Canvas.
2. Escolha o projeto `space-quiz`.
3. Explore o quadro de issues.
4. Mova um cartão de issue para a coluna de trabalho em andamento.
5. Abra a sessão gerada automaticamente.
6. Confirme que a issue selecionada está disponível como contexto da sessão.

![Ilustração do Canvas Repository Issues Kanban com as colunas Backlog, Plan, Ready e Implement. A issue 13, Review screen, está sendo arrastada de Backlog para a coluna Plan, enquanto a issue 12, Per-question timer, permanece em Backlog.](/images/learning-hub/copilot-workshops/first-steps-app-canvas-kanban.svg)

Quando você solta um cartão em uma coluna, o Canvas passa essa issue para uma nova sessão com a issue já carregada.

> [!NOTE]
> A extensão Repository Issues Kanban atual move cartões por arrastar e soltar com um dispositivo apontador. Se você não puder usar essa interação, anote o número da issue no quadro, abra a issue em **Issues** e selecione **New session**. Isso cria a mesma sessão baseada na issue sem mover o cartão.

O Canvas oferece uma maneira visual de selecionar e iniciar o trabalho, mantendo o agente orientado pela issue.

## Resumo e próximos passos

Você usou uma superfície visual compartilhada para iniciar uma sessão de agente. Continue com a [Lição 12: Revisão e próximos passos][next-lesson].

[canvas-gallery]: https://awesome-copilot.github.com/extensions/
[kanban-extension]: https://awesome-copilot.github.com/extension/accessibility-kanban/
[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/12-review/
