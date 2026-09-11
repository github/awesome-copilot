# 无 Python 环境的 curl 操作指南

> 本指南用于**本机没有 Python** 时：agent 直接用 Bash + curl 调用网关 API
> 完成全部功能（curl 在 Windows 10+/Linux/macOS 均自带）。有 Python 时
> 优先用 `scripts/llmfill.py`（自动轮询/下载/错误解析，体验更好）。

> ⚠️ **隐私与数据外发**：以下所有操作都会把**文档内容 + 你的 API 令牌**
> 发送到 `https://www.llmfill.com` 远程服务器处理/存储。上传前请确认你有权
> 外发这些内容；**不要上传**机密、个人敏感数据、受监管或仅限内网的文档。
> 令牌为明文长效凭证，请勿写进 shell 历史、截图、备份或代码仓库；泄露后立即到
> 个人中心删除重建。

> 🔒 **agent 执行门（必须遵守）**：本指南中的 curl 命令不得由 agent 未经确认
> 直接执行。任何会**上传文件或发送令牌**的命令（POST/带 `-F`/带 `-K`）执行前，
> 必须先向用户明确列出：① 将上传的文件路径；② 目标域名（仅限
> `https://www.llmfill.com`）；③ 该操作会外发文档内容，并取得用户同意。
> 删除类命令（DELETE）同理需确认。仅当用户明确同意后方可执行。

## 环境约定

- 服务地址（BASE）：`https://www.llmfill.com`（内置默认；自建部署改这里）
- 认证：每个请求都带请求头 `X-Auth-Token: aif_xxx`（**不是** Authorization: Bearer）。
  本指南统一用 `-K ~/.llmfill/curl.conf` 从配置文件读该头（见第一步），令牌不出现在命令行
- 错误格式（非 2xx 统一返回）：
  `{"success":false,"error":{"code":"...","message":"...","request_id":"req_xxx"}}`
  常见码：`INVALID_TOKEN`(401) `INSUFFICIENT_QUOTA`(402 余额不足，message
  带预估费用与充值地址) `QUOTA_EXCEEDED`(409 超配额) `FILE_TOO_LARGE`(413)
  `METHOD_NOT_ALLOWED`/`NOT_FOUND`(接口未暴露或不存在)。

## 第一步：配置令牌（写进 curl 配置文件，避免令牌进命令行）

```bash
umask 077                       # 本次会话新建文件默认不对外
install -d -m 700 ~/.llmfill    # 目录仅本人可进
cat > ~/.llmfill/curl.conf <<'EOF'
header = "X-Auth-Token: aif_你的令牌"
EOF
chmod 600 ~/.llmfill/curl.conf  # 明文凭据文件仅本人可读写
```

之后所有 curl 命令用 `-K ~/.llmfill/curl.conf` 注入认证头。**不要**用
`-H "X-Auth-Token: ..."`——`-H` 参数会留在 shell 历史和进程列表里，被
本机其它用户/进程看到。

令牌获取：浏览器打开 https://www.llmfill.com 注册登录 -> 个人中心「API 密钥」
-> 创建令牌 -> 复制 `aif_` 开头字符串（忘记可随时点"查看令牌"再次获取）。

自检令牌与余额：

```bash
curl -s -K ~/.llmfill/curl.conf https://www.llmfill.com/v1/account/whoami
# {"user_id":"u-xxx","token_valid":true,"balance":8.8,...}
```

## 核心场景 A：智能填写一份 .docx

```bash
# 1. 上传（余额不足此处直接 402，message 含预估费用与充值地址）
curl -s -X POST https://www.llmfill.com/v1/documents/upload \
  -K ~/.llmfill/curl.conf \
  -F "files=@表单.docx" \
  -F "answer_source=hybrid" \
  -F 'kb_ids=["kb-xxx"]'          # 挂载知识库时才传
# -> {"batch_id":"b_xxx","status":"pending",...}   记下 batch_id

# 2. 轮询状态（每 5 秒重复执行，直到 status 为 completed/partial/failed）
curl -s https://www.llmfill.com/v1/documents/b_xxx/status \
  -K ~/.llmfill/curl.conf
# 关注：status、progress、tasks[].cost（实扣金额，完成后有值）

# 3. 下载结果（status 为 completed/partial 后）
curl -s -OJ https://www.llmfill.com/v1/documents/b_xxx/result \
  -K ~/.llmfill/curl.conf          # -OJ 按响应文件名保存
# 纯净版（无颜色标注）加 ?clean=true
```

轮询由 agent 自己执行：`sleep 5` 后重查，通常几十秒到几分钟。
批次处理最长 2 小时。超时后可随时回来续查（第 2 步）。

## 核心场景 B：建知识库并上传资料

```bash
# 1. 建库 -> 返回 kb_id
curl -s -X POST https://www.llmfill.com/v1/knowledge-bases \
  -K ~/.llmfill/curl.conf -H "Content-Type: application/json" \
  -d '{"name":"公司资料","description":"产品手册与政策"}'

# 2. 上传资料（kb_id 在路径上；单文件 ≤10MB，每库 ≤10 个文件）
curl -s -X POST https://www.llmfill.com/v1/knowledge-bases/kb-xxx/documents \
  -K ~/.llmfill/curl.conf -F "file=@手册.pdf"

# 3. 轮询入库状态（每 5 秒重查，parse_status: parsing -> completed/failed）
curl -s https://www.llmfill.com/v1/knowledge-bases/kb-xxx/documents \
  -K ~/.llmfill/curl.conf
```

## 常用辅助操作

```bash
# 知识库列表 / 文档列表
curl -s https://www.llmfill.com/v1/knowledge-bases -K ~/.llmfill/curl.conf
curl -s https://www.llmfill.com/v1/knowledge-bases/kb-xxx/documents -K ~/.llmfill/curl.conf

# 批次历史列表
curl -s https://www.llmfill.com/v1/documents -K ~/.llmfill/curl.conf

# 接口自动发现（拉聚合 OpenAPI schema）
curl -s https://www.llmfill.com/v1/openapi

# 删除批次（仅 completed/failed/partial 可删；删除同时清掉服务端结果文件，下载要趁早）
curl -s -X DELETE https://www.llmfill.com/v1/documents/batches/b_xxx -K ~/.llmfill/curl.conf
```

## 注意

- **检索（/v1/search）与任务查询（/v1/tasks）不存在**：检索是服务端填写
  链路内部行为，知识库通过上传时的 `kb_ids` 挂载使用；入库进度看文档列表
  的 `parse_status`。
- 上传用 `-F`（multipart），JSON 接口用 `-d` + `Content-Type: application/json`。
- Windows cmd 下 curl 语法相同；多文件上传重复 `-F "files=@a.docx" -F "files=@b.docx"`。
- 费用：上传时余额不足即拒（402）；实扣金额看 status 的 `tasks[].cost`。
