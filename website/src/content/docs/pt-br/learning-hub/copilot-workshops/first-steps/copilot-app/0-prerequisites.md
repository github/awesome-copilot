---
title: "Lição 0 - Pré-requisitos e configuração"
description: "Verifique os pré-requisitos do workshop, instale o aplicativo GitHub Copilot e conheça seu espaço de trabalho."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Antes de criar o Space Quiz, confirme que você tem tudo de que precisa, instale o aplicativo GitHub Copilot e conheça seu espaço de trabalho.

Nesta lição, você vai:

- verificar os pré-requisitos do workshop.
- instalar o aplicativo GitHub Copilot e fazer login.
- escolher um modelo para as sessões.
- identificar as principais áreas de trabalho do aplicativo.
- experimentar uma conversa rápida.

## Pré-requisitos

Você precisa de:

- uma conta do GitHub. [Crie uma conta do GitHub][github-signup] ou use sua conta existente.
- um plano ativo do Copilot. [Ative o Copilot Free ou um plano pago do Copilot][copilot-plans]. Se sua organização já oferece acesso ao Copilot, use essa conta.
- um computador com macOS, Windows ou Linux.

O aplicativo vem com o Git, então não é necessário instalar mais nada.

> [!NOTE]
> Se você usa o Copilot Business ou o Copilot Enterprise, o administrador deve habilitar a política **Copilot CLI** para que as sessões de agente funcionem.

## Instalar e configurar o aplicativo

1. Baixe e instale o [aplicativo GitHub Copilot][download-app] para o seu sistema operacional.
2. Abra o aplicativo.
3. Selecione **Sign in to GitHub** e autentique-se.
4. Escolha um tema e selecione **Finish**.

## Escolher um modelo

Ao escolher um modelo, use a seguinte ordem de preferência e selecione a primeira opção disponível para você:

1. **GPT-6-Luna** (recomendado).
2. **Auto**, como alternativa equilibrada.
3. Qualquer modelo da [lista de modelos ativos][active-models].

A disponibilidade de modelos depende do plano, da política da organização e da versão do produto.

## Conhecer o aplicativo

O aplicativo reúne o fluxo de desenvolvimento em um só lugar:

- **New**: inicie uma sessão em um projeto ou escolha **Chat** para fazer uma pergunta rápida.
- **Pull requests**: revise e acompanhe seus pull requests em todos os repositórios.
- **Issues**: encontre issues atribuídas a você, criadas por você ou que mencionam você.
- **Automations**: agende tarefas recorrentes de agente em um repositório.
- **Customize**: altere temas e modelos e gerencie extensões de Canvas.
- **Projects**: abra seus repositórios, com as sessões de cada um listadas abaixo.

## Experimentar uma conversa rápida

Nem toda pergunta precisa de um espaço de trabalho. Em **New**, escolha **Chat** em vez de um projeto. Uma conversa não tem um repositório associado e não pode editar arquivos, então é a maneira mais rápida de fazer uma pergunta, obter uma explicação ou pensar em uma abordagem antes de iniciar uma sessão de verdade.

Envie o seguinte prompt em uma conversa:

```plaintext
How does the GitHub Copilot app use worktrees?
```

## Resumo e próximos passos

Você verificou os pré-requisitos, instalou o aplicativo, escolheu um modelo e explorou as principais áreas de trabalho. Continue com a [Lição 1: Criar o espaço de trabalho do Space Quiz][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
