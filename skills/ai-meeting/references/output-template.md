# AI Meeting 最终报告模板

默认输出路径：`synthesis/final.md`

```md
# AI Meeting 结论

## 最终建议
建议选择：方案 A / 方案 B / 修改后的方案 / 暂缓 / 放弃

置信度：高 / 中 / 低

一句话结论：

## 核心理由
1. ...
2. ...
3. ...

## 改进后的方案
...

## 不建议采用的方案
...

## 反对意见
1. ...
2. ...

## 最大风险
| 风险 | 严重度 | 可能性 | 缓解方式 |
|---|---:|---:|---|
| ... | 高 | 中 | ... |

## 各 Agent 立场
| Agent | Provider | 立场 | 核心观点 | 置信度 |
|---|---|---|---|---:|
| Builder | Codex | ... | ... | 0.75 |
| Critic | Claude Code | ... | ... | 0.82 |

## 主要争议
1. ...
2. ...

## 已达成共识
1. ...
2. ...

## 证据缺口
1. ...
2. ...

## 待验证问题
1. ...
2. ...

## 下一步行动
### 24 小时内
- ...

### 3 天内
- ...

### 1 周内
- ...

## 决策记录
- 会议时间：
- 输入材料：
- 参会 Agent：
- 轮次：
- 关键假设：
- 重要不确定性：
- 降级或失败情况：

## Provenance
### Provider 状态（本次会议参与者）
- ...

### 覆盖范围
- ...

### 证据与截断
- ...
- materials: path / bytes / sha256 / truncatedForPrompt

### 降级或失败
- ...
```

`## Provenance` 由 orchestrator 追加并参与正式报告校验。Judge 不应自行生成该章节；如果生成，orchestrator 会先移除再追加可信版本。缺少其他必需章节时，orchestrator 写 `synthesis/final.draft.md`，不写正式 `synthesis/final.md`。

如果任何 material 标记为 `truncatedForPrompt=true`，最终报告必须在 `## 证据缺口` 说明未完整进入 prompt 的材料，以及这对结论可信度的限制；Provenance 会列出材料路径、字节数、hash 和截断状态。

最终报告不要只追求平衡。Judge 必须给出明确推荐，并说明为什么该推荐最符合项目核心目标和用户价值。
orchestrator 会在写入正式 `synthesis/final.md` 前校验关键二级章节是否存在；缺少必需章节时，synthesize 记为 `failed`，只写 draft。
