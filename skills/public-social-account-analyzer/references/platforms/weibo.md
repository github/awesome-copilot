# 微博适配规则

> `status: P1 experimental`。**不阻塞 MVP 验收**。`weibo.py` 默认启用；设置
> `WEIBO_COLLECTOR_ENABLED=0` 时显式停用，系统返回 `ADAPTER_UNAVAILABLE`，不得假装已采集。

---

## 支持的账号主页

- 数字 UID 形式：`https://weibo.com/u/<uid>`（如 `https://weibo.com/u/1642909335`）
- 昵称形式：`https://weibo.com/<name>`（如 `https://weibo.com/cctvnews`）

> 仅接受账号主页；搜索页、话题页、单条博文页、登录页等不属于适配器支持范围，
> 由编排器路由拒绝（`UNSUPPORTED_PLATFORM`）。`supports(url)` 已实现上述两种主页识别。

### 命名主页 → UID 身份绑定（必须回证）

数字 UID 主页（`/u/<uid>`）直接使用 URL 中的 uid，不解析 HTML。命名主页
（`weibo.com/<name>`）必须从主页 HTML 提取**目标账号**的 uid，并做两步防误绑：

1. **候选锚定**：带登录会话的现代页面会在 SSR 数据里先出现**当前浏览者**的 uid
   （等同于小红书"浏览者 `userInfo.userId`"陷阱）。采集器先取与请求 handle 出现在
   同一短窗（±160 字符）内的 `id`/`uid`/`u/<id>` 作为候选，通用 `"uid"` 只作后援。
2. **`profile/info` 回证**：对每个候选调用 `profile/info?uid=<cand>`，仅当返回用户的
   `domain` 或 `url` 尾部**精确等于请求的 handle**（如 `cctvnews`）才接受。会话主人、
   占位账号或不存在账号都因 url/domain 不匹配而被拒绝。

任何候选都未回证时，任务以 `ACCOUNT_UNAVAILABLE`（身份未回证）如实失败，
**绝不采集回证失败的账号**；回证请求本身遇到登录墙则保留 `LOGIN_REQUIRED`。
匿名访问命名主页拿到登录 stub（无任何 uid 数据）时上报 `LOGIN_REQUIRED`，
而不是误报"找不到账号"。

---

## 账号字段

统一字段 ↔ 微博来源映射：

| 统一字段 | 微博来源 | 说明 |
|---|---|---|
| `account_id` | UID | 微博数字用户 ID（主页 URL 中的 `<uid>`） |
| `account_name` | 名称 | 账号显示名称 |
| `bio` | 简介 | 账号简介 |
| `verified` | 认证 | 认证标识 / 认证文案（`true`/`false` 或文案） |
| `followers` | 粉丝 | 粉丝数量 |
| `post_count` | 微博数 | 微博发布总数 |
| `platform_metrics.following` | 关注 | 关注数（微博特有，置于 `platform_metrics`） |

> `platform_metrics` 账号层微博键：`{ "following": <关注数> }`（与 [collection-schema.md](../collection-schema.md) §4 一致）。

---

## 内容字段

统一字段 ↔ 微博来源映射：

| 统一字段 | 微博来源 | 说明 |
|---|---|---|
| `post_id` | 博文ID | 单条博文唯一标识 |
| `post_url` | 博文 URL | 内容详情页 URL（证据锚点） |
| `published_at` | 发布时间 | 转为 ISO 8601（默认时区 `+08:00`） |
| `content_type` | 媒体类型 | `text` / `image_text` / `video` |
| `title` | 正文首行 | 微博通常无独立标题，取正文首行 |
| `text` | 正文全文 | 博文正文（长文需进详情采集） |
| `hashtags` | 话题 | 由 `#话题#` 形式提取的列表 |
| 发布来源 | 发布来源 | 如「来自 iPhone 客户端」（可存 `platform_metrics`） |

> `content_type` 取值规则：`text`=纯文字/长文；`image_text`=图文；`video`=视频微博。

---

## 公开指标

页面可见的公开互动指标（未展示一律写 `null`，禁止用 `0` 代替未知）：

| 统一字段 | 微博来源 | 说明 |
|---|---|---|
| `shares` | 转发 | 转发数 |
| `comments` | 评论 | 评论数 |
| `likes` | 点赞 | 点赞数 |
| `favorites` | `null` | 微博无「收藏」公开指标，恒为 `null` |

> `views`（浏览）仅在微博公开显示时采集，否则为 `null`。

---

## 特殊处理

- **置顶**：置顶微博标记 `is_pinned = true`，**不混入**近期原创统计（分析层默认排除）。
- **公开标记空值**：`isTop` / `retweeted_status` 等证据缺失时，对应的 `is_pinned` / `is_repost` 保持 `null`；未取得公开投放证据时 `is_promoted=null`。
- **转发微博**：标记 `is_repost = true`，记录原博 URL；转发内容**不作为**本账号原创内容计入分析。
- **长文**：长微博标记 `content_type = text`，完整正文需进入详情采集（`collect_post_detail`）。
- **图文 / 视频**：按媒体类型分类（`image_text` / `video`）；视频微博如需时长可存 `platform_metrics`。

---

## 访问限制识别与显式停用

- **`ADAPTER_UNAVAILABLE`（显式停用）**：`weibo.py` 存在但环境变量令 `ENABLED = False`。
  此时 `collect_profile` / `collect_post_list` / `collect_post_detail` / `check_access`
  一律抛出携带 `ADAPTER_UNAVAILABLE` 的 `RuntimeError`，编排器据此将任务
  `stop_reason = ADAPTER_UNAVAILABLE`、`task_status = FAILED`，**不得**假装已采集、
  不得写入任何空数据行。该状态只属于专用适配器任务；Agent 应把控制权交还公开网页、搜索、浏览器或用户材料等合规路径，不得据此宣布整个用户请求失败。
- **`weibo.py` 完全不存在**：编排器同样判定为 `ADAPTER_UNAVAILABLE`（平台适配器未实现）。
- **访问限制**：若微博要求登录 → `LOGIN_REQUIRED`；出现验证码 / 滑块 →
  `VERIFICATION_REQUIRED`；频控 → `ACCESS_RESTRICTED`；账号不存在 / 封禁 →
  `ACCOUNT_UNAVAILABLE`。**任何情况下都不绕过**登录、验证码、滑块或频控（见
  `references/exceptions.md` 第 2 节通用原则）。
- `collect_comments` 当前返回 `COMMENTS_UNAVAILABLE`；主内容任务仍会如实记录评论不可用。

## 用户授权会话（可选）

匿名公开 AJAX 返回登录标记时，直接引导用户从 `weibo.com` 的 Network 请求头复制完整 `Cookie: ...` 一行并粘贴到对话。JSON 导出只作备用；Agent 将内容写入任务期间的临时文件：

```bash
python3 scripts/collect.py "https://weibo.com/<name-or-uid>" \
  --limit 20 \
  --weibo-cookie-file /run/secrets/weibo-cookies.json \
  --out <NEW_COLLECTION>
```

文件仅允许 `weibo.com` 及子域、限制大小和记录数；值只在当前进程请求头中使用，绝不写入 task.json、报告或日志。Cookie 原文可粘贴到当前对话，但不得回显、转发或放进命令行。显式 `--persist-cookie` 时，Cookie 会落盘到 `workspace/weibo-cookies.json`（权限 `0600`），后续同平台任务自动加载。授权会话失效、出现验证码或频控时仍按对应 stop reason 停止，不尝试生成访客身份或规避验证。

浏览器导出与对话交接的通用指引见 [cookie-guide.md](../cookie-guide.md)。

---

## 平台特有测试样例

> 用于验证 URL 路由与公开字段映射。真实页面仍须完成 P1 实机验收。

1. 央视新闻（昵称主页）：`https://weibo.com/cctvnews`
2. 数字 UID 主页示例：`https://weibo.com/u/1642909335`

验证 `supports()` 行为：

```python
import sys
sys.path.insert(0, "scripts/collectors")
import weibo
c = weibo.WeiboCollector()
c.supports("https://weibo.com/u/1642909335")   # True（u/<uid>）
c.supports("https://weibo.com/cctvnews")        # True（/<name>）
c.supports("https://weibo.com/")                # False（裸域名）
c.supports("https://weibo.com/u")               # False（占位路径）
c.supports("https://weibo.com/search/")          # False（非账号主页）
c.ENABLED                                        # True（P1 默认启用）
```
