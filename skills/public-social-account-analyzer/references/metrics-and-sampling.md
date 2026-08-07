# 指标与样本规则

只在判断有效样本、时间窗口、发布节奏、指标口径或分母时读取。字段形状与枚举按 [data-schema.md](data-schema.md) 路由到对应合同。

## 1. 分析前置条件

分析层仅在满足以下条件时处理数据：

- **有效记录判定**：仅使用 `collection_status` 为 `SUCCESS` 或 `PARTIAL` 的记录参与默认统计与比较。
  - `FAILED` / `DELETED` / `RESTRICTED` 记录一律不参与默认指标、节奏、高低表现计算。
  - 被排除记录仍须在样本边界中明确计数（见 §2）。
- **默认排除标记内容**：默认排除 `is_pinned = true`、`is_repost = true`、`is_promoted = true` 的内容。
  - 这三个公开标记采用三态语义：只有明确证据才写 `true` / `false`，未知时写 `null`（见 data-schema §5 约束）。
  - 被排除内容不得混入默认发布节奏、公开表现、高低表现比较。
- **相关模块可单独包含**：如用户需要，可在**单列模块**（如"置顶/投放内容观察"）中包含上述被排除内容，但必须满足：
  - 明确标注其为置顶 / 转载 / 投放样本；
  - 与默认统计严格区分，不得合并进同一汇总数字。
- **样本不足处理**：当有效样本数量不足以支撑正式模块（如 §6 高低表现要求）时，跳过该正式模块；仍可输出清楚标为样本内、探索性、待验证的描述，不得补造或外推为账号规律。
- **原始只读**：`analysis_*` 与 `platform_metrics` 分层保存，模型输出不得覆盖原始采集字段（见 data-schema §1）。

---

## 2. 样本边界（报告必填）

每份分析报告必须在显著位置披露**样本边界**，字段如下：

| 披露项 | 定义 | 数据来源 |
|---|---|---|
| 请求数量（requested） | 任务请求采集的数量上限 `requested_limit`，或 `date_from`~`date_to` 范围内请求的条数 | Task 结构 |
| 实际采集数量（collected） | 成功抓取到的内容条数（含 `SUCCESS`/`PARTIAL`/`FAILED`/`DELETED`/`RESTRICTED` 等所有尝试） | 采集层 |
| 采集状态计数（status_counts） | 对全部实际采集记录按五个 `collection_status` 计数；键固定且无样本时补 `0` | 采集层 |
| 有效数量（valid） | `collection_status ∈ {SUCCESS, PARTIAL}` 且未被 §1 默认排除标记命中的条数 | §1 规则 |
| 时间范围（time_range） | 有效内容 `published_at` 的最小~最大值，及任务 `date_from`~`date_to` | Post / Task |
| 缺失内容数量（missing） | `collection_status ∈ {FAILED, DELETED}` 的条数 | 采集层 |
| 受限内容数量（restricted） | `collection_status = RESTRICTED` 的条数 | 采集层 |
| 被排除的标记内容数量（excluded_flagged） | 因 §1 默认排除而被剔除的条数，即 `is_pinned = true` 或 `is_repost = true` 或 `is_promoted = true` 的内容条数（与有效数量互斥，不得计入默认统计） | §1 规则 |
| 指标字段覆盖率（field_coverage） | 各指标字段（views / likes / comments / favorites / shares / coins / danmaku 等）在有效样本中非 `null` 的比例 | Profile/Post `field_visibility` 与空值规则 |

计算与呈现要求：

- **指标字段覆盖率** = 该字段在有效样本中取值非 `null` 的条数 ÷ 有效样本总数；
- Markdown 与 HTML 报告的样本质量/边界章节必须按固定顺序显示
  `SUCCESS`、`PARTIAL`、`FAILED`、`DELETED`、`RESTRICTED` 五类计数；
  `status_counts` 缺失的键显示为 `0`，不得省略。
- 当 `field_visibility` 标注某字段为 `hidden` / `partial` 时，该字段覆盖率应相应下调并在报告中说明受限来源；
- 任何指标若覆盖率过低（建议 < 50%）应在对应模块顶部标注"分母不足，结论仅供参考"；
- 禁止将样本边界数字与默认统计数字混写，须各自独立成表。

---

## 3. 发布节奏

基于有效内容（§1 有效数量）的 `published_at` 计算。所有时间使用发布地时区（无时区信息时按平台默认 `+08:00`）。

计算项：

| 指标 | 定义 / 公式 |
|---|---|
| 总发布数量 | 有效内容条数（计数） |
| 活跃发布日数（`coverage_days`） | 有效内容 `published_at` 去重后的自然日数量；不是最早到最晚发布日期之间的自然日跨度 |
| 周均发布量 | 至少一条日期可见时：`有发布日期的有效内容数 / 覆盖周数`；所有日期未知时为 `null`，不得用总样本数伪造周均 |
| 覆盖周数 | 有日期时，从最早到最晚有效发布日期的跨度（天数）除以 7 向上取整且不小于 1；所有日期未知时为 `0` |
| 发布间隔中位数 | 按 `published_at` 升序排序后，相邻两条内容时间差（小时或天）的中位数（median） |
| 最长断更时间 | 相邻发布间隔的最大值（max） |
| 星期分布 | 按 `published_at` 的星期（周一~周日）分组计数 |
| 小时分布 | 仅对 `published_at_precision=datetime` 的内容按小时（0~23）分组；日期级证据不得计入 00:00 |
| 工作日 / 周末分布 | 工作日（周一~周五）与周末（周六、周日）分别计数与占比 |

> 注意：发布间隔、最长断更时间应使用统一时间单位（建议小时或天，并在报告中标注单位）。
> 样本中只要存在 `published_at_precision=date`，精确小时级间隔与最长断更均置 `null`；
> 日期仍可用于日期、星期和月份级统计。
>
> 只有 `evidence_is_exhaustive=true` 才能把日期分布称为账号级发布节奏并生成排播建议。
> 显式最近 N 条、未到末页的完整采集尝试和非穷尽日期窗口，均只能用“样本”前缀展示当前
> 窗口的描述性数值，不得外推为账号整体频率、断更或排播规律。
>
> Web 索引降级（`douyin_jingxuan` / `douyin_search_index`）约束更严格：只能展示可见子集的
> 日期、星期、月份等样本分布；周均发布量、发布间隔、最长断更、季节性强度、假期占比及
> 所有排播建议必须置空或省略。

### 季节性 / 学期检测

在发布节奏基础上，额外输出按自然月聚合的分布与两项强度指标，用于识别"寒暑假 / 学期"型更新模式（不推断因果）：

| 指标 | 定义 / 公式 |
|---|---|
| 月度分布 `monthly_distribution` | 按 `published_at` 的年份-月份（`YYYY-MM`）分组计数，输出全量键值对 |
| 季节性强度 `seasonal_intensity` | 月发布量的变异系数 = `std(月发布量) / mean(月发布量)`（无偏标准差）；仅 1 个月样本时为 `null`；`≥1.0` 强波动、`≥0.5` 中等、`<0.5` 弱 |
| 假期月份占比 `break_month_share` | 寒暑假月份（1/2/7/8 月）发布量 ÷ 总发布量；用于提示"假期驱动"内容节奏 |

> 说明：`seasonal_intensity` 与 `break_month_share` 仅作描述性统计；样本月份过少（如 <3 个月）时结论置信度有限，报告需标注。

---

## 4. 公开表现指标

对每一项**可见**的指标字段（见 data-schema §6），分别计算以下统计量：

- `count`：非 `null` 样本数
- `median`：中位数
- `p25`：第 25 百分位数
- `p75`：第 75 百分位数
- `minimum`：最小值
- `maximum`：最大值
- `missing_rate`：缺失率 = `null` 条数 ÷ 有效样本总数

指标字段清单（按平台可见性，未展示即 `null`）：

- `views`（播放 / 浏览）
- `likes`（点赞）
- `comments`（评论）
- `favorites`（收藏；微博为 `null`）
- `shares`（分享 / 转发）
- `coins`（投币；B站）
- `danmaku`（弹幕；B站）

### 相对中位数表现

对每条内容、每个指标计算相对中位数表现：

```
relative_performance = post_metric / metric_median
```

约束：

- 当 `metric_median` 为 `0` 或 `null` 时，**不计算该字段**（该条该指标 `relative_performance` 置为 `null`），不得用 0 做分母；
- `relative_performance` 仅表示"相对自身账号中位水平的偏离倍数"，不构成因果或优劣结论。

### 互动率（分母透明，禁止混用）

PRD 明确要求互动率必须分别命名、分母透明，**禁止统一称为一个模糊的"互动率"**，禁止不同分母混用。本规范规定两个独立指标：

- **基于播放的互动率**：
  ```
  view_based_engagement_rate = (likes + comments + favorites + shares) / views
  ```
  - 仅在 `views` 非 `null` 且非 `0` 时计算；`views` 为 `null`/`0` 时该指标置 `null`。

- **基于粉丝的互动比**：
  ```
  follower_based_engagement_ratio = (likes + comments + favorites + shares) / followers
  ```
  - `followers` 来自 Profile 层；为 `null` 或 `0` 时该指标置 `null`。

附加约束：

- 两指标必须**分开呈现、分开命名**，任何报告不得用"互动率"笼统指代其一；
- 分子固定为 `likes + comments + favorites + shares`。至少一个分量可见时，平台未提供的分量
  （如微博 `favorites`）可按 `0` 计入并在说明中标注；四个分量全为 `null` 时，分子和比率
  都必须为 `null`，不能伪装为真实零互动；
- `coins`、`danmaku` 不计入上述互动率分子（B站特有，可单列分析，但不得并入统一互动率）；
- 对这两个比率同样计算 §4 开头规定的 `count / median / p25 / p75 / minimum / maximum / missing_rate`。
- `douyin_search_index` 仅有索引可见点赞时，禁止计算上述衍生互动率或 `engagement_sum`；
  高低表现只能明确按 `likes` 比较。

### 可视化空值约束

高低表现雷达图只能在高、低两组至少有 3 个共同非 `null` 指标时生成。任何缺失指标都不得
以 `0` 补画；共同可见维度不足时省略雷达图。

### 互动率扩展（深度认可率 / 社群讨论率）

为刻画"B站式"深度互动，在二分法基础上扩展两项独立指标，**分母同样透明、独立命名、禁止混用**（混合口径）：

- **深度认可率** `deep_approval_rate`：
  ```
  deep_approval_rate = (coins + favorites) / views
  ```
  - 仅在 `views` 非 `null` 且非 `0` 时计算；分母固定为 `views`（投币 / 收藏相对播放的深度认可强度）。
  - `coins` 与 `favorites` 全为 `null` 时比率为 `null`；至少一项已知时，其余 `null` 按 `0` 计入分子。

- **社群讨论率** `community_discussion_rate`：
  ```
  community_discussion_rate = (comments + danmaku) / views
  ```
  - 仅在 `views` 非 `null` 且非 `0` 时计算；分母固定为 `views`（评论 + 弹幕相对播放的讨论密度）。
  - `comments` 与 `danmaku` 全为 `null` 时比率为 `null`；至少一项已知时，其余 `null` 按 `0` 计入分子。

两项均独立计算 `count / median / p25 / p75 / minimum / maximum / missing_rate`，并在报告中与二分法互动率并列、分列呈现（分母透明说明见 `analysis.json` 的 `engagement.denominator_note`）。

### IQR 散布比（指标离散度）

对每项可见指标，除 §4 开头统计量外，额外输出分位离散度：

- `iqr`：`p75 - p25`（四分位距）；
- `dispersion_ratio`：散布比 = `iqr / median`；当 `median` 为 `0` 或 `null` 时该值置 `null`（不得以 0 为分母）。

> 用途：`dispersion_ratio` 用于区分"稳定输出型"与"爆款波动型"账号，仅作描述性对比，不构成因果。

---

