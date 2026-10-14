---
title: "Lição 9 - Automatizar a triagem de issues"
description: "Crie e execute uma automação semanal que resume as issues abertas recentes."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Use uma automação para transformar uma tarefa recorrente de triagem de issues em um fluxo de trabalho agendado de agente.

Nesta lição, você vai:

- criar uma automação semanal.
- conectar a automação ao projeto Space Quiz.
- executar a automação imediatamente e revisar o resultado.

## Criar a automação

![Ilustração da visualização Automations do aplicativo Copilot com filtros All, Local e Cloud, uma caixa de pesquisa, botões Templates e New automation e dois cartões de automação semanal para o projeto space-quiz: Issue triage e Accessibility audit.](/images/learning-hub/copilot-workshops/first-steps-app-automations.svg)

As automações executam o mesmo prompt em horários agendados, cada uma em sua própria sessão, para que uma automação nunca interfira no seu trabalho. Você pode filtrar por **All**, **Local** ou **Cloud** e executar qualquer automação sob demanda.

1. Abra **Automations**.
2. Escolha o modelo para uma nova automação semanal.
3. Insira o seguinte prompt:

   ```plaintext
   Review the latest GitHub issues created and still open in the last week, and provide a summary table ranked by severity and priority.
   ```

4. Defina o modo da sessão como **Autopilot**.
5. Defina o modelo como **Auto**.
6. Selecione o projeto `space-quiz`.
7. Abra o menu suspenso **Create** e selecione **Create and run**.

Revise o resumo gerado e confirme que ele faz referência às issues abertas recentes do repositório.

## Resumo e próximos passos

Você criou um fluxo de trabalho reutilizável de agente que é executado em horários agendados. Continue com a [Lição 10: Continuar uma sessão remotamente][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
