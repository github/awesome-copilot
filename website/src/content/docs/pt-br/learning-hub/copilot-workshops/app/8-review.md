---
title: "Lição 8 - Revisão e próximos passos"
description: "Recapitule o percurso do aplicativo GitHub Copilot, automatize trabalhos recorrentes e explore os próximos passos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Nas últimas lições, você levou um recurso da ideia ao merge com o aplicativo GitHub Copilot. Nesse processo, você:

- conectou um repositório e conheceu o espaço de trabalho do aplicativo e o backlog criado pelo modelo.
- iniciou sessões a partir de uma tarefa direta e de issues e usou os modos Plan e Autopilot para controlar como o agente trabalha.
- orientou o agente com instruções personalizadas e uma skill reutilizável.
- testou o trabalho com o servidor MCP do Playwright em um navegador real.
- colaborou com o agente em um canvas compartilhado.
- entregou alterações avançando por níveis de automação de merge, desde fazer o merge por conta própria no github.com até permitir que o **Agent Merge** integrasse um pull request.

Vamos automatizar parte do trabalho recorrente, analisar boas práticas e explorar os próximos passos.

## Automatizar trabalhos recorrentes

O aplicativo pode executar agentes para você em uma agenda ou sob demanda por meio de **automações**, ideais para tarefas rotineiras como fazer a triagem de novas issues ou recapitular atividades recentes. Vamos criar uma automação simples e não destrutiva.

1. Selecione **Automations** na barra lateral e depois selecione **New automation**.
2. Dê um nome a ela, como `Recap my recent work`.
3. Escolha um gatilho. **Manual** permite executá-la sob demanda; **On a schedule** a executa automaticamente; **When an issue is created** reage a novas issues. Escolha **Manual** para esta lição.
4. Insira um prompt somente leitura para impedir que a automação faça alterações. Por exemplo:

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. Escolha o projeto, ou seja, seu repositório Tailspin Toys, e crie a automação.
6. Execute-a sob demanda para ver o resultado.

> [!TIP]
> As automações podem ser executadas localmente ou na nuvem. Habilite **Run in the cloud** e escolha as **Tools** que uma automação pode usar quando quiser que ela seja executada sem supervisão e de acordo com uma agenda. Mantenha as automações agendadas com escopo limitado e sem ações destrutivas até confiar nos resultados.

## Boas práticas

Ao usar qualquer ferramenta de IA, a infraestrutura ao redor dela influencia a qualidade dos resultados. Arquivos de instruções, skills e agentes personalizados tiveram uma função neste workshop. Invista neles e reutilize-os entre as sessões.

Associe o **modo e o modelo** à tarefa. Use **Plan** para analisar uma abordagem antes de desenvolver, **Interactive** para acompanhar alterações específicas e **Autopilot** somente para tarefas isoladas e com escopo bem definido. Escolha um modelo mais rápido para edições rotineiras e um modelo mais avançado, com maior esforço de raciocínio, para trabalhos complexos.

O contexto continua tão importante quanto a infraestrutura. Descrever claramente *o que* você quer criar, *por que* e *como* muda significativamente o resultado. Os chats rápidos são ótimos para definir o escopo de uma ideia antes de transformá-la em uma sessão completa.

## Mais recursos para explorar

Você percorreu o fluxo de trabalho principal. Veja outros recursos que valem a pena conhecer:

- **Quick chats** para perguntas rápidas e descartáveis que não exigem uma sessão completa.
- **Rubber duck** para analisar um problema e receber feedback relevante antes de começar a desenvolver.
- [**Agentes personalizados**][custom-agents] para empacotar uma função, suas ferramentas e instruções para trabalhos especializados e repetíveis.
- [`/chronicle`][chronicle] para gerar uma narrativa do que aconteceu em uma sessão.
- [Bring your own key (BYOK)][byok] para usar modelos do seu próprio provedor, incluindo modelos locais por meio de Ollama, Foundry Local ou LM Studio.
- [Sandboxes na nuvem][sandboxes] para executar sessões em um ambiente isolado hospedado pelo GitHub.
- [Deep links][deep-links] para abrir o aplicativo diretamente em um repositório, uma sessão ou um prompt.

## Próximos passos

A melhor maneira de melhorar com qualquer ferramenta é continuar usando-a. Use-a em código de produção, em projetos pessoais ou naquele pequeno aplicativo que você planeja criar há anos. Compartilhe o que aprendeu com sua equipe e aprenda com as experiências dela. E, como sempre, explore a documentação.

Para conhecer melhor o ecossistema do GitHub Copilot, confira o [percurso do VS Code](/pt-br/learning-hub/copilot-workshops/vscode/), o [percurso do Copilot CLI](/pt-br/learning-hub/copilot-workshops/cli/) ou o [percurso do agente de nuvem](/pt-br/learning-hub/copilot-workshops/cloud/).

## Recursos

- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Introdução ao aplicativo GitHub Copilot][getting-started]
- [Personalizar o aplicativo GitHub Copilot][customize]
- [Usar automações][using-automations]
- [Trabalhar com extensões de canvas][canvas-docs]
- [Sobre sandboxes locais e na nuvem][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links