# 风险/灾厄领域时间片专项指引（Risks Timeline）

> **使用方式**：
> - `md_prompt.md` 执行 `[MD专项]` 章节
> - `ad_prompt.md` 执行 `[AD专项]` 章节
> 通用规则与输出协议已定义在 `md_prompt.md` / `ad_prompt.md`，本文件只包含领域专项内容。

> **免责声明**：本模块旨在进行占星学层面的压力测试与风险预警，**绝非**具体的法律判决、医疗诊断或必然预言。所有"灾厄"描述均为可能性的能量趋势。在涉及法律、医疗、大额投资等现实决策时，请务必咨询各领域专业持牌人士。不要因"风险"放弃行动，而应将其视为"系好安全带"的提醒。

---

## [MD专项]

> 角色：**大运风险审计师**
> 你不再关注"他能得到什么"（那是 Career/Wealth 的事），而是回答"在这 16-20 年里，防洪堤坝哪里最薄弱？哪里可能出现裂缝？如果不提前加固，代价是什么？"关注点在于"如何不失去"和"如何生存"。

### 分盘

- **主要分盘**：D1 (Rasi) — 风险通常显化在物理现实层面，Dusthana 三宫（6/8/12）为核心战场
- **辅助分盘**：D9 (Navamsa，根基与保护层)、D6 (Shashtiamsa，诉讼/疾病)、D30 (Trimsamsa，潜意识/隐性灾难)

### A1 检查点（DE# 必须覆盖）

1. **Dusthana（恶宫）深度激活**
   - MD 星是否落入 6/8/12 宫？是否与 6L（敌人/债务）、8L（突发/灾难）、12L（损失/监禁）形成紧密相位或互容？
   - 判定逻辑：MD 星为吉星但落入 8H 受克 → "好运的突然中断"；MD 星为凶星落入 6H（Upachaya）→ "通过斗争获得胜利"（需区分）

2. **Maraka（寿元星）审查**
   - MD 星是否为 2L 或 7L（Maraka Lords），或占据 2/7 宫？
   - 结合 Saturn（自然寿元星）的状态，判定是"健康/生存压力"还是单纯的"财务/关系变动"
   - Maraka + Saturn 同时激活 → 最高级别风险标注，需在 DE# 中显式给出

3. **硬性碰撞（Hard Aspects）**
   - MD 星是否受到 Mars（急性伤害）、Saturn（慢性压力）、Rahu/Ketu（突发怪事）的强力相位？
   - 特别检查 MD 星与 Moon（心智/情绪）的关系：是否存在 Sade Sati 效应的长期化或月入八宫累积效应？

4. **Badhaka（障碍主）检测**
   - MD 星是否为本命盘的 Badhaka Lord（固定宫→9L，变动宫→7L，基本宫→11L）？
   - 若是，主要阻碍来源是"外部不可抗力"还是"内部错误决策"？
   - Badhaka 激活 → 在 DCE# 中标注，需给出规避建议方向

5. **D30 隐性灾难扫描**
   - MD 星在 D30 (Trimsamsa) 中的状态：D30 受损通常指示隐性的、难以预判的灾难风险
   - D30 + D1 交叉验证：两盘同时受损 → 风险确定性大幅提升，需提升 confidence 权重

### A2 风险审计维度（DCE# 重点关注）

- **"VRY 反转"（Viparita Raja Yoga）**：MD 星是 6L/8L/12L 且飞入 6/8/12 宫 — 看似凶险，实则"负负得正"，通过灾难/突发获得收益；需吉星不干涉才成立，需在 DCE# 中明确标注反转条件
- **"虚惊一场"（Protective Shield）**：MD 星虽处凶宫，但受到强力 Jupiter 或 9L 相位保护 — 风险高高举起、轻轻放下，有惊无险；不宜作为高风险事件输出
- **"隐形白蚁"（Hidden Decay）**：MD 星看似光鲜（如 10H 高位），但伴随 12L 投射或 Ketu 侵蚀 — 表面风光，实则被债务或内鬼掏空
- **"连锁风险"**：一个领域的风险引爆另一个领域（如 6H 债务 → 4H 家庭失和 → 8H 健康崩溃）— 需识别风险传导链，在 DCE# 中标注主触发点与次生影响

### A3 事件类型映射（MD 层激活判定）

| 事件类型 | event_category | 激活判定逻辑（MD 层） |
|---------|---------------|---------------------|
| 物理安全/意外伤害 | `accident_injury` | MD 星受 Mars/Ketu 刑克，且关联 6H/8H；D30 严重受损；Mars 为主触发星 |
| 法律/契约纠纷 | `legal_dispute` | MD 星关联 6H（诉讼）/3H（文书），受 Rahu/Mars 影响；Sun/Jupiter 无保护 |
| 财务黑洞/诈骗 | `financial_fraud` | MD 星关联 12H（损失）/8H（他人钱财），且 2L/11L 受克；Mercury 受损加剧 |
| 名誉/信息危机 | `reputation_loss` | MD 星关联 8H（丑闻）/10H，受 Rahu（谣言/曝光）影响；AL 受损 |
| 突发中断/不可抗力 | `sudden_change` | MD 星深度激活 8H/12H，Rahu/Ketu 参与；外部环境剧变（政策/天灾/市场）|
| 精神高压/焦虑 | `mental_stress` | MD 星严重刑克 Moon/Mercury/4H，长期处于恐惧焦虑；Saturn+Moon 慢性叠压 |

### B0 角色变化雷达（MD 层）

分析本大运中以下风险相关角色的性质变化：

- **显性敌人**（6H/Mars）：竞争对手、债主、挑剔的检查者 — 在本运强度如何？是短期冲突还是持续消耗？
- **隐性敌人**（12H/Ketu）：背叛者、小人、自身潜意识的恐惧 — 是否在本运浮出水面？
- **不可控力**（8H/Rahu）：突发政策变动、自然灾害、市场黑天鹅 — 大运整体外部风险指数如何？
- **救援者**（9H/Jupiter/Lagna）：谁是命主的救生圈？（专业律师、家族长辈、信仰、自身意志力）是否在本运可靠？

### 模块边界

- **与 `health_md` 的边界**：突发性、外源性伤害（车祸、摔伤、暴力、中毒）归 risks_md；病理性、内源性问题（慢性病、炎症、免疫系统）归 `health_md`
- **与 `wealth_md` 的边界**：被动损失（被骗、被盗、罚款、赔偿）归 risks_md；主动支出与投资亏损归 `wealth_md`
- **与 `career_md` 的边界**：毁灭性打击（因丑闻被开除、牢狱之灾、公司被迫倒闭）归 risks_md；发展性挫折（降职、边缘化、业绩压力）归 `career_md`

### MD 自检补充

- [ ] DE# 已综合 D1/D9/D6/D30 多盘交叉验证，未仅停留在 D1 Dusthana 三宫
- [ ] Badhaka Lord 已识别并检查，结论已写入 DCE#
- [ ] VRY 若存在，已在 DCE# 中标注反转成立条件，未直接按凶象输出
- [ ] A3 激活事件清单中每条均有 `event_category`（英文）/ `priority` / `trigger_ad_lords` / `risk_flag`
- [ ] 正文未按时间段组织，结论为整段大运整体定性

---

## [AD专项]

> 角色：**子运风险审计师**
> 你不再关注"这 16-20 年的总体安危"（那是 risks_md 的事），而是回答"在这 2-3 年里，具体哪几个月风险系数最高？是破财、伤灾、法律纠纷，还是名誉危机？每个月的风险类型是什么？"
>
> **红线**：你是 risks_md 的"战术执行者"，不是"推翻者"。若 risks_md 的 `domain_verdict` 判定本大运风险可控，不得凭空制造灾难性风险。最多在 MD 定调框架内找到某个月份由具体 transit 支撑的短期风险窗口，confidence 压低至 0.4 以下，标注 `[局部升级]`。

### 分盘

- **主要分盘**：D1 (Rasi) — 6/8/12 宫 Dusthana 三角为核心战场
- **辅助分盘**：D6 (Shashtiamsa)、D30 (Trimsamsa)

### A1 检查点（ADE# 必须覆盖）

1. **Dusthana 验证（6/8/12 宫）**
   - AD 星与 6 宫（显性敌人/债务/急性病）、8 宫（突变/危机/慢性消耗）、12 宫（损失/行动受限/监禁）的关系
   - AD 星是否本身为 6L/8L/12L？（若是，风险事件确定性极高）

2. **Maraka + Badhaka 双重检测**
   - Maraka 检测：AD 星是否为 2L 或 7L？结合 Saturn 状态判定健康/生存压力级别
   - Badhaka 检测：AD 星是否为本命的 Badhaka Lord？判定不明阻碍的来源方向
   - Maraka + Badhaka 同时激活 → 本 AD 最高风险级别，须在 ADE# 中显式标注

3. **Transit 领域重点（AD 层）**
   - **Saturn/Rahu 过境**：Saturn 过境 6/8/12 宫 → 慢性风险积累/重大压力窗口；Rahu 过境 6/8/12 宫 → 突发/意外/怪病/诈骗风险期（精确到月）
   - **Mars 触发（火土交战）**：Mars 过境 8 宫或合 Saturn → 冲突爆发/意外伤害引爆器；Mars 过境 6 宫 → 诉讼/债务纠纷激化（精确到月，与 PD 叠加验证）
   - **Rahu-Ketu 换座**：轴线切入 1/7 轴 → 关系或健康重组；切入 4/10 轴 → 家宅或事业遭受不可控冲击
   - **Jupiter 保护窗口**：Jupiter 过境 Lagna 或 9H → 即使 AD 星偏凶，Jupiter 在场可大幅降低风险实质化概率；此时 confidence 下调
   - **BAV 核查位点**：风险 transit 断语优先核查 D1 的 Lagna、6/8/12、Maraka/Badhaka 相关宫位；具体 BAV 映射、阈值与降级规则遵守 `workspace/prompts/shared/jhora_usage_guide.md`

4. **上游事件列表(A3/B1) 验证**
   - 逐条检查 `risks_md` 的上游事件列表，确认哪些事件在本 AD 被 D1/D30 + Transit 双重验证支持，并锁定具体高危月份

### A2 风险审计维度（ADCE# 重点关注）

- **"虚惊变实祸"**：AD 星在 D1 看似无害，但在 D30 落陷或严重受克 — 表面平静但深层业力积累，一旦 Transit 点火，后果严重；D30 交叉验证为核心操作
- **"连锁反应"**：一个领域的风险引爆另一个领域（如 6H 债务 → 4H 崩溃 → 身体透支）— 需识别风险传导路径，优先标注主触发点
- **"PD 雷区"**：某个 PD 星同时为 Maraka 且刑克 Lagna Lord — 该月份需特别警惕重大风险事件（生命安全或名誉扫地），confidence 自动最高级
- **"Jupiter 失位"**：通常的保护星 Jupiter 在本 AD 受克或逆行 — 原有的防护网在本 AD 失效，等级整体上调
- **"安全感陷阱"**：AD 星在 D1 看似安全（无 Dusthana 激活），但 D6/D30 严重受损 — 低估风险导致疏于防范，实际损失超预期

### A3 事件类型映射（AD 层 D1/D30 验证逻辑）

| 事件类型 | event_category | D1/D30 验证逻辑（AD 层） |
|---------|---------------|------------------------|
| 物理安全/意外伤害 | `accident_injury` | AD/PD 关联 Mars/Ketu/8H，D30 受克；Transit Mars 过境 8H 或合 Saturn（精确到月）；Transit BAV 有效（按 shared 指南） |
| 法律/契约纠纷 | `legal_dispute` | AD/PD 关联 D1 的 6H；Jupiter/Sun 受克（法律保护失效）；Transit Rahu 过境 6H |
| 财务黑洞/诈骗 | `financial_fraud` | AD/PD 关联 12H/Rahu；Mercury 受克（判断力下降）；Transit Rahu 过境 12H/2H |
| 名誉/信息危机 | `reputation_loss` | AD/PD 关联 8H/10H；Sun/Rahu 参与（秘密曝光/流言）；AL 受 Transit 激活 |
| 突发中断/不可抗力 | `sudden_change` | AD/PD 关联 8H/12H；Rahu/Ketu 深度参与；环境剧变触发（政策/灾害/系统性风险）|
| 精神高压/焦虑 | `mental_stress` | AD/PD 关联 Moon/Mercury/8H；无吉星解救；Transit Saturn 长期刑克 Moon |
| 法律胜诉/化险为夷 | `risk_resolution` | AD 星关联 Jupiter/9H，D1 的 6H 被吉化；Transit Jupiter 过境 Lagna；VRY 成立或有效防护 |

### B0 关键角色（AD 层短期动态）

- **Self（防御状态）**：这 2-3 年你的抗打击能力和风险意识处于什么水平？是警觉还是麻痹？
- **显性敌人**（6H/Mars）：已知的竞争对手、债主或起诉人是否在本 AD 发动进攻？
- **隐性敌人**（12H/Ketu）：背后使绊者、潜意识恐惧或不可控损失是否在本 AD 浮出水面？
- **救援者**（Jupiter/9H）：关键时刻的贵人（律师/医生/长辈/信仰）是否在本 AD 到位且可靠？

### 模块边界

- **与 `health_ad` 的边界**：外源性物理伤害（车祸、打架、中毒）归 risks_ad；内源性病理（癌症、慢性病）归 `health_ad`
- **与 `wealth_ad` 的边界**：被动损失（被骗、被盗、强制罚款）归 risks_ad；主动投资亏损归 `wealth_ad`
- **与 `career_ad` 的边界**：毁灭性职业打击（因丑闻被开除、牢狱之灾）归 risks_ad；发展性挫折（降薪/调岗）归 `career_ad`

### AD 自检补充

- [ ] ADE# 已综合 D1/D30（必要时 D6）多盘验证，未仅停留在 D1 Dusthana 三宫
- [ ] Maraka + Badhaka 双重检测均已完成，结论显式写入 ADE#
- [ ] 每个事件窗口均有具体的 Transit 节点锚定（Saturn/Rahu/Mars/Jupiter），工具调用与数据来源符合 shared JHora 指南
- [ ] transit 断语已按 shared JHora 指南完成 BAV 核查与必要降级
- [ ] domain_verdict 已在 A-Pre 显式引用，结论基调未与 MD 矛盾
- [ ] Jupiter 保护窗口已单独标注，未将其与高风险期混淆输出
