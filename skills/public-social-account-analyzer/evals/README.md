# 评估分层

不要把所有验证塞进一个主评测文件：

| 层级 | 位置 | 用途 |
| --- | --- | --- |
| 输出质量 | `evals.json` | 4 条真实、互异的用户任务；用于旧版/新版隔离对照和人工审阅 |
| 触发边界 | `description_train.json`、`description_validation.json` | 优化 description；validation 不参与调参 |
| 行为与需求合同 | `datasets/` | P0、边界、外部人工/在线验收目录与固定划分 |
| 确定性回归 | 仓库 `tests/` | URL、字段、状态、工作区、转义与脚本行为；不依赖真实网络成功 |

改进 Skill 时先对 `evals.json` 运行旧快照与当前版本，各次使用干净上下文；runner 的 `--baseline-skill-dir` 接收旧快照。机械事实优先由 pytest 或断言脚本验证；措辞、洞察质量和 Agent 路径由人工审阅。新增主评测前先确认它不像单元测试，也不与现有四题重复。
