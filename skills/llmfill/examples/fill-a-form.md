# 示例：端到端填写一份 Word 表单

场景：用户说"帮我用 AI 填一下这份《供应商尽调问卷.docx》，答案尽量从我们的
知识库里找"。

> ⚠️ **隐私提示**：`fill` 会把 Word 文档内容 + 挂载的知识库内容上传到
> `llmfill.com` 远程处理。上传前请确认有权外发这些内容；涉及机密、个人数据、
> 受监管或内部文档时，先征得授权或先脱敏，不要直接上传。

## 1. 确认配置（首次）

```bash
$ python scripts/llmfill.py config
  粘贴 aif_ 开头的令牌: aif_xxx…
配置完成并验证通过：账号 j***@gmail.com，user_id=u-123，余额 8.8
```

## 2. （可选）先看有哪些知识库可用

```bash
$ python scripts/llmfill.py kb ls --json
{"total": 1, "kbs": [{"kb_id": "kb-2026", "name": "公司资质资料", "document_count": 6}]}
```

## 3. 填写

```bash
$ python scripts/llmfill.py fill 供应商尽调问卷.docx --kb kb-2026 --source hybrid
已提交批次 b_9f2a（1 个文件），预估费用约 0.3 元（实际以处理结果为准），开始轮询处理进度…
  进度 35%（0/1 完成）
  进度 80%（0/1 完成），阶段：填写答案
处理完成（completed），实际费用 1.28 元，结果已下载：/path/to/供应商尽调问卷_processed.docx、/path/to/供应商尽调问卷_clean.docx
```

费用三个节点：提交后即打印预估费用（参考）；余额不足时上传即拒（402，message
含预估费用与充值地址）；完成后 fill 返回 `actual_cost`（实扣金额），汇报以此为准。

- 默认同时下载标注版（`_processed.docx`）与纯净版（`_clean.docx`）；只要纯净版加 `--clean`
- 一次多份：`fill a.docx b.docx c.docx`（结果打包 zip）
- 不自动下载：`--no-download`，之后 `fill-download b_9f2a`

## 4. 处理中断了？

命令轮询 30 分钟超时后退出，批次仍在服务端继续处理：

```bash
$ python scripts/llmfill.py fill-status b_9f2a
批次 b_9f2a：processing（进度 60%，完成 0/1，失败 0）

$ python scripts/llmfill.py fill-download b_9f2a --out ./结果/
已下载：./结果/供应商尽调问卷_processed.docx、./结果/供应商尽调问卷_clean.docx
```

## 5. 处理完的批次不想要了

```bash
# 注意：删除会同时删掉服务端结果文件，下载要趁早
$ python scripts/llmfill.py fill-status b_9f2a   # 确认 completed/failed/partial（进行中不可删）
# 批次删除无专用子命令时，用 HTTP：
# DELETE /v1/documents/batches/b_9f2a
```
