# 账号与配置

## API Key 获取（唯一方式：网页界面）

1. 访问 https://www.llmfill.com 注册并登录（注册需邮箱验证，必须在浏览器完成，
   无法通过 API/skill 注册）。
2. 进入「个人中心 -> API 密钥」，点击"创建令牌"。
3. 复制弹窗中的 `aif_` 开头明文。
4. 令牌永久有效，忘记明文可随时在列表中点"查看令牌"（眼睛图标）再次获取。

令牌特性：
- 明文可反复查看（服务端可逆加密存储），无需重发
- 无过期时间，可随时删除
- 删除后立即失效

> ⚠️ **令牌是高价值长效明文凭据**：永久有效、可反复查看，意味着一旦泄露
> （本地文件、备份、截图、日志、shell 历史），攻击者可长期使用直到你手动删除。
> 建议：不要写进 shell 历史/截图/代码仓库/备份；`~/.llmfill/config.json` 保持
> 600 权限；多账号时用脱敏邮箱确认归属；泄露后立即到个人中心删除重建。

## 本地配置

`~/.llmfill/config.json`（权限 600；`llmfill config` 只问 API Key，
服务地址默认内置，需要改时直接编辑此文件）：

```json
{
  "base_url": "https://www.llmfill.com",
  "api_key": "aif_xxxxxxxxxxxxxxxx",
  "user_id": "u-xxxx"
}
```

自建/代理部署时用 `config --base <url> --allow-custom` 显式批准自定义地址（批准
持久化到 `approved_origins`，绑定精确 origin）。直接改 `base_url` 字段、或只设
`LLMFILL_BASE_URL` 不会生效（fail-closed，防令牌被静默发往第三方）。
环境变量 `LLMFILL_API_KEY` / `LLMFILL_BASE_URL` 优先于配置文件（CI 友好；
`LLMFILL_BASE_URL` 须指向已批准的 origin）。

无 Python 环境可手工创建此文件（curl 通道同样读取），见 `curl-guide.md`。

## GET /v1/account/whoami

请求头 `X-Auth-Token`。响应：

```json
{
  "user_id": "u-xxx",
  "token_valid": true,
  "token_name": "生产后端",
  "email_masked": "j***@gmail.com",
  "balance": 8.8,
  "total_recharged": 10.0,
  "total_spent": 1.2
}
```

`token_name` / `email_masked` 为身份回显字段，帮助用户确认令牌归属
（脱敏邮箱，多账号用户可据此发现粘错令牌）。

balance 为 null 时表示网关未配置内部密钥（余额暂不可查），令牌自检仍有效。

## GET /v1/openapi

三服务聚合的 OpenAPI schema（无认证，per-IP 限流 10/min，缓存 1h）。
`llmfill discover` 命令解析并缓存到 `~/.llmfill/endpoints.json`，
agent 可用于运行时校验参数/发现新接口。

## 充值

余额不足（`INSUFFICIENT_QUOTA`）时引导用户到 https://www.llmfill.com 充值
（微信支付），注册用户有赠送积分。
