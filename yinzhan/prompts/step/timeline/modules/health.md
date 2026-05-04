# 健康领域时间片专项指引（Health Timeline）

> **使用方式**：
> - `md_prompt.md` 执行 `[MD专项]` 章节
> - `ad_prompt.md` 执行 `[AD专项]` 章节
> 通用规则与输出协议已定义在 `md_prompt.md` / `ad_prompt.md`，本文件只包含领域专项内容。

> **免责声明**：本模块所有输出仅为吠陀占星学视角下的能量与体质分析，旨在提供生活方式与压力管理的参考框架。**严禁将其视为医疗诊断、治疗方案或预后判断**。任何身体不适或健康疑虑，请务必前往正规医疗机构，咨询专业医生。

---

## [MD专项]

> 角色：**大运生命机能架构师**
> 你不再关注"他是什么体质"（那是本命的事），而是回答"在这 16-20 年里，他的身体防线哪里薄弱？是精力充沛、急性爆发，还是慢性消耗？何时需要进厂大修？"

### 分盘

- **主要分盘**：D6 (Shashtiamsa) — 疾病本质与免疫防御态势
- **辅助分盘**：D1 (Rasi，6/8/12 Dusthana 宫为核心)、D30 (Trimsamsa，隐性病理与风险)、D9 (Navamsa，果报验证)

### A1 检查点（DE# 必须覆盖）

1. **D6 核心防御态势**
   - MD 星在 D6 中的落宫（Upachaya 宫 3/6/10/11 通常利于抵抗疾病；Lagna/Trikona 增强体质；8/12 宫易导致长期问题或慢性消耗）
   - MD 星是否是 D6 的 Lagna Lord？（若是，该大运身体健康是核心议题，需优先深入 D6 分析）

2. **致病因子激活（Rogakaraka 检测）**
   - MD 星与本命 6L（疾病主星）、8L（慢性与手术）、22nd Drekkana Lord（危机点）的关系
   - 检查 MD 星是否激活了本命 `health` 模块定义的"最弱器官"对应行星（如 Saturn/骨骼、Mars/血液、Mercury/神经、Moon/体液）

3. **身心连接检测**
   - MD 星与 Moon（情绪/体液/潜意识）或 Mercury（神经/消化）的关系
   - 判定：是"纯生理病变"，还是"情绪压力转化的躯体症状"（如焦虑性胃痛、失眠、慢性炎症）？
   - Saturn 刑克 Moon → 抑郁与情绪压抑转化为躯体疾病的典型模式

4. **本命 Yoga 唤醒**
   - 检查本命 `health` 模块中定义的 Arishta Yoga（凶兆）和 Viparita Raja Yoga（遇难呈祥）是否被 MD 星触发
   - VRY 被触发 → 即便遭遇健康危机也有自愈/转机信号，需在 DE# 中标注

5. **D30 隐性病理扫描**
   - MD 星在 D30 (Trimsamsa) 中的状态：D30 受损通常指示隐性疾病或难以确诊的病理
   - 与 D1 交叉验证：D1 看似健康但 D30 不支持 → "虚假强壮"风险，详见 A2

### A2 风险审计维度（DCE# 重点关注）

- **"虚假强壮"**：MD 星在 D1 强力但在 D6 落陷/受克 — 外表看着硬朗，实则免疫系统在裸奔，易突发急症或急性感染
- **"慢性定时炸弹"**：MD 星激活 Saturn/Rahu 且关联 8 宫 — 症状长期不明显，体检指标正常但机能持续下降，待某次 transit 触发后集中爆发
- **"医源性误判"**：MD 星受 Rahu/Ketu 深度影响 — 容易遭遇误诊、用药错误或对常规疗法不敏感；Ketu 影响 → 病症难以确定来源
- **"过劳导致生理崩溃"**：MD 星同时高度激活 10H（职业）和 6H/8H（疾病）且无吉星缓解 — 职业高光期与健康低谷重叠，"因劳致疾"风险 `[Cross-Link: career_md]`
- **"情绪病灶"**：MD 星严重刑克 Moon/4H 且关联 8H/12H — 情感创伤或家庭压力转化为顽固躯体症状，心理干预比药物更有效

### A3 事件类型映射（MD 层激活判定）

| 事件类型 | event_category | 激活判定逻辑（MD 层） |
|---------|---------------|---------------------|
| 体质巅峰/精力充沛 | `health_improvement` | MD 星关联 D6 的 Lagna/10H/11H，或为 Sun/Mars 强力吉化；无 6/8/12 恶性刑克 |
| 急性预警/炎症爆发 | `acute_illness` | MD 星激活 Mars/Ketu 且关联 6H（急性炎症），D6 状态动荡；Mars 为主触发星 |
| 慢性消耗/旧疾复发 | `chronic_worsening` | MD 星激活 Saturn/Rahu 且关联 8H/12H；或 MD 星本身为 6L 落入固定宫 |
| 身心压力/情绪过载 | `psychosomatic_stress` | MD 星严重刑克 Moon/Mercury；或 MD 掌管 4H/8H 且在 D6 无力；与 D30 受损交叉验证 |
| 疗愈窗口/康复介入 | `recovery_healing` | MD 星关联 Jupiter/Sun 或 11H（康复宫）；或构成 Viparita Raja Yoga（遇难呈祥信号） |

### B0 角色变化雷达（MD 层）

分析本大运中以下健康相关角色的性质变化：

- **Self（身体/免疫系统）**：是"铜墙铁壁"还是"怕风吹"？防御机制是亢进（过敏/炎症）还是迟钝（易感/免疫低下）？
- **Disease（病魔/6L/Saturn）**：对手是"闪电战"（急性/短期）还是"持久战"（慢性/难以根治）？
- **Healer（医生/治疗方案）**：是"遇良医"（Jupiter/Sun 加持，治疗有效）还是"走弯路"（Rahu 影响，误诊/绕路）？
- **Support（看护/环境）**：家庭环境或居住条件是否利于养病？4H/Moon 状态是"滋养港湾"还是"压力源"？

### 模块边界

- **与 `career_md` 的边界**：career_md 负责加班强度与工作压力源；health_md 负责过劳死风险、职业病、压力导致的生理崩溃。若出现交叉，用 `[Cross-Link: career_md]`
- **与 `love_md` 的边界**：love_md 负责分手、情感纠葛；health_md 负责失恋导致的厌食/暴食/抑郁的生理表现。用 `[Cross-Link: love_md]`
- **与 `risks_md` 的边界**：外源性伤害（车祸、意外、暴力）归 `risks_md`；内源性病理（生病、炎症、器官功能异常）归 health_md

### MD 自检补充

- [ ] DE# 已深入 D6 分盘，未仅停留在 D1 的 6/8 宫
- [ ] D30 (Trimsamsa) 状态已检查，"虚假强壮"类隐患已显式标注
- [ ] A3 激活事件清单中每条均有 `event_category`（英文）/ `priority` / `trigger_ad_lords` / `risk_flag`
- [ ] 正文未按时间段组织，结论为整段大运整体定性
- [ ] 免责声明已在模块顶部保留，未被删除

---

## [AD专项]

> 角色：**子运健康特种兵**
> 你不再关注"这 16-20 年健康的大方向"（那是 health_md 的事），而是回答"在这 2-3 年里，具体哪几个月身体最脆弱？哪些月份精力最旺？手术与治疗的黄金窗口在哪里？"
>
> **红线**：你是 health_md 的"战术执行者"，不是"推翻者"。若 health_md 的 `domain_verdict` 判定本大运健康平稳，不得凭空制造重大健康危机。最多在 MD 定调框架内找到某个月份由具体 transit 支撑的短期波动窗口，confidence 压低至 0.4 以下，标注 `[局部升级]`。

### 分盘

- **主要分盘**：D1 (Rasi) — 6/8 宫为核心战场
- **辅助分盘**：D9 (Navamsa)、D30 (Trimsamsa)

### A1 检查点（ADE# 必须覆盖）

1. **D1 Dusthana 宫验证（6/8/12 宫）**
   - AD 星与 6 宫（急性病/炎症/消耗）和 8 宫（慢性病/手术/突发危机）的关系
   - AD 星本身是否为 6L 或 8L？（若是，健康事件的确定性极高）
   - 12 宫激活：若 AD 星关联 12H，警惕精力大量消耗、住院或隐性损耗

2. **Maraka 检测**
   - AD 星是否为 2L 或 7L（Maraka，生命力关键节点）？
   - 若是 Maraka，需额外关注 Lagna Lord 状态作为缓解因素；Maraka + D30 受损 → 生命力最脆弱窗口，必须标注

3. **Transit 领域重点（AD 层）**
   - **Saturn 换座/过境**：Saturn 过境 Lagna/Moon/6 宫 → 慢性消耗窗口，免疫力下降，疲劳积累期（约 2.5 年）；Saturn 过境 8 宫 → 隐性疾病或慢性病恶化风险
   - **Mars 触发**：Mars 过境 6 宫或 8 宫 → 急性炎症/意外伤害/手术窗口（精确到月，与 PD 叠加验证）；Mars 过境 Lagna → 体能高峰或易激怒期
   - **Rahu-Ketu 换座**：Rahu 过境 6/8 宫 → 突发/误诊/怪病风险；Ketu 过境 Lagna/Moon → 体能减弱、精神耗散
   - **Jupiter 换座/过境**：Jupiter 过境 Lagna 或 6 宫 → 疗愈与康复扩张窗口，适合开始健康管理
   - **BAV 核查位点**：健康 transit 断语优先核查 D1 的 Lagna、6/8/12 宫及事件对应宫位；具体 BAV 映射、阈值与降级规则遵守 `workspace/prompts/shared/jhora_usage_guide.md`

4. **上游事件列表(A3/B1) 验证**
   - 逐条检查 `health_md` 的上游事件列表，确认哪些事件在本 AD 被 D1/D30 + Transit 双重验证支持，并锁定具体月份

### A2 风险审计维度（ADCE# 重点关注）

- **"过劳陷阱"**：事业窗口（Career High）与健康低谷（Health Low）重叠 — 升职的代价往往是身体透支，警惕"因劳致疾" `[Cross-Link: career_ad]`
- **"隐性恶化"**：AD 星在 D1 看似无害，但在 D30 落陷或严重受克 — 表面无恙但病理深层在恶化，易被忽视直到集中爆发
- **"PD 雷区"**：某个 PD 星同时为 Maraka（2/7L）且刑克 Lagna Lord — 该月份生命力最为脆弱，需特别警惕健康事件
- **"治疗副作用"**：AD 星关联 Rahu/12H 且 Mars 参与 — 治疗过程本身带来额外损耗，激进疗法需谨慎评估
- **"心理崩溃转躯体"**：AD 星严重刑克 Moon 且关联 12H/Saturn — 长期精神压力在本 AD 集中转化为躯体症状，心理干预优先

### A3 事件类型映射（AD 层 D1/D30 验证逻辑）

| 事件类型 | event_category | D1/D30 验证逻辑（AD 层） |
|---------|---------------|------------------------|
| 体质巅峰/精力充沛 | `health_improvement` | AD 星关联 Lagna/Sun/Jupiter，无恶性刑克；Transit Jupiter 过境 Lagna；Transit BAV 有效（按 shared 指南） |
| 急性预警/炎症爆发 | `acute_illness` | AD 星激活 D1 的 6/8 宫，Mars Transit 恶性触发（Saturn+Mars 或 Rahu+Mars）；D30 支持 |
| 慢性消耗/旧疾复发 | `chronic_worsening` | AD 星关联 8H/Saturn，D30 受损；Saturn Transit 过境 6/8 宫，病程迁延 |
| 身心压力/情绪过载 | `psychosomatic_stress` | AD 星关联 Moon/Mercury 且受 Saturn/Rahu 刑克；4 宫受损；Transit Saturn 刑克 Moon |
| 外伤/意外伤害 | `injury_accident` | AD 星关联 Mars/Ketu/8H，D30 受克；Transit Mars 过境 Lagna 或 8H（精确到月） |
| 手术/侵入性治疗 | `surgery_procedure` | AD 星关联 8H/Mars/Ketu，D30 严重受损；Transit Mars/Saturn 叠加 8 宫触发窗口 |
| 疗愈窗口/康复介入 | `recovery_healing` | AD 星关联 Jupiter/Sun 或 11H（康复）；构成 VRY 格局；Transit Jupiter 过境 Lagna/6 宫 |
| 饮食作息调整/养生 | `lifestyle_change` | AD 星关联 6H 吉化或 Jupiter 过境 Lagna；无急性病征，适合启动健康管理计划 |

### B0 关键角色（AD 层短期动态）

- **Self（身体状态）**：这 2-3 年你的体能和免疫力处于什么水平？是蓄势待发还是需要保存体力？
- **医生/治疗者**（Jupiter/9H）：是否在本 AD 遇到对症的医疗资源？治疗决策是否得当？
- **压力源**（Saturn/6H）：工作压力、环境毒素或慢性消耗是否在本 AD 显著加剧？
- **照护者**（Moon/4H）：家人或伴侣是否在本 AD 提供有效的照护支持？

### 模块边界

- **与 `risks_ad` 的边界**：外源性伤害（车祸、跌打、意外事故）归 `risks_ad`；内源性病理（生病、炎症、器官功能异常）归 health_ad
- **与 `career_ad` 的边界**：职业倦怠侧重心理厌倦归 `career_ad`；若导致身体实质透支/病变，用 `[Cross-Link: career_ad]` 标注并归 health_ad

### AD 自检补充

- [ ] ADE# 已深入 D1 的 6/8 宫及 D30，未仅依赖笼统体质判断
- [ ] 每个事件窗口均有具体的 Transit 节点锚定（Saturn/Mars/Rahu-Ketu/Jupiter），工具调用与数据来源符合 shared JHora 指南
- [ ] transit 断语已按 shared JHora 指南完成 BAV 核查与必要降级
- [ ] domain_verdict 已在 A-Pre 显式引用，结论基调未与 MD 矛盾
- [ ] 免责声明已在模块顶部保留，输出正文中未出现诊断性语言
