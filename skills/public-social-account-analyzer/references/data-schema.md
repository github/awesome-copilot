# 数据合同路由

不要整批加载所有字段合同。按当前问题只读一份：

| 问题 | 权威文件 |
| --- | --- |
| 工作区、manifest、Task、覆盖账本、续采或 checkpoint | [artifact-contract.md](artifact-contract.md) |
| Profile、Post、Metrics、Comment、空值与采集枚举 | [collection-schema.md](collection-schema.md) |
| taxonomy、business、comment、高低表现与聚合输出 | [analysis-schema.md](analysis-schema.md) |
| 停止原因与状态迁移 | [exceptions.md](exceptions.md) |
| 指标口径、样本与证据选择 | [analysis-rules.md](analysis-rules.md) |
| 平台字段来源与能力差异 | 对应的 [platforms/](platforms/) 文件 |

同一事实只保留一个权威来源：字段形状属于上述 schema，状态迁移属于 exceptions.md，平台识别和来源属于平台参考，命令参数属于脚本帮助与 [scripts/README.md](../scripts/README.md)。
