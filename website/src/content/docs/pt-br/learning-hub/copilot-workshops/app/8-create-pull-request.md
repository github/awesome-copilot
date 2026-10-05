---
title: "Lição 8 - Criar e integrar o PR do recurso"
description: "Revise em conjunto a filtragem, as instruções, a atualização da skill, o perfil de QA e os testes; depois, crie um PR e use o Agent Merge."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

A implementação da filtragem, as atualizações de instruções e da skill, o perfil de garantia de qualidade (QA) e os testes estão salvos em uma única branch. É hora de revisá-los em conjunto e abrir um pull request. Você mesmo fez o merge do pull request (PR) de avaliações por estrelas; desta vez, permitirá que o **Agent Merge** gerencie o processo.

> [!NOTE]
> Normalmente, dividiríamos o recurso, as atualizações de instruções e da skill e o agente de QA em alguns PRs separados. Para simplificar o workshop, você manteve todo o fluxo de filtragem e qualidade em uma única sessão e branch, com todo esse trabalho incluído neste PR.

Nesta lição, você vai:

- aprender o que é o Agent Merge e como ele automatiza o ciclo de vida do merge.
- examinar o PR completo do recurso e as evidências de verificação.
- autorizar o Agent Merge somente após a revisão e confirmar que o PR foi integrado.

## Cenário

Ao longo do fluxo de filtragem, você usou o Copilot para planejar, implementar e verificar um recurso. Agora, a Tailspin Toys quer automatizar o trabalho restante do PR, mantendo a autorização do merge sob o controle da pessoa desenvolvedora.

## Apresentação do Agent Merge

O **Agent Merge** automatiza o trabalho restante necessário para integrar um pull request no aplicativo GitHub Copilot. Quando você o habilita, a sessão do aplicativo lê o pull request, resolve o que estiver bloqueando o merge, como verificações de integração contínua (CI) com falha, comentários de revisão e a necessidade de rebase, e faz o merge assim que o GitHub permite. Ele é executado em segundo plano, continua funcionando após reinicializações do aplicativo e é desativado automaticamente quando o pull request é integrado.

Até aqui, você selecionou **Merge pull request** por conta própria. O Agent Merge pode assumir essa responsabilidade, mas sua capacidade de editar código e fazer merge ainda exige autorização explícita. Revise as ações permitidas e o trabalho antes de conceder permissão de merge.

## Usar o Agent Merge para gerenciar o PR

Com todo o código criado e revisado, vamos permitir que o Agent Merge gerencie o processo do PR.

1. Use o seletor de agentes para selecionar **Default agent**.
2. Selecione o menu suspenso ao lado de **Create PR**.
3. Selecione **Agent merge**. O botão mudará para **Agent merge**.
4. Selecione **Agent merge** para iniciar o processo.

O processo do Agent Merge começa. Ele vai:

- Criar o pull request com um título e uma descrição.
- Se você iniciou a sessão por uma issue, incluir uma referência à issue relacionada no corpo da descrição.
- Fazer rebase ou resolver possíveis conflitos de merge com a branch de destino.
- Monitorar o processo de CI para garantir que todas as verificações sejam concluídas com sucesso.
- Monitorar o PR para verificar feedback de outras pessoas desenvolvedoras ou da revisão de código do Copilot. Ele fará atualizações para resolver esses comentários.
- Opcionalmente, fazer o merge automático do PR quando tudo for concluído com sucesso.

Vamos permitir que o Agent Merge também faça o merge do PR quando tudo for concluído com sucesso!

5. Selecione o menu suspenso ao lado de **Agent merge**.
6. Confirme se há uma marca ao lado de **Merge pull request**.


> [!IMPORTANT]
> O Agent Merge não ignora as proteções do repositório nem as permissões ausentes. Resolva esses bloqueios antes de continuar.

## Resumo e próximos passos

Você automatizou várias partes do processo de desenvolvimento, incluindo a geração, o teste e a validação de código e, agora, o processo de pull request. Você:

- aprendeu o que é o Agent Merge e como ele automatiza o ciclo de vida do merge.
- examinou o PR completo do recurso e as evidências de verificação.
- autorizou o Agent Merge somente após a revisão e confirmou que o PR foi integrado.

Em seguida, você [usará um canvas existente e criará um canvas de triagem][next-lesson] para explorar uma forma mais completa de examinar, planejar e visualizar o trabalho com o agente.

## Recursos

- [Gerenciar issues e pull requests com o aplicativo GitHub Copilot][managing-issues-prs]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/9-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app