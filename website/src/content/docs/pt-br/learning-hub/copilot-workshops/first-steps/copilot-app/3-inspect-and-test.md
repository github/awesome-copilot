---
title: "Lição 3 - Inspecionar a sessão e testar o quiz"
description: "Leia os detalhes da sessão para confirmar em que o agente está trabalhando e execute um teste básico de funcionamento no navegador antes de qualquer gravação no Git."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Agora que a sessão realizou trabalho de verdade, há algo para inspecionar. Confirme qual é o alvo do trabalho do agente e, depois, deixe que ele opere o quiz no navegador integrado e relate o que realmente aconteceu, em vez do que pretendia fazer.

Nesta lição, você vai:

- ler o painel de detalhes da sessão.
- verificar o projeto, o caminho, a branch, as alterações e o uso de contexto da sessão.
- executar um teste básico de funcionamento no navegador e corrigir eventuais falhas.

## Ler os detalhes da sessão

Os detalhes da sessão mostram exatamente em que o agente está trabalhando. Você não precisa observar esse painel o tempo todo, mas tudo nele importa quando um resultado surpreende você.

![Ilustração do painel de detalhes da sessão de criação do Space Quiz no aplicativo Copilot. Ele mostra a branch main a partir de origin/main, o caminho, o projeto, o nome da sessão, o ID da sessão e o agente, um arquivo alterado, contagens de tokens, uso de contexto de 27%, gasto da sessão e opções para habilitar o controle remoto, renomear, ver informações, compartilhar como um gist secreto ou arquivar a sessão.](/images/learning-hub/copilot-workshops/first-steps-app-session-details.svg)

O painel mostra onde o trabalho acontece, o que mudou e quanto da janela de contexto está ocupado. Não há uma linha de modelo, porque você escolhe o modelo para cada solicitação na caixa de composição.

1. Confirme que **project**, **path** e **branch** correspondem ao que você acredita estar editando.
2. Leia **Changes** para ver se esta sessão já alterou alguma coisa.
3. Verifique **context usage**. Conforme o uso aumenta, o agente tem menos espaço para a tarefa em si, e esse é o sinal para iniciar uma nova sessão.

> [!TIP]
> **A maioria dos resultados ruins vem de problemas de contexto**
>
> Uma branch errada, uma pasta errada ou uma janela de contexto quase cheia explicam muito mais surpresas do que um prompt ruim.

## Testar antes de qualquer gravação no Git

O navegador integrado é um navegador de verdade, então o agente pode operar o quiz e verificar seu comportamento. Envie o seguinte prompt:

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Observe o navegador integrado enquanto o agente percorre as perguntas.
2. Se algo falhar, deixe o agente corrigir o problema e executar o teste novamente até que tudo passe.
3. Avance apenas quando a criação do projeto e o teste tiverem sido concluídos com sucesso.

Nada foi gravado no Git ainda. O próximo passo é `/init`, que lê o projeto no estado atual, então vale a pena garantir primeiro que o projeto funciona.

## Resumo e próximos passos

Você confirmou em que a sessão está trabalhando e verificou o quiz com um teste básico de funcionamento no navegador. Continue com a [Lição 4: Registrar instruções do projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
