---
title: "Opcional: Incorporar o Foundry"
description: "Crie um Backer Concierge baseado no catálogo com o Microsoft Foundry Canvas, com pontos seguros para encerrar ao longo do percurso."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /pt-br/learning-hub/copilot-workshops/app/10-review/, label: Revisão e próximos passos }
next:
  link: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: Preparar o projeto e o modelo
tags:
  - workshop
---

Este percurso opcional adiciona um **Backer Concierge** à Tailspin Toys usando o Microsoft Foundry Canvas no aplicativo GitHub Copilot. Ele começa com um experimento de modelo baseado no catálogo, avança para um agente hospedado e termina com uma integração local ao site.

## O percurso

Cada módulo termina com um ponto de verificação e um ponto seguro para encerrar. O mesmo repositório Tailspin Toys, branch do worktree, sessão vinculada à issue, projeto do Foundry e implantação de modelo são mantidos ao longo do percurso.

- [Preparar o projeto e o modelo][module-1] estabelece os limites do catálogo, cria o projeto e a implantação de modelo e verifica ambos no Canvas.
- [Criar e implantar o agente][module-2] gera a estrutura inicial do Backer Concierge, testa-o localmente e implanta e testa novamente o agente hospedado.
- [Conectar o agente ao site][module-3] adiciona um proxy local que protege as credenciais, um widget de chat acessível e testes de ponta a ponta.

> [!IMPORTANT]
> O Microsoft Foundry Canvas e os agentes hospedados estão em versão prévia pública.
>
> Este percurso cria recursos do Azure que geram custos, incluindo uma implantação de modelo e, a partir do módulo 2, um agente hospedado. A assinatura, a região, a cota e o custo estimado precisam de aprovação antes da criação dos recursos. A limpeza também se aplica quando você encerra após criar apenas o projeto e o modelo.

1. Comece por [Preparar o projeto e o modelo][module-1], mantendo o trabalho no repositório Tailspin Toys, e não neste repositório de conteúdo do workshop.
2. Se preferir concluir o workshop principal, continue para [Revisão e próximas etapas][core-review].

## Limpar seus recursos

Quando terminar de experimentar em qualquer ponto de verificação, remova os recursos do Azure para evitar custos indesejados. A limpeza remove os recursos necessários para os módulos posteriores, portanto, será necessário criá-los novamente para continuar depois.

> [!WARNING]
> Exclua `rg-tailspin-toys` somente se ele for dedicado a este exercício e não contiver recursos que precisam ser mantidos. A exclusão de um grupo de recursos compartilhado também removerá recursos não relacionados.
>
> Se você aprovou outro nome para o grupo de recursos no módulo 1, substitua `rg-tailspin-toys` por esse nome em todos os comandos abaixo.

1. Interrompa no respectivo terminal qualquer Agent Inspector, Azure Function ou servidor de desenvolvimento do Astro local que você iniciou.
2. Se implantou o agente hospedado no módulo 2 ou 3, abra um terminal no mesmo worktree da Tailspin Toys, use o mesmo ambiente `azd` e execute:

   ```bash
   azd down --purge
   ```

3. Verifique a assinatura selecionada e se o grupo de recursos do workshop ainda existe:

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   Se o comando retornar `false`, a limpeza está concluída. Se retornar `true`, inspecione os recursos do grupo:

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   Confirme que todos os recursos restantes pertencem a este exercício. Se parou após o módulo 1, ainda será necessário limpar o projeto do Foundry e o modelo, mesmo sem ter implantado um serviço `azd`.
4. Se o grupo de recursos dedicado do workshop ainda existir e contiver apenas os recursos que você pretende remover, execute:

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. Como `--no-wait` retorna antes da conclusão da exclusão, execute novamente o comando a seguir até que ele retorne `false`:

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## Recursos

A documentação da Microsoft descreve o Canvas, as implantações hospedadas e suas permissões.

- [O que é o Microsoft Foundry Canvas?][foundry-canvas]
- [Implantar seu primeiro agente hospedado com o Foundry Canvas][hosted-agent-quickstart]
- [Permissões de agentes hospedados][hosted-agent-permissions]

[module-1]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /pt-br/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /pt-br/learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
