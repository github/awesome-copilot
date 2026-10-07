---
title: "Lição 0 - Pré-requisitos e configuração"
description: "Verifique os pré-requisitos do workshop, instale o GitHub Copilot CLI, faça login e escolha um modelo a partir de uma pasta de projeto vazia."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Coloque um agente no seu terminal. Confirme que você tem tudo de que precisa, instale o GitHub Copilot CLI, faça login e prepare-se para fazer a primeira solicitação a partir de uma pasta vazia.

Nesta lição, você vai:

- verificar os pré-requisitos do workshop.
- instalar o GitHub Copilot CLI e fazer login.
- criar a pasta do projeto e marcá-la como confiável.
- escolher um modelo para a sessão.

## Pré-requisitos

Você precisa de:

- uma conta do GitHub. [Crie uma conta do GitHub][github-signup] ou use sua conta existente.
- um plano ativo do Copilot. [Ative o Copilot Free ou um plano pago do Copilot][copilot-plans]. Se sua organização já oferece acesso ao Copilot, use essa conta.
- [Git][git] instalado. Execute `git --version` para verificar.
- um computador com macOS, Windows ou Linux.

A [GitHub CLI][gh-cli] (`gh`) é opcional, mas recomendada, porque permite que o agente crie repositórios e pull requests para você.

> [!NOTE]
> Se você usa o Copilot Business ou o Copilot Enterprise, o administrador deve habilitar a política **Copilot CLI** para que as sessões de agente funcionem.

## Configurar a CLI

1. Instale o [GitHub Copilot CLI][install-cli] para sua plataforma.
2. Crie a pasta do projeto e entre nela:

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. Execute `copilot`, faça login e marque a pasta como confiável quando solicitado.
4. Execute `/model` e escolha um modelo usando a ordem de preferência da próxima seção.
5. Opcionalmente, instale a [GitHub CLI][gh-cli], se ainda não a tiver.

![Ilustração do Copilot CLI em uma janela de terminal intitulada space-quiz. Ele pergunta se os arquivos desta pasta são confiáveis, com Yes, proceed selecionado, e sugere o comando /model para escolher o modelo desta sessão e /help para listar todos os comandos de barra. A linha de prompt diz Create a space exploration quiz.](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

A CLI abre com uma solicitação para confiar na pasta e alguns comandos iniciais, incluindo `/model`.

> [!TIP]
> Digite `/` a qualquer momento para explorar todos os comandos disponíveis ou execute `/help` para ver a referência completa.

## Escolher um modelo

Ao executar `/model`, use a seguinte ordem de preferência e selecione a primeira opção disponível para você:

1. **GPT-6-Luna** (recomendado).
2. **Auto**, como alternativa equilibrada.
3. Qualquer modelo da [lista de modelos ativos][active-models].

A disponibilidade de modelos depende do plano, da política da organização e da versão do produto.

## Resumo e próximos passos

O Copilot CLI está instalado, autenticado e em execução em uma pasta `space-quiz` vazia. Continue com a [Lição 1: Criar o quiz pelo terminal][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
