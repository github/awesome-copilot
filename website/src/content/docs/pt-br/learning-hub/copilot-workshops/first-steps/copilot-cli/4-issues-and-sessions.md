---
title: "Lição 4 - Trabalhar em issues em paralelo"
description: "Crie um backlog, adicione uma issue à conversa pelo painel lateral, revise alterações com /diff e inicie uma segunda sessão em sua própria worktree."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Mantenha o backlog e o ciclo de implementação no terminal e abra sessões separadas para trabalhos independentes.

Nesta lição, você vai:

- criar três issues do GitHub com escopo bem definido.
- adicionar uma issue à conversa pelo painel lateral e implementá-la.
- revisar a alteração com `/diff`.
- iniciar uma segunda sessão em uma worktree isolada.

## Criar um backlog

Envie o seguinte prompt:

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## Trabalhar na primeira issue nesta sessão

1. Pressione a tecla <kbd>Left arrow</kbd> para abrir o painel lateral e pressione <kbd>Tab</kbd> para ir até a aba **Issues**.
2. Destaque a primeira issue e pressione <kbd>c</kbd> para adicioná-la à conversa como contexto. Para ler a issue completa primeiro, pressione <kbd>Enter</kbd>.
3. Peça ao agente para implementar a issue.

![Ilustração do painel lateral do Copilot CLI em um terminal. A aba Issues está selecionada entre as abas Current, Sessions, Issues, Pull requests e Gists. Um filtro de pesquisa por issues abertas no repositório space-quiz mostra uma issue, Add a score screen at the end of the quiz. As dicas explicam que a tecla Left arrow abre o painel e Tab alterna entre as abas, e a linha inferior lista as teclas: barra para pesquisar, Enter para detalhes, o para abrir, w para worktree, c para conversa e a para todas.](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

O painel lateral lista todas as abas na parte superior, e as dicas na parte inferior são as teclas que atuam sobre o item destacado.

## Revisar a alteração com `/diff`

O projeto está publicado, então há uma versão funcional de referência para comparação. `/diff` mostra exatamente o que esta issue alterou em relação a essa versão, que é justamente o que você está prestes a pedir que alguém revise.

1. Execute `/diff` e leia todos os arquivos alterados.
2. Peça uma correção para qualquer coisa que pareça errada e execute `/diff` novamente.
3. Execute `!git status` ou `!git diff` sempre que quiser inspecionar o Git diretamente.

## Trabalhar na segunda issue em paralelo

1. Abra o painel lateral novamente e alterne para a aba **Sessions**.
2. Inicie outra sessão para a segunda issue sem perder a primeira.
3. Na nova sessão, execute `/worktree` para que ela tenha uma worktree isolada em vez de criar uma branch no mesmo diretório. As duas sessões agora podem ser executadas ao mesmo tempo sem interferir uma na outra.
4. Adicione a segunda issue a essa sessão com <kbd>c</kbd>.
5. Deixe a sessão nesse ponto por enquanto. Na próxima lição, você planejará esta issue antes de escrever qualquer código.

![Ilustração da saída do Copilot CLI após executar /worktree. Ela informa que criou a worktree ../space-quiz-13 na branch issue-13-review-screen e que esta sessão agora trabalha ali, enquanto main permanece intacta.](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree` move a sessão para seu próprio checkout em sua própria branch, para que a primeira sessão continue trabalhando sem interferências.

## Resumo e próximos passos

Você implementou a primeira issue, revisou-a com `/diff` e iniciou uma segunda sessão em sua própria worktree. Continue com a [Lição 5: Planejar antes de editar][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
