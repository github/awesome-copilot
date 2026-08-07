# 小红书公开账号适配规则

> `status: P1 experimental`。本适配器只读取直接打开的公开账号主页中已经嵌入的
> JSON/SSR 状态；它兼容旧版状态脚本和现代 `window.__INITIAL_STATE__`，不请求签名或私有接口，
> 不主动登录，也不处理验证码、滑块或频控。
> 带 Cookie 的直接 HTTP 页面出现登录墙或缺少状态时，最多使用一次隔离临时浏览器渲染同一主页；
> 页面没有给出可核验状态时安全停止，不把空结果写成成功。

## 用户授权会话（可选）

匿名页面要求登录时，直接引导用户从 `xiaohongshu.com` 的 Network 请求头复制完整 `Cookie: ...` 一行并粘贴到对话。JSON 导出只作备用；Agent 将内容写入任务期间的临时文件：

```bash
python3 scripts/collect.py "https://www.xiaohongshu.com/user/profile/<user_id>" \
  --limit 20 \
  --xiaohongshu-cookie-file /run/secrets/xiaohongshu-cookies.json \
  --out <NEW_COLLECTION>
```

文件仅允许 `xiaohongshu.com` 及子域、限制大小和记录数；值只在当前进程的直接请求和一次隔离浏览器
渲染中使用，绝不写入 task.json、报告或日志。Cookie 原文可粘贴到当前对话，但不得回显、转发或放进命令行。
显式 `--persist-cookie` 时，Cookie 会落盘到 `workspace/xiaohongshu-cookies.json`（权限 `0600`），后续同平台任务自动加载。
浏览器渲染仍使用部署环境的网络和临时浏览器状态，因此 Cookie 不能保证云端可访问；会话失效或页面出现验证时
立即停止。该模式不调用签名或私有接口，也不处理验证码、滑块或短链跳转。

浏览器导出与对话交接的通用指引见 [cookie-guide.md](../cookie-guide.md)。

## 支持的公开 URL

- 账号主页：`https://www.xiaohongshu.com/user/profile/<user_id>`
- 笔记详情：`https://www.xiaohongshu.com/explore/<note_id>`

专用采集器只接受 HTTPS 直接 URL；搜索页、发现页、话题页、主页裸域名和带凭据/端口的 URL
均不进入采集。账号名到候选主页的发现与身份核验由 `SKILL.md` 的四平台通用规则处理，平台适配器
不猜测账号 ID。账号或笔记分享短链可用于发现规范主页，但不能作为逐条复制作品的默认工作流。
查询参数、片段和页面中的 `xsecToken` 不写入产物。

## 可采公开字段

| 对象 | 统一字段 | 页面状态字段示例 | 规则 |
|---|---|---|---|
| 账号 | `account_id`、`account_name`、`bio`、`followers`、`post_count` | 主页路径 ID；`userPageData.basicInfo` 与 `interactions` | 目标 ID 只取规范主页路径；`userInfo.userId` 可能是浏览者，不能覆盖目标 |
| 笔记 | `post_id`、`post_url`、`title`、`content_type`、`is_pinned` | `notes[*].noteCard` 与外层 `id` | 页面给出真实 ID 时生成绑定 URL；ID 留空时见下方主页卡片规则 |
| 指标 | `likes`、`favorites`、`comments`、`shares`、`views` | `interactInfo.likedCount` 或旧版对应字段 | 指标不可见为 `null`，不能推测或用 0 代替 |

`follows`、`redId` 与主页“获赞与收藏”分别保存到 `platform_metrics.following`、
`platform_metrics.red_id` 和 `platform_metrics.likes_and_favorites`。

现代匿名主页可能一次嵌入数十张笔记卡片，却把每张卡的 `noteId` 留空。此时保留整批标题、类型、
置顶状态和可见点赞，使用确定性的 `xhs-card-*` 本地记录键；`post_url=null`，主页作为
`source_url`，并固定记录 `collection_source=xiaohongshu_profile_cards`、
`platform_post_id_known=false`、`local_record_key=true`、`item_url_known=false`。这些记录均为
`PARTIAL`，能支持主页样本内的选题观察，不能充当单篇作品证据。页面给出真实 ID 时仍按真实 ID
生成规范作品 URL。两种列表都只代表该次主页实际嵌入的样本：没有可信分页末页合同，不得称为
“全部笔记”或用它生成账号全周期发布节奏。

## 受限与评论

- 页面出现登录提示：`LOGIN_REQUIRED`；带 Cookie 时，只有 `LOGIN_REQUIRED` 或 `PARSER_FAILED` 可对同一
  主页尝试一次浏览器渲染。验证码或滑块：`VERIFICATION_REQUIRED`，不启动浏览器降级且立即停止。
- HTTP 404：`ACCOUNT_UNAVAILABLE`；其他 HTTP/网络限制：`ACCESS_RESTRICTED`；没有可核验嵌入状态：`PARSER_FAILED`。
- `collect_comments` 当前返回 `COMMENTS_UNAVAILABLE`；开启 `--comments` 时主内容任务仍会如实记录评论不可用，不得伪造空评论成功。

## 验收边界

离线测试验证新旧状态、JavaScript `undefined`、浏览者/目标身份隔离、外来卡片拒绝、本地记录键、
空值、指标映射与安全停止。真实匿名主页已验证可一次解析公开资料和一批卡片；正式提升成熟度前
仍需至少两个账号完成人工字段抽查、Cookie 正向验收、受限页面和四类输出检查。页面结构变化后
应立即停用或修复适配器，而不是补造字段。
