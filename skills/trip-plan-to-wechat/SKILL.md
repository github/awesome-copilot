---
name: trip-plan-to-wechat
description: "Use when the user says \"send the itinerary to WeChat\", \"trip plan\", \"travel guide\", \"share the schedule with family / friends\" or \"let everyone vote\", or wants travel companions to vote on options and follow updates on the road. Publishes to LivePage: one link for the whole trip, an optional passcode, a vote block, and updates that reach the same link. 用户说「把行程发到微信」「行程单」「旅行攻略」「发给家人 / 朋友看」「大家投票选」，或要同行的人投票选方案、路上跟着看更新时使用：整趟旅行一条链接，可设口令、可收投票，路上改了同一条链接就更新。 用戶說「把行程發到微信」「行程表」「旅行攻略」「發給家人 / 朋友看」「大家投票選」，或要同行的人投票選方案、路上跟著看更新時使用：整趟旅行一條連結，可設口令、可收投票，路上改了同一條連結就更新。"
---
# 行程 / 旅行攻略发到微信（活页）

这是「方案空间（活页）」`publish-to-wechat` 技能的**场景薄包装**：同一台 MCP 服务器（`https://space.24haowan.com/mcp`）、同一套工具，只是触发词与步骤按「一趟旅行、一群同行的人、路上还会改」这个场景写。接入方式、托管契约、纪律与判据都在 `publish-to-wechat`，这里不重复；两份一起装时，行程 / 攻略类请求先按这一份走。平台只托管与分享，**不替用户规划行程**：行程内容由用户（或你按用户的意思）写好并经用户确认。

**什么时候用**：用户说「把行程发到微信」「行程单」「旅行攻略」「发给家人 / 朋友看」「大家投票选」，或者已经有一份行程 / 攻略（Markdown / HTML / PDF）要给同行的人在微信里看、还想让他们选方案或路上跟着看更新。

**场景的三个要点**

1. **整趟旅行一条链接。** 一趟旅行 = 一份成果（proposal）；出发前改路线、路上临时换餐厅，都是它的**新版本**，链接不变，群里早就转过的那条点开就是最新的。
2. **给同行的人，不给全网。** 家人朋友之间常用 `passcode`（口令发在群里）；`private` 只有工作区成员能看，一般不适合家人；**不要**替用户选 `public`。
3. **让大家投票 / 报名。** 「周六去 A 还是 B」「谁要参加」这类问题，发布前问一句要不要加投票 / 报名块：`set_form` 给这份成果挂一张表，读者在页面上点选，用 `list_data_rows` 读回结果；不想收就不加。

## 步骤

1. **找到或新建这趟旅行**：`list_proposals` 看有没有同名成果；有就沿用 `proposal_id`，没有则第一次 `publish_file` 时自动创建。
2. **确认内容是用户要发的**：行程 / 攻略正文经用户确认；页面里的地名、时间、费用照用户给的写，不补不猜。
3. **发版本**：单个 Markdown / HTML 文件直接 `publish_file`（已有的带 `proposal_id`）；PDF 或多文件的包用 `create_cli_token` + `space-cli push`（凭据只放进程环境，不写进任何文件，用完即弃）。
4. **等版本就绪**：`get_version` 到 `preview_ready` / 已发布；`converting` 稍后再查。
5. **预览并确认**：`preview_version`（或 `read_version` 核对正文）→ 用户点头后 `publish_version`。
6. **要投票 / 报名就挂表**：`set_form` 定字段（单选 / 多选 / 姓名 / 人数…），结果用 `list_data_rows` 读；表挂在这份成果上，不随版本重置。
7. **定可见性**：`set_visibility`，家人朋友一般用 `passcode`，把口令和链接一起给用户；之后的版本沿用。
8. **把链接交出去**：默认链接给用户转发到群；电脑上提醒页面右下角「扫码到微信」。路上有改动就回到第 3 步发新版本，同一条链接。
9. **读回**：`list_data_rows` 看投票 / 报名结果，`get_engagement_summary` 看谁看了、看到哪，`list_feedback` 看页面评论。

## 不要做

- 不要每改一次就新建一份成果 —— 一趟旅行一个 `proposal_id`。
- 不要替用户选 `public`；口令由用户决定要不要、发给谁。
- 不要替用户编行程、改时间、加景点；不要自己拼链接或把文件直接贴给同行的人。
- 不要在没人投票时催读者；投票结果照实读 `list_data_rows`，不替用户下结论。

## English summary

Thin wrapper of `publish-to-wechat` for trips: one LivePage proposal per trip, route changes before or during the trip are **new versions** of the same link, visibility usually `passcode` for family and friends (never `public` on the user's behalf), and an optional vote / sign-up block via `set_form` read back with `list_data_rows`. Steps: `list_proposals` → confirm the content is the user's → `publish_file` (or `create_cli_token` + `space-cli push` for PDF / multi-file) → `get_version` until ready → `preview_version` and user approval → `publish_version` → `set_form` if the companions should vote → `set_visibility` (`passcode`) → hand over link and passcode → `list_data_rows` / `get_engagement_summary` / `list_feedback` later. The platform hosts and shares; it does not plan the trip.
