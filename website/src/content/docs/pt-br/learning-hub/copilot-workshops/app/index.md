---
title: "Aplicativo GitHub Copilot"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

O [**aplicativo GitHub Copilot**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) é um aplicativo para desktop criado com base no Copilot CLI que reúne o desenvolvimento orientado por agentes em um espaço de trabalho único e focado. Ele oferece sessões paralelas de agentes, modos de sessão alternáveis, canvases compartilhados e gerenciamento nativo de issues e pull requests do GitHub, incluindo o **Agent Merge**, que conduz um pull request por rebases, feedback de revisão, correções de CI e merge.

Ao longo destas lições, você instalará o aplicativo e configurará o projeto. Depois, conhecerá o espaço de trabalho do aplicativo e o backlog que o modelo criou para você. Você começará com uma pequena alteração, adicionando uma avaliação por estrelas, e então adicionará a partir de uma issue um padrão de instruções personalizadas, criará um recurso de filtragem em uma sessão isolada de agente e o verificará com uma skill reutilizável. Você adicionará o servidor MCP do Playwright para explorar o recurso em um navegador real e, em seguida, avançará por níveis de automação de merge até que o **Agent Merge** conclua o merge do pull request. Por fim, você colaborará em um canvas compartilhado e automatizará trabalhos recorrentes, completando todo o ciclo, da ideia ao recurso integrado.

## Lições

| Lição | Tópico | Descrição |
|--------|-------|-------------|
| [0. Pré-requisitos][ex0] | Configuração | Instale o Node.js e crie sua cópia do projeto Tailspin Toys |
| [1. Instalar o aplicativo Copilot][ex1] | Configuração | Instale o aplicativo, conecte seu projeto e conheça o espaço de trabalho |
| [2. Executar sua primeira sessão de agente][ex2] | Primeira alteração | Inicie uma sessão e entregue uma pequena alteração como seu primeiro pull request |
| [3. Orientar o Copilot com instruções personalizadas][ex3] | Contexto | Adicione a partir de uma issue um padrão de documentação e faça o merge |
| [4. Criar um recurso com o Autopilot][ex4] | Recurso principal | Use Plan e Autopilot para criar a filtragem e verifique-a com uma skill |
| [5. Testar com o MCP do Playwright][ex5] | Ferramentas externas | Adicione o servidor MCP do Playwright e explore o recurso em um navegador |
| [6. Fazer merge com o Agent Merge][ex6] | Merge | Permita que o Agent Merge corrija e integre o pull request de filtragem |
| [7. Planejar com canvases][ex7] | Colaboração | Crie um canvas compartilhado para planejar e acompanhar seu trabalho |
| [8. Revisão e próximos passos][ex8] | Resumo | Automatize tarefas recorrentes e explore os próximos passos |

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
[ex3]: /pt-br/learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /pt-br/learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /pt-br/learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /pt-br/learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /pt-br/learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /pt-br/learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students