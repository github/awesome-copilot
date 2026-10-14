---
title: "Lição 7 - Criar e usar um agente de QA"
description: "Crie um perfil de QA que parta dos requisitos e combine cobertura de testes, a skill quality-checks e evidências diretas do navegador."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Você usou a skill `quality-checks` para executar verificações automatizadas e o MCP do Playwright para observar a experiência de filtragem em um navegador. Agora, reunirá essas capacidades em um agente personalizado com um processo de QA claramente definido.

Nesta lição, você vai:

- explorar como um agente personalizado trabalha com instruções, skills e ferramentas MCP.
- criar e examinar um perfil de QA reutilizável.
- selecionar o agente de QA e revisar suas conclusões em relação à issue de filtragem.

## Cenário

A Tailspin Toys quer uma revisão consistente dos requisitos, da qualidade do código, das verificações automatizadas, da cobertura de testes e do comportamento no navegador antes de abrir um pull request (PR). Um agente personalizado pode coordenar esse processo de QA e fornecer um relatório reutilizável.

## O que é um agente personalizado?

Um agente personalizado é uma versão especializada do Copilot definida em um perfil Markdown. O perfil descreve a finalidade, as instruções e as ferramentas disponíveis para o agente. Neste workshop, você definirá um papel de QA em `.github/agents/qa.agent.md` e o selecionará no aplicativo.

As personalizações que você criou têm funções distintas. As instruções do repositório descrevem os padrões da equipe. A skill quality-checks reúne verificações repetíveis. O MCP do Playwright fornece ferramentas de navegador. O perfil de QA informa ao Copilot como usar essas capacidades para avaliar requisitos e relatar conclusões. Ele não as substitui nem exige outra sessão de agente.

## Criar o perfil de QA

Antes de abrir o PR do recurso, você pedirá ao Copilot que crie um perfil de QA reutilizável. O perfil definirá tanto as verificações que o QA executa quanto os limites que ele deve seguir.

1. Confirme que a sessão está no modo **Interactive**.
2. Envie o prompt a seguir ao Copilot para criar o novo agente personalizado:

    ```plaintext
    Create a custom agent named QA in .github/agents/qa.agent.md. It should check features against their issues and agreed requirements, follow the repository instructions, run the quality-checks skill, use Playwright MCP to verify behavior, and add tests when coverage is missing.

    Have it report each requirement as pass, fail, or blocked with supporting evidence. It must ask before changing implementation code, and it must not commit changes or open pull requests. Use the current model and available tools. Just create the profile for now so I can review it.
    ```

## Examinar o perfil

Antes de usar o novo agente, revise o perfil para confirmar que o Copilot capturou o fluxo e os limites de autoridade de QA pretendidos. Isso evita que um agente incompleto ou amplo demais altere o recurso quando você deseja apenas verificá-lo.

1. Abra **Changes** e selecione `.github/agents/qa.agent.md`.
2. Leia o frontmatter. O campo `description` é obrigatório; `name` é opcional, mas incluí-lo fornece ao agente um nome de exibição claro.
3. Leia as instruções do perfil e confirme que o QA começa pelos requisitos, segue as instruções do repositório, executa a skill `quality-checks` e usa o MCP do Playwright.
4. Confirme que o QA apresenta evidências de apoio, pergunta antes de alterar o código da implementação e não faz commits nem abre pull requests.
5. Se o perfil gerado não contemplar alguma dessas responsabilidades ou limites, peça ao agente geral do Copilot que o revise antes de continuar.

## Executar QA em relação à issue

Com o perfil revisado, selecione QA na sessão atual para que ele possa usar a issue de filtragem e as decisões de planejamento que já estão no contexto. Confirme o agente ativo antes de pedir que ele inicie a revisão.

1. Na sessão atual, abra o seletor de agentes na caixa do prompt.
2. Selecione **QA** e verifique se o aplicativo identifica visivelmente **QA** como agente ativo antes de enviar o prompt de execução.
3. Envie o prompt a seguir para pedir que o QA revise o recurso:

    ```plaintext
    Review the filtering feature against the issue and the decisions in our plan. Is it ready for a PR?
    ```

4. Confirme que o QA usa a issue e as decisões de planejamento corretas. Forneça a URL da issue ou qualquer contexto ausente se ele solicitar.
5. Quando o trabalho for concluído, leia o relatório apresentado.

## Resumo e próximos passos

Você adicionou um papel especializado reutilizável ao fluxo de trabalho e revisou o trabalho dele. Nesta lição, você:

- explorou como um agente personalizado trabalha com instruções, skills e ferramentas MCP.
- criou e examinou um perfil de QA reutilizável que começa pelos requisitos.
- selecionou o agente de QA e revisou suas conclusões em relação à issue de filtragem.

Agora você tem a implementação, a atualização da skill, o perfil de QA, os testes e o relatório de verificação prontos para revisão. Em seguida, você [os reunirá em um PR do recurso e usará o Agent Merge][next-lesson].

## Recursos

- [Personalização do aplicativo GitHub Copilot, incluindo a seleção de agentes personalizados][customize-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/8-create-pull-request/
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
