# 文档填写接口（llm-office）

网关 base：`https://www.llmfill.com`，认证头 `X-Auth-Token: aif_xxx`。

## 流程

```
POST /v1/documents/upload     -> {batch_id, tasks}   （余额不足 402 拒单）
GET  /v1/documents/{batch_id}/status   （轮询，3-5s 间隔；tasks[].cost = 实扣）
GET  /v1/documents/{batch_id}/result[?clean=true]   （下载）
DELETE /v1/documents/batches/{batch_id}   （清理）
```

> 费用链路：余额不足时上传即被拒（402，message 含预估费用与充值指引，
> 批次不建、算力不跑）；余额够则正常入队，实扣金额在完成后的 status
> 响应 `tasks[].cost`（按真实 token 用量计费，与 auth-service 记账同值）。

## POST /v1/documents/upload

multipart/form-data：

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `files` | ✅ | - | .docx 文件列表（可多个） |
| `answer_source` | ❌ | `hybrid` | `knowledge_base` / `internet` / `hybrid` / `llm_only` |
| `kb_ids` | ❌ | `[]` | 知识库 ID 列表的 JSON 字符串，如 `["kb-1","kb-2"]` |
| `mode` | ❌ | `fast` | `fast` / `economy` |

响应：`{batch_id, status: "pending", total_count, tasks: [...]}`

- 余额不足（含透支额度）时 402 拒单：
  `{"detail": "余额不足：本次预估费用 1.34 元，可用额度不足，请充值后再试（充值地址 https://www.llmfill.com/profile）"}`
  （网关包装为 `INSUFFICIENT_QUOTA`，message 原样透传）
- 实扣金额在处理完成后的 status 响应 `tasks[].cost`（按真实 token 用量
  × 单价 × 利润倍数），以它为准向用户汇报。

## GET /v1/documents/{batch_id}/status

批次聚合状态（响应 `tasks[].cost` 为该任务**实扣金额**：finalize 阶段按
真实 token 用量算出，与 auth-service 记账同值；预估见独立 `/estimate`
端点，不在 upload 响应里）：

| status | 含义 |
|--------|------|
| `pending` | 排队中 |
| `processing` | 处理中（`progress` 0-100） |
| `completed` | 全部完成 |
| `partial` | 部分成功（可下载已完成部分） |
| `failed` | 全部失败 |

任务内有 5 个阶段：`upload -> generate_questions -> retrieve_questions -> fill_answers -> finalize`，
`stages.*.question_count` 可看生成的问题数。任务超时（2h）会在查询时标记 failed。

## GET /v1/documents/{batch_id}/result

- 1 个完成任务 -> 单 `.docx` 文件流
- 多个 -> `.zip`
- `?clean=true` -> 纯净版（去除颜色标注）
- 文件名在 `Content-Disposition` 头
- 批次未完成时返回 400

## POST /v1/documents/estimate（独立端点）

multipart 同 upload（只传 files），响应 `{total_cost, breakdown: [{filename, chars, cost}]}`。
与后端入队前余额校验同口径。**upload 响应不含 cost_estimate**——fill 命令在
提交前会先调用本端点拿预估并展示（best-effort，失败不阻塞提交）；前端上传前的
费用确认页也在用此端点。

## 计费

按文档正文字符数×单价（页计费，0.2 元/页级别）。入队前余额不足会被
`precheck` 拒单（`INSUFFICIENT_QUOTA`）。处理完成后由 auth-service 记账扣费。
