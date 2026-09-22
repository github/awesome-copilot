---
title: "Lição 6 - Fazer merge com o Agent Merge"
description: "Abra o pull request de filtragem, revise-o em My work e permita que o Agent Merge corrija o que estiver bloqueando e faça o merge para você, no nível mais alto da automação de merge."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

O recurso de filtragem está criado, verificado e funcionando em um navegador. A última etapa é fazer o merge. Você já fez isso duas vezes neste percurso. Nas duas ocasiões, abriu o pull request e fez o merge por conta própria no github.com. Desta vez, o aplicativo fará o trabalho operacional com o **Agent Merge**, que conduz todo o ciclo de vida de um pull request dentro do aplicativo.

Nesta lição, você vai:

- aprender o que é o Agent Merge e como ele automatiza o ciclo de vida do merge.
- habilitar o Agent Merge na sessão de filtragem.
- observar como ele cria o pull request, executa a CI e faz o merge quando todas as verificações passam.

## Cenário

Nos últimos módulos, você explorou vários níveis de automação, desde a criação de código até permitir que o Copilot valide diretamente uma interface. Para acelerar ainda mais o desenvolvimento, a Tailspin Toys quer descobrir se pull requests já avaliados e validados podem ter o merge feito automaticamente.

## Apresentação do Agent Merge

O **Agent Merge** permite automatizar a etapa final de integração de um pull request por meio do aplicativo Copilot. Quando você o habilita, a sessão do aplicativo lê o pull request, resolve o que estiver bloqueando o merge, como verificações de CI com falha, comentários de revisão e a necessidade de rebase, e faz o merge assim que o GitHub permite. Ele é executado em segundo plano, continua funcionando após reinicializações do aplicativo e é desativado automaticamente quando o pull request é integrado.

Até aqui, você selecionou **Merge pull request** no github.com. O Agent Merge transfere essa responsabilidade ao agente, permitindo que você passe para a próxima tarefa enquanto ele conduz o PR até a conclusão. Você ainda revisa e aprova o trabalho; o agente apenas cuida das etapas operacionais finais.

## Usar o Agent Merge para gerenciar o PR

Você revisou o código manualmente, executou testes e permitiu que o Copilot validasse a interface. Agora é hora de integrar o novo código à base de código. Vamos permitir que o Agent Merge conduza o PR pela integração contínua (CI) e faça o merge.

1. Volte à sessão mantida aberta no módulo anterior, na qual você estava adicionando a funcionalidade de filtragem.
2. No canto superior direito, selecione o menu suspenso ao lado de **Create PR**.
3. Selecione **Agent merge** para habilitá-lo.

   ![Menu suspenso Create PR expandido no aplicativo GitHub Copilot, com uma seta apontando para a opção Agent merge](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. O texto do botão mudará para **Agent merge**.
5. Selecione o botão **Agent merge** para iniciar o processo.

O aplicativo Copilot começará a criar e gerenciar o PR. Primeiro, ele explora o projeto para determinar a melhor maneira de criar um PR e depois cria o novo PR.

Após alguns instantes, você verá que o Copilot voltou a trabalhar, agora analisando as condições do PR, incluindo o processo de CI que executa todos os testes do repositório. Ele informará o status das revisões deixadas por outras pessoas da equipe, das verificações que precisam ser executadas e da possibilidade de fazer o merge do PR.

6. Permita que o Agent Merge faça o merge do pull request selecionando o menu suspenso ao lado de **Agent merge** e depois **Merge pull request**.

   ![Menu suspenso Agent merge mostrando as ações permitidas ao agente — Address reviews, Fix CI failures, Resolve conflicts — com uma seta apontando para Merge pull request](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. Quando todos os processos de CI estiverem verdes, indicando que os testes passaram, o Copilot fará o merge do pull request.

## Resumo e próximos passos

Você automatizou várias partes do processo de desenvolvimento, incluindo a geração, o teste e a validação de código e, agora, o processo de pull request. Você:

- aprendeu o que é o Agent Merge e como ele automatiza o ciclo de vida do merge.
- habilitou o Agent Merge na sessão de filtragem.
- observou como ele criou o pull request, executou a CI e fez o merge quando todas as verificações passaram.

Em seguida, você explorará **canvases**, uma maneira mais completa de planejar e visualizar o trabalho com o agente. Continue para a [Lição 7 - Planejar com canvases][next-lesson].

## Recursos

- [Gerenciar issues e pull requests com o aplicativo GitHub Copilot][managing-issues-prs]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/7-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app