---
title: "Lição 5 - Testar com o servidor MCP do Playwright"
description: "Adicione o servidor MCP do Playwright ao aplicativo GitHub Copilot e peça ao agente que teste manualmente o recurso de filtragem em um navegador real."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Na lição anterior, você criou e verificou o recurso de filtragem com o conjunto de testes automatizados do projeto. Os testes automatizam a validação do código, mas permitir que o agente confirme o comportamento é uma abordagem eficiente. Assim, o agente pode responder a problemas identificados na própria interface que está criando. Vamos explorar como o MCP dá aos agentes de IA acesso a recursos externos e adicionar o servidor MCP do Playwright para permitir que o Copilot interaja diretamente com o site que você está desenvolvendo.

Nesta lição, você vai:

- entender o que é o Model Context Protocol (MCP) e como o aplicativo GitHub Copilot o utiliza.
- adicionar o servidor MCP do Playwright nas configurações do aplicativo.
- pedir ao agente que controle um navegador e explore o recurso de filtragem.

## Cenário

Embora os testes de unidade e de ponta a ponta sejam importantes, validar atualizações na interface exige interagir com ela. Você quer permitir que o Copilot use o site em desenvolvimento como uma pessoa usuária faria, automatizando ainda mais o processo de alteração e aumentando a confiança de que as atualizações se comportam conforme o esperado.

## O que é o Model Context Protocol (MCP)?

O [Model Context Protocol (MCP)][mcp-blog-post] oferece aos agentes de IA uma forma de se comunicar com ferramentas e serviços externos em tempo real. Isso permite que eles acessem informações atualizadas, usando recursos, e realizem ações em seu nome, usando ferramentas.

Essas ferramentas e esses recursos são acessados por meio de um servidor MCP, que funciona como uma ponte entre o agente de IA e as ferramentas e os serviços externos. O servidor MCP é responsável por gerenciar essa comunicação, seja com APIs existentes ou com ferramentas locais, como pacotes NPM. Cada servidor MCP representa um conjunto diferente de ferramentas e recursos que o agente de IA pode acessar.

Alguns servidores MCP conhecidos são:

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server): oferece acesso a um conjunto de APIs para gerenciar repositórios do GitHub. Ele permite que o agente de IA realize ações como criar repositórios, atualizar repositórios existentes e gerenciar issues e pull requests.
- [**Playwright MCP Server**][playwright-mcp-server]: oferece recursos de automação de navegador usando o Playwright. Ele permite que o agente de IA realize ações como acessar páginas Web, preencher formulários e selecionar botões.

Há muitos outros servidores MCP que fornecem acesso a diferentes ferramentas e recursos. O GitHub mantém um [registro de MCP](https://github.com/mcp) para facilitar a descoberta e as contribuições ao ecossistema.

> [!CAUTION]
> Trate os servidores MCP como qualquer outra dependência do projeto. Antes de usar um servidor MCP, revise cuidadosamente o código-fonte, verifique quem o publicou e considere as implicações de segurança. Use apenas servidores MCP confiáveis e tenha cuidado ao conceder acesso a recursos ou operações confidenciais.

## Adicionar o servidor MCP do Playwright

Você adiciona e gerencia servidores MCP nas configurações do aplicativo. O aplicativo inclui um catálogo de servidores conhecidos, portanto o [servidor MCP do Playwright][playwright-mcp-server] está a poucas seleções de distância.

1. Selecione <kbd>Ctrl</kbd>+<kbd>,</kbd> para abrir a página de configurações do aplicativo Copilot.
2. Selecione **MCP servers**.
3. Na caixa de diálogo de pesquisa, digite `Playwright`.
4. Selecione **Playwright** na lista de **Popular MCP servers**.
5. Selecione **Add server** para adicioná-lo à lista de servidores MCP disponíveis.
6. Selecione <kbd>Esc</kbd> para fechar a caixa de diálogo de configurações.

Você adicionou o servidor MCP do Playwright.

## Pedir ao Copilot que explore o recurso com o Playwright

Vamos pedir ao Copilot que teste manualmente o recurso usando o servidor MCP do Playwright.

1. Use o prompt a seguir para pedir ao Copilot que valide a nova funcionalidade:

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

O Copilot iniciará um navegador por meio do servidor MCP do Playwright, percorrerá cada etapa e relatará o que encontrou. Você verá um navegador ser aberto no sistema para executar as tarefas.

2. Leia o resumo e compare-o aos critérios de aceitação da issue. Se algo parecer incorreto, faça perguntas complementares ou peça que o agente corrija o código antes de abrir um pull request.
3. Mantenha esta sessão aberta, pois vamos concluí-la na próxima lição.

O Copilot também validou a funcionalidade no navegador, explorando o recurso como uma pessoa usuária faria.

## Resumo e próximos passos

Parabéns! Você usou o servidor MCP do Playwright para explorar o recurso em um navegador real a partir do aplicativo GitHub Copilot. Recapitulando, você:

- aprendeu o que é o Model Context Protocol (MCP) e como o aplicativo disponibiliza ferramentas MCP.
- adicionou o servidor MCP do Playwright nas configurações do aplicativo.
- pediu ao agente que controlasse um navegador e explorasse o recurso de filtragem.

O recurso está criado, verificado e funcionando. Agora é hora de entregá-lo usando o **Agent Merge** para abrir e fazer o merge do pull request. Continue para a [Lição 6 - Fazer merge com o Agent Merge][next-lesson].

## Recursos

- [O que é MCP e por que todos estão falando sobre ele?][mcp-blog-post]
- [Servidor MCP do Microsoft Playwright][playwright-mcp-server]
- [Configurar servidores MCP no aplicativo GitHub Copilot][customize-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app