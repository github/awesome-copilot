# 示例：从零建知识库供 AI 填写使用

场景：用户说"把这几份产品手册传上去，之后填表时让 AI 从里面找答案"。

> ⚠️ **隐私提示**：`kb upload` 会把资料文件上传到 `llmfill.com` 存储并用于
> 后续检索。上传前请确认有权外发这些内容（产品手册等可能含内部信息）；机密、
> 个人数据、受监管文档不要直接上传，先脱敏或征得授权。

## 1. 建库

```bash
$ python scripts/llmfill.py kb create --name "产品资料" --desc "产品手册与政策文档"
已创建知识库 kb-7c3e（产品资料）
```

## 2. 上传资料（自动轮询入库状态）

```bash
$ python scripts/llmfill.py kb upload kb-7c3e 手册A.pdf 手册B.md
手册A.pdf：已提交，轮询入库状态…
手册A.pdf：入库完成（可检索）
手册B.md：已提交，轮询入库状态…
手册B.md：入库完成（可检索）
```

入库进度由文档列表 parse_status 派生（服务端异步解析、分块、向量化）。
单文件 ≤10MB，每库默认 10 个文件（`QUOTA_EXCEEDED` 时先删旧）。

## 3. 确认入库状态

```bash
$ python scripts/llmfill.py kb docs kb-7c3e
知识库 kb-7c3e 共 2 个文档：
  a1b2c3d4e5f6…  手册A.pdf（completed）
  9f8e7d6c5b4a…  手册B.md（completed）
```

`parsing` = 还在解析；`failed` = 解析失败，删除后重传。

## 4. 填表时挂载知识库

```bash
$ python scripts/llmfill.py fill 退货申请表.docx --kb kb-7c3e --source knowledge_base
费用预估：0.3 元（后端按页计费，实际以处理结果为准）
已提交批次 b_9f2a（1 个文件），开始轮询处理进度…
处理完成（completed），结果已下载：./退货申请表_processed.docx、./退货申请表_clean.docx
```

`--source knowledge_base` 强制只从知识库取答案（可溯源）；`hybrid`
会联网补充；`llm_only` 忽略知识库纯用大模型。
