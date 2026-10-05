---
title: "Aplicativo GitHub Copilot"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

O [**aplicativo GitHub Copilot**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) é um aplicativo para desktop criado com base no Copilot CLI que reúne o desenvolvimento orientado por agentes em um espaço de trabalho único e focado. Ele oferece sessões paralelas de agentes, modos de sessão alternáveis, canvases compartilhados e gerenciamento nativo de issues e pull requests do GitHub, incluindo o **Agent Merge**, que conduz um pull request por rebases, feedback de revisão, correções de CI e merge.

O workshop segue um fluxo contínuo da Tailspin Toys:

1. Prepare o projeto, instale o aplicativo, conecte o repositório e explore o espaço de trabalho e o backlog predefinido.
2. Faça uma alteração específica de avaliação por estrelas, revise-a no navegador e faça manualmente o merge do primeiro pull request (PR).
3. Comece pela issue de filtragem, defina a abordagem no modo **Plan**, desenvolva-a no modo **Autopilot** e revise-a no modo **Interactive**.
4. Atualize as instruções do repositório e aplique-as ao trabalho de filtragem.
5. Personalize a skill `quality-checks` existente e use-a para executar as verificações do projeto.
6. Adicione o servidor do Model Context Protocol (MCP) do Playwright e use-o para explorar a filtragem em um navegador.
7. Crie um agente personalizado de garantia de qualidade (QA) e use-o para revisar requisitos, cobertura e evidências de verificação.
8. Revise toda a alteração de filtragem e use o Agent Merge no segundo PR.
9. Use o canvas Database Explorer existente e, em seguida, crie e teste um canvas de triagem vinculado ao repositório.

Para manter o foco do workshop, você criará dois PRs: um para avaliações por estrelas e outro para filtragem, com as atualizações de instruções e da skill, o perfil de QA e os testes. Comece cada um a partir de `main` atualizado. O fluxo de filtragem e qualidade compartilha uma sessão, worktree e branch para que você possa aproveitar seu trabalho à medida que explora cada ferramenta. O exercício final de canvas permanece em sua própria sessão para que você se concentre na criação e no teste da superfície compartilhada sem repetir o fluxo de PR.

## Lições

| Lição | Tópico | Descrição |
|--------|-------|-------------|
| [0. Pré-requisitos][ex0] | Configuração | Instale o Node.js e crie sua cópia do projeto Tailspin Toys |
| [1. Instalar o aplicativo Copilot][ex1] | Configuração | Instale o aplicativo, conecte seu projeto e conheça o espaço de trabalho |
| [2. Adicionar avaliações por estrelas: uma melhoria rápida][ex2] | Primeira alteração | Exiba as avaliações existentes e a alternativa para null e integre o PR 1 |
| [3. Modos de agente: Plan e Autopilot][ex3] | Modos de agente | Planeje o recurso a partir da issue, desenvolva-o com o Autopilot e revise-o no modo Interactive |
| [4. Orientar o Copilot com instruções personalizadas][ex4] | Contexto | Explore e atualize as instruções e aplique-as à filtragem |
| [5. Personalizar e usar uma skill quality-checks][ex5] | Verificações repetíveis | Explore a skill existente, altere o formato do relatório e execute-a |
| [6. Validar a funcionalidade com o MCP do Playwright][ex6] | Observação no navegador | Configure MCP pelo Customize e examine o comportamento da filtragem |
| [7. Criar e usar um agente de QA][ex7] | Requisitos e cobertura | Selecione um perfil especializado e reúna evidências de verificação final |
| [8. Criar e integrar o PR do recurso][ex8] | Revisão e merge | Revise a filtragem, as instruções, a skill, o perfil de QA e os testes e use o Agent Merge no segundo PR |
| [9. Explorar e criar canvases][ex9] | Colaboração | Use o Database Explorer e depois crie e teste um canvas de triagem vinculado ao repositório |
| [10. Revisão e próximos passos][ex10] | Resumo | Revise o fluxo, os artefatos e outros recursos |

## Pré-requisitos

Antes de participar deste workshop, verifique se você tem:

- [ ] Uma conta do GitHub com um plano ativo **Copilot Student, Pro, Pro+, Business ou Enterprise**
- [ ] Um computador com **macOS, Linux ou Windows**
- [ ] O [Git instalado][install-git] no computador

> [!TIP]
> Não tem um plano pago? Estudantes verificados podem obter o GitHub Copilot gratuitamente por meio do [GitHub Education][callout-student-plan-education]. O plano **Copilot Student** inclui os recursos de agente, MCP, revisão de código e Copilot CLI usados neste workshop. Portanto, você pode concluir todos os percursos com esse plano.

> [!NOTE]
> Como o aplicativo Copilot é executado no seu computador, e não em um codespace, a [Lição 0][ex0] orienta você na instalação do Node.js e na criação da sua cópia do projeto antes da instalação do aplicativo.

> [!NOTE]
> Se você usa o Copilot Business ou o Copilot Enterprise, o administrador deve habilitar a política **Copilot CLI** para que você possa usar o aplicativo.

## Começar

[**Comece pela Lição 0: Pré-requisitos →**][ex0]

[ex0]: /pt-br/learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /pt-br/learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /pt-br/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /pt-br/learning-hub/copilot-workshops/app/3-agent-modes/
[ex4]: /pt-br/learning-hub/copilot-workshops/app/4-custom-instructions/
[ex5]: /pt-br/learning-hub/copilot-workshops/app/5-agent-skills/
[ex6]: /pt-br/learning-hub/copilot-workshops/app/6-mcp-playwright/
[ex7]: /pt-br/learning-hub/copilot-workshops/app/7-qa-agent/
[ex8]: /pt-br/learning-hub/copilot-workshops/app/8-create-pull-request/
[ex9]: /pt-br/learning-hub/copilot-workshops/app/9-canvases/
[ex10]: /pt-br/learning-hub/copilot-workshops/app/10-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students