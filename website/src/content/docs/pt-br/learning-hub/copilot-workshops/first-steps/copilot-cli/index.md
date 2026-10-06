---
title: "Primeiros passos com o GitHub Copilot CLI"
description: "Faça um tour guiado pelo GitHub Copilot CLI, centrado no terminal, criando e entregando um Space Quiz."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

Faça um tour prático pelo GitHub Copilot CLI, pensado para quem está começando. Você criará um Space Quiz colorido a partir de uma pasta vazia e conhecerá o ciclo centrado no terminal: criar o projeto e revisar os diffs antes de qualquer gravação no Git, executar sessões lado a lado, planejar antes de editar e, depois, criar e mesclar o pull request sem sair do shell.

O workshop leva aproximadamente de 60 a 90 minutos. O projeto usa um único arquivo HTML, sem dependências de tempo de execução, para que você possa se concentrar em conhecer a CLI e seus fluxos de trabalho com agentes.

> [!NOTE]
> Este workshop foi criado por [James Montemagno][james] e adaptado de [First Steps with GitHub Copilot][source-lab]. O conteúdo original está disponível sob a [licença MIT][source-license].

## Lições

| Lição | Tópico | O que você fará |
| ------ | ----- | ---------------- |
| [0. Pré-requisitos e configuração][lesson-0] | Configuração | Verificar os pré-requisitos, instalar o Copilot CLI, fazer login e escolher um modelo |
| [1. Criar o quiz][lesson-1] | Criação | Criar o quiz pelo terminal e fazer uma alteração com escopo bem definido |
| [2. Registrar instruções do projeto][lesson-2] | Instruções | Gerar e adaptar instruções para o agente com `/init` |
| [3. Publicar o projeto][lesson-3] | Publicação | Inicializar, fazer commit e publicar por prompt ou manualmente |
| [4. Trabalhar em issues em paralelo][lesson-4] | Implementação | Criar um backlog, adicionar uma issue à conversa, revisar com `/diff` e iniciar uma segunda sessão em uma worktree |
| [5. Planejar antes de editar][lesson-5] | Planejamento | Usar `/plan` para definir uma abordagem para a segunda issue |
| [6. Saber o que o agente pode ver][lesson-6] | Contexto | Inspecionar e redefinir o contexto com `/context` e `/clear` |
| [7. Retomar sessões e acessar remotamente][lesson-7] | Retomada | Sair de sessões e voltar a elas com `/resume` e, opcionalmente, acompanhar uma sessão local de outro dispositivo com `/remote` |
| [8. Criar, revisar e mesclar][lesson-8] | Revisão | Criar e mesclar um pull request com `/pr create` e `/pr agentmerge` |
| [9. Delegar trabalho][lesson-9] | Delegação | Passar um novo recurso para `/delegate` e acompanhar uma sessão na nuvem |
| [10. Revisão e próximos passos][lesson-10] | Revisão | Recapitular o fluxo de trabalho e continuar aprendendo |

## Começar

[Comece pela Lição 0: Pré-requisitos e configuração][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
