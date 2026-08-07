# 采集字段合同

只在核对 Profile、Post、Metrics、Comment、空值或采集状态时读取。平台特有来源与能力边界以相应平台参考为准。

## 4. Profile 数据结构

账号层公开信息。只保存页面公开字段及采集快照，不可见字段为 `null`。

| 字段 | 类型 | 必填 | 可空 | 平台来源 | 说明 |
|---|---|---:|---:|---|---|
| platform | string | 是 | 否 | — | 平台标识 |
| account_id | string | 是 | 否 | UID / sec_uid / 用户 ID | 已核验的平台账号标识；展示号另存平台字段 |
| account_name | string | 是 | 否 | 名称 | 页面显示名称 |
| profile_url | string | 是 | 否 | — | 主页 URL（证据锚点） |
| bio | string | 否 | 是 | 简介 | 账号简介 |
| verified | boolean \| string | 否 | 是 | 认证 | `true`/`false` 或认证文案 |
| followers | integer | 否 | 是 | 粉丝 | 粉丝数量 |
| post_count | integer | 否 | 是 | 视频数 / 作品数 / 微博数 | 作品数量 |
| level | integer | 否 | 是 | 等级 | 账号等级（B站等），不可见为 `null` |
| platform_metrics | object | 是 | 否 | 见下 | 平台特有账号字段 |
| collected_at | datetime | 是 | 否 | — | 采集时间（ISO 8601） |
| field_visibility | object | 是 | 否 | — | 字段可见性（§8） |

`platform_metrics` 账号层常见键：
- 抖音：`total_likes`（获赞总量）、`douyin_id`（页面显示抖音号）、`latest_post_at`、
  `profile_conflicts`；
  索引降级还可保存 `collection_source`、`source_url`、`snapshot_crawled_at`
- 微博：`following`（关注数）
- 小红书：`following`（关注数）、`red_id`（公开展示的小红书号）、
  `likes_and_favorites`（页面合并展示的获赞与收藏累计值）、`identity_binding`
- B站：一般为空对象 `{}`

`profile_conflicts` 只在多个已验证公开资料来源对 `followers`、`post_count` 或
`total_likes` 给出不同非负整数时出现。键仅限这三项；每项固定为
`{"selected": <首个已验证值>, "observed_values": [<去重且有界的观测值>]}`。
对应顶层字段或平台指标保留 `selected`，相应 `field_visibility` 必须为 `partial`。不得将冲突
静默覆盖，也不得把原始响应、来源 URL、查询、页面正文或异常文本放入该对象。

授权 OpenAPI 例外：接口先在内存中确认同次 access token + `open_id`，再把公开 `sec_uid` 写入
`account_id` 并构造规范公众主页。`open_id`、`union_id` 与头像签名查询不得进入产物；
`platform_metrics.authorization_source=douyin_openapi_token_owner`。

全局账号字段映射：

| 统一字段 | B站 | 抖音 | 微博 | 小红书 |
|---|---|---|---|
| account_id | UID | Web 资料优先 `unique_id`/`short_id`，缺失时 `sec_uid`；OpenAPI/索引使用 `sec_uid` | UID | 用户 ID |
| followers | 粉丝 | 粉丝 | 粉丝 | 粉丝 |
| post_count | 视频数 | 作品数 | 微博数 | 笔记数（仅页面明确展示时） |

报告账号卡在通用字段之外固定显示：B站 `level`；抖音
`platform_metrics.douyin_id`（缺失时回退 `platform_metrics.unique_id`）与
`platform_metrics.total_likes`；微博和小红书 `platform_metrics.following`。`verified=true/false/null`
分别显示“是/否/—”，认证文本原样显示但必须按报告格式转义；其他 `null`
字段统一显示“—”。

## 5. Post 数据结构

单条内容基础信息。`platform` + `post_id` 唯一；时间统一为 ISO 8601。

| 字段 | 类型 | 必填 | 可空 | 说明 |
|---|---|---:|---:|---|
| platform | string | 是 | 否 | 平台标识 |
| post_id | string | 是 | 否 | 平台内容 ID（BV号 / 作品ID / 博文ID）；索引降级例外见 §5.1 |
| post_url | string | 是 | 是 | 内容详情页 URL（证据锚点）；授权 opaque share 例外见 [artifact-contract.md](artifact-contract.md) §3.2/本节约束，索引降级例外见 §5.1 |
| published_at | datetime | 否 | 是 | 发布时间（ISO 8601） |
| content_type | enum | 是 | 否 | 内容形态（§9.4） |
| title | string | 否 | 是 | 标题 / 文案首行 |
| text | string | 否 | 是 | 正文 / 文案全文 |
| duration_seconds | integer | 否 | 是 | 视频时长（秒） |
| hashtags | array[string] | 否 | 是 | 话题 / 标签 |
| is_pinned | boolean | 是 | 是 | 是否置顶；无公开证据时为 `null` |
| is_repost | boolean | 是 | 是 | 是否转载 / 转发；无公开证据时为 `null` |
| is_promoted | boolean | 是 | 是 | 是否投放 / 推广标记；无公开证据时为 `null` |
| collection_status | enum | 是 | 否 | 采集状态（§9.3） |
| collection_status_source | enum | 是 | 否 | `declared` / `inferred_missing` / `inferred_invalid` |
| collected_at | datetime | 是 | 否 | 采集时间（ISO 8601） |
| source_url | string | 是 | 否 | 来源 URL（证据锚点） |

约束：
- 所有普通平台记录以 `(platform, post_id)` 唯一。B站 medialist 的下一页可能再次包含上一页
  `oid` 锚点，必须在累计数量和 limit 判断前 first-wins 去重；持久化边界再次去重后，
  `task.collected_count`、JSONL 行数、CSV 记录数和报告内容数必须一致。
- `is_pinned` / `is_repost` / `is_promoted` 仅保留明确公开的 `true` / `false`；未知时为 `null`，不得把缺失证据断言为 `false` 或 `true`。
- `collection_status` 缺失或非法时必须归一为 `PARTIAL`，并分别标记 `inferred_missing` / `inferred_invalid`；禁止默认为 `SUCCESS`。归一化覆盖率须记录 `COLLECTION_STATUS_INFERRED` warning，流水线因此降为 `PARTIAL`。
- `normalized-posts.csv` 使用紧凑、排序键的 JSON 序列化 `hashtags`、`platform_metrics` 与 `field_visibility`；布尔值统一写小写 `true` / `false`，`null` 写为空单元格。读取端仍兼容旧 CSV 中用 `|` / `,` / `;` 分隔的话题串，以及旧采集器写出的 Python `list` / `tuple` / `dict` 字面量；后者只在严格单元格大小、AST 复杂度、目标类型及 JSON 兼容性校验后读取，绝不执行表达式，也不再以旧格式写出。
- 默认分析排除置顶、转载、投放内容（见 [model-insights.md](model-insights.md) §6.4），但须在数据中保留标记。
- B站所有构建路径的 `platform_metrics` 固定包含
  `collection_evidence_status/is_in_collection/series_name/season_id`：只有公开
  `ugc_season` 正证据可写 `OBSERVED/true`；完整响应未见该节点写
  `NOT_OBSERVED/null`，列表路径不具备该证据写 `UNAVAILABLE/null`。不得用字段缺失推断
  `is_in_collection=false`。动态-only 卡若缺少收藏、投币或其他统一指标，单条
  `collection_status=PARTIAL`，并在 `missing_detail_metrics` 中列明。
- 授权 OpenAPI 作品必须使用响应提供的 HTTPS `share_url`，持久化前移除查询参数与片段。
  与 `video_id` 精确一致的直接 `/video/<id>` / `/note/<id>` 规范化为 `post_url`；官方
  `iesdouyin.com/share/video|note/<id>` 若末段为同一数字 ID，也规范化为直接作品 URL，数字
  异 ID 关闭失败。只有非数字 opaque share 无法绑定 ID，只保留为 `source_url`，此时
  `post_url=null` / `item_url_known=false`。账号主页、根路径、其他主机/路径均视为响应错误；
  不得仅从 `video_id` 合成证据 URL。
- 公开抖音列表仅接受数字平台作品 ID，并按 ID 去重；重复项只能补齐先前缺失字段，不能覆盖
  先出现的可靠列表证据。缺失或非法 ID 的记录必须跳过，账号主页不能充当作品 URL。
- 启用 `--enrich-details` 时，只有真实、数字 ID 匹配的 `/video/<id>` 或 `/note/<id>` URL，
  且 `title`、`published_at`、`duration_seconds`、`hashtags` 至少一项缺失，才允许请求详情。
  详情只能补空值，不能覆盖列表值。`platform_metrics.detail_status` 固定为 `SUCCESS`
  （详情请求成功）、`UNAVAILABLE`（详情不可用）或 `NOT_NEEDED`（所需字段完整）。
  详情结果的 `post_id` 还必须与列表父作品 ID 完全一致；缺失或不一致均按 `UNAVAILABLE`
  处理，不能合并任何详情证据。详情 SSR 解析只能检查已知作品详情路径，不能从任意嵌套
  对象中搜索 ID 后当成作品。列表或资料阶段已有任务级平台保护时不得请求详情；详情请求
  首次返回 `LOGIN_REQUIRED`、`VERIFICATION_REQUIRED`、`RATE_LIMITED` 或
  `ACCESS_RESTRICTED` 后，剩余详情与全部评论请求立即断路，保护原因上提到任务级。

### 5.1 抖音搜索索引降级的显式例外

当抖音直连 SSR/CDP 已因登录墙、验证或解析失败停止，且 Web 搜索连接器只返回精确账号
主页的公开索引卡片时，可能没有真实平台作品 ID 和单条详情 URL。为了让标题快照进入既有
确定性分析，同时不伪造平台标识，允许以下**唯一例外**：

- `post_id` 使用 `idx-<20 hex>` 确定性本地记录键；它不是抖音作品 ID。
- `post_url` 与 `source_url` 使用精确账号主页作为证据锚点；它不是单条作品详情页。
- 原始记录的 `platform_metrics` 及归一化 CSV 必须携带下列证据语义字段；任何一项缺失都
  不得把搜索索引记录描述成平台作品。

| 字段 | 类型 | 搜索索引固定值 / 说明 |
|---|---|---|
| `collection_source` | string | `douyin_search_index`（精选真实作品页为 `douyin_jingxuan`） |
| `platform_post_id_known` | boolean | `false` |
| `local_record_key` | boolean | `true` |
| `item_url_known` | boolean | `false` |
| `source_rank` | integer | 在该索引快照中的 1 基顺序 |
| `published_at_precision` | enum | `datetime` / `date` / `unknown` |

上表的 `local_record_key` 是来源标识，不是可空的公开标记；旧 CSV 缺列时固定读为 `false`。

下游必须传播这些字段：最终报告显著显示 `PARTIAL`、来源、快照时间/年龄和非穷尽声明；
`item_url_known=false` 时不得把账号主页渲染为单条作品链接。`published_at_precision=date`
只能用于日期、星期和月份统计，不进入小时分布或精确小时级发布间隔；`unknown` 不得计算
发布频率。当前搜索索引契约只接受卡片标题与明确显示的点赞数；`published_at`、
`duration_seconds`、`views`、`comments`、`favorites`、`shares`、`coins`、`danmaku` 必须为
`null`。报告可以比较“索引可见点赞”，但不得将缺失字段按零补齐后称为总互动。

### 5.2 小红书主页卡片的显式本地记录

小红书现代匿名主页可能提供一批目标账号卡片的标题、类型、置顶与点赞，却把 `noteId` 留空。
为保留这一批主页证据而不伪造平台作品 ID，允许以下受限记录：

- `post_id` 使用 `xhs-card-<20 hex>` 确定性本地记录键，不是小红书笔记 ID；
- `post_url=null`，`source_url` 为同一目标账号的规范主页；
- `collection_status=PARTIAL`；`published_at`、正文和未展示指标均为 `null`；
- `platform_metrics` 固定包含 `collection_source=xiaohongshu_profile_cards`、
  `platform_post_id_known=false`、`local_record_key=true`、`item_url_known=false` 和
  主页批次中的 1 基 `source_rank`。

卡片作者给出非空 ID 时必须与主页路径目标 ID 相同，否则丢弃。页面一旦提供真实 `noteId`，
仍须使用真实 ID 与规范作品 URL，不得继续降级成本地键。主页卡片只能支撑该次非穷尽样本内观察，
不能进入要求单篇 URL 的评论、核心洞察或完整证据合同。

## 6. Metrics 数据结构

单条内容的公开表现指标。未展示即为 `null`；禁止用 `0` 代替未知（见 §8）。

| 字段 | 类型 | 必填 | 可空 | 说明 |
|---|---|---:|---:|---|
| views | integer | 否 | 是 | 播放 / 浏览（公开时） |
| likes | integer | 否 | 是 | 点赞 |
| comments | integer | 否 | 是 | 评论 |
| favorites | integer | 否 | 是 | 收藏 |
| shares | integer | 否 | 是 | 分享 / 转发 |
| coins | integer | 否 | 是 | 投币（B站） |
| danmaku | integer | 否 | 是 | 弹幕（B站） |
| platform_metrics | object | 是 | 否 | 平台特有指标（如微博无 favorites 时记此） |

全局内容指标映射：

| 统一字段 | B站 | 抖音 | 微博 |
|---|---|---|---|
| views | 播放 | 播放（公开时） | 浏览（公开时） |
| likes | 点赞 | 点赞 | 点赞 |
| comments | 评论 | 评论 | 评论 |
| favorites | 收藏 | 收藏 | null |
| shares | 分享 | 分享 | 转发 |
| coins | 投币 | null | null |
| danmaku | 弹幕 | null | null |

### 6.1 Comment 评论记录

`source/comments.jsonl` 中每行保存适配器实际返回的一条公开评论，并由编排层补充父作品锚点：

| 字段 | 类型 | 必填 | 可空 | 说明 |
|---|---|---:|---:|---|
| `comment_id` | string | 是 | 否 | 平台评论 ID；仅限 1–128 位字母、数字、`_`、`-` |
| `parent_post_id` | string | 是 | 否 | 父作品平台 ID |
| `parent_post_url` | string | 是 | 否 | 父作品真实详情 URL |
| `author` | string | 否 | 是 | 页面公开的评论作者名 |
| `text` | string | 否 | 是 | 页面公开的评论文本 |
| `likes` | integer | 否 | 是 | 页面公开的点赞数 |
| `published_at` | datetime | 否 | 是 | 评论发布时间 |
| `collected_at` | datetime | 否 | 是 | 适配器采集时间 |

持久化边界只允许上表字段，禁止保存适配器返回的 Cookie、请求头、token、原始响应或其他
任意键。编排层必须校验适配器自带的 `post_id` / `post_url` / 父锚点与当前作品一致，按
`parent_post_id + comment_id` 稳定保留第一条并去重；非空响应中的畸形记录按失败记录，不能
伪装为空结果。每个父作品最多持久化 20 条，`comments_collected` 等于最终有效唯一行数。

评论文件与其他采集产物一样在已绑定的 `source/` 目录中排他创建，绝不打开、截断或替换
预先存在的普通文件、硬链接、FIFO 或符号链接。写入失败只输出固定清洗错误，并使工作区
保持没有有效 `.complete` 的不完整状态；不删除任何已创建节点，也不把部分评论文件计为
已提交数据。

作品父 URL 在详情调用、评论调用、报告和数据落盘前必须完成平台级主机、路径与作品 ID
关联校验，并规范化为无凭据、query 和 fragment 的公开 URL。报告与终端输出中的访问原因、
异常文本和诊断元数据只能使用固定阶段消息及受控枚举，不能透传适配器异常或上游敏感值。
账号主页 URL 同样必须在访问检查、列表和资料适配器调用前完成平台级规范化；凭据、显式端口
或非账号路径必须在调用及创建任务目录前拒绝。`profile.profile_url` 与 `task.profile_url` 只写
该规范 URL。每条作品的 `post_url` 和 `source_url` 都在产物边界独立校验；`post_url` 无法关联
当前平台与作品 ID 时写为 `null`。`source_url` 仅有两项显式例外：经固定官方路径校验的授权
OpenAPI 非数字 opaque share，以及 §5.1 已披露的搜索索引账号主页锚点；二者都不能渲染成
ID 绑定作品证据。任何来源 URL 均不得保留原始 query、fragment 或任意外域值。

平台路由本身也属于不可信边界：调用任一适配器 `supports` 前，必须先要求 HTTPS、精确的
无凭据/无端口 authority，并拒绝分号 path params、百分号编码 authority/path 和其他混淆形式；
只把移除 query/fragment 后的安全 host/path 候选交给适配器。抖音 `v.douyin.com` 短链只允许
以该安全候选解析一次重定向，落点仍须通过抖音账号主页策略，随后所有账号调用只使用规范化
的 `https://www.douyin.com/user/...` URL。

## 8. 空值规则（field_visibility）

`field_visibility` 记录每个顶层字段是否对当前采集可见，便于计算字段覆盖率与诚实报告。示例：

```json
{
  "followers": "visible",
  "post_count": "visible",
  "bio": "hidden",
  "views": "visible",
  "favorites": "hidden"
}
```

取值：`visible` / `hidden` / `partial`（字段出现但数值不完整）。

数值空值规则：
- 页面**明确显示 0** → 保存为 `0`（真实零值）。
- 页面**没有显示**该字段 → 保存为 `null`。
- **解析失败** → 保存为 `null`，并在错误日志记录字段错误（`PARSER_FAILED` 或字段级错误）。
- **禁止**通过其他指标推算不可见字段（如用互动数反推播放数）。
- 禁止用 `0` 代替未知；`null` 与 `0` 在统计与报告中必须区分对待。

## 9. 采集枚举

### 9.1 task_status（生命周期状态）

- `CREATED`：任务目录已创建
- `COLLECTING`：正在采集
- `NORMALIZING`：正在归一化
- `ANALYZING`：正在分析
- `COMPLETED`：输出验证全部通过
- `PARTIAL`：部分数据成功，部分失败 / 中止
- `FAILED`：不可恢复错误，无可用结果

### 9.2 stop_reason（停止原因，默认 `null`）

- `LOGIN_REQUIRED`：页面要求登录
- `VERIFICATION_REQUIRED`：出现验证码 / 滑块
- `RATE_LIMITED`：平台明确触发频控
- `ACCOUNT_UNAVAILABLE`：账号不存在、封禁或无法访问
- `ACCESS_RESTRICTED`：其他访问限制
- `PARSER_FAILED`：页面可访问但解析失败
- `NO_PUBLIC_CONTENT`：账号确实没有公开内容
- `UNSUPPORTED_PLATFORM`：URL 不属于本 Skill 专用适配器覆盖的平台；只终止本 Skill 的采集任务，不限制上层 Agent 改用其他合规公开研究路径
- `ADAPTER_UNAVAILABLE`：平台适配器未实现或被显式停用
- `INTERNAL_ERROR`：脚本 / 内部错误
- `OPENAPI_ERROR`：授权抖音 OpenAPI 请求或响应错误；令牌与服务端原始描述不得进入产物
- 单条内容级中止原因（用于错误日志，不写入 `task_status`）：`POST_UNAVAILABLE`、`COMMENTS_UNAVAILABLE`

### 9.3 collection_status（单条内容采集状态）

- `SUCCESS`：内容与指标完整采集
- `PARTIAL`：内容已采集但部分指标缺失 / 受限
- `FAILED`：内容采集失败
- `DELETED`：内容已删除或不可公开访问
- `RESTRICTED`：内容存在访问限制（如仅粉丝可见）

### 9.4 content_type（内容形态）

- `video`：视频（B站 / 抖音）
- `image_text`：图文（微博图文 / 动态）
- `text`：纯文字 / 长文（微博长文）
- `live_clip`：直播切片
- `dynamic`：动态视频 / 图文动态（B站动态）
- `other`：无法归入上述类型
