---
title: "Lição 0 - Pré-requisitos"
description: "Prepare-se para as lições do aplicativo GitHub Copilot: instale o Node.js para o projeto Tailspin Toys e crie sua própria cópia do repositório a partir do modelo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

O aplicativo GitHub Copilot é um aplicativo para desktop que funciona como ponto central tanto para o Copilot quanto para o GitHub. Ele oferece acesso rápido a issues e pull requests e, naturalmente, permite que você desenvolva usando o GitHub Copilot. Durante este workshop, você trabalhará localmente com o aplicativo Tailspin Toys, criado com Astro, e com o aplicativo GitHub Copilot. Antes de começar, vamos verificar se o Node.js está instalado localmente e depois instalar o aplicativo Copilot.

Nesta lição, você vai:

- instalar o Node.js para executar os testes do projeto no seu computador.
- criar sua própria cópia do projeto Tailspin Toys a partir do modelo.

## Instalar o Node.js

Em várias lições, você pedirá a um agente que crie recursos e execute localmente o conjunto de testes do Tailspin Toys. Para isso, é necessário o [**Node.js**][nodejs], o único ambiente de execução exigido pelo projeto. Instale a versão **LTS** atual.

A opção mais simples em todas as plataformas é o instalador oficial:

1. No sistema operacional, abra uma janela de terminal usando o Windows Terminal, o Terminal do macOS ou o aplicativo que você costuma usar.
2. Execute o comando a seguir para verificar a versão do Node.js instalada:

    ```shell
    node --version
    ```

3. Se ela atender aos requisitos do README e do `package.json` do projeto, pule para a próxima seção.

> [!TIP]
> Você só precisa concluir estas etapas se não tiver o Node instalado ou se precisar atualizá-lo.

4. Abra a [página de download do Node.js][node-download].
5. Baixe a versão **LTS** para o seu sistema operacional.
6. Execute o instalador e aceite as opções padrão. No Windows, mantenha a opção **Add to PATH** selecionada.
7. Após a instalação, abra uma nova janela de terminal.
8. Confirme a instalação na nova janela de terminal executando:

    ```bash
    node --version
    ```

9. Você deve ver a versão que instalou.

> [!IMPORTANT]
> Cada worktree também precisa das dependências do projeto e do Chromium do Playwright para verificações E2E. Siga o README do repositório Tailspin Toys ao preparar uma worktree e revise qualquer solicitação de instalação antes de aprová-la.

## Configurar o repositório do laboratório

Você trabalhará na sua própria cópia do projeto Tailspin Toys. Crie-a agora a partir do [repositório de modelo][template-repository]. O novo repositório contém todos os arquivos necessários para o laboratório, e você o conectará ao aplicativo na próxima lição.

1. Em uma nova janela do navegador, acesse o repositório do GitHub deste laboratório: `https://github.com/github-samples/tailspin-toys`.
2. Crie sua própria cópia do repositório selecionando o botão **Use this template** na página do repositório do laboratório. Em seguida, selecione **Create a new repository**.

    ![Botão Use this template com a opção Create a new repository selecionada no menu suspenso](/images/learning-hub/copilot-workshops/app-0-use-template.png)

3. Se você estiver fazendo o workshop como parte de um evento conduzido pelo GitHub ou pela Microsoft, siga as instruções dos mentores. Caso contrário, crie o novo repositório em uma organização na qual você tenha acesso ao GitHub Copilot.

    ![Formulário Create a new repository com github-samples/tailspin-toys definido como modelo e o nome do repositório preenchido](/images/learning-hub/copilot-workshops/app-0-create-repository.png)

4. Anote o caminho do repositório que você criou (**organization-or-user-name/repository-name**), pois ele será usado mais adiante no laboratório.

> [!NOTE]
> Quando você cria o repositório a partir do modelo, um backlog de issues do GitHub é criado automaticamente. Você trabalhará com essas issues durante todo o workshop e não precisará criar nenhuma.

Use uma cópia nova do modelo do workshop. Ele inclui instruções do repositório, código da aplicação, testes, uma skill quality-checks e uma extensão de canvas existente. Você personalizará a skill e criará um agente de QA durante o workshop. Se usar uma cópia mais antiga, confirme com a pessoa que conduz o workshop se ela contém os arquivos necessários.

## Resumo e próximos passos

Tudo pronto! Nesta lição, você:

- instalou o Node.js para que o projeto possa ser criado e testado no seu computador.
- criou sua própria cópia do repositório Tailspin Toys a partir do modelo.

Em seguida, você [instalará o aplicativo GitHub Copilot][next-lesson], conectará o repositório que acabou de criar e conhecerá o espaço de trabalho.

## Recursos

- [Baixar o Node.js][node-download]
- [Criar um repositório a partir de um modelo][template-repository]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/1-install-copilot-app/
[nodejs]: https://nodejs.org/
[node-download]: https://nodejs.org/en/download
[template-repository]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-template-repository
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app