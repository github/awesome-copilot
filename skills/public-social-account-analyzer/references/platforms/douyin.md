# 抖音适配规则

## 目录

- [账号发现与主页边界](#从账号名发现规范主页)
- [用户授权 Cookie 会话](#用户授权-cookie-会话)
- [字段映射与受限识别](#账号字段)
- [无登录索引降级](#无登录-web-索引证据降级skillagent-层)
- [平台测试样例](#平台特有测试样例)

> 抖音字段从 [data-schema.md](../data-schema.md) 路由；停止语义以
> [exceptions.md](../exceptions.md) 为准。
>
> 证据边界：匿名模式不把登录墙当作“账号无数据”；用户明确在对话中提供其合法会话 Cookie 时，
> 可在隔离的临时浏览器中以该授权会话读取用户本来可见的页面。两种模式都不自动处理验证码、
> 滑块或频控，不伪造身份，也不把受限页冒充内容证据。抖音站点是重度 JS 渲染 + 风控（WAF / 滑块 / 签名），标准库
> `urllib` 直连往往只能拿到 JS 外壳或风控页——这是预期内的诚实结果，对应
> `PARSER_FAILED` / `LOGIN_REQUIRED` / `VERIFICATION_REQUIRED` / `ACCESS_RESTRICTED`，
> 而非缺陷。

本文件主体描述匿名公开适配器和用户授权会话模式。账号本人提供同次 OAuth access token + `open_id` 时，可使用
隔离的 `collect_douyin_authorized.py` 官方列表入口；其身份回证、末页、opaque share 与令牌
边界见 [artifact-contract.md](../artifact-contract.md) §3.2、[collection-schema.md](../collection-schema.md) §5 和 [exceptions.md](../exceptions.md) §2.1。该入口
不是匿名降级，也不能按第三方账号查询。

## 从账号名发现规范主页

用户只给昵称或抖音号时，先把主页发现与作品采集分开。一个实测有效的低成本入口是抖音
第一方移动搜索 `https://so.douyin.com/s?keyword=<URL编码关键词>&pd=user`：优先用完整中文
账号名搜索，核对结果中的昵称、抖音号、认证/主体、简介与粉丝量，再读取卡片链接中的
`https://www.douyin.com/user/<sec_uid>`。移除搜索来源查询参数后，把规范主页交给采集器。

- 不要把 `unique_id`/抖音号直接拼成 `/user/<unique_id>`；现代主页路径通常需要 `sec_uid`。
- 拼音搜索可能被语义纠错为同音账号；例如账号拼音不如完整中文名稳定。身份信号不一致时继续查证，不把第一条结果当目标。
- 搜索页用于发现和身份核对，不证明作品列表完整。作品数量、互动和末页仍由主页列表、作品页或其他绑定证据决定。
- 若环境没有可交互浏览器，可使用能返回直接账号卡片链接的 Web 连接器或用户提供的分享主页；核心仍是核对身份并取得真实主页，而不是依赖固定工具。

## 用户授权 Cookie 会话

当云端匿名访问只得到登录墙，且用户愿意继续时，按 [cookie-guide.md](../cookie-guide.md) 直接引导其复制浏览器请求头并粘贴到对话。Agent 再以 `--douyin-cookie-file <PATH>` 传入其创建的临时文件；具体参数保持在本平台参考中。

- Cookie 可由用户粘贴到当前对话，但 Agent 不得回显、转发、写入产物或版本库；命令行只传 Agent 创建的临时文件路径。
- 解析器限制文件大小、Cookie 数量和值长度，错误只返回固定说明，不回显秘密。Cookie 仅保存在采集进程内，临时 profile 随会话删除。
- 持久化、自动加载与撤回只按 [cookie-guide.md](../cookie-guide.md) 执行。
- 平台再次要求验证、限制访问或账号绑定冲突时，保留已有证据并按实际覆盖停止；Cookie 会过期，因此不把离线测试冒充在线成功。

完整采集示例：

```bash
python3 scripts/collect_douyin_complete.py \
  "https://www.douyin.com/user/<sec_uid>" \
  --douyin-cookie-file /secure/path/douyin-cookies.json \
  --out-prefix workspace/douyin-authorized-session
```

## 支持的账号主页

适配器 `supports(url)` 仅对**账号主页**返回 `True`。支持以下形式：

- `https://www.douyin.com/user/<sec_uid>` —— 现代用户主页（`<sec_uid>` 为加密用户标识）。
- `https://douyin.com/user/<sec_uid>` —— 同上（无 `www`）。
- `https://iesdouyin.com/share/user/<uid>` —— 旧版分享用户主页（`<uid>` 为数字或字符串）。
- `https://www.douyin.com/share/user/<uid>` —— 旧版分享页别名。
- `https://v.douyin.com/<code>` —— **短链**。需 best-effort 解析为长链后再判定：
  - 解析后落点为 `/user/...` → 视为账号主页（支持）。
  - 解析后落点为 `/video/...`、`/note/...`、`/search...` 等 → **不支持**（见下）。
  - 解析失败（网络/风控）时，短链形式本身作为合法入口 best-effort 判为支持，
    交由 `check_access` / `collect_*` 在真实请求时再次判定。

**明确拒绝**作为账号入口的页面（这些不是账号主页，即使 URL 含用户名也不当作账号）：

- 单条作品页：`.../video/<aweme_id>`、短链解析到 `/video/...`。
- 图文/笔记页：`.../note/<id>`、短链解析到 `/note/...`。
- 搜索页：`.../search?keyword=...`。
- 话题/音乐/直播/发现页：`/topic/`、`/music/`、`/challenge/`、`/live/`、`/discover/`。

> 说明：公开 Web 资料优先使用页面明确展示的 `unique_id`/`short_id`，缺失时以主页
> `sec_uid` 作为 `account_id`；OpenAPI 与索引导入固定使用已回证的 `sec_uid`。

## 账号主页与作品页区分

识别逻辑（在 `supports` 与采集前路由中使用）：

1. **路径判定**：账号主页路径含 `/user/` 或 `/share/user/`；单条作品含 `/video/` 或 `/note/`。
2. **短链解析**：`v.douyin.com/<code>` 一律先做一次重定向跟随（`urllib` 自动跟随，
   取 `response.geturl()` 的最终落点）。落点路径决定类型。
3. **页面特征**（best-effort，仅作兜底）：账号主页 `RENDER_DATA` 中含
   `userInfo` / `user` 结构且同时具备 `sec_uid` 与作品列表；作品页则含 `aweme`
   单条详情结构（`aweme_id` + `video`）。
4. **拒绝原则**：任何含搜索参数 `keyword=` 的 URL 一律视为搜索页，不作为账号入口。

> 用户主页也可能嵌入单条作品的预览卡片，但那仍是"账号主页"语境；真正的作品页是
> 以单条内容为主体的独立 URL。适配器只把**账号主页 URL**当作采集入口。

## 账号字段

页面公开账号字段 → 统一 `Profile` 字段映射（[collection-schema.md](../collection-schema.md) §4）：

| 抖音原始字段 | 统一字段 | 说明 |
|---|---|---|
| `unique_id`（抖音号） | `account_id` | 用户自定义抖音号；缺失时回退到 `sec_uid` |
| `nickname`（昵称） | `account_name` | 页面显示名称 |
| `signature`（简介） | `bio` | 账号简介 |
| `verification` / `custom_verify` / `enterprise_verify_reason`（认证） | `verified` | `true`/`false` 或认证文案字符串 |
| `follower_count`（粉丝数） | `followers` | 粉丝数量 |
| `aweme_count`（作品数） | `post_count` | 作品数量 |
| `total_favorited`（获赞总量） | `platform_metrics.total_likes` | 账号累计获赞；写入 `platform_metrics`，不占用统一顶层字段 |
| `sec_uid` | `platform_metrics.sec_uid` | 平台唯一加密标识（保底 `account_id` 来源） |
| `uid` | `platform_metrics.uid` | 数字 UID（若有） |

映射约定：
- `account_id`：优先 `unique_id`（抖音号）；为 `null`/空时回退到 `sec_uid`；两者皆无则为 `null`。
- `verified`：公开 `enterprise_verify_reason` / `custom_verify` 文案或账号头中已绑定的
  可见认证徽章优先于布尔值；generic `verified` 字符串不是认证证据。明确
  `verified=false` 或认证类型 `0` / `-1` 才记 `False`，有限正数认证类型记 `True`；
  其他负数、非有限数、布尔类型码及没有认证证据的情况均记 `null`，不得把未知伪装成
  未认证，也不得把 `"false"` / `"未认证"` 当认证文案。
- 获赞总量只进 `platform_metrics.total_likes`，统一层 `platform_metrics` 为必填对象。
- 页面未展示的字段一律写 `null`（绝不用 `0` 代替未知，见 [collection-schema.md](../collection-schema.md) §8）。
- `field_visibility` 必须覆盖 `account_id`、`verified` 与 `total_likes`：URL 中的
  `sec_uid` 回退为 `partial`，公开抖音号/明确认证证据/明确的获赞数（包括 0）为
  `visible`，无证据为 `hidden`。

## 内容字段

单条作品 → 统一 `Post` 字段映射（[collection-schema.md](../collection-schema.md) §5）：

| 抖音原始字段 | 统一字段 | 说明 |
|---|---|---|
| `aweme_id`（作品ID） | `post_id` | 平台内容唯一 ID |
| `desc`（文案） | `title` / `text` | `title`=文案首行；`text`=文案全文 |
| `create_time`（发布时间，Unix 秒） | `published_at` | 转 ISO 8601，时区 `+08:00` |
| `text_extra[].hashtag_name`（话题） | `hashtags` | 话题数组，去重 |
| `video.duration`（时长，秒） | `duration_seconds` | 视频时长 |
| `is_top`（是否置顶） | `is_pinned` | 置顶作品标记 |
| `is_ad` / `is_commerce` | `is_promoted` | 投放/推广标记 |

映射约定：
- `content_type`：抖音作品默认 `video`；图文/图文笔记可能为 `image_text`（best-effort 判定）。
- `title` 取 `desc` 首行（按换行截断）；`text` 取 `desc` 全文。
- `hashtags` 优先从结构有效的 `text_extra` 中提取 `hashtag_name`，并可从公开文案中的
  `#话题` 补充。明确观察到 `text_extra=[]` 且文案也没有话题时，才表示“已知无话题”，
  归一化为 `hashtags=[]` 且不标记详情缺失；`text_extra` 缺失或结构无效、文案中也无法
  提取话题时，不能据此断言无话题。兼容性输出虽仍为 `[]`，但必须在
  `platform_metrics.missing_detail_fields` 中保留 `hashtags`。
- `is_pinned` / `is_repost` / `is_promoted` 仅在公开证据明确时写 `true` / `false`；字段缺失或不可验证时写 `null`。

## 公开指标

单条作品公开表现指标 → 统一 `Metrics` 字段（[collection-schema.md](../collection-schema.md) §6）：

| 抖音原始字段 | 统一字段 | 说明 |
|---|---|---|
| `statistics.play_count`（播放） | `views` | **可能不公开 → 写 `null`** |
| `statistics.digg_count`（点赞） | `likes` | 点赞 |
| `statistics.comment_count`（评论） | `comments` | 评论 |
| `statistics.collect_count`（收藏） | `favorites` | 收藏 |
| `statistics.share_count`（分享） | `shares` | 分享 |

空值规则（强制）：
- **播放数可能不公开**：抖音对部分账号/作品不展示播放量，解析不到时 `views = null`，
  不得用互动数反推（见 [collection-schema.md](../collection-schema.md) §8）。
- 任意指标**页面未展示** → `null`；**明确显示 0** 才记 `0`。
- 抖音无 `coins`/`danmaku` 对应字段，统一层保持 `null`（不臆造）。

## 特殊处理

- **置顶作品**：`is_top=true` 时 `is_pinned=true`。分析层默认排除置顶内容，但须在
  `Post` 中保留标记（[collection-schema.md](../collection-schema.md) §5 约束）。
- **合集（mix/collection）**：作品若归属合集，`collection_name` 记入
  `platform_metrics.collection_name`；统一层 `series_name` 由模型分析阶段回填，
  采集层不臆造。
- **图文/笔记**：`content_type` best-effort 判为 `image_text`；文案与图片信息同样
  走 `title`/`text`/`hashtags`。
- **投放/推广**：`is_ad` 或 `is_commerce` 标记 `is_promoted=true`，保留以供分析层单独成组。
- **公开视频 vs 非公开**：仅采集页面公开可解析的内容；私密/仅粉丝可见内容不可达，
  触发访问限制时按 `exceptions.md` 处理，不绕过。

## 访问限制识别

所有判定基于页面文本/结构特征，**不绕过任何保护**。对应 `stop_reason`：

| 识别场景 | 页面特征（示例） | stop_reason |
|---|---|---|
| 登录提示 | "登录后查看"、"请先登录"、"登录抖音"、"需登录后访问" | `LOGIN_REQUIRED` |
| 验证页 / 滑块 | "滑动验证"、"人机验证"、"请完成安全验证"、"Verify you are human" | `VERIFICATION_REQUIRED` |
| 访问频控 | "访问过于频繁"、"操作过于频繁"、"请求频率过高" | `RATE_LIMITED` |
| 其他访问限制 | "网络异常，请稍后再试"、"访问受限" | `ACCESS_RESTRICTED` |
| 账号不可用 | "账号不存在"、"用户不存在"、"该账号已被封禁"、"账号已注销" | `ACCOUNT_UNAVAILABLE` |
| 解析失败 | 页面可访问（HTTP 200）但缺少 SSR 数据（抖音升级为 JS 虚拟机 `_$jsvmprt` 动态渲染，未嵌入静态 `RENDER_DATA` / `_SSR_DATA`） | `PARSER_FAILED` |
| 无公开内容 | 账号存在但作品列表为空且非受限 | `NO_PUBLIC_CONTENT` |

临时浏览器明确看到限制页时，覆盖账本只保存安全审计对：`restriction_source` 固定为
`browser_visible_text`，`restriction_marker` 按停止原因固定映射为
`LOGIN_WALL_VISIBLE`、`VERIFICATION_CHALLENGE_VISIBLE`、`RATE_LIMIT_VISIBLE`、
`ACCESS_RESTRICTION_VISIBLE`、`ACCOUNT_UNAVAILABLE_VISIBLE` 或
`NO_PUBLIC_CONTENT_VISIBLE`。页面原文、选择器、Cookie、请求头与带查询参数 URL 不得进入
`task.json`、报告或其他产物；两个审计字段必须成对出现且与根级 `stop_reason` 一致。

行为约束与解决决策树：

浏览器降级默认自动使用系统已有的 Chrome/Chromium/Edge/Brave 或已有 Playwright 浏览器缓存，使用隔离的临时用户目录，不新增 pip 包，也不接管本机 profile。`--no-browser-fallback` 仅控制抖音浏览器降级；找不到可用浏览器时以 `BROWSER_UNAVAILABLE` 安全诊断结束。

1. 先读同一主页会话的 SSR；SSR 缺失或作品列表结构无法识别且未出现明确保护时，才默认自动启动浏览器降级。真正的空列表返回 `NO_PUBLIC_CONTENT`，`--no-browser-fallback` 可禁用浏览器。
2. 浏览器只被动观察已发生的目标主页响应与可见 DOM，不执行页内 `aweme/post` 请求、不复制签名。当前 `page_context_fallback_used=false`、`page_context_request_count=0`。
3. API、SSR、网络与可见账号头只在规范主页、`sec_uid` 和作者身份不冲突时合并。资料计数冲突进入 `platform_metrics.profile_conflicts` 并把可见性降为 `partial`。
4. 作品候选必须绑定目标作者、数字作品 ID 与规范直接作品 URL；推荐、搜索、详情响应、坏项、混合作者或分页冲突不能提供末页证明。DOM 卡片只作为非穷尽降级证据。
5. 详情浏览器只用于列表中已知且规范的作品 URL；HTTP 401/403/429 或可见保护状态立即停止。详情路径不能发现新作品。
6. 全量浏览器预算默认 1,800 秒/2,000 次滚动；详情预算默认 20 秒、最多 8 个候选。达到边界保留 `PARTIAL`，不扩张采集。
7. 登录、验证、频控或访问限制出现后立即停止当前进程；不刷新、切换身份、伪造签名或接管本机浏览器 profile。
8. `collect_douyin_complete.py` 只对根级 `RATE_LIMITED` / `ACCESS_RESTRICTED` 以同一身份、新目录执行 30/60 秒有界重试，总计最多三次；其他原因不重试。单条内容问题仍按 [exceptions.md](../exceptions.md) §1.1 下钻。

## 无登录 Web 索引证据降级（Skill/Agent 层）

若环境有 Web 搜索/打开连接器，可把公开索引作为低成本发现路径，或在 HTTP/SSR/临时浏览器以
`LOGIN_REQUIRED`、`VERIFICATION_REQUIRED`、`ACCESS_RESTRICTED` 或 `PARSER_FAILED` 停止后使用。
Agent 先逐条核对精确账号主页、作者与作品区；`scripts/import_index_snapshot.py` 只做离线结构、域名和字段校验，不能证明 JSON 自报的归属。

索引证据始终为可能陈旧、非穷尽的 `PARTIAL`：作者或页面区域无法确认时不导入，缺失作品 ID/URL 时不伪造。取证等级、日期过滤、profile overlay、Evidence JSON、导入命令和报告限制见
[douyin-index-evidence.md](../douyin-index-evidence.md)。没有连接器或合格公开证据时，不得声称采集成功。

## 平台特有测试样例

> 以下为**适配层路由与字段映射**的验证样例（断言 URL 是否被支持、期望映射字段）。
> 真实网络下抖音大概率返回风控/JS 外壳，对应 `PARSER_FAILED`/`LOGIN_REQUIRED` 等，
> 属预期诚实结果；样例用于校验 `supports` 与映射逻辑，而非保证可公开抓到数据。

| 示例账号主页 URL | `supports()` | 期望 `account_id` 来源 | 期望映射 |
|---|---|---|---|
| `https://www.douyin.com/user/MS4wLjABAAAAxxxx_example_secuid` | `True` | `sec_uid` 落点；若页面含 `unique_id` 则用抖音号 | `account_id`=抖音号/`sec_uid`，`followers`=粉丝，`post_count`=作品数，`platform_metrics.total_likes`=获赞 |
| `https://v.douyin.com/iRjXyKb/` | `True`（短链，best-effort 解析为 `/user/...`） | 同账号主页 | 同上；若短链解析到 `/video/` 则应为 `False` |
| `https://iesdouyin.com/share/user/123456789` | `True`（旧版分享主页） | `uid` / `sec_uid` | 同上 |

拒绝样例（供回归）：

- `https://www.douyin.com/video/7000000000000000000` → `False`（单条作品页）
- `https://www.douyin.com/search?keyword=测试` → `False`（搜索页）
- `https://v.douyin.com/abc123/` 解析落点为 `.../video/...` → `False`（短链指向作品）

预期字段覆盖（`collect_profile` 成功时）：

```json
{
  "platform": "douyin",
  "account_id": "<抖音号 或 sec_uid>",
  "account_name": "<昵称>",
  "profile_url": "<主页 URL>",
  "bio": "<简介 或 null>",
  "verified": false,
  "followers": 12345,
  "post_count": 67,
  "platform_metrics": { "total_likes": 890000, "sec_uid": "...", "unique_id": "..." },
  "collected_at": "2026-07-23T09:00:00+08:00",
  "field_visibility": {
    "account_id": "visible",
    "verified": "visible",
    "followers": "visible",
    "post_count": "visible",
    "total_likes": "visible"
  }
}
```
