---
title: "Lição 1 - Criar no espaço de trabalho"
description: "Crie o Space Quiz no VS Code, visualize-o no navegador integrado e aprimore um elemento selecionado."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Mantenha o editor, a conversa, os arquivos e a prévia juntos. Você criará o quiz, jogará no navegador integrado e, depois, enviará um elemento específico diretamente para a conversa para fazer uma alteração com escopo bem definido.

Nesta lição, você vai:

- criar o quiz em um único `index.html`.
- visualizar o quiz no navegador integrado.
- selecionar um elemento no navegador e aprimorá-lo.

## Criar o quiz

Envie o seguinte prompt no Copilot Chat:

```plaintext
Create a colorful, accessible space exploration quiz with 10 questions in a single index.html. Add a progress bar, score counter, animated correct and incorrect feedback, and a results screen. Use no server or dependencies. Open it in the VS Code integrated browser.
```

1. Revise o arquivo gerado no editor.
2. Abra o navegador integrado e responda a várias perguntas.
3. Abra **Source Control** a qualquer momento para ver os arquivos alterados e o diff.

## Selecionar um elemento e aprimorá-lo

O navegador integrado pode enviar um elemento específico diretamente para a conversa, para que você nunca precise descrever a qual botão está se referindo.

1. Com o quiz aberto no navegador integrado, inicie uma seleção de elemento pela barra de ferramentas do navegador.
2. Selecione os botões de resposta para anexar esse elemento à próxima mensagem da conversa.
3. Envie o seguinte prompt e observe a prévia recarregar:

   ```plaintext
   Using the selected element, make the answer buttons feel more tactile: add a subtle press state, a clearer focus ring for keyboard users, and a smoother transition into the correct and incorrect colors. Change nothing else.
   ```

4. Leia o diff em **Source Control** antes de manter a alteração.
5. Pressione <kbd>Tab</kbd> para percorrer as respostas e confirme que o contorno de foco está visível.

## Resumo e próximos passos

Você criou, visualizou e aprimorou o quiz sem sair do editor. Continue com a [Lição 2: Registrar instruções do projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
