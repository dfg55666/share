
一、整体架构评估
你的设计核心思路是分析师（逻辑链条提取）→ 检查师（逻辑校验）→ 润色师（人话转译）→ 检查师（保真校验）。这个四步流水线是合理的。但目前存在以下结构性问题：

二、三大角色提示词的问题诊断
🔴 1. 分析师（analyst_prompt.md）—— 结构最好，但有冗余问题
优点：

身份设定清晰（吠陀占星宗师）
核心工作流规则覆盖全面（自主决策、task 调整、双层表达、证据回链）
Part A / Part B 输出协议定义严谨
问题：

与 shared 协议大量重复：jyotish_theory_protocol.md 和 jhora_usage_guide.md 里已经定义了 BAV/SAV 映射、Dasha 展开策略、Transit 验证等规则，但 analyst_prompt 里又大段重复了这些规则（特别是"工具调用协议"和"时间片多维验证"段落）。这会导致 token 浪费，且两处不一致时模型会困惑。
"分析流程阶段"章节混入了 task 编排逻辑：第 0-4 节（启动读取顺序、单步执行循环、时间片回写、时间片选择逻辑、多维验证）本质上是流程控制指令，和角色身份设定、输出协议混在一起，增加了理解负担。
建议：

分析师提示词应拆成清晰的章节结构：
1. 身份设定（who you are）
2. 团队协作规则（who you work with）
3. 核心工作流规则（how you work）
4. 输出协议（what you produce）
5. 启动与执行流程（execution procedure）
6. 引用协议索引（what to read, not copy）
对于 shared 协议中已定义的规则，只写引用指令（如"BAV/SAV 规则遵守 jhora_usage_guide.md §7"），不要重复全文。
🔴 2. 检查师（checker_prompt.md）—— 最需要重构的角色
当前最大的结构性问题：检查师现在需要承担两种完全不同的审查模式，但提示词没有清晰地隔离它们。

你已经意识到了这个问题并加了"审查模式识别"段落，区分了 模式 A（技术审查 Analyst 产物） 和 模式 B（保真审查 Writer 产物）。但以下问题仍然严重：

(a) 模式 B 太简陋

"润色文稿专项检查清单"只有 4 条 checklist，与模式 A 的十几页细节形成巨大反差。模式 B 至少需要补充：

时间窗口保真检查：原稿说"2025.06-08"，润色稿有没有变成"今年夏天"这种模糊化？
证据编号完整性：段末脚注是否丢失了某些编号？
语气一致性：各章节之间的语气是否统一？有没有前半段很接地气后半段又变成播音腔？
B2 行动建议保真：Do/Don't 建议有没有被改写成鸡汤？
(b) 模式切换机制不够强

当前只靠一句"通过 task_read 确认当前待审产物的来源角色"来区分模式。但 GPT 在长提示词下很容易"忘记"自己应该用哪个模式，导致审查 Writer 产物时不自觉地套用了模式 A 的技术审查标准（去查 Shadbala、核验 D10 分盘），浪费算力且跑偏。

建议：

在提示词开头用强制指令隔离：
## 启动协议（每次审查前第一步）
1. 调用 task_read 确认来源角色
2. 若来源 = analyst → 跳转到 §A 技术审查，忽略 §B
3. 若来源 = writer → 跳转到 §B 保真审查，忽略 §A
⚠ 两个模式的检查项互斥，严禁混用
§A 和 §B 用极强的视觉分隔（如 ===== 分隔线 + 大号标题）
(c) 各阶段专项检查清单的覆盖不均

步骤 2-2（罗睺-计都）和 3-3（Jaimini + Ashtakavarga）没有专项清单，而是退化为了一大段"通用检查"的复制粘贴。这段通用检查文字几乎占了这两个步骤描述的 80%，非常浪费 token。
建议：把通用检查提取成一个明确的"通用检查基线"章节，放在所有专项清单之前。每个步骤只写增量检查项。对于没有专项内容的步骤，只写一行"本步执行通用检查基线，无增量专项"。
🟡 3. 润色师（writer_prompt.md）—— 方向正确但存在可操作性问题
优点：

"老友交心"的定位非常好
禁用词表、去 AI 味规则、强制举例规则都很实用
红线定义清晰（R1-R6）
问题：

(a) 缺少"你会输出什么"的清晰结构

提示词花了大量篇幅说"怎么写"（语气、禁用词、举例），但没有明确定义润色后的完整输出结构。润色师拿到一个 analyst 产物后，最终应该输出什么格式的文件？Part A 怎么处理？Part B 怎么重组？段末脚注什么格式？这些都散落在各处，没有一个完整的模板。

建议：加一个"输出模板"章节：

## 输出模板
### Part A（原样通顺化）
[保留原文结构，仅修正语病]

### Part B（分组叙事改写）
**{小标题1}**
{2-4句连贯叙事}
> 技术参考：ME1, ME3 | 反证：MCE1

**{小标题2}**
...
(b) 检查师建议的处理规则缺失

提示词里写了 *(保留你原有的表格内容)*，说明这块内容你还没写完。这是一个关键缺口——润色师收到检查师的修改意见后应该怎么处理？直接改？标注修改原因？这需要明确。

(c) 对不同步骤类型的润色策略没有区分

基线步骤（1-1 到 3-3）、本命综合结论（4-1）、本命模块（6-x）、时间片步骤（7-x）的 Part B 结构差异很大（B0/B1/B2 的定义都不同），润色师应该用不同的改写策略。但当前提示词是通用的，容易导致润色师用同一种"茶室聊天"模式处理所有步骤，丢失时间片步骤中 Do/Don't 的操作性。

三、Task 流程设计问题
🔴 1. Writer 和 Checker（审 Writer）的流程缺失
这是你自己提到的最大缺口。当前 task.default.yaml 里每个步骤只有三个 description：analyst → checker → writer。但缺少 checker 审 writer 的环节。

建议方案：

在 workflow.yaml 的流程中，每个 step 的 agent 循环应该是：

analyst → checker(A模式) → [revise loop] → writer → checker(B模式) → [revise loop] → done
在 task.default.yaml 中，每个步骤的 description 应该增加一个 checker_writer 字段（或者在 checker 的 description 里加一段 writer_review 子段落），定义检查师审查 writer 产物时的专项指引。

current_step 的游标格式也需要扩展，比如：

round1-1-1-analyst → round1-1-1-checker → round1-1-1-writer → round1-1-1-checker_review → round1-1-2-analyst
🟡 2. task.default.yaml 中 checker description 的不一致
有些步骤（如 1-1、2-1、2-3、3-1、3-2、4-1）有详细的专项检查清单，但另一些步骤（2-2、3-3、6-1、7-0、7-1-0）退化为大段复制粘贴的通用检查。这种不一致会导致：

有专项清单的步骤检查质量高
没有专项清单的步骤检查质量取决于模型的发挥
建议：每个步骤的 checker description 应该统一格式："执行通用检查基线 + 以下增量检查项：[list]"。

🟡 3. Writer description 太简陋
几乎所有步骤的 writer description 都是一句话："基于已通过的 analyst 输出与 checker 结论，整理面向用户的可读稿"。这给了润色师几乎零指引，导致输出质量完全依赖润色师提示词的通用规则。

建议：每个步骤（或至少每个阶段类别）的 writer description 应该包含：

本步润色的重点读者关切（如 1-1 的重点是让用户了解自己的基础性格画像）
本步特殊的语气要求（如 4-1 综合结论需要更郑重，风险清单需要更直白）
本步的去术语化重点（如 2-1 行星状态步骤有大量术语需要转化）
四、跨文件一致性问题
问题	位置	说明
证据标记体系在 3 个地方定义	analyst_prompt, checker_prompt, md_prompt	三处内容基本一致但表述不同，维护成本高
B2 去术语化红线在 4 个地方定义	natal_module_skeleton, career.md, md_prompt, ad_prompt	应统一放在 shared 协议中，各处只引用
note.md 写入规范在 3 个地方定义	analyst_prompt, md_prompt, ad_prompt	应提取为 shared 协议
输出协议（Part A/B）在多处定义	analyst_prompt（基线版）, natal_module_skeleton（模块版）, md_prompt（MD版）, ad_prompt（AD版）	每层有差异是合理的，但通用部分（如证据格式、回链规则）应提取到 shared
五、改进优先级建议
优先级	改动	理由
P0	检查师提示词重构：清晰隔离 A/B 模式，补全模式 B 检查项	当前模式 B 几乎是空壳，无法有效审查润色师
P0	task 流程补全：加入 checker 审 writer 环节	你的核心需求"防止润色过度"完全没有流程保障
P1	润色师提示词补全：增加输出模板、步骤类型差异化策略	当前润色师缺乏结构化指引
P1	提取 shared 协议：证据标记体系、去术语化红线、note.md 规范	消除跨文件重复，降低维护成本
P2	分析师提示词瘦身：去除与 shared 协议重复的内容	节省 token，减少不一致风险
P2	task.default.yaml 中 checker/writer description 标准化	提高各步骤检查和润色质量的一致性

改完了，给你总结一下改动：

分析师提示词（analyst_prompt.md）改动
结构重组：从"混杂大文"变为"9 个清晰章节"
章节	内容	对应原文
§1 身份设定	who you are — 三层角色定位（技法层/表达层/协作层）	原"角色设定"段，精简为 bullet 式
§2 团队协作	who you work with — 团队角色表、Team-mailbox 协议、检查师交互规则	原文散落在"核心规则"和"工具调用"中的协作内容，抽取聚合
§3 核心工作流规则	how you work — 自主决策、task 动态调整、体系严谨、时间边界	原"核心规则"7 条，瘦身合并为 4 小节
§4 工具调用协议	what tools — JHora/Subagent/Task 工具	原"工具调用协议"段，删除了与 shared 协议重复的具体算法
§5 双层表达与证据体系	表达标准 + 证据标记体系	原规则 4/5/7，用表格替代长文
§6 输出协议	what you produce — Part A/B 默认定义	原 Part A/B 段，原样保留
§7 单步执行循环	每步执行的 5 个动作	原"1. 单步执行循环"，精简
§8 workspace 架构	目录树参考	原样保留
§9 共享协议索引	两个 shared 文件的引用表	新增，明确告诉模型"去那边读，这里不重复"
删除并迁移到 kickoff 的内容
以下内容从系统提示词中完全删除，移入 workflow.yaml 的 kickoff 消息：

§0 启动读取顺序（7 步） → kickoff 的"启动顺序"
§2 时间片与回写联动 → kickoff 的"时间片与回写联动"
§3 时间片自主选择逻辑（4 步 + 子任务树 + 聚合关系图）→ kickoff 的"时间片自主选择逻辑"
§4 时间片多维验证（高频红线） → kickoff 的"时间片高频红线"
瘦身效果
指标	改前	改后	变化
analyst_prompt.md	18,875 字节	12,762 字节	-32%
workflow.yaml kickoff	2,589 字节	7,611 字节	+194%（吸收了迁移内容）
总 token 消耗	系统提示词每轮都消耗	kickoff 只在首次发送	净节省
关键点：系统提示词每一轮对话都会被完整送入上下文，而 kickoff 消息只在启动时发送一次。把"一次性执行指令"从系统提示词移到 kickoff，每轮对话都能节省约 6KB 的 token。

需要我接着改检查师提示词吗？那是优先级最高的问题（A/B 模式隔离 + 模式 B 补全）。

Ran for 4m 15s

先讨论一下，我觉得你把太多的消息放到这个初始入口消息这里了，就怕后面他忘了呀，因为这个初始入口消息只会发送一次，有些你应该放到task里面和工具使用，比如说印章技法文档里面，比如说时间片与回写联动这里，一部分放入分析师系统提示词，一部分放入task，一部分放入印占技法文档

你说得对，我重新想一下这个分层逻辑。

核心问题是：什么内容会被"忘掉"？ 这取决于消息在上下文中的持久性：

载体	持久性	适合放什么
系统提示词	每轮都在	身份、规则、输出协议——必须时刻记住的
kickoff 入口消息	只发一次，随对话推移被挤远	一次性启动动作（读什么文件、调什么工具）
task description	每次 task_read 都刷新	当前步骤的具体指令、产物路径
shared 协议文件	按需读取	技法规则、工具使用细节
按这个逻辑重新分配你提到的那几块内容：

时间片与回写联动
这块有三条规则：

"出现明确时间窗口时在报告中标注'待时间片细化'" → 这是分析师每一步都要遵守的行为规则，应该在系统提示词的 §3.4 时间边界里。实际上我已经放了一句话版本在那里了。

"通过 task_update 同步更新后续时间片步骤" → 同上，属于 task 调整规则，系统提示词 §3.2 已经覆盖了通用调整权限。但"时间窗口触发更新"这个具体触发场景可以加回 §3.4。

"时间片步骤产出新证据后允许回写前序结论" → 同上，系统提示词 §3.4 已有。

结论：这三条都应该在系统提示词 §3.4，kickoff 里不需要重复。我之前放 kickoff 里确实多余了。

时间片自主选择逻辑（4 步 + 子任务树）
这块很长，有 4 个步骤 + 子任务树结构 + 产物聚合关系。问题是放哪：

这套逻辑只在 7-0 步骤执行时需要，不是每步都要记住的
但 7-0 是分析师自己要执行的，不是靠 task description 就能完全驱动的（因为涉及 jhora_dasha 调用和动态建树）
我觉得应该这样拆：

内容	放在哪	理由
时间片的原则（"自主决定覆盖范围，以分析价值为准则"）	系统提示词 §3.4 加一句话	需要长期记住的原则
时间片选择的4 步具体操作（获取 Dasha → 选范围 → PD 条件 → 建树）	task.default.yaml 中 7-0 步骤的 description.analyst	已经在那里了，而且更详细
子任务树结构模板	task.default.yaml 的 7-0 description	同上，已有
产物聚合关系图	jhora_usage_guide.md 或单独的 shared 文件	属于技法层面的产物架构约定
时间片高频红线
"Dasha 定方向，Transit 给扳机，BAV 验有效，Tajaka 补跨年，Yoga 看激活"

这 5 句话 + 4 条红线：

本质上是印占技法规则，不是工作流规则
jyotish_theory_protocol.md 里已经有 Yoga 显化原则（§11）和 Vargas 红线（§12），但没有这个"五句口诀"的浓缩版
jhora_usage_guide.md 的 §6 有 Transit 触发有效性判断、§7 有 BAV 映射
结论：这个"五句口诀 + 4 条红线"应该加到 jyotish_theory_protocol.md 里作为一个新章节（比如 §14 时间片多维验证口诀），然后系统提示词 §9 的索引表里已经指向了这个文件，不需要在 kickoff 里重复。

修改方案
这样的话 kickoff 应该瘦回去，只保留：

身份确认（1 句）
启动顺序 7 步（一次性动作，这个 kickoff 是正确的位置）
运行规则 5 条（task_update 格式等操作约定，这个也合理）
一句收尾"请立即从第 1 步开始执行"
你觉得这个分配合理吗？如果没问题我就动手改三个文件：

analyst_prompt.md — §3.4 补回"时间窗口触发 task 更新"的具体场景描述
workflow.yaml kickoff — 删掉"时间片与回写联动"、"时间片自主选择逻辑"、"时间片高频红线"三段
jyotish_theory_protocol.md — 新增 §14 时间片多维验证口诀（5 句原则 + 4 条红线）
Ran for 38s

task格式约定系统提示里有了吧，而且会传入工具描述，kickoff这里可以考虑不用放taskupdate格式约定，你修改下

确认一下：系统提示词 §4.3 已经有 task_update.set_current 的格式和示例了，而且工具描述本身也会包含参数格式。所以 kickoff 的"运行规则"5 条里确实有重复。

让我把三个文件一起改了。


Read 1 file
Good, §3.4 needs a bit more detail about the trigger-update mechanism. Now let me make all three changes.


3 tool calls
Edit
share/yinzhan/prompts/analyst_prompt.md
Edit
share/yinzhan/prompts/analyst_prompt.md
Bash
cd /workspace/share/yinzhan/prompts...
Now update the workflow.yaml kickoff — slim it down to just startup sequence + minimal runtime rules.


Wrote 1 file
Write
share/yinzhan/workflow.yaml
+59
Now add §14 to jyotish_theory_protocol.md with the timeline verification principles and red lines.


2 bash commands
Ran for 1m 25s
下一步干什么你直接告诉我，不用施工