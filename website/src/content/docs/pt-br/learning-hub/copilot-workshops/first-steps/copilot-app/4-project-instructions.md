---
title: "Lição 4 - Registrar instruções do projeto"
description: "Execute /init para gerar instruções para o agente que descrevam o Space Quiz concluído e adapte-as à sua forma de trabalhar."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Agora que o quiz foi criado, aprimorado e testado, registre como as futuras sessões devem tratar este projeto. As instruções para o agente são lidas por todas as sessões antes do início do trabalho, para que você não precise repetir as mesmas orientações em todos os prompts.

Nesta lição, você vai:

- gerar instruções para o agente com `/init`.
- revisar o arquivo gerado antes de aceitá-lo.
- enxugar e personalizar as instruções.

## Registrar as regras com `/init`

1. Execute `/init` na sessão do aplicativo.
2. Revise o arquivo gerado de instruções para o agente antes de aceitá-lo.
3. Enxugue-o para manter orientações que reflitam este projeto: um único arquivo, sem dependências, acessível e testado no navegador.

> [!IMPORTANT]
> **Por que depois de aprimorar?**
>
> `/init` lê o projeto como ele existe neste momento. Executá-lo depois de criar e testar o quiz produz instruções que descrevem código real, em vez de uma pasta vazia.

## Personalizar as instruções

O arquivo de instruções não serve apenas para registrar fatos sobre o projeto. Adicione os detalhes que você repetiria em todos os prompts, como sua preferência de escrita de código, convenções de nomenclatura, bibliotecas a evitar e a quantidade de comentários desejada. Todas as futuras sessões leem esse arquivo antes de ler o prompt.

## Resumo e próximos passos

Seu projeto agora tem instruções para o agente baseadas em código real. Continue com a [Lição 5: Publicar o projeto][next-lesson].

[next-lesson]: /pt-br/learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
