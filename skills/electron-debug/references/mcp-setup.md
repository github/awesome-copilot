# MCP 接入说明

## 前提

Agent 宿主支持本地 MCP stdio Server；本机具备 Node.js 22 或更高版本；当前 Skill 已通过任务认可的安装渠道获取。应用运行、endpoint 和业务回归由 Agent 准备。

## 随包运行文件

MCP 与 Skill 一起交付，`runtime/server.cjs` 已包含运行时 JavaScript 依赖，不依赖源码目录、外部依赖安装目录或原生扩展。入口为 `runtime/launch.cjs`。正常安装后的使用流程不需要下载源码或执行安装、构建命令。

Agent 查找当前 Skill 的实际安装目录，不假设全局目录、项目目录或宿主配置文件路径。

```text
node <absolute-skill-directory>/runtime/launch.cjs --verify
```

成功结果包含 Skill 版本、MCP 版本和构建输入摘要。启动器在加载 MCP 前检查 manifest 和运行文件的 SHA-256，拒绝缺失、损坏或不匹配的文件；失败信息写入 stderr，且不启动 MCP。

## 来源与完整性边界

同包哈希可检测文件不一致，不能独立证明发布者身份，也不能证明代码没有漏洞。来源信任由用户或组织认可的安装渠道、平台扫描及发布证明建立，不能仅凭包自称可信。

GitHub Release 的 ZIP 可提供构建来源 attestation。需要核对来源时，在执行包内代码前，使用可信的 GitHub CLI 对原始 Release ZIP 验证预期仓库和工作流身份：

```text
gh attestation verify <absolute-release-zip> --repo longhun12346/electron-agent-debug --signer-workflow longhun12346/electron-agent-debug/.github/workflows/release.yml
```

该命令只验证产物来源，不下载或执行 MCP 代码。验证失败时停止；要求来源证明但没有相应证明时报告 `BLOCKED`，不要把本地哈希校验当成替代。OneTool 安装包使用平台的发布和扫描结果，不能用另一份 GitHub ZIP 的证明替它背书。

## 配置宿主

先确认包来源符合任务要求，再执行完整性检查。通过后，根据实际宿主注册以下本地入口：

```json
{
  "mcpServers": {
    "electron-agent-debug": {
      "command": "node",
      "args": ["<absolute-skill-directory>/runtime/launch.cjs"]
    }
  }
}
```

这是概念示例，字段与刷新方式以实际宿主为准。已存在相同 Server 时先核对其入口和版本，避免重复注册。刷新后确认 `electron_attach`、`electron_status`、`electron_targets`、`electron_logs` 可见。MCP 启动成功不代表 Electron 已启动或业务已通过。

## 更新与迁移

更新时从原获准渠道安装完整的新 Skill 版本，按宿主方式停止旧 MCP，把配置指向新版本的实际 `runtime/launch.cjs`，重新核对来源和完整性后刷新宿主。

旧版本如果指向独立源码目录下的入口，必须切换到随包启动器。不要继续复用旧进程或旧构建产物，不覆盖用户的源码修改。升级不需要修改待诊断 Electron 项目。

普通诊断复用当前获准版本，不在每次调用时自动联网升级。运行文件缺失、版本不符或校验失败时报告 `BLOCKED`，不自动回退到下载和执行外部代码。

## Endpoint 与保护参数

MCP 通过 stdio 通信，不监听诊断服务端口，也不启动 Electron。Agent 在调用 `electron_attach` 时传入实际回环 HTTP(S) discovery URL，或通过宿主提供环境变量：

```text
ELECTRON_DEBUG_MAIN_URL=<agent-provided-loopback-endpoint>
ELECTRON_DEBUG_CDP_URL=<agent-provided-loopback-endpoint>
```

可选保护参数沿用默认值，只有诊断确有需要时调整：

```text
ELECTRON_DEBUG_REQUEST_TIMEOUT_MS=<optional-request-timeout>
ELECTRON_DEBUG_DISCOVERY_TIMEOUT_MS=<optional-discovery-timeout>
ELECTRON_DEBUG_MAX_LOG_EVENTS=<optional-event-limit>
ELECTRON_DEBUG_MAX_LOG_BYTES=<optional-byte-limit>
ELECTRON_DEBUG_MAX_PROTOCOL_MESSAGE_BYTES=<optional-protocol-message-limit>
```

端口由 Agent 或项目启动方式动态确定；不扫描端口，不猜测 target。主进程问题使用 Inspector，renderer 问题使用 CDP，preload/IPC 使用双通道。Electron 重启后重新 attach；窗口重建后重新发现 target。

业务测试、DOM、视觉验证以及最终结论由 Agent 完成，MCP 只提供状态、target、日志和结构化错误。
