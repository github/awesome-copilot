# 统一错误码表

网关对所有非 2xx 响应统一包装为：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "人类可读的错误信息",
    "request_id": "req_a1b2c3d4e5f6"
  }
}
```

`request_id` 可用于向服务方反馈排障。

| code                   | HTTP    | 含义                             | 处理建议                                     |
|------------------------|---------|--------------------------------|------------------------------------------|
| `INVALID_TOKEN`        | 401     | 令牌缺失/无效/已过期/已删除                | 重新 `config`；网页端删除令牌会使其立即失效（令牌永久有效、可反复查看） |
| `INSUFFICIENT_QUOTA`   | 402     | 余额不足（上传时入队前拒单）                 | message 含本次预估费用与充值地址，直接转告用户              |
| `FORBIDDEN`            | 403     | 无权访问该资源（他人批次/知识库）              | 检查资源归属                                   |
| `NOT_FOUND`            | 404     | 批次/知识库/文档/任务不存在；或接口未暴露         | 检查 ID；本 skill 不提供检索等未暴露接口                |
| `METHOD_NOT_ALLOWED`   | 405     | 路径存在但方法不允许（如对 KB 详情用 GET）      | 检查方法/改用支持的命令                             |
| `QUOTA_EXCEEDED`       | 409     | 知识库数（默认 10/用户）或文件数（默认 10/库）超上限 | 删旧建新                                     |
| `FILE_TOO_LARGE`       | 413     | 单文件超 10MB                      | 拆分或压缩                                    |
| `VALIDATION_ERROR`     | 400/422 | 参数校验失败                         | 检查字段类型/范围                                |
| `RATE_LIMITED`         | 429     | 公开端点限流（openapi/health）         | 按 `Retry-After` 头等待重试                    |
| `UPSTREAM_UNAVAILABLE` | 502     | 上游服务不可用/网关故障                   | 稍后重试                                     |
| `UPSTREAM_TIMEOUT`     | 504     | 上游响应超时                         | 稍后重试                                     |
| `INTERNAL_ERROR`       | 500     | 服务内部错误                         | 带 request_id 反馈                          |
| `TASK_TIMEOUT`         | -（客户端）  | 轮询超时（30 分钟）                    | 用 `fill-status` 续查                       |
| `NETWORK_ERROR`        | -（客户端）  | 无法连接服务                         | 检查网络/base URL                            |

业务层错误（HTTP 200 内的失败态）：

- 批次状态 `partial`：部分文件失败，可下载已完成部分
- 批次状态 `failed`：全部失败
- 文档 `parse_status=failed`：入库解析失败，删除后重新上传
