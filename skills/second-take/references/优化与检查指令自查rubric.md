# 优化与检查指令自查 Rubric

**用在什么时候**：每次生成完优化与检查指令、准备交付给用户之前，逐条过一遍。它是自查表，不是给用户看的诊断报告。

**怎么用**：Must have 全部为 Yes，才允许交付；Nice to have 用于判断这版是"能用"还是"好用"。过完把 No 的条目直接改掉，不要带病交付。

**Must have 的定级判据**（分档时一律先问这一句）：「只缺这一条，我能不能接受？」不接受即 Must have，缺了仍可交付、只是不够好的一律 Nice to have。按此判据，43 条完整版里 **Must have 34 条 / Nice to have 9 条**——Must have 分别对应 `SKILL.md` 的硬性约束（丢了会产出坏指令或错误内容），Nice to have 是语气与写作润色项。**赶时间时只过末尾「Must-have 精简版 18 条」**，那才是真正的最低交付门槛；完整版 43 条用于判断这版是"能用"还是"好用"。

**与硬约束的关系（重要）**：本表是自查表，`SKILL.md` 的 34 条硬约束优先于本表的 Nice/Must 标记。F8 / F10 / F11 在此标为 Nice to have，只表示它们不参与"Must have 全 Yes"这道门槛，**但它们分别对应硬约束 18（收尾询问用语）与硬约束 25（不省句子成分、第一人称配额），违反硬约束 18 / 25 的交付仍不得视为合格**。一句话：**门槛是下限，硬约束是底线**——降为 Nice 不等于可以违反硬约束。

规则：每条均为 **Yes/No 二元判定句，Yes＝得分**；否定式约束统一写成"是否未……"形式。

Dimension 沿用通用维度：指令遵循 / 过程合理性 / 结果正确性 / 写作质量 / 格式 / 语气 / 其他。

## A. 目标与输入

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| A1 | 是否先判定产出目标（最终回答 / 改写后的 CoT），并在指令里保持一致？ | Objective | Explicit | Must have | 过程合理性 |
| A2 | 原始 UP 是否全文内嵌，未出现"见上文""同上"这类指代词？ | Objective | Explicit | Must have | 指令遵循 |
| A3 | 后续轮次的追加指令是否与首轮指令同等对待、一并纳入？ | Objective | Implicit | Must have | 指令遵循 |
| A4 | 是否未把其他对话里的追加指令搬进本次指令？ | Objective | Implicit | Must have | 指令遵循 |

## B. 诊断部分

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| B1 | 检查项是否逐项输出（无问题也写"无"），而非只挑几处错？ | Objective | Explicit | Must have | 过程合理性 |
| B2 | 每条错误是否按「错误性质 → 引用原文 → 对照依据 → 定性 → 应改为」写全？ | Objective | Explicit | Must have | 写作质量 |
| B3 | 引用 CoT 原文是否加双引号、未转述或概括？ | Objective | Explicit | Nice to have | 写作质量 |
| B4 | 是否用四条标准（逻辑性 / 全面性 / 可行性 / 可验证性）收口，每条一句结论？ | Objective | Explicit | Must have | 结果正确性 |
| B5 | 诊断是否控制在十几行内，未写成万字报告？ | Subjective | Explicit | Nice to have | 写作质量 |

## C. 素材与结论

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| C1 | 产出最终回答时，是否未内嵌 CoT 全文？ | Objective | Explicit | Must have | 指令遵循 |
| C2 | 是否给出 5-10 条陈述句形式的有效结论清单？ | Objective | Explicit | Must have | 结果正确性 |
| C3 | 每条结论是否都能回答"它来自 UP / 素材 / 已核对的推理"三者之一？ | Objective | Implicit | Must have | 结果正确性 |
| C4 | 是否未把 CoT 里的臆测（用户身份、深层需求、格式偏好）当成结论收进清单？ | Objective | Implicit | Must have | 结果正确性 |

## D. 修改要点

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| D1 | 修改要点是否覆盖逻辑性、全面性、可行性、可验证性四条，缺哪条就补哪条？ | Objective | Explicit | Must have | 结果正确性 |
| D2 | 每条修改是否写明"改成什么"，而非只说"这里不好"？ | Objective | Explicit | Must have | 写作质量 |
| D3 | 补全面性时，是否点名列出了必须覆盖的维度或清单，而非泛泛说"要全面"？ | Objective | Explicit | Must have | 结果正确性 |
| D4 | 是否未用可计数的动作指标（每节两处加粗、至少 3 条、每条两句）代替效果要求？ | Objective | Explicit | Must have | 写作质量 |

## E. 输出结构

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| E1 | 骨架是否给到分几节、每节主题、每节覆盖哪几个点？ | Objective | Explicit | Must have | 格式 |
| E2 | 骨架里的标题是否全部为名词短语，未用祈使句、口号或口语？ | Objective | Explicit | Must have | 格式 |
| E3 | 是否未在骨架和修改要点里写元叙述（"供用户纠正""判断标准是""产出物为"）？ | Objective | Explicit | Must have | 写作质量 |
| E4 | 是否点名了哪几节必须附可直接照抄的样例？ | Objective | Explicit | Must have | 格式 |
| E5 | 是否未规定句式模板（"每条写成怎么做 + 判断标准"），只规定了效果？ | Objective | Implicit | Nice to have | 写作质量 |

## F. 输出要求

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| F1 | 是否写明"只输出正文"，并禁用分析过程、修改说明、前后对比、建议清单？ | Objective | Explicit | Must have | 指令遵循 |
| F2 | 是否点名禁用思考腔措辞（嗯 / 用户问的是 / 我需要 / 首先 / 接下来考虑 / 总结起来）？ | Objective | Explicit | Must have | 语气 |
| F3 | 是否点名禁用元要求措辞，并给出总规则"本指令中的要求与规则不得进入正文"？ | Objective | Explicit | Must have | 写作质量 |
| F4 | 是否禁止编造精确数字与岗位名，并给出定性替代写法？ | Objective | Explicit | Must have | 结果正确性 |
| F5 | 是否未要求用户强制开新对话（默认支持粘回原对话）？ | Objective | Implicit | Must have | 指令遵循 |
| F6 | 样例里的人名、地名、机构名、数值是否一律用占位符，未编造真实名称与精确数值？ | Objective | Explicit | Must have | 结果正确性 |
| F7 | 是否遵循用户的交付边界，未在只要正文、JSON、代码或写完即止时追加询问，也未自行豁免字数限制？ | Objective | Explicit | Must have | 语气 |
| F8 | 如有收尾询问，是否简短、符合用户语气且位于交付物之外？无询问时本项不适用。 | Subjective | Explicit | Nice to have | 语气 |
| F9 | 收尾询问是否未出现元要求措辞（"本指令""本次任务""上述要求"）？ | Objective | Implicit | Nice to have | 写作质量 |
| F10 | 是否点明"不得省略句子成分"，并给了反面例子（"也知道"不写"也知"、不得为压字数省成分）？ | Objective | Implicit | Nice to have | 写作质量 |
| F11 | 论述/说明类产物是否给了第一人称密度配额，而非放任每句以"我"开头？ | Objective | Implicit | Nice to have | 语气 |

## G. 定向忽略与上下文

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| G1 | 是否声明用户此前的全部指令、追加要求、表达习惯与思维方式继续有效？ | Objective | Explicit | Must have | 指令遵循 |
| G2 | 忽略范围是否只切掉上一轮 CoT 及它直接产出的那一版，未写"忽略本对话中所有回答"？ | Objective | Explicit | Must have | 指令遵循 |
| G3 | 声明中是否未使用指向不存在内容的指代词（如"下面【原始 CoT】"）？ | Objective | Implicit | Must have | 写作质量 |

## H. 自洽性与迭代

| # | Criterion | Type | Necessity | Priority | Dimension |
|---|---|---|---|---|---|
| H1 | 同一份清单（维度、类别、字段）在修改要点与输出结构两处出现时，是否逐字一致？ | Objective | Implicit | Must have | 过程合理性 |
| H2 | 是否未出现自相矛盾的约束（如"严格照抄结构"与"标题可自拟"并存）？ | Objective | Implicit | Must have | 过程合理性 |
| H3 | 可计数的格式要求后面，是否跟了"不得以牺牲内容完整性、真实性为代价"的兜底句？ | Objective | Implicit | Must have | 过程合理性 |
| H4 | 字段数与样例列数限制冲突时，是否优先保证字段完整，并注明列数限制不适用？ | Objective | Implicit | Must have | 格式 |
| H5 | 迭代轮次是否采用定点修复模式（声明沿用范围、未推倒重写），或明确说明了为什么要重写？ | Objective | Implicit | Nice to have | 过程合理性 |
| H6 | 是否避免同一条信息在指令的三个段落里重复出现两次以上？ | Objective | Implicit | Nice to have | 写作质量 |
| H7 | 指令（含样例、自检问句、收尾询问）是否未出现既往任务的具体内容，也未出现"上次那次""跟××那版一样"这类交叉引用？ | Objective | Implicit | Must have | 写作质量 |

---

## Must-have 精简版（赶时间时只过这 18 条）

1. 是否判定并写明了产出目标（最终回答 / 改写后的 CoT）？ Must / 过程合理性
2. 原始 UP 是否全文内嵌、未用指代词？ Must / 指令遵循
3. 是否未内嵌 CoT 全文，只给了有效结论清单？ Must / 指令遵循
4. 是否点名禁用思考腔与元要求两类措辞？ Must / 语气
5. 是否写明"只输出正文"并禁用分析、对比、建议？ Must / 指令遵循
6. 骨架标题是否全部为名词短语？ Must / 格式
7. 是否点名哪几节必须附可照抄样例，且样例用占位符？ Must / 格式
8. 修改要点是否覆盖四条标准，且每条写明"改成什么"？ Must / 结果正确性
9. 是否禁止编造精确数字与岗位名？ Must / 结果正确性
10. 忽略范围是否只切上一轮 CoT 及其直接产出？ Must / 指令遵循
11. 同一清单在两处出现时是否逐字一致？ Must / 过程合理性
12. 可计数格式要求后是否跟了"不得牺牲内容完整性"的兜底句？ Must / 过程合理性
13. 是否遵循用户的结束方式，未强制追加收尾询问或自行豁免字数限制？ Must / 语气
14. 所有「必须有」的内容是否都在【输出结构】里占了位（不只写在修改要点里）？条数标题与条目数是否一致？ Must / 指令遵循
15. 体量豁免是否逐表点名（哪张表免列数、哪张表免行数），并写了"不得删减条目或合并字段"的兜底句？ Must / 格式
16. 是否有【成稿自检】段（Yes/No 二元、10-12 条、自检过程不进正文、有"改内容而非删对象"的兜底句）？ Must / 指令遵循
17. 指令是否未夹带既往任务的具体内容与交叉引用（只保留抽象后的机理）？ Must / 写作质量
18. 是否点明「不得省略句子成分」（含反面例子）与论述类产物的第一人称密度配额？ Must / 写作质量

---

## 四类硬伤自检（拿它再扫一遍自己的 rubric 与指令）

| 类别 | 自查问句 | 对应到我们的检查项 |
|---|---|---|
| 语义 | 有没有指代不清、未操作化的形容词（"要详细""要合理"）、两条高度共线、拗口？ | 表述模糊 |
| 结构 | 有没有一条塞进多个独立约束、整体与局部冗余包含、相互矛盾、否定式没写成 Yes＝得分？ | 前后矛盾 / 强行推理 / 指令冲突 |
| 完备性 | 有没有漏掉 UP 的显性或隐性约束？有没有包含未命中分支的约束（用户没要求却写进去的）？ | 覆盖不全 / 无据引用 |
| 正确性 | 事实有没有错？推理链有没有断？ | 常识性错误 / 倒置已知 |

**两套坐标系**：四类硬伤回答"这条能不能用"，四条标准回答"这版好不好"。交付前先过硬伤，再用四条标准收口。

## 写法要点（从 rubric 设计实践里学来的）

**可学的五点**：

1. **按模块分组 + 组内编号**，聚合后能看出模型（或自己）在哪一块弱。分组来源是 UP 里的任务结构，不是拍脑袋。
2. **每条给 2-4 个可操作落点**（如"如重力、惯性、碰撞、反作用力"），把抽象形容词落成能判的东西，直接消除"未操作化"这类硬伤。
3. **开头两句规则声明**（Yes＝得分、否定式写法），纯文本版尤其必要——字段在行尾时，规则必须先讲清。
4. **Priority 的判据要写进指令**："只缺这一条，我能不能接受？"不接受即 Must have。没有这句，设计者会把 80% 都标成 Must have，rubric 失去区分度。
5. **Necessity 的 Implicit 是给设计者自己用的**：强迫你去检索没写在题面上的隐藏约束（多轮继承、角色延伸、常识）。

**要避开的四点**：

1. **精简 ≠ 合并**。把两条并成一条，No 的时候定位不到是哪一半没满足，原子性就废了。精简应当删条目（尤其是聚合型条目，如"是否覆盖全部模块"）。
2. **含"合理""完整""有帮助"的判定句别一律标 Objective**，它带主观成分；带主观的标 Subjective 并注明需人工或人机混合判定。
3. **汇总条目（整体闭环、覆盖全部模块）在精简版里应最先删**——它是对其他条目的聚合，不是独立判定点，留着会重复计分。
4. **不要在产物开头写元叙述**（"以下为精简纯文本版"），它会被当成内容的一部分读进去。
