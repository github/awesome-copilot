---
title: "オプション: Foundry を組み込む"
description: "Microsoft Foundry Canvas を使ってカタログに基づく Backer Concierge を構築します。各段階で安全に中断できます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /ja-jp/learning-hub/copilot-workshops/app/10-review/, label: 振り返りと次のステップ }
next:
  link: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: プロジェクトとモデルを準備する
tags:
  - workshop
---

このオプションの学習では、GitHub Copilot app の Microsoft Foundry Canvas を使い、Tailspin Toys に **Backer Concierge** を追加します。カタログに基づくモデルの実験から始め、ホステッド エージェントの構築、ローカル Web サイトへの統合へと進みます。

## 学習の流れ

各モジュールの最後にはチェックポイントがあり、安全に中断できます。学習全体を通じて、同じ Tailspin Toys リポジトリ、worktree ブランチ、Issue にリンクされたセッション、Foundry プロジェクト、モデルデプロイを使用します。

- [プロジェクトとモデルを準備する][module-1]では、カタログで扱える情報の範囲を定め、プロジェクトとモデルデプロイを作成し、Canvas で確認します。
- [エージェントを構築してデプロイする][module-2]では、Backer Concierge のひな形を作成してローカルでテストし、ホステッド エージェントをデプロイして再テストします。
- [エージェントをサイトに接続する][module-3]では、資格情報を保護するローカルプロキシ、アクセシビリティに配慮したチャットウィジェット、エンドツーエンドテストを追加します。

> [!IMPORTANT]
> Microsoft Foundry Canvas とホステッド エージェントはパブリックプレビュー段階です。
>
> この学習では、モデルデプロイや、モジュール 2 以降のホステッド エージェントなど、課金対象の Azure リソースを作成します。リソースを作成する前に、サブスクリプション、リージョン、クォータ、推定コストの承認が必要です。プロジェクトとモデルの作成だけで中断する場合も、クリーンアップが必要です。

1. [プロジェクトとモデルを準備する][module-1]から始めます。作業は、このワークショップのコンテンツリポジトリではなく、Tailspin Toys リポジトリで進めてください。
2. コアワークショップを完了する場合は、[レビューと次のステップ][core-review]に進んでください。

## リソースをクリーンアップする

どのチェックポイントで実験を終える場合も、不要なコストを避けるために Azure リソースを削除します。クリーンアップすると後続のモジュールに必要なリソースも削除されるため、後で続行するには再作成が必要です。

> [!WARNING]
> `rg-tailspin-toys` がこの演習専用で、保持する必要があるリソースを含んでいない場合にのみ削除してください。共有リソースグループを削除すると、関係のないリソースも削除されます。
>
> モジュール 1 で別のリソースグループ名を承認した場合は、以下のすべてのコマンドで `rg-tailspin-toys` をその名前に置き換えてください。

1. 起動したローカルの Agent Inspector、Azure Function、Astro 開発サーバーを、それぞれのターミナルで停止します。
2. モジュール 2 または 3 でホステッド エージェントをデプロイした場合は、同じ Tailspin Toys worktree でターミナルを開き、同じ `azd` 環境を使用して次を実行します。

   ```bash
   azd down --purge
   ```

3. 選択されているサブスクリプションと、ワークショップ用リソースグループがまだ存在するかどうかを確認します。

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   コマンドが `false` を返した場合、クリーンアップは完了です。`true` を返した場合は、グループ内のリソースを調べます。

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   残っているすべてのリソースがこの演習用であることを確認します。モジュール 1 の後で中断した場合は、`azd` サービスをデプロイしていなくても、Foundry プロジェクトとモデルをクリーンアップする必要があります。
4. 専用のワークショップ用リソースグループが残っていて、削除するリソースだけが含まれている場合は、次を実行します。

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. `--no-wait` を指定したコマンドは削除が完了する前に終了するため、次のコマンドが `false` を返すまで再実行します。

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## リソース

Microsoft のドキュメントで、Canvas、ホステッド エージェントのデプロイ、およびそれらのアクセス許可について説明されています。

- [Microsoft Foundry Canvas とは][foundry-canvas]
- [Foundry Canvas で最初のホステッド エージェントをデプロイする][hosted-agent-quickstart]
- [ホステッド エージェントのアクセス許可][hosted-agent-permissions]

[module-1]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /ja-jp/learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
