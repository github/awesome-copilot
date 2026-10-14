---
title: "Lição 6 - Trabalhar com issues e sessões"
description: "Crie um backlog com escopo bem definido, selecione uma issue, implemente-a em uma worktree isolada e revise o diff por conta própria."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Peça ao agente para sugerir melhorias de produto com escopo bem definido, transforme essas ideias em issues do GitHub e implemente uma delas em uma sessão isolada.

Nesta lição, você vai:

- criar três issues com escopo bem definido para o Space Quiz.
- explorar o backlog em **Issues**.
- iniciar uma sessão a partir de uma issue em uma nova worktree.
- revisar o diff na aba **Changes** e verificar o recurso.

## Criar um backlog em Issues

Envie o seguinte prompt:

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

Abra **Issues**, revise as três issues e escolha uma que tenha valor claro e um escopo viável.

![Ilustração da visualização Issues do aplicativo Copilot. A barra lateral lista New, Pull requests, Issues, Automations, Customize, More e o projeto space-quiz. A área principal tem as abas Assigned to me, Created by me, Mentioning me e Done, uma caixa de pesquisa, filtros State e Assignee e uma lista de três issues abertas no repositório space-quiz.](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues** reúne no aplicativo suas issues do GitHub de todos os repositórios, filtradas por **Assigned to me**, **Created by me**, **Mentioning me** e **Done**.

## Implementar uma issue

1. Abra a issue selecionada em **Issues**.
2. Selecione **New session**.
3. Escolha uma **new worktree** quando solicitado.
4. Use o modo **Interactive** e seu modelo preferido.
5. Envie o seguinte prompt:

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

A nova worktree mantém esse recurso isolado da branch padrão até que você esteja pronto para revisá-lo e mesclá-lo.

## Revisar o diff por conta própria

Quando o agente apresentar o resultado, não confie apenas no que ele diz.

1. Abra o painel lateral à direita e selecione a aba **Changes**.
2. Leia o diff de todos os arquivos que a sessão alterou.
3. Teste o recurso no navegador integrado e confirme que ele atende aos critérios de aceitação da issue.

![Ilustração de uma sessão do aplicativo Copilot com a aba Changes aberta no painel lateral à direita. Ela mostra um arquivo alterado, index.html, com 142 linhas adicionadas e 8 removidas, e linhas de diff embutidas ao lado da conversa da sessão.](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

A aba **Changes** lista todos os arquivos que a sessão alterou, com o diff embutido.

## Resumo e próximos passos

Você criou um backlog, implementou uma issue em uma sessão isolada e revisou o diff. Continue com a [Lição 7: Planejar antes de editar][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
