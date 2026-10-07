---
title: "Lição 10 - Encerramento e próximos passos"
description: "Recapitule o fluxo do aplicativo, os dois marcos de PR, os exercícios de canvas e as práticas reutilizáveis de qualidade e explore outros recursos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Você usou o aplicativo GitHub Copilot em um fluxo contínuo da Tailspin Toys. Você:

- conectou um repositório, explorou o espaço de trabalho do aplicativo e o backlog predefinido e experimentou um chat rápido.
- iniciou uma sessão específica de avaliação por estrelas, revisou o resultado em um canvas de navegador e fez manualmente o merge do primeiro pull request (PR).
- começou pela issue de filtragem, definiu a abordagem no modo **Plan**, desenvolveu-a no modo **Autopilot** e a revisou no modo **Interactive**.
- orientou o agente com instruções personalizadas e depois personalizou a skill `quality-checks` existente e a usou para executar testes de unidade, lint e verificações de tipos.
- adicionou o servidor do Model Context Protocol (MCP) do Playwright e o usou para explorar a filtragem em um navegador real.
- criou e selecionou um agente personalizado QA para avaliar requisitos, cobertura, resultados dos scripts da skill e evidências do navegador.
- revisou toda a alteração de filtragem e autorizou o **Agent Merge** no segundo PR.
- usou o canvas Database Explorer existente e depois criou e testou um canvas de triagem vinculado ao repositório.

## O que você entregou

O workshop tem dois marcos de PR, cada um em sua própria branch a partir de `main` atualizado:

1. **Avaliações por estrelas:** exibir o `starRating` existente e um estado explícito sem avaliação nos cards dos jogos.
2. **Filtragem e fluxo de qualidade:** implementar a filtragem, atualizar as instruções e aplicá-las ao recurso, personalizar o relatório de `quality-checks`, criar um perfil de QA e incluir os testes associados.

Desde o planejamento da filtragem até a abertura do PR, você usou a mesma sessão, worktree e branch. Combinamos esse trabalho em um único PR para simplificar o workshop. Depois, você usou o Database Explorer existente e criou um canvas de triagem vinculado ao repositório sem repetir o fluxo de PR.

## Diferentes tipos de verificação

Você verificou o código de várias formas: testes automatizados, sua própria inspeção no navegador e a exploração do navegador pelo Copilot via MCP. A skill `quality-checks` executou testes de unidade, lint e verificações de tipos e apresentou os resultados no novo formato. O QA reuniu esses resultados com uma revisão dos requisitos e da cobertura de testes antes do PR.

Os testes adicionados devem cobrir lacunas reais; uma execução de QA que não precisa de testes novos pode estar correta. Ferramentas ausentes, verificações ignoradas e falhas são bloqueios visíveis, não aprovações. Revise código e evidências antes de autorizar o merge e atualize as evidências afetadas após alterações.

## Boas práticas

O contexto e as ferramentas que você fornece ao Copilot orientam seu trabalho. Neste workshop, você atualizou instruções, personalizou uma skill, criou um perfil de QA, configurou um servidor MCP e criou um canvas. Reutilize essas personalizações entre sessões e ajuste-as conforme as necessidades da equipe mudarem. As instruções definem padrões, as skills descrevem tarefas repetíveis, os agentes personalizados definem papéis especializados, os servidores MCP conectam ferramentas externas e os canvases fornecem superfícies interativas compartilhadas. Revise as alterações reais e os resultados das ferramentas, não apenas o resumo do agente.

Associe o **modo e o modelo** à tarefa. Use **Plan** para analisar uma abordagem antes de desenvolver, **Interactive** para acompanhar alterações específicas e **Autopilot** somente para tarefas isoladas e com escopo bem definido. Escolha um modelo mais rápido para edições rotineiras e um modelo mais avançado, com maior esforço de raciocínio, para trabalhos complexos.

O contexto continua tão importante quanto a infraestrutura. Descrever claramente *o que* você quer criar, *por que* e *como* muda significativamente o resultado. Os chats rápidos são ótimos para definir o escopo de uma ideia antes de transformá-la em uma sessão completa.

## Mais recursos para explorar

Você percorreu o fluxo de trabalho principal. Veja outros recursos que valem a pena conhecer:

- [**Automações**][using-automations] para tarefas recorrentes ou sob demanda, como resumir trabalhos recentes. Revise a agenda, as permissões e o escopo antes de adotar uma; criar uma automação é um próximo passo, não parte deste workshop.
- **Rubber duck** para analisar um problema e receber feedback relevante antes de começar a desenvolver.
- [`/chronicle`][chronicle] para gerar uma narrativa do que aconteceu em uma sessão.
- [Bring your own key (BYOK)][byok] para usar modelos do seu próprio provedor, incluindo modelos locais por meio de Ollama, Foundry Local ou LM Studio.
- [Deep links][deep-links] para abrir o aplicativo diretamente em um repositório, uma sessão ou um prompt.

## Próximos passos

A melhor maneira de melhorar com qualquer ferramenta é continuar usando-a. Use-a em código de produção, em projetos pessoais ou naquele pequeno aplicativo que você planeja criar há anos. Compartilhe o que aprendeu com sua equipe e aprenda com as experiências dela. E, como sempre, explore a documentação.

Para conhecer melhor o ecossistema do GitHub Copilot, confira o [percurso do VS Code][vscode-harness], o [percurso do Copilot CLI][cli-harness] ou o [percurso do agente de nuvem][cloud-harness].

## Recursos

- [Sobre o aplicativo GitHub Copilot][about-copilot-app]
- [Introdução ao aplicativo GitHub Copilot][getting-started]
- [Personalizar o aplicativo GitHub Copilot][customize]
- [Usar automações][using-automations]
- [Trabalhar com extensões de canvas][canvas-docs]

[vscode-harness]: /pt-br/learning-hub/copilot-workshops/vscode/
[cli-harness]: /pt-br/learning-hub/copilot-workshops/cli/
[cloud-harness]: /pt-br/learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links