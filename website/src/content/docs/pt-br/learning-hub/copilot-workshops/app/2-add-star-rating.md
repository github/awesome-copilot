---
title: "Lição 2 - Executar sua primeira sessão de agente"
description: "Inicie sua primeira sessão de agente no aplicativo GitHub Copilot, faça uma pequena alteração nos cards dos jogos e integre-a como seu primeiro pull request."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Na lição anterior, você conheceu o espaço de trabalho e usou um chat rápido. Agora é hora de iniciar uma **sessão de agente** e fazer sua primeira alteração no projeto. A mudança será pequena: os dados dos jogos já têm uma avaliação por estrelas, mas os cards dos jogos na página inicial ainda não a exibem. Você pedirá ao agente que mostre essa avaliação, revisará a alteração e fará o merge dela como seu primeiro pull request.

Nesta lição, você vai:

- iniciar uma sessão de agente e aprender como ela é estruturada.
- pedir ao agente que faça uma alteração pequena e específica no projeto.
- revisar a alteração na visualização de diff do espaço de trabalho.
- executar o aplicativo localmente para confirmar a alteração no navegador.
- abrir e fazer merge do seu primeiro pull request.

## Cenário

Cada jogo no Tailspin Toys pode ter uma avaliação por estrelas, que já aparece na página de detalhes do jogo. No entanto, os cards dos jogos na página inicial mostram apenas título, categoria, distribuidora e descrição. Como aquecimento, você fará com que o agente exiba em cada card a avaliação existente. Essa alteração pequena e independente é perfeita para sua primeira sessão.

## Anatomia de uma sessão

Uma **sessão** é uma conversa com um agente executada em seu próprio espaço de trabalho isolado. Cada sessão recebe um **git worktree e uma branch dedicados**, o que permite executar várias sessões ao mesmo tempo, uma adicionando um recurso e outra corrigindo um bug, sem que as alterações entrem em conflito. Suas sessões aparecem na barra lateral agrupadas por repositório. Selecione qualquer uma delas para acessá-la.

Em uma sessão, você verá três elementos: a **conversa** com o agente, a **atividade de ferramentas** do agente enquanto ele explora e edita arquivos e a lista de **arquivos alterados** com os respectivos diffs.

## Iniciar uma sessão e solicitar a alteração

Vamos iniciar uma nova sessão para começar a explorar o projeto e implementar o recurso. Em uma [lição anterior][prior-lesson], você adicionou o projeto por meio do repositório do GitHub. Criaremos uma nova sessão para esse repositório e solicitaremos a alteração.

1. Volte ao aplicativo GitHub Copilot ou abra-o.
2. Selecione **Home screen**.
3. Verifique se `tailspin-toys` está selecionado como repositório.

   ![Caixa de prompt do aplicativo GitHub Copilot com o seletor de repositório definido como tailspin-toys e o seletor de modelo exibido abaixo do prompt](/images/learning-hub/copilot-workshops/app-2-start-session.png)

4. Use o prompt a seguir para solicitar a alteração:

   ```plaintext
   On the game cards, show each game's star rating. The Game type already includes a starRating field — it's a number out of 5, or null when a game hasn't been rated yet. Display it on each card in src/components/GameCard.astro, and when starRating is null show "No rating yet" instead. Keep the change small and don't restructure the card layout.
   ```

> [!NOTE]
> Observe que o prompt contém o nome do arquivo que o Copilot deve atualizar. Embora não seja obrigatório especificar os arquivos que o Copilot deve incluir no trabalho, indicar a direção certa ajuda o Copilot a gerar código mais rapidamente e reduz o uso de tokens.

5. Selecione <kbd>Enter</kbd> para enviar o prompt ao Copilot.

O aplicativo Copilot começa criando um novo worktree, uma cópia isolada do projeto. Em seguida, ele explora o projeto, localiza os arquivos que precisam ser atualizados e cria o código necessário para adicionar o novo recurso. Você acabou de adicionar um recurso com o aplicativo Copilot.

## Revisar o diff

Todas as alterações geradas por IA devem ser revisadas antes do merge, mesmo as pequenas. Vamos explorar as alterações diretamente no aplicativo Copilot.

1. No canto superior direito do aplicativo, selecione **Toggle review panel**. A tela de diff será aberta com todas as alterações pendentes feitas pelo Copilot.

   ![Barra de ferramentas superior do aplicativo GitHub Copilot com uma seta apontando para o botão Toggle review panel à direita de Create PR](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. Você verá código adicionado a `GameCard.astro`, o arquivo principal usado para exibir os detalhes do jogo. Ele deve ser semelhante ao exemplo a seguir: um pequeno bloco que renderiza a avaliação quando ela existe e usa "No rating yet" quando `starRating` é `null`:

   ```astro
   {game.starRating !== null ? (
       <span class="text-xs font-medium px-2.5 py-0.5 rounded bg-amber-900/60 text-amber-300" data-testid="game-rating">
           ★ {game.starRating} / 5
       </span>
   ) : (
       <span class="text-xs font-medium text-slate-500" data-testid="game-rating-empty">
           No rating yet
       </span>
   )}
   ```

> [!NOTE]
> Como o Copilot, assim como todas as ferramentas de IA generativa, é probabilístico, e não determinístico, o código exato pode ser diferente do exemplo. No entanto, ele deve ser relativamente semelhante.

## Verificar as alterações

Não devemos apenas ler o código e presumir que ele funciona. Também precisamos testar tudo visualmente. Para isso, iniciaremos o aplicativo no terminal e confirmaremos o funcionamento. O aplicativo Copilot inclui um terminal.

1. No painel de revisão à direita do aplicativo Copilot, selecione **Terminal**. Se não houver um botão **Terminal**, selecione **+** (identificado como **Open in panel**) e depois selecione **Terminal**.

   ![Botão Terminal no painel de revisão do aplicativo GitHub Copilot](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

2. Digite o comando a seguir na janela do terminal para iniciar o servidor de desenvolvimento do aplicativo Web:

   ```shell
   npm run dev
   ```

3. Quando o servidor iniciar, o que levará apenas alguns instantes, abra uma janela do navegador.
4. Acesse http://localhost:4321.
5. Agora você deve ver avaliações por estrelas em todos os jogos da página inicial.
6. Volte à janela do terminal.
7. Selecione <kbd>Ctrl</kbd>+<kbd>C</kbd> para interromper o servidor de desenvolvimento.

## Abrir e fazer merge do primeiro pull request

A alteração está correta. Agora é hora de entregá-la. Você pedirá ao agente que abra um pull request e depois fará a revisão e o merge no github.com. Por enquanto, gerenciaremos esse processo manualmente. Em uma próxima lição, veremos como o Copilot pode automatizar parte desse trabalho.

1. No canto superior direito, selecione **Create PR**.
2. Se solicitado, selecione **Sign in with your browser** e siga as instruções para se autenticar.
3. O Copilot começará a criar o PR.

Após a criação do PR, o Copilot monitorará os fluxos de trabalho do repositório que precisam ser executados. Depois de alguns instantes, o botão no canto superior direito mudará para **Ready to merge**, indicando que o PR está pronto para o merge.

4. Selecione o indicador **PR** logo acima do chat para abrir o PR no painel de revisão e visualizá-lo. Faça as revisões necessárias nesse painel.
5. Quando estiver tudo pronto, selecione **Ready to merge**.
6. Na nova caixa de diálogo, selecione **Merge pull request** para fazer o merge do pull request.

Você acaba de enviar um novo recurso para o site.

## Resumo e próximos passos

Você iniciou sua primeira sessão de agente e entregou sua primeira alteração. Especificamente, você:

- iniciou uma sessão de agente e aprendeu como as sessões são estruturadas.
- orientou o agente a fazer uma alteração pequena e específica nos cards dos jogos.
- revisou a alteração na visualização de diff do espaço de trabalho.
- executou o aplicativo localmente para confirmar a avaliação por estrelas no navegador.
- abriu um pull request e fez o merge por conta própria no github.com.

Em seguida, você usará o aplicativo para adicionar um padrão de instruções personalizadas ao repositório, começando por uma das issues do backlog. Continue para a [Lição 3 - Orientar o Copilot com instruções personalizadas][next-lesson].

## Recursos

- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Gerenciar issues e pull requests com o aplicativo GitHub Copilot][managing-issues-prs]

[prior-lesson]: /pt-br/learning-hub/copilot-workshops/app/1-install-copilot-app/#instalar-e-configurar-o-aplicativo-github-copilot
[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/3-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests