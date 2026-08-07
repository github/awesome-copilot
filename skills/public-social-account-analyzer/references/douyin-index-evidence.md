# 抖音无登录 Web 索引证据降级

本流程可作为低成本发现路径，也可在 SSR 或临时浏览器不可用后作为降级路径。Agent 根据用户目标、时效和环境选择先后顺序；不要求先启动浏览器或先让直连失败。它依赖 Agent 运行环境已有的 Web 搜索/打开连接器；Python 导入脚本本身不联网、零第三方依赖。没有 Web 连接器且沙箱不能联网时，不能取得新数据，应保留已有结果并说明证据缺口。

## 0. 信任边界与职责

- **Agent + Web 连接器负责来源核验**：打开或搜索公开页面，确认结果 URL 是精确目标主页或
  官方精选作品页，识别账号作品区边界，逐条核对页面显示的作者、标题与指标，并排除推荐区、
  热门区、页脚卡片和标题反搜的其他作者。
- **离线导入脚本负责一致性校验**：`import_index_snapshot.py` 不联网，只校验证据 JSON 的
  结构、允许域名、URL/ID 对应关系、账号名与 `author_name` 字段一致性、时间与非负整数，
  然后仅持久化白名单字段。它不能独立证明 Agent 填写的卡片确实来自某个页面区域。
- Agent 无法在连接器结果中确认作品区边界或作者归属时，不得生成 evidence JSON，也不得用
  自报 `author_name`、相似标题或推荐内容通过脚本的一致性检查。

## 1. 证据优先级

### A 级：`douyin_jingxuan`

1. 用精确账号名搜索官方精选页，例如
   `site:jingxuan.douyin.com/m/video "<账号名>"`。
2. 由 Agent 打开官方结果，确认页面作者名与目标账号完全一致；另用精确主页 URL/账号名确认
   账号身份。
3. 只导入该作者页明确列出的作品链接；每条必须有数字 ID、官方 URL、标题和完全一致的
   `author_name`。日期、时长、指标只在页面展示时填写。
4. 推荐区、页脚卡片、标题相似结果和其他作者内容一律不用。

### B 级：`douyin_search_index`

1. 搜索精确主页 URL 与账号名；由 Agent 确认搜索结果 href 规范化后与目标主页完全一致，
   并只读取该结果中明确标示的账号作品区；遇到热门/推荐等区块即停止取条目。
2. Agent 核对后只保存账号身份、卡片标题、索引顺序以及明确展示的点赞数，并将已确认作者
   写入 `author_name`。`post_id`、`post_url`、`published_at`、`duration_seconds`、`views`、
   `comments`、`favorites`、`shares`、`coins`、`danmaku` 必须全部为 `null`；当前契约不接受
   搜索卡片中其他含义不确定的数字。
3. **不得用标题反搜补 ID/URL**：同标题可能属于搬运或其他作者。除非打开单条官方页面后作者
   与目标账号完全一致，否则不要升级为 A 级证据。

两个等级都不是穷尽、实时列表，任务始终为 `PARTIAL`。

## 2. Evidence JSON

先把连接器输出整理为最小 JSON；不要保存搜索引擎 HTML、内部引用、Cookie、请求头或签名
查询参数。

```json
{
  "schema_version": 1,
  "platform": "douyin",
  "profile_url": "https://www.douyin.com/user/<sec_uid>",
  "account": {
    "account_id": "<与主页路径相同的 sec_uid>",
    "account_name": "账号显示名",
    "bio": null,
    "verified": null,
    "followers": null,
    "post_count": null,
    "platform_metrics": {
      "douyin_id": null,
      "total_likes": null,
      "latest_post_at": null
    }
  },
  "source_kind": "douyin_jingxuan",
  "source_url": "https://jingxuan.douyin.com/m/video/<seed_id>",
  "observed_at": "2026-07-24T18:00:00+08:00",
  "snapshot_crawled_at": null,
  "snapshot_age_label": null,
  "upstream_stop_reason": "LOGIN_REQUIRED",
  "posts": [
    {
      "post_id": "<真实数字 ID>",
      "post_url": "https://jingxuan.douyin.com/m/video/<同一 ID>",
      "author_name": "账号显示名",
      "title": "页面标题",
      "published_at": "2026-07-18",
      "duration_seconds": 61,
      "views": null,
      "likes": null,
      "comments": null,
      "favorites": null,
      "shares": null,
      "coins": null,
      "danmaku": null
    }
  ]
}
```

搜索索引版本必须设置 `source_kind=douyin_search_index`、`source_url=profile_url`，并让每条
`post_id`、`post_url` 为 `null`。相对年龄（如“约 6 个月前”）只能写
`snapshot_age_label`，不得反推精确日期。
精选页和搜索索引都不提供可验证的置顶、转载或投放标记，因此导入后
`is_pinned` / `is_repost` / `is_promoted` 固定为 `null`，不得用 `false` 代替未知。

## 3. 导入与分析

```bash
python3 skill/scripts/import_index_snapshot.py \
  --evidence /path/to/evidence.json \
  --out workspace/douyin-index-<account>-<date> \
  --limit 30 \
  --date-from 2026-04-28 \
  --date-to 2026-07-27 \
  --profile-from-collection workspace/douyin-direct-failed

python3 skill/scripts/run_pipeline.py \
  --input workspace/douyin-index-<account>-<date> \
  --output workspace/douyin-index-<account>-analysis
```

Agent 必须先完成来源与作品区核验。导入器随后对将要导入的条目检查官方域名、账号 ID、
`author_name`/账号名一致性、作品 ID/URL、时间和非负整数；字段不一致时拒绝写盘。该检查
不能替代连接器页面核验，也不能证明同一 JSON 内自报的作者归属。输出目录必须为空。成功
退出 `0`；无作品退出 `3`；格式、身份、来源或目录冲突退出 `2`。

`--date-from/--date-to` 是用户任务范围，不是 Web 证据字段。导入器会先完整验证 evidence，
再排除发布时间未知或不在范围内的记录，最后应用 `--limit`。B 级搜索索引的发布时间按契约
全部未知，因此它不能证明任何卡片属于显式日期窗口；过滤后没有作品时不创建工作区，也不
生成“最近 N 天”排名。分析层还会再次应用同一范围，防止旧提交或外部输入绕过该约束。

`--profile-from-collection` 可选接收一次较新的匿名直连采集提交，即使该提交因 0 条作品而业务
状态为 `FAILED`。导入器只通过 identity-bound reader 读取有效 `manifest.json + .complete`，
要求平台、规范主页和可用 `sec_uid` 与索引目标一致；跨账号、未密封、被篡改、旧于已知索引
快照或身份冲突的来源在创建输出前拒绝。只用直连的非 `null` 公开字段覆盖索引资料，绝不用
`null` 擦除已有证据；账号改名不会改写旧索引作品当时的作者证据。新任务仅记录来源提交摘要、
任务 ID、采集时间和字段来源，不持久化本机路径。本人授权 OpenAPI 提交不得进入该入口，
防止授权资料被误标为匿名公开资料。资料时间还必须严格晚于索引证据的保守新鲜度基线：至少
晚于 `observed_at`，日期精度快照则以当天结束为上界；无法证明更新就拒绝覆盖。

导入器会先验证 evidence JSON 中的**全部条目**，再按 `--limit` 截取输出；limit 之后的坏
记录同样会导致整批拒绝。主页只接受 `douyin.com` / `www.douyin.com` 的安全 `/user/<id>`
路径；快照时间、作品时间和账号最新发布时间均不得晚于 `observed_at`。

成功导入会提交只读采集工作区，写入 `task.json`、`source/profile.json`、`source/posts.jsonl`、
`collection-report.md`，以及经过白名单规范化的 `source/index-evidence.json`。最后一项不是
搜索引擎 HTML 或连接器原始转储，不含内部引用、Cookie、请求头或签名查询参数。
`run_pipeline.py` 不修改该目录；它核验同一采集提交后，在新的分析目录重新生成 CSV、分析与
报告。索引来源和 pending 语义分类都会使派生任务保持 `PARTIAL`。

## 4. 报告解释

- `douyin_jingxuan` 保留真实作品 ID/URL，但仍只代表精选页当时可见子集。
- `douyin_search_index` 使用已披露的 `idx-*` 本地记录键；账号主页只是证据锚点，报告不得
  渲染成单条作品链接。
- 日期级证据不进入 24 小时时段或精确小时级间隔。由于两个等级都是非穷尽子集，即使存在
  日期也只展示样本日期分布，不计算账号周均发布量、发布间隔、断更、季节性或排播建议。
- 搜索索引只展示点赞时，只能称“索引可见点赞”，不得称总互动，也不计算衍生互动率。
- 报告若合并了直连 profile，必须同时标明“当前直连公开资料”和“较旧索引作品证据”，两种
  时间口径不得混为同一快照。
- 有效样本少于 15 条继续标记 `INSUFFICIENT_SAMPLE`。
