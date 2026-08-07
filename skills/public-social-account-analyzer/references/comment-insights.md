# 评论洞察规则

只在用户请求评论采样或评论语义洞察时读取。评论记录与模型输出结构见 [collection-schema.md](collection-schema.md) §6.1 和 [analysis-schema.md](analysis-schema.md) §7.2。

## 7. 评论证据与语义边界

评论分析只处理 `VerifiedWorkspaceReader` 从同一个已提交采集工作区读取的
`source/comments.jsonl` 原始字节；分析工作区中的同名文件按原字节复制，不重新序列化。
任何 UTF-8、严格 JSON、字段清单、类型、时区、父作品锚点、重复 ID、每父 20 条上限或
账本一致性错误都必须在输出目录预留前失败。具体根对象结构与四种状态见
[analysis-schema.md](analysis-schema.md) §7.2。物理记录仅以 LF（U+000A）分隔，CRLF 可接受；合法 JSON 字符串中的
U+2028 / U+2029 是内容而非分隔符，仅用二者连接两个对象必须拒绝。

### 7.1 父作品覆盖与状态

- 可分析父作品只来自归一化后的 `SUCCESS` / `PARTIAL` 内容，且 `is_pinned`、
  `is_repost`、`is_promoted` 均未明确为真；还须存在平台规范、与 `post_id` 精确绑定的
  作品 URL。按父 ID 去重，重复 ID 指向不同规范 URL 时整体排除该父作品。`FAILED` /
  `DELETED` / `RESTRICTED`、三类明确标记、主页、搜索索引本地键、站外或错 ID URL 均不
  合格。公共采集器必须在调用平台评论适配器前使用同一规则，不能采集分析器必然拒绝的
  父作品。
- 有至少一条有效评论时状态为 `collected_pending_model`；评论级失败不能覆盖已有证据。
- `empty` 必须同时具有已请求、明确空文件、所有合格父作品均已尝试且为空、无失败、无
  保护中止。其余零证据为 `unavailable`；未请求为 `not_requested`。
- `parent_coverage_rate = covered_parent_posts / eligible_parent_posts`，保留四位小数；没有
  合格父作品时为 `null`。评论字段覆盖率同样保留四位小数，零评论时为 `null`。

### 7.2 代表评论确定性选择

- 仅非空评论文本有资格成为代表评论；所有有效行仍计入样本数与字段覆盖率。
- 每个父作品最多选一条，先按可见点赞降序，再按源行号升序；`likes=0` 是可见值，优先于
  `likes=null`。
- 不同父作品的候选再按同一规则排序，最多选三个父作品。相同输入字节必须得到相同顺序。
- 代表评论保留父作品规范链接及 `source/comments.jsonl:<1-based-line>` 证据定位；报告对
  作者、文本、评论 ID 和父 ID 做 Markdown/HTML 上下文转义，只有规范且 ID 一致的作品
  URL 才可渲染为链接。

### 7.3 语义状态与完成门

确定性脚本不调用模型，也不根据词频或规则声称高频问题、争议点、需求、情绪或受众观点。
未请求评论语义时 `semantic.status=not-requested`；评论未请求、为空或不可用时为
`not-applicable`；已请求且有可用评论但尚无严格结果时为 `pending-model`，部分结果为
`partial-model`，完整结果为 `completed`。只有用户请求评论语义时，该阶段才进入全局完成门；
`pending-model` 或 `partial-model` 会令正式分析保持 `PARTIAL`。结构与枚举以
[analysis-schema.md](analysis-schema.md) §7.2 为唯一来源。
