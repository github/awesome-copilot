# 离线评估数据集

本目录保存行为、P0 追踪和触发边界数据。`source/` 是唯一可手工维护的数据源；`validation_data/`、`test_data/` 与 `manifest.json` 均由固定脚本生成。

数据是合成提示与断言，不来自用户聊天、私信、私有后台或购买数据。示例公开 URL 只表达场景，不表示离线评估会访问网络。

## 目录

```text
datasets/
├── README.md
├── CHANGELOG.md
├── config.example.json
├── manifest.json
├── p0_requirements.json
├── p0_coverage.json
├── source/
│   ├── behavior_cases.jsonl
│   ├── p0_cases.jsonl
│   ├── trigger_should.jsonl
│   └── trigger_should_not.jsonl
├── validation_data/*.jsonl
└── test_data/*.jsonl
```

## 记录合同

所有文件为 UTF-8 JSONL，每行一个对象，文件末尾保留换行。每个文件内 `id` 唯一且发布后稳定；字符串不得为空，`assertions` 必须是非空字符串数组。

`behavior_cases.jsonl`：

| 字段 | 含义 |
| --- | --- |
| `id`, `name` | 稳定 ID 与场景名 |
| `platform`, `category`, `account_type` | 平台与分层字段 |
| `prompt`, `expected_output`, `assertions` | 用户任务、预期与原子断言 |

`p0_cases.jsonl`：

| 字段 | 含义 |
| --- | --- |
| `primary_p0_id`, `p0_ids`, `source_ref` | 需求来源与覆盖编号 |
| `platform`, `scenario_type`, `scenario_group` | 平台、场景类型与防近重复泄漏分组 |
| `verification_type` | `automated`、`agent_eval`、`external_live` 或 `external_manual` |
| `prompt`, `expected_output`, `assertions` | 测试任务与逐项断言 |

触发记录：

| 文件 | 必需字段 |
| --- | --- |
| `trigger_should.jsonl` | `id`, `label=should_trigger`, `platform`, `query` |
| `trigger_should_not.jsonl` | `id`, `label=should_not_trigger`, `category`, `reason`, `query` |

不得把凭据、Cookie、Token、私有指标或个人敏感信息写入任何记录。

## 划分

- `source/`：100% 主数据池，不直接作为运行期分区。
- `validation_data/`：默认 70%，用于日常开发与失败分析。
- `test_data/`：默认 30%，仅用于版本候选或里程碑。
- 固定 seed：`42`；配额采用最大余数法。
- 分层字段：behavior 的 `category`、P0 的 `scenario_type`、正触发的 `platform`、负触发的 `category`。
- 同一 `scenario_group` 不得跨 validation/test；单样本分层无法两边覆盖时，在 manifest 披露偏差，不能复制样本凑数。

description 触发优化单独使用 `../description_train.json` 与 `../description_validation.json`，不复用本目录 70/30 划分。只根据 train 修改描述，validation 只用于候选选择。

## 命令

从仓库根目录运行：

```bash
# 预览，不写文件
python3 tools/skill_eval/split_dataset.py --dry-run

# 以固定参数重新生成 derived partitions 与 manifest
python3 tools/skill_eval/split_dataset.py --test-ratio 0.30 --seed 42

# 核验现有快照
python3 tools/skill_eval/split_dataset.py --verify

# 发布前检查小样本分布偏差
python3 tools/skill_eval/split_dataset.py --dry-run --strict
```

迁移数据根时传 `--datasets-root <PATH>`；`config.example.json` 只供外部工具复制，脚本不会自动读取。

`--verify` 检查 schema、ID、分区交集/并集、SHA-256、manifest 数量、P0 目录与追踪矩阵，以及 `scenario_group` 防泄漏。`p0_coverage.json` 的 100% 只表示已有测试定义；`external_evidence_required` 仍须真实页面、人工真值或运营试用。

## 使用边界

- validation 可重复运行并用于修改实现，但结果不能称为留出泛化性能。
- test 日常开发不得逐题调参；失败后把根因抽象成新的 source 场景，再重新划分。
- Agent 基准各次使用干净上下文，旧版与新版使用同一 prompt、模型与运行条件；重复次数、耗时和可得 token 必须真实记录。
- 自动化夹具不能替代在线可用性、字段人工准确率或真实运营反馈。

## 更新清单

1. 只编辑 `source/*.jsonl`，为新场景记录明确的 Skill、PRD、平台或合规依据。
2. 运行 dry-run，检查分层与近重复分组。
3. 用固定 seed/比例生成快照并执行 `--verify` 与 `--strict`。
4. 运行 `python3 -m pytest tests/test_split_dataset.py -q`。
5. 更新 `CHANGELOG.md`，复核 derived diff 与 manifest SHA。

数据版本采用语义化版本：PATCH 修正文案/断言；MINOR 增加兼容场景；MAJOR 改变字段或标签语义。仓库当前没有声明许可证，不得自行标注 MIT 或引入来源不明的数据。
