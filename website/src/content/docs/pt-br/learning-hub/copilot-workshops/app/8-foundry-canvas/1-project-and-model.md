---
title: "Preparar o projeto e o modelo"
description: "Exporte o catálogo da Tailspin, crie um projeto do Foundry e uma implantação de modelo e valide ambos no Canvas."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/
  label: "Opcional: Incorporar o Foundry"
next:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: Criar e implantar o agente
---

Este primeiro módulo prepara os dados e os recursos do Azure para o Backer Concierge. Ainda não é necessário ter código do agente nem uma implantação hospedada.

Ao final, você terá:

- Uma exportação do catálogo com limites explícitos para fundamentar as respostas.
- Um projeto do Foundry e uma implantação de modelo escolhida para os requisitos do recurso.
- Uma implantação validada no Canvas e uma verificação básica do modelo com respostas limitadas ao catálogo.

## Cenário

As pessoas que apoiam a Tailspin Toys podem filtrar jogos por categoria e editora, mas perguntas como *Quais jogos seriam adequados para quem adora trocadilhos com Git?* não têm respostas em menus suspensos. Um Backer Concierge deve recomendar somente jogos do catálogo da Tailspin e nunca inventar jogos, editoras, avaliações, totais arrecadados, números de apoiadores, preços, números de jogadores, durações de partidas ou datas de lançamento. Um catálogo confiável e um modelo adequado são a base dessas respostas.

## Preparar suas ferramentas e a sessão da issue

A configuração conecta o aplicativo GitHub Copilot ao Azure e mantém todo o trabalho do recurso reunido.

1. Confirme que você tem uma assinatura do Azure. Se precisar de uma, as opções disponíveis incluem uma [assinatura gratuita do Azure com US$ 200 de crédito][azure-free] ou o [Azure for Students com US$ 100 em créditos][azure-students].
2. Instale a [Azure CLI][install-azure-cli] para seu sistema operacional e verifique a instalação usando `az version`.
3. Instale a [Azure Developer CLI][install-azd] e use `azd version` para verificar se a versão instalada é a 1.27.1 ou posterior.
4. Abra o aplicativo GitHub Copilot, abra **Customize** e selecione **Plugins**. Pesquise por `microsoft-foundry` e selecione **Install** para o plugin Microsoft Foundry, que inclui o Canvas e as skills do Foundry.

   ![Instalar o plugin Microsoft Foundry](/images/learning-hub/copilot-workshops/app-8-install-foundry-plugin.png)

5. Em **Customize**, selecione **Plugins**, pesquise por `azure` ou selecione-o na lista **Featured** e selecione **Install** para o plugin Azure.
6. Selecione **Issues** na barra lateral e, em seguida, encontre e abra a issue intitulada **Add a Backer Concierge assistant for catalog questions** no repositório Tailspin Toys. Selecione **New session** para iniciar uma sessão vinculada à issue em um novo worktree. Mantenha este repositório, branch do worktree e sessão da issue nos três módulos.
7. Digite `/microsoft-foundry` e depois `/azure` para confirmar que as duas skills estão instaladas e disponíveis; não envie prompts ainda. Se um plugin não aparecer imediatamente, reinicie o aplicativo, volte para esta mesma sessão da issue e verifique novamente.

## Gerar a exportação do catálogo

O repositório de exemplo inclui um script de exportação que fornece ao agente um arquivo que ele pode ler.

8. Nesta sessão de worktree vinculada à issue, substitua o prompt padrão `/fix-issue` na caixa de prompt por:

   ```plaintext
   Install the project dependencies, seed the database, then run the existing db:export script. Show me the command output and summarize the shape and grounding limits of db/catalog.json.
   ```

9. Revise a saída dos comandos. O Copilot deve executar o equivalente a:

   ```bash
   npm install
   npm run db:setup
   npm run db:export
   ```

   ![Gerar a exportação do catálogo](/images/learning-hub/copilot-workshops/app-8-generate-catalog-export.png)

10. Abra `db/catalog.json` e confirme que ele contém 21 jogos com título, descrição, categoria, editora e avaliação por estrelas. Verifique o campo `note`: o catálogo não contém totais arrecadados, números de apoiadores, faixas de contribuição nem datas de lançamento. Considere também como indisponíveis os preços, números de jogadores e durações de partidas ausentes, em vez de preencher as lacunas com conhecimento externo. Se a exportação falhar ou apresentar diferenças, peça ao Copilot que investigue e execute-a novamente antes de continuar.

   ![Exportação do catálogo aberta no aplicativo Copilot](/images/learning-hub/copilot-workshops/app-8-view-catalog.png)

## Configurar um projeto e um modelo do Foundry

Criar primeiro o projeto e a implantação no chat garante que o Canvas se conecte somente a recursos que já existem.

11. Selecione **+**, selecione **Terminal** e entre no Azure:

    ```bash
    az login
    ```

12. Verifique a assinatura selecionada e liste os grupos de recursos:

    ```bash
    az account show --output table
    az group list --output table
    ```

    Se a assinatura estiver incorreta, execute `az account set --subscription <subscription-id>` e repita os dois comandos.

    Se `rg-tailspin-toys` aparecer, inspecione os recursos:

    ```bash
    az resource list --resource-group rg-tailspin-toys --output table
    ```

    Se o grupo contiver recursos não relacionados ou compartilhados, pare e escolha um nome dedicado antes de usar o prompt a seguir. Substitua os nomes de exemplo em todos os prompts e comandos posteriores pelos nomes aprovados.
13. Na mesma sessão da issue, insira:

    ```plaintext
    Use the Microsoft Foundry skill to create a resource group named rg-tailspin-toys and a Foundry project named tailspin-toys.
    ```

    ![Criar o projeto do Foundry](/images/learning-hub/copilot-workshops/app-8-foundry-project-created.png)

14. Peça ao Copilot que recomende um modelo. Os critérios de aceitação da issue já estão no contexto porque a sessão foi iniciada a partir da issue:

    ```plaintext
    Use the Microsoft Foundry skill to recommend two or three current chat models in the tailspin-toys project that meet this issue's acceptance criteria. Explain the tradeoffs and wait for me to choose.
    ```

15. Confirme que o Copilot carrega a skill `microsoft-foundry` e escolha um modelo disponível com base nas vantagens e limitações de cada opção. O guia de início rápido de agentes hospedados do Microsoft Foundry usa atualmente `gpt-5.4-mini`, mas a disponibilidade e a cota variam de acordo com a região.

    ![Selecionar o modelo](/images/learning-hub/copilot-workshops/app-8-select-model.png)

16. Peça ao Copilot que implante sua seleção, revisando o projeto de destino e o custo antes de aprovar:

    ```plaintext
    Deploy the model I selected to the tailspin-toys Foundry project, using the model name as the deployment name.
    ```

> [!TIP]
> A disponibilidade dos modelos muda com o tempo. A escolha adequada é o modelo que o Copilot confirma estar disponível no seu projeto, e não um modelo fixo indicado neste módulo.

## Validar e fazer uma verificação básica do modelo no Canvas

Esta verificação valida o projeto e o modelo antes de existir qualquer código do agente. Uma verificação básica do modelo não substitui os testes de fundamentação das respostas do agente hospedado no módulo 2.

17. Selecione **+**, depois **Canvas** e depois **Microsoft Foundry (Preview)**.
18. Abra o menu **More options** no canto superior direito do Canvas e selecione **Sign in**.
19. Selecione o projeto **tailspin-toys** do Foundry. Expanda **Models** e confirme que a implantação aparece com o nome e o status esperados.

    ![Validar o projeto e o modelo no Canvas](/images/learning-hub/copilot-workshops/app-8-validate-project-model.png)

20. Na mesma sessão, insira:

    ```plaintext
    Use a skill do Microsoft Foundry para testar diretamente o modelo implantado no projeto tailspin-toys sem criar um agente. Fundamente a resposta no conteúdo de @db/catalog.json e pergunte: "Adoro jogos de quebra-cabeça sobre rastrear bugs. Qual jogo devo apoiar e quanto ele arrecadou?". Mostre a resposta e metadados úteis, como os tokens usados e o tempo de resposta, somente se estiverem disponíveis. Use meu login existente do Azure. Não exiba credenciais, altere arquivos nem crie recursos.
    ```

21. Revise a resposta. Ela deve recomendar apenas um jogo real de `db/catalog.json`, usar o título, a editora e a avaliação corretos e explicar que as informações de financiamento não estão disponíveis. Se o modelo inventar um jogo, detalhes do catálogo ou um valor de financiamento, compare outro modelo recomendado antes de continuar.

> [!NOTE]
> O Canvas lembra o projeto selecionado quando é reaberto. Suas etapas são **Create new hosted agents**, para gerar a estrutura inicial; **Build current hosted agent**, para conectar modelos, caixas de ferramentas, skills e mecanismos de proteção; e **Deploy and test**, para executar localmente e implantar no Microsoft Foundry.

## Ponto de verificação e próximos passos

Você preparou as ferramentas do Azure, exportou o catálogo e testou um modelo implantado de acordo com as regras de fundamentação do Backer Concierge. O ponto de verificação deste módulo é um modelo que recomenda jogos reais do catálogo sem inventar informações ausentes.

Em seguida, você usará o mesmo repositório Tailspin Toys, branch do worktree, sessão vinculada à issue, projeto do Foundry e implantação de modelo selecionada para [criar e implantar o agente][next-module]. Se encerrar aqui, [limpe os recursos do Azure][cleanup] para evitar custos contínuos.

[azure-free]: https://azure.microsoft.com/pricing/purchase-options/azure-account
[azure-students]: https://azure.microsoft.com/free/students
[install-azure-cli]: https://learn.microsoft.com/cli/azure/install-azure-cli
[install-azd]: https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd
[next-module]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[cleanup]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/#limpar-seus-recursos
