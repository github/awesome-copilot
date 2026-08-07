# 异常与优雅降级参考（状态机权威）

> 本文件是 **行为语义（behavioral）** 的权威来源：规定在何种场景设置哪个 `task_status` / `stop_reason` / `collection_status`。
> 枚举字段见 [collection-schema.md](collection-schema.md) §9；本文件不另造状态值。
> 字段与分析规则分别从 [data-schema.md](data-schema.md) 和 [analysis-rules.md](analysis-rules.md) 路由。

---

## 1. 统一决策表

下表为所有已知异常的处置标准。

| 场景 | task_status | stop_reason | 是否保留已有数据 | 是否继续 |
|---|---|---|---|---|
| URL不支持 | FAILED | UNSUPPORTED_PLATFORM | 否 | 否 |
| 适配器未启用 | FAILED | ADAPTER_UNAVAILABLE | 否 | 否 |
| 页面要求登录 | PARTIAL/FAILED | LOGIN_REQUIRED | 是 | 否 |
| 出现验证码 | PARTIAL/FAILED | VERIFICATION_REQUIRED | 是 | 否 |
| 访问频控 | PARTIAL/FAILED | RATE_LIMITED | 是 | 否 |
| 账号不存在 | FAILED | ACCOUNT_UNAVAILABLE | 否 | 否 |
| 单条内容失效 | PARTIAL | POST_UNAVAILABLE | 是 | 是 |
| 字段缺失 | 状态不变 | null | 是 | 是 |
| 页面解析失败 | PARTIAL/FAILED | PARSER_FAILED | 是 | 视情况 |
| 授权 OpenAPI 返回错误 | PARTIAL/FAILED | OPENAPI_ERROR | 是 | 否 |
| 评论不可见 | 状态不变 | COMMENTS_UNAVAILABLE | 是 | 是 |

`UNSUPPORTED_PLATFORM` 只描述本 Skill 采集脚本的路由结果，不是对用户目标的全局拒绝。编排 Agent 应停止使用本 Skill 的 collection/pipeline，然后使用其他可用的公开研究能力继续；只有用户要求的具体行为本身越过隐私、安全或授权边界时才拒绝该部分。

### 1.1 内容级原因与任务级原因的区分

`POST_UNAVAILABLE`（单条内容失效）与 `COMMENTS_UNAVAILABLE`（评论不可见）属于 **内容级（CONTENT-LEVEL）** 原因，**不是** 任务级停止原因；二者的任务级 `stop_reason` 均保持 `null`。

- 它们被记录在 **每条内容的错误日志** 中，并反映在该条内容自身的 `collection_status`（对应取 `DELETED` / `RESTRICTED` 或 `PARTIAL`）。
- **评论不可见**（`COMMENTS_UNAVAILABLE`）：任务级 `task_status` 保持 **状态不变**（任务不因评论不可见而整体失败或中止）。
- **单条内容失效**（`POST_UNAVAILABLE`）：因该条内容无法采集，任务级 `task_status` 降级为 **PARTIAL**（对应决策表"单条内容失效"行），但任务级 `stop_reason` 仍为 `null`，且任务继续采集其余内容（"是否继续 = 是"）。
- **可选详情补充不可用**：保留列表证据，仅将该条 `collection_status` 降为 `PARTIAL`、设置
  `platform_metrics.detail_status=UNAVAILABLE` 并写清洗后的内容级错误。账号任务最多降为
  `PARTIAL`，不得变成 `FAILED`，任务级 `stop_reason` 仍为 `null`。详情只允许在真实作品 URL
  且基础公开字段缺失时调用，成功时也只能补空值。
- **评论采样结果**：适配器明确返回 `[]` 计入 `empty_results`；普通评论不可用计入
  `failures` 并写内容级 `COMMENTS_UNAVAILABLE`。两者都不改变任务状态，且不得把空结果描述成
  已采评论。B站与抖音适配器都只能在成功、结构有效且评论数组明确为空时返回 `[]`；本地传输
  失败、非 JSON、字段缺失或非空畸形结构在没有平台保护证据时，必须抛固定清洗后的
  `COMMENTS_UNAVAILABLE`，不得携带上游正文或异常文本。启用但尚未实现评论采样的微博适配器
  也必须抛该固定原因，不能返回 `[]` 伪装为真实空结果。
- **评论端点的平台保护响应**：如果评论采集明确收到登录、验证或访问限制，必须保留准确的
  `LOGIN_REQUIRED`、`VERIFICATION_REQUIRED`、`RATE_LIMITED` 或 `ACCESS_RESTRICTED`，立即
  停止当前任务的剩余评论与网络请求，并写入任务级 `stop_reason`。该原因
  优先于此前的非平台保护原因；如果此前已有平台保护原因，则保留先出现的原因。此前的普通
  解析或内容错误仍保留在错误日志和评论采集元数据中，不得改写为平台保护，也不得把平台
  保护降格为 `COMMENTS_UNAVAILABLE`。
- **任务级平台保护断路**：列表、资料或详情阶段确认上述四类平台保护后，后续详情和评论端点
  均不得调用。较晚发现的平台保护必须优先于此前普通 `PARSER_FAILED` 等原因上提；若已经有
  平台保护则保留先出现者。请求了评论时仍排他写入空 `comments.jsonl`，账本五项计数全为 0
  （`per_post_limit=20`），且不另写评论级 `stop_reason`。
- **评论记录失败**：父锚点不一致或评论 ID/字段畸形作为内容级
  `COMMENTS_UNAVAILABLE` 写固定错误；其余有效评论和账号/作品采集继续处理，且任务级
  `stop_reason` 保持 `null`。
- **评论产物失败**：评论文件无法排他创建、序列化或提交时只输出固定清洗错误，整个新工作区
  保持没有有效 `.complete` 的未提交状态；不得删除、替换或重命名其中任何节点，也不得把
  部分评论文件计为已提交数据。
- 只有当 **整个任务需要中止** 时，才设置任务级 `stop_reason`（如登录墙、验证码、频控等场景）。换言之：单条内容问题只下钻到内容级（记录于内容错误日志），其任务级影响仅限 `task_status`，且绝不写入任务级 `stop_reason` 字段；但内容或评论端点返回的平台保护证据仍是任务级原因，必须立即上提。

> 决策原则：内容级原因的处置目标是"跳过该条、保留其余"；任务级原因的处置目标是"任务中止、保留已采集"。二者不应混淆——`POST_UNAVAILABLE` / `COMMENTS_UNAVAILABLE` 永远不应出现在任务级 `stop_reason` 字段。

---

## 2. 通用原则

执行正式采集、归一化、分析制品时遵循以下规则；脚本级停止原因只约束对应工具，不自动终止 Agent 仍可完成的公开研究：

1. **不绕过登录、验证码、滑块或频控。** 一旦平台要求登录、触发验证或明确频控，必须立即停止对应请求，绝不尝试伪造、绕过或自动化破解这些保护措施。
2. **单条失败不能导致整个任务直接失败。** 单条内容采集/解析失败应隔离为内容级错误，任务整体状态仅据此降级为 `PARTIAL`，而非直接 `FAILED`。
3. **已提交采集数据必须保持只读。** 无论后续步骤是否失败，采集工作区的目录树与字节均不得删除或覆盖；归一化、分析和报告写入独立分析工作区。
4. **错误指标不得写入正常数据。** 失败、受限或缺失的字段一律写 `null` 或记录于错误日志，禁止用 `0`、占位值或猜测值污染正常数据行。
5. **正式采集报告说明停止位置、成功数量和失败数量。** `collection-report.md` 须明确写出：任务在哪一步/哪一条停止、成功采集多少条、失败或受限多少条。普通聊天答复按用户目标给出最小充分披露。
6. **不向用户提供规避平台保护措施的方法。** 分析报告仅呈现公开数据与客观结论，不得包含任何绕过登录、验证、频控或访问限制的指引。

### 2.1 抖音授权 OpenAPI 的边界与失败语义

- 独立授权命令同时读取环境变量 `DOUYIN_OPENAPI_ACCESS_TOKEN` 与
  `DOUYIN_OPENAPI_OPEN_ID`，且只采集这组 OAuth 凭据对应的账号；缺少、空白或含空白/
  控制字符的任一值，以及输出目录已经存在时，都在任何网络请求和目录写入前以参数错误退出。
- `POST /oauth/userinfo/` 只向固定官方端点发送
  `application/x-www-form-urlencoded` 请求体中的 `access_token` 与 `open_id`；响应顶层
  `err_no` 必须是整数 `0`，且响应 `data.open_id` 必须与输入逐字一致，否则关闭失败。
  `GET /video/list/` 仍只在 `access-token` 请求头携带令牌。
- userinfo 编码遵循官方当前 curl 示例；同页 Content-Type 参数表写为 JSON。实现不携带同一
  access token 自动重试另一种编码，该外部文档差异必须在真实授权在线验收中确认。
- `video.list` 发送 JSON Content-Type 和 `access-token` 请求头。响应的直接或数字 share 作品
  URL 必须与 `video_id` 绑定；非数字 iesdouyin opaque share 路径只作为来源，账号/根路径、
  数字异 ID 或其他同域页面也按 `INVALID_RESPONSE` 失败关闭。官方页面当前未列 URL 参数表，
  `cursor` / `count` 仍需真实凭据在线确认。
- 授权入口不得接受已构造、可携带其他账号状态的 client 实例；它必须始终用上述两项环境
  凭据构造 client，测试缝最多注入无账号状态的 transport。client 在内存中精确回证
  `open_id`；编排层再核对公开 `account_id` 与规范主页中的 `sec_uid`。任一绑定失败都写
  `FAILED / OPENAPI_ERROR`、保持非穷尽且不得请求作品页；`open_id` 与 `union_id` 不进入产物。
- OpenAPI 在第一页前失败时写标准空内容产物并标记 `FAILED / OPENAPI_ERROR`；已完成至少
  一页后失败时保留既有作品并标记 `PARTIAL / OPENAPI_ERROR`。
- `--all` 遇游标不前进或连续两页没有新增作品时，以 `PARSER_FAILED` 停止；有既有作品为
  `PARTIAL`，否则为 `FAILED`。只有官方 `/video/list/` 明确返回 `has_more=false` 才能
  `COMPLETED`。
- 授权限量模式只接受 `--limit 1–100`，并在网络和输出预留前校验。任一页返回的条目数超过
  请求 `count` 时按 `INVALID_RESPONSE` 关闭失败且保持非穷尽；不得本地截断后接受末页证明。
- 错误描述只写固定的清洗后分类，不写服务端描述、请求头、查询字符串、响应正文或底层
  transport 异常。令牌不得进入 URL、文件、stdout/stderr、异常链或诊断字段。
- 不实现 OAuth 登录、授权码交换、token refresh 或第三方账号查询。当前仍未提供真实
  token/open_id 做在线授权验收，因此端到端在线验证保持 **pending**；仅集中构造已确认的
  `cursor` / `count` 查询参数，不推测其他接口或参数。

### 2.2 工作区提交不确定态

- `WorkspaceCommitIndeterminate` 是发布层结果，不是 `task_status` 或 `stop_reason` 的新枚举。
  它只用于最终 `.complete` 已写入后，三次文件 `fsync` 均失败，或文件已经成功同步但三次
  用户路径最终核验均遇到 I/O 错误的场景。
- 公开采集与授权采集固定返回退出码 `4`，只输出：
  `[INDETERMINATE] 输出目录可能已有可见提交，但持久化或最终验证未确认；请保留目录并重新核验`。
  不得输出底层异常、路径、令牌或其他外部文本。
- 此状态绝不等于失败回滚，也绝不等于成功：工作区可能带有当前可见且格式合法的
  `.complete`，但调用方不得据此接受本次命令为成功。工作区必须原样保留以供重新核验；
  后续采集必须选择新目录。
- 身份、所有权、清单、摘要或精确目录清单不一致时，立即按安全/验证错误失败。即使攻击者
  放回字节完全相同的合法 `.complete`，也不得吞掉已发现的路径节点身份替换。

### 2.3 不可变续采输入

- `collect.py --resume --out <OLD>` 只接受同时具有有效 `.complete` 和 `manifest.json` 的已
  提交采集工作区，并在加载适配器、发起网络请求或预留新输出前完成 identity-bound 验证。
  未密封 legacy 目录、缺少任一提交元数据或验证失败均以参数错误关闭，来源保持逐字节只读。
- manifest 中存在 `source/posts.jsonl` 时，它是唯一帖子来源：显式空文件表示 0 条；非空
  JSONL 的任一畸形、空白或非对象记录都拒绝整个续采，绝不以 CSV 掩盖。只有 JSONL artifact
  缺失时才可读取已 manifest 的严格 CSV；JSONL 与 CSV 都缺失时拒绝，不能退化为全量采集。
- 成功续采始终写入另一个新不可变工作区，`resume_source.digest` 记录来源 commit SHA-256；
  任何成功、失败或异常路径都不得修改来源目录。

### 2.4 派生分析工作区

- 已提交采集目录只能通过 identity-bound immutable reader 读取；旧版
  `normalize.py` / `analyze.py` / `render_report.py` 遇 `manifest.json` 或 `.complete` 必须拒绝，
  不得原地补文件。
- `run_pipeline.py` 在输出预留前完成采集核验、归一化、分析、渲染和输出校验。缺少必要输入、
  没有可分析行、证据解析失败、分类 JSON 不完整/父作品不匹配/枚举非法、渲染章节异常、
  坏链接或无效输出都以非零状态退出且不创建输出。
- 输出预留后发生写入或提交失败时，不回滚、不删除；已有目录保持未提交状态。成功时分析目录
  仅提交一次，且使用与采集工作区相同的 create-only manifest/marker 协议。
- `.complete` 与业务完整性分离：受限上游、归一化损失或 `pending-model` 分类均可形成持久提交的
  `PARTIAL` 分析；只有上游、归一化、分类和渲染校验全部完整时才是 `COMPLETED`。

---

## 3. 错误记录 JSON 格式

每条（内容级或任务级）错误以如下结构写入 **采集质量报告（`collection-report.md`）的错误日志（error log）** 段，或对应的结构化错误日志文件：

```json
{
  "url": "https://example.com/post/123",
  "stage": "collect_post_detail",
  "error_code": "POST_UNAVAILABLE",
  "message": "页面已删除或不可公开访问",
  "occurred_at": "2026-07-23T09:00:00+08:00",
  "retryable": false
}
```

字段说明：

- `url`：出错对象的来源 URL（页面或内容详情页）。
- `stage`：出错阶段，如 `collect_list`、`collect_post_detail`、`parse_profile`、`normalize`。
- `error_code`：取自 [collection-schema.md](collection-schema.md) §9.2 / §9.3 的枚举值（任务级或内容级）。
- `message`：人类可读的中文说明。
- `occurred_at`：ISO 8601 带时区时间戳。
- `retryable`：是否可在当前采集进程内安全重试。`false` 表示当前进程遇保护即断路；不禁止 Agent 按 Skill 规定等待后以新目录创建有界的新任务。

> 写入位置：任务目录下的 `collection-report.md` 错误日志段；若实现支持结构化错误文件，可同时写入同名 `.jsonl`。

---

## 4. 降级示例

### 4.1 采集中途遇登录墙

采集 15 条内容后，列表页要求登录：

- `task_status = PARTIAL`
- `stop_reason = LOGIN_REQUIRED`
- 已采集的 15 条原始数据与归一化结果 **保留**
- 不绕过登录墙，不再请求后续内容
- 报告注明：在列表第 16 条前停止，成功 15 条，失败 0 条（余下未采集因登录墙中止）

### 4.2 列表页出现验证码

在列表页初始抓取即触发验证码：

- 立即 **停止** 当前请求
- `task_status = FAILED`（若此前 **无任何** 已采集数据）；若已采集到部分数据，则 `task_status = PARTIAL`
- `stop_reason = VERIFICATION_REQUIRED`
- 不尝试破解、刷新或绕过验证码
- 报告注明：列表页触发验证码，任务中止，成功 N 条 / 失败 0 条（余下未采集因验证码中止）
