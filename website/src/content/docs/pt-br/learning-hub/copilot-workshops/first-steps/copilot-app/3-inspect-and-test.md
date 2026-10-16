---
title: "Lição 3 - Inspecionar a sessão e testar o quiz"
description: "Revise os detalhes do projeto e do uso da sessão e execute um teste básico de funcionamento no navegador antes de qualquer gravação no Git."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

Agora que a sessão realizou trabalho de verdade, há algo para inspecionar. Confirme qual é o alvo do trabalho do agente e, depois, deixe que ele opere o quiz no navegador integrado e relate o que realmente aconteceu, em vez do que pretendia fazer.

Nesta lição, você vai:

- revisar os controles do projeto e da sessão no menu de título.
- verificar o plano, o uso da sessão, os tokens e o contexto no menu de uso.
- executar um teste básico de funcionamento no navegador e corrigir eventuais falhas.

## Revisar os detalhes do projeto

Selecione **Build a space quiz** na barra de título para abrir o menu do projeto e da sessão.

![Ilustração do menu de título Build a space quiz. Ele identifica a sessão de pasta do projeto space-quiz e fornece controles para o caminho, controle remoto, nome, sessões aninhadas, ID da sessão, compartilhamento, arquivamento e exclusão.](/images/learning-hub/copilot-workshops/first-steps-app-project-details.svg)

Esse menu identifica o projeto em que a sessão está trabalhando e fornece controles para gerenciar a sessão.

1. Confirme se a sessão de pasta é do projeto `space-quiz`.
2. Selecione **Path** para confirmar se a sessão está trabalhando na pasta esperada.
3. Observe os controles de acesso remoto, renomeação, sessões aninhadas, compartilhamento, arquivamento e exclusão.

## Revisar os detalhes de uso

Selecione o controle de uso ao lado de **Send** para abrir o menu de plano e uso da sessão.

![Ilustração do menu de uso ao lado do botão Send. Ele mostra o plano GitHub Copilot Pro+, os créditos de IA da sessão, as contagens de tokens de entrada e saída e o uso de contexto em 16% de 400 mil tokens.](/images/learning-hub/copilot-workshops/first-steps-app-usage-details.svg)

Esse menu separa o uso da conta e da sessão dos controles do projeto:

- **Plan** mostra o uso no nível do plano quando essa informação está disponível.
- **Session** mostra os créditos de IA usados pela sessão atual.
- **Tokens** mostra as contagens de tokens de entrada, armazenados em cache, de saída e de raciocínio.
- **Context** mostra quanto da janela de contexto a sessão usou.

Verifique **Context** à medida que a sessão avança. Conforme o contexto é preenchido, o agente tem menos espaço para a tarefa em si, e esse é o sinal para iniciar uma nova sessão.

> [!TIP]
> **A maioria dos resultados ruins vem de problemas de contexto**
>
> Uma pasta errada ou uma janela de contexto quase cheia explicam muito mais surpresas do que um prompt ruim.

## Testar antes de qualquer gravação no Git

O navegador integrado é um navegador de verdade, então o agente pode operar o quiz e verificar seu comportamento. Envie o seguinte prompt:

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Observe o navegador integrado enquanto o agente percorre as perguntas.
2. Se algo falhar, deixe o agente corrigir o problema e executar o teste novamente até que tudo passe.
3. Avance apenas quando a criação do projeto e o teste tiverem sido concluídos com sucesso.

Nada foi gravado no Git ainda. Na próxima lição, você executará `/init create simple rules for the project`, que lê o projeto no estado atual, então vale a pena garantir primeiro que o projeto funciona.

## Resumo e próximos passos

Você confirmou os detalhes do projeto e do uso da sessão e verificou o quiz com um teste básico de funcionamento no navegador. Continue com a [Lição 4: Registrar instruções do projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
