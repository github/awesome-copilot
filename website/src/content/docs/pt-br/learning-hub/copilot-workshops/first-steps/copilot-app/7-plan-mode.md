---
title: "Lição 7 - Planejar antes de editar"
description: "Use o modo Plan em uma segunda issue para que o agente investigue o projeto e proponha uma abordagem antes de alterar qualquer arquivo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Nem toda issue deve começar com edições. O modo Plan investiga o projeto, propõe uma abordagem e aguarda sua aprovação antes de qualquer alteração no código.

Nesta lição, você vai:

- iniciar uma sessão para uma segunda issue no modo Plan.
- revisar e aprimorar o plano proposto pelo agente.
- aprovar o plano e escolher como a sessão continua.

## Definir a abordagem antes de qualquer alteração no código

1. Abra uma **segunda issue** em **Issues** e selecione **New session**.
2. Na configuração da sessão, escolha **Plan** em vez de **Interactive** ou **Autopilot**.
3. Envie o seguinte prompt e deixe o agente investigar sem alterar arquivos:

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. Leia o plano proposto e solicite alterações se algo estiver faltando.
5. Aprove o plano.
6. Quando solicitado, escolha se a sessão continua no modo **Interactive** ou **Autopilot**.

> [!TIP]
> **Quando o modo Plan vale a pena**
>
> Use o modo Plan para qualquer trabalho ambíguo, que envolva várias partes do projeto ou que seja caro de desfazer. O momento de menor custo para corrigir uma abordagem ruim é antes da primeira edição.

## Resumo e próximos passos

Você definiu uma abordagem com o agente antes que ele escrevesse qualquer código. Continue com a [Lição 8: Concluir o ciclo de revisão do Copilot][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
