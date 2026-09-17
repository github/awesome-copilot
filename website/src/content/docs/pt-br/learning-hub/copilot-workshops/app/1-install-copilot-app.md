---
title: "Lição 1 - Instalar o aplicativo GitHub Copilot"
description: "Instale o aplicativo GitHub Copilot, conecte o repositório criado a partir do modelo, conheça o espaço de trabalho e experimente um chat rápido."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
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

- **Sessions**: onde os agentes trabalham. Cada sessão é executada em seu próprio espaço de trabalho isolado, permitindo executar várias sessões ao mesmo tempo sem que as alterações entrem em conflito. Você iniciará sua primeira sessão na próxima lição.
- **Quick chats**: conversas leves para perguntas e brainstorming que não precisam de branch ou espaço de trabalho próprios. Você experimentará uma ao final desta lição.
- **My work**: suas issues e pull requests, exibidos por meio da **integração nativa com o GitHub**. Nessa área, você pode procurar e filtrar issues e pull requests, verificar o status da CI, iniciar uma sessão a partir de uma issue e revisar pull requests sem sair do aplicativo.
- **Automations**: tarefas de agente salvas que são executadas em uma agenda ou sob demanda. Você criará uma perto do fim deste percurso.

### Localizar o backlog criado pelo modelo

Como o aplicativo tem integração nativa com o GitHub, o trabalho pendente no repositório aparece dentro dele. Quando você criou o repositório a partir do modelo, um backlog de issues foi criado. Vamos confirmar que ele está disponível.

1. Selecione **My work** na barra lateral.
2. O modelo criou oito issues no seu backlog. Este módulo foca nas três a seguir — confirme que você consegue vê-las:

   - Allow users to filter games by category and publisher
   - Update our repository coding standards
   - Implement pagination on the game list page

3. Selecione uma issue para ler os detalhes. Cada issue também serve como ponto de partida para uma sessão de agente. Você começará a trabalhar com elas mais adiante neste percurso.

> [!NOTE]
> A lista de itens em My work é filtrada automaticamente para exibir somente itens dos repositórios adicionados ao aplicativo Copilot. Quer ver itens de trabalho de outros repositórios? Adicione-os ao aplicativo.

## Experimentar um chat rápido

Uma ótima maneira de se familiarizar com o aplicativo é usá-lo para saber mais sobre o *próprio aplicativo*, e um **chat rápido** é a ferramenta ideal. Os chats rápidos permitem fazer perguntas ou brainstorming sem criar uma branch ou worktree. Por isso, são perfeitos para perguntas rápidas e descartáveis, sem exigir uma sessão.

1. Na barra lateral, selecione **+** ao lado de **Quick chats** para abrir um novo chat.
2. Pergunte ao aplicativo como funcionam as próprias sessões:

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. Leia a resposta na visualização da conversa. Você verá que cada sessão é executada em seu próprio git worktree isolado, o que permite executar vários agentes em paralelo sem que as alterações entrem em conflito. Você pode continuar a conversa ou iniciar um novo chat a qualquer momento.

## Resumo e próximos passos

Parabéns! Você instalou o aplicativo GitHub Copilot, conectou o projeto e explorou o espaço de trabalho. Você aprendeu a:

- instalar o aplicativo e entrar no GitHub.
- adicionar um projeto por meio do repositório do GitHub.
- conhecer o espaço de trabalho e localizar o backlog criado em **My work**.
- usar um chat rápido para fazer uma pergunta rápida e descartável.

Em seguida, você iniciará sua primeira sessão de agente e fará a primeira alteração no projeto: exibir uma avaliação por estrelas nos cards dos jogos. Continue para a [Lição 2 - Executar sua primeira sessão de agente][next-lesson].

## Recursos

- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Introdução ao aplicativo GitHub Copilot][getting-started]
- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]

[ex0]: /pt-br/learning-hub/copilot-workshops/app/0-prerequisites/
[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app