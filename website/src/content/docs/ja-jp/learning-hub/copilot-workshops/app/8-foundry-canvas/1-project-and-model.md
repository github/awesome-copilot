---
title: "プロジェクトとモデルを準備する"
description: "Tailspin のカタログをエクスポートし、Foundry プロジェクトとモデルデプロイを作成して、Canvas で検証します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/
  label: "オプション: Foundry を組み込む"
next:
  link: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: エージェントを構築してデプロイする
---

最初のモジュールでは、Backer Concierge に必要なデータと Azure リソースを準備します。この段階では、エージェントのコードやホステッド エージェントのデプロイは必要ありません。

このモジュールを終えると、次のものが揃います。

- グラウンディングの制約を明示したカタログのエクスポート。
- 機能要件に合わせて選んだ Foundry プロジェクトとモデルデプロイ。
- Canvas で検証済みのデプロイと、カタログの範囲に限定したモデルの簡単なスモークチェックの結果。

## シナリオ

Tailspin Toys の支援者は、カテゴリやパブリッシャーでゲームを絞り込めます。しかし、*Git の言葉遊びが好きな人には、どのゲームが合いますか?* といった質問には、ドロップダウンでは答えられません。Backer Concierge は Tailspin のカタログにあるゲームだけを勧め、ゲーム、パブリッシャー、評価、資金調達総額、支援者数、価格、プレイヤー数、プレイ時間、発売日を捏造してはいけません。信頼できるカタログと適切なモデルが、こうした回答の基盤になります。

## ツールと Issue セッションを準備する

このセットアップでは、GitHub Copilot app を Azure に接続し、機能に関するすべての作業をまとめて進められるようにします。

1. Azure サブスクリプションがあることを確認します。必要な場合は、[200 ドルのクレジット付き無料 Azure サブスクリプション][azure-free]または[100 ドルのクレジット付き Azure for Students][azure-students]を利用できます。
2. 使用する OS に対応した [Azure CLI][install-azure-cli] をインストールし、`az version` でインストールを確認します。
3. [Azure Developer CLI][install-azd] をインストールし、`azd version` でバージョン 1.27.1 以降がインストールされていることを確認します。
4. GitHub Copilot app を開き、**Customize** を開いてから **Plugins** を選択します。`microsoft-foundry` を検索し、Canvas と Foundry スキルを含む Microsoft Foundry プラグインの **Install** を選択します。

   ![Microsoft Foundry プラグインのインストール](/images/learning-hub/copilot-workshops/app-8-install-foundry-plugin.png)

5. **Customize** で **Plugins** を選択し、`azure` を検索するか、**Featured** 一覧から選択します。次に、Azure プラグインの **Install** を選択します。
6. サイドバーで **Issues** を選択し、Tailspin Toys リポジトリの **Add a Backer Concierge assistant for catalog questions** というタイトルの Issue を探して開きます。**New session** を選択し、新しい worktree で Issue にリンクされたセッションを開始します。3 つのモジュールすべてで、このリポジトリ、worktree ブランチ、Issue セッションを使い続けてください。
7. `/microsoft-foundry`、続いて `/azure` と入力し、両方のスキルがインストールされ、利用可能であることを確認します。まだプロンプトは送信しないでください。プラグインがすぐに表示されない場合は、アプリを再起動し、同じ Issue セッションに戻って再確認します。

## カタログをエクスポートする

サンプルリポジトリには、エージェントが読み込めるファイルを生成するエクスポートスクリプトが含まれています。

8. この Issue にリンクされた worktree セッションで、プロンプトボックスの既定の `/fix-issue` プロンプトを次に置き換えます。

   ```plaintext
   Install the project dependencies, seed the database, then run the existing db:export script. Show me the command output and summarize the shape and grounding limits of db/catalog.json.
   ```

9. コマンド出力を確認します。Copilot は次に相当するコマンドを実行するはずです。

   ```bash
   npm install
   npm run db:setup
   npm run db:export
   ```

   ![カタログのエクスポートの生成](/images/learning-hub/copilot-workshops/app-8-generate-catalog-export.png)

10. `db/catalog.json` を開き、タイトル、説明、カテゴリ、パブリッシャー、星評価を持つ 21 個のゲームが含まれていることを確認します。`note` フィールドも確認してください。カタログには資金調達総額、支援者数、支援プラン、発売日は含まれていません。価格、プレイヤー数、プレイ時間も、記載がなければ外部知識で補わず、情報がないものとして扱います。エクスポートが失敗した場合や内容が異なる場合は、先に進む前に Copilot に調査と再実行を依頼します。

   ![Copilot app で開いたカタログのエクスポート](/images/learning-hub/copilot-workshops/app-8-view-catalog.png)

## Foundry プロジェクトとモデルを設定する

先にチャットでプロジェクトとデプロイを作成しておくことで、Canvas は既存のリソースだけに接続します。

11. **+**、**Terminal** の順に選択し、Azure にサインインします。

    ```bash
    az login
    ```

12. 選択したサブスクリプションを確認し、そのリソースグループを一覧表示します。

    ```bash
    az account show --output table
    az group list --output table
    ```

    サブスクリプションが正しくない場合は、`az account set --subscription <subscription-id>` を実行してから、両方のコマンドを再実行します。

    `rg-tailspin-toys` が表示された場合は、そのリソースを確認します。

    ```bash
    az resource list --resource-group rg-tailspin-toys --output table
    ```

    無関係のリソースや共有リソースが含まれている場合は、いったん中断し、専用の名前を決めてから次のプロンプトを使用してください。以降のすべてのプロンプトとコマンドにある例の名前を、承認した名前に置き換えます。
13. 同じ Issue セッションで、次を入力します。

    ```plaintext
    Use the Microsoft Foundry skill to create a resource group named rg-tailspin-toys and a Foundry project named tailspin-toys.
    ```

    ![Foundry プロジェクトの作成](/images/learning-hub/copilot-workshops/app-8-foundry-project-created.png)

14. Copilot にモデルの推奨を依頼します。Issue からセッションを開始したため、Issue の受け入れ条件はすでにコンテキストに含まれています。

    ```plaintext
    Use the Microsoft Foundry skill to recommend two or three current chat models in the tailspin-toys project that meet this issue's acceptance criteria. Explain the tradeoffs and wait for me to choose.
    ```

15. Copilot が `microsoft-foundry` スキルを読み込んだことを確認し、トレードオフを踏まえて利用可能なモデルを選びます。Microsoft Foundry のホステッド エージェントのクイックスタートでは、現在 `gpt-5.4-mini` を使用していますが、利用可否とクォータはリージョンによって異なります。

    ![モデルの選択](/images/learning-hub/copilot-workshops/app-8-select-model.png)

16. 選んだモデルのデプロイを Copilot に依頼し、承認前に対象プロジェクトとコストを確認します。

    ```plaintext
    Deploy the model I selected to the tailspin-toys Foundry project, using the model name as the deployment name.
    ```

> [!TIP]
> モデルの利用可否は変わります。このモジュールに固定で記載されたモデルではなく、Copilot がプロジェクトで利用可能と確認したモデルを選ぶのが適切です。

## Canvas でモデルを検証してスモークテストする

この確認では、エージェントのコードを作成する前にプロジェクトとモデルを検証します。モデルのスモークチェックは、モジュール 2 で実施するホステッド エージェントのグラウンディングテストの代わりにはなりません。

17. **+**、**Canvas**、**Microsoft Foundry (Preview)** の順に選択します。
18. Canvas の右上隅にある **More options** メニューを開き、**Sign in** を選択します。
19. **tailspin-toys** Foundry プロジェクトを選択します。**Models** を展開し、デプロイが想定どおりの名前とステータスで表示されることを確認します。

    ![Canvas でのプロジェクトとモデルの検証](/images/learning-hub/copilot-workshops/app-8-validate-project-model.png)

20. 同じセッションで、次のプロンプトを入力します。

    ```plaintext
    Microsoft Foundry スキルを使用して、エージェントを作成せずに、tailspin-toys プロジェクトにデプロイしたモデルを直接テストしてください。@db/catalog.json の内容に基づいて、「バグを追跡するパズルゲームが大好きです。どのゲームを支援すべきですか。また、どれくらいの資金を調達していますか」と質問してください。応答と、取得できる場合に限り、使用したトークン数や応答時間などの有用なメタデータを表示してください。既存の Azure サインインを使用してください。資格情報を表示したり、ファイルを変更したり、リソースを作成したりしないでください。
    ```

21. 応答を確認します。`db/catalog.json` に実在するゲームだけを推奨し、正しいタイトル、パブリッシャー、評価を使用し、資金調達の情報がないことを説明する必要があります。モデルがゲーム、カタログの詳細、資金調達額を捏造した場合は、続行する前に別の推奨モデルと比較します。

> [!NOTE]
> Canvas は再度開いたときも、選択したプロジェクトを記憶しています。各ステージには、ひな形を作成する **Create new hosted agents**、モデル、ツールボックス、スキル、ガードレールを接続する **Build current hosted agent**、ローカル実行と Microsoft Foundry へのデプロイを行う **Deploy and test** があります。

## チェックポイントと次のステップ

Azure ツールを準備し、カタログをエクスポートして、デプロイしたモデルを Backer Concierge のグラウンディングルールに照らしてテストしました。このモジュールのチェックポイントは、不足している情報を捏造せず、カタログに実在するゲームを推奨するモデルです。

次は、同じ Tailspin Toys リポジトリ、worktree ブランチ、Issue にリンクされたセッション、Foundry プロジェクト、選択したモデルデプロイを使用して、[エージェントを構築してデプロイします][next-module]。ここで中断する場合は、継続的なコストを避けるために[Azure リソースをクリーンアップしてください][cleanup]。

[azure-free]: https://azure.microsoft.com/pricing/purchase-options/azure-account
[azure-students]: https://azure.microsoft.com/free/students
[install-azure-cli]: https://learn.microsoft.com/cli/azure/install-azure-cli
[install-azd]: https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd
[next-module]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[cleanup]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/#%E3%83%AA%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%92%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%A2%E3%83%83%E3%83%97%E3%81%99%E3%82%8B
