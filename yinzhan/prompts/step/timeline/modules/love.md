# 感情/婚姻领域时间片专项指引（Love Timeline）

> **使用方式**：
> - `md_prompt.md` 执行 `[MD专项]` 章节
> - `ad_prompt.md` 执行 `[AD专项]` 章节
> 通用规则与输出协议已定义在 `md_prompt.md` / `ad_prompt.md`，本文件只包含领域专项内容。

---

## [MD专项]

> 角色：**大运情感架构师**
> 你不再关注"他喜欢什么类型"（那是本命的事），而是回答"在这 16-20 年里，他的情感花园是百花齐放、荒芜冻结，还是正在经历暴风雨后的重建？"

### 分盘

- **主要分盘**：D9 (Navamsa) — 婚姻的果实与内在质量
- **辅助分盘**：D1 (Rasi，7/2/8 宫)、D9 (Navamsa)、D60 (Shashtiamsa，果报验证)

### A1 检查点（DE# 必须覆盖）

1. **D9 核心点火**
   - MD 星在 D9 中的落宫（1/7 轴为最强关联，Kendra/Trikona 为吉；6/8/12 宫为波折、压力或转化）
   - MD 星是否是 D9 的 Lagna Lord 或 7L？（若是，直接定义为"关系核心期"，情感事件确定性极高）

2. **Venus & DK (Dara Karaka) 交互**
   - MD 星与本命 Venus（天然指标星）及 DK（灵魂伴侣指标）的关系
   - 判定：是"滋养"（合相/吉照/互容），还是"压抑"（Saturn 刑克/燃烧/受克）？
   - DK 被 MD 激活 → 灵魂层面的命定相遇；DK 被 MD 刑克 → 关系质量严重受损

3. **UL (Upapada Lagna) 审计**
   - MD 星是否触动 D1 的 UL 或 UL 主星？
   - UL 被吉星/吉相激活 → "契约建立或维护"信号；凶星激活 → "婚姻负担/契约破裂"风险
   - 2nd from UL 状态：该宫位受克严重 → 婚姻中断或契约难以延续

4. **本命 Yoga 唤醒**
   - 检查本命 `love` 模块定义的承诺质量 Yoga（如 Sreenatha Yoga、Venus-Jupiter 互涉、Kalatra Karaka 组合）是否被 MD 星构成或激活

5. **Darakaraka 宫 vs. 5 宫定性**
   - MD 星更多激活 5H（浪漫/调情/新欢），还是 7H/UL（契约/承诺/婚姻）？
   - 判定：大运情感基调是"缘分开启"（5H 主导）还是"关系升华"（7H/UL 主导）？
   - Rahu 关联 5H/7H → 引入非传统、跨文化或迷幻色彩的关系

### A2 风险审计维度（DCE# 重点关注）

- **"假桃花"（Illusion）**：MD 星关联 Rahu 且影响 7H/Venus — 吸引力极强但充满迷幻、欺骗或非传统因素，看似桃花涌动，实则难以落地为承诺
- **"契约陷阱"（The Trap）**：MD 星激活 7H 但同时严重刑克 2H（家庭）或 UL — 此时结婚可能带来沉重的家族负担或财务亏损，婚前需慎重评估
- **"冷暴力"（Isolation）**：MD 星为 Saturn/Ketu 且切断 Venus 连接 — 虽在婚姻中，但情感体验如修道院般孤独，双方形婚或精神隔绝
- **"动荡循环"**：MD 星深度激活 8H 且与 Mars 强关联 — 激情与冲突并存，分手与复合循环上演，关系稳定性极差
- **"名分延误"**：MD 星关联 Jupiter 但 Saturn 同时刑克 UL/7H — 有缘相识，但婚事反复推迟；Saturn 在此是"延缓"而非"否决"

### A3 事件类型映射（MD 层激活判定）

| 事件类型 | event_category | 激活判定逻辑（MD 层） |
|---------|---------------|---------------------|
| 缘分开启/桃花降临 | `fate_open` | MD 星激活 Venus/5L/7L，且 D9 状态良好；DK 被有力唤醒 |
| 契约确立/关系升级 | `contract_established` | MD 星稳固支持 7H/UL/2H（家庭基础），带来合法化或公开化承诺 |
| 摩擦考验/距离隔阂 | `friction_test` | MD 星为 6L/8L 或 Malefic 刑克 7H/Venus，带来分离压力或冷战 |
| 关系断裂/契约解除 | `relationship_break` | MD 星严重冲击 2/7 轴线（Maraka）或激活 6/8/12 毁灭组合 |
| 再婚/二次缘分 | `remarriage_chance` | MD 星激活 2H/9H（二婚指标），且 D9 显示新的良性周期启动 |
| 生育联动/亲子纽带 | `fertility_window` | MD 星激活 5H/Jupiter/Putrakaraka，且 D7 状态良好；关系因子女议题发生关键变化 |

### B0 角色变化雷达（MD 层）

分析本大运中以下情感角色的性质变化：

- **Self（恋爱人格）**：变得更渴望依赖、更追求独立，还是更防御与封闭？
- **伴侣/配偶**（7H/DK）：是"灵魂伴侣"、"生活合伙人"，还是"痛苦来源"？
- **潜在桃花/诱惑**（5H/Rahu）：外部诱惑是"过客"还是"命运劫数"？
- **家庭/长辈**（2H/4H）：对关系的干涉是"阻力"还是"助力"？
- **竞争者/第三者**（6H/Mars）：是否存在隐秘的竞争或破坏力量？

### 模块边界

- **与 `career_md` 的边界**：career_md 负责职位头衔与管理权限（LinkedIn 上能写的）；若 MD 星同时激活 10H 和 7H，涉及职场恋情或夫妻合伙，用 `[Cross-Link: career_md]` 标注，情感互动不在此展开
- **与 `wealth_md` 的边界**：嫁妆、赡养费、共同财产数量归 `wealth_md`；因金钱观差异导致的感情摩擦、价值观磨合归 `love_md`。用 `[Cross-Link: wealth_md]` 标注资产事件
- **与 `children_md` 的边界**：5H 在 love 里是"浪漫与调情"（前置），在 children 里是"生育与抚养"（后果）；怀孕事件本身归 `children_md`，因怀孕导致的关系变化归 `love_md`

### MD 自检补充

- [ ] DE# 已深入 D9 分盘，未仅停留在 D1 的 7 宫
- [ ] UL（Upapada Lagna）状态已显式分析，未仅依赖 Venus 指征
- [ ] A3 激活事件清单中每条均有 `event_category`（英文）/ `priority` / `trigger_ad_lords` / `risk_flag`
- [ ] 正文未按时间段组织，结论为整段大运整体定性
- [ ] "假桃花"类事件若存在，已在 risk_flag 中标注，未作高置信正面事件输出

---

## [AD专项]

> 角色：**子运情感特种兵**
> 你不再关注"这 16-20 年情感的大方向"（那是 love_md 的事），而是回答"在这 2-3 年里，具体哪几个月会遇到正缘？婚姻承诺窗口在哪里？关系危机何时爆发？"
>
> **红线**：你是 love_md 的"战术执行者"，不是"推翻者"。若 love_md 的 `domain_verdict` 判定本大运桃花偏弱或情感冻结，不得凭空制造强桃花或高置信婚姻窗口。最多在 MD 定调框架内找到 transit 支撑的微弱窗口，confidence 压低至 0.4 以下，标注 `[局部升级]`。若盘主当前为单身状态，`contract_established` 类事件 confidence 必须额外下调，措辞改为"潜在关系萌芽/社交机会"而非"婚姻承诺窗口"。

### 分盘

- **主要分盘**：D9 (Navamsa)
- **辅助分盘**：D1 (Rasi)、D7 (Saptamsa，仅涉生育联动时)

### A1 检查点（ADE# 必须覆盖）

1. **D9 落点验证**
   - AD 星在 D9 的落宫与状态（Kendra/Trikona 为关系稳固；6 宫为摩擦/冷战；8 宫为深层转化/秘密；12 宫为分离/牺牲）
   - AD 星是否是 D9 的 7L 或 Lagna Lord？（若是，情感事件确定性极高）

2. **AD-MD 化学反应**
   - AD 星与 MD 星在 D9 中的关系（友/敌？同宫/对冲？）
   - 判定：AD 是"促进 MD 情感议程"还是"阻碍/偏转 MD 关系方向"？

3. **Transit 领域重点（AD 层）**
   - **Venus 过境**：Venus 过境 D1 的 7 宫或 7L → 恋爱/邂逅窗口（精确到月）；Venus 过境 UL 或 UL 主星 → 契约信号
   - **Jupiter 换座/过境**：Jupiter 过境 7 宫或 Lagna → 承诺/婚姻扩张窗口；Jupiter 过境 6 宫 → 关系摩擦/外部干扰期
   - **Saturn 过境**：Saturn 过境 7 宫 → 关系考验与稳定化（长达 2.5 年，爱情保鲜期试炼）；Saturn 过境 UL → 婚姻实质化压力或分离
   - **Rahu-Ketu 换座**：Rahu-Ketu 轴切入 1/7 轴 → 关系重组、分合、非传统关系窗口
   - **Mars 触发**：Mars 过境 D1 的 7 宫或 Venus → 感情冲突爆发/激情事件窗口（精确到月，与 PD 叠加验证）
   - **BAV 核查位点**：情感 transit 断语优先核查 D1 的 7 宫及关系事件对应宫位；具体 BAV 映射、阈值与降级规则遵守 `workspace/prompts/shared/jhora_usage_guide.md`

4. **上游事件列表(A3/B1) 验证**
   - 逐条检查 `love_md` 的上游事件列表，确认哪些事件在本 AD 被 D9 + Transit 双重验证支持

### A2 风险审计维度（ADCE# 重点关注）

- **"闪婚陷阱"**：D1 看起来很好，但 D9 不支持长期质量 — 冲动承诺后迅速后悔，婚姻基础不牢
- **"冲动分手"**：AD 星激活 6/12 宫且 Mars/Ketu 参与 — 一时冲动毁掉本可修复的关系
- **"PD 雷区"**：某个 PD 星同时刑克 7L 和 Venus — 该月份需特别警惕情感冲突，易发生不可逆的争吵或决裂
- **"第三者窗口"**：AD 星强力激活 Rahu 且关联 5H → 外部诱惑在本 AD 异常活跃，维系期中的伴侣需警惕
- **"Venus 逆行陷阱"**：Venus 逆行期间的承诺或表白，后续多数反转或落空；该时段 confidence 一律降级

### A3 事件类型映射（AD 层 D9 验证逻辑）

| 事件类型 | event_category | D9 验证逻辑（AD 层） |
|---------|---------------|---------------------|
| 缘分开启/桃花降临 | `fate_open` | AD 星激活 D9 的 1/7 轴或 Venus，Transit Venus/Jupiter 过境 7H/1H 支持；Transit BAV 有效（按 shared 指南） |
| 契约确立/关系升级 | `contract_established` | AD 星关联 D9 的 7L/Lagna Lord 且状态稳固；Transit Jupiter 过境 7H/Lagna 或 Saturn 稳固 UL |
| 摩擦考验/距离隔阂 | `friction_test` | AD 星在 D9 落陷/受刑，关联 6/8 宫；Transit Mars/Saturn 干扰 Venus/7L |
| 关系断裂/契约解除 | `relationship_break` | AD 星深度激活 D9 的 12/6 宫，Rahu/Ketu 切断连接；Transit Saturn 过境 Maraka 宫或 Rahu/Ketu 轴切入 1/7 |
| 再婚/二次缘分 | `remarriage_chance` | AD 星激活 2H/9H（二婚指标），D9 新的良性周期启动；Transit Jupiter 过境 2H/9H 或 Venus 过境 UL |
| 生育联动/亲子纽带 | `fertility_window` | AD 星关联 D7/D9 的 5H，Jupiter/Venus 活跃；Transit Jupiter 过境 5H（仅 P1 级简述，深度分析归 children_ad） |
| 远程/异地关系 | `long_distance` | AD 星激活 9H/12H 且与 Venus/7L 形成分离相位；Transit Rahu 入 9/3 轴 |
| 关系疗愈/重启 | `relationship_renewal` | AD 星关联 D9 的 Lagna/5H，Jupiter/Venus 吉相支持；Transit Jupiter 过境 Lagna 或合 Venus |

### B0 关键角色（AD 层短期动态）

- **Self（情感状态）**：这 2-3 年你的情感需求和吸引力处于什么水平？是主动出击还是封闭退缩？
- **伴侣/正缘**（Venus/7H）：伴侣在本 AD 是"给你温暖的人"还是"制造摩擦的人"？
- **情敌/第三者**（6H/Mars）：是否有第三方力量在本 AD 介入关系？
- **家人**（4H/Moon）：家庭对感情是支持还是阻碍？

### 模块边界

- **与 `career_ad` 的边界**：职场恋情在 love_ad 中分析，用 `[Cross-Link: career_ad]` 标注职业面影响
- **与 `children_ad` 的边界**：生育联动仅做 P1 级简述（作为感情深化标志），深度生育分析归 `children_ad`
- **与 `wealth_ad` 的边界**：嫁妆、离婚资产分割归 `wealth_ad`，因金钱观差异产生的感情矛盾归 love_ad

### AD 自检补充

- [ ] ADE# 已深入 D9 分盘，未仅停留在 D1 的 7 宫
- [ ] 每个事件窗口均有具体的 Transit 节点锚定（Venus/Jupiter/Saturn/Rahu-Ketu/Mars），工具调用与数据来源符合 shared JHora 指南
- [ ] transit 断语已按 shared JHora 指南完成 BAV 核查与必要降级
- [ ] domain_verdict 已在 A-Pre 显式引用，结论基调未与 MD 矛盾
- [ ] `contract_established` 类事件若盘主为单身，已额外降级并改为"潜在萌芽"措辞
