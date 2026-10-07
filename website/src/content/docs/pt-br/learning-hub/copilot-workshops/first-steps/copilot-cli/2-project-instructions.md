---
title: "Lição 2 - Registrar instruções do projeto"
description: "Execute /init para gerar instruções para o agente que descrevam o Space Quiz concluído e adapte-as à sua forma de trabalhar."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Com um quiz funcional salvo em disco, gere instruções para o agente que descrevam o projeto real. Todas as futuras sessões leem essas instruções antes do início do trabalho, para que você não precise repetir as mesmas orientações em todos os prompts.

Nesta lição, você vai:

- gerar instruções para o agente com `/init`.
- revisar o arquivo gerado antes de aceitá-lo.
- enxugar e personalizar as instruções.

## Registrar as regras com `/init`

1. Execute `/init` na sessão.
2. Revise o arquivo de instruções gerado antes de aceitá-lo.
3. Mantenha apenas orientações que correspondam a este projeto: um único arquivo, sem dependências, acessível e testado no navegador.

> [!IMPORTANT]
> **A ordem importa**
>
> `/init` lê o projeto como ele existe neste momento. Executá-lo depois de criar e aprimorar o quiz produz instruções baseadas em código real.

## Personalizar as instruções

O arquivo de instruções não serve apenas para registrar fatos sobre o projeto. Adicione os detalhes que você repetiria em todos os prompts, como sua preferência de escrita de código, convenções de nomenclatura, bibliotecas a evitar e a quantidade de comentários desejada. Todas as futuras sessões leem esse arquivo antes de ler o prompt.

## Resumo e próximos passos

Seu projeto agora tem instruções para o agente baseadas em código real. Continue com a [Lição 3: Publicar o projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
