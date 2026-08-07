# 分析输出合同

只在生成或校验 taxonomy、business、comment、确定性聚合及高低表现结构时读取。指标和证据选择规则见 [analysis-rules.md](analysis-rules.md)。

## 7. Analysis 数据结构

模型输出，分层保存，不覆盖原始字段。

| 字段 | 类型 | 必填 | 可空 | 说明 |
|---|---|---:|---:|---|
| topic | string | 否 | 是 | 主题标签（2–10 字符且至少一个汉字，未知为 `unknown`） |
| format | enum | 否 | 是 | 内容形式（§9.5） |
| funnel_stage | enum | 否 | 是 | 内容目的 / 漏斗阶段（§9.6） |
| hook_type | enum | 否 | 是 | 开头钩子类型（§9.7） |
| series_name | string | 否 | 是 | 所属栏目 / 合集名 |
| is_original | boolean | 否 | 是 | 是否原创 |
| has_product_placement | boolean | 否 | 是 | 是否有产品露出 |
| analysis_labels | array[string] | 否 | 是 | 额外模型标签 |
| classification_confidence | float | 否 | 是 | 分类置信度（0–1） |
| classification_version | string | 否 | 是 | 分类器 / 模型版本 |

约束：
- 分类结果可重新分类；每次重新分类须更新 `classification_version`。
- 确定性数字（排名、中位数、分位数）由脚本计算，不写入本结构。
- `analysis.json` 根对象与 `meta` 必须保存完全相同的分类生命周期字段：
  `classification_status` 只取 `pending-model` / `partial-model` / `completed`；
  `classification_version` 在无已分类作品时为 `null`，只要存在已分类作品则为 `llm-1`；
  `classification_coverage` 包含 `total_count`、`classified_count`、`pending_count` 和
  四位小数的 `rate`，总数为 0 时 `rate=null`。
- 待分类作品的 `topic`、`format`、`funnel_stage`、`hook_type`、`series_name`、
  `is_original`、`has_product_placement`、`classification_confidence` 和
  `classification_version` 均为 `null`，`analysis_labels=[]`；不得用 `unknown` 表示尚未运行模型。
  模型实际输出的 `unknown` 或其他合法枚举值仍按 `llm-1` 计入已分类覆盖。
- 纯函数或兼容读取可表达部分覆盖；但 `--classification-results` 与历史
  `--llm-tax-results` 文件输入均为全量原子合同，缺失、重复、额外父作品、未知字段、
  错误类型或非法枚举必须在任何输出写入前失败，不得回退为待分类。
- B站分类中的 `series_name` 只能逐字沿用父作品
  `platform_metrics.series_name` 的公开正证据；父字段为 `null` 时分类结果也必须为
  `null`，不得从标题、标签或相似内容猜测栏目 / 合集。

`analysis.json.publish_cadence` 在常规节奏字段之外固定包含：

- `scope`：`exhaustive` / `explicit_date_window_exhaustive` /
  `latest_n_sample` / `explicit_date_window_sample` /
  `bounded_complete_attempt_sample` / `index_sample`；
- `cadence_inference_allowed`：只有分析元数据的 `evidence_is_exhaustive=true` 时为 `true`；
- `scope_note`：解释当前是完整公开列表、完整日期窗口，还是不可外推的可见样本窗口。

非穷尽结果可以保留样本日期、星期、月份和窗口内的描述性数值，但报告标签必须使用
“可见样本数量”“样本窗口折算周均”“样本发布间隔”等措辞，且不得生成账号级排播建议。
索引样本继续按 [metrics-and-sampling.md](metrics-and-sampling.md) §3 置空无法可靠计算的周均、间隔与季节性强度。

### 7.1 高低表现确定性输出

`performance_meta` 始终包含 `status`、`main_metric`、`measured_count` 和
`main_metric_median`。实测样本少于 15 时，`high_performance` 与
`low_performance` 均为 `INSUFFICIENT_SAMPLE`；否则两者是互不重叠的条目数组，
分组规则见 [model-insights.md](model-insights.md) §6.2。

每个高/低表现条目**严格仅**包含下列字段（不包含 `text`）：

```text
platform, post_id, title, post_url, evidence_url, source_url,
published_at, published_at_precision, collection_status,
collection_status_source, collected_at, collection_source,
platform_post_id_known, local_record_key, item_url_known, source_rank,
metrics, value, rank, reason, relative_to_main_median, duration_seconds,
hashtags, content_type, is_pinned, is_repost, is_promoted,
platform_metrics, field_visibility, main_metric, url_kind
```

`rank` 是实测样本的全局排名。`relative_to_main_median = value /
main_metric_median`，保留 4 位小数；中位数为 `0` 或 `null` 时该值为
`null`。`published_at` 输出 ISO 8601 字符串。`hashtags`、
`platform_metrics` 和 `field_visibility` 须按值复制，不得丢失来源证据或
平台扩展字段。

`url_kind` 固定为 `item` / `profile_index` / `missing`：

- `item` 必须满足 `item_url_known=true`，且 `post_url` 通过对应平台的作品 URL
  规范化并与 `post_id` 一致；此时 `post_url` 与 `evidence_url` 都写规范化作品 URL。
  `douyin_jingxuan` 仅额外接受平台为 `douyin`、路径严格为
  `https://jingxuan.douyin.com/m/video/<post_id>` 的官方作品 URL。
- 普通记录的主页 URL、站外 URL、不安全 URL 或仅存在于 `source_url` 的候选不得提升为
  作品证据；此时 `post_url` / `evidence_url` 为 `null`，`url_kind=missing`。
- `profile_index` 仅允许 `platform=douyin` 的抖音搜索索引记录使用，且须同时满足
  `collection_source=douyin_search_index`、`item_url_known=false`、
  `platform_post_id_known=false`、`local_record_key=true`。其规范化账号主页只写入
  `evidence_url`，`post_url` 保持 `null`；该锚点不是作品链接，也不计入完整作品证据。

高低组被选条目的作品证据覆盖率同时写入根级 `evidence_coverage` 与
`performance_meta.evidence_coverage`：

```text
selected_count, complete_count, missing_count, missing_post_ids, rate, status
```

一条完整证据必须同时具有 `url_kind=item`、规范化且 ID 一致的作品 URL、带时区的
`collected_at`、主指标 `value` 与 `metrics`。`rate = complete_count /
selected_count`，保留 4 位小数；`status` 为 `COMPLETE` 或
`PARTIAL_EVIDENCE`。高低组未生成时计数均为 `0`、`rate=null`、
`status=COMPLETE`，表示本模块没有待核验的被选条目。
流水线只有在证据状态明确为 `COMPLETE` 时才允许分析阶段完成；缺失、未知或其他非法
状态均按 `PARTIAL` 关闭失败，不能由完成分类绕过。

根级 `core_insights` 只输出高/低组事实。每项固定包含 `id`、`kind`、
`statement`、`main_metric`、`evidence`；每条 evidence 固定包含
`post_id`、`url`、`url_kind`、`collected_at`、`metrics`、`rank`、`value`。
`analysis.json` 必须完整保存上述高/低条目与 `core_insights`，供机器校验和审计使用。人类可读
Markdown/HTML 不复制完整审计数组：高表现只展示排序最前 5 条，低表现展示差异最明显的末 5 条；
`core_insights.evidence` 不在正文重复渲染。正文说明完整组大小并指向 `analysis.json`，不得修改或
裁剪结构化载荷。正文证据顺序必须沿用确定性组选取顺序，不得引用组外记录或补充因果解释。
来源章节只列正文实际引用的规范作品链接与账号主页；全量 URL 留在 `normalized-posts.csv` 和
`analysis.json`。单条模型业务主张最多内联 3 条去重代表证据，其余保存在
`source/business-insight-results.json`。
该模板形状不是 Agent 聊天表达的限制；聊天可按用户需要提供摘要、FAQ 或补充说明，并明确其不是受此 schema 校验的正式 artifact。

### 7.2 评论证据确定性输出

`analysis.json` 根对象始终包含 `comment_analysis`。该对象不执行评论语义分类，只描述经过
严格核验的公开评论证据：

```json
{
  "schema_version": 1,
  "status": "not_requested | empty | unavailable | collected_pending_model | collected_analyzed",
  "requested": false,
  "sampled_comment_count": 0,
  "eligible_parent_posts": 0,
  "covered_parent_posts": 0,
  "parent_coverage_rate": null,
  "collection_ledger": {
    "attempted_posts": 0,
    "comments_collected": 0,
    "empty_results": 0,
    "failures": 0,
    "per_post_limit": 20,
    "stop_reason": null
  },
  "field_coverage": {
    "author": {"present": 0, "total": 0, "rate": null},
    "text": {"present": 0, "total": 0, "rate": null},
    "likes": {"present": 0, "total": 0, "rate": null},
    "published_at": {"present": 0, "total": 0, "rate": null},
    "collected_at": {"present": 0, "total": 0, "rate": null}
  },
  "representative_selection": {
    "max_parent_posts": 3,
    "max_per_parent": 1,
    "order": "visible_likes_desc_then_source_line"
  },
  "representative_comments": [],
  "semantic": {
    "status": "not-applicable",
    "model_version": null,
    "insights": null
  },
  "limitations": []
}
```

状态判定固定如下：

- `include_comments=false` 且不存在评论文件/账本时为 `not_requested`；此时若
  `source/comments.jsonl` 存在或账本非空，分析在创建任何输出前失败。
- 至少一条有效评论时为 `collected_pending_model`，即使同时存在评论级失败。
- 已请求、至少一条有效评论且严格评论洞察结果 `semantic.status == "completed"` 时，状态升级为
  `collected_analyzed`。
- 已请求、评论文件明确为空、所有可分析父作品都已尝试且明确空结果、`failures=0`、
  `stop_reason=null` 时才为 `empty`。
- 其他零评论证据均为 `unavailable`，包括文件缺失、保护中止、失败或覆盖不完整；不得把
  “不可用”写成“明确没有评论”。

可分析父作品仅来自归一化后的 `SUCCESS` / `PARTIAL` 内容，并且
`is_pinned`、`is_repost`、`is_promoted` 均未明确为真；还必须具有与平台、`post_id`
精确绑定的规范作品 URL。父作品按 `post_id` 去重，重复 ID 指向不同规范 URL 时视为模糊并
排除。`FAILED` / `DELETED` / `RESTRICTED`、三类明确标记、主页或非作品锚点均不得进入评论
采集或分析；公共采集器在调用平台评论适配器前采用同一资格规则。
评论文件按 UTF-8 严格 JSONL 解析：只有物理 LF（U+000A）分隔记录，CRLF 可接受；合法 JSON
字符串内的 U+2028 / U+2029 必须原样保留，不能充当记录分隔符，仅以 U+2028 / U+2029
隔开的两个对象必须拒绝。禁止空行、`NaN` / `Infinity`、重复 JSON 键、非对象、未知/缺失
字段；每行字段清单必须与 [collection-schema.md](collection-schema.md) §6.1 的八个字段完全一致。ID、可空文本、非负整数 `likes`、带
时区时间、父 ID/URL 都须通过类型和一致性校验；同父重复 `comment_id` 或每父超过 20 行均
整体失败。

账本计数字段必须为非负整数（boolean 不算 integer），`per_post_limit=20`，且
`comments_collected` 等于文件有效行数。`attempted_posts` 不得超过可分析父作品数，评论覆盖
父数不得超过尝试数，覆盖父数与明确空结果数之和不得超过尝试数。没有评论保护中止时，
未覆盖全部父作品的账本形成 `unavailable`，不能据此声称空结果；保护中止必须对应至少一个
失败尝试。缺失的旧版账本可兼容读取，但只能形成 `unavailable`，不能据此声称空结果。`failures` 可与“已有有效评论但
同一响应还含畸形记录”的父作品重叠，因此不强制与覆盖数、空结果数构成互斥分区。

代表评论只考虑非空 `text`。每个父作品先按
`(likes is null, -likes when known, source_line)` 选择一条，再按相同顺序从不同父作品中最多
保留三条；真实 `likes=0` 是已知值，排在 `null` 前，同值按 1 基源行号破平。每条代表评论
复制八个已核验字段，并增加固定 `source_artifact=source/comments.jsonl` 与 `source_line`。
评论字段覆盖率按全部有效评论行计算，零评论时各字段 `rate=null`。

`semantic` 在存在可用评论但未请求模型时为 `not-requested`；评论未请求、为空或不可用时为 `not-applicable`；已请求且有可用评论但尚无结果时才为 `pending-model`。传入
`--with-comment-insights` 后，流水线生成 `comment-insights-prompt.md`；严格结果必须绑定
`source/comments.jsonl` SHA-256 与规范语义输入 SHA-256，原字节封存为
`source/comment-insight-results.json`。五类数组固定为 `frequent_questions`、
`controversies`、`needs`、`concerns`、`follow_up_topics`。每条证据必须精确引用已核验的
`parent_post_id`、`comment_id`、1 基 `source_line` 与原文子串 `excerpt`；脚本补齐规范
`parent_post_url` 和 `source_artifact=source/comments.jsonl`。高频问题至少绑定两条不同评论。
模型不得注入 URL、额外字段或不存在的摘录。已请求且存在可用评论但无结果时保持 `pending-model`；完整结果为
`completed` 并参与全局完成门。Markdown 与 HTML 同步展示五类洞察及逐评论证据。

### 7.3 FR-011 / FR-012 确定性结构化聚合

`analysis.json` 根对象始终增加两个 schema v1 合同：

```json
{
  "classification_breakdown": {
    "schema_version": 1,
    "status": "pending-model | completed",
    "classification_version": null,
    "main_metric": "views",
    "total_post_count": 0,
    "measured_post_count": 0,
    "missing_metric_count": 0,
    "topic_format_matrix": {
      "topics": [],
      "formats": [],
      "rows": []
    },
    "dimension_performance": {"topic": [], "format": []},
    "limitations": []
  },
  "high_low_feature_comparison": {
    "schema_version": 1,
    "status": "pending-model | insufficient-sample | completed",
    "main_metric": "views",
    "measured_count": 0,
    "groups": {
      "high": {"count": 0, "post_ids": []},
      "low": {"count": 0, "post_ids": []}
    },
    "duration_buckets": [
      "lt_15s", "15_29s", "30_59s", "60_179s", "gte_180s"
    ],
    "features": [],
    "limitations": []
  }
}
```

分类未完成时，`classification_breakdown` 保留总作品数与主指标实测/缺失数，但矩阵与
两个维度表现数组必须为空。完成状态的矩阵行固定为
`{topic, post_count, counts}`；`counts` 与 `formats` 按索引对应。topic / format 的表现桶
固定为：

```text
value, post_count, measured_count, missing_count,
measurement_rate, main_metric_median
```

`measured_count` 只计主指标不为 `null` 的作品；真实 `0` 计入，中位数可以为 `0.0`；无实测
值的中位数为 `null`。

`high_low_feature_comparison.features` 按固定字段顺序输出。每项固定包含：

```text
field, value_mode, high_known_count, high_missing_count,
low_known_count, low_missing_count, common_values,
high_only_values, low_only_values, values
```

`values` 每行固定为
`{value, high_count, high_rate, low_count, low_rate, rate_delta}`。hashtags 的
`value_mode=multi`，其他字段为 `single`；空 hashtags 不构造“无标签”值。布尔值保持 JSON
boolean。样本不足时 groups/features 为空且状态为 `insufficient-sample`，但不增加全局
`partial_reasons`。完整分类且已有高低组时，任何组 ID、计数、字段顺序或状态不一致都必须
在输出目录预留前失败。既有高低条目与 `core_insights` schema 不变。

两个根合同的 `main_metric` 必须与 `performance_meta.main_metric` 完全相同；
`high_low_feature_comparison.measured_count` 与
`classification_breakdown.measured_post_count` 必须等于 `performance_meta.measured_count`。
矩阵 topic 行顺序、format 列顺序必须分别与 `dimension_performance.topic/format` 的值顺序
一致；行合计与对应 topic `post_count`、列合计与对应 format `post_count` 必须逐项相等。
校验在分析输出目录预留前执行。

## 9. 模型枚举

### 9.5 format（内容形式，模型分类，有限枚举）

`talking_head` / `tutorial` / `commentary` / `interview` / `vlog` / `news` / `review` / `compilation` / `animation` / `gameplay` / `image_text` / `live_clip` / `other`

### 9.6 funnel_stage（内容目的 / 漏斗阶段，模型分类）

`awareness` / `education` / `engagement` / `conversion` / `retention` / `unknown`

### 9.7 hook_type（开头钩子类型，模型分类）

`question` / `contradiction` / `result_first` / `pain_point` / `controversy` / `list` / `curiosity` / `authority` / `story` / `none` / `unknown`
