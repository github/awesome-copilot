---
title: "Lição 9 - Passar a próxima ideia para uma sessão na nuvem"
description: "Alterne o ambiente de execução do Copilot Chat de Local para Cloud e delegue um recurso independente que será entregue como um pull request."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Você percorreu todo o ciclo localmente, então agora sabe como é um bom resultado. Esse é o momento certo para deixar algo ser executado sem você. O Copilot Chat pode trocar o ambiente em que é executado do seu computador para o GitHub.

Nesta lição, você vai:

- alternar o ambiente de execução do Copilot Chat de **Local** para **Cloud**.
- delegar um recurso independente com critérios de aceitação claros.
- revisar o pull request resultante.

> [!NOTE]
> Sessões na nuvem exigem um plano pago do Copilot elegível. O acesso nos planos Business e Enterprise também pode precisar ser habilitado por um administrador.

## Delegar para a nuvem

![Ilustração do Copilot Chat no VS Code com o seletor Harness aberto. Em Copilot, Cloud está selecionado em vez de Local, e outros ambientes de execução, como Claude e Codex, estão listados. Acima, uma solicitação para adicionar três novos temas de cores mostra Working in the cloud com um link para acompanhar a sessão no GitHub.](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

O seletor **Harness** lista o Copilot sendo executado em **Local** ou **Cloud**, junto com outros ambientes de execução. Alterne para **Cloud** e a próxima solicitação será executada no GitHub em vez de no seu computador.

1. No Copilot Chat, abra o seletor **Harness** e alterne o Copilot de **Local** para **Cloud**.
2. Inicie uma nova sessão e atribua a ela um recurso independente com critérios de aceitação claros:

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. Feche o notebook. O trabalho continua no GitHub e é entregue como um pull request.
4. Revise esse pull request com o mesmo cuidado dedicado ao que você escreveu por conta própria.

> [!TIP]
> **Delegue o que você consegue descrever**
>
> Sessões na nuvem se beneficiam de orientações precisas. Se você não consegue escrever os critérios de aceitação, a tarefa ainda não está pronta para sair do seu computador.

## Resumo e próximos passos

Você delegou um recurso para uma sessão na nuvem e revisou o resultado. Continue com a [Lição 10: Revisão e próximos passos][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/vscode/10-review/
