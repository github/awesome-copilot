---
title: "レッスン 5 - quality-checks スキルのカスタマイズと使用"
description: "既存の quality-checks スキルを確認し、報告形式をカスタマイズして、フィルター機能の検証に使用します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

コードを書く作業には、単にコードを書く以上のことが含まれます。コードが動作することは手動で検証し、指示ファイルを使用して標準に従っていることも確認しました。しかし、テストや lint、継続的インテグレーション (CI) のその他の作業はどうでしょうか。

このようなタスクには、**エージェントスキル**が最適です。スキルを使用すると、こうした処理を適切に実行する方法を Copilot が理解できます。

このレッスンでは、次の内容を学習します。

- 既存の `quality-checks` スキルを確認する。
- 結果の報告形式をカスタマイズする。
- スキルを実行し、出力をレビューする。

## シナリオ

Tailspin Toys は、単体テスト、lint、型チェックに `quality-checks` スキルを使用します。チームは、結果を読みやすくするためにレポートを改善したいと考えています。

## 指示、スクリプト、リソース

エージェントスキルは、再利用可能なタスクの指示、実行可能なスクリプト、補助リソースをまとめたもので、エージェントが必要に応じて読み込みます。基本的には、スキル名のフォルダーと、その中の `SKILL.md` という Markdown ファイルで構成されます。Markdown には、スキルの名前と説明を定義するフロントマター、スキルの動作概要、呼び出すタイミングのガイダンスが含まれます。フォルダーには、スキルの呼び出し時に使用するスクリプトやその他のリソースを収めたサブフォルダーも追加できます。

> [!NOTE]
> スキルに追加のフォルダーやファイルは必須ではありません。この例では、`npm` コマンドを使ってテストと linter を実行するため、追加の補助ファイルは必要ありません。

スキルをプロジェクトの `.github/skills` フォルダーに置くと、チーム内で共有および再利用できるリポジトリアセットになります。または、通常は `~/.copilot/skills` にある Copilot のルートフォルダーにも配置できます。

## スキルを確認する

Tailspin Toys チームが単体テスト、lint、型チェックの実行用に作成した `quality-checks` というスキルを確認します。

1. **Files** キャンバスをまだ開いていない場合は、レビューパネルで **+**、**File** の順に選択します。
2. `.github/skills/quality-checks/SKILL.md` を検索します。
3. 冒頭の `name` と `description` を読みます。Copilot はこの説明を使い、スキルを呼び出すタイミングを判断します。
4. 指示を読み、テストと lint のプロセスを Copilot にどのように案内しているかを確認します。

## 変更前にスキルを実行する

スキルはスラッシュ (`/`) コマンドで直接呼び出すことも、自然言語で呼び出すこともできます。スキルの 3 種類のチェックを実行するよう Copilot に依頼しましょう。

1. モードのドロップダウンから **Interactive** を選択し、Copilot が Interactive モードになっていることを確認します。
2. 次のプロンプトを使ってスキルを呼び出します。

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. 最後に表示されるレポートを確認します。

## 報告形式をカスタマイズする

何を実行したか、成功したか、ツールが実際に何を報告したかがわかる、よりよいレポートが必要です。そのレポートを作成するようスキルを更新しましょう。

1. **Files** キャンバスに戻ります。
2. まだ開いていない場合は、`.github/skills/quality-checks/SKILL.md` を開きます。
3. ファイルの末尾に次のセクションを追加します。

    ```markdown
    ## Results output formatting

    Upon completion, report each command that ran and whether it passed, failed, or was blocked. Include test counts, durations, errors, warnings, and other metrics only when the tool reports them. Identify the next action for any failure or blocker, and never describe a skipped or incomplete check as passed.
    ```

ファイルは自動的に保存されます。

## 更新したスキルを実行する

変更したスキルを実際に試してみましょう。先ほどとまったく同じプロンプトを使用します。

1. モードのドロップダウンから **Interactive** を選択し、Copilot が Interactive モードになっていることを確認します。
2. 次のプロンプトを使ってスキルを呼び出します。

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. 最後に表示されるレポートを確認します。

## まとめと次のステップ

既存のエージェントスキルをカスタマイズして使用しました。このレッスンでは、次の作業を行いました。

- 単体テスト、lint、型チェックを実行する `quality-checks` スキルを確認した。
- 結果の報告形式をカスタマイズした。
- スキルを実行し、出力をレビューした。

この変更は、フィルター機能と一緒に機能の PR に含めます。次は、[Playwright MCP server を通じて][next-lesson] Copilot がサイトを直接操作できるようにします。

## ほかのスキルの例

これらのコミュニティの例は参考資料であり、追加のタスクではありません。採用する前に前提条件と動作を確認してください。

- [Agent Skills 仕様][skill-spec]。
- [コントリビューションのワークフロー: `make-repo-contribution`][contribution-example]。
- [要件文書: `prd`][prd-example]。
- [図と同梱のエクスポートスクリプト: `drawio`][drawio-example]。
- [ブラウザーテスト: `webapp-testing`][browser-example]。

上流のコントリビューション例の名前は `make-repo-contribution` です。古い Tailspin テンプレートでは、異なる名前の `make-contribution` を使用していました。このワークショップは、どちらのコントリビューション用スキルにも依存しません。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/6-mcp-playwright/
[skill-spec]: https://agentskills.io/specification
[contribution-example]: https://github.com/github/awesome-copilot/tree/main/skills/make-repo-contribution
[prd-example]: https://github.com/github/awesome-copilot/tree/main/skills/prd
[drawio-example]: https://github.com/github/awesome-copilot/tree/main/skills/drawio
[browser-example]: https://github.com/github/awesome-copilot/tree/main/skills/webapp-testing
