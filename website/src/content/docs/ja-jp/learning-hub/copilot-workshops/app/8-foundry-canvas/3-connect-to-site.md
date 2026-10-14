---
title: "エージェントをサイトに接続する"
description: "資格情報を保護するローカルプロキシを介してホステッド エージェントの Backer Concierge を統合し、ウィジェットをエンドツーエンドでテストします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: エージェントを構築してデプロイする
next: { link: /ja-jp/learning-hub/copilot-workshops/app/10-review/, label: 振り返りと次のステップ }
---

最後のモジュールでは、[エージェントを構築してデプロイする][previous-module]でテストしたホステッド エージェントを、ローカルで実行する Tailspin Toys Web サイトに接続します。

このモジュールを終えると、次のものが揃います。

- Foundry の資格情報と会話識別子を保護するローカルの Azure Functions プロキシ。
- エンドツーエンドの動作を検証済みの、アクセシビリティに配慮したチャットウィジェット。
- ローカルで検証済みの統合と、リソースのクリーンアップのチェックポイント。

## シナリオ

Tailspin Toys の支援者は、ゲームを閲覧する場所でカタログについてのアドバイスを必要としています。Backer Concierge は会話を維持し、キーボード操作に対応し、情報がない場合やエラーが発生した場合に明確に対処する必要があります。この利便性のために、サービスの資格情報や内部の会話情報をブラウザーに公開してはいけません。

## ホステッド エージェントのチェックポイントから再開する

統合では新しい Foundry リソースを作成せず、既存のホステッド エージェントを使用します。

1. 前のモジュールと同じ Tailspin Toys リポジトリ、worktree ブランチ、**Add a Backer Concierge assistant for catalog questions** の Issue セッションを再開します。ルートの `azure.yaml`、エージェントのソース、カタログが揃っていることを確認し、記録したサブスクリプション、専用リソースグループ、Foundry プロジェクト、モデルデプロイ、テスト済みのホステッド エージェントのバージョンを確認します。
2. リソースをクリーンアップした場合は、統合する前に、該当する[プロジェクトとモデル][project-module]および[テスト済みのホステッド エージェントのデプロイ][previous-module]を復元します。

## サーバー側のプロキシを構築する

Tailspin Toys は全体が事前レンダリングされています。ブラウザーのコードは、ホステッド エージェントを直接呼び出したり、Foundry の資格情報を受け取ったりしてはいけません。ローカルの Azure Functions による**サーバー側の資格情報保護境界**が Foundry に対して認証し、エージェントの応答だけをブラウザーに返します。ブラウザーは各メッセージとともに、不透明な会話ハンドルを送信します。プロキシは内部の識別子を公開せずに、そのハンドルを Foundry の会話に対応付けます。

Azure の資格情報にアクセスできるコードは、プロキシだけです。このワークショップでは、Function とサイトをローカルで実行し、Astro 開発サーバーが `/api` リクエストを Function に転送します。

> [!IMPORTANT]
> このワークショップのプロキシは、ローカル開発専用です。匿名でアクセスできる公開エンドポイントとしてデプロイしてはいけません。本番環境に統合するには、適切なレート制限やクォータ、CORS 制限、監視、コスト管理など、アプリケーションに合わせた認証と不正利用防止の設計が必要です。

3. 同じ Copilot セッションで、次を入力します。

   ```plaintext
   Add a local Azure Functions proxy in api for the static Astro site to call my deployed Backer Concierge during development. Use my existing local Azure sign-in, keep credentials and Foundry conversation identifiers out of the browser, return an opaque conversation handle, validate requests, sanitize errors, and add focused tests. Configure the Astro development server so /api requests reach the local Function. Don't create public deployment infrastructure.
   ```

4. 生成されたプロキシと対象を絞ったテストを確認し、リクエストの検証、エラーからの機密情報の除去、不透明な会話ハンドル、サーバー側だけに資格情報を留める境界を点検します。Copilot に対象を絞ったテストの実行と、失敗した箇所の修正を依頼します。
5. 別のターミナルを開き、Copilot が提示したコマンドでローカルの Function を起動し、そのまま実行しておきます。
6. チャットに戻り、Copilot にローカルプロキシのテストを依頼します。

   ```plaintext
   Test the local /api/concierge endpoint by asking "Which games are under $30?" Show me the sanitized response and confirm that no credentials or internal conversation identifiers are returned.
   ```

7. 応答を確認します。カタログに価格が含まれていないことを説明するはずです。Foundry のトークン、資格情報、内部の会話識別子、プロジェクトのエンドポイント、スタックトレースが含まれていないことを確認します。Function に接続できない場合や、応答に内部情報の漏洩や価格の捏造がある場合は、機密情報を除去した失敗の内容を Copilot に送り、修正してプロキシのテストを再実行してから先に進みます。

   ![ローカルプロキシのテスト](/images/learning-hub/copilot-workshops/app-8-local-proxy-test.png)

## チャットウィジェットを構築してテストする

プロキシを実行した状態で、ウィジェットが Foundry の内部情報を公開せずに、サイト上で会話を表示します。

8. Copilot にサイトへの統合を依頼します。

   ```plaintext
   Add an accessible Backer Concierge chat widget to the Astro site. Connect it to /api/concierge, preserve the conversation using the returned opaque handle, follow the existing design guidance, support keyboard use, keep Foundry details out of the browser, and add end-to-end tests covering the chat flow, conversation continuity, accessibility, error handling, and grounding boundaries.
   ```

9. Copilot が提示したコマンドを使い、別のターミナルで Astro 開発サーバーを起動します。サイトとローカルの Function の両方を実行したままにします。
10. Copilot にエンドツーエンドテストの実行を依頼します。

    ```plaintext
    Run the end-to-end tests for the Backer Concierge widget in the Tailspin Toys site. Verify its core chat flow, conversation continuity, accessibility, error handling, grounding boundaries, and secure use of the local proxy. Report the results and include evidence for any failures.
    ```

11. レポートを確認し、キーボード操作や[ホステッド エージェントの受け入れチェック][agent-checks]の 2 ターンの会話など、報告された動作をブラウザーで検証します。ブラウザーのリクエストが Foundry に直接送られず、不透明なハンドルとともに `/api/concierge` を経由し、応答に資格情報や Foundry の内部識別子が公開されていないことを確認します。推奨や情報不足への回答がカタログの範囲内に収まっていることも確認してください。Copilot とともに失敗したテストに対処し、必要に応じて影響のあるローカルサービスを再起動して、テストを再実行します。

    ![Backer Concierge ウィジェットのエンドツーエンドテスト結果](/images/learning-hub/copilot-workshops/app-8-e2e-test-results.png)

## チェックポイントと次のステップ

資格情報を保護するローカルプロキシを構築し、アクセシビリティに配慮したチャットウィジェットを接続して、ホステッド Backer Concierge との会話フロー全体を検証しました。このモジュールのチェックポイントは、カタログの境界を維持し、資格情報と Foundry の内部識別子をブラウザーに公開しない、ローカルでテスト済みの Web サイト統合です。プロキシやサイトを本番環境にデプロイしたものではありません。

実験を終えたら、両方のローカルサービスを停止して、[Azure リソースをクリーンアップしてください][cleanup]。その後、コアワークショップのルートにある[振り返りと次のステップ][core-review]に進みます。

[previous-module]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[project-module]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[agent-checks]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/#%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%82%92%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E3%81%A7%E6%A4%9C%E8%A8%BC%E3%81%99%E3%82%8B
[cleanup]: /ja-jp/learning-hub/copilot-workshops/app/8-foundry-canvas/#%E3%83%AA%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%92%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%A2%E3%83%83%E3%83%97%E3%81%99%E3%82%8B
[core-review]: /ja-jp/learning-hub/copilot-workshops/app/10-review/
