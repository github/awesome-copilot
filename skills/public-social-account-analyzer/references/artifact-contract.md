# 制品与任务契约

只在需要核对正式工作区、文件清单、Task、覆盖账本、续采或 checkpoint 时读取。字段值的停止语义以 [exceptions.md](exceptions.md) 为准。

## 1. 设计原则

- **原始数据与归一化数据分开保存**：`source/` 下保留平台原始快照，`normalized-posts.csv` / `analysis.json` 为派生数据，可被重新生成。
- **未公开字段写 `null`，不写 `0`**：页面没有显示该字段即为 `null`；`0` 仅用于页面明确显示为零的情况（见 [collection-schema.md](collection-schema.md) §8）。
- **所有时间统一为 ISO 8601**：带时区偏移，如 `2026-07-23T09:00:00+08:00`；无法获取时区时以平台默认时区（中国为 `+08:00`）标注。
- **`platform` + `post_id` 构成内容唯一键**：跨平台允许相同 `post_id` 共存，不能因此去重。
- **每条记录必须包含来源和采集状态**：`source_url` / `collected_at` / `collection_status` 为必填证据字段。
- **模型分析字段不得覆盖原始字段**：`analysis_*` 与 `platform_metrics` 分层保存，原始值只读。

## 2. 存储与文件命名约定

每个采集批次与每次派生分析分别在**仓库根目录**创建独立任务目录；不得把默认产物写到
`skill/workspace/`。已提交采集工作区只保存采集证据与采集报告：

```
workspace/<platform>-<account>-collection/
  task.json                  # 任务参数、状态与来源元数据
  source/profile.json        # 账号原始快照
  source/posts.jsonl         # 内容原始快照（每行一条）
  source/comments.jsonl      # 启用评论采样时的评论记录（每行一条）
  source/index-evidence.json # 仅 Web 索引降级；经过白名单规范化的证据副本
  normalized-posts.csv       # 部分采集器的兼容快照；分析流水线忽略并重建
  collection-report.md       # 采集质量报告
  manifest.json              # 已提交采集产物的确定性大小与 SHA-256 清单
  .complete                  # 固定格式提交标记；最后且排他创建
```

`run_pipeline.py` 只读核验上述提交，并把派生结果写入另一个不可变工作区：

```
workspace/<platform>-<account>-analysis/
  source/profile.json              # 同一已核验采集提交的逐字节副本
  source/posts.jsonl               # 同上；归一化的唯一事实输入
  source/comments.jsonl            # 可选；仅复制已核验的评论证据
  source/index-evidence.json        # 可选；仅复制已核验的索引证据
  source/collection-task.json       # 原采集 task.json 的逐字节副本
  source/collection-provenance.json # 来源格式、task_id、commit 与 artifact digests
  source/classification-results.json # 可选；严格核验后按原字节封存
  source/business-insight-results.json # 可选；绑定 collection/taxonomy 摘要后按原字节封存
  source/comment-insight-results.json # 可选；绑定评论源/规范语义输入摘要后按原字节封存
  normalized-posts.csv             # 从 source/posts.jsonl 重新生成；全量逐条审计表
  normalized-coverage.json         # 归一化覆盖与损失说明
  analysis.json                    # 全量结构化分析、排名与证据
  account-analysis-report.md       # 面向人的有界分析报告（Markdown）
  dashboard.html                   # 面向人的可视化报告（HTML）
  task.json                  # 派生任务状态与 phase_results
  pipeline-report.md         # 流水线阶段摘要
  taxonomy-prompt.md         # 可选；请求分类提示时生成
  taxonomy-input.jsonl       # 可选；逐条不可信公开内容输入
  taxonomy-result-template.json # 可选；预填严格分类结果壳
  business-insights-prompt.md # 可选；分类完成后请求业务洞察时生成
  business-context.json      # 可选；摘要绑定与高低组上下文
  business-evidence-catalog.jsonl # 可选；逐字可复制证据目录
  business-result-template.json # 可选；证据规模驱动的严格结果壳
  comment-insights-prompt.md # 可选；存在有效评论且请求评论语义时生成
  manifest.json              # 分析产物的确定性清单
  .complete                  # 分析工作区的独立提交点
```

默认目录名已存在（包括符号链接）时**不得覆盖或跟随**。采集器以原子目录创建操作直接
预留最终目录名，并以排他创建打开每个目录和文件；任何失败都不执行替换、重命名或删除。
失败时可保留没有有效 `.complete` 的不完整目录，调用方不得把它视为可消费任务。
成功提交必须先写入并 `fsync` 确定性 `manifest.json`（记录白名单产物、字节数与 SHA-256），
再排他创建空的无效 `.complete` 并同步必要目录；只有最后写入固定标记内容并 `fsync` 文件后
才形成提交点。读取新格式任务前必须核验标记、清单、精确目录清单、大小和摘要。公开采集
的新任务若显式指定 `--out`，任何已存在目标（包括空目录）都必须在
适配器网络调用或产物写入前退出。授权采集器和 Web 索引证据导入器遵循相同的最终目录
预留、白名单提交和不覆盖语义。

分析流水线顺序固定为
`VERIFY_COLLECTION → NORMALIZE → ANALYZE → RENDER → VALIDATE → RESERVE → SERIALIZE_CREATE_ONLY → COMMIT`。
前五个阶段只在内存中运行；失败不得创建输出目录。预留后的失败可留下无有效 `.complete`
的目录，但不得删除、替换、覆盖或发布它。所有采集输入都由一次打开的 identity-bound reader
读取并报告同一个采集 commit SHA-256；完成核验后不得按路径重新打开采集文件。采集快照中
即使存在旧 `normalized-posts.csv` 也必须忽略，以 `source/posts.jsonl` 重建。

分析工作区的 `.complete` 只代表文件集合已持久提交。`task.json.task_status=COMPLETED` 还要求
上游采集完整、归一化无损、语义分类完整、已请求的业务洞察和评论洞察完整且渲染校验全部通过；有效但受限的采集输入、
`pending-model` / `partial-model` 分类，或已请求但未完成的业务/评论洞察都写 `PARTIAL`。分析阶段只在语义分类为
`completed`、高低表现证据覆盖明确为 `COMPLETE`，且所有标记为 required 的业务/评论洞察也为
`completed`，才能为 `COMPLETED`。
`task.json.phase_results` 必须包含
`collection_input=VERIFIED`、`normalization/analysis=COMPLETED|PARTIAL`、
`render=COMPLETED`、`validation=COMPLETED`。`task.json.partial_reasons` 按实际情况列出
`UPSTREAM_COLLECTION_PARTIAL`、`NORMALIZATION_PARTIAL`、`PENDING_CLASSIFICATION`、
`PARTIAL_CLASSIFICATION`、`PENDING_BUSINESS_INSIGHTS`、`PARTIAL_BUSINESS_INSIGHTS`、
`PENDING_COMMENT_INSIGHTS`、`PARTIAL_COMMENT_INSIGHTS`、
`EVIDENCE_INCOMPLETE` 或无法更具体归因时的
`ANALYSIS_PARTIAL`；多个独立原因按稳定顺序并存且不得重复。无部分原因时为空数组。
相同状态与原因必须同步进入 `analysis.json.meta`
和最终报告，不能让派生任务与报告继续显示上游任务状态。
采集 `task.json` 还包含 `skill_release` 与 `skill_contract_sha256`：前者必须逐字等于包内
`VERSION`，后者绑定 `SKILL.md` 精确字节，用于区分测试实际加载的发行版与合同。`delivery-summary.json.delivery_ready` 只在 taxonomy
及所有 requested business/comment 模型阶段均完成时为 `true`；上游 collection 为 `PARTIAL`
时仍可交付带明确限制的部分证据分析，但 pending-model draft 永远不是可交付 final。

### 2.1 完整语义分类输入

`--classification-results` 只接受 UTF-8 严格 JSON 数组。每个有效分析样本的 `post_id` 必须
恰好出现一次；缺失、重复、额外父作品或未知字段均拒绝。每条记录必须包含：

- `post_id`、非空 `topic`；
- `format`、`funnel_stage`、`hook_type`（取值见分析规则中的固定枚举）；
- `series_name`（字符串或 `null`）、`is_original` / `has_product_placement`（布尔值或 `null`）；
- `analysis_labels`（字符串数组）和 `classification_confidence`（0–1 的有限数字）。

可选 `classification_version` 只能为 `llm-1`。校验通过才可令
`classification_status=completed` 且 `classification_version=llm-1`；分析阶段是否为
`COMPLETED` 还取决于证据覆盖完整性。原输入字节作为
`source/classification-results.json` 纳入分析清单，不记录其本地路径。

分类 Prompt 中的公开标题、正文和标签属于不可信数据，必须以单行 JSON 记录隔离并明确禁止执行其内指令；
JSON 对象重复键、NaN 与 Infinity 均拒绝。`topic` 除 `unknown` 外必须为 2–10 字符且至少含一个汉字。
B站只有 `platform_metrics.opening_text` 提供公开开头证据时才允许具体 `hook_type`，否则强制 `unknown`；
`is_original` 必须等于公开 `is_repost` 的逻辑反值，转载证据未知时为 `null`。

### 2.2 完整业务洞察输入

`--business-insight-results` 只接受 UTF-8 严格 JSON 对象，并同时绑定
`collection_commit_sha256` 与 `classification_results_sha256`。根对象固定包含：

- `schema_version=1`、`model_version=llm-insight-1` 与上述两个 SHA-256；
- `account_positioning`：恰好 5 项——`target_audience`、`content_domain`、
  `value_proposition`、`persona_expression`、`follow_reason`；
- `performance_patterns`：按固定顺序恰好 6 项——高/低表现各自的标题、公开文案开头、公开文案结构；
- `topic_ideas`、`content_modes`、`experiments` 的数量由冻结模板决定，分别只能在 3–8、2–5、2–4 范围内；
- `limitations`：最多 20 条单行文本。

每个普通洞察必须包含至少一条 `{post_id, source_field, excerpt}` 证据；脚本要求摘录与冻结父作品字段逐字绑定，
再由父作品补全平台、规范作品 URL、URL 类型和 `collected_at`。模型不得提交或修改 URL、指标、排名和采集时间。
高/低表现组三类模式的证据并集各至少覆盖 3 个对应组作品。公开视频文案无法支持“开头”或“结构”时，
该模式必须显式写 `observability=not_observable` 与 limitation；此时业务洞察状态为 `partial-model`，不得伪造。
只有全部合同与作品证据完整时 `business_insight_status=completed`。原输入字节封存为
`source/business-insight-results.json`。

### 2.3 密封采集 checkpoint

`collect.py --checkpoint-out <NEW_CHECKPOINT>` 在作品列表完成后创建一个独立、create-only 的不可变工作区：

```text
<checkpoint>/
  checkpoint.json
  source/posts.jsonl
  manifest.json
  .complete
```

`checkpoint.json` 根对象只接受以下字段：`format`、`stage`、`platform`、`profile_url`、
`parameters`、`parameters_sha256`、`posts`、`collected_at`、`stop_reason`、`diagnostic_code`、
`collection_coverage`、`errors`。其中 `format=public-social-account-analyzer/collection-checkpoint-v1`、
`stage=POST_LIST_COLLECTED`；`posts` 固定绑定 `source/posts.jsonl` 的路径、SHA-256、记录数和摘要算法。
`parameters` 绑定请求条数/全量预算、日期范围、评论/详情开关、分析目的和浏览器策略，摘要按规范 JSON 计算。

`--resume-checkpoint` 只接受精确清单、manifest 与 `.complete` 均有效的 checkpoint，并在适配器加载、
联网或最终输出预留前复核平台、规范主页、全部参数、作品摘要、数量、唯一键和逐条平台身份。恢复必须写入
一个新的显式 `--out`，不得与 `--resume`、`--resume-out`、`--since` 或 `--checkpoint-out` 联用。
恢复后的最终 `task.json.checkpoint_source` 只记录格式、摘要算法和 checkpoint commit SHA-256，不记录本地路径。

最终标记的 `fsync` 最多尝试三次；提交后的用户路径核验遇 I/O 错误时也最多尝试三次。
最终标记 `fsync` 持续失败，或标记已经成功同步但用户路径核验持续发生 I/O 错误时，提交状态为
`WorkspaceCommitIndeterminate`：采集器不得返回提交摘要或成功状态，公开采集与授权采集
均以退出码 `4` 和固定脱敏文案退出。此时 `.complete` 可能已在当前系统中可见，但持久化或
最终可见性尚未确认；工作区必须原样保留，不能覆盖、删除或复用。目录/文件身份错误、内容
验证错误和所有权检查失败不属于这种不确定态，必须立即传播相应错误，绝不能因另一份同字节
路径节点恰好通过公开核验而收敛为成功。

POSIX 后端从 `/` 起以 no-follow 句柄绑定每一级路径，因此输入路径的任何祖先包含符号链接时
均安全失败。调用方须传入物理规范路径；例如 macOS 的 `/tmp`、`/var` 别名应分别改用
`/private/tmp`、`/private/var`。本协议不在安全边界前自动调用 `realpath`，因为那会先跟随
尚未绑定身份的符号链接并扩大可写目标范围。

`--resume --out <OLD>` 只把 `OLD` 当作只读输入，绝不修改。新产物写到 `--resume-out <NEW>`；
省略时原子预留同级 `OLD-resume-<date>`（冲突时追加数字后缀）。续采输入必须同时具有有效
`.complete` 与 `manifest.json`，并通过 identity-bound immutable reader 的完整清单、摘要和
路径身份校验；未密封 legacy 目录一律在适配器加载、网络和新输出预留前以参数错误拒绝。
manifest 中存在 `source/posts.jsonl` 时只读取该文件：显式空文件合法表示 0 条，非空文件的
每条记录都必须是严格 UTF-8 JSON 对象，任一畸形、空白或非对象记录均拒绝整个来源，不能
降级到 CSV。只有 JSONL artifact 未出现在 manifest 时，才允许严格读取已 manifest 的
`normalized-posts.csv`；两者都缺失时拒绝续采，不能退化为全量采集。续采任务在
`task.json.resume_source` 记录不可变格式、`sha256` 算法和来源提交摘要。

## 3. Task 数据结构

任务级参数与状态。对应 `SKILL.md` 任务创建步骤与状态机。

| 字段 | 类型 | 必填 | 可空 | 示例 | 说明 |
|---|---|---:|---:|---|---|
| task_id | string | 是 | 否 | bilibili-20260723T010203000000Z-a1b2c3d4 | 每个新任务生成的唯一非空标识 |
| platform | enum | 是 | 否 | bilibili | bilibili / douyin / weibo / xiaohongshu |
| profile_url | string | 是 | 否 | https://space.bilibili.com/123 | 账号主页 URL |
| requested_limit | integer | 是 | 是 | 10000 | 省略范围时，B站/抖音使用完整采集 `max_items`；微博/小红书使用默认限量 30。显式 `--limit N` 为 1–100；授权 OpenAPI `--all` 为 `null` |
| date_from | datetime | 否 | 是 | 2026-06-01T00:00:00+08:00 | 采集起始时间 |
| date_to | datetime | 否 | 是 | 2026-07-23T23:59:59+08:00 | 采集结束时间 |
| analysis_goal | string | 否 | 是 | 分析选题和发布节奏 | `--analysis-goal`；省略为 `null`，提供时须为 NFKC 规范化并去首尾空白后的非空字符串、最多 500 UTF-8 字节且不含控制字符 |
| include_comments | boolean | 是 | 否 | false | 评论采样开关，默认关闭 |
| enrich_details | boolean | 否 | 否 | false | 仅补充缺失公开字段的抖音详情开关 |
| task_status | enum | 是 | 否 | COMPLETED | 生命周期状态（[collection-schema.md](collection-schema.md) §9.1） |
| stop_reason | enum | 否 | 是 | VERIFICATION_REQUIRED | 停止原因（[collection-schema.md](collection-schema.md) §9.2），未中止时为 `null` |
| collected_count | integer | 是 | 否 | 20 | 本次任务已保留的内容条数 |
| collected_at | datetime | 是 | 否 | 2026-07-24T18:07:51+08:00 | 本次采集或证据观察时间 |
| incremental | boolean | 否 | 否 | false | 是否为增量续采 |
| existing_count | integer | 否 | 否 | 0 | 增量前已有条数 |
| new_count | integer | 否 | 否 | 20 | 本次新增条数 |
| resume_source | object | 否 | 是 | `{format, digest_algorithm, digest}` | 只读续采来源的格式和提交/内容 SHA-256；非续采为 `null` |
| diagnostic_code | string | 否 | 是 | SANDBOX_INDEX_FALLBACK | 安全诊断码；不是 `stop_reason` |
| platform_response_code | integer | 否 | 是 | -799 | 平台明确返回且通过边界校验的数值码；未知或非数值为 `null`，不保存响应正文 |
| collection_source | string | 否 | 是 | douyin_search_index | 实际采集/证据来源 |
| source_kind | string | 否 | 是 | douyin_search_index | 索引证据类型；当前与 `collection_source` 同值 |
| source_url | string | 否 | 是 | https://www.douyin.com/user/... | 任务级证据 URL |
| snapshot_crawled_at | datetime | 否 | 是 | 2026-07-24T18:00:00+08:00 | 连接器明确提供的索引快照时间；未知为 `null` |
| snapshot_crawled_at_precision | enum | 否 | 是 | datetime | `datetime` / `date` / `unknown` |
| snapshot_age_label | string | 否 | 是 | 约 6 个月前 | 仅保存来源明确显示的相对年龄，不反推精确日期 |
| evidence_is_exhaustive | boolean | 否 | 是 | false | 索引降级固定为 `false` |
| collection_coverage | object | 否 | 否 | 见 §3.1 / §3.2 | 公开页面或授权 OpenAPI 列表采集的覆盖与完备性账本；普通限量采集可为 `{}` |
| comment_collection | object | 否 | 否 | 见 §3.3 | 评论采样结果计数；未请求时为 `{}` |
| started_at | datetime | 是 | 否 | 2026-07-27T15:28:54+08:00 | 本次进程开始时间；必须带时区 |
| ended_at | datetime | 是 | 否 | 2026-07-27T15:29:09+08:00 | 最终任务产物准备完成前的结束快照；必须带时区且不早于开始时间 |
| duration_ms | integer | 是 | 否 | 15734 | 由 monotonic clock 计算的非负总毫秒数 |
| phase_durations_ms | object | 是 | 否 | `{collect_post_list: 15016}` | 固定阶段名到非负整数毫秒的映射；重复阶段累加 |

约束：
- `requested_limit` 与 `date_from`/`date_to` 同时存在时，取两者共同限定的结果，不得超出任一范围。
- `--all` 与显式 `--limit` 互斥；`--since` 仅可与 `--resume` 联用；公开全量预算参数仅可与
  `--all` 联用。参数错误不得触发适配器网络调用或任务目录写入，也不得静默截断或忽略。
- 普通采集与授权 OpenAPI 限量模式的 `--limit` 都必须在 1–100；授权入口也必须在 transport
  调用和输出预留前拒绝越界值。`video.list` 单页返回条目数超过请求 `count` 时按
  `INVALID_RESPONSE` 失败并保持非穷尽，不得截断后接受末页证明。
- `--resume` 必须先校验并只读加载 `--out` 既有作品，再结合 `--since` / 最新作品时间计算
  有效 `date_from`；有效 `date_from > date_to` 时以参数错误退出。`--resume-out` 只能与
  `--resume` 联用，且不得与来源相同、互为祖先/后代或经现有祖先目录身份发生重叠。以上
  校验发生在适配器加载、网络调用和新输出目录创建之前；
  来源目录在所有成功、失败和控制流异常下都保持只读。
- 执行前向用户回显 `platform`、`requested_limit`、`date_from`/`date_to`、`include_comments`。
- Web 索引降级必须设置 `task_status=PARTIAL`、保留真实上游 `stop_reason`，并填写来源与
  快照字段；未知快照时间保持 `null`，可单独保存来源显示的 `snapshot_age_label`。
- `diagnostic_code` 只能是内部固定的 `[A-Z][A-Z0-9_]{0,63}` 安全枚举；`platform_response_code`
  只能是 `-999999..999999` 内的整数。两者都不能保存适配器异常文本、响应正文或查询。错误日志的 `occurred_at` 必须在捕获该事件时生成，不得复用任务
  初始化时的 `collected_at`。
- `source/index-evidence.json` 不是搜索引擎 HTML 或连接器原始转储。Agent 先核验公开来源，
  导入脚本再只持久化白名单字段；Cookie、请求头、内部引用、签名参数和原始页面正文不得落盘。
- 公开采集阶段名为 `check_access`、`collect_post_list`、`collect_profile`、可选 `collect_post_detail` 与 `persist`；分析阶段名为 `collection_input`、`normalization`、`analysis`、`render`、`validation`。耗时字段提供可观测性，不能单独证明 PRD 的真实 30 条性能门槛。

### 3.1 collection_coverage 覆盖与完备性账本

抖音完整模式优先使用公开页面自身发起的 XHR/Fetch 响应与正常滚动来观察作品列表分页。
浏览器只被动观察已发生的公开页面响应并读取可见 DOM，不发起页内 API 请求或复制签名。只有用户显式提供
`--douyin-cookie-file` 时才在隔离临时浏览器内使用其授权会话，Cookie 本身不写入产物。账本仅保留下列白名单字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `requested_all` | boolean | 本次是否请求公开作品全量观察 |
| `max_items` | integer | 接受后的公开全量作品预算；必须与 `task.requested_limit` 及传输层请求一致 |
| `is_exhaustive` | boolean | 是否观察到经验证的作品列表末页，且全部目标账号列表候选均形成一致观测 |
| `terminal_page_observed` | boolean | 是否在拥有已知作品列表键的对象上明确观察到 `has_more=false` |
| `observed_page_count` | integer | 已验证作品列表载荷数量 |
| `observed_post_count` | integer | 去重后保留作品数量 |
| `cursor_fingerprint_count` | integer | 仅在内存中计算后得到的不同游标指纹数量 |
| `repeated_cursor_count` | integer | 观察到重复游标指纹的次数 |
| `range_filter_applied` | boolean | 是否应用了日期范围过滤 |
| `range_match_count` | integer | 日期范围过滤后保留的作品数量 |
| `range_no_match` | boolean | 已观察到有效作品但日期范围内匹配数为零 |
| `stop_condition` | enum | `terminal_page` / `idle` / `timeout` / `repeated_cursor` / `max_items` / `max_scrolls` / `date_lower_bound` |
| `restriction_source` | enum | 抖音临时浏览器明确看到限制页时固定为 `browser_visible_text`；其他来源不得伪造该值 |
| `restriction_marker` | enum | 与根级停止原因绑定的安全枚举：`LOGIN_WALL_VISIBLE` / `VERIFICATION_CHALLENGE_VISIBLE` / `ACCESS_RESTRICTION_VISIBLE` / `ACCOUNT_UNAVAILABLE_VISIBLE` / `NO_PUBLIC_CONTENT_VISIBLE` |
| `page_context_fallback_used` | boolean | 旧产物兼容字段；当前实现固定为 `false` |
| `page_context_request_count` | integer | 旧产物兼容字段；当前实现固定为 `0` |
| `evidence_access` | enum | `anonymous_public` 或 `user_authorized_session`；只披露证据访问方式，不含身份或凭据 |

只有精确 HTTP 200、可选顶层 `status_code` / `error_code` 为整数 0 的已验证作品列表载荷上的显式 `has_more=false`（平台以整数表达时只接受精确 `0/1` 并先规范为布尔值），并且会话内每个可能属于目标账号的列表
候选都合并成一个经过账号绑定、作品身份和列表结构校验、且候选内分页事实一致的逻辑页，才可以令
`is_exhaustive=true`。末页出现后停止滚动，但继续轮询并处理新候选，直到至少一次
`poll_event=None` 的静默边界或预算到期；最终空轮询后不得再调用可能排入新事件的 CDP
命令，DOM 与页面文本读取产生的事件也必须在此之前排空。这能覆盖较早请求在末页完成后才
发布响应头的乱序。
仍未读取、HTTP/API 状态不成功、收到 `loadingFailed`、绑定为空白/控制字符/重复/非法而有歧义、JSON 解析失败、合法 JSON 无法形成
可信分页观测、任一 frozen owner/非空原始条目无法逐项验证（包括 `aweme_id` / `aweme_id_str` 或带可选尾斜杠的可解析官方直接作品 URL 冲突），或同一 owner 的游标别名、
多个 owner 的 `has_more` / 有效游标互相冲突时，保留
`terminal_page_observed=true`，但 `is_exhaustive` 必须为 `false`。清洗诊断可记录整数
`unresolved_account_post_count` 与 `failed_account_post_count`，不得记录响应内容或查询值。
空闲、超时、重复游标、数量/滚动预算或日期边界停止也都属于非穷尽结果；若已保留作品，
任务状态为 `PARTIAL`。原始游标、请求头、查询字符串、响应正文和请求体不得写入账本或其他任务产物。
可见限制页的原始文字同样不得落盘；`restriction_source` 与 `restriction_marker` 必须成对出现并通过固定映射校验，不能保存页面正文、选择器或命中文案。
当公开列表已验证到末页、存在有效数字作品 ID，但日期范围过滤后为零条时，任务可以
`COMPLETED`；此时 `observed_post_count>0`、`range_filter_applied=true`、
`range_match_count=0`、`range_no_match=true`，不得与账号原始公开作品列表为空混淆。

公开 `--all` 的默认预算固定为 `max_items=10,000`、`max_seconds=1,800`、
`max_scrolls=2,000`；允许显式上调，但硬上限分别为 `50,000`、`14,400` 秒和
`20,000` 轮。零值、负值、非有限秒数、类型不符和超过硬上限都必须拒绝，不得静默钳制。

B站限量与安全全量采集复用 `collection_coverage` 保存列表子阶段账本。限量模式不证明历史
全量；`--all` 的 `max_items` 接受 1–50,000，并分别记录常规分页和动态分页的停止事实：

| 字段 | 类型 | 说明 |
|---|---|---|
| `regular_source` | enum | `medialist` / `arc` / `search`，本次实际使用的常规投稿发现路径 |
| `regular_observed_count` | integer | 常规列表在 limit 前按 BV first-wins 去重后的非负数量 |
| `dynamic_status` | enum | `NOT_ATTEMPTED` / `UNAVAILABLE` / `OBSERVED` 或固定任务停止枚举 `LOGIN_REQUIRED` / `VERIFICATION_REQUIRED` / `RATE_LIMITED` / `ACCESS_RESTRICTED` / `PARSER_FAILED` / `INTERNAL_ERROR` |
| `dynamic_observed_count` | integer | 动态入口已解析并按 BV 去重的非负数量；可在受限前保留部分值 |
| `terminal_page_observed` | boolean | 常规投稿分页是否明确观察到末页 |
| `observed_page_count` | integer | 已观察的常规投稿页数 |
| `observed_post_count` | integer | 常规与动态合并后的去重作品数 |
| `stop_condition` | enum | 常规投稿停止原因：`terminal_page` / `max_items` / `repeated_cursor` / `date_lower_bound` |
| `dynamic_terminal_page_observed` | boolean | 动态分页是否明确观察到末页 |
| `dynamic_stop_condition` | enum | 动态停止原因：`terminal_page` / `max_items` / `idle` / `repeated_cursor` / `date_lower_bound` |

`dynamic_status=OBSERVED` 只表示本次有界动态入口观察没有报错；仍须
`dynamic_terminal_page_observed=true` 才能作为穷尽证据。总体 `is_exhaustive=true` 同时要求
`requested_all=true`、常规 `terminal_page_observed=true`、常规 `stop_condition=terminal_page`
和动态末页证据。
非 `OBSERVED` 状态必须在最终报告披露“可能遗漏仅出现在动态入口的公开视频”。覆盖账本只
允许上述枚举和计数，不能保存 endpoint、offset、查询、响应正文或异常消息。动态发现使用
固定安全诊断码 `BILIBILI_DYNAMIC_DISCOVERY`；诊断码不是新的 `stop_reason`。
兼容分析不含这四个字段的旧封存产物时，报告必须把状态标为“未记录（旧产物 / 未知）”，
并作同样的动态-only 缺口提示；不得把缺少账本解释为 `OBSERVED`。

### 3.2 授权账号 OpenAPI 覆盖账本

独立命令 `collect_douyin_authorized.py` 只采集
`DOUYIN_OPENAPI_ACCESS_TOKEN` 与 `DOUYIN_OPENAPI_OPEN_ID` 共同标识的授权账号：
`POST https://open.douyin.com/oauth/userinfo/` 以
`application/x-www-form-urlencoded` 请求体提交 `access_token` 与 `open_id`，响应顶层
`err_no` 必须是整数 `0`，且 `data.open_id` 必须与输入逐字一致；确认后再
`GET https://open.douyin.com/video/list/` 仅以集中构造的 `cursor` / `count` 查询分页。
该编码遵循官方当前 curl 请求示例；同页 Content-Type 参数表写为 JSON，存在文档内部不一致。
实现不使用同一 access token 自动重试另一种编码，真实兼容性必须由在线授权验收确认。
它不是任意公开账号主页采集的降级路径，也不支持按第三方账号查找。
授权入口不接受已构造的 client 实例，必须始终由这两项环境凭据构造 client；测试缝只允许
注入不携带账号身份的 transport。编排层在作品分页前还要确认 client 已在内存中完成
`open_id` 精确回证，并核对公开 `account_id` 与规范主页路径中的 `sec_uid` 一致。
`open_id` 与 `union_id` 不进入产物。

授权账本复用 `requested_all`、`is_exhaustive`、`terminal_page_observed`、
`observed_page_count`、`observed_post_count`、`repeated_cursor_count` 和
`stop_condition`，并可记录 `zero_new_page_count`。`stop_condition` 还可为
`repeated_zero_new_page`、`limit` 或 `api_error`。仅官方列表响应明确返回
`has_more=false` 时允许 `is_exhaustive=true`；请求数量上限、游标不前进、连续两页没有
新增作品或 API 错误均非穷尽停止。`--all` 只有在上述官方末页证据存在时才能
`COMPLETED`；中途失败必须保留此前已经验证并映射的作品。

访问令牌只允许从 `DOUYIN_OPENAPI_ACCESS_TOKEN` 读取：userinfo 请求放在固定官方端点的
form-urlencoded 请求体，video.list 请求放在 `access-token` 请求头；禁止出现在 URL、
产物、标准输出/错误、异常或诊断信息中。`DOUYIN_OPENAPI_OPEN_ID` 仅用于绑定账号，并由
userinfo 响应精确回证。账本不得保存请求头、原始游标、查询字符串、响应正文或请求体。
当前仍无真实 token/open_id 在线授权验收，端到端验证保持 **pending**；在完成该验证前，
不增加 OAuth 登录、授权码交换、刷新令牌或未文档化内部接口。

采集持久化边界会丢弃覆盖账本未知键；分析流水线仍把已密封任务视为非信任输入，只允许上述
boolean、非负 exact integer 与停止枚举进入派生 `analysis.meta.collection_coverage`。因为分析
工作区还会逐字节封存原采集任务，外部提交若仍含原始游标、请求头、嵌套载荷或其他未知键，
以及任一已知键类型非法，必须在分析工作区预留前失败。任何 `is_exhaustive=true` 都必须
与可信末页、任务 `COMPLETED`、根级 `stop_reason=null`、请求范围及归一化作品计数一致；授权
任务还要求 `observed_post_count == task.collected_count == normalized rows`。普通授权限量请求若在
达到本地数量停止前已真实观察到官方末页，仍可据末页证明接口返回集合已遍历；若仅因 `limit`
停止则始终非穷尽。公开 `--all` 在登录、验证、频控等任务级保护前可能没有页面级停止条件，
这种稀疏账本只可传播 `is_exhaustive=false`，不得因缺失 `stop_condition` 被改写成末页证明。

### 3.3 comment_collection 评论采样账本

启用 `--comments` 时，通用公开采集命令写入下列聚合计数。每条作品最多请求和保留 20 条
评论；完整采集模式对所有已保留作品尝试评论采样，不存在默认 30 条的隐式限制。只有用户显式
传入 `--limit N` 时，评论父作品范围才随该最新 N 条样本收窄。

| 字段 | 类型 | 说明 |
|---|---|---|
| `attempted_posts` | integer | 实际调用评论适配器的作品数 |
| `comments_collected` | integer | `source/comments.jsonl` 实际持久化评论条数 |
| `empty_results` | integer | 适配器明确返回空列表的作品数；不得描述为已采到评论 |
| `failures` | integer | 适配器报告不可用或抛错的作品数 |
| `per_post_limit` | integer | 固定为 20 |
| `stop_reason` | enum | 可选；评论请求自身遇到 `LOGIN_REQUIRED` / `VERIFICATION_REQUIRED` / `RATE_LIMITED` / `ACCESS_RESTRICTED` 时记录，未中止时省略 |

空结果与失败必须分开计数。评论失败只写清洗后的 `COMMENTS_UNAVAILABLE` 内容级错误，不能
改变账号任务状态或写入任务级 `stop_reason`。只有适配器确认上游请求成功且明确返回空评论
数组时才能增加 `empty_results`；受限、网络错误、非 JSON、字段缺失或非空畸形响应都增加
`failures`。持久化失败时 `comments_collected` 必须按最终文件中通过当前父锚点与字段校验的
有效唯一行数记录；既有文件为畸形内容、符号链接或其他非普通文件时按 0 记录，且不得跟随、
删除或改写其目标。

列表、资料或详情阶段一旦已有上述四类任务级平台保护原因，`--comments` 不得再调用任何评论
端点，但仍须安全写入显式空 `source/comments.jsonl`。此时账本固定为
`attempted_posts=0`、`comments_collected=0`、`empty_results=0`、`failures=0`、
`per_post_limit=20`，且不在评论账本伪造第二个 `stop_reason`；任务级原因保留在 `task.json`。
