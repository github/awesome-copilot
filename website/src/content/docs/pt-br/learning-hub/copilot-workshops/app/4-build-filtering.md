---
title: "Lição 4 - Criar um recurso com o Autopilot"
description: "Use os modos Plan e Autopilot no aplicativo GitHub Copilot para criar um recurso estático de filtragem no lado do cliente, observar como ele herda seu padrão de documentação e verificá-lo com uma skill de agente."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Até agora, fizemos algumas pequenas atualizações no projeto. No entanto, alterações mais robustas exigem um processo mais completo. O aplicativo GitHub Copilot foi criado para trabalhar com nosso fluxo existente e ajudar a garantir que criemos as soluções certas da maneira correta. Esta é a primeira de três lições nas quais você seguirá um processo típico de desenvolvimento, começando por usar uma issue para gerar um novo recurso e uma skill de agente para executar os testes de validação e os linters.

Nesta lição, você vai:

- iniciar uma nova sessão a partir da issue de filtragem.
- usar o modo **Plan** para planejar o recurso e depois o **Autopilot** para criá-lo.
- confirmar que o código gerado segue o padrão de documentação integrado anteriormente.
- verificar o trabalho com a skill `quality-checks` do projeto.

## Cenário

A página inicial lista todos os jogos, mas os visitantes não conseguem restringir a lista. A issue de filtragem solicita que eles possam filtrar jogos por **categoria** e **distribuidora**. Vamos usar o Copilot para implementar essa funcionalidade.

## Contexto

Introduzir agentes de programação com IA no fluxo de desenvolvimento não muda os fundamentos. Na verdade, eles se tornam ainda mais importantes. A maioria das pessoas desenvolvedoras segue um fluxo semelhante a este:

1. Abrir uma issue com os detalhes do que precisa ser feito.
2. Criar um plano do que precisa ser desenvolvido.
3. Criar e revisar o código.
4. Executar os testes para validar o código.
5. Validar manualmente a nova funcionalidade.
6. Criar um pull request (PR).
7. Depois que o código for revisado e o processo de integração contínua for concluído com êxito, fazer o merge do código.

> [!NOTE]
> Os detalhes exatos variam de acordo com sua equipe e organização, mas a maioria dos fluxos será uma variação do processo descrito acima.

Ao seguir essa abordagem padrão, você garante que o código gerado por IA atenda aos requisitos definidos e passe pelo mesmo processo de avaliação do código escrito manualmente.

## Modos de sessão

O **modo de sessão** controla o grau de autonomia do agente. Você pode defini-lo no menu suspenso abaixo do campo de prompt e alterá-lo a qualquer momento:

- **Interactive**: você e o agente trabalham em conjunto. O agente sugere alterações e aguarda sua orientação antes de prosseguir.
- **Plan**: o agente cria primeiro um plano. Você revisa e aprova o plano antes que o agente o execute.
- **Autopilot**: o agente trabalha com total autonomia, escrevendo código, executando testes e iterando sem aguardar sua orientação.

## Planejar o recurso de filtragem

O melhor momento para detectar um possível problema é antes que qualquer código seja escrito, e a melhor maneira de fazer isso é planejar com antecedência. Ao planejar com o Copilot, você pedirá que ele gere um conjunto de etapas e documente a abordagem que seguirá. Em seguida, poderá revisar o plano e fazer sugestões para melhorá-lo antes de permitir que o Copilot gere o código com base nele.

Vamos abrir a issue, iniciar uma nova sessão e criar um plano alternando para o modo Plan e fazendo a solicitação.

1. Selecione **My work** na aba de navegação.
2. Selecione a issue intitulada **Allow users to filter games by category and publisher**.
3. Selecione **New session** no canto superior direito.

   ![Visualização da issue no aplicativo GitHub Copilot com uma seta apontando para o botão New session no canto superior direito](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. Selecione <kbd>Shift</kbd>+<kbd>Tab</kbd> até que o modo exibido seja **Plan**.

   ![Caixa de prompt do aplicativo GitHub Copilot com uma seta apontando para o seletor de modo definido como Plan](/images/learning-hub/copilot-workshops/app-4-plan-mode.png)

5. Envie o prompt a seguir. A issue de filtragem já está no contexto da sessão porque você iniciou a partir dela:

   ```plaintext
   Plan the work based on the requirements documented in the issue. Please ask any clarifying questions you might have as you build the plan.
   ```

6. O agente pode fazer perguntas complementares enquanto cria o plano. Responda com base em como você criaria o recurso.

> [!NOTE]
> Como o Copilot é probabilístico, as perguntas complementares exatas podem variar. Na verdade, ele pode não fazer nenhuma pergunta. Isso é perfeitamente normal.

7. Ao terminar, o Copilot apresentará um resumo do plano. Revise-o. Ele deve propor a criação de consultas, a adição de controles de filtro e, naturalmente, testes. Se desejar, forneça feedback para refiná-lo. O agente incorporará suas sugestões em uma nova versão.

## Criar com o Autopilot

Com o plano pronto, vamos permitir que o Copilot crie a implementação.

1. Na lista de opções da caixa de diálogo **Plan summary**, selecione a opção mais próxima de **Approve and implement with autopilot**.

O Copilot começará a trabalhar na implementação.

> [!NOTE]
> Se o Copilot não começar a criar automaticamente o código necessário, você poderá solicitar isso com um prompt como "Go ahead and start building out the plan!".
>
> A criação das atualizações necessárias levará vários minutos. O agente edita e cria arquivos, escreve e executa testes e faz iterações. Este é um bom momento para refletir sobre o que você explorou até agora ou fazer uma pausa.

## Revisar as alterações

Todo código gerado por IA precisa ser revisado antes do merge. Vamos revisar o código e executar o site para confirmar que tudo está correto.

1. Selecione **Changes** no canto superior direito para abrir as alterações no código.

   ![Abas do painel da sessão no aplicativo GitHub Copilot com uma seta apontando para a aba Changes](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. Revise as alterações. Você deverá ver novos arquivos TypeScript e Astro, além de arquivos de teste. Observe que as novas funções auxiliares incluem comentários de documentação TSDoc e um comentário de cabeçalho do arquivo. O padrão de documentação integrado na Lição 3 foi aplicado automaticamente, sem que você precisasse solicitá-lo.
3. No painel de revisão à direita do aplicativo Copilot, selecione **Terminal**. Se não houver um botão **Terminal**, selecione **+** (identificado como **Open in panel**) e depois selecione **Terminal**.

   ![Botão Terminal no painel de revisão do aplicativo GitHub Copilot](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

4. Digite o comando a seguir na janela do terminal para iniciar o servidor de desenvolvimento do aplicativo Web:

   ```shell
   npm run dev
   ```

5. Quando o servidor iniciar, o que levará apenas alguns instantes, abra uma janela do navegador.
6. Acesse http://localhost:4321.
7. Agora você deve ver filtros disponíveis na página inicial.
8. Se algo não estiver correto, peça ao Copilot que faça as atualizações.
9. Quando estiver tudo certo, volte à janela do terminal.
10. Selecione <kbd>Ctrl</kbd>+<kbd>C</kbd> para interromper o servidor de desenvolvimento.

## Verificar o trabalho com a skill quality-checks

Você poderia apenas examinar o diff e considerar o trabalho concluído, mas a equipe definiu um padrão de qualidade e uma maneira repetível de verificá-lo.

As **skills de agente** permitem fornecer ao Copilot orientações sobre como executar tarefas repetíveis, como executar testes, gerar builds ou criar pull requests. Uma skill é uma pasta de instruções, scripts e recursos que o agente pode carregar sob demanda. [Agent Skills é um padrão aberto][agent-skills-repo] usado por vários agentes. Por isso, a mesma skill funciona no Copilot Chat em modo de agente, no agente de nuvem do Copilot, no Copilot CLI e no aplicativo GitHub Copilot.

As skills ficam na pasta `.github/skills` de um projeto ou globalmente em `~/.copilot/skills`. Cada skill é uma pasta que contém um arquivo `SKILL.md` com frontmatter YAML, formado por `name` e `description`, seguido pelas instruções em Markdown:

```yaml
---
name: quality-checks
description: Run the project's test suites and linter to verify code changes are ready to commit, push, or merge.
---
```

As skills também podem incluir subpastas com scripts, ativos e materiais de referência. A estrutura completa é descrita na [especificação de skills de agente][agent-skills-spec].

> [!TIP]
> As skills são carregadas dinamicamente. O agente decide qual skill se aplica com base no campo `description`. Uma descrição clara e específica para o cenário é o que diferencia uma skill usada de uma ignorada.

## Explorar a skill quality-checks

Vamos explorar a skill para entender o que ela faz.

1. Se o painel de revisão ainda não estiver visível, abra-o selecionando **Toggle review panel** no canto superior direito.

   ![Barra de ferramentas superior do aplicativo GitHub Copilot com uma seta apontando para o botão Toggle review panel à direita de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Selecione **+** para adicionar um novo item ao painel de revisão.
3. Selecione **File**.
4. Pesquise `SKILL.md`.
5. Selecione `SKILL.md .github/skills/quality-checks` na lista de arquivos para abri-lo.
6. Observe `name` e `description`. A descrição informa ao agente *quando* usar a skill: sempre que alterações no código precisarem ser testadas, verificadas por lint ou validadas antes de um commit, push ou merge.
7. Leia a skill. Observe que ela documenta qual script executa cada conjunto, como testes de unidade, testes de ponta a ponta do Playwright e ESLint, em que ordem e como depurar falhas comuns. Assim, o agente executa as verificações da maneira definida pela equipe, em vez de tentar adivinhar.

## Executar as verificações

Na mesma sessão de filtragem, peça ao agente que verifique o trabalho. Você não precisará nomear a skill, pois o agente a associará à sua solicitação.

1. Volte ao aplicativo Copilot.
2. Chame diretamente a skill usando o comando de barra `/quality-checks` e selecione <kbd>Enter</kbd>.
3. Seguindo a skill, o agente executa os testes de unidade, o linter e os testes de ponta a ponta e relata os resultados. Se algo falhar, peça que ele corrija o problema e execute novamente as verificações até que tudo passe.
4. **Mantenha esta sessão aberta.** Na próxima lição, você adicionará o servidor MCP do Playwright e o usará para ver o recurso de filtragem funcionando em um navegador real.

## Resumo e próximos passos

Você criou um recurso real de ponta a ponta e o verificou de acordo com o padrão da equipe. Especificamente, você:

- iniciou uma nova sessão a partir da issue de filtragem em um projeto atualizado.
- usou o modo Plan para planejar o recurso e o Autopilot para criá-lo.
- confirmou que o código auxiliar gerado seguiu o padrão de documentação integrado na Lição 3.
- verificou o trabalho com a skill `quality-checks`.

Em seguida, você conectará o servidor MCP do Playwright e pedirá ao agente que explore o recurso de filtragem em um navegador real. Continue para a [Lição 5 - Testar com o servidor MCP do Playwright][next-lesson].

## Recursos

- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]
- [Sobre Agent Skills][about-agent-skills]
- [Personalizar o aplicativo GitHub Copilot][customize-app]
- [Sobre sandboxes locais e na nuvem para o GitHub Copilot][sandboxes]

[ex0]: /pt-br/learning-hub/copilot-workshops/app/0-prerequisites/
[ex2]: /pt-br/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /pt-br/learning-hub/copilot-workshops/app/3-custom-instructions/
[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/5-mcp-playwright/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-agent-skills]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[agent-skills-repo]: https://github.com/agentskills/agentskills
[agent-skills-spec]: https://agentskills.io/specification