---
title: "Lição 2 - Registrar instruções do projeto"
description: "Execute /init no Copilot Chat para gerar .github/copilot-instructions.md para o Space Quiz e adapte o arquivo."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Com um quiz funcional no espaço de trabalho, gere instruções personalizadas do repositório que descrevam o projeto real. O Copilot lê essas instruções em todas as solicitações de conversa.

Nesta lição, você vai:

- gerar instruções personalizadas do repositório com `/init`.
- revisar `.github/copilot-instructions.md` antes de salvá-lo.
- enxugar e personalizar as instruções.

## Registrar as regras com `/init`

1. Execute `/init` no Copilot Chat.
2. Revise o arquivo `.github/copilot-instructions.md` gerado antes de salvá-lo.
3. Mantenha apenas orientações que correspondam a este projeto: um único arquivo, sem dependências, acessível e testado no navegador.

![Ilustração do VS Code com .github/copilot-instructions.md aberto no editor e selecionado no Explorer, ao lado de index.html. O arquivo tem o título Space Quiz e lista regras: um único index.html sem dependências nem etapa de build, todas as respostas acessíveis pelo teclado e respeito a prefers-color-scheme nos dois temas. Uma seção intitulada How I like code written pede funções pequenas, retornos antecipados, nenhuma expressão engenhosa de uma linha e comentários apenas para o que realmente surpreende.](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

As instruções personalizadas do repositório ficam em `.github/copilot-instructions.md` e se aplicam a todas as solicitações de conversa.

> [!IMPORTANT]
> **A ordem importa**
>
> `/init` lê o espaço de trabalho como ele existe neste momento. Executá-lo depois de criar o quiz produz instruções baseadas em código real.

## Personalizar as instruções

O arquivo de instruções não serve apenas para registrar fatos sobre o projeto. Adicione os detalhes que você repetiria em todos os prompts, como sua preferência de escrita de código, convenções de nomenclatura, bibliotecas a evitar e a quantidade de comentários desejada. Todas as futuras sessões leem esse arquivo antes de ler o prompt.

## Resumo e próximos passos

Seu espaço de trabalho agora tem instruções personalizadas baseadas em código real. Continue com a [Lição 3: Inspecionar o contexto e testar][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
