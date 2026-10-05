---
title: "Visual Studio Code のはじめの一歩"
description: "Space Quiz を構築、テスト、公開しながら、Visual Studio Code の GitHub Copilot をガイド付きコースで体験します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

初心者向けのハンズオンで、Visual Studio Code の GitHub Copilot を体験します。空のフォルダーからカラフルな Space Quiz を構築し、エディター中心の開発の流れを学びます。ワークスペースで構築し、コンテキストを確認して、Git に変更を記録する前にテストします。編集前に計画を立て、VS Code を離れずに GitHub のツールで Issue とプルリクエストを扱います。

ワークショップの所要時間は約 60～90 分です。プロジェクトは実行時の依存関係を持たない単一の HTML ファイルで構成されるため、エディターでの Copilot の学習に集中できます。

> [!NOTE]
> このワークショップは [James Montemagno][james] が作成し、[First Steps with GitHub Copilot][source-lab] を基に構成されています。元のコンテンツは [MIT License][source-license] で公開されています。

## レッスン

| レッスン | トピック | 実施内容 |
| ------ | ----- | ---------------- |
| [0. 前提条件とセットアップ][lesson-0] | セットアップ | 前提条件を確認し、GitHub 拡張機能を追加してフォルダーを開き、モデルを選ぶ |
| [1. ワークスペースでの構築][lesson-1] | 構築 | クイズを構築し、統合ブラウザーでプレビューして、選んだ要素を仕上げる |
| [2. プロジェクトの指示の記録][lesson-2] | 指示 | `/init` で `.github/copilot-instructions.md` を生成して調整する |
| [3. コンテキストの確認とテスト][lesson-3] | テスト | チャットのコンテキストを確認し、Git に変更を記録する前にスモークテストを実行する |
| [4. プロジェクトの公開][lesson-4] | 公開 | Source Control で初期化、コミット、公開する |
| [5. 編集前の計画][lesson-5] | 計画 | Plan モードを使って次の機能のアプローチに合意する |
| [6. Copilot に GitHub を扱うツールを提供する][lesson-6] | ツール | GitHub MCP サーバーを有効にしてレビューする |
| [7. Issue の計画と実装][lesson-7] | 実装 | GitHub のツールで Issue を作成し、新しいセッションで 1 つ実装する |
| [8. レビューとマージ][lesson-8] | レビュー | Source Control からプルリクエストを作成し、レビューを依頼してマージする |
| [9. クラウドセッションに引き継ぐ][lesson-9] | 委任 | ハーネスを Cloud に切り替え、新機能の作成を委任する |
| [10. 振り返りと次のステップ][lesson-10] | 振り返り | ワークフローを振り返り、学習を続ける |

## はじめる

[レッスン 0: 前提条件とセットアップから始めます][lesson-0]。

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/0-prerequisites/
[lesson-1]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
[lesson-2]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
[lesson-3]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
[lesson-4]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
[lesson-5]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
[lesson-6]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
[lesson-7]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/7-issues-and-sessions/
[lesson-8]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/8-review-and-merge/
[lesson-9]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/9-cloud-session/
[lesson-10]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/10-review/
