---
title: "Criar e implantar o agente"
description: "Gere a estrutura inicial do Backer Concierge no Canvas, inspecione-o localmente e implante e teste-o novamente no Foundry."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: Preparar o projeto e o modelo
next:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
  label: Conectar o agente ao site
---

Este módulo transforma o projeto, a implantação de modelo e o catálogo de [Preparar o projeto e o modelo][previous-module] em um Backer Concierge hospedado por meio do Microsoft Foundry Canvas.

Ao final, você terá:

- A estrutura inicial de um agente com os dados do catálogo empacotados e testes focados.
- Evidências locais para cada critério de aceitação relacionado ao catálogo e à conversa.
- Uma versão implantada do agente testada novamente no Foundry.

## Cenário

A Tailspin Toys precisa de um concierge que responda a perguntas reais sobre o catálogo, reconheça quando faltam informações e lembre os jogos discutidos em uma conversa. O serviço precisa conquistar essa confiança antes de fazer parte da loja.

## Preparar as ferramentas de implantação

A inspeção e a implantação de agentes hospedados usam a Azure Developer CLI por meio do Canvas; o projeto e o modelo existentes do Foundry são reutilizados.

1. Retome a mesma sessão vinculada à issue **Add a Backer Concierge assistant for catalog questions** do módulo 1. Confirme que `db/catalog.json` está intacto, que você está conectado à assinatura e ao projeto do Foundry corretos e que a implantação de modelo continua disponível. Se os recursos foram removidos na limpeza, repita primeiro as etapas relevantes da [configuração do projeto e do modelo][previous-module].

2. Selecione **+**, selecione **Terminal** e entre na Azure Developer CLI, concluindo a autenticação no navegador quando solicitado:

   ```bash
   azd auth login
   ```

3. Execute `azd config show` para verificar a assinatura do Azure. Se ela estiver vazia ou incorreta, atualize-a com `azd config set defaults.subscription <subscription-id>` e execute `azd config show` novamente para confirmar a alteração.
## Gerar a estrutura inicial do Backer Concierge

O Canvas gera o código, a estrutura de pastas e o `azure.yaml` na raiz que conectam o Backer Concierge à implantação de modelo existente.

4. Na versão prévia de **Create new hosted agents**, insira:

   ```plaintext
   Scaffold a hosted agent named Backer Concierge in agent/backer-concierge, connected to the tailspin-toys project and the model deployment I just confirmed. Use Microsoft Agent Framework with the Responses API. Ground it in db/catalog.json and ensure it meets the acceptance criteria in this issue. Keep a single azure.yaml at the repository root with the hosted-agent service pointing to agent/backer-concierge. Make sure the deployed agent includes the catalog data it needs, and add focused tests.
   ```

   O Canvas envia ao Copilot o prompt e o contexto da assinatura atual e do projeto do Foundry. Ele procura exemplos de Agent Framework + Responses API; pode aparecer uma opção como **Agent with Local Tools (Responses, Agent Framework, Python)**.

   ![Gerar a estrutura inicial do agente Backer Concierge no Canvas](/images/learning-hub/copilot-workshops/app-8-scaffold-backer-concierge.png)

5. Revise as alterações do Copilot na aba **Files** com base neste ponto de verificação. Os nomes dos arquivos gerados dentro de `src` podem variar, mas os limites do projeto e a localização de `azure.yaml` devem corresponder ao seguinte:

   - O agente fica em `agent/backer-concierge`.
   - Um único `azure.yaml` na raiz do repositório contém um serviço com `host: azure.ai.agent`.
   - O agente que será implantado inclui sua própria cópia gerada do catálogo.
   - Testes focados cobrem os requisitos de fundamentação das respostas no catálogo.
   - Nenhuma credencial ou arquivo de ambiente local está incluído.

   ```text
   tailspin-toys/
   ├── azure.yaml
   ├── agent/
   │   └── backer-concierge/
   │       └── requirements.txt
   ├── db/
   │   └── catalog.json
   └── src/
   ```

6. Peça ao Copilot que execute os testes focados e corrija quaisquer falhas antes de continuar para **Deploy and test**.

## Inspecionar o agente localmente

**Inspect Locally** executa `azd ai agent run` no terminal integrado do Copilot, aguarda o agente hospedado iniciar e abre o Agent Inspector incorporado.

7. Em **Deploy and test**, selecione **Inspect Locally** e aguarde o Agent Inspector abrir.

> [!NOTE]
> A primeira execução local pode levar vários minutos enquanto `azd` cria um ambiente e instala as dependências.

8. Se o inspetor não conseguir se conectar, confirme que nenhum outro processo está usando a porta necessária, envie o erro ao Copilot e tente novamente após a correção do problema.
9. Teste uma **recomendação fundamentada no catálogo** no Agent Inspector:

    ```text
    I love puzzle games about tracking down bugs. What should I back?
    ```

    Resultado esperado: menciona somente títulos reais do catálogo e usa as informações corretas para cada título.

    ![Recomendação fundamentada no catálogo no Agent Inspector](/images/learning-hub/copilot-workshops/app-8-grounded-recommendation.png)

10. Teste uma **armadilha de alucinação**:

    ```text
    How much has Pipeline Conquest raised so far, and how many backers does it have?
    ```

    Resultado esperado: explica que o catálogo não acompanha a arrecadação nem os apoiadores e, em seguida, oferece informações que estão presentes.

11. Teste a **pressão para ir além do catálogo**:

    ```text
    Do you have Wingspan? If not, what's the closest thing you've got?
    ```

    Resultado esperado: informa que Wingspan não está no catálogo, não o descreve com base em conhecimento externo e redireciona a resposta para títulos reais da Tailspin.

12. Teste um **pedido vago**:

    ```text
    Recommend me something good.
    ```

    Resultado esperado: faz uma pergunta curta para esclarecer o pedido e ainda não recomenda um título.

13. Teste a **precisão da classificação**:

    ```text
    What are your three highest rated games?
    ```

    Resultado esperado: retorna as três entradas mais bem avaliadas do catálogo na ordem correta e com as avaliações corretas.

14. Teste a **continuidade da conversa** enviando estes prompts na mesma conversa:

    ```text
    Show me two highly rated strategy games.
    ```

    ```text
    Which of those has the higher rating?
    ```

    Resultado esperado: a segunda resposta se refere somente aos dois títulos da primeira resposta e compara corretamente as avaliações deles no catálogo.

15. Compare cada resposta com `db/catalog.json` e os critérios de aceitação da issue. Confirme que o agente nunca inventa jogos, editoras, avaliações, totais arrecadados, números de apoiadores, preços, números de jogadores, durações de partidas ou datas de lançamento. Se o Agent Inspector relatar um erro ou uma resposta ultrapassar os limites das informações do catálogo, copie o resultado para a área de prompt do Canvas e peça ao Copilot que corrija o problema. Reinicie a inspeção local e execute novamente o teste que falhou após cada alteração; depois, confirme que todas as seis verificações passaram antes de implantar.

## Implantar e testar novamente o agente hospedado

O Canvas usa `azd` para implantar o agente testado. O Foundry empacota o código-fonte do serviço, resolve as dependências, faz o build remotamente e publica o serviço no Microsoft Foundry.

16. No Canvas, em **Deploy and test**, selecione **Deploy to Foundry**. Revise o prompt que ele insere no chat.

    ![Prompt Deploy to Foundry no Canvas](/images/learning-hub/copilot-workshops/app-8-deploy-to-foundry.png)

17. Verifique se há uma confirmação de implantação, a versão do agente, o status e um link para o playground do agente no Foundry. Se a implantação falhar, envie o erro ao Copilot e resolva-o no mesmo projeto antes de tentar novamente pelo Canvas.
18. Selecione **Test in Foundry Portal** no Canvas para abrir o playground do agente implantado. Execute novamente todas as seis verificações de aceitação das etapas 9–14 nesta versão implantada, mantendo o par de prompts em uma única conversa para testar a continuidade. Compare as respostas com o catálogo; se alguma verificação falhar, peça ao Copilot que corrija o problema, execute novamente os testes locais, reimplante pelo Canvas e teste novamente a versão hospedada.

## Ponto de verificação e próximos passos

Você gerou a estrutura inicial do Backer Concierge, testou localmente a fundamentação no catálogo e o comportamento da conversa, implantou-o no Microsoft Foundry e testou novamente a versão hospedada. O ponto de verificação deste módulo é um agente hospedado que passa nas seis verificações de aceitação sem inventar informações ausentes.

Em seguida, você usará o mesmo repositório Tailspin Toys, branch do worktree, sessão vinculada à issue, projeto do Foundry, implantação de modelo selecionada e agente hospedado para [conectar o agente ao site][next-module]. Se encerrar aqui, [limpe os recursos do Azure][cleanup] para evitar custos contínuos.

[previous-module]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[next-module]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[cleanup]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/#limpar-seus-recursos
