---
title: "Lição 3 - Inspecionar o contexto e testar"
description: "Inspecione o contexto anexado a uma solicitação do Copilot Chat e execute um teste básico de funcionamento no navegador antes de qualquer gravação no Git."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Antes de publicar qualquer coisa, verifique o que o Copilot pode ver e comprove que o quiz funciona.

Nesta lição, você vai:

- inspecionar o contexto incluído em uma solicitação de conversa.
- executar um teste básico de funcionamento no navegador.
- corrigir falhas antes de avançar para o Git.

## Inspecionar o contexto no canto inferior direito

O VS Code mostra o contexto ativo no canto inferior direito da caixa de entrada do Copilot Chat.

1. Abra o indicador de contexto no **canto inferior direito** da caixa de entrada da conversa.
2. Inspecione os arquivos, as instruções personalizadas e os símbolos incluídos na solicitação.
3. Remova o contexto irrelevante ou anexe o arquivo do quiz antes de continuar.

## Criar e testar antes de gravar no Git

Use o navegador integrado e um prompt de teste básico de funcionamento antes de inicializar um repositório ou fazer qualquer commit:

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Execute o teste básico de funcionamento e verifique o navegador integrado.
2. Corrija eventuais falhas e execute o teste novamente até que tudo passe.
3. Avance para o Git somente depois que a criação do projeto e o teste tiverem sido concluídos com sucesso.

## Resumo e próximos passos

Você confirmou o que o Copilot pode ver e testou o quiz antes de publicar. Continue com a [Lição 4: Publicar o projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
