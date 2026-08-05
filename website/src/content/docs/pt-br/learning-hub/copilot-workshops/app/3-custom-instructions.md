---
title: "Lição 3 - Orientar o Copilot com instruções personalizadas"
description: "Use o aplicativo GitHub Copilot para adicionar ao repositório um padrão de instruções personalizadas, começando por uma issue do backlog e fazendo o merge da alteração como um pull request."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

O contexto é fundamental ao trabalhar com IA generativa. Se uma tarefa precisa ser realizada de determinada maneira ou se há informações de apoio que o Copilot deve conhecer, esse contexto precisa estar disponível. Uma das ferramentas mais eficientes para isso são os [arquivos de instruções][instruction-files], que descrevem não apenas *qual* código você deseja, mas *como* ele deve ser estruturado. Nesta lição, você adicionará um padrão de documentação ao repositório. Você fará isso da mesma forma que realizará a maior parte do trabalho daqui em diante: começando por uma issue do backlog e permitindo que o agente faça a alteração.

Nesta lição, você vai:

- explorar como as instruções do repositório e os arquivos de instruções com escopo de caminho chegam ao agente.
- iniciar uma sessão a partir da issue de instruções no backlog.
- pedir ao agente que adicione um padrão de documentação a `.github/copilot-instructions.md`.
- revisar a alteração e fazer o merge dela como um pull request.

## Cenário

Como toda boa equipe de desenvolvimento, a Tailspin Toys tem diretrizes e requisitos para as práticas de desenvolvimento. Entre eles estão:

- A documentação deve ser adicionada ao código na forma de comentários de documentação TSDoc.
- A formatação deve ser documentada e aplicada por meio de linting.

Com os arquivos de instruções, você garantirá que o Copilot tenha as informações certas para executar as tarefas de acordo com as práticas destacadas.

## Arquivos de instruções

As instruções personalizadas permitem fornecer contexto e preferências ao Copilot para que ele compreenda melhor seu estilo de programação e seus requisitos. Esse recurso ajuda a orientar o Copilot para obter sugestões e trechos de código mais relevantes. Você pode especificar convenções de código, bibliotecas e até os tipos de comentários que deseja incluir no código. É possível criar instruções para todo o repositório ou para tipos de arquivo específicos, fornecendo contexto no nível da tarefa.

Há dois tipos de arquivos de instruções:

- `.github/copilot-instructions.md`, um único arquivo de instruções enviado ao Copilot em **todas** as solicitações do repositório. Esse arquivo deve conter informações no nível do projeto, ou seja, contexto relevante para a maioria das solicitações enviadas ao Copilot pelo chat ou pela CLI. Isso pode incluir a pilha de tecnologias usada, uma visão geral do que está sendo criado, boas práticas e outras orientações globais.
- Os arquivos `.github/instructions/*.instructions.md` podem ser criados para tarefas ou tipos de arquivo específicos. Você pode usá-los para fornecer diretrizes para determinadas linguagens, como TypeScript ou Astro, ou para tarefas como criar um componente de interface ou um novo conjunto de testes de unidade.

> [!NOTE]
> O Copilot também oferece suporte a outros padrões para incorporar orientações por meio de AGENTS.md, CLAUDE.md e GEMINI.md, garantindo que ele sempre tenha o contexto correto.

### Boas práticas para gerenciar arquivos de instruções

Uma discussão completa sobre a criação de arquivos de instruções está fora do escopo do workshop. No entanto, os exemplos fornecidos no projeto de amostra demonstram uma abordagem representativa. Em termos gerais:

- Mantenha as instruções em `copilot-instructions.md` concentradas em orientações no nível do projeto, como uma descrição do que está sendo criado, a estrutura do projeto e os padrões globais de código.
- Use arquivos `*.instructions.md` para fornecer instruções específicas para tipos de arquivo, como testes de unidade, componentes Astro e a camada de dados, ou para tarefas específicas.
- Use linguagem natural. Mantenha as orientações claras. Forneça exemplos de como o código deve e não deve ser.

Não existe uma única maneira correta de criar arquivos de instruções, assim como não existe uma única maneira correta de usar IA. Com a experimentação, você descobrirá o que funciona melhor para seu projeto.

> [!TIP]
> Todo projeto que usa o GitHub Copilot deve ter uma coleção robusta de arquivos de instruções. Ao explorar os arquivos deste projeto, você perceberá que há instruções para vários tipos de arquivos de código.
>
> Procura modelos ou um ponto de partida? Explore o [awesome-copilot][awesome-copilot], um repositório repleto de arquivos de instruções, agentes personalizados e outros recursos.

## Explorar os arquivos de instruções personalizadas deste projeto

Reserve um momento para ler os arquivos de instruções incluídos no repositório. Há um arquivo principal `copilot-instructions.md` e uma coleção de arquivos `*.instructions.md` para várias tarefas. Abra-os no editor ou na interface Web do GitHub.

1. Se o painel de revisão ainda não estiver visível, abra-o selecionando **Toggle review panel** no canto superior direito.

   ![Barra de ferramentas superior do aplicativo GitHub Copilot com uma seta apontando para o botão Toggle review panel à direita de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Selecione **+** para adicionar um novo item ao painel de revisão.
3. Selecione **File**.
4. Pesquise `copilot-instructions.md`.
5. Selecione `copilot-instructions.md` na lista de arquivos para abri-lo.
6. Explore o arquivo. Observe a breve descrição do projeto e seções como **Agent notes**, **Code standards**, **Scripts** e **Repository Structure**. Em **Code standards**, observe a orientação aninhada **GitHub Actions Workflows**. Essas instruções se aplicam a qualquer interação com o Copilot.
7. Selecione **Show folder view** para abrir o navegador de pastas.

   ![Botão Show folder view no painel de revisão com um arquivo aberto no aplicativo GitHub Copilot](/images/learning-hub/copilot-workshops/app-show-folder-view.png)

8. Acesse a pasta `.github/instructions` e explore os arquivos. Observe que há instruções para arquivos Astro, a camada de dados Drizzle, testes e muito mais.
9. Abra `.github/instructions/unit-tests.instructions.md`. Observe o campo `applyTo` na parte superior. Ele define um glob, relativo à raiz do repositório, que determina a quais arquivos as instruções se aplicam. Nesse caso, qualquer arquivo de teste TypeScript, por exemplo um arquivo correspondente a `**/*.test.ts`, será incluído.
10. Observe as instruções específicas para criar testes de unidade neste projeto.
11. Por fim, abra `.github/instructions/drizzle.instructions.md` e role até o final. Observe os links para outros arquivos de instruções, como `unit-tests.instructions.md`, e para arquivos existentes no projeto. Isso permite dividir conjuntos maiores de instruções em arquivos menores e reutilizáveis e indicar ao Copilot exemplos a serem seguidos ao gerar código. Os caminhos ali são relativos ao arquivo de instruções, e não à raiz do repositório.

> [!NOTE]
> A seção **Code formatting requirements** em `copilot-instructions.md` documenta os padrões de código do projeto, mas ainda não exige documentação no código. Nas próximas etapas, você adicionará regras para comentários de documentação TSDoc e cabeçalhos de comentários nos arquivos.

## Começar pela issue de instruções

Na lição anterior, você iniciou uma sessão com um prompt direto. No entanto, a maior parte do trabalho começa com uma issue. Vamos criar uma nova sessão com base em uma issue criada para atualizar os arquivos de instruções e depois solicitar a atualização.

> [!NOTE]
> Como os arquivos de instruções têm grande impacto no código gerado pelo Copilot, é preciso garantir que eles orientem o Copilot com clareza. Permitir que o Copilot crie uma primeira versão, como você fará nesta lição, é uma ótima abordagem. Depois, revise o resultado para confirmar que as atualizações atendem aos requisitos.

1. Selecione **My work** na barra lateral.
2. Selecione a issue intitulada **Update our repository coding standards** para abri-la.
3. Selecione **New session** no canto superior direito para iniciar uma nova sessão com base na issue.

   ![Visualização da issue no aplicativo GitHub Copilot com uma seta apontando para o botão New session no canto superior direito](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. Use o prompt a seguir para solicitar que o Copilot atualize os arquivos de instruções de acordo com os requisitos documentados na issue:

  ```plaintext
  Following this issue, make the updates to the instructions files in this project to meet the requirements documented. Don't create the PR quite yet!
  ```

O Copilot fará as atualizações.

## Revisar a alteração

Vamos ler as atualizações feitas pelo Copilot e também pedir um exemplo do código que ele passará a gerar com base nas instruções atualizadas.

1. Selecione **Changes** no canto superior direito para abrir as alterações no código.

   ![Abas do painel da sessão no aplicativo GitHub Copilot com uma seta apontando para a aba Changes](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. Revise o arquivo de instruções atualizado. Confirme se ele contém as diretrizes para adicionar documentação e comentários ao código.

> [!NOTE]
> Como a IA é probabilística, e não determinística, o texto exato pode variar.

3. Use o prompt a seguir para pedir ao Copilot que crie um exemplo do código que passará a gerar:

  ```plaintext
  Do not make any updates, but show me what the code would look like. Based on the new instructions, if I asked Copilot to create a new library component to return all Publishers what would that code look like?
  ```

4. Revise o código proposto pelo Copilot. Observe os comentários de documentação TSDoc e o comentário de cabeçalho do arquivo, exatamente como solicitado pelas instruções atualizadas.

Você atualizou os arquivos de instruções do projeto e viu o impacto que eles terão.

## Abrir e fazer merge do pull request

Os arquivos de instruções se tornam ativos do repositório, portanto são compartilhados com o restante da equipe. Vamos criar um PR com esse trabalho, como faríamos com qualquer outro ativo.

1. No canto superior direito, selecione **Create PR**.
2. Se solicitado, selecione **Sign in with your browser** e siga as instruções para se autenticar.
3. O Copilot começará a criar o PR.

Após a criação do PR, o Copilot monitorará os fluxos de trabalho do repositório que precisam ser executados. Depois de alguns instantes, o botão no canto superior direito mudará para **Ready to merge**, indicando que o PR está pronto para o merge.

4. Selecione **Ready to merge**.
5. Na nova caixa de diálogo, selecione **Merge pull request** para fazer o merge do pull request.

> [!NOTE]
> Depois que o padrão for integrado à branch padrão, ele fará parte do projeto para toda a equipe e para cada nova sessão. Quando você iniciar a sessão de filtragem na próxima lição a partir de uma branch padrão atualizada, o agente seguirá esse padrão automaticamente. O código TypeScript gerado incluirá comentários de documentação TSDoc sem que você precise solicitá-los, uma demonstração pequena, mas concreta, de como as instruções moldam o código gerado.

## Resumo e próximos passos

Você explorou como o aplicativo obtém contexto dos arquivos de instruções e usou uma sessão para adicionar e integrar um padrão para todo o repositório. Especificamente, você:

- explorou o arquivo `copilot-instructions.md` do repositório e os arquivos `*.instructions.md` com escopo de caminho.
- iniciou uma sessão a partir da issue de instruções no backlog.
- pediu ao agente que adicionasse um padrão de documentação a `.github/copilot-instructions.md`.
- revisou a alteração e fez o merge dela como um pull request.

Em seguida, você criará o recurso de filtragem em uma nova sessão e verá como ele adota o padrão que acabou de integrar. Continue para a [Lição 4 - Criar um recurso com o Autopilot][next-lesson].

## Recursos

- [Arquivos de instruções para personalização do GitHub Copilot][instruction-files]
- [Personalizar o aplicativo GitHub Copilot][customize-app]
- [Boas práticas para criar instruções personalizadas][instructions-best-practices]
- [Awesome Copilot — uma coleção de arquivos de instruções e outros recursos][awesome-copilot]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/4-build-filtering/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests