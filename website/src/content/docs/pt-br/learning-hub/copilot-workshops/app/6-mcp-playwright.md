---
title: "Lição 6 - Validar a funcionalidade com o MCP do Playwright"
description: "Configure o MCP do Playwright pelo Customize e observe a filtragem no navegador, no worktree existente do recurso."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Como já destacamos, escrever código envolve mais do que apenas escrever código. Precisamos trabalhar com dados e serviços externos e até disponibilizar automações adicionais ao Copilot. É aí que entram os servidores MCP. Eles permitem que o Copilot vá além do que está integrado ao aplicativo, oferecendo ainda mais ferramentas e serviços.

Nesta lição, você vai:

- entender o que é o Model Context Protocol (MCP) e como o aplicativo GitHub Copilot o utiliza.
- adicionar o servidor MCP do Playwright.
- pedir ao agente que controle um navegador e explore o recurso de filtragem.

## Cenário

Embora os testes de unidade e de ponta a ponta sejam importantes, validar atualizações na interface exige interagir com ela. Você quer permitir que o Copilot use o site em desenvolvimento como uma pessoa usuária faria, automatizando ainda mais o processo de alteração e aumentando a confiança de que as atualizações se comportam conforme o esperado.

## O que é o Model Context Protocol (MCP)?

O [Model Context Protocol (MCP)][mcp-blog-post] oferece aos agentes de IA uma forma de se comunicar com ferramentas e serviços externos. Com o MCP, os agentes de IA podem se comunicar com essas ferramentas e serviços em tempo real. Isso permite que eles acessem informações atualizadas, usando recursos, e realizem ações em seu nome, usando ferramentas.

Essas ferramentas e esses recursos são acessados por meio de um servidor MCP, que funciona como uma ponte entre o agente de IA e as ferramentas e os serviços externos. O servidor MCP é responsável por gerenciar essa comunicação, seja com APIs existentes ou com ferramentas locais, como pacotes NPM. Cada servidor MCP representa um conjunto diferente de ferramentas e recursos que o agente de IA pode acessar.

Alguns servidores MCP conhecidos são:

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server): oferece acesso a um conjunto de APIs para gerenciar repositórios do GitHub. Ele permite que o agente de IA realize ações como criar repositórios, atualizar repositórios existentes e gerenciar issues e pull requests.
- [**Playwright MCP Server**][playwright-mcp-server]: oferece recursos de automação de navegador usando o Playwright. Ele permite que o agente de IA realize ações como acessar páginas Web, preencher formulários e selecionar botões.

Há muitos outros servidores MCP que fornecem acesso a diferentes ferramentas e recursos. O GitHub mantém um [registro de MCP](https://github.com/mcp) para facilitar a descoberta e as contribuições ao ecossistema.

> [!CAUTION]
> Trate os servidores MCP como qualquer outra dependência do projeto. Antes de usar um servidor MCP, revise cuidadosamente o código-fonte, verifique quem o publicou e considere as implicações de segurança. Use apenas servidores MCP confiáveis e tenha cuidado ao conceder acesso a recursos ou operações confidenciais.

## Adicionar o servidor MCP do Playwright

Você gerencia os servidores MCP por meio de **Customize** na barra lateral. Servidores configurados para seus repositórios ou para o Copilot CLI já podem estar disponíveis no aplicativo, então verifique antes de adicionar um duplicado. A [documentação de personalização do aplicativo][customize-app] apresenta as opções disponíveis.

1. Selecione **Customize** na barra lateral.
2. Selecione **MCP** e verifique em **Installed** se já existe um servidor Playwright.
3. Se necessário, encontre **Playwright** entre os servidores disponíveis ou use o fluxo de servidor personalizado documentado pelo publicador.
4. Revise o publicador, a configuração e as solicitações de instalação antes de aprová-las. Siga as instruções para adicionar o servidor; políticas da organização ou pré-requisitos ausentes podem bloquear a configuração.
5. Volte à sessão de filtragem no modo **Interactive** e confirme que as ferramentas MCP do Playwright estão disponíveis.

Se a configuração falhar, resolva o problema de configuração ou permissão antes de continuar.

## Pedir ao Copilot que explore o recurso com o Playwright

A issue e suas decisões de planejamento já estão no contexto. Interrompa qualquer servidor de desenvolvimento iniciado anteriormente antes de pedir ao Copilot que inicie um.

1. Use o prompt a seguir para pedir ao Copilot que valide a nova funcionalidade:

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

> [!NOTE]
> Você não precisa dizer ao Copilot para usar um servidor MCP específico; normalmente, ele encontrará o servidor adequado com base no contexto atual. No entanto, não há problema em informar ao Copilot algo que você considera importante.

2. Acompanhe o processo!

O Copilot iniciará o servidor, abrirá um navegador e interagirá com o site! Ao terminar, ele interromperá o servidor e apresentará um relatório.

## Resumo e próximos passos

Parabéns! Você usou o servidor MCP do Playwright para explorar o recurso em um navegador real a partir do aplicativo GitHub Copilot. Recapitulando, você:

- aprendeu o que é o Model Context Protocol (MCP) e como o aplicativo GitHub Copilot o utiliza.
- adicionou o servidor MCP do Playwright.
- pediu ao agente que controlasse um navegador e explorasse o recurso de filtragem.

Em seguida, você [criará um agente personalizado de QA][next-lesson] que reúne a skill e as ferramentas de navegador em um papel especializado.

## Recursos

- [O que é MCP e por que todos estão falando sobre ele?][mcp-blog-post]
- [Servidor MCP do Microsoft Playwright][playwright-mcp-server]
- [Configurar servidores MCP no aplicativo GitHub Copilot][customize-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app