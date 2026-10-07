---
title: "レッスン 10 - 振り返りと次のステップ"
description: "App のワークフロー、2つの PR マイルストーン、キャンバス演習、再利用可能な品質プラクティスを振り返り、追加のリソースを確認します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

GitHub Copilot app を使用して、Tailspin Toys の1つの連続したワークフローに取り組みました。実施した内容は次のとおりです。

- リポジトリを接続し、アプリのワークスペースと用意されたバックログを確認して、クイックチャットを試した。
- 星評価に対象を絞ったセッションを開始し、ブラウザーキャンバスで結果をレビューして、最初の pull request (PR) を手動でマージした。
- フィルター機能の Issue から開始し、**Plan** モードでアプローチを定義して、**Autopilot** モードで構築し、**Interactive** モードでレビューした。
- カスタム指示でエージェントをガイドし、既存の `quality-checks` スキルをカスタマイズして、単体テスト、lint、型チェックを実行した。
- Playwright Model Context Protocol (MCP) server を追加し、実際のブラウザーでフィルター機能を確認した。
- 要件、カバレッジ、スキルの結果、ブラウザーでの証拠を評価する品質保証 (QA) カスタムエージェントを作成して選択した。
- フィルター機能の変更全体をレビューし、2つ目の PR に **Agent Merge** を承認した。
- 既存の Database Explorer キャンバスを使用してから、リポジトリに保存するトリアージキャンバスを作成してテストした。

## リリースしたもの

ワークショップには2つの PR マイルストーンがあり、それぞれ更新済みの `main` から作成した専用のブランチを使用します。

1. **星評価:** ゲームカードに既存の `starRating` と明示的な未評価状態を表示します。
2. **フィルター機能と品質ワークフロー:** フィルター機能を実装し、指示を更新して機能に適用し、`quality-checks` のレポートをカスタマイズして、QA プロファイルと関連するテストを含めます。

フィルター機能の計画から PR の作成まで、同じセッション、worktree、ブランチを使用しました。ワークショップを円滑に進めるため、この作業を1つの PR にまとめました。その後、PR ワークフローを繰り返さずに、既存の Database Explorer を使用し、リポジトリに保存するトリアージキャンバスを作成しました。

## 検証方法の違い

自動テスト、手動のブラウザー確認、MCP を使った Copilot によるブラウザーでの調査など、複数の方法でコードを検証しました。`quality-checks` スキルは単体テスト、lint、型チェックを実行し、新しい形式で結果を報告しました。QA では、PR の前にこれらの結果を要件とテストカバレッジのレビューと組み合わせました。

追加するテストは実際の不足を補うものにします。新しいテストが不要な QA 実行も正しい結果になり得ます。ツールの不足、スキップされたチェック、失敗は明示すべき阻害要因であり、成功ではありません。マージを承認する前にコードと証拠をレビューし、変更後は関連する証拠を更新してください。

## ベストプラクティス

Copilot に与えるコンテキストとツールが、その作業を左右します。このワークショップでは、指示を更新し、スキルをカスタマイズして、QA プロファイルを作成し、MCP server を設定して、キャンバスを作成しました。セッション間でこれらのカスタマイズを再利用し、チームのニーズに合わせて調整してください。指示は標準を定め、スキルは繰り返し行うタスクを説明し、カスタムエージェントは専門的な役割を定義し、MCP server は外部ツールを接続し、キャンバスは共有の対話型領域を提供します。エージェントの要約だけでなく、実際の変更とツールの結果をレビューしてください。

タスクに合わせて**モードとモデル**を選択します。構築前にアプローチを検討するには **Plan**、対象を絞った変更で作業に関与し続けるには **Interactive**、範囲が明確で分離されたタスクに限って **Autopilot** を使用します。定型的な編集には高速なモデルを選び、複雑な作業には推論能力が高く、より多くの推論を行うモデルを選びます。

基盤と同じくらい、コンテキストも重要です。何を、なぜ、どのように構築するかを明確に説明すると、出力は大きく変わります。アイデアを本格的なセッションに移す前に範囲を決める場所として、Quick chats が役立ちます。

## さらに確認する機能

コアワークフローを学習しました。ほかにも確認する価値がある機能があります。

- 最近の作業の要約など、定期的またはオンデマンドのタスクに使用する [**Automations**][using-automations]。導入前にスケジュール、権限、範囲をレビューしてください。自動化の作成は次のステップであり、このワークショップの一部ではありません。
- 構築前に問題について対話し、重要なフィードバックを得るための **Rubber duck**。
- セッションで起きたことの記録を生成する [`/chronicle`][chronicle]。
- Ollama、Foundry Local、LM Studio を介したローカルモデルなど、独自のプロバイダーのモデルを使用する [Bring your own key (BYOK)][byok]。
- アプリを直接リポジトリ、セッション、プロンプトの画面で開く [Deep links][deep-links]。

## 次のステップ

ツールを使いこなす最良の方法は、使い続けることです。実稼働コード、趣味のコード、長年構想していながら構築できていなかった小さなアプリなどに活用してください。学んだことをチームと共有し、チームからも学びましょう。そして、引き続きドキュメントを確認してください。

GitHub Copilot エコシステムをさらに学ぶには、[VS Code ハーネス][vscode-harness]、[Copilot CLI ハーネス][cli-harness]、[Cloud agent ハーネス][cloud-harness]を確認してください。

## リソース

- [GitHub Copilot app について][about-copilot-app]
- [GitHub Copilot app の概要][getting-started]
- [GitHub Copilot app のカスタマイズ][customize]
- [Automations の使用][using-automations]
- [Canvas extensions の操作][canvas-docs]

[vscode-harness]: /ja-jp/learning-hub/copilot-workshops/vscode/
[cli-harness]: /ja-jp/learning-hub/copilot-workshops/cli/
[cloud-harness]: /ja-jp/learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links