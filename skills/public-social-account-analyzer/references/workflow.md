# 正式制品工作流

只在 Agent 选择生成可复现 collection、续采、checkpoint、模型制品或正式 final 时读取本文件。普通聊天分析不必进入本工作流，也不要求生成这里列出的全部文件。平台字段与停止语义仍以对应平台参考和 `exceptions.md` 为准。

本文件约束正式制品，不垄断 Agent 的公开研究路径。脚本、适配器、模型阶段或渲染器失败时，不得伪称正式 final 完成；但 Agent 可以改用其他合规公开证据，或基于已核验结果提供明确标记的阶段性聊天答复。

## 1. 采样与范围路由

### 1.1 任务意图与取证选择

先记录并核验主页 URL 或账号身份、用户是否明确指定数量或日期范围、分析目标和是否请求评论。明确范围时遵守该范围。范围模糊时由 Agent 根据目标选择分阶段限量、询问或有界完整采集：快速方向性问题通常先取小批样本；账号全貌、完整栏目或长期节奏才优先完整采集。任何路径都必须披露实际范围，有限样本不得冒充全量。评论默认关闭。

### 1.2 样本门与制品交付路径矩阵

| 有效样本数 | 交付类型 (`delivery_kind`) | `strategy_ready` | 许可交付内容 |
| --- | --- | --- | --- |
| 0 条 / 全面风控 | `evidence_only` | `false` | 采集诊断、停止原因、已验证范围、恢复建议 |
| 1 – 14 条 | `light` | `false` | 数据质量、描述性样本观察（需显式标为小样本） |
| ≥ 1 条 | `light` | `false` | 数据质量与描述性样本观察；不能称为策略结论 |
| 模型与证据门全部完成 | `strategy` | `true` | taxonomy、证据覆盖及用户请求的 business/comment 均完成后，才交付策略洞察 |

15 条是正式高低表现共同点模块的最低样本门，不会单独令 `strategy_ready=true`。

所有输出使用 create-only 目录：
- 目标的父目录必须存在；可以创建父目录，但不预先创建作为提交目标的叶子目录。
- 不覆盖、清空、删除或重命名已存在的 collection、checkpoint、draft 或 final。
- 参数错误、模型结果错误或输出路径冲突后，修正外部输入并换新的目标路径。
- `.complete` 表示持久提交完成；`task.json.task_status` 表示业务完整性，两者不能混为一谈。

## 2. 采集

### 2.1 新任务

从 Skill 根目录运行：

```bash
python3 scripts/resolve_profile_url.py "<BILIBILI_PROFILE_URL>"
python3 scripts/collect.py "<PROFILE_URL>" --out <NEW_COLLECTION>
```

需要账号级覆盖或用户明确要求完整时，使用平台完整采集入口：

```bash
python3 scripts/collect_bilibili_complete.py "<BILIBILI_PROFILE_URL>" \
  --out-prefix <NEW_PREFIX> --analysis-goal "<GOAL>"

python3 scripts/collect_douyin_complete.py "<DOUYIN_PROFILE_URL>" \
  --out-prefix <NEW_PREFIX> --analysis-goal "<GOAL>"
```

两个入口都使用公开身份和平台分页；每个进程遇保护立即停止。`RATE_LIMITED/ACCESS_RESTRICTED`，以及 B站明确记录 `platform_response_code=-352` 的 WBI 风控失败，会在 30/60 秒后创建新 attempt 目录，总计最多 3 次；不切换账号、出口 IP 或登录态。成功输出中的 `selected_workspace` 是后续 collection；全部失败时它指向已封存且 `collected_count` 最大的 attempt。达到预算但未见末页不是穷尽。

若任务目标是完整报告、策略、栏目或长期节奏，在启动 complete wrapper 前先说明完整采集预算、
最多三次 attempt 与 30/60 秒自动退避；抖音还要说明浏览器最长 1,800 秒/2,000 次滚动。用户选择
完整采集后才运行 wrapper。若最终仍为 `PARTIAL`，再说明实际 `stop_reason`、已验证作品数及不能成立
的结论，由用户选择接受当前样本或另起重试任务。

日期范围传给完整入口的 `--date-from/--date-to`；限量或分阶段探索使用 `collect.py --limit N`，证据不足时可扩大 N 或切换完整入口。两平台完整入口都接受 `--max-items`，默认 10,000、硬上限 50,000；抖音另使用 `--max-seconds/--max-scrolls` 控制浏览器预算。用户明确请求评论洞察时把 `--comments` 传给对应完整入口；抖音只在基础公开字段缺失时增加 `--enrich-details`，它只能补充列表中已有作品，不能发现新作品。浏览器、Web 索引和其他公开研究工具由 Agent 按成本与可用性选择；任何替代证据都要核验归属并披露覆盖。

云端平台匿名页面出现登录墙，而用户愿意提供其当前登录会话时，按 [cookie-guide.md](cookie-guide.md) 引导用户在本地导出并将完整 Cookie 粘贴进对话。Agent 将它写入任务期受限临时文件后传给当前采集器的 Cookie 参数；不得回显、转发或把原文放进 URL、shell 参数值、日志、工作区或报告。该模式表示 `user_authorized_session`，不是匿名证据，也不赋予后台私有数据访问能力。验证码、滑块或频控仍按当前证据停下，再切换搜索索引、用户导出数据或缩小结论。

### 2.2 增量续采

```bash
python3 scripts/collect.py "<PROFILE_URL>" \
  --resume --out <SEALED_COLLECTION> --resume-out <NEW_COLLECTION>
```

来源必须带有效 `manifest.json + .complete`，且平台、规范主页与当前任务一致。脚本在联网和预留输出前核验来源；新结果按 `post_id/bvid` 去重合并，来源目录逐字节只读。`--since` 可覆盖从来源最新 `published_at` 推导的起点。

### 2.3 同次任务 checkpoint

首次任务加 `--checkpoint-out <NEW_CHECKPOINT>`。列表阶段完成后，checkpoint 作为独立密封提交保存。恢复时使用新的输出目录：

```bash
python3 scripts/collect.py "<PROFILE_URL>" \
  --out <NEW_COLLECTION> --resume-checkpoint <SEALED_CHECKPOINT>
```

未密封、被篡改、参数或账号不一致、含重复作品的 checkpoint 必须在联网前拒绝。不要把任意未提交工作目录当作恢复点。

### 2.4 本人授权抖音

仅账号本人显式选择时，从环境读取同次 OAuth 凭据：

```bash
DOUYIN_OPENAPI_ACCESS_TOKEN=... \
DOUYIN_OPENAPI_OPEN_ID=... \
python3 scripts/collect_douyin_authorized.py --all --out <NEW_COLLECTION>
```

不要把真实值写进命令示例、shell 历史、配置、subagent prompt 或产物。生产执行应通过进程环境的安全注入机制设置凭据。

## 3. 核验 collection

采集完成后读取 `task.json`、`collection-report.md`、`manifest.json` 与 `.complete`：

1. 核对任务状态、停止原因、请求数、采集数和作品状态计数。
2. 核对平台覆盖账本：B站常规/动态入口；抖音分页、末页、候选绑定或索引来源；评论请求、有效父作品、空结果和失败数。
3. 抖音主页计数出现冲突时读取 `platform_metrics.profile_conflicts`，不得静默选择后当作确定值；`page_context_*` 仅是旧产物兼容字段，当前传输不发起页内 API 请求。
4. 不把作品级 `RESTRICTED=0` 解释成任务没有受限。
5. 不从 stdout、文件行数或手工统计覆盖产物中的权威状态。
6. `valid_count == 0` 时停止策略分析，但继续创建正式 evidence-only 交付；不得向 collection 写入手工报告，也不得用主页累计计数推断栏目、节奏或互动策略。

## 4. 正式制品内部的最轻路由

已经决定生成正式制品后，仍选择能满足用户目标的最轻路径：

| 路径 | 进入条件 | 阶段 | 允许交付 |
| --- | --- | --- | --- |
| evidence_only | 0 条有效作品，或用户明确接受风控后的采集诊断 | collection → 固定事实交付 | 状态、停止原因、账号资料覆盖、恢复建议 |
| light | 至少 1 条有效作品，且用户原本只要快速样本观察或已明确接受当前样本 | collection → deterministic pipeline | 数据质量、描述性指标、明确标为样本的观察 |
| strategy | 用户明确要求主题/栏目、策略或高低表现共同点，且样本门满足 | light → taxonomy；按需 business/comment | 通过证据门的语义或策略结论 |

0 条作品时运行：

```bash
python3 scripts/run_pipeline.py \
  --input <SEALED_COLLECTION> \
  --output <NEW_EVIDENCE_DELIVERY> \
  --evidence-only
```

该命令验证密封 collection 后生成 `delivery-summary.json` 与固定的
`final-response.md`。它不归一化作品、不生成 taxonomy/business/comment prompt，也不把
账号身份或主页累计计数扩写成内容策略。

只需要归一化指标和报告时：

```bash
python3 scripts/run_pipeline.py \
  --input <SEALED_COLLECTION> \
  --output <NEW_FINAL>
```

流水线从已核验的 `source/posts.jsonl` 重新生成 CSV，不信任 collection 中的旧派生文件。它计算字段覆盖率、中位数/四分位数、分母透明的互动率、IQR 散布、发布时段和季节性，并同时生成 Markdown、HTML、CSV、JSON、delivery summary 与 final response。CSV/JSON 保存全量审计数据；Markdown/HTML 是面向人的有界视图，只展示代表作品、实际引用和结论所需证据，不复制全量排名或 URL 清单。

普通确定性 final 的 `delivery_kind=light`。它可以交付，但
`strategy_ready=false`，因此不得把描述性样本指标改写成栏目规律、因果判断或增长建议。
light 与 evidence-only 不加 `--require-delivery-ready`；该参数只用于要求模型阶段与证据门完整的 strategy final。
当 taxonomy 尚未完成时，人类可读文件标题必须标为“公开账号数据概览”，并显著说明它不能作为深度内容策略报告。

## 5. 模型协作分析

### 5.1 分类标注（Taxonomy）

只有用户明确要求主题、栏目、内容策略或高低表现共同点时才创建 taxonomy draft：

```bash
python3 scripts/run_pipeline.py \
  --input <SEALED_COLLECTION> \
  --output <NEW_TAXONOMY_DRAFT> \
  --with-llm-tax
```

独立 taxonomy subagent 读取 `taxonomy-prompt.md`、`taxonomy-input.jsonl` 和预填结果模板。先形成 6–10 个可复用主题，再逐条分类；只编辑语义槽位，不重写确定字段。结果保存在提交目录外，然后一次性批量校验：

```bash
python3 scripts/validate_model_results.py \
  --analysis <TAXONOMY_DRAFT>/analysis.json \
  --collection <SEALED_COLLECTION> \
  --taxonomy <TAXONOMY_RESULT.json>
```

### 5.2 按需 Business 与 Comment

taxonomy 通过后，用户明确要求内容策略判断、行动建议、增长或业务打法时创建 business draft；只有用户明确请求评论洞察且存在有效评论证据时才创建 comment prompt。用户只要栏目盘点或主题分布时可以直接创建 taxonomy final，不为补齐流程而启动额外模型阶段。

```bash
python3 scripts/run_pipeline.py \
  --input <SEALED_COLLECTION> \
  --output <NEW_INSIGHT_DRAFT> \
  --with-llm-tax \
  --classification-results <TAXONOMY_RESULT.json> \
  --with-business-insights \
  --with-comment-insights
```

- business subagent 只从 `business-evidence-catalog.jsonl` 选择 `evidence_id`，并遵守 `business-context.json` 的表现组边界。
- comment subagent 只在评论证据有效且用户请求时工作；每项结果绑定父作品、评论 ID、源行号和逐字摘录。
- 环境允许且任务确实需要两个语义分支时可以并行；不强制为了 Skill 流程拆出额外 subagent。
- `validate_model_results.py --business ...` 先批量校验业务结果。comment 结果由 final pipeline 的严格合同校验。

### 5.3 终产物交付（Final）

```bash
python3 scripts/run_pipeline.py \
  --input <SEALED_COLLECTION> \
  --output <NEW_FINAL> \
  --with-llm-tax \
  --classification-results <TAXONOMY_RESULT.json> \
  --with-business-insights \
  --business-insight-results <BUSINESS_RESULT.json> \
  --with-comment-insights \
  --comment-insight-results <COMMENT_RESULT.json> \
  --require-delivery-ready
```

未请求评论时省略两个 comment 参数。任一严格合同失败都不得修改 draft 或旧 final；修正外部 JSON 后使用新输出目录重跑。

## 6. 正式制品的分析规则与证据纪律

- `view_based_engagement_rate`、`follower_based_engagement_ratio`、`deep_approval_rate` 和 `community_discussion_rate` 分开报告，不混用分母。
- 按 views 分组称“触达高/低组”；按播放分母比率称“互动效率高/低组”，不用统一“高表现”掩盖口径。
- 有效样本少于 15 条时，正式高低共同点模块输出 `INSUFFICIENT_SAMPLE`，不补造强概括；阶段性聊天仍可报告明确限定的样本内观察。
- 正式“共同点”至少绑定 3 个不同父作品；不足时只能作为个案或待验证候选模式。
- B站没有公开开头证据时 `hook_type=unknown`；`is_original` 必须与公开 `is_repost` 一致；父作品没有公开 `series_name` 时结果必须为 `null`。
- 公开文案中的自述不等于受众事实；摘录存在也不等于策略结论成立。

## 7. 正式制品交付

final 完成后，以下规则用于宣称该正式制品已交付；它们不是普通聊天答复的前置条件：

1. 核验 `task.json`、`analysis.json`、`delivery-summary.json`、`final-response.md` 和 manifest 的摘要一致，且 `delivery_ready=true`。
2. 先向用户展示完整数据质量摘要，再给结论。
3. `task_status=PARTIAL` 时按 `partial_reasons` 分型说明影响。只有平台采集受限时才要求同时说明非空 `stop_reason` 与停止阶段；模型 pending、归一化损失等情况不得伪造停止原因。
4. 区分任务级限制与作品级 `status_counts`；评论 `unavailable` 表述为“未取得评论”。
5. 数字、状态和限制与 `final-response.md` 保持一致；可按用户需要重新组织或解释，不得产生数字漂移。
6. `delivery_kind=evidence_only/light` 可交付事实与限制，但只有 `strategy_ready=true` 才交付策略结论；核心洞察证据 URL 覆盖必须为 100%。
7. 不把另写脚本或手工 Markdown 冒充该 pipeline 的正式产物；阶段性聊天或补充分析需明确标签与证据来源。
8. `.complete` 后不向 final 目录追加 Agent transcript、人工备注或其他文件；评测答复副本写在 final 的同级目录。

AC-03 / AC-06 的字段准确率不能用源数据与 CSV 自洽替代人工真值；真实验收使用 `tests/manual_accuracy_check.py prepare/verify`，未完成时标记 `PENDING/INCONCLUSIVE`。
