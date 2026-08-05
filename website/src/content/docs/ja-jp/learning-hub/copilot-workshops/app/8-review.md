---
title: "レッスン 8 - 振り返りと次のステップ"
description: "GitHub Copilot app のハーネスを振り返り、繰り返し発生する作業を自動化して、次に学ぶ内容を確認します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

ここ数回のレッスンでは、GitHub Copilot app を使い、アイデアから機能のマージまでを実践しました。取り組んだ内容は次のとおりです。

- リポジトリを接続し、アプリのワークスペースと用意されたバックログを確認した。
- 直接指定したタスクと Issue からセッションを開始し、Plan モードと Autopilot モードでエージェントの動作を制御した。
- カスタム指示と再利用可能なスキルでエージェントをガイドした。
- Playwright MCP server を使い、実際のブラウザーで作業をテストした。
- 共有キャンバスでエージェントと共同作業した。
- github.com で自分でマージする方法から、**Agent Merge** に pull request のマージを任せる方法まで、段階的なマージ自動化を使って変更をリリースした。

繰り返し発生する作業を自動化し、ベストプラクティスと今後の進め方を確認します。

## 繰り返し発生する作業を自動化する

アプリでは、**automations** を使って、スケジュールまたはオンデマンドでエージェントを実行できます。新しい Issue のトリアージや最近のアクティビティの振り返りなど、定型的なタスクに適しています。シンプルで破壊的でない automation を作成します。

1. サイドバーで **Automations** を選択してから **New automation** を選択します。
2. `Recap my recent work` などの名前を付けます。
3. トリガーを選択します。**Manual** はオンデマンドで実行し、**On a schedule** は自動的に実行し、**When an issue is created** は新しい Issue に反応します。このレッスンでは **Manual** を選択します。
4. automation が何も変更しないように、次の例のような読み取り専用のプロンプトを入力します。

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. プロジェクト (Tailspin Toys リポジトリ) を選択し、automation を作成します。
6. オンデマンドで実行し、結果を確認します。

> [!TIP]
> Automations はローカルまたはクラウドで実行できます。スケジュールに従って無人で実行する場合は、**Run in the cloud** を有効にし、automation に使用を許可する **Tools** を選択します。出力を信頼できるようになるまでは、スケジュールされた automations の範囲を限定し、破壊的でないものにしてください。

## ベストプラクティス

AI ツールを使用するときは、その周辺の基盤が出力の品質を左右します。このワークショップでは、指示ファイル、スキル、カスタムエージェントがそれぞれ役割を果たしました。これらに投資し、セッション間で再利用してください。

タスクに合わせて**モードとモデル**を選択します。構築前にアプローチを検討するには **Plan**、対象を絞った変更で作業に関与し続けるには **Interactive**、範囲が明確で分離されたタスクに限って **Autopilot** を使用します。定型的な編集には高速なモデルを選び、複雑な作業には推論能力が高く、より多くの推論を行うモデルを選びます。

基盤と同じくらい、コンテキストも重要です。何を、なぜ、どのように構築するかを明確に説明すると、出力は大きく変わります。アイデアを本格的なセッションに移す前に範囲を決める場所として、Quick chats が役立ちます。

## さらに確認する機能

コアワークフローを学習しました。ほかにも確認する価値がある機能があります。

- 完全なセッションを必要としない、その場限りの簡単な質問に使用する **Quick chats**。
- 構築前に問題について対話し、重要なフィードバックを得るための **Rubber duck**。
- ロール、その tools、指示をまとめ、繰り返し使用する専門的な作業に対応する [**Custom agents**][custom-agents]。
- セッションで起きたことの記録を生成する [`/chronicle`][chronicle]。
- Ollama、Foundry Local、LM Studio を介したローカルモデルなど、独自のプロバイダーのモデルを使用する [Bring your own key (BYOK)][byok]。
- GitHub がホストする分離環境でセッションを実行する [Cloud sandboxes][sandboxes]。
- アプリを直接リポジトリ、セッション、プロンプトの画面で開く [Deep links][deep-links]。

## 次のステップ

ツールを使いこなす最良の方法は、使い続けることです。実稼働コード、趣味のコード、長年構想していながら構築できていなかった小さなアプリなどに活用してください。学んだことをチームと共有し、チームからも学びましょう。そして、引き続きドキュメントを確認してください。

GitHub Copilot エコシステムをさらに学ぶには、[VS Code ハーネス](/ja-jp/learning-hub/copilot-workshops/vscode/)、[Copilot CLI ハーネス](/ja-jp/learning-hub/copilot-workshops/cli/)、[Cloud agent ハーネス](/ja-jp/learning-hub/copilot-workshops/cloud/)を確認してください。

## リソース

- [GitHub Copilot app について][about-copilot-app]
- [GitHub Copilot app の概要][getting-started]
- [GitHub Copilot app のカスタマイズ][customize]
- [Automations の使用][using-automations]
- [Canvas extensions の操作][canvas-docs]
- [クラウドサンドボックスとローカルサンドボックスについて][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links