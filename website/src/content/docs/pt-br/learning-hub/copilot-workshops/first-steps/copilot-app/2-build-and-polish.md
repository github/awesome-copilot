---
title: "Lição 2 - Criar e aprimorar o quiz"
description: "Crie um Space Quiz em um único arquivo e aprimore-o com o navegador integrado e o seletor de elementos."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Use um prompt detalhado para criar o Space Quiz, verificar seu comportamento no navegador integrado e fazer um ajuste visual com o seletor de elementos.

Nesta lição, você vai:

- criar um quiz sem dependências em `index.html`.
- testar o quiz no navegador integrado.
- inspecionar o código gerado.
- aprimorar um elemento selecionado preservando a acessibilidade.

## Criar o quiz

Envie o seguinte prompt na sessão `space-quiz`:

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

Quando o agente terminar, responda a várias perguntas e confirme que:

- a barra de progresso avança.
- a pontuação é atualizada.
- as respostas corretas exibem um estado verde.
- as respostas incorretas usam uma animação de tremor em vermelho.
- a tela de resultados aparece após a última pergunta.

## Inspecionar o código gerado

Recolha a barra lateral esquerda e o painel do navegador à direita e revise `index.html` na área de código expandida. Observe como HTML, CSS e JavaScript trabalham juntos em um único arquivo. Restaure os dois painéis quando terminar.

## Aprimorar com o seletor de elementos

1. Selecione o seletor de elementos na barra de ferramentas do navegador.
2. Selecione o título do quiz ou a área de respostas.
3. Envie o seguinte prompt:

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. Observe a atualização do navegador integrado e verifique a alteração.

## Melhorias opcionais

Se quiser continuar experimentando, peça ao agente para:

- adicionar um fundo sutil de estrelas que respeite `prefers-reduced-motion`.
- tornar a tela de resultados mais comemorativa quando a pontuação for 8 ou mais.
- melhorar os estados de foco do teclado e, depois, verificar o quiz sem usar o mouse.

## Resumo e próximos passos

Você criou, inspecionou e aprimorou o Space Quiz. Continue com a [Lição 3: Inspecionar a sessão e testar o quiz][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
