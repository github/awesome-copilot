---
title: "Conectar o agente ao site"
description: "Integre o Backer Concierge hospedado por meio de um proxy local que protege as credenciais e teste o widget de ponta a ponta."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: Criar e implantar o agente
next: { link: /pt-br/learning-hub/copilot-workshops/app/10-review/, label: Revisão e próximos passos }
---

Este último módulo conecta o agente hospedado testado em [Criar e implantar o agente][previous-module] ao site da Tailspin Toys em execução local.

Ao final, você terá:

- Um proxy local do Azure Functions que protege as credenciais do Foundry e os identificadores de conversa.
- Um widget de chat acessível com comportamento verificado de ponta a ponta.
- Uma integração verificada localmente e um ponto de verificação para a limpeza dos recursos.

## Cenário

As pessoas que apoiam a Tailspin Toys precisam de orientações sobre o catálogo no mesmo lugar em que exploram os jogos. O Backer Concierge deve preservar a conversa, funcionar com navegação pelo teclado e lidar de forma clara com informações indisponíveis e erros. Essa conveniência não pode expor credenciais do serviço nem detalhes internos da conversa ao navegador.

## Retomar o ponto de verificação do agente hospedado

A integração usa o agente hospedado existente, em vez de criar novos recursos do Foundry.

1. Retome o mesmo repositório Tailspin Toys, branch do worktree e sessão da issue **Add a Backer Concierge assistant for catalog questions** dos módulos anteriores. Confirme que o `azure.yaml` na raiz, o código-fonte do agente e o catálogo estão presentes e verifique a assinatura registrada, o grupo de recursos dedicado, o projeto do Foundry, a implantação de modelo e a versão testada do agente hospedado.
2. Se os recursos foram removidos na limpeza, restaure o [projeto e o modelo][project-module] e a [implantação hospedada testada][previous-module] correspondentes antes da integração.

## Criar o proxy do lado do servidor

A Tailspin Toys é totalmente pré-renderizada. O código do navegador nunca deve chamar o agente hospedado diretamente nem receber credenciais do Foundry. Uma **barreira de proteção de credenciais do lado do servidor**, implementada localmente com o Azure Functions, faz a autenticação no Foundry e retorna somente a resposta do agente ao navegador. O navegador envia cada mensagem com uma referência opaca à conversa; o proxy mapeia essa referência para a conversa do Foundry sem expor o identificador interno.

O proxy é a única parte do código que tem permissão para acessar suas credenciais do Azure. Neste workshop, a Function e o site são executados localmente, com o servidor de desenvolvimento do Astro encaminhando as solicitações `/api` para a Function.

> [!IMPORTANT]
> Este proxy do workshop é apenas para desenvolvimento local. Ele não deve ser implantado como um endpoint público anônimo. Uma integração de produção precisa de um projeto de autenticação e controle de abuso específico para a aplicação, incluindo limites de taxa ou cotas adequados, restrições de CORS, monitoramento e controles de custo.

3. Na mesma sessão do Copilot, insira:

   ```plaintext
   Add a local Azure Functions proxy in api for the static Astro site to call my deployed Backer Concierge during development. Use my existing local Azure sign-in, keep credentials and Foundry conversation identifiers out of the browser, return an opaque conversation handle, validate requests, sanitize errors, and add focused tests. Configure the Astro development server so /api requests reach the local Function. Don't create public deployment infrastructure.
   ```

4. Revise o proxy gerado e os testes focados quanto à validação de solicitações, à remoção de informações sensíveis dos erros, às referências opacas de conversa e à proteção de credenciais restrita ao servidor. Peça ao Copilot que execute os testes focados e corrija quaisquer falhas.
5. Abra outro terminal, inicie a Function local usando o comando fornecido pelo Copilot e deixe-a em execução.
6. Volte ao chat e peça ao Copilot que teste o proxy local:

   ```plaintext
   Test the local /api/concierge endpoint by asking "Which games are under $30?" Show me the sanitized response and confirm that no credentials or internal conversation identifiers are returned.
   ```

7. Inspecione a resposta: ela deve explicar que o catálogo não contém preços. Confirme que ela não contém token do Foundry, credencial, identificador interno de conversa, endpoint do projeto nem rastreamento de pilha. Se não for possível acessar a Function ou se a resposta expuser detalhes ou inventar preços, envie ao Copilot as informações da falha sem dados sensíveis, corrija o problema e execute novamente os testes do proxy antes de continuar.

   ![Teste do proxy local](/images/learning-hub/copilot-workshops/app-8-local-proxy-test.png)

## Criar e testar o widget de chat

Com o proxy em execução, o widget apresenta a conversa no site sem expor detalhes do Foundry.

8. Peça ao Copilot que crie a integração ao site:

   ```plaintext
   Add an accessible Backer Concierge chat widget to the Astro site. Connect it to /api/concierge, preserve the conversation using the returned opaque handle, follow the existing design guidance, support keyboard use, keep Foundry details out of the browser, and add end-to-end tests covering the chat flow, conversation continuity, accessibility, error handling, and grounding boundaries.
   ```

9. Inicie o servidor de desenvolvimento do Astro em outro terminal usando o comando fornecido pelo Copilot. Mantenha o site e a Function local em execução.
10. Peça ao Copilot que execute os testes de ponta a ponta:

    ```plaintext
    Run the end-to-end tests for the Backer Concierge widget in the Tailspin Toys site. Verify its core chat flow, conversation continuity, accessibility, error handling, grounding boundaries, and secure use of the local proxy. Report the results and include evidence for any failures.
    ```

11. Revise o relatório e verifique o comportamento relatado no navegador, incluindo o uso do teclado e a conversa de duas interações das [verificações de aceitação do agente hospedado][agent-checks]. Confirme que as solicitações do navegador passam por `/api/concierge` com uma referência opaca, e não diretamente pelo Foundry, e que as respostas não expõem credenciais nem identificadores internos do Foundry. Verifique se as recomendações e as respostas sobre dados ausentes permanecem dentro dos limites do catálogo. Corrija os testes que falharam com o Copilot, reinicie o serviço local afetado se necessário e execute os testes novamente.

    ![Resultados dos testes de ponta a ponta do widget Backer Concierge](/images/learning-hub/copilot-workshops/app-8-e2e-test-results.png)

## Ponto de verificação e próximos passos

Você criou um proxy local que protege as credenciais, conectou um widget de chat acessível e verificou todo o fluxo da conversa com o Backer Concierge hospedado. O ponto de verificação deste módulo é uma integração ao site testada localmente que preserva os limites do catálogo e mantém as credenciais e os identificadores internos do Foundry fora do navegador. Ela não representa uma implantação de produção do proxy ou do site.

Quando terminar de experimentar, interrompa os dois serviços locais e [limpe os recursos do Azure][cleanup]. Em seguida, continue para [Revisão e próximos passos][core-review] na rota principal do workshop.

[previous-module]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[project-module]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[agent-checks]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/#inspecionar-o-agente-localmente
[cleanup]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/#limpar-seus-recursos
[core-review]: /pt-br/learning-hub/copilot-workshops/app/10-review/
