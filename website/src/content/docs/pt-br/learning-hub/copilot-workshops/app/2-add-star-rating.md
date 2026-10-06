---
title: "Lição 2 - Adicionar avaliações por estrelas: uma melhoria rápida"
description: "Inicie sua primeira sessão de agente no aplicativo GitHub Copilot, faça uma pequena alteração nos cards dos jogos e integre-a como seu primeiro pull request."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
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
2. Selecione **+** ao lado de **Projects**.
3. Selecione `tailspin-toys` como repositório.
4. Escolha **new working tree** e o modo **Interactive** abaixo da caixa de prompt. Use o prompt a seguir para solicitar a alteração:

    ```plaintext
    Show each game's starRating out of 5 in the game cards on the list page. If the rating is null, show "No rating yet". Keep the card layout as it is, add tests, and run the relevant checks.
    ```

5. Pressione <kbd>Enter</kbd> para enviar o prompt ao Copilot.

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

Revise os resultados das verificações automatizadas do agente antes de abrir um navegador. Confirme que os testes cobrem um `starRating` numérico e a alternativa para `null`. Um pré-requisito ausente ou uma verificação ignorada não conta como aprovação; revise qualquer solicitação de instalação antes de aprová-la.

É claro que não devemos apenas ler o código e presumir que funciona. Vamos pedir ao Copilot que abra o site para examinarmos a interface atualizada. Para isso, podemos pedir que ele inicie o site e o abra em um canvas de navegador.

> [!TIP]
> Um canvas é um widget interativo disponível dentro do próprio aplicativo Copilot. Você explorará opções personalizadas e até criará seu próprio canvas mais adiante, mas, por enquanto, usaremos o canvas de navegador integrado.

1. Use o prompt a seguir para pedir ao Copilot que inicie o aplicativo e abra a página no canvas de navegador:

    ```plaintext
    Start the app and open it in the browser canvas.
    ```

2. Em alguns instantes, o aplicativo será iniciado e uma janela do navegador será aberta dentro do aplicativo Copilot.
3. Confirme se os cards de jogos avaliados exibem a nota de um total de cinco.
4. Quando terminar, use o prompt a seguir para pedir ao Copilot que interrompa o servidor de desenvolvimento iniciado para esta sessão:

    ```plaintext
    Stop the dev server and close the browser canvas.
    ```

## Abrir e fazer merge do primeiro pull request

Você criou o recurso! Agora é hora de criar um pull request (PR) para fazer o merge do novo código na base de código existente.

1. Selecione **Create PR** no canto superior direito.
2. Se solicitado, selecione **Sign in with your browser** e siga as instruções para se autenticar.
3. O Copilot começará a criar o PR.
4. Selecione o indicador **PR** logo acima do chat para abrir o PR no painel de revisão e visualizá-lo. Faça as revisões necessárias nesse painel.
5. Quando estiver tudo pronto, selecione **Ready to merge**.
6. Na nova caixa de diálogo, selecione **Merge pull request** para fazer o merge do pull request.

## Resumo e próximos passos

Você iniciou sua primeira sessão de agente e entregou sua primeira alteração. Especificamente, você:

- iniciou uma sessão de agente e aprendeu como as sessões são estruturadas.
- orientou o agente a fazer uma alteração pequena e específica nos cards dos jogos.
- revisou a alteração na visualização de diff do espaço de trabalho.
- executou o aplicativo localmente para confirmar a avaliação por estrelas no navegador.
- abriu o PR 1, revisou as verificações e fez o merge explicitamente.

Em seguida, você [começará pela issue de filtragem e usará os modos Plan e Autopilot][next-lesson] para criar um recurso maior.

## Recursos

- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Gerenciar issues e pull requests com o aplicativo GitHub Copilot][managing-issues-prs]

[prior-lesson]: /pt-br/learning-hub/copilot-workshops/app/1-install-copilot-app/#instalar-e-configurar-o-aplicativo-github-copilot
[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/3-agent-modes/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests