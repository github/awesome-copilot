---
name: llmfill
description: |
  AI Word form filling — auto-fill any .docx form, questionnaire, survey, or template using reference documents, a knowledge base, or web search. Complete DDQs, due diligence questionnaires, compliance forms, applications, and checklists automatically. Built for document automation and batch form completion.
# 机器可读权限声明（最小权限范围，工具/平台可据此做准入校验）
permissions:
  network:
    hosts: [ "https://www.llmfill.com", "https://llmfill.com" ]   # 唯一默认端点；自定义 origin 需用户显式批准
    purpose: 上传待填文档/知识库资料，下载填写结果
  file_read:
    paths: [ "用户指定的 .docx 表单与参考文档", "~/.llmfill/config.json" ]
  file_write:
    paths: [ "用户指定输出目录（填写结果 .docx）", "~/.llmfill/（配置与缓存）" ]
  env:
    vars: [ "LLMFILL_BASE_URL", "LLMFILL_API_KEY", "LLMFILL_ALLOW_INSECURE_HTTP", "LLMFILL_API_TOKEN" ]
  shell:
    commands: [ "python scripts/llmfill.py" ]   # 仅此一个入口脚本，纯标准库
---

# LLMFill Skill

## 何时使用

当用户需要 **AI 自动填写 Word 文档 (.docx) 中的表单、问卷、清单、模板**，
且答案需要从参考资料、知识库或联网搜索中提取时，使用本 skill。

**触发场景（出现以下说法即适用）：**

中文：

- "帮我填一下这个 Word 文档 / 把这个 docx 填了"
- "根据这份资料填写模板 / 照着 A 文档填 B 文档"
- "尽职调查问卷 / DDQ 填写"
- "合规问卷 / 调查表 / 申请表 自动填写"
- "批量填表 / 自动作答 / AI 填表"
- "建个知识库 / 把这些资料上传给 AI 用"
- "用知识库回答问题 / 基于资料答题"

English:

- "Fill out this Word form / questionnaire / checklist"
- "Auto-fill this docx template using reference documents"
- "Complete a DDQ / due diligence questionnaire"
- "Fill forms from a knowledge base"
- "AI form filling / document auto-completion"
- "Batch fill multiple Word documents"
- "Extract answers from PDFs and fill Word forms"
- "Build a knowledge base for answering forms"

**不适用场景：**

- 简单的 `{{占位符}}` 文本替换
- 纯本地处理、不允许文档上传到第三方服务的场景

**核心命令映射：**

- 填写文档 -> `fill`
- 建知识库 -> `kb create` + `kb upload`
- 查余额/令牌状态 -> `whoami`
- 接口发现 -> `discover`

## 安全与数据处理

**必读：本 skill 会将用户文档上传至 LLMFill 远程服务 (llmfill.com)。**

**权限边界（最小化声明）**——本 skill 仅需要以下能力，不应越界：

- **网络**：仅访问 `https://www.llmfill.com`（自定义端点须显式批准，见下）
- **文件读**：仅用户指定的 .docx / 上传文件路径
- **文件写**：仅 `~/.llmfill/`（配置/缓存）与结果下载目录
- **环境变量**：`LLMFILL_API_KEY` / `LLMFILL_BASE_URL` / `LLMFILL_ALLOW_INSECURE_HTTP`
  / `LLMFILL_API_TOKEN`（`--token-env` 仅接受这两个令牌变量名，不读取其它变量）
- **Shell**：仅运行本目录 `scripts/llmfill.py`（Python 3.10+ 标准库，零第三方依赖）

- **数据上传提示**：执行 `fill`、`kb upload` 等上传命令前，如文档包含机密、受监管或内部敏感信息，必须先确认用户同意将该文档发送到
  llmfill.com 服务器处理。
- **API 凭证管理**：API 令牌（`aif_` 开头）为长效凭证，必须安全存储。
    - 令牌落于 `~/.llmfill/config.json`（权限 600），由**用户本人**配置，agent 全程不接触令牌。
    - 令牌泄露时立即到 https://www.llmfill.com/profile 删除并重建
- **服务端点**：默认锁定 `https://www.llmfill.com`。改用自定义地址（自建/代理）须
  `config --base <url> --allow-custom`（或交互式确认）显式批准，批准绑定到精确
  origin 并持久化；必须为 HTTPS（本地明文 HTTP 测试需设 `LLMFILL_ALLOW_INSECURE_HTTP=1`）。
- **知识库删除**：执行 `kb rm` 前确认目标知识库 ID，删除不可恢复；命令内置确认（交互环境需输入 y，非交互环境必须带 `--yes`）。
- **结果校验**：AI 生成的填写内容可能有误差，正式使用前请人工复核。

## 首次配置（必须）

**第一步：确认运行通道**

```bash
python --version 2>/dev/null || python3 --version 2>/dev/null
```

- **有 Python（3.10+）**-> 用下方 CLI 命令（推荐：自动轮询/下载/错误解析）
- **无 Python** -> 用 curl 直接调 API，完整操作手册见 `references/curl-guide.md`
  （curl 在 Windows 10+/Linux/macOS 均自带，功能完全等价）

**第二步：配置 API Key**

> **agent 场景（默认运行方式）——不要碰令牌**：让**用户本人**在终端跑一次
> `python scripts/llmfill.py config`（getpass 交互，令牌不进聊天/日志），或直接
> 把令牌写进 `~/.llmfill/config.json` 的 `api_key` 字段。配置完后续所有命令
> （fill / kb / whoami）自动读该文件，agent 全程无需接触令牌。

仅当你在自己的 shell / CI 里、令牌已作为**真实环境变量**存在时：

```bash
python scripts/llmfill.py config --token-env LLMFILL_API_TOKEN
```

（`--token-env` 读的是真实环境变量，避免令牌出现在命令行历史；agent 平台的
secrets 不会注入本地脚本，故 agent 场景请走上面的「用户本人配置」，勿用此命令。）

令牌获取：引导用户去 https://www.llmfill.com/profile 注册登录 ->「API 密钥」
-> 创建令牌 -> 复制 `aif_` 开头字符串（忘记可随时点"查看令牌"再次获取，令牌永久不变）。

配置存于 `~/.llmfill/config.json`（权限 600）。**服务地址默认内置
`https://www.llmfill.com`，无需输入**；自建/代理部署改用 `--base` 指定自定义
地址，并加 `--allow-custom` 显式批准（或交互式确认），批准结果持久化到
`approved_origins`。直接编辑 `base_url` 字段、或只设 `LLMFILL_BASE_URL` 不会
生效（fail-closed，防令牌/文档被静默发往第三方）。本地明文 HTTP 测试需设
`LLMFILL_ALLOW_INSECURE_HTTP=1`。

注意：注册新用户（邮箱验证）必须在网页完成，无法通过本 skill 注册。

## 核心命令

所有命令加 `--json` 可获得机器可读输出（推荐 agent 使用）。

```bash
# 智能填写：上传 -> 自动轮询 -> 下载结果到模板所在目录
python scripts/llmfill.py fill 表单.docx
python scripts/llmfill.py fill 尽调问卷.docx --kb kb-xxx --source hybrid
python scripts/llmfill.py fill a.docx b.docx --clean          # 只下纯净版（默认两个版本都下）
python scripts/llmfill.py fill-status b_xxx                   # 查批次进度
python scripts/llmfill.py fill-download b_xxx --clean --out ./结果/

# 知识库
python scripts/llmfill.py kb ls                               # 列出
python scripts/llmfill.py kb create --name "公司资料" --desc "..."
python scripts/llmfill.py kb upload kb-xxx 资料.pdf 手册.docx  # 入库（自动轮询）
python scripts/llmfill.py kb docs kb-xxx                      # 列文档（含入库状态）
python scripts/llmfill.py kb rm kb-xxx --yes                  # 删除（不可恢复，非交互须 --yes）

# 账号
python scripts/llmfill.py whoami                              # 令牌自检 + 余额
python scripts/llmfill.py discover                            # 接口自动发现
```

## 关键语义

- **计费**（按 token 用量）：费用知情的三个节点--
  ① **提交后**：fill 立即打印「预估费用约 X 元（实际以处理结果为准）」，
  取 upload 响应的 `cost_estimate`，与后端入队前校验同口径；
  ② **上传时**：余额不足 llm-office 入队前直接拒单（402 `INSUFFICIENT_QUOTA`），
  message 含本次预估费用与充值指引；
  ③ **完成时**：实扣金额从 status 的 `tasks[].cost` 提取，fill 返回
  `actual_cost`，**向用户汇报以它为准**。不会白跑算力。
- **答案来源** `--source`：`knowledge_base`（仅知识库）/ `internet`（联网）/
  `hybrid`（混合，默认）/ `llm_only`（纯大模型，忽略 kb）。
- **异步与完成通知**：fill 与 kb upload 是异步任务，命令内部自动轮询（约
  30 分钟超时），**无需用户/agent 手动建轮询 automation**——fill 单条命令
  完成「上传 → 轮询 → 下载 → 主动汇报实际费用与结果绝对路径」，完成即报告。
  kb upload 的入库进度由文档列表 `parse_status` 派生（kb docs 可查）。
- **阶段进度**：处理分 5 阶段 `upload → generate_questions → retrieve_questions
  → fill_answers → finalize`，其中 `retrieve_questions`（检索知识库）最耗时，
  进度可能长时间停在 60% 附近——这是正常的检索等待，不是卡死。fill 会在进度
  后附带「阶段：检索知识库」提示（服务端 status 的 `tasks[].stages` 提供）。
- **结果路径**：fill 默认下载到**第一个模板所在目录**（`--out` 覆盖），并**同时
  下载标注版（`_processed.docx`）与纯净版（`_clean.docx`）两个文件**，完成时打印
  两个绝对路径；`--clean` 只下纯净版。
- **认证**：所有请求带 `X-Auth-Token: aif_xxx` 头（不是 Authorization: Bearer）。

## 排错

- `INVALID_TOKEN`：令牌无效/已删除 -> 重新 `config`（网页上删除令牌会使其立即失效；令牌永久有效、可反复查看，不存在"重置"）
- `NETWORK_ERROR`：base URL 不通或服务维护
- `QUOTA_EXCEEDED`：知识库数/文件数超上限（默认 10 个/库）
- `FILE_TOO_LARGE`：单文件超 10MB
- `METHOD_NOT_ALLOWED` / `NOT_FOUND`：接口不存在（如试图直接检索--本 skill 不提供）
- 完整错误码表见 `references/errors.md`

## 深入阅读（按需加载）

- `references/curl-guide.md` - **无 Python 环境的 curl 操作指南**（等价功能）
- `references/api-documents.md` - 文档填写接口详解
- `references/api-knowledge.md` - 知识库接口详解
- `references/api-account.md` - 账号/配置/whoami
- `references/errors.md` - 统一错误码表
- `examples/fill-a-form.md` - 端到端填写示例（含轮询细节）
- `examples/build-kb.md` - 建库-入库示例
