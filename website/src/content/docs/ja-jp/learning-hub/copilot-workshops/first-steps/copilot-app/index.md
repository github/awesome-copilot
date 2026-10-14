---
title: "GitHub Copilot app を体験する"
description: "Space Quiz を構築して公開しながら、GitHub Copilot app をガイド付きコースで体験します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

初心者向けのハンズオンで GitHub Copilot app を体験します。空のフォルダーからカラフルな Space Quiz を構築し、最初のプロンプトからレビュー済みのプルリクエストまで、開発の流れをひととおり体験します。

ワークショップの所要時間は約 60～90 分です。プロジェクトは実行時の依存関係を持たない単一の HTML ファイルで構成されるため、アプリとそのエージェント型ワークフローの学習に集中できます。

> [!NOTE]
> このワークショップは [James Montemagno][james] が作成し、[First Steps with GitHub Copilot][source-lab] を基に構成されています。元のコンテンツは [MIT License][source-license] で公開されています。

## レッスン

| レッスン | トピック | 実施内容 |
| ------ | ----- | ---------------- |
| [0. 前提条件とセットアップ][lesson-0] | セットアップ | 前提条件を確認し、アプリをインストールしてモデルを選び、ワークスペースを確認する |
| [1. ワークスペースの作成][lesson-1] | 作成 | 空のローカルフォルダーで Interactive セッションを開始する |
| [2. 構築と仕上げ][lesson-2] | 構築 | クイズを作成し、統合ブラウザーで改善する |
| [3. 確認とテスト][lesson-3] | コンテキストとテスト | セッションの詳細を読み、ブラウザーレベルのスモークテストを実行する |
| [4. プロジェクトの指示の記録][lesson-4] | 指示 | `/init` でエージェントへの指示を生成して調整する |
| [5. プロジェクトの公開][lesson-5] | 公開 | ローカルのプロジェクトから GitHub のパブリックリポジトリを作成する |
| [6. Issue とセッションの活用][lesson-6] | 実装 | バックログを作成し、分離された worktree で 1 つの Issue を実装して差分をレビューする |
| [7. 編集前の計画][lesson-7] | 計画 | Plan モードを使って 2 つ目の Issue のアプローチに合意する |
| [8. レビューの流れの完了][lesson-8] | レビュー | プルリクエストを作成し、Copilot のレビューフィードバックに対応して Agent Merge を使う |
| [9. Issue のトリアージの自動化][lesson-9] | 自動化 | 毎週の Issue のトリアージを自動化するスケジュールを設定して実行する |
| [10. リモートからセッションを続ける][lesson-10] | リモート (オプション) | `/remote` を使い、進行中のローカルセッションを Web またはモバイルから確認する |
| [11. Canvas を試す][lesson-11] | Canvas | Repository Issues Kanban Canvas から作業を開始する |
| [12. 振り返りと次のステップ][lesson-12] | 振り返り | ワークフローを振り返り、学習を続ける |

## はじめる

[レッスン 0: 前提条件とセットアップから始めます][lesson-0]。

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/0-prerequisites/
[lesson-1]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
[lesson-2]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/2-build-and-polish/
[lesson-3]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
[lesson-4]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
[lesson-5]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
[lesson-6]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
[lesson-7]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
[lesson-8]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
[lesson-9]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
[lesson-10]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
[lesson-11]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/11-canvas/
[lesson-12]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/12-review/
