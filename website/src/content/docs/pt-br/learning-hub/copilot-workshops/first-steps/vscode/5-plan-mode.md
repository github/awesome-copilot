---
title: "Lição 5 - Planejar antes de editar"
description: "Alterne o Copilot Chat para o modo Plan para que ele investigue o espaço de trabalho e proponha uma abordagem antes de editar qualquer arquivo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

O modo Plan investiga o espaço de trabalho e escreve um plano de implementação sem alterar os arquivos.

Nesta lição, você vai:

- alternar o Copilot Chat de Agent para Plan.
- revisar e aprimorar um plano proposto.
- voltar para Agent para implementar o plano.

## Definir a abordagem antes de qualquer edição

1. Abra o Copilot Chat e use o **menu suspenso de modo** acima da caixa de entrada.
2. Alterne de **Agent** para **Plan**.
3. Descreva o próximo recurso com o seguinte prompt e deixe o Copilot investigar o espaço de trabalho:

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. Leia o plano e solicite alterações, depois volte para **Agent** para implementá-lo.

> [!TIP]
> **Quando o modo de planejamento vale a pena**
>
> Use o modo Plan para qualquer trabalho ambíguo, que envolva várias partes do projeto ou que seja caro de desfazer. O momento de menor custo para corrigir uma abordagem ruim é antes da primeira edição.

## Resumo e próximos passos

Você definiu uma abordagem com o Copilot antes que ele escrevesse qualquer código. Continue com a [Lição 6: Dar ao Copilot ferramentas integradas ao GitHub][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
