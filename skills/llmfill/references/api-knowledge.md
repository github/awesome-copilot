# 知识库接口（raglite）

网关 base：`https://www.llmfill.com`，认证头 `X-Auth-Token: aif_xxx`。

> 网关只暴露网页前端在用的知识库接口。**不提供检索（search）与任务查询
> （tasks）**：检索是服务端填写链路的内部行为；入库进度由文档列表的
> `parse_status` 派生。

## 知识库管理

| 方法 | 网关路径 | 说明 |
|------|---------|------|
| POST | `/v1/knowledge-bases` | 创建，body `{name, description?}` -> `{kb_id}` |
| GET | `/v1/knowledge-bases` | 列出当前用户所有 KB（含 document_count） |
| PUT | `/v1/knowledge-bases/{kb_id}` | 更新名称/描述（未传字段保持原值） |
| DELETE | `/v1/knowledge-bases/{kb_id}` | 删除 KB 及所有数据（不可逆） |
| GET | `/v1/knowledge-bases/{kb_id}/documents` | 列文档（含 parse_status） |

配额：每用户 10 个 KB（`QUOTA_EXCEEDED`）。

## 文档入库（异步）

`POST /v1/knowledge-bases/{kb_id}/documents`，multipart：
- `file`：文件（PDF/Markdown/TXT 等，单文件 ≤10MB）
- kb_id 已在路径上，无需 form 传

响应 `{task_id, status: "pending"}`。

**入库进度看文档列表**（不是任务接口）：轮询
`GET /v1/knowledge-bases/{kb_id}/documents`，按文件名找到新文档，其
`parse_status`：
- `parsing`：解析中，继续轮询
- `completed`：入库完成，可被填写挂载检索
- `failed`：解析失败，可删除后重传

配额：每 KB 10 个文件（`QUOTA_EXCEEDED`）。

## 文件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/knowledge-bases/{kb_id}/files/{document_id}/download` | 下载原文件 |
| DELETE | `/v1/knowledge-bases/{kb_id}/files/{document_id}` | 删文件及向量数据 |

`document_id` 从文档列表获取。

> ⚠️ **删除不可恢复**：`DELETE /v1/knowledge-bases/{kb_id}/files/{document_id}`
> 会**同时删除原文件与已解析的全部向量/索引数据**，且无软删除、无回收站，
> 无法恢复。删除前请确认本机留有源文件副本（必要时先用 download 接口导出）；
> CLI 侧 `llmfill kb rm` 会要求交互确认或显式 `--yes`，直接调 API 则没有这层保护。

## 与填写的配合

知识库建好后，`fill --kb <kb_id>` 挂载给文档填写使用（服务端在
retrieve 阶段检索知识库取答案）。`--source knowledge_base` 强制只用
知识库答案（可溯源），`hybrid` 联网补充，`llm_only` 忽略知识库。
