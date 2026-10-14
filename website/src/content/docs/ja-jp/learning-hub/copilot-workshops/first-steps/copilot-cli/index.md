---
title: "GitHub Copilot CLI のはじめの一歩"
description: "Space Quiz を構築して公開しながら、GitHub Copilot CLI をターミナル中心のガイド付きコースで体験します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

初心者向けのハンズオンで GitHub Copilot CLI を体験します。空のフォルダーからカラフルな Space Quiz を構築し、ターミナル中心の開発の流れを学びます。Git に変更を記録する前に構築と差分のレビューを行い、セッションを並行して実行し、編集前に計画を立てます。その後、シェルを離れずにプルリクエストを作成してマージします。

ワークショップの所要時間は約 60～90 分です。プロジェクトは実行時の依存関係を持たない単一の HTML ファイルで構成されるため、CLI とそのエージェント型ワークフローの学習に集中できます。

> [!NOTE]
> このワークショップは [James Montemagno][james] が作成し、[First Steps with GitHub Copilot][source-lab] を基に構成されています。元のコンテンツは [MIT License][source-license] で公開されています。

## レッスン

| レッスン | トピック | 実施内容 |
| ------ | ----- | ---------------- |
| [0. 前提条件とセットアップ][lesson-0] | セットアップ | 前提条件を確認し、Copilot CLI をインストールしてサインインし、モデルを選ぶ |
| [1. クイズの構築][lesson-1] | 構築 | ターミナルからクイズを構築し、範囲を絞った変更を 1 つ加える |
| [2. プロジェクトの指示の記録][lesson-2] | 指示 | `/init` でエージェントへの指示を生成して調整する |
| [3. プロジェクトの公開][lesson-3] | 公開 | プロンプトまたは手動の操作で初期化、コミット、公開する |
| [4. Issue の並行作業][lesson-4] | 実装 | バックログを作成し、Issue をチャットに追加して `/diff` でレビューし、worktree で 2 つ目のセッションを開始する |
| [5. 編集前の計画][lesson-5] | 計画 | `/plan` を使って 2 つ目の Issue のアプローチに合意する |
| [6. エージェントが参照できる情報の把握][lesson-6] | コンテキスト | `/context` と `/clear` でコンテキストを確認してリセットする |
| [7. セッションの再開とリモートアクセス][lesson-7] | 再開 | `/resume` でセッションを離れたり戻ったりし、必要に応じて `/remote` で別のデバイスからローカルセッションの進行を確認する |
| [8. 作成、レビュー、マージ][lesson-8] | レビュー | `/pr create` と `/pr agentmerge` でプルリクエストを作成してマージする |
| [9. 作業の委任][lesson-9] | 委任 | `/delegate` に新機能を任せ、クラウドセッションの進行を確認する |
| [10. 振り返りと次のステップ][lesson-10] | 振り返り | ワークフローを振り返り、学習を続ける |

## はじめる

[レッスン 0: 前提条件とセットアップから始めます][lesson-0]。

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
