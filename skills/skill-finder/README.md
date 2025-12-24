# Skill Finder

> Full-featured Agent Skills management: Search, Install, Star, and Update.
>
> フル機能の Agent Skills 管理ツール: 検索・インストール・お気に入り・更新

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-aktsmm-blue?logo=github)](https://github.com/aktsmm)

**Author / 作者**: yamapan ([@aktsmm](https://github.com/aktsmm))

## Features / 機能

- 🔍 **Local Index Search** - Fast offline search from 48+ pre-indexed skills
- 🏷️ **Tag Search** - Search by tags like `#azure #bicep`
- 🌐 **GitHub Search** - Search SKILL.md files on GitHub
- 📦 **Install Skills** - Download skills to local directory
- ⭐ **Star Favorites** - Mark and manage favorite skills
- 📊 **Statistics** - View index stats and category breakdown
- 🔄 **Auto Update** - Update all sources from GitHub
- 💡 **Similar Skills** - Get recommendations based on categories

---

- 🔍 **ローカル検索** - 48 以上のスキルから高速オフライン検索
- 🏷️ **タグ検索** - `#azure #bicep` のようなタグで検索
- 🌐 **GitHub 検索** - GitHub 上の SKILL.md を検索
- 📦 **インストール** - スキルをローカルにダウンロード
- ⭐ **お気に入り** - よく使うスキルをスター管理
- 📊 **統計情報** - インデックスの統計とカテゴリ内訳
- 🔄 **自動更新** - 全ソースを GitHub から更新
- 💡 **類似スキル** - カテゴリベースのおすすめ表示

## How to Use Skills / スキルの使い方

### 1. Install to designated directory / 所定のディレクトリに配置

```bash
~/.github/skills/        # GitHub Copilot
~/.claude/skills/        # Claude Code
```

### 2. Just prompt / プロンプトを指示するだけ

Skill Finder をスキルとして配置後、AI エージェントにスキルを探すよう指示するだけ：

```
「Azure関連のスキルを探して」    → #azure タグで検索
「ドキュメント処理のスキルある？」→ #document で検索
「PDFを扱えるスキルを教えて」    → pdf で検索
```

### Demo / デモ

**日本語デモ:**

https://github.com/user-attachments/assets/c35fe891-a43e-48da-a107-853b41639c8d

**English Demo:**

https://github.com/user-attachments/assets/4cfc7661-fdc8-40d8-8ad5-65bfd745e796

## Quick Start / クイックスタート

### Search / 検索

```bash
# Basic search / 基本検索
python scripts/search_skills.py "pdf"
pwsh scripts/Search-Skills.ps1 -Query "pdf"

# Tag search / タグ検索
python scripts/search_skills.py "#azure #bicep"
pwsh scripts/Search-Skills.ps1 -Query "#azure #development"

# Category filter / カテゴリフィルタ
python scripts/search_skills.py --category development
pwsh scripts/Search-Skills.ps1 -Category "development"
```

### Skill Management / スキル管理

```bash
# Show skill details / スキル詳細表示
python scripts/search_skills.py --info skill-name
pwsh scripts/Search-Skills.ps1 -Info "skill-name"

# Install skill / スキルをインストール
python scripts/search_skills.py --install skill-name
pwsh scripts/Search-Skills.ps1 -Install "skill-name"

# Star/Unstar / お気に入り追加・削除
python scripts/search_skills.py --star skill-name
python scripts/search_skills.py --unstar skill-name
pwsh scripts/Search-Skills.ps1 -Star "skill-name"
```

### Index Management / インデックス管理

```bash
# Update all sources / 全ソースを更新
python scripts/search_skills.py --update
pwsh scripts/Search-Skills.ps1 -Update

# Add new source / 新しいソースを追加
python scripts/search_skills.py --add-source https://github.com/owner/repo
pwsh scripts/Search-Skills.ps1 -AddSource -RepoUrl "https://github.com/owner/repo"

# View statistics / 統計情報表示
python scripts/search_skills.py --stats
pwsh scripts/Search-Skills.ps1 -Stats
```

### Utilities / ユーティリティ

```bash
# List options / オプション一覧
python scripts/search_skills.py --list-categories
python scripts/search_skills.py --list-sources
python scripts/search_skills.py --list-starred

# Find similar skills / 類似スキル検索
python scripts/search_skills.py --similar skill-name

# Check dependencies / 依存関係チェック
python scripts/search_skills.py --check
```

## Command Reference / コマンドリファレンス

| Python            | PowerShell       | Description                      |
| ----------------- | ---------------- | -------------------------------- |
| `--info SKILL`    | `-Info SKILL`    | Show skill details with SKILL.md |
| `--install SKILL` | `-Install SKILL` | Download skill locally           |
| `--star SKILL`    | `-Star SKILL`    | Star a skill                     |
| `--unstar SKILL`  | `-Unstar SKILL`  | Remove star                      |
| `--list-starred`  | `-ListStarred`   | List starred skills              |
| `--similar SKILL` | `-Similar SKILL` | Find similar skills              |
| `--stats`         | `-Stats`         | Show index statistics            |
| `--update`        | `-Update`        | Update all sources               |
| `--check`         | `-Check`         | Check tool dependencies          |
| `#tag` in query   | `#tag` in query  | Filter by category tag           |

## Search Flow / 検索フロー

```
1. Local Index     → Fast, offline (48+ skills)
   ローカル検索      高速・オフライン (48以上のスキル)
        ↓ not found / 見つからない
2. GitHub API      → Search SKILL.md files
   GitHub 検索       SKILL.md を検索
        ↓ not found / 見つからない
3. Web Search      → Show search URLs
   Web 検索          検索 URL を表示
        ↓ found good repo / 良いリポジトリ発見
4. Add to Index    → --add-source
   インデックス追加
```

## Included Sources / 収録ソース

| Source                                                                                            | Type      | Description                 |
| ------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| [anthropics/skills](https://github.com/anthropics/skills)                                         | Official  | Official Claude skills      |
| [obra/superpowers](https://github.com/obra/superpowers)                                           | Community | Superpowers for Claude      |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)           | Awesome   | Curated skill list          |
| [microsoft/windows-ai-studio-templates](https://github.com/microsoft/windows-ai-studio-templates) | Official  | Microsoft AI templates      |
| [github/copilot-instructions](https://github.com/github/copilot-instructions)                     | Official  | GitHub Copilot instructions |
| [aktsmm/Agent-Skills](https://github.com/aktsmm/Agent-Skills)                                     | Community | Azure/Development skills    |

## Categories / カテゴリ

| ID          | EN                     | JP               |
| ----------- | ---------------------- | ---------------- |
| development | Software development   | ソフトウェア開発 |
| testing     | Testing & QA           | テスト           |
| document    | Document processing    | ドキュメント処理 |
| web         | Web development        | Web 開発         |
| git         | Git & version control  | Git              |
| agents      | AI agents              | AI エージェント  |
| mcp         | Model Context Protocol | MCP              |
| azure       | Azure services         | Azure            |
| creative    | Creative content       | クリエイティブ   |
| meta        | Meta/utility skills    | メタスキル       |

## Requirements / 必要環境

- **Python**: 3.8+ (standard library only / 標準ライブラリのみ)
- **PowerShell**: 7+ (pwsh)
- **GitHub CLI**: `gh` (for search/install / 検索・インストール用)
- **curl**: for downloading files / ファイルダウンロード用

### Check Dependencies / 依存関係チェック

```bash
# Python
python scripts/search_skills.py --check

# PowerShell
pwsh scripts/Search-Skills.ps1 -Check
```

### GitHub CLI Setup / GitHub CLI セットアップ

```bash
# Install: https://cli.github.com/
gh auth login  # Authenticate for better rate limits
```

## File Structure / ファイル構成

```
skill-finder/
├── SKILL.md                      # Skill definition / スキル定義
├── README.md                     # This file / このファイル
├── LICENSE                       # MIT License
├── assets/
│   └── demo.mp4                  # Demo video / デモ動画
├── scripts/
│   ├── search_skills.py          # Python script
│   └── Search-Skills.ps1         # PowerShell script
└── references/
    ├── skill-index.json          # Skill index (48+ skills)
    └── starred-skills.json       # Starred skills
```

## Contributing / 貢献

Found a great skill repository? Add it to the index and submit a PR!

素晴らしいスキルリポジトリを見つけたら、インデックスに追加して PR を送ってください！

## License

MIT - See [LICENSE](LICENSE) for details.

---

© 2025 yamapan ([@aktsmm](https://github.com/aktsmm))
