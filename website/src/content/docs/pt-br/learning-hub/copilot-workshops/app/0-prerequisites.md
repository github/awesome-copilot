---
title: "Lição 0 - Pré-requisitos"
description: "Prepare-se para as lições do aplicativo GitHub Copilot: instale o Node.js para o projeto Tailspin Toys e crie sua própria cópia do repositório a partir do modelo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

O aplicativo GitHub Copilot é um aplicativo para desktop que funciona como ponto central tanto para o Copilot quanto para o GitHub. Ele oferece acesso rápido a issues e pull requests e, naturalmente, permite que você desenvolva usando o GitHub Copilot. Durante este workshop, você trabalhará localmente com o aplicativo Tailspin Toys, criado com Astro, e com o aplicativo GitHub Copilot. Antes de começar, vamos verificar se o Node.js está instalado localmente e depois instalar o aplicativo Copilot.

Nesta lição, você vai:

- instalar o Node.js para executar os testes do projeto no seu computador.
- criar sua própria cópia do projeto Tailspin Toys a partir do modelo.

## Instalar o Node.js

Em várias lições, você pedirá a um agente que crie recursos e execute localmente o conjunto de testes do Tailspin Toys. Para isso, é necessário o [**Node.js**][nodejs], o único ambiente de execução exigido pelo projeto. Instale a versão **22 ou posterior**; a versão **LTS** atual é uma escolha segura.

A opção mais simples em todas as plataformas é o instalador oficial:

1. No sistema operacional, abra uma janela de terminal usando o Windows Terminal, o Terminal do macOS ou o aplicativo que você costuma usar.
2. Execute o comando a seguir para confirmar que você tem o Node.js 22 ou posterior instalado:

    ```shell
    node --version
    ```

3. Se você vir `v22` ou um número maior, pule para a próxima seção.

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

9. Você deve ver `v22.x.x` ou posterior.

> [!TIP]
> Prefere contêineres? Se você tem o [**Docker**][docker], pode usar o [contêiner de desenvolvimento][dev-containers] do repositório em vez de instalar o Node.js localmente. Ele já inclui o Node. Você não precisa dos dois.

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

## Resumo e próximos passos

Tudo pronto! Você instalou o Node.js para criar e testar o projeto no seu computador e criou sua própria cópia do repositório Tailspin Toys a partir do modelo.

Em seguida, você instalará o aplicativo GitHub Copilot, conectará o repositório que acabou de criar e conhecerá o espaço de trabalho. Continue para a [Lição 1 - Instalar o aplicativo GitHub Copilot][next-lesson].

## Recursos

- [Baixar o Node.js][node-download]
- [Criar um repositório a partir de um modelo][template-repository]
- [Sobre o aplicativo GitHub Copilot][about-copilot-app]

[next-lesson]: /pt-br/learning-hub/copilot-workshops/app/1-install-copilot-app/
[nodejs]: https://nodejs.org/
[node-download]: https://nodejs.org/en/download
[docker]: https://www.docker.com/products/docker-desktop/
[dev-containers]: https://code.visualstudio.com/docs/devcontainers/containers
[template-repository]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-template-repository
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app