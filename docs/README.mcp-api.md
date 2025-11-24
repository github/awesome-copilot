# MCP Server API 文件

## 概述

Awesome Copilot MCP Server 是一個 Model Context Protocol (MCP) 伺服器，提供工具讓 AI 助手能夠搜尋並安裝來自本儲存庫的 prompts、instructions 和 chat modes。

## 安裝與設定

### 系統需求

- Docker（已安裝並執行中）
- VS Code、VS Code Insiders 或 Visual Studio

### 快速安裝

**選項 1：透過一鍵安裝連結**

- [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode)
- [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode-insiders)
- [![Install in Visual Studio](https://img.shields.io/badge/Visual_Studio-Install-C16FDE?logo=visualstudio&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vs)

**選項 2：手動設定**

將以下 JSON 設定新增至你的 MCP 伺服器設定檔：

```json
{
  "servers": {
    "awesome-copilot": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest"
      ]
    }
  }
}
```

### 設定檔位置

- **VS Code**: `~/.config/Code/User/globalStorage/github.copilot-chat/mcp.json`（Linux/macOS）或 `%APPDATA%\Code\User\globalStorage\github.copilot-chat\mcp.json`（Windows）
- **VS Code Insiders**: 類似路徑，將 `Code` 替換為 `Code - Insiders`
- **Visual Studio**: 透過 Tools > Options > GitHub Copilot > MCP Servers 設定

## 可用工具

Awesome Copilot MCP Server 提供以下工具，讓 AI 助手能夠與儲存庫互動：

### 1. `search_prompts`

搜尋可用的 prompts。

**參數：**
- `query` (string, 選填): 搜尋關鍵字或標籤
- `tags` (array, 選填): 依標籤篩選

**回傳：**
- Prompt 清單，包含名稱、描述、標籤和檔案路徑

**範例：**
```typescript
// 搜尋所有 prompts
await searchPrompts({});

// 依關鍵字搜尋
await searchPrompts({ query: "README" });

// 依標籤篩選
await searchPrompts({ tags: ["documentation", "github"] });
```

### 2. `search_instructions`

搜尋可用的 instructions。

**參數：**
- `query` (string, 選填): 搜尋關鍵字
- `language` (string, 選填): 依程式語言篩選
- `applyTo` (string, 選填): 依套用模式篩選

**回傳：**
- Instruction 清單，包含名稱、描述、套用模式和檔案路徑

**範例：**
```typescript
// 搜尋 TypeScript 相關的 instructions
await searchInstructions({ language: "TypeScript" });

// 搜尋套用於特定檔案模式的 instructions
await searchInstructions({ applyTo: "*.js" });
```

### 3. `search_chatmodes`

搜尋可用的 chat modes。

**參數：**
- `query` (string, 選填): 搜尋關鍵字
- `role` (string, 選填): 依角色類型篩選（如 "architect", "expert", "specialist"）

**回傳：**
- Chat mode 清單，包含名稱、描述、工具和模型資訊

**範例：**
```typescript
// 搜尋所有 chat modes
await searchChatmodes({});

// 搜尋特定角色的 chat modes
await searchChatmodes({ role: "architect" });
```

### 4. `search_agents`

搜尋可用的 custom agents。

**參數：**
- `query` (string, 選填): 搜尋關鍵字
- `mcpServer` (string, 選填): 依需要的 MCP 伺服器篩選

**回傳：**
- Agent 清單，包含名稱、描述、所需 MCP 伺服器和安裝連結

**範例：**
```typescript
// 搜尋所有 agents
await searchAgents({});

// 搜尋使用特定 MCP 伺服器的 agents
await searchAgents({ mcpServer: "github" });
```

### 5. `get_content`

取得特定 prompt、instruction、chat mode 或 agent 的完整內容。

**參數：**
- `path` (string, 必填): 檔案相對路徑（如 `prompts/create-readme.prompt.md`）

**回傳：**
- 檔案完整內容，包含 frontmatter 和主體文字

**範例：**
```typescript
// 取得特定 prompt 的內容
await getContent({ path: "prompts/create-readme.prompt.md" });

// 取得特定 agent 的內容
await getContent({ path: "agents/terraform.agent.md" });
```

### 6. `install_item`

協助安裝 prompt、instruction、chat mode 或 agent 到使用者的環境。

**參數：**
- `path` (string, 必填): 要安裝的項目路徑
- `target` (string, 選填): 安裝目標位置（預設為 VS Code 設定）

**回傳：**
- 安裝指示和確認訊息

**範例：**
```typescript
// 安裝 prompt
await installItem({ path: "prompts/create-readme.prompt.md" });

// 安裝 chat mode
await installItem({ path: "chatmodes/architect.chatmode.md" });
```

### 7. `list_collections`

列出可用的集合。

**參數：**
無

**回傳：**
- Collection 清單，包含名稱、描述和包含的項目

**範例：**
```typescript
// 列出所有集合
await listCollections();
```

### 8. `get_collection_items`

取得特定集合中的所有項目。

**參數：**
- `collection` (string, 必填): 集合名稱

**回傳：**
- 集合中所有項目的詳細資訊

**範例：**
```typescript
// 取得特定集合的內容
await getCollectionItems({ collection: "awesome-copilot" });
```

## 使用情境範例

### 範例 1：搜尋並安裝 README 生成器

```typescript
// 1. 搜尋 README 相關的 prompts
const results = await searchPrompts({ query: "README" });

// 2. 查看第一個結果的詳細內容
const content = await getContent({ path: results[0].path });

// 3. 安裝到本地環境
await installItem({ path: results[0].path });
```

### 範例 2：尋找適合的 Architecture Agent

```typescript
// 1. 搜尋 architecture 相關的 agents
const agents = await searchAgents({ query: "architect" });

// 2. 篩選需要特定工具的 agents
const filteredAgents = agents.filter(a => a.mcpServers.includes("github"));

// 3. 查看 agent 詳細資訊
const agentDetails = await getContent({ path: filteredAgents[0].path });
```

### 範例 3：探索集合

```typescript
// 1. 列出所有集合
const collections = await listCollections();

// 2. 取得 "awesome-copilot" 集合的內容
const items = await getCollectionItems({ collection: "awesome-copilot" });

// 3. 安裝集合中的項目
for (const item of items) {
  await installItem({ path: item.path });
}
```

## 錯誤處理

MCP Server 可能回傳以下錯誤：

### 常見錯誤碼

- **404 Not Found**: 請求的項目不存在
- **400 Bad Request**: 參數格式錯誤或缺少必填參數
- **500 Internal Server Error**: 伺服器內部錯誤

### 錯誤回應格式

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested item was not found",
    "details": "Path 'prompts/nonexistent.prompt.md' does not exist"
  }
}
```

### 處理錯誤的最佳實務

1. **檢查路徑**: 確認檔案路徑正確，使用相對於儲存庫根目錄的路徑
2. **驗證參數**: 確保所有必填參數都已提供且格式正確
3. **處理網路問題**: MCP Server 透過 Docker 執行，確保 Docker 服務正常運作
4. **重試機制**: 對於暫時性錯誤，實作指數退避重試策略

## 進階設定

### 自訂 Docker 映像

如果你想使用自訂的 Docker 映像：

```json
{
  "servers": {
    "awesome-copilot": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "your-registry/awesome-copilot:custom-tag"
      ]
    }
  }
}
```

### 環境變數

可透過 Docker args 傳遞環境變數：

```json
{
  "servers": {
    "awesome-copilot": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "CUSTOM_SETTING=value",
        "ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest"
      ]
    }
  }
}
```

### 本地開發模式

在本地開發時，可以直接執行伺服器而不透過 Docker：

```json
{
  "servers": {
    "awesome-copilot": {
      "type": "stdio",
      "command": "dotnet",
      "args": [
        "run",
        "--project",
        "/path/to/awesome-copilot-server"
      ]
    }
  }
}
```

## 效能最佳化

### 快取策略

MCP Server 會快取搜尋結果以提升效能。快取會在以下情況下自動更新：
- 伺服器重啟時
- 儲存庫內容更新時

### 批次操作

當需要安裝多個項目時，建議使用批次操作以減少網路請求：

```typescript
// 較佳做法：批次取得內容
const paths = ["prompts/item1.prompt.md", "prompts/item2.prompt.md"];
const contents = await Promise.all(paths.map(path => getContent({ path })));

// 然後批次安裝
await Promise.all(paths.map(path => installItem({ path })));
```

## 疑難排解

### Docker 相關問題

**問題**: MCP Server 無法啟動

**解決方案**:
1. 確認 Docker 已安裝並執行：`docker --version`
2. 確認可以拉取映像：`docker pull ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest`
3. 檢查 Docker 日誌：`docker logs <container_id>`

### 搜尋結果為空

**問題**: 搜尋工具回傳空結果

**解決方案**:
1. 確認搜尋關鍵字拼寫正確
2. 嘗試使用更寬鬆的搜尋條件
3. 使用不帶參數的搜尋以列出所有項目

### 安裝失敗

**問題**: 安裝項目時失敗

**解決方案**:
1. 確認目標路徑可寫入
2. 檢查是否有足夠的磁碟空間
3. 確認 VS Code/Visual Studio 設定權限正確

## 相關資源

- [MCP Server 官方公告](https://developer.microsoft.com/blog/announcing-awesome-copilot-mcp-server)
- [Model Context Protocol 規範](https://modelcontextprotocol.io/)
- [VS Code Copilot 自訂文件](https://code.visualstudio.com/docs/copilot/copilot-customization)
- [儲存庫主頁](https://github.com/github/awesome-copilot)

## 貢獻與回饋

如有問題或建議，請：
1. 在 [GitHub Issues](https://github.com/github/awesome-copilot/issues) 提交問題
2. 參考 [貢獻指南](../CONTRIBUTING.md)
3. 加入社群討論

## 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](../LICENSE) 檔案。
