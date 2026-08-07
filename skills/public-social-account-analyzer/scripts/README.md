# CLI 路由

从 Skill 根目录运行脚本。先执行目标脚本的 `--help`；除诊断实现问题外，不要读取数千行源码。采集可联网，其余规范化、分析、校验和渲染必须离线且确定性运行。

## 用户入口

| 目标 | 命令 |
| --- | --- |
| 明确范围的公开采集 | `python3 scripts/collect.py <PROFILE_URL> --limit N --out <NEW_COLLECTION>` |
| B站完整分页与有界重试 | `python3 scripts/collect_bilibili_complete.py <URL> --out-prefix <NEW_PREFIX>` |
| 抖音完整分页与有界重试 | `python3 scripts/collect_douyin_complete.py <URL> --out-prefix <NEW_PREFIX>` |
| 抖音账号本人 OpenAPI | `python3 scripts/collect_douyin_authorized.py --all --out <NEW_COLLECTION>` |
| 导入公开索引证据 | `python3 scripts/import_index_snapshot.py --evidence <EVIDENCE_JSON> --out <NEW_COLLECTION>` |
| 密封 collection 生成正式交付 | `python3 scripts/run_pipeline.py --input <COLLECTION> --output <NEW_ANALYSIS>` |
| 校验 taxonomy/business 结果 | `python3 scripts/validate_model_results.py --analysis <ANALYSIS_JSON> ...` |

`collect.py` 省略范围时，B站和抖音进入有界完整模式；微博和小红书默认最近 30 条。只有 B站/抖音接受显式 `--all`。所有平台都可显式使用 `--limit 1..100`。

Cookie 参数按平台分别为 `--bilibili-cookie-file`、`--douyin-cookie-file`、`--weibo-cookie-file`、`--xiaohongshu-cookie-file`。默认只在当前进程使用；持久化、自动加载和撤回见 [cookie-guide.md](../references/cookie-guide.md)。

## 正式交付

- 0 条有效作品：`run_pipeline.py ... --evidence-only`。
- 只需数据质量与描述性观察：普通运行生成 `light`。
- 主题、栏目或策略：按需生成并回填 taxonomy、business、comment 的严格 JSON；全部 requested 阶段与证据门通过后为 `strategy`。
- **Legacy 脚本**（已移至 `legacy/` 目录，通过符号链接保持兼容）：
  - `legacy/normalize.py` — 规范化 CSV/JSON，原地写回输入目录
  - `legacy/analyze.py` — 确定性指标计算与报告，原地写回输入目录
  - `legacy/render_report.py` — Markdown/HTML 报告渲染，原地写回输入目录
  - **仅用于维护旧制品或定位问题**；新任务优先使用 create-only 的 `run_pipeline.py`。

结果文件只接受 UTF-8 严格 JSON，拒绝重复键、`NaN`/`Infinity`、额外字段和证据错配。只生成 prompt 而未回填结果时，分析目录仍可密封，但业务状态保持 `PARTIAL`。

## 不可变工作区

- `--out`、`--output` 和 `--out-prefix` 必须指向新的叶子目录或前缀；不覆盖已有路径。
- 增量续采用 `collect.py <URL> --resume --out <SEALED_COLLECTION> --resume-out <NEW_COLLECTION>`。
- 列表 checkpoint 首次使用 `--checkpoint-out <NEW_CHECKPOINT>`；恢复时换新 `--out` 并传 `--resume-checkpoint <SEALED_CHECKPOINT>`。
- 只有通过 manifest 与 `.complete` 核验的目录可作为下游输入。

## 输出与退出码

不要从 stdout/stderr 文本或日志行数推断业务状态；读取密封目录中的 `task.json`、`delivery-summary.json`，或 wrapper 明确声明的最终摘要。诊断信息不得包含凭据或远端响应正文。

| 退出码 | 含义 |
| --- | --- |
| `0` | 命令成功；采集仍可能是可交付的 `PARTIAL`，须读 `task.json` |
| `2` | 参数、输入或工作区前置条件无效，通常未联网、未提交输出 |
| `3` | 任务或产物生成失败；若目录已密封，按其中状态处理 |
| `4` | 提交结果不确定；保留目录并重新核验，禁止覆盖重跑 |

字段问题先按 [data-schema.md](../references/data-schema.md) 路由；状态迁移见 [exceptions.md](../references/exceptions.md)，正式阶段决策见 [workflow.md](../references/workflow.md)。
