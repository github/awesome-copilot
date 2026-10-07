---
title: "Lição 3 - Modos de agente: Plan e Autopilot"
description: "Explore os modos de agente: use Plan para definir uma abordagem, Autopilot para criar a filtragem a partir de uma issue e Interactive para revisar e verificar o resultado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Começamos adicionando um pequeno recurso ao projeto. No entanto, alterações maiores exigem um processo mais robusto. Felizmente, o aplicativo GitHub Copilot foi desenvolvido para trabalhar com o fluxo existente de uma organização, garantindo que as soluções certas sejam criadas da maneira correta. Esta é a primeira de várias lições nas quais você seguirá um processo típico de desenvolvimento orientado por agentes: começará usando uma issue para gerar um novo recurso, garantirá que o código seja válido e que o recurso se comporte como esperado e, por fim, fará o merge dele no projeto.

> [!NOTE]
> Você usará a mesma sessão ao longo do fluxo do recurso. Normalmente, você teria sessões ou PRs diferentes para os vários tipos de arquivo com os quais trabalharia, mas vamos simplificar para manter o foco nos conceitos principais.

Para começar, nesta lição, você vai:

- iniciar uma nova sessão de agente a partir de uma issue do GitHub.
- definir os requisitos no modo **Plan**.
- implementar o novo recurso usando o modo **Autopilot**.
- revisar o código.
- validar manualmente o recurso em um canvas de navegador.

Ao continuar o desenvolvimento desse recurso, você atualizará as instruções do repositório, personalizará a skill quality-checks existente, adicionará a validação com MCP, criará um agente de QA e abrirá o PR do recurso.

## Cenário

O catálogo da Tailspin Toys está crescendo, e os visitantes precisam filtrar os jogos por categoria e editora. A issue do backlog descreve o recurso, mas detalhes como a combinação de categorias precisam ser definidos antes da codificação. Você usará o modo Plan para resolver essas decisões e, em seguida, autorizará uma implementação com escopo definido usando o Autopilot.

## Contexto

Adicionar agentes de codificação de IA ao fluxo de desenvolvimento não muda os fundamentos. Na verdade, eles se tornam ainda mais importantes! A maioria das pessoas desenvolvedoras segue um fluxo semelhante a este:

1. Abrir uma issue registrada com detalhes sobre o que precisa ser feito.
2. Criar um plano do que precisa ser desenvolvido.
3. Desenvolver e revisar o código.
4. Executar os testes para validar o código.
5. Validar manualmente a nova funcionalidade.
6. Criar um pull request (PR).
7. Depois que o código for revisado e o processo de integração contínua for concluído com sucesso, fazer o merge do código.

> [!NOTE]
> Os detalhes exatos variam de acordo com a equipe e a organização. No entanto, a maioria dos fluxos é uma variação do processo listado acima.

Ao seguir essa abordagem padrão, você garante que o código gerado pela IA atenda aos requisitos definidos e passe pelo mesmo processo de avaliação que o código escrito manualmente.

## Modos de sessão

O **modo de sessão** controla o nível de autonomia do agente. Você pode defini-lo no menu suspenso abaixo do campo do prompt e alterá-lo a qualquer momento:

- **Interactive**: você e o agente trabalham em conjunto. O agente sugere alterações e aguarda sua confirmação antes de continuar.
- **Plan**: o agente cria um plano primeiro. Você revisa e aprova o plano antes que o agente o execute.
- **Autopilot**: o agente trabalha com total autonomia, escrevendo código, executando testes e iterando sem aguardar sua confirmação.

Comece no modo Plan, revise o plano e use o Autopilot para implementá-lo.

## Iniciar uma sessão a partir da issue

Confirme que o PR das avaliações por estrelas foi integrado e que a branch `main` local está atualizada antes de começar.

1. Selecione **Issues** e abra **Allow users to filter games by category and publisher**.
2. Selecione **New session** e escolha uma **new working tree** baseada na `main` atualizada.

    ![Visualização da issue no aplicativo GitHub Copilot com uma seta apontando para o botão New session](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

3. Confirme que a issue está anexada à sessão e selecione **Plan** no seletor de modo.

## Planejar o recurso de filtragem

O planejamento permite revisar a abordagem antes que o Copilot escreva o código. Como você começou pela issue, o Copilot já tem a solicitação do recurso como contexto. Envie:

```plaintext
Build this feature.
```

Responda às perguntas do Copilot e compare o plano com os critérios de aceitação da issue. Verifique se ele abrange a filtragem por categoria e editora, controles acessíveis, alterações no acesso a dados e testes. Discuta qualquer comportamento que não esteja claro, como a forma de combinar várias categorias ou o que acontece quando nenhum jogo corresponde aos filtros.

O plano deve incluir lint, testes de unidade, testes E2E e verificação de tipos usando as ferramentas existentes do projeto. Mantenha o foco na implementação e nos testes da filtragem; você criará o PR depois de concluir o fluxo de qualidade. Solicite alterações no plano antes de aprová-lo e mantenha à mão a URL da issue e os esclarecimentos definidos para a validação posterior.

## Aprovar explicitamente o Autopilot

Quando estiver satisfeito com o plano, selecione **Approve and implement with autopilot** ou a opção equivalente na sua versão. Confirme que o indicador de modo mostra **Autopilot**.

O Copilot começará a trabalhar na implementação! Você perceberá que ele passará pelo processo de forma iterativa, seguindo o plano estabelecido, gerando código e até executando testes.

> [!NOTE]
> A aprovação pode iniciar a implementação imediatamente, portanto, revise o plano primeiro. Se o Copilot informar dependências ausentes ou um conflito de porta, resolva o problema de configuração antes de considerar as verificações concluídas. Interrompa apenas os servidores que você iniciou.

## Revisar e verificar a implementação

Depois que o código for gerado, ele precisará ser revisado antes do merge, assim como qualquer outro código. Vamos revisar o código e executar o site para garantir que tudo esteja correto.

1. Abra **Changes** e examine a implementação da filtragem e os testes.
2. Compare o resultado com a issue e os esclarecimentos aprovados, incluindo combinações de várias categorias e editoras. Verifique se as alterações seguem as instruções existentes do repositório.
3. Examine a saída de lint, testes de unidade, testes E2E e verificação de tipos. Uma verificação ignorada não conta como aprovação.
4. Resolva as falhas e execute novamente as verificações afetadas antes de aceitar a implementação. A configuração E2E do Playwright cria e serve uma versão de pré-visualização e pode reutilizar um servidor local; confirme que o servidor testado pertence a esta worktree, e não a uma lição anterior.

## Explorar a nova funcionalidade

O código parece correto, mas será que funciona? Vamos iniciar o aplicativo como fizemos antes e abrir o site em um canvas de navegador.

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

## Resumo e próximos passos

Você usou diferentes modos de agente para criar e revisar um recurso. Nesta lição, você:

- iniciou uma nova sessão de agente a partir de uma issue do GitHub.
- definiu os requisitos no modo **Plan**.
- implementou o novo recurso usando o modo **Autopilot**.
- revisou o código.
- validou manualmente o recurso em um canvas de navegador.

Agora, vamos explorar com mais detalhes como o código é gerado e garantir que ele siga as práticas documentadas [usando instruções personalizadas][next-lesson].

## Recursos

- [Trabalhar com sessões de agente no aplicativo GitHub Copilot][agent-sessions]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/4-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions