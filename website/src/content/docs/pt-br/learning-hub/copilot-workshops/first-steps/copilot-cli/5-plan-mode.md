---
title: "Lição 5 - Planejar antes de editar"
description: "Alterne a segunda sessão para o modo de planejamento com /plan para que o agente proponha uma abordagem antes de editar qualquer arquivo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Você já tem uma segunda sessão em execução em sua própria worktree. Não comece pelo código nela. O modo de planejamento investiga o projeto e propõe uma abordagem sem alterar os arquivos.

Nesta lição, você vai:

- alternar a segunda sessão para o modo de planejamento.
- revisar e aprimorar o plano proposto pelo agente.
- aprovar o plano e deixar a sessão implementá-lo.

## Definir a abordagem antes de qualquer edição

1. Alterne para a **segunda sessão** que você abriu na lição anterior.
2. Execute `/plan` para alternar essa sessão para o modo de planejamento.
3. Envie o seguinte prompt e deixe o agente investigar sem editar nada:

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. Leia o plano, aponte o que estiver faltando e aprove-o.
5. A sessão continua com a implementação, usando o plano aprovado como orientação.

> [!TIP]
> **Quando o modo de planejamento vale a pena**
>
> Use o modo de planejamento para qualquer trabalho ambíguo, que envolva várias partes do projeto ou que seja caro de desfazer. O momento de menor custo para corrigir uma abordagem ruim é antes da primeira edição.

## Resumo e próximos passos

Você definiu uma abordagem com o agente antes que ele escrevesse qualquer código. Continue com a [Lição 6: Saber o que o agente pode ver][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
