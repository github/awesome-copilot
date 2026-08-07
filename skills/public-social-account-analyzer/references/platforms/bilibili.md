# B站适配规则

> 本文件是 `scripts/collectors/bilibili.py` 的当前字段与停止语义。历史探针记录不作为运行合同；统一字段定义以 [data-schema.md](../data-schema.md) 为准。

## 支持的账号主页

- 接受：`https://space.bilibili.com/<uid>`，`<uid>` 必须为数字；查询参数可忽略。
- 拒绝：视频详情页、搜索页、动态详情页和非 HTTPS 地址；它们不是账号采集入口。

## 字段映射

| 对象 | 统一字段 | 公开来源 | 规则 |
| --- | --- | --- | --- |
| 账号 | `account_id`、`account_name`、`bio`、`verified` | UID、`card.mid/name/sign/official` | 不可见为 `null` |
| 账号 | `followers`、`post_count` | `card.fans` / `data.follower`、`data.archive_count` | 不用已枚举样本数回填总数 |
| 作品 | `post_id`、`post_url`、`title`、`text`、`published_at`、`duration_seconds` | BV 号、视频页、`title/desc/pubdate/duration` | 时间规范为 `+08:00` ISO 8601 |
| 作品 | `content_type`、`hashtags` | 投稿/动态、`tag_name` 与公开 `#标签#` | 标签和动态证据按实际可见范围保留 |
| 指标 | `views`、`likes`、`coins`、`favorites`、`comments`、`danmaku`、`shares` | `stat.view/like/coin/favorite/reply/danmaku/share` | 未展示为 `null`，不写 `0` |

## 采集与合并规则

1. 常规投稿首选 `medialist/resource/list`；无条目且未遇平台保护时，才降级到 WBI `arc/search`。不把搜索结果或空间动态 feed 当作默认的第三条常规投稿路径。
2. `medialist` 的分页锚点可能重复；按 BV first-wins 去重后才计算 `limit`、输出行数和覆盖率。
3. 动态发现先于逐条标签补充。与投稿重复的 BV 以投稿详情为主；动态仅补充 `appeared_in_dynamic_feed` 与其实际可见指标。
4. 置顶、合集、转载和详情不可用均按 `platform_metrics`、三态字段及条目状态表达，不能通过猜测补齐。
5. 未观察到可信末页时，结果只能是样本或 `PARTIAL`；不能称为全部投稿。

## 用户授权 Cookie：收益与边界

- 默认仍使用匿名公开路径。用户自愿提供其当前 B站网页会话 Cookie 后，采集器把它仅注入该任务的内存会话，可在匿名请求被要求登录、会话资格不足或 WBI/搜索路径对 Cookie 有要求时，提高可读取性和列表/详情字段的稳定性。
- Cookie 不会扩大研究范围：只能读取该用户在浏览器中本来可见的内容；不读取私信、后台数据或其他非公开账号能力，也不保证能拿到更多公开字段。
- 登录墙、验证码、滑块、`-799`、`-412`、WAF 或其他平台保护仍按下表立即停止。
- 显式 `--persist-cookie` 时，Cookie 会落盘到 `workspace/bilibili-cookies.json`（权限 `0600`），后续同平台任务自动加载。交接格式、自动加载与销毁规则见 [cookie-guide.md](../cookie-guide.md)；CLI 使用 `--bilibili-cookie-file <temporary-path>`，完整采集入口也会把同一路径传给每个独立 attempt。

## 第 3 层：平台保护停止策略

同一任务收到平台保护后立即停止，不切换 Cookie、出口、User-Agent、端点链或浏览器来继续访问。完整采集编排仅对明确频控/访问限制以新目录在 30 秒、60 秒后有界重试；已有条目保留为部分证据。

| 现象 | `stop_reason` | 处理 |
| --- | --- | --- |
| 登录墙 | `LOGIN_REQUIRED` | 停止并保留已有数据 |
| 验证码或滑块 | `VERIFICATION_REQUIRED` | 立即停止 |
| `-799` / 明确频控 | `RATE_LIMITED` | 停止；完整编排可按有界冷却新建任务 |
| `-412`、`-403`、`-400`、`-101` 或 WAF | `ACCESS_RESTRICTED` | 停止，不绕过 |
| 账号资料 `-404` | `ACCOUNT_UNAVAILABLE` | 停止账号任务 |
| 单条详情 `-404` | 条目 `DELETED` | 保留列表证据，继续其他条目 |
| 普通单条详情解析失败 | 条目 `PARTIAL` | 记录详情不可用，继续其他条目 |

## 验收样例

使用任意合法数字 UID 的公开主页，验证账号字段、最近 30 条作品、三态指标、置顶/转载标记与受限停止。真实页面可用性随平台变化；当前线上结果不能替代离线合同或人工字段抽查。
