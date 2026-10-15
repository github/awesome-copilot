---
title: "Lição 1 - Instalar o aplicativo GitHub Copilot"
description: "Instale o aplicativo GitHub Copilot, conecte o repositório criado a partir do modelo, conheça o espaço de trabalho e experimente um chat rápido."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

O [**aplicativo GitHub Copilot**][about-copilot-app] é um aplicativo para desktop voltado ao desenvolvimento orientado por agentes. Ele foi criado com base no GitHub Copilot CLI e tem integração nativa com o GitHub, portanto seus repositórios, branches e pipelines de CI funcionam sem configuração adicional. Ele foi projetado para fluxos de trabalho nos quais você orienta vários agentes em paralelo, cada um em seu espaço de trabalho isolado, em vez de fazer todo o trabalho por conta própria, além de automatizar tarefas repetitivas. Com o Node.js instalado e sua cópia do projeto pronta, a próxima etapa é instalar o aplicativo e conectar esse repositório.

Nesta lição, você vai:

- instalar o aplicativo GitHub Copilot e entrar na sua conta.
- adicionar seu projeto ao aplicativo por meio do repositório do GitHub.
- conhecer o espaço de trabalho, incluindo o backlog criado pelo modelo.
- experimentar um chat rápido para saber mais sobre o próprio aplicativo.

## Cenário

Sua equipe está adotando agentes de IA para trabalhar em um backlog crescente. O aplicativo Copilot oferece um único lugar para orientar esse trabalho: selecionar issues, executar agentes, revisar alterações e fazer merge de pull requests. Nesta lição, você instalará e conectará o aplicativo e aprenderá a iniciar uma conversa sobre o projeto.

> [!NOTE]
> É necessário ter um plano elegível do Copilot: Copilot Student ou qualquer plano pago (Pro, Pro+, Business ou Enterprise). Se você usa o Copilot Business ou o Copilot Enterprise, o administrador deve habilitar a política **Copilot CLI** para que o aplicativo funcione.

## Instalar e configurar o aplicativo GitHub Copilot

Como você pode imaginar, a primeira etapa para usar o aplicativo GitHub Copilot é instalá-lo. Há versões disponíveis para Windows, macOS e Linux. Vamos instalar o aplicativo, autenticar a conta e adicionar o repositório Tailspin Toys.

1. Em um navegador, abra a [página inicial do aplicativo GitHub Copilot][download-app].
2. Baixe o aplicativo para sua plataforma e instale-o seguindo as instruções da página.
3. Abra o aplicativo após a instalação.
4. Selecione **Sign in to GitHub** e siga as instruções para se autenticar. Se você usa o GitHub Enterprise Server, escolha **Use GitHub Enterprise** e informe o endereço do servidor quando solicitado.
5. Após a autenticação, o aplicativo perguntará sobre a conexão dos seus repositórios. Selecione o repositório Tailspin Toys que você acabou de criar, cujo nome deve ser `<YOUR_GITHUB_HANDLE>/tailspin-toys`.
6. Selecione **Continue** para continuar a integração.
7. Quando o aplicativo solicitar um tema, selecione aquele que mais lhe agrada e depois selecione **Finish**.

> [!NOTE]
> Se a sua cópia do Tailspin Toys não aparecer automaticamente na lista, você poderá adicioná-la depois de concluir a integração no aplicativo. Ao final, o aplicativo Copilot exibirá a tela inicial. Nela, selecione **Choose from GitHub**, pesquise o repositório pelo nome (\<YOUR_GITHUB_HANDLE\>/tailspin-toys) e selecione-o. O repositório será adicionado ao aplicativo Copilot.

## Conhecer o espaço de trabalho

Com o projeto conectado, reserve um momento para conhecer o espaço de trabalho. O aplicativo organiza tudo em algumas áreas na barra lateral:

- **New**: como você pode imaginar, aqui você pode iniciar uma nova sessão de chat com o Copilot!
- **Pull requests**: seus pull requests, exibidos por meio da integração nativa com o GitHub. Nessa área, você pode procurar e filtrar pull requests, verificar o status da CI e revisar pull requests sem sair do aplicativo.
- **Issues**: suas issues, exibidas da mesma forma. Nessa área, você pode procurar e filtrar issues e iniciar uma sessão a partir de uma issue.
- **Automations**: tarefas de agente salvas que são executadas em uma agenda ou sob demanda. São ótimas para gerenciar listas de tarefas, a manutenção regular do projeto ou outras atividades repetitivas que você queira delegar. O encerramento traz links para elas como próximo passo, não como outro exercício do workshop.
- **Customize**: adicione recursos e funções ao aplicativo Copilot na forma de servidores MCP, plugins, skills e outros componentes. Você usará essa área para configurar o MCP do Playwright.
- **Chats**: conversas leves para perguntas e brainstorming que não precisam de branch ou espaço de trabalho próprios. Você experimentará uma ao final desta lição.
- **Sessions**: onde os agentes trabalham. Cada sessão é executada em seu próprio espaço de trabalho isolado, permitindo executar várias sessões ao mesmo tempo sem que as alterações entrem em conflito. Você iniciará sua primeira sessão ao adicionar avaliações por estrelas.

Ao longo do workshop, você explorará o espaço de trabalho!

> [!TIP]
> Na dúvida, pergunte ao Copilot! Se não souber como fazer algo ou se algo é possível, pergunte ao Copilot. Ele ajudará a orientar você.

### Localizar o backlog criado pelo modelo

Provavelmente não existe projeto sem backlog, e o Tailspin Toys não é diferente. Vamos explorar o backlog existente, gerado quando você criou sua cópia a partir do modelo.

1. Selecione **Issues** na barra lateral.
2. Encontre estas issues pelo título em vez de presumir seus números:

   - Allow users to filter games by category and publisher
   - Update our repository coding standards

3. Selecione uma issue para ler os detalhes. Cada issue também serve como ponto de partida para uma sessão de agente. Você começará pela issue de filtragem depois de concluir uma primeira alteração rápida.

> [!NOTE]
> As listas de itens em **Issues** e **Pull requests** são filtradas automaticamente para exibir somente itens dos repositórios adicionados ao aplicativo Copilot. Quer ver itens de trabalho de outros repositórios? Adicione-os ao aplicativo.

## Experimentar um chat rápido

Uma ótima maneira de se familiarizar com o aplicativo é usá-lo para saber mais sobre o *próprio aplicativo*, e um **chat rápido** é a ferramenta ideal. Os chats rápidos permitem fazer perguntas ou brainstorming sem criar uma branch ou worktree. Por isso, são perfeitos para perguntas rápidas e descartáveis, sem exigir uma sessão.

1. Na barra lateral, selecione **+** ao lado de **Chats** para abrir um novo chat.
2. Pergunte ao aplicativo como funcionam as próprias sessões:

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. Leia a resposta na visualização da conversa. Você verá que cada sessão é executada em seu próprio git worktree isolado, o que permite executar vários agentes em paralelo sem que as alterações entrem em conflito. Você pode continuar a conversa ou iniciar um novo chat a qualquer momento.

## Resumo e próximos passos

Parabéns! Você instalou o aplicativo GitHub Copilot, conectou o projeto e explorou o espaço de trabalho. Você aprendeu a:

- instalar o aplicativo e entrar no GitHub.
- adicionar um projeto por meio do repositório do GitHub.
- conhecer o espaço de trabalho e localizar o backlog criado em **Issues**.
- usar um chat rápido para fazer uma pergunta rápida e descartável.

Em seguida, você [iniciará sua primeira sessão de agente][next-lesson] e a usará para exibir uma avaliação por estrelas nos cards dos jogos.

## Recursos

- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Introdução ao aplicativo GitHub Copilot][getting-started]
- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app