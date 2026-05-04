# Jyotish 理论约束协议

本文件定义 `yinzhan` 工作流跨步骤通用的 Jyotish 理论约束。它不替代具体 step prompt，也不承载具体业务断语；具体分析仍以 `task_read` 返回的当前 step 描述、领域模块提示词和时间片提示词为准。

## 1. 适用范围与读取时机

涉及以下任一内容时，必须读取并遵守本文件：

- Parashari 与 Jaimini 技法并用。
- Graha Drishti / Rashi Drishti 相位判断。
- Arudha、Chara Karaka、Karakamsha、Argala、Parivartana、Yoga、Avasthas、Combustion、Graha Yuddha。
- Vargas 分盘解释和 D1-D9 / D10 / D2 等跨盘联动。
- Nakshatra Pada、Upachaya 宫、Dusthana 宫、反证链与现实映射。

## 2. 基准体系

- 默认使用 Sidereal Zodiac 与 Lahiri Ayanamsa。
- D1 Rashi Chart 是本命主盘，D9/D10/D2/D7/D24/D30/D60 等为领域或质量验证分盘。
- 不得用任一分盘单独推翻 D1 主盘主题；分盘用于验证、细化、裁决领域质量。

## 3. Parashari Graha Drishti 与 Jaimini Rashi Drishti

必须区分两套相位体系：

- Graha Drishti（Parashari 行星相位）：土星看 3/7/10，木星看 5/7/9，火星看 4/7/8，其余行星通常只看第 7。
- Rashi Drishti（Jaimini 星座相位）：按星座性质形成对望关系，与 Graha Drishti 完全不同。

使用规则：

- Parashari 宫位、宫主、行星强弱分析中，只用 Graha Drishti。
- Jaimini Chara Karaka、Karakamsha、Rashi 层分析中，只用 Rashi Drishti。
- 若同一结论同时引用两套体系，必须明确标注各自所属流派，不得混写成同一条相位证据。

## 4. Arudha 与 Chara Karaka

- Arudha Lagna 用于社会显化、外界看见的身份和世俗投影，不等同于内在人格。
- Chara Karaka 用于灵魂角色分工：AK、AmK、DK 等必须结合 D1/D9 联动解释。
- Karakamsha 以 AK 在 D9 的落位为核心，用于精神追求与灵魂方向，不应直接当作具体事件时间判断。

## 5. Argala / Virodha Argala

分析 AK、Lagna、关键宫位、关键 Karaka 时，应检查 Argala 与 Virodha Argala：

- Argala 重点看 2/4/11 宫的楔入影响。
- Virodha Argala 用于判断干预是否被反向阻断。
- Argala 属于隐性影响结构，不应替代主证；它用于解释为什么同一配置在现实中被放大、被阻滞或被旁人介入。

## 6. Parivartana Yoga

- 扫描全盘时必须检查 Parivartana（两星互入对方星座）。
- Parivartana 会显著加强两星和对应宫位的相互牵引，是 Yoga 激活与 Dasha 触发的重要扳机。
- 判断 Parivartana 时必须确认双方确实互入对方主宰星座，不得把普通互相影响误写成互入。

## 7. Avasthas、Combustion、Graha Yuddha

- Avasthas 用于判断星体是否清醒、沉睡、老化、活跃，不得只看庙旺落陷。
- Combustion 用于判断太阳附近焦伤程度，必须写清 orb 或工具来源。
- Graha Yuddha 只能在工具或明确算法支持时作为主证；若 live JHora 与旧静态导出冲突，按 `jhora_usage_guide.md` 的冲突处理规则执行。

## 8. Shadbala、Vimsopaka 与量化边界

- Shadbala / Vimsopaka 用于校正表面吉凶，不得只凭入庙、旺、陷作强断。
- 量化分值必须注明来源，尤其在跨分盘使用时要说明该分值实际属于哪一层。
- 若分盘仅有落宫结构而无量化支撑，相关结论必须降级。

## 9. Upachaya 与 Dusthana

- Upachaya 宫（3/6/10/11）具有成长性，凶星落入不应一概断凶；常表现为压力中成长、竞争中变强、长期积累见效。
- Dusthana 宫（6/8/12）不等于纯坏，需区分消耗、危机、重组、隐秘资源、解脱路径。
- 对 Upachaya 中的凶星做悲观判断时，必须在反证链中说明成长性为何不足以抵消风险。

## 10. Nakshatra Pada 持续运用

- Nakshatra Pada 不只在数据校验步骤列一次，后续关键星体解释仍应持续运用。
- Pada 1/4 更偏 Dharma/Moksha 轴，Pada 2/3 更偏 Artha/Kama 轴。
- Pada 直接连接 Navamsa 落位，是 D1-D9 联动的重要桥梁。

## 11. Yoga 显化原则

- Yoga 不会自动显化，必须检查强弱、参与星状态、Dasha 激活和 Transit 触发。
- 本命存在 Raja Yoga / Dhana Yoga / Viparita Raja Yoga，只能说明潜力；是否在时间片中表现为事件，必须由 Dasha + Transit + BAV 有效性确认。
- 见 Yoga 就断大吉属于不合格推断。

## 12. Vargas 分盘用途边界

- D9：婚姻承诺、内在果实、后半生质量、D1 配置结果裁决。
- D10：事业形态、职业场域、权责结构、社会成就质量。
- D2：财富极性、自力/他力倾向；D2 不替代 D1 财富宫位群。
- D7：子女主题。
- D24：学业与深层学习能力。
- D30：灾厄、风险、黑天鹅按钮。
- D60：高阶业力验证，只在数据可靠且任务需要时使用。

Vargas 红线：不得把 D1 专属的 BAV/SAV 分值套用到任何 Vargas 分盘；不得用分盘单点落位直接给高置信事件断语。

## 13. 证据层级与现实映射

- 现实映射必须回链到当前层级证据编号。
- 引用上游证据使用 `[Ref: {module}.{标记}]`，不得把上游证据编号直接混入本层编号。
- 技法层可以硬核，现实层必须给出可观察事件，不得用抽象术语替代现实表现。
- 若存在重要反证，必须写入 CE/MCE/DCE/ADCE 等对应反证链，不得只写单向利好。

## 14. 时间片多维验证原则

时间片分析遵循以下五层验证口诀：

> **Dasha 定方向，Transit 给扳机，BAV 验有效，Tajaka 补跨年，Yoga 看激活。**

- **Dasha 定方向**：MD/AD/PD 星的宫主身份、功能性吉凶与本命配置的碰撞，决定了这段时间的主题方向。方向判断是所有后续验证的前提。
- **Transit 给扳机**：流年行星（尤其 Saturn/Jupiter/Rahu-Ketu 换座）过境关键宫位或关键星体，是事件落地的触发器。没有 Transit 触发的 Dasha 方向只是"潜力"，不是"事件"。
- **BAV 验有效**：Transit 断语必须附该行运星在对应宫位的 BAV 分值验证。BAV < 4 时 Transit 触发力降级，不得给 high/critical。BAV/SAV 仅限 D1 Rashi Chart，严禁套用于任何 Vargas 分盘。
- **Tajaka 补跨年**：AD 跨自然年边界时，必须调用 Tajaka 年度盘作辅助验证。Tajaka 是辅证，不得作为单点强断的唯一依据；工具返回异常时不得作为强证。
- **Yoga 看激活**：本命存在的 Yoga 不自动显化，必须在 Dasha + Transit + BAV 三层验证下确认激活条件是否满足。

### 时间片高频红线

以下红线适用于所有时间片步骤（7-x 及其子步骤）：

1. **high/critical 断语**必须同时具备 Dasha 方向与 Transit 触发，缺任一层则降级为 medium 或以下。
2. **Transit 触发**必须附 BAV 有效性验证，BAV < 4 时对应断语强制降级。
3. **AD 跨年**必须参考 Tajaka；Tajaka 工具返回字段异常（如 sign 解码全为 0）时，不得作为 high/critical 主证。
4. **PD 展开**仅在触发条件满足时执行，起止日期必须来自真实的 `jhora_dasha` rows，不得推算。
